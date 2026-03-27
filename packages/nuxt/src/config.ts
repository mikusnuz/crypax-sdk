import type { CrypaxConfig } from '@crypax/shared'

export interface NuxtCrypaxConfig extends CrypaxConfig {
  ssr?: boolean
}

export function defineNuxtCrypaxConfig(config: NuxtCrypaxConfig): NuxtCrypaxConfig {
  return config
}
