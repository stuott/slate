import { useEditor } from '../context/EditorContext'
import { serializeBlocks } from '../core/serializer'

export function useFileOps() {
  const { state, dispatch, serializeContent } = useEditor()

  async function newFile() {
    if (state.isDirty) {
      const ok = await window.electronAPI.showConfirm('You have unsaved changes. Start a new file anyway?')
      if (!ok) return
    }
    dispatch({ type: 'NEW_FILE' })
  }

  async function openFile() {
    if (state.isDirty) {
      const ok = await window.electronAPI.showConfirm('You have unsaved changes. Open a new file anyway?')
      if (!ok) return
    }
    const result = await window.electronAPI.openFile()
    if (result) {
      dispatch({ type: 'LOAD_FILE', content: result.content, filePath: result.filePath })
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
      const ok = await window.electronAPI.showConfirm('Discard unsaved changes and reload from disk?')
      if (!ok) return
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
