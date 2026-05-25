import { Block, BlockType } from '../types'

// Stable ID map: content hash → UUID. Survives re-parses for unchanged blocks.
const idCache = new Map<string, string>()

function hashContent(raw: string): string {
  let h = 0
  for (let i = 0; i < raw.length; i++) {
    h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0
  }
  return h.toString(36)
}

function stableId(raw: string): string {
  const key = hashContent(raw)
  if (!idCache.has(key)) {
    idCache.set(key, crypto.randomUUID())
  }
  return idCache.get(key)!
}

function detectType(raw: string): BlockType {
  const trimmed = raw.trimStart()
  if (!trimmed) return 'blank'
  if (/^#{1,6}\s/.test(trimmed)) return 'heading'
  if (/^(`{3,}|~{3,})/.test(trimmed)) return 'code'
  if (/^(\||\+[-|+]+\+)/.test(trimmed)) return 'table'
  if (/^[-*+]\s\[[ xX]\]/.test(trimmed)) return 'task-list'
  if (/^(\d+\.\s+\[[ xX]\])/.test(trimmed)) return 'task-list'
  if (/^[-*+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) return 'list'
  if (/^>/.test(trimmed)) return 'blockquote'
  if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) return 'hr'
  return 'paragraph'
}

export function parseBlocks(raw: string): Block[] {
  if (!raw || !raw.trim()) {
    return [{ id: stableId(''), raw: '', type: 'blank' }]
  }

  const lines = raw.split('\n')
  const chunks: string[] = []
  let current: string[] = []
  let inFence = false
  let fenceChar = ''
  let fenceLength = 0

  for (const line of lines) {
    const fenceMatch = line.match(/^(`{3,}|~{3,})/)

    if (!inFence) {
      if (fenceMatch) {
        // Opening fence — start protected block
        inFence = true
        fenceChar = fenceMatch[1][0]
        fenceLength = fenceMatch[1].length
        current.push(line)
      } else if (line.trim() === '' && current.length > 0) {
        // Blank line outside fence = potential block boundary
        // But only split if the previous content isn't the start of a table
        // (tables need consecutive lines — a blank line always ends a table)
        chunks.push(current.join('\n'))
        current = []
      } else {
        current.push(line)
      }
    } else {
      // Inside a fence
      current.push(line)
      // Closing fence: same character, same or greater length, nothing else on line
      if (
        fenceMatch &&
        fenceMatch[1][0] === fenceChar &&
        fenceMatch[1].length >= fenceLength &&
        line.trim() === fenceMatch[1]
      ) {
        inFence = false
        fenceChar = ''
        fenceLength = 0
      }
    }
  }

  // Flush last chunk
  if (current.length > 0) {
    chunks.push(current.join('\n'))
  }

  // Filter completely empty chunks (consecutive blank lines produce empty strings)
  const nonEmpty = chunks.filter((c) => c.trim() !== '')

  if (nonEmpty.length === 0) {
    return [{ id: stableId(''), raw: '', type: 'blank' }]
  }

  return nonEmpty.map((raw) => ({
    id: stableId(raw),
    raw,
    type: detectType(raw)
  }))
}

export function rebuildIdCache(blocks: Block[]): void {
  // Call after bulk operations (LOAD_FILE, NEW_FILE) so the cache reflects
  // current content and doesn't grow unboundedly across many file loads.
  idCache.clear()
  for (const block of blocks) {
    const key = hashContent(block.raw)
    idCache.set(key, block.id)
  }
}
