import { useEffect, useRef } from 'react'
import { Block } from '../types'
import { useEditor } from '../context/EditorContext'

interface Props {
  block: Block
  initialHeight: number
  blockIndex: number
  totalBlocks: number
  onChange: (id: string, raw: string) => void
  onSplitBlock: (id: string, offset: number) => void
  onMergeWithPrev: (id: string) => void
  onMoveToPrev: (id: string) => void
  onMoveToNext: (id: string) => void
}

export function EditableBlock({
  block,
  initialHeight,
  onChange,
  onSplitBlock,
  onMergeWithPrev,
  onMoveToPrev,
  onMoveToNext
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { activeTab } = useEditor()

  // Focus and restore cursor when this block becomes active
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.focus()
    const offset = activeTab.cursorOffset
    if (offset > 0 && offset <= el.value.length) {
      el.selectionStart = offset
      el.selectionEnd = offset
    }
    autoResize(el)
  }, [block.id])

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    autoResize(e.target)
    onChange(block.id, e.target.value)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el = textareaRef.current!
    const { selectionStart, selectionEnd, value } = el

    if (e.key === 'Enter' && !e.shiftKey) {
      // If the character before the cursor is a newline, we're entering a blank line → split
      if (selectionStart === selectionEnd && selectionStart > 0 && value[selectionStart - 1] === '\n') {
        e.preventDefault()
        // Trim the trailing newline from the current block before splitting
        const trimmedOffset = selectionStart - 1
        onSplitBlock(block.id, trimmedOffset)
        return
      }
    }

    if (e.key === 'Backspace' && selectionStart === 0 && selectionEnd === 0) {
      e.preventDefault()
      onMergeWithPrev(block.id)
      return
    }

    if (e.key === 'ArrowUp') {
      // Check if cursor is on the first line
      const beforeCursor = value.slice(0, selectionStart)
      if (!beforeCursor.includes('\n')) {
        e.preventDefault()
        onMoveToPrev(block.id)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      // Check if cursor is on the last line
      const afterCursor = value.slice(selectionStart)
      if (!afterCursor.includes('\n')) {
        e.preventDefault()
        onMoveToNext(block.id)
      }
    }
  }

  function handlePaste() {
    // After paste settles, push full textarea value to state
    setTimeout(() => {
      const el = textareaRef.current
      if (el) {
        autoResize(el)
        onChange(block.id, el.value)
      }
    }, 0)
  }

  function handleCompositionEnd(e: React.CompositionEvent<HTMLTextAreaElement>) {
    autoResize(e.currentTarget)
    onChange(block.id, e.currentTarget.value)
  }

  return (
    <textarea
      ref={textareaRef}
      className="block__textarea"
      defaultValue={block.raw}
      style={{ minHeight: initialHeight > 0 ? initialHeight : undefined }}
      onChange={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onCompositionEnd={handleCompositionEnd}
      rows={1}
      spellCheck
    />
  )
}
