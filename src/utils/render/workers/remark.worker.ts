import { remark } from 'remark'
import type { Root } from 'mdast'

type WorkerMessage = {
  id: number
  markdown: string
}

type WorkerResponse = {
  id: number
  ast: Root | null
  error: string | null
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { id, markdown } = event.data

  try {
    const ast = remark().parse(markdown) as Root
    self.postMessage({ id, ast, error: null } as WorkerResponse)
  } catch (error: any) {
    self.postMessage({ id, ast: null, error: error.message } as WorkerResponse)
  }
}
