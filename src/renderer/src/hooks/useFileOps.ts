import { useEditor } from '../context/EditorContext'
import { useDialog } from '../context/DialogContext'
import { serializeBlocks } from '../core/serializer'

export function useFileOps() {
  const { activeTab, dispatch, serializeContent } = useEditor()
  const { showDialog } = useDialog()

  async function newFile() {
    dispatch({ type: 'NEW_TAB' })
  }

  async function openFile() {
    const file = await window.electronAPI.openFile()
    if (file) {
      dispatch({ type: 'OPEN_TAB', content: file.content, filePath: file.filePath })
    }
  }

  async function saveFile() {
    const content = serializeContent()
    if (activeTab.filePath) {
      await window.electronAPI.saveFile(activeTab.filePath, content)
      dispatch({ type: 'MARK_SAVED' })
    } else {
      await saveFileAs()
    }
  }

  async function saveFileAs() {
    const content = serializeContent()
    const filePath = await window.electronAPI.saveFileAs(content)
    if (filePath) {
      dispatch({ type: 'LOAD_FILE', content, filePath })
    }
  }

  async function reloadFile() {
    if (!activeTab.filePath) return
    if (activeTab.isDirty) {
      const result = await showDialog({
        title: 'Reload from disk',
        message: 'Discard unsaved changes and reload the file?',
        buttons: [
          { label: 'Reload', value: 'reload', variant: 'danger' },
          { label: 'Cancel', value: 'cancel', variant: 'default' },
        ],
      })
      if (result !== 'reload') return
    }
    const content = await window.electronAPI.readFile(activeTab.filePath)
    dispatch({ type: 'LOAD_FILE', content, filePath: activeTab.filePath })
  }

  // Used by auto-save in Editor: builds content with the in-flight raw value before
  // the state update has flushed, avoiding a stale-closure read of activeTab.blocks.
  function serializeWithOverride(id: string, raw: string): string {
    return serializeBlocks(activeTab.blocks.map((b) => (b.id === id ? { ...b, raw } : b)))
  }

  return { newFile, openFile, saveFile, saveFileAs, reloadFile, serializeWithOverride }
}
