import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFileCirclePlus,
  faFolderOpen,
  faFloppyDisk,
  faArrowsRotate,
  faMinus,
  faExpand,
  faCompress,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { useEditor } from '../context/EditorContext'
import { useFileOps } from '../hooks/useFileOps'
import { FontSelector } from './FontSelector'

export function Toolbar() {
  const { activeTab } = useEditor()
  const { newFile, openFile, saveFile, reloadFile } = useFileOps()
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electronAPI.isMaximized().then(setIsMaximized)
    return window.electronAPI.onMaximizeChange(setIsMaximized)
  }, [])

  useEffect(() => {
    const filename = activeTab.filePath
      ? activeTab.filePath.split(/[\\/]/).pop() ?? 'untitled.md'
      : 'untitled.md'
    window.electronAPI.setTitle(`${activeTab.isDirty ? '• ' : ''}${filename} — Slate`)
  }, [activeTab.filePath, activeTab.isDirty])

  const filename = activeTab.filePath
    ? activeTab.filePath.split(/[\\/]/).pop() ?? 'untitled.md'
    : 'untitled.md'

  const canReload = !!activeTab.filePath
  const canSave = activeTab.isDirty || !!activeTab.filePath

  return (
    <div className="toolbar-wrap">
      {/* Row 1: title + window controls */}
      <header className="toolbar">
        <span className="toolbar__title">
          {activeTab.isDirty && <span className="toolbar__dirty">•</span>}
          {filename}
        </span>
        <div className="toolbar__drag" />
        <div className="toolbar__right">
          <div className="toolbar__controls">
            <button className="toolbar__wbtn" onClick={() => window.electronAPI.minimizeWindow()} title="Minimize">
              <FontAwesomeIcon icon={faMinus} />
            </button>
            <button className="toolbar__wbtn" onClick={() => window.electronAPI.maximizeWindow()} title={isMaximized ? 'Restore' : 'Maximize'}>
              <FontAwesomeIcon icon={isMaximized ? faCompress : faExpand} />
            </button>
            <button className="toolbar__wbtn toolbar__wbtn--close" onClick={() => window.electronAPI.closeWindow()} title="Close">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>
      </header>

      {/* Row 2: file action buttons */}
      <div className="toolbar__actionbar">
        <button className="toolbar__btn" onClick={newFile} title="New file (Ctrl+N)">
          <FontAwesomeIcon icon={faFileCirclePlus} />
        </button>
        <button className="toolbar__btn" onClick={openFile} title="Open file (Ctrl+O)">
          <FontAwesomeIcon icon={faFolderOpen} />
        </button>
        <button className="toolbar__btn" onClick={saveFile} disabled={!canSave} title="Save (Ctrl+S)">
          <FontAwesomeIcon icon={faFloppyDisk} />
        </button>
        <button className="toolbar__btn" onClick={reloadFile} disabled={!canReload} title="Reload from disk">
          <FontAwesomeIcon icon={faArrowsRotate} />
        </button>
        <div className="toolbar__sep" />
        <FontSelector />
      </div>
    </div>
  )
}
