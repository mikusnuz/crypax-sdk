import { writable } from 'svelte/store'
import { Crypax } from '@crypax/js'
import type { CrypaxConfig, PaymentResult, PaymentStatus } from '@crypax/js'

export function createCrypaxStore(publishableKey: string, config?: Omit<CrypaxConfig, 'publishableKey'>) {
  const instance = new Crypax(publishableKey, config)
  const store = writable(instance)
  return { subscribe: store.subscribe, instance, destroy: () => instance.destroy() }
}

export function createPaymentStore(instance: Crypax) {
  const status = writable<PaymentStatus>('idle')
  const result = writable<PaymentResult | null>(null)
  const error = writable<string | null>(null)

  instance.on('status_change', (data: any) => status.set(data.status))

  return {
    status: { subscribe: status.subscribe },
    result: { subscribe: result.subscribe },
    error: { subscribe: error.subscribe },
    confirmPayment: async (clientSecret: string) => {
      error.set(null); result.set(null)
      try {
        const res = await instance.confirmPayment(clientSecret)
        result.set(res); return res
      } catch (e: any) { error.set(e.message); throw e }
    },
    reset: () => { status.set('idle'); result.set(null); error.set(null) },
  }
}
