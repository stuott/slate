import { useRef, useEffect, RefObject } from 'react'

const STORAGE_KEY = 'slate:sidebar-width'
const MIN_WIDTH = 140
const MAX_WIDTH = 480

export function useSidebarResize(): RefObject<HTMLDivElement | null> {
  const handleRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      document.documentElement.style.setProperty('--sidebar-width', `${saved}px`)
    }
  }, [])

  useEffect(() => {
    const handle = handleRef.current
    if (!handle) return

    function onPointerDown(e: PointerEvent) {
      e.preventDefault()
      handle!.setPointerCapture(e.pointerId)

      function onPointerMove(ev: PointerEvent) {
        const sidebar = handle!.parentElement
        if (!sidebar) return
        const rect = sidebar.getBoundingClientRect()
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, ev.clientX - rect.left))
        document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`)
      }

      function onPointerUp() {
        const raw = getComputedStyle(document.documentElement)
          .getPropertyValue('--sidebar-width')
          .trim()
        const w = parseFloat(raw)
        if (!isNaN(w)) localStorage.setItem(STORAGE_KEY, String(w))
        handle!.removeEventListener('pointermove', onPointerMove)
        handle!.removeEventListener('pointerup', onPointerUp)
      }

      handle!.addEventListener('pointermove', onPointerMove)
      handle!.addEventListener('pointerup', onPointerUp)
    }

    handle.addEventListener('pointerdown', onPointerDown)
    return () => handle.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return handleRef
}
