import { computed, h, ref, type Ref } from 'vue'
import { remark } from 'remark'
import { createSelector, type Position } from './select'
import { createEditor } from './edit'
import { isHTMLElement } from './utils/general'
import { createRenderer, preprocessAst } from './renderer'
import type { Node } from './ast'
import { setupIme } from './ime'

export type EditorRef = Ref<HTMLElement | undefined>
export type DomToNode = WeakMap<HTMLElement, Node>
export type EditingNodeMap = Ref<Map<number, boolean>>
export type EditingBlockCodeDomMap = Map<number, HTMLElement>
export type BlockCodePosInfo = { content: Position; head: Position; tail: Position }
export type KeyPositionMaps = {
  blockCode: Map<number, BlockCodePosInfo>
}

export function createMarkdown(input: string, editorRef: EditorRef) {
  const domToNode: DomToNode = new WeakMap()
  const editingNodeMap: EditingNodeMap = ref(new Map()) // 代码块 AST 节点 -> 是否正在编辑 (用于触发响应式更新)
  const editingBlockCodeDomMap: EditingBlockCodeDomMap = new Map() // AST 节点 -> 代码块 DOM (用于清除正在编辑的代码块的 HTML)
  const keyPositionMaps: KeyPositionMaps = { blockCode: new Map() }

  // 处理光标选区
  const selector = createSelector(editingNodeMap, keyPositionMaps)

  // 处理键盘输入
  const editor = createEditor(input, selector, keyPositionMaps)
  const { source } = editor

  const { getImeTextArea, cleanupImeListener } = setupIme(editorRef, editor, selector)

  const { renderNode } = createRenderer(
    source,
    domToNode,
    selector,
    editorRef,
    editingNodeMap,
    editingBlockCodeDomMap
  )

  const ast = computed(() => remark().parse(source.value))
  const preprocessedAst = computed(() => preprocessAst(ast.value, source.value, keyPositionMaps))

  const root = () => {
    console.log('render root: ', preprocessedAst.value)

    selector.cursorRendered = false

    return h(
      'pre',
      {
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

          const textArea = getImeTextArea()
          if (textArea) {
            textArea.focus({ preventScroll: true }) // 阻止聚焦时的自动滚动
          }
        },
      },
      preprocessedAst.value.children.map((node) => renderNode(node))
    )
  }

  const cleanup = () => {
    cleanupImeListener()
  }

  return {
    root,
    source,
    editor,
    cleanup,
  }
}
