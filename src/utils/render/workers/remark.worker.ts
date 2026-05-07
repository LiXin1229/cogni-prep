import { remark } from 'remark'
import type { Root } from 'mdast'

interface ParseTask {
  id: number
  markdown: string
}

interface ParseResult {
  id: number
  ast: Root | null
  error: string | null
}

self.onmessage = (event: MessageEvent<ParseTask>) => {
  const { id, markdown } = event.data

  try {
    const ast = remark().parse(markdown) as Root
    const result: ParseResult = { id, ast, error: null }
    self.postMessage(result)
  } catch (error: any) {
    const result: ParseResult = { id, ast: null, error: error.message }
    self.postMessage(result)
  }
}
