export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'code'
  | 'list'
  | 'blockquote'
  | 'table'
  | 'task-list'
  | 'hr'
  | 'blank'

export interface Block {
  id: string
  raw: string
  type: BlockType
}

export interface TabState {
  id: string
  blocks: Block[]
  activeBlockId: string | null
  cursorOffset: number
  filePath: string | null
  isDirty: boolean
}

export interface EditorState {
  tabs: TabState[]
  activeTabId: string
  sidebarPath: string | null
}

export type EditorAction =
  | { type: 'SET_ACTIVE_BLOCK'; id: string | null }
  | { type: 'UPDATE_BLOCK'; id: string; raw: string }
  | { type: 'SPLIT_BLOCK'; id: string; offset: number }
  | { type: 'MERGE_BLOCK_WITH_PREV'; id: string }
  | { type: 'LOAD_FILE'; content: string; filePath: string }
  | { type: 'NEW_FILE' }
  | { type: 'MARK_SAVED' }
  | { type: 'APPEND_BLOCK' }
  | { type: 'OPEN_TAB'; filePath: string; content: string }
  | { type: 'CLOSE_TAB'; tabId: string }
  | { type: 'SWITCH_TAB'; tabId: string }
  | { type: 'NEW_TAB' }
  | { type: 'SET_SIDEBAR_PATH'; path: string }

export interface ElectronAPI {
  openFile: () => Promise<{ filePath: string; content: string } | null>
  saveFile: (filePath: string, content: string) => Promise<boolean>
  saveFileAs: (content: string) => Promise<string | null>
  readFile: (filePath: string) => Promise<string>
  setTitle: (title: string) => Promise<void>
  setDirty: (dirty: boolean) => Promise<void>
  onCloseGuard: (cb: () => void) => () => void
  sendCloseGuardResult: (result: string) => void
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (cb: (maximized: boolean) => void) => () => void
  onMenuNewFile: (cb: () => void) => () => void
  onMenuOpenFile: (cb: () => void) => () => void
  onMenuSaveFile: (cb: () => void) => () => void
  onMenuSaveAs: (cb: () => void) => () => void
  listDirectory: (dirPath: string) => Promise<{ name: string; isDirectory: boolean; path: string }[]>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
