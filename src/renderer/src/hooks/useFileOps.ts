import { useEditor } from '../context/EditorContext'
import { useDialog } from '../context/DialogContext'
import { serializeBlocks } from '../core/serializer'

export function useFileOps() {
  const { state, dispatch, serializeContent } = useEditor()
  const { showDialog } = useDialog()

  async function newFile() {
    if (state.isDirty) {
      const result = await showDialog({
        title: 'Unsaved changes',
        message: 'Start a new file? Your current changes will be lost.',
        buttons: [
          { label: 'Discard changes', value: 'discard', variant: 'danger' },
          { label: 'Cancel', value: 'cancel', variant: 'default' },
        ],
      })
      if (result !== 'discard') return
    }
    dispatch({ type: 'NEW_FILE' })
  }

  async function openFile() {
    if (state.isDirty) {
      const result = await showDialog({
        title: 'Unsaved changes',
        message: 'Open a different file? Your current changes will be lost.',
        buttons: [
          { label: 'Discard changes', value: 'discard', variant: 'danger' },
          { label: 'Cancel', value: 'cancel', variant: 'default' },
        ],
      })
      if (result !== 'discard') return
    }
    const file = await window.electronAPI.openFile()
    if (file) {
      dispatch({ type: 'LOAD_FILE', content: file.content, filePath: file.filePath })
    }
  }

  async function saveFile() {
    const content = serializeContent()
    if (state.filePath) {
      await window.electronAPI.saveFile(state.filePath, content)
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
    if (!state.filePath) return
    if (state.isDirty) {
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
    const content = await window.electronAPI.readFile(state.filePath)
    dispatch({ type: 'LOAD_FILE', content, filePath: state.filePath })
  }

  // Used by auto-save in Editor: builds content with the in-flight raw value before
  // the state update has flushed, avoiding a stale-closure read of state.blocks.
  function serializeWithOverride(id: string, raw: string): string {
    return serializeBlocks(state.blocks.map((b) => (b.id === id ? { ...b, raw } : b)))
  }

  return { newFile, openFile, saveFile, saveFileAs, reloadFile, serializeWithOverride }
}
