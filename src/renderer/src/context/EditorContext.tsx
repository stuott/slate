import { createContext, useContext, useReducer, Dispatch, ReactNode } from 'react'
import { Block, EditorAction, EditorState } from '../types'
import { parseBlocks, rebuildIdCache } from '../core/parser'
import { serializeBlocks } from '../core/serializer'

const initialState: EditorState = {
  blocks: [{ id: crypto.randomUUID(), raw: '', type: 'blank' }],
  activeBlockId: null,
  cursorOffset: 0,
  filePath: null,
  isDirty: false
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_ACTIVE_BLOCK':
      return { ...state, activeBlockId: action.id, cursorOffset: 0 }

    case 'UPDATE_BLOCK': {
      const blocks = state.blocks.map((b) => {
        if (b.id !== action.id) return b
        const newRaw = action.raw
        // Re-derive type from updated raw
        const reparsed = parseBlocks(newRaw)
        const type = reparsed.length > 0 ? reparsed[0].type : 'blank'
        return { ...b, raw: newRaw, type }
      })
      return { ...state, blocks, isDirty: true }
    }

    case 'SPLIT_BLOCK': {
      const idx = state.blocks.findIndex((b) => b.id === action.id)
      if (idx === -1) return state
      const block = state.blocks[idx]
      const before = block.raw.slice(0, action.offset)
      const after = block.raw.slice(action.offset).trimStart()
      const beforeParsed = parseBlocks(before || '')
      const afterParsed = parseBlocks(after || '')
      const newBefore: Block = {
        id: block.id,
        raw: before,
        type: beforeParsed[0]?.type ?? 'paragraph'
      }
      const newAfter: Block = {
        id: crypto.randomUUID(),
        raw: after,
        type: afterParsed[0]?.type ?? 'blank'
      }
      const blocks = [
        ...state.blocks.slice(0, idx),
        newBefore,
        newAfter,
        ...state.blocks.slice(idx + 1)
      ]
      return { ...state, blocks, activeBlockId: newAfter.id, isDirty: true }
    }

    case 'MERGE_BLOCK_WITH_PREV': {
      const idx = state.blocks.findIndex((b) => b.id === action.id)
      if (idx <= 0) return state
      const prev = state.blocks[idx - 1]
      const curr = state.blocks[idx]
      const mergedRaw = prev.raw + (prev.raw && curr.raw ? '\n\n' : '') + curr.raw
      const mergedParsed = parseBlocks(mergedRaw || '')
      const merged: Block = {
        id: prev.id,
        raw: mergedRaw,
        type: mergedParsed[0]?.type ?? 'paragraph'
      }
      const joinOffset = prev.raw.length
      const blocks = [
        ...state.blocks.slice(0, idx - 1),
        merged,
        ...state.blocks.slice(idx + 1)
      ]
      return { ...state, blocks, activeBlockId: prev.id, cursorOffset: joinOffset, isDirty: true }
    }

    case 'LOAD_FILE': {
      const blocks = parseBlocks(action.content)
      rebuildIdCache(blocks)
      return {
        blocks,
        activeBlockId: null,
        cursorOffset: 0,
        filePath: action.filePath,
        isDirty: false
      }
    }

    case 'NEW_FILE': {
      const blank: Block = { id: crypto.randomUUID(), raw: '', type: 'blank' }
      rebuildIdCache([blank])
      return {
        blocks: [blank],
        activeBlockId: blank.id,
        cursorOffset: 0,
        filePath: null,
        isDirty: false
      }
    }

    case 'MARK_SAVED':
      return { ...state, isDirty: false }

    case 'APPEND_BLOCK': {
      const last = state.blocks[state.blocks.length - 1]
      // If the last block is already blank, just activate it instead of stacking empties
      if (last && last.raw.trim() === '') {
        return { ...state, activeBlockId: last.id, cursorOffset: 0 }
      }
      const blank: Block = { id: crypto.randomUUID(), raw: '', type: 'blank' }
      return {
        ...state,
        blocks: [...state.blocks, blank],
        activeBlockId: blank.id,
        cursorOffset: 0,
        isDirty: true
      }
    }

    default:
      return state
  }
}

interface EditorContextValue {
  state: EditorState
  dispatch: Dispatch<EditorAction>
  serializeContent: () => string
}

const EditorContext = createContext<EditorContextValue | null>(null)

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState)

  const serializeContent = () => serializeBlocks(state.blocks)

  return (
    <EditorContext.Provider value={{ state, dispatch, serializeContent }}>
      {children}
    </EditorContext.Provider>
  )
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used within EditorProvider')
  return ctx
}
