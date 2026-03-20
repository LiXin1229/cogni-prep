import { computed, h, ref, watch, type Ref, type VNode } from 'vue'
import { remark } from 'remark'
import { createSelector, type Position } from './select'
import { createEditor, type Editor } from './edit'
import { isHTMLElement } from './utils/general'
import { createRenderer, preprocessAst } from './renderer'
import type { Root } from 'mdast'
import type { Node } from './ast'
import { setupIme, type Ime } from './ime'
import { createBlobUrlManager, type ParseUrlToBlob } from './blobUrlManager'
import { createHljs } from './hljs'
export * from './select'
export * from './edit'
export * from './ime'
export * from './renderer'

export type MarkDown = {
  root: () => VNode
  source: Ref<string>
  editor: Editor
  ime: Ime
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
  const editingNodeMap: EditingNodeMap = ref(new Map()) // 代码块 AST 节点 -> 是否正在编辑 (用于触发响应式更新)
  const editingBlockCodeDomMap: EditingBlockCodeDomMap = new Map() // AST 节点 -> 代码块 DOM (用于清除正在编辑的代码块的 HTML)
  const keyPositionMaps: KeyPositionMaps = { blockCode: new Map() }
  const isReadonly = options?.isReadonly || false

  // 处理图片 URL
  const blobUrlManager = createBlobUrlManager(options)

  // 处理光标选区
  const selector = createSelector(editingNodeMap, keyPositionMaps)

  // 处理键盘输入
  const editor = createEditor(input, selector, keyPositionMaps)
  const source = editor.source

  const ime = setupIme(editorRef, editor, selector)

  // 代码高亮
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

  watch(
    [() => source.value, () => loadedLangs.value.length],
    ([val]) => {
      // console.time('remark-parse')
      ast.value = remark().parse(val)
      // console.timeEnd('remark-parse')
    },
    {
      immediate: true,
    }
  )

  const preprocessedAst = computed(() =>
    ast.value
      ? preprocessAst(ast.value, source.value, keyPositionMaps, blobUrlManager, highlight)
      : null
  )
  // const preprocessedAst = computed(() => {
  //   console.time('preprocess-ast')
  //   const result = preprocessAst(ast.value as Root, source.value, keyPositionMaps, blobUrlManager, highlight)
  //   console.timeEnd('preprocess-ast')
  //   return result
  // })

  const root = () => {
    // console.log('render root: ', preprocessedAst.value)
    selector.cursorRendered = false

    return h(
      'pre',
      !isReadonly
        ? {
            onMousedown: (e: MouseEvent) => {
              // 找到最近的 span（文本节点容器）
              const targetEl = (e.target as Element).closest('span')
              if (isHTMLElement(targetEl)) {
                // 从 WeakMap 获取对应的 TemplateNode
                const node = domToNode.get(targetEl)
                if (node) {
                  selector.setStartNode(node)
                }
              }
            },
            onMouseup: (e: MouseEvent) => {
              const targetEl = (e.target as Element).closest('span')
              // console.log('targetEl: ', targetEl)
              if (isHTMLElement(targetEl)) {
                const node = domToNode.get(targetEl) // 获取 AST 节点才能通过 loc 逆推点击位置
                // console.log('targetEl: ', node)
                if (node) {
                  selector.setEndNode(node)
                }
              }

              ime.focusImeTextArea()
            },
          }
        : {},
      preprocessedAst.value?.children.map((node) => renderNode(node))
      // renderChildrenWithLog()
    )
  }

  // const renderChildrenWithLog = () => {
  //   console.time('render-node')
  //   const children = preprocessedAst.value.children.map((node) => renderNode(node))
  //   console.timeEnd('render-node')
  //   return children
  // }

  const cleanup = () => {
    ime.cleanupImeListener()
    blobUrlManager.cleanup()
  }

  return {
    root,
    source, // 保留原始 Ref 身份
    editor,
    ime,
    cleanup,
  }
}
