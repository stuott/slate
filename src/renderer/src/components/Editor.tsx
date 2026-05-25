import { useEffect, useRef } from 'react'
import { useEditor } from '../context/EditorContext'
import { BlockList } from './BlockList'
import { useFileOps } from '../hooks/useFileOps'

export function Editor() {
  const { state, dispatch } = useEditor()
  const { newFile, openFile, saveFile, saveFileAs, serializeWithOverride } = useFileOps()
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleBlockChange(id: string, raw: string) {
    dispatch({ type: 'UPDATE_BLOCK', id, raw })
    if (autoSaveRef.current !== null) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(async () => {
      if (state.filePath) {
        const content = serializeWithOverride(id, raw)
        await window.electronAPI.saveFile(state.filePath, content)
        dispatch({ type: 'MARK_SAVED' })
      }
    }, 1000)
  }

  // Ctrl+S / Cmd+S explicit save
  useEffect(() => {
    async function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault()
        await saveFile()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && e.shiftKey) {
        e.preventDefault()
        await saveFileAs()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.filePath, state.blocks])

  // Register IPC menu listeners
  useEffect(() => {
    const cleanups = [
      window.electronAPI.onMenuNewFile(newFile),
      window.electronAPI.onMenuOpenFile(openFile),
      window.electronAPI.onMenuSaveFile(saveFile),
      window.electronAPI.onMenuSaveAs(saveFileAs),
    ]
    return () => cleanups.forEach((fn) => fn())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync dirty state to main process for close-guard
  useEffect(() => {
    window.electronAPI.setDirty(state.isDirty)
  }, [state.isDirty])

  return (
    <main className="editor">
      <BlockList onBlockChange={handleBlockChange} />
    </main>
  )
}
