import { createHmac, timingSafeEqual } from 'node:crypto'
import type { WebhookEvent } from './types'

export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  const hmac = createHmac('sha256', secret)
  hmac.update(typeof payload === 'string' ? payload : payload)
  const digest = 'sha256=' + hmac.digest('hex')

  try {
    const sigBuffer = Buffer.from(signature)
    const digestBuffer = Buffer.from(digest)

    if (sigBuffer.length !== digestBuffer.length) {
      const padded = Buffer.alloc(digestBuffer.length, 0)
      sigBuffer.copy(padded, 0, 0, Math.min(sigBuffer.length, padded.length))
      timingSafeEqual(padded, digestBuffer)
      return false
    }

    return timingSafeEqual(sigBuffer, digestBuffer)
  } catch {
    return false
  }
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
    type: parsed.event || parsed.type,
    data: parsed.data || parsed,
  }
}
