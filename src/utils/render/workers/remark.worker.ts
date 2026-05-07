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
  timing?: {
    receivedAt: number
    parseDuration: number
    postStart: number
  }
}

let currentTaskId = 0

self.onmessage = (event: MessageEvent<ParseTask>) => {
  const { id, markdown } = event.data

  if (id < currentTaskId) {
    console.log(`[Worker] 跳过旧任务 ${id}, 当前最新=${currentTaskId}`)
    return
  }
  currentTaskId = id

  const receivedAt = performance.now()
  const parseStart = performance.now()
  try {
    const ast = remark().parse(markdown) as Root
    const parseEnd = performance.now()

    if (id < currentTaskId) {
      console.log(`[Worker] 解析完成但已过时 ${id}, 丢弃`)
      return
    }

    const postStart = performance.now()
    const result: ParseResult = {
      id,
      ast,
      error: null,
      timing: {
        receivedAt,
        parseDuration: parseEnd - parseStart,
        postStart,
      },
    }
    self.postMessage(result)
    const postEnd = performance.now()

    const cloneStart = performance.now()
    structuredClone(ast)
    const cloneEnd = performance.now()

    console.log(
      `[Worker] 任务 ${id}: parse=${(parseEnd - parseStart).toFixed(2)}ms, postMessage=${(postEnd - postStart).toFixed(2)}ms, 序列化≈${(cloneEnd - cloneStart).toFixed(2)}ms`
    )
  } catch (error: any) {
    if (id >= currentTaskId) {
      const result: ParseResult = { id, ast: null, error: error.message }
      self.postMessage(result)
    }
  }
}
