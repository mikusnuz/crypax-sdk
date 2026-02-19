import { inject, type App, type InjectionKey } from 'vue'
import { Crypax, type CrypaxConfig } from '@crypax/js'

export const CrypaxKey: InjectionKey<Crypax> = Symbol('Crypax')

export interface CrypaxPluginOptions extends Omit<CrypaxConfig, 'publishableKey'> {
  publishableKey: string
}

export const CrypaxPlugin = {
  install(app: App, options: CrypaxPluginOptions) {
    const { publishableKey, ...rest } = options
    const crypax = new Crypax(publishableKey, rest)
    app.provide(CrypaxKey, crypax)
    app.config.globalProperties.$crypax = crypax
  },
}

export function useCrypax(): Crypax {
  const crypax = inject(CrypaxKey)
  if (!crypax) throw new Error('Crypax plugin is not installed. Call app.use(CrypaxPlugin, { publishableKey: "..." })')
  return crypax
}
