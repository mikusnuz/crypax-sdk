import type {
  CrypaxServerConfig,
  ResolvedServerConfig,
  CreatePaymentParams,
  Payment,
  PaymentList,
  WebhookEvent,
  PaymentVerification,
} from './types'
import { verifyPayment, verifyERC20Payment } from './verify'
import { constructEvent, verifyWebhookSignature } from './webhooks'

const DEFAULT_API_URL = 'https://api.crypax.io'
const DEFAULT_RPC_URL = 'https://node-1.plumise.com/rpc'
const DEFAULT_CHAIN_ID = 41956

export class Crypax {
  private config: ResolvedServerConfig

  readonly payments: PaymentsResource
  readonly webhooks: WebhooksResource
  readonly verification: VerificationResource

  constructor(secretKey: string, config?: Omit<CrypaxServerConfig, 'secretKey'>) {
    this.config = {
      secretKey,
      apiUrl: config?.apiUrl ?? DEFAULT_API_URL,
      rpcUrl: config?.rpcUrl ?? DEFAULT_RPC_URL,
      chainId: config?.chainId ?? DEFAULT_CHAIN_ID,
    }

    this.payments = new PaymentsResource(this.config)
    this.webhooks = new WebhooksResource()
    this.verification = new VerificationResource(this.config)
  }
}

class PaymentsResource {
  constructor(private readonly config: ResolvedServerConfig) {}

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.secretKey}`,
    }
  }

  async create(params: CreatePaymentParams): Promise<Payment> {
    const res = await fetch(`${this.config.apiUrl}/v1/payments`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to create payment (${res.status}): ${text}`)
    }
    return res.json() as Promise<Payment>
  }

  async retrieve(id: string): Promise<Payment> {
    const res = await fetch(`${this.config.apiUrl}/v1/payments/${id}`, {
      headers: this.headers(),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to retrieve payment (${res.status}): ${text}`)
    }
    return res.json() as Promise<Payment>
  }

  async list(params?: { status?: string; page?: number; limit?: number }): Promise<PaymentList> {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    const url = `${this.config.apiUrl}/v1/payments${qs.toString() ? '?' + qs.toString() : ''}`

    const res = await fetch(url, { headers: this.headers() })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to list payments (${res.status}): ${text}`)
    }
    return res.json() as Promise<PaymentList>
  }
}

class WebhooksResource {
  constructEvent(rawBody: string | Buffer, signature: string, webhookSecret: string): WebhookEvent {
    return constructEvent(rawBody, signature, webhookSecret)
  }

  verifySignature(rawBody: string | Buffer, signature: string, webhookSecret: string): boolean {
    return verifyWebhookSignature(rawBody, signature, webhookSecret)
  }
}

class VerificationResource {
  constructor(private readonly config: ResolvedServerConfig) {}

  async verifyPayment(
    txHash: string,
    expected: { to: string; amount: string; decimals?: number },
  ): Promise<PaymentVerification> {
    return verifyPayment(txHash, expected, this.config.rpcUrl, this.config.chainId)
  }

  async verifyERC20Payment(
    txHash: string,
    expected: { tokenAddress: string; to: string; amount: string; decimals?: number },
  ): Promise<PaymentVerification> {
    return verifyERC20Payment(txHash, expected, this.config.rpcUrl, this.config.chainId)
  }
}
