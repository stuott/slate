import { useEditor } from '../context/EditorContext'
import { useDialog } from '../context/DialogContext'

export function TabBar() {
  const { state, dispatch } = useEditor()
  const { showDialog } = useDialog()

  async function handleClose(tabId: string, isDirty: boolean, e: React.MouseEvent) {
    e.stopPropagation()
    if (isDirty) {
      const result = await showDialog({
        title: 'Unsaved changes',
        message: 'Close this tab? Unsaved changes will be lost.',
        buttons: [
          { label: 'Discard changes', value: 'discard', variant: 'danger' },
          { label: 'Cancel', value: 'cancel', variant: 'default' },
        ],
      })
      if (result !== 'discard') return
    }
    dispatch({ type: 'CLOSE_TAB', tabId })
  }

  return (
    <div className="tab-bar">
      {state.tabs.map((tab) => {
        const filename = tab.filePath
          ? tab.filePath.split(/[\\/]/).pop() ?? 'untitled.md'
          : 'untitled.md'
        const isActive = tab.id === state.activeTabId

        return (
          <div
            key={tab.id}
            className={`tab${isActive ? ' tab--active' : ''}`}
            onClick={() => dispatch({ type: 'SWITCH_TAB', tabId: tab.id })}
          >
            {tab.isDirty && <span className="tab__dirty">·</span>}
            <span className="tab__name">{filename}</span>
            <button
              className="tab__close"
              onClick={(e) => handleClose(tab.id, tab.isDirty, e)}
              title="Close tab"
            >
              ×
            </button>
          </div>
        )
      })}
      <button
        className="tab-new-btn"
        onClick={() => dispatch({ type: 'NEW_TAB' })}
        title="New tab"
      >
        +
      </button>
    </div>
  )
}
