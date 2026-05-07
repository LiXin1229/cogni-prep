import { computed, h, ref, watch, type Ref, type VNode } from 'vue'
import { remark } from 'remark'
import { createSelector, type Position } from './select'
import { createEditor, type Editor } from './edit'
import { isHTMLElement } from './utils/general'
import { createRenderer, preprocessAst } from './renderer'
import type { Root } from 'mdast'
import type { Node } from './ast'
import { setupInputHandler, type InputHandler } from './inputHandler'
import { createBlobUrlManager, type ParseUrlToBlob } from './blobUrlManager'
import { createHljs } from './hljs'

export * from './select'
export * from './edit'
export * from './inputHandler'
export * from './renderer'

export type MarkDown = {
  root: () => VNode
  source: Ref<string>
  editor: Editor
  inputHandler: InputHandler
  cleanup: () => void
}
export type EditorRef = Ref<HTMLElement | undefined>
export type DomToNode = WeakMap<HTMLElement, Node>
export type EditingNodeMap = Ref<Map<number, boolean>>
export type EditingBlockCodeDomMap = Map<number, HTMLElement>
export type BlockCodePosInfo = { content: Position; head: Position; tail: Position }
export type KeyPositionMaps = {
  blockCode: Map<number, BlockCodePosInfo>
}
export type UseOptions = {
  isReadonly: boolean
  parseUrlToBlob: ParseUrlToBlob
}

export function createMarkdown(
  input: string,
  editorRef: EditorRef,
  options?: UseOptions
): MarkDown {
  const domToNode: DomToNode = new WeakMap()
  const editingNodeMap: EditingNodeMap = ref(new Map())
  const editingBlockCodeDomMap: EditingBlockCodeDomMap = new Map()
  const keyPositionMaps: KeyPositionMaps = { blockCode: new Map() }

  let isReadonly = options?.isReadonly || false
  if (isOverLength(input.length)) {
    isReadonly = true
  }

  const blobUrlManager = createBlobUrlManager(options)

  const selector = createSelector(editingNodeMap, keyPositionMaps)

  const editor = createEditor(input, selector, keyPositionMaps)
  const source = editor.source

  const inputHandler = setupInputHandler(editorRef, editor, selector)

  const { loadedLangs, highlight } = createHljs()

  const { renderNode } = createRenderer(
    source,
    domToNode,
    selector,
    editorRef,
    editingNodeMap,
    editingBlockCodeDomMap,
    isReadonly
  )

  const ast = ref<Root | null>(null)

  // 创建 Worker 实例
  const worker = new Worker(new URL('./workers/remark.worker.ts', import.meta.url), {
    type: 'module',
  })

  // 任务ID管理
  let currentTaskId = 0

  // Worker 消息处理
  worker.onmessage = (
    event: MessageEvent<{
      id: number
      ast: Root
      error: string | null
      timing?: { receivedAt: number; parseDuration: number; postStart: number }
    }>
  ) => {
    const receiveStart = performance.now()
    const { id, ast: resultAst, error, timing } = event.data

    // 只处理最新任务的结果
    if (id < currentTaskId) {
      console.log(`[丢弃] 过时任务 id=${id}, 当前=${currentTaskId}`)
      return
    }

    if (error) {
      console.log('Worker parse error:', error)
      try {
        ast.value = remark().parse(source.value)
      } catch (e) {
        console.log('Fallback parse error:', e)
      }
    } else {
      // ⑥ 测量：ast.value 赋值 + 响应式触发耗时
      const assignStart = performance.now()
      ast.value = resultAst
      const assignEnd = performance.now()

      if (timing) {
        const nodeCount = countNodes(resultAst)
        const totalDuration = assignEnd - receiveStart
        const transmissionDelay = receiveStart - timing.postStart

        console.log(
          `[2] 任务 ${id} 完成:\n` +
            `    Worker parse: ${timing.parseDuration.toFixed(2)}ms\n` +
            `    Worker→主线程 传输延迟: ${transmissionDelay.toFixed(2)}ms\n` +
            `    主线程 onmessage 总耗时: ${totalDuration.toFixed(2)}ms\n` +
            `      其中 ast.value 赋值: ${(assignEnd - assignStart).toFixed(2)}ms\n` +
            `    AST 节点数: ${nodeCount}\n` +
            `    原始文本长度: ${source.value.length} bytes`
        )
      }
    }
  }

  worker.onerror = (error) => {
    console.error('Worker error:', error)
  }

  // 监听 source 变化，触发解析
  watch(
    [() => source.value, () => loadedLangs.value.length],
    ([val]) => {
      const markdown = val
      const taskId = ++currentTaskId

      // ① 测量：主线程 postMessage 耗时
      const sendStart = performance.now()
      worker.postMessage({ id: taskId, markdown })
      const sendEnd = performance.now()
      console.log(`[1] 任务 ${taskId}: postMessage 耗时: ${(sendEnd - sendStart).toFixed(2)}ms`)
    },
    { immediate: true }
  )

  const preprocessedAst = computed(() =>
    ast.value
      ? preprocessAst(ast.value, source.value, keyPositionMaps, blobUrlManager, highlight)
      : null
  )
  // const preprocessedAst = computed(() => {
  //   console.time('preprocess')
  //   const res = ast.value
  //     ? preprocessAst(ast.value, source.value, keyPositionMaps, blobUrlManager, highlight)
  //     : null
  //   console.timeEnd('preprocess')
  //   return res
  // })

  const root = () => {
    selector.cursorRendered = false

    return h(
      'pre',
      !isReadonly
        ? {
            onMousedown: (e: MouseEvent) => {
              const targetEl = (e.target as Element).closest('span')
              if (isHTMLElement(targetEl)) {
                const node = domToNode.get(targetEl)
                if (node) {
                  selector.setStartNode(node)
                }
              }
            },
            onMouseup: (e: MouseEvent) => {
              const targetEl = (e.target as Element).closest('span')
              if (isHTMLElement(targetEl)) {
                const node = domToNode.get(targetEl)
                if (node) {
                  selector.setEndNode(node)
                }
              }
            },
          }
        : {},

      preprocessedAst.value?.children.map((node) => renderNode(node))
      // logTime(() => preprocessedAst.value?.children.map((node) => renderNode(node)))
    )
  }

  // const logTime = (fn: () => any) => {
  //   try {
  //     console.time('render')
  //     return fn()
  //   } finally {
  //     console.timeEnd('render')
  //   }
  // }

  const cleanup = () => {
    worker.terminate()
    inputHandler.cleanup()
    blobUrlManager.cleanup()
  }

  return {
    root,
    source,
    editor,
    inputHandler,
    cleanup,
  }
}

export const MAX_LENGTH = 80 * 1000

function isOverLength(length: number) {
  return length > MAX_LENGTH
}

function countNodes(node: any): number {
  let count = 1
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child)
    }
  }
  return count
}
