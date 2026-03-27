import { Injectable, Inject, Optional, InjectionToken } from '@angular/core'
import { Crypax } from '@crypax/js'
import type { CrypaxConfig, PaymentResult, PaymentStatus, WalletInfo } from '@crypax/js'
import { BehaviorSubject } from 'rxjs'

export const CRYPAX_CONFIG = new InjectionToken<CrypaxConfig>('CRYPAX_CONFIG')

@Injectable({ providedIn: 'root' })
export class CrypaxService {
  private instance: Crypax | null = null
  private statusSubject = new BehaviorSubject<PaymentStatus>('idle')
  public status$ = this.statusSubject.asObservable()

  constructor(@Optional() @Inject(CRYPAX_CONFIG) config?: CrypaxConfig) {
    if (config?.publishableKey) this.init(config.publishableKey, config)
  }

  init(publishableKey: string, config?: Omit<CrypaxConfig, 'publishableKey'>) {
    this.instance = new Crypax(publishableKey, config)
    this.instance.on('status_change', (data: any) => this.statusSubject.next(data.status))
  }

  async confirmPayment(clientSecret: string): Promise<PaymentResult> {
    if (!this.instance) throw new Error('Crypax not initialized')
    return this.instance.confirmPayment(clientSecret)
  }

  async getWallet(): Promise<WalletInfo> {
    if (!this.instance) throw new Error('Crypax not initialized')
    return this.instance.getWallet()
  }

  destroy() { this.instance?.destroy(); this.instance = null }
}
