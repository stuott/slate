import { useRef } from 'react'
import { useEditor } from '../context/EditorContext'
import { EditableBlock } from './EditableBlock'
import { RenderedBlock } from './RenderedBlock'

interface Props {
  onBlockChange: (id: string, raw: string) => void
}

export function BlockList({ onBlockChange }: Props) {
  const { state, dispatch } = useEditor()
  // Store the last rendered height per block id to prevent layout shift
  const renderedHeights = useRef<Map<string, number>>(new Map())

  function handleActivate(id: string, height: number) {
    renderedHeights.current.set(id, height)
    dispatch({ type: 'SET_ACTIVE_BLOCK', id })
  }

  function handleSplitBlock(id: string, offset: number) {
    dispatch({ type: 'SPLIT_BLOCK', id, offset })
  }

  function handleMergeWithPrev(id: string) {
    dispatch({ type: 'MERGE_BLOCK_WITH_PREV', id })
  }

  function handleMoveToPrev(id: string) {
    const idx = state.blocks.findIndex((b) => b.id === id)
    if (idx > 0) {
      dispatch({ type: 'SET_ACTIVE_BLOCK', id: state.blocks[idx - 1].id })
    }
  }

  function handleMoveToNext(id: string) {
    const idx = state.blocks.findIndex((b) => b.id === id)
    if (idx < state.blocks.length - 1) {
      dispatch({ type: 'SET_ACTIVE_BLOCK', id: state.blocks[idx + 1].id })
    }
  }

  function handlePlaceholderClick() {
    dispatch({ type: 'APPEND_BLOCK' })
  }

  return (
    <div className="block-list">
      {state.blocks.map((block, idx) => {
        const isActive = block.id === state.activeBlockId

        return (
          <div
            key={block.id}
            className={`block${isActive ? ' block--active' : ''}`}
          >
            {isActive ? (
              <EditableBlock
                block={block}
                initialHeight={renderedHeights.current.get(block.id) ?? 0}
                blockIndex={idx}
                totalBlocks={state.blocks.length}
                onChange={onBlockChange}
                onSplitBlock={handleSplitBlock}
                onMergeWithPrev={handleMergeWithPrev}
                onMoveToPrev={handleMoveToPrev}
                onMoveToNext={handleMoveToNext}
              />
            ) : (
              <RenderedBlock block={block} onActivate={handleActivate} />
            )}
          </div>
        )
      })}
      <div className="block-list__placeholder" onClick={handlePlaceholderClick} />
    </div>
  )
}
