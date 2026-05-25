import { createContext, useContext, useReducer, Dispatch, ReactNode } from 'react'
import { Block, TabState, EditorAction, EditorState } from '../types'
import { parseBlocks, rebuildIdCache } from '../core/parser'
import { serializeBlocks } from '../core/serializer'

function dirnameOf(filePath: string): string {
  const m = filePath.match(/^(.*)[/\\][^/\\]+$/)
  return m ? m[1] : filePath
}

function makeBlankTab(): TabState {
  const blank: Block = { id: crypto.randomUUID(), raw: '', type: 'blank' }
  return {
    id: crypto.randomUUID(),
    blocks: [blank],
    activeBlockId: blank.id,
    cursorOffset: 0,
    filePath: null,
    isDirty: false,
  }
}

const initialTab = makeBlankTab()
const initialState: EditorState = {
  tabs: [initialTab],
  activeTabId: initialTab.id,
  sidebarPath: null,
}

function withActiveTab(state: EditorState, fn: (tab: TabState) => TabState): EditorState {
  return {
    ...state,
    tabs: state.tabs.map((t) => (t.id === state.activeTabId ? fn(t) : t)),
  }
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_ACTIVE_BLOCK':
      return withActiveTab(state, (tab) => ({ ...tab, activeBlockId: action.id, cursorOffset: 0 }))

    case 'UPDATE_BLOCK':
      return withActiveTab(state, (tab) => {
        const blocks = tab.blocks.map((b) => {
          if (b.id !== action.id) return b
          const reparsed = parseBlocks(action.raw)
          const type = reparsed.length > 0 ? reparsed[0].type : 'blank'
          return { ...b, raw: action.raw, type }
        })
        return { ...tab, blocks, isDirty: true }
      })

    case 'SPLIT_BLOCK':
      return withActiveTab(state, (tab) => {
        const idx = tab.blocks.findIndex((b) => b.id === action.id)
        if (idx === -1) return tab
        const block = tab.blocks[idx]
        const before = block.raw.slice(0, action.offset)
        const after = block.raw.slice(action.offset).trimStart()
        const newBefore: Block = {
          id: block.id,
          raw: before,
          type: parseBlocks(before || '')[0]?.type ?? 'paragraph',
        }
        const newAfter: Block = {
          id: crypto.randomUUID(),
          raw: after,
          type: parseBlocks(after || '')[0]?.type ?? 'blank',
        }
        return {
          ...tab,
          blocks: [
            ...tab.blocks.slice(0, idx),
            newBefore,
            newAfter,
            ...tab.blocks.slice(idx + 1),
          ],
          activeBlockId: newAfter.id,
          isDirty: true,
        }
      })

    case 'MERGE_BLOCK_WITH_PREV':
      return withActiveTab(state, (tab) => {
        const idx = tab.blocks.findIndex((b) => b.id === action.id)
        if (idx <= 0) return tab
        const prev = tab.blocks[idx - 1]
        const curr = tab.blocks[idx]
        const mergedRaw = prev.raw + (prev.raw && curr.raw ? '\n\n' : '') + curr.raw
        const merged: Block = {
          id: prev.id,
          raw: mergedRaw,
          type: parseBlocks(mergedRaw || '')[0]?.type ?? 'paragraph',
        }
        return {
          ...tab,
          blocks: [...tab.blocks.slice(0, idx - 1), merged, ...tab.blocks.slice(idx + 1)],
          activeBlockId: prev.id,
          cursorOffset: prev.raw.length,
          isDirty: true,
        }
      })

    case 'LOAD_FILE': {
      const blocks = parseBlocks(action.content)
      rebuildIdCache(blocks)
      return withActiveTab(state, (tab) => ({
        ...tab,
        blocks,
        activeBlockId: null,
        cursorOffset: 0,
        filePath: action.filePath,
        isDirty: false,
      }))
    }

    case 'NEW_FILE':
    case 'NEW_TAB': {
      const newTab = makeBlankTab()
      return { ...state, tabs: [...state.tabs, newTab], activeTabId: newTab.id }
    }

    case 'MARK_SAVED':
      return withActiveTab(state, (tab) => ({ ...tab, isDirty: false }))

    case 'APPEND_BLOCK':
      return withActiveTab(state, (tab) => {
        const last = tab.blocks[tab.blocks.length - 1]
        if (last && last.raw.trim() === '') {
          return { ...tab, activeBlockId: last.id, cursorOffset: 0 }
        }
        const blank: Block = { id: crypto.randomUUID(), raw: '', type: 'blank' }
        return {
          ...tab,
          blocks: [...tab.blocks, blank],
          activeBlockId: blank.id,
          cursorOffset: 0,
          isDirty: true,
        }
      })

    case 'OPEN_TAB': {
      const existing = state.tabs.find((t) => t.filePath === action.filePath)
      if (existing) {
        return { ...state, activeTabId: existing.id }
      }
      const blocks = parseBlocks(action.content)
      rebuildIdCache(blocks)
      const newTab: TabState = {
        id: crypto.randomUUID(),
        blocks,
        activeBlockId: null,
        cursorOffset: 0,
        filePath: action.filePath,
        isDirty: false,
      }
      return {
        ...state,
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
        sidebarPath: dirnameOf(action.filePath),
      }
    }

    case 'CLOSE_TAB': {
      if (state.tabs.length === 1) {
        const replacement = makeBlankTab()
        return { ...state, tabs: [replacement], activeTabId: replacement.id }
      }
      const idx = state.tabs.findIndex((t) => t.id === action.tabId)
      const newTabs = state.tabs.filter((t) => t.id !== action.tabId)
      const newActiveId =
        state.activeTabId === action.tabId
          ? newTabs[Math.min(idx, newTabs.length - 1)].id
          : state.activeTabId
      return { ...state, tabs: newTabs, activeTabId: newActiveId }
    }

    case 'SWITCH_TAB':
      return { ...state, activeTabId: action.tabId }

    case 'SET_SIDEBAR_PATH':
      return { ...state, sidebarPath: action.path }

    default:
      return state
  }
}

interface EditorContextValue {
  state: EditorState
  activeTab: TabState
  dispatch: Dispatch<EditorAction>
  serializeContent: () => string
}

const EditorContext = createContext<EditorContextValue | null>(null)

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState)
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId)!
  const serializeContent = () => serializeBlocks(activeTab.blocks)

  return (
    <EditorContext.Provider value={{ state, activeTab, dispatch, serializeContent }}>
      {children}
    </EditorContext.Provider>
  )
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used within EditorProvider')
  return ctx
}
