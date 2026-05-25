import { describe, it, expect, beforeEach } from 'vitest'
import { parseBlocks, rebuildIdCache } from './parser'

beforeEach(() => {
  // Reset ID cache between tests so IDs are fresh
  rebuildIdCache([])
})

describe('parseBlocks', () => {
  it('returns single blank block for empty string', () => {
    const blocks = parseBlocks('')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('blank')
    expect(blocks[0].raw).toBe('')
  })

  it('returns single blank block for whitespace-only string', () => {
    const blocks = parseBlocks('   \n  \n')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('blank')
  })

  it('parses a single paragraph', () => {
    const blocks = parseBlocks('Hello world')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('paragraph')
    expect(blocks[0].raw).toBe('Hello world')
  })

  it('splits two paragraphs on blank line', () => {
    const blocks = parseBlocks('First paragraph\n\nSecond paragraph')
    expect(blocks).toHaveLength(2)
    expect(blocks[0].raw).toBe('First paragraph')
    expect(blocks[1].raw).toBe('Second paragraph')
  })

  it('handles multiple consecutive blank lines', () => {
    const blocks = parseBlocks('First\n\n\n\nSecond')
    expect(blocks).toHaveLength(2)
    expect(blocks[0].raw).toBe('First')
    expect(blocks[1].raw).toBe('Second')
  })

  it('detects headings', () => {
    const blocks = parseBlocks('# Heading 1\n\n## Heading 2\n\n### Heading 3')
    expect(blocks).toHaveLength(3)
    blocks.forEach((b) => expect(b.type).toBe('heading'))
  })

  it('detects heading followed by paragraph', () => {
    const blocks = parseBlocks('# Title\n\nSome text here')
    expect(blocks).toHaveLength(2)
    expect(blocks[0].type).toBe('heading')
    expect(blocks[1].type).toBe('paragraph')
  })

  it('does NOT split fenced code block on internal blank line', () => {
    const raw = '```javascript\nconst x = 1\n\nconsole.log(x)\n```'
    const blocks = parseBlocks(raw)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('code')
    expect(blocks[0].raw).toBe(raw)
  })

  it('handles fenced code block surrounded by text', () => {
    const raw = 'Before\n\n```\ncode here\n\nmore code\n```\n\nAfter'
    const blocks = parseBlocks(raw)
    expect(blocks).toHaveLength(3)
    expect(blocks[0].raw).toBe('Before')
    expect(blocks[1].type).toBe('code')
    expect(blocks[2].raw).toBe('After')
  })

  it('handles tilde fenced code blocks', () => {
    const raw = '~~~python\nprint("hi")\n\nprint("bye")\n~~~'
    const blocks = parseBlocks(raw)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('code')
  })

  it('parses GFM table as single block', () => {
    const raw = '| Name | Age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |'
    const blocks = parseBlocks(raw)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('table')
  })

  it('detects task list', () => {
    const raw = '- [ ] Task one\n- [x] Task two\n- [ ] Task three'
    const blocks = parseBlocks(raw)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('task-list')
  })

  it('detects blockquote', () => {
    const raw = '> This is a quote\n> that spans lines'
    const blocks = parseBlocks(raw)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('blockquote')
  })

  it('detects horizontal rule ---', () => {
    const blocks = parseBlocks('---')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('hr')
  })

  it('detects horizontal rule ***', () => {
    const blocks = parseBlocks('***')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('hr')
  })

  it('detects unordered list', () => {
    const raw = '- item one\n- item two\n- item three'
    const blocks = parseBlocks(raw)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('list')
  })

  it('detects ordered list', () => {
    const raw = '1. First\n2. Second\n3. Third'
    const blocks = parseBlocks(raw)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('list')
  })

  it('preserves multi-byte characters and emoji without corruption', () => {
    const raw = '# 日本語 🎉\n\nHello 世界 — "smart quotes"'
    const blocks = parseBlocks(raw)
    expect(blocks).toHaveLength(2)
    expect(blocks[0].raw).toBe('# 日本語 🎉')
    expect(blocks[1].raw).toBe('Hello 世界 — "smart quotes"')
  })

  it('assigns stable IDs to unchanged blocks across re-parse', () => {
    const raw = 'Block one\n\nBlock two\n\nBlock three'
    const first = parseBlocks(raw)
    const second = parseBlocks(raw)
    expect(first[0].id).toBe(second[0].id)
    expect(first[1].id).toBe(second[1].id)
    expect(first[2].id).toBe(second[2].id)
  })

  it('assigns different IDs to blocks with different content', () => {
    const blocks = parseBlocks('First\n\nSecond\n\nThird')
    const ids = new Set(blocks.map((b) => b.id))
    expect(ids.size).toBe(3)
  })

  it('all blocks have non-empty id strings', () => {
    const blocks = parseBlocks('# Heading\n\nParagraph\n\n```\ncode\n```')
    blocks.forEach((b) => {
      expect(b.id).toBeTruthy()
      expect(typeof b.id).toBe('string')
    })
  })
})
