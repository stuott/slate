import MarkdownIt from 'markdown-it'
import taskLists from 'markdown-it-task-lists'
import DOMPurify from 'dompurify'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
}).use(taskLists, { enabled: true })

export function renderBlock(raw: string): string {
  if (!raw || !raw.trim()) return ''
  return DOMPurify.sanitize(md.render(raw))
}
