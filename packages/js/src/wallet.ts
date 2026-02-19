import type { WalletInfo } from './types'

interface EthereumProvider {
  isPexus?: boolean
  isMetaMask?: boolean
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
}

interface WindowWithWallets {
  pexus?: { ethereum?: EthereumProvider }
  plumise?: { ethereum?: EthereumProvider }
  ethereum?: EthereumProvider
}

function getProvider(): EthereumProvider | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as WindowWithWallets

  if (w.pexus?.ethereum) return w.pexus.ethereum
  if (w.plumise?.ethereum) return w.plumise.ethereum
  if (w.ethereum?.isPexus) return w.ethereum

  return w.ethereum ?? null
}

export function detectWallet(): WalletInfo {
  if (typeof window === 'undefined') return { type: 'none' }
  const w = window as unknown as WindowWithWallets

  if (w.pexus?.ethereum || w.plumise?.ethereum) return { type: 'pexus' }

  const provider = w.ethereum
  if (!provider) return { type: 'none' }

  if (provider.isPexus) return { type: 'pexus' }
  if (provider.isMetaMask) return { type: 'metamask' }
  return { type: 'other' }
}

export async function connectWallet(): Promise<string> {
  const provider = getProvider()
  if (!provider) throw new Error('No wallet provider found')

  const accounts = (await provider.request({
    method: 'eth_requestAccounts',
  })) as string[]

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts returned')
  }
  return accounts[0]
}

export async function getChainId(): Promise<number> {
  const provider = getProvider()
  if (!provider) throw new Error('No wallet provider found')

  const chainIdHex = (await provider.request({ method: 'eth_chainId' })) as string
  return parseInt(chainIdHex, 16)
}

export interface SwitchChainParams {
  chainId: number
  name: string
  rpcUrl: string
  explorerUrl: string
  symbol?: string
  decimals?: number
}

export async function switchChain(params: SwitchChainParams): Promise<void> {
  const provider = getProvider()
  if (!provider) throw new Error('No wallet provider found')

  const chainIdHex = `0x${params.chainId.toString(16)}`

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    })
  } catch (err: unknown) {
    const error = err as { code?: number }
    if (error.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: chainIdHex,
            chainName: params.name,
            rpcUrls: [params.rpcUrl],
            blockExplorerUrls: [params.explorerUrl],
            nativeCurrency: {
              name: params.symbol ?? 'ETH',
              symbol: params.symbol ?? 'ETH',
              decimals: params.decimals ?? 18,
            },
          },
        ],
      })
    } else {
      throw err
    }
  }
}

function toHexWei(amount: string, decimals = 18): string {
  const wei = parseAmount(amount, decimals)
  return `0x${wei.toString(16)}`
}

function parseAmount(amount: string, decimals: number): bigint {
  const parts = amount.split('.')
  const whole = parts[0] ?? '0'
  const fraction = (parts[1] ?? '').padEnd(decimals, '0').slice(0, decimals)
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction)
}

function encodeERC20Transfer(to: string, amountWei: bigint): string {
  const selector = '0xa9059cbb'
  const paddedTo = to.replace('0x', '').padStart(64, '0')
  const paddedAmount = amountWei.toString(16).padStart(64, '0')
  return `${selector}${paddedTo}${paddedAmount}`
}

export async function sendNativeTransaction(
  to: string,
  amount: string,
  from: string,
  decimals = 18,
): Promise<string> {
  const provider = getProvider()
  if (!provider) throw new Error('No wallet provider found')

  return (await provider.request({
    method: 'eth_sendTransaction',
    params: [{ from, to, value: toHexWei(amount, decimals) }],
  })) as string
}

export async function sendERC20Transaction(
  tokenAddress: string,
  to: string,
  amount: string,
  from: string,
  decimals = 18,
): Promise<string> {
  const provider = getProvider()
  if (!provider) throw new Error('No wallet provider found')

  const amountWei = parseAmount(amount, decimals)
  const data = encodeERC20Transfer(to, amountWei)

  return (await provider.request({
    method: 'eth_sendTransaction',
    params: [{ from, to: tokenAddress, value: '0x0', data }],
  })) as string
}

interface TransactionReceipt {
  blockNumber: string
  status: string
}

export async function waitForConfirmation(
  txHash: string,
  rpcUrl: string,
  pollInterval: number,
  timeout = 120_000,
): Promise<{ blockNumber: number }> {
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    try {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        }),
      })
      const json = (await res.json()) as { result: TransactionReceipt | null }
      if (json.result) {
        if (json.result.status === '0x0') {
          throw new Error('Transaction reverted')
        }
        return { blockNumber: parseInt(json.result.blockNumber, 16) }
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'Transaction reverted') {
        throw err
      }
    }
    await new Promise((r) => setTimeout(r, pollInterval))
  }

  throw new Error('Confirmation timeout')
}
