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
  const editingNodeMap: EditingNodeMap = ref(new Map())
  const editingBlockCodeDomMap: EditingBlockCodeDomMap = new Map()
  const keyPositionMaps: KeyPositionMaps = { blockCode: new Map() }
  const isReadonly = options?.isReadonly || false

  const blobUrlManager = createBlobUrlManager(options)

  const selector = createSelector(editingNodeMap, keyPositionMaps)

  const editor = createEditor(input, selector, keyPositionMaps)
  const source = editor.source

  const ime = setupIme(editorRef, editor, selector)

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

  let idleCallbackId: number | null = null
  const IDLE_TIMEOUT = 100

  const parseMarkdown = (markdown: string) => {
    try {
      ast.value = remark().parse(markdown) as Root
    } catch (e) {
      console.error('Parse error:', e)
    }
  }

  watch(
    [() => source.value, () => loadedLangs.value.length],
    ([val]) => {
      const markdown = val as string

      if (idleCallbackId !== null) {
        cancelIdleCallback(idleCallbackId)
      }

      idleCallbackId = requestIdleCallback(() => parseMarkdown(markdown), {
        timeout: IDLE_TIMEOUT,
      })
    },
    { immediate: true }
  )

  const preprocessedAst = computed(() =>
    ast.value
      ? preprocessAst(ast.value, source.value, keyPositionMaps, blobUrlManager, highlight)
      : null
  )

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

              ime.focusImeTextArea()
            },
          }
        : {},
      preprocessedAst.value?.children.map((node) => renderNode(node))
    )
  }

  const cleanup = () => {
    if (idleCallbackId !== null) {
      cancelIdleCallback(idleCallbackId)
    }
    ime.cleanupImeListener()
    blobUrlManager.cleanup()
  }

  return {
    root,
    source,
    editor,
    ime,
    cleanup,
  }
}
