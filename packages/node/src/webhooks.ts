import { createHmac, timingSafeEqual } from 'node:crypto'
import type { WebhookEvent } from './types'

function computeHmac(payload: string | Buffer, secret: string): string {
  const hmac = createHmac('sha256', secret)
  hmac.update(payload)
  return hmac.digest('hex')
}

function safeCompare(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a)
    const bBuf = Buffer.from(b)
    if (aBuf.length !== bBuf.length) {
      const padded = Buffer.alloc(bBuf.length, 0)
      aBuf.copy(padded, 0, 0, Math.min(aBuf.length, padded.length))
      timingSafeEqual(padded, bBuf)
      return false
    }
    return timingSafeEqual(aBuf, bBuf)
  } catch {
    return false
  }
}

export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  const digest = computeHmac(payload, secret)

  // Support both v1= (new format) and sha256= (legacy format)
  if (signature.startsWith('v1=')) {
    const provided = signature.slice(3)
    return safeCompare(provided, digest)
  }

  if (signature.startsWith('sha256=')) {
    const provided = signature.slice(7)
    return safeCompare(provided, digest)
  }

  // Bare hex comparison as fallback
  return safeCompare(signature, digest)
}

export function constructEvent(
  rawBody: string | Buffer,
  signature: string,
  webhookSecret: string,
): WebhookEvent {
  if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    throw new Error('Invalid webhook signature')
  }

  const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8')
  const parsed = JSON.parse(bodyStr)

  return {
    id: parsed.id ?? '',
    type: parsed.event ?? parsed.type ?? '',
    data: parsed.data ?? parsed,
    createdAt: parsed.createdAt ?? new Date().toISOString(),
  }
}
