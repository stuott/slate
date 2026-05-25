import { useState, useEffect } from 'react'
import { useEditor } from '../context/EditorContext'
import { useSidebarResize } from '../hooks/useSidebarResize'

interface DirEntry {
  name: string
  isDirectory: boolean
  path: string
}

interface TreeNodeProps {
  entry: DirEntry
  depth: number
}

function TreeNode({ entry, depth }: TreeNodeProps) {
  const { dispatch } = useEditor()
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<DirEntry[] | null>(null)

  async function toggle() {
    if (!expanded && children === null) {
      const entries = await window.electronAPI.listDirectory(entry.path)
      setChildren(sortEntries(entries))
    }
    setExpanded((v) => !v)
  }

  async function openFile() {
    const content = await window.electronAPI.readFile(entry.path)
    dispatch({ type: 'OPEN_TAB', filePath: entry.path, content })
  }

  return (
    <div>
      <div
        className={`sidebar-item ${entry.isDirectory ? 'sidebar-item--dir' : 'sidebar-item--file'}`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={entry.isDirectory ? toggle : openFile}
        title={entry.name}
      >
        <span className="sidebar-item__icon">
          {entry.isDirectory ? (expanded ? '▾' : '▸') : ''}
        </span>
        <span className="sidebar-item__name">{entry.name}</span>
      </div>
      {expanded &&
        children &&
        children.map((child) => <TreeNode key={child.path} entry={child} depth={depth + 1} />)}
    </div>
  )
}

function sortEntries(entries: DirEntry[]): DirEntry[] {
  return entries
    .filter((e) => e.isDirectory || /\.(md|markdown|txt)$/i.test(e.name))
    .sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

export function Sidebar() {
  const { state } = useEditor()
  const dragHandleRef = useSidebarResize()
  const [rootEntries, setRootEntries] = useState<DirEntry[] | null>(null)
  const [loadedPath, setLoadedPath] = useState<string | null>(null)

  useEffect(() => {
    if (state.sidebarPath && state.sidebarPath !== loadedPath) {
      window.electronAPI.listDirectory(state.sidebarPath).then((entries) => {
        setRootEntries(sortEntries(entries))
        setLoadedPath(state.sidebarPath)
      })
    }
  }, [state.sidebarPath])

  const folderName = state.sidebarPath
    ? state.sidebarPath.split(/[\\/]/).pop() ?? state.sidebarPath
    : 'No folder'

  return (
    <div className="sidebar">
      <div className="sidebar__header">{folderName}</div>
      <div className="sidebar-tree">
        {!state.sidebarPath && (
          <p className="sidebar__empty">Open a file to browse its folder</p>
        )}
        {rootEntries && rootEntries.map((entry) => (
          <TreeNode key={entry.path} entry={entry} depth={0} />
        ))}
      </div>
      <div className="sidebar-drag-handle" ref={dragHandleRef} />
    </div>
  )
}
