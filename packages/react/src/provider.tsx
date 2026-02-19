import { createContext, useContext, useRef, useEffect } from 'react'
import { Crypax, type CrypaxConfig } from '@crypax/js'

const CrypaxContext = createContext<Crypax | null>(null)

export function CrypaxProvider({
  publishableKey,
  options,
  children,
}: {
  publishableKey: string
  options?: Omit<CrypaxConfig, 'publishableKey'>
  children: React.ReactNode
}) {
  const ref = useRef<Crypax | null>(null)

  if (!ref.current) {
    ref.current = new Crypax(publishableKey, options)
  }

  useEffect(() => {
    return () => {
      ref.current?.destroy()
    }
  }, [])

  useEffect(() => {
    if (options) ref.current?.setConfig(options)
  }, [options])

  return (
    <CrypaxContext.Provider value={ref.current}>
      {children}
    </CrypaxContext.Provider>
  )
}

export function useCrypax() {
  const ctx = useContext(CrypaxContext)
  if (!ctx) throw new Error('useCrypax must be used within CrypaxProvider')
  return ctx
}
