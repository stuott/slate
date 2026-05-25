import { useEffect, useRef } from 'react'
import { useDialog } from '../context/DialogContext'

export function Dialog() {
  const { config, choose } = useDialog()
  const firstBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!config) return
    firstBtnRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') choose('cancel')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [config])

  if (!config) return null

  return (
    <div className="dialog-overlay" onClick={() => choose('cancel')}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <p className="dialog__title">{config.title}</p>
        {config.message && <p className="dialog__message">{config.message}</p>}
        <div className="dialog__buttons">
          {config.buttons.map((btn, i) => (
            <button
              key={btn.value}
              ref={i === 0 ? firstBtnRef : undefined}
              className={`dialog__btn dialog__btn--${btn.variant ?? 'default'}`}
              onClick={() => choose(btn.value)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
