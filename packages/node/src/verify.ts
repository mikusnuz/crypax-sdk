import { getTransactionReceipt, getTransaction, getBlockByNumber, getChainId } from './rpc'
import { parseAmount, addressEquals, TRANSFER_EVENT_TOPIC } from './utils'
import type { PaymentVerification, TransactionInfo } from './types'

interface RpcTransaction {
  hash: string
  from: string
  to: string
  value: string
  blockNumber: string
  blockHash: string
}

interface RpcReceipt {
  status: string
  blockNumber: string
  blockHash: string
  logs: Array<{ topics: string[]; data: string; address: string }>
}

async function buildTransactionInfo(
  tx: RpcTransaction,
  receipt: RpcReceipt,
  rpcUrl: string,
): Promise<TransactionInfo> {
  let timestamp: number | undefined

  try {
    const block = await getBlockByNumber(rpcUrl, tx.blockNumber)
    if (block?.timestamp) {
      timestamp = parseInt(block.timestamp, 16)
    }
  } catch {}

  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: tx.value,
    blockNumber: parseInt(tx.blockNumber, 16),
    blockHash: tx.blockHash,
    status: receipt.status === '0x1' ? 'success' : 'reverted',
    timestamp,
  }
}

export async function verifyPayment(
  txHash: string,
  expected: { to: string; amount: string; decimals?: number },
  rpcUrl: string,
  expectedChainId?: number,
): Promise<PaymentVerification> {
  try {
    const [receipt, tx] = await Promise.all([
      getTransactionReceipt(rpcUrl, txHash) as Promise<RpcReceipt | null>,
      getTransaction(rpcUrl, txHash) as Promise<RpcTransaction | null>,
    ])

    if (!receipt || !tx) {
      return { valid: false, error: 'Transaction not found' }
    }

    const txInfo = await buildTransactionInfo(tx, receipt, rpcUrl)

    if (txInfo.status === 'reverted') {
      return { valid: false, tx: txInfo, error: 'Transaction reverted' }
    }

    let chainMatch = true
    if (expectedChainId !== undefined) {
      const actualChainId = await getChainId(rpcUrl)
      chainMatch = actualChainId === expectedChainId
    }

    const recipientMatch = addressEquals(tx.to ?? '', expected.to)
    const expectedWei = parseAmount(expected.amount, expected.decimals ?? 18)
    const actualWei = BigInt(tx.value)
    const amountMatch = actualWei === expectedWei

    const valid = chainMatch && recipientMatch && amountMatch

    return { valid, tx: txInfo, amountMatch, recipientMatch, chainMatch }
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function verifyERC20Payment(
  txHash: string,
  expected: { tokenAddress: string; to: string; amount: string; decimals?: number },
  rpcUrl: string,
  expectedChainId?: number,
): Promise<PaymentVerification> {
  const decimals = expected.decimals ?? 18

  try {
    const [receipt, tx] = await Promise.all([
      getTransactionReceipt(rpcUrl, txHash) as Promise<RpcReceipt | null>,
      getTransaction(rpcUrl, txHash) as Promise<RpcTransaction | null>,
    ])

    if (!receipt || !tx) {
      return { valid: false, error: 'Transaction not found' }
    }

    const txInfo = await buildTransactionInfo(tx, receipt, rpcUrl)

    if (txInfo.status === 'reverted') {
      return { valid: false, tx: txInfo, error: 'Transaction reverted' }
    }

    let chainMatch = true
    if (expectedChainId !== undefined) {
      const actualChainId = await getChainId(rpcUrl)
      chainMatch = actualChainId === expectedChainId
    }

    const transferLog = receipt.logs.find((log) => {
      if (!addressEquals(log.address, expected.tokenAddress)) return false
      if (log.topics[0]?.toLowerCase() !== TRANSFER_EVENT_TOPIC) return false
      const toTopic = log.topics[2]
      if (!toTopic) return false
      const toAddress = '0x' + toTopic.slice(26)
      return addressEquals(toAddress, expected.to)
    })

    if (!transferLog) {
      return {
        valid: false,
        tx: txInfo,
        error: 'Transfer event not found for the expected recipient',
        chainMatch,
        recipientMatch: false,
        amountMatch: false,
      }
    }

    const expectedWei = parseAmount(expected.amount, decimals)
    const actualWei = BigInt(transferLog.data)
    const amountMatch = actualWei === expectedWei

    const valid = chainMatch && amountMatch

    return { valid, tx: txInfo, amountMatch, recipientMatch: true, chainMatch }
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
