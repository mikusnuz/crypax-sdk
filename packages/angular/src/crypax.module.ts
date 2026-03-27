import { NgModule } from '@angular/core'
import type { ModuleWithProviders } from '@angular/core'
import { CrypaxService, CRYPAX_CONFIG } from './crypax.service'
import type { CrypaxConfig } from '@crypax/js'

@NgModule({ providers: [CrypaxService] })
export class CrypaxModule {
  static forRoot(config: CrypaxConfig): ModuleWithProviders<CrypaxModule> {
    return { ngModule: CrypaxModule, providers: [{ provide: CRYPAX_CONFIG, useValue: config }] }
  }
}
