import type { BackendPaymentInfo } from './types'

export class CrypaxApiClient {
  constructor(
    private readonly apiUrl: string,
    private readonly publishableKey: string,
  ) {}

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Crypax-Key': this.publishableKey,
    }
  }

  async fetchPayment(paymentId: string, clientSecret: string): Promise<BackendPaymentInfo> {
    const url = `${this.apiUrl}/v1/payments/${paymentId}?clientSecret=${encodeURIComponent(clientSecret)}`
    const res = await fetch(url, { headers: this.headers() })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to fetch payment (${res.status}): ${text}`)
    }
    return res.json() as Promise<BackendPaymentInfo>
  }

  async confirmPayment(
    paymentId: string,
    body: { clientSecret: string; txHash: string; senderAddress?: string },
  ): Promise<void> {
    const url = `${this.apiUrl}/v1/payments/${paymentId}/confirm`
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to confirm payment (${res.status}): ${text}`)
    }
  }

  async watchPayment(paymentId: string, clientSecret: string): Promise<void> {
    const url = `${this.apiUrl}/v1/payments/${paymentId}/watch`
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ clientSecret }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to watch payment (${res.status}): ${text}`)
    }
  }

  async pollPaymentStatus(
    paymentId: string,
    clientSecret: string,
    timeoutMs: number,
    intervalMs: number,
  ): Promise<BackendPaymentInfo> {
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
      const data = await this.fetchPayment(paymentId, clientSecret)

      if (data.status === 'confirmed' || data.status === 'failed' || data.status === 'expired') {
        return data
      }

      await new Promise((r) => setTimeout(r, intervalMs))
    }

    throw new Error('Payment status poll timeout')
  }
}
