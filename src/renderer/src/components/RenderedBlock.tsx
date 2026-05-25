import { useRef } from 'react'
import { Block } from '../types'
import { renderBlock } from '../core/renderer'

interface Props {
  block: Block
  onActivate: (id: string, renderedHeight: number) => void
}

export function RenderedBlock({ block, onActivate }: Props) {
  const divRef = useRef<HTMLDivElement>(null)

  function handleClick() {
    const height = divRef.current?.offsetHeight ?? 0
    onActivate(block.id, height)
  }

  return (
    <div
      ref={divRef}
      className="block__render"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: renderBlock(block.raw) || '<br />' }}
    />
  )
}
