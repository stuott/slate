import { createContext, useContext, useRef, useState, ReactNode } from 'react'

export type DialogVariant = 'primary' | 'danger' | 'default'

export type DialogButton = {
  label: string
  value: string
  variant?: DialogVariant
}

export type DialogConfig = {
  title: string
  message?: string
  buttons: DialogButton[]
}

interface DialogContextValue {
  config: DialogConfig | null
  showDialog: (config: DialogConfig) => Promise<string>
  choose: (value: string) => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<DialogConfig | null>(null)
  const resolveRef = useRef<((value: string) => void) | null>(null)

  function showDialog(cfg: DialogConfig): Promise<string> {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setConfig(cfg)
    })
  }

  function choose(value: string) {
    setConfig(null)
    resolveRef.current?.(value)
    resolveRef.current = null
  }

  return (
    <DialogContext.Provider value={{ config, showDialog, choose }}>
      {children}
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialog must be used within DialogProvider')
  return ctx
}
