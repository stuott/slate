import { Block } from '../types'

export function serializeBlocks(blocks: Block[]): string {
  // Drop trailing blank blocks, then join with double newline
  let end = blocks.length
  while (end > 0 && blocks[end - 1].raw.trim() === '') {
    end--
  }
  return blocks
    .slice(0, end)
    .map((b) => b.raw)
    .join('\n\n')
}
