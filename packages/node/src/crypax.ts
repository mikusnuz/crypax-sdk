import { DEFAULT_API_URL, DEFAULT_RPC_URL, DEFAULT_CHAIN_ID, CHAINS } from '@crypax/shared'
import type {
  CrypaxServerConfig,
  ResolvedServerConfig,
  CreatePaymentParams,
  CreateCustomerParams,
  CreateRefundParams,
  Payment,
  PaymentList,
  Customer,
  Refund,
  PaginatedList,
  WebhookEvent,
  PaymentVerification,
  ChainInfo,
} from './types'
import { verifyPayment, verifyERC20Payment } from './verify'
import { constructEvent, verifyWebhookSignature } from './webhooks'

export class Crypax {
  private config: ResolvedServerConfig

  readonly payments: PaymentsResource
  readonly customers: CustomersResource
  readonly refunds: RefundsResource
  readonly webhooks: WebhooksResource
  readonly verification: VerificationResource
  readonly projects: ProjectsResource
  readonly chains: ChainsResource

  constructor(secretKey: string, config?: Omit<CrypaxServerConfig, 'secretKey'>) {
    this.config = {
      secretKey,
      apiUrl: config?.apiUrl ?? DEFAULT_API_URL,
      rpcUrl: DEFAULT_RPC_URL,
      chainId: DEFAULT_CHAIN_ID,
    }

    this.payments = new PaymentsResource(this.config)
    this.customers = new CustomersResource(this.config)
    this.refunds = new RefundsResource(this.config)
    this.webhooks = new WebhooksResource()
    this.verification = new VerificationResource(this.config)
    this.projects = new ProjectsResource(this.config)
    this.chains = new ChainsResource(this.config)
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

class CustomersResource {
  constructor(private readonly config: ResolvedServerConfig) {}

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.secretKey}`,
    }
  }

  async create(params: CreateCustomerParams): Promise<Customer> {
    const res = await fetch(`${this.config.apiUrl}/v1/customers`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to create customer (${res.status}): ${text}`)
    }
    return res.json() as Promise<Customer>
  }

  async retrieve(id: string): Promise<Customer> {
    const res = await fetch(`${this.config.apiUrl}/v1/customers/${id}`, {
      headers: this.headers(),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to retrieve customer (${res.status}): ${text}`)
    }
    return res.json() as Promise<Customer>
  }

  async list(params?: { page?: number; limit?: number }): Promise<PaginatedList<Customer>> {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    const url = `${this.config.apiUrl}/v1/customers${qs.toString() ? '?' + qs.toString() : ''}`

    const res = await fetch(url, { headers: this.headers() })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to list customers (${res.status}): ${text}`)
    }
    return res.json() as Promise<PaginatedList<Customer>>
  }

  async update(id: string, params: Partial<CreateCustomerParams>): Promise<Customer> {
    const res = await fetch(`${this.config.apiUrl}/v1/customers/${id}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to update customer (${res.status}): ${text}`)
    }
    return res.json() as Promise<Customer>
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(`${this.config.apiUrl}/v1/customers/${id}`, {
      method: 'DELETE',
      headers: this.headers(),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to delete customer (${res.status}): ${text}`)
    }
  }
}

class RefundsResource {
  constructor(private readonly config: ResolvedServerConfig) {}

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.secretKey}`,
    }
  }

  async create(params: CreateRefundParams): Promise<Refund> {
    const res = await fetch(`${this.config.apiUrl}/v1/refunds`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to create refund (${res.status}): ${text}`)
    }
    return res.json() as Promise<Refund>
  }

  async retrieve(id: string): Promise<Refund> {
    const res = await fetch(`${this.config.apiUrl}/v1/refunds/${id}`, {
      headers: this.headers(),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to retrieve refund (${res.status}): ${text}`)
    }
    return res.json() as Promise<Refund>
  }

  async list(params?: { paymentId?: string; page?: number; limit?: number }): Promise<PaginatedList<Refund>> {
    const qs = new URLSearchParams()
    if (params?.paymentId) qs.set('paymentId', params.paymentId)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    const url = `${this.config.apiUrl}/v1/refunds${qs.toString() ? '?' + qs.toString() : ''}`

    const res = await fetch(url, { headers: this.headers() })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to list refunds (${res.status}): ${text}`)
    }
    return res.json() as Promise<PaginatedList<Refund>>
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

interface ProjectInfo {
  id: string
  name: string
  description?: string | null
  webhookUrl?: string | null
  metadata?: Record<string, any> | null
  createdAt: string
  updatedAt: string
}

class ProjectsResource {
  constructor(private readonly config: ResolvedServerConfig) {}

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.secretKey}`,
    }
  }

  async retrieve(): Promise<ProjectInfo> {
    const res = await fetch(`${this.config.apiUrl}/v1/project`, {
      headers: this.headers(),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to retrieve project (${res.status}): ${text}`)
    }
    return res.json() as Promise<ProjectInfo>
  }

  async update(params: Partial<Omit<ProjectInfo, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ProjectInfo> {
    const res = await fetch(`${this.config.apiUrl}/v1/project`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to update project (${res.status}): ${text}`)
    }
    return res.json() as Promise<ProjectInfo>
  }
}

interface TokenInfo {
  address: string
  symbol: string
  name: string
  decimals: number
}

class ChainsResource {
  constructor(private readonly config: ResolvedServerConfig) {}

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.secretKey}`,
    }
  }

  list(): ChainInfo[] {
    return Object.values(CHAINS)
  }

  async getTokens(chainId: number): Promise<TokenInfo[]> {
    const res = await fetch(`${this.config.apiUrl}/v1/chains/${chainId}/tokens`, {
      headers: this.headers(),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Failed to get tokens for chain ${chainId} (${res.status}): ${text}`)
    }
    return res.json() as Promise<TokenInfo[]>
  }
}
