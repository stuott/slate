import { useEffect, useRef } from 'react'
import { useEditor } from '../context/EditorContext'
import { useDialog } from '../context/DialogContext'
import { BlockList } from './BlockList'
import { TabBar } from './TabBar'
import { Sidebar } from './Sidebar'
import { useFileOps } from '../hooks/useFileOps'

export function Editor() {
  const { state, activeTab, dispatch } = useEditor()
  const { showDialog } = useDialog()
  const { newFile, openFile, saveFile, saveFileAs, serializeWithOverride } = useFileOps()
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleBlockChange(id: string, raw: string) {
    dispatch({ type: 'UPDATE_BLOCK', id, raw })
    if (autoSaveRef.current !== null) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(async () => {
      if (activeTab.filePath) {
        const content = serializeWithOverride(id, raw)
        await window.electronAPI.saveFile(activeTab.filePath, content)
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
  }, [activeTab.filePath, activeTab.blocks])

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

  // Sync dirty state to main process for close-guard (any tab)
  useEffect(() => {
    const anyDirty = state.tabs.some((t) => t.isDirty)
    window.electronAPI.setDirty(anyDirty)
  }, [state.tabs])

  // Handle close-guard dialog triggered by main process
  useEffect(() => {
    const cleanup = window.electronAPI.onCloseGuard(async () => {
      const result = await showDialog({
        title: 'Unsaved changes',
        message: 'Do you want to save your changes before closing?',
        buttons: [
          { label: 'Save', value: 'save', variant: 'primary' },
          { label: 'Discard', value: 'discard', variant: 'danger' },
          { label: 'Cancel', value: 'cancel', variant: 'default' },
        ],
      })
      window.electronAPI.sendCloseGuardResult(result)
    })
    return cleanup
  }, [showDialog])

  return (
    <div className="editor">
      <Sidebar />
      <main className="content-area">
        <TabBar />
        <div className="editor-scroll">
          <BlockList onBlockChange={handleBlockChange} />
        </div>
      </main>
    </div>
  )
}
