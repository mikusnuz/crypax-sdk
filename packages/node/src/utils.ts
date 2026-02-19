export function isValidAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}

export function addressEquals(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

export function parseAmount(amount: string, decimals = 18): bigint {
  const parts = amount.split('.')
  const whole = parts[0] ?? '0'
  const fraction = (parts[1] ?? '').padEnd(decimals, '0').slice(0, decimals)
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction)
}

export function formatAmount(wei: bigint, decimals = 18): string {
  const unit = 10n ** BigInt(decimals)
  const whole = wei / unit
  const fraction = wei % unit
  if (fraction === 0n) return whole.toString()
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${whole}.${fractionStr}`
}

export const TRANSFER_EVENT_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
