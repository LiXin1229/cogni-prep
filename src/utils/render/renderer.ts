import { type Ref, type VNode, h, nextTick } from 'vue'
import type { Position, PositionInfo, Selector } from './select'
import { deconstructPosition, hasChildren, hasPosition, isHTMLElement } from './utils/general'
import type { Root, RootContent, Text } from 'mdast'
import type {
  DomToNode,
  EditingBlockCodeDomMap,
  EditingNodeMap,
  EditorRef,
  KeyPositionMaps,
} from './index'
import type { EmptyLine, Node } from './ast'
import type { BlobUrlManager } from './blobUrlManager'

export function createRenderer(
  source: Ref<string>,
  domToNode: DomToNode,
  selector: Selector,
  editorRef: EditorRef,
  editingNodeMap: EditingNodeMap,
  editingBlockCodeDomMap: EditingBlockCodeDomMap,
  isReadonly: boolean
) {
  const { cursorOffset } = selector

  const renderNode = (node: RootContent): VNode => {
    if (!hasPosition(node)) {
      console.warn(`${node.type} 没有 position 属性`)
      return h('span', source.value)
    }

    const { type } = node
    switch (type) {
      case 'paragraph':
        return h(
          'p',
          node.children.map((c) => renderNode(c))
        )

      case 'text':
        return renderPlainText(node, node.value, domToNode)

      case 'emptyLine':
        if (checkCursorInNode(node)) {
          return h(
            'div',
            {
              class: 'md-empty-line',
            },
            renderPlainText(node, ' ', domToNode)
          )
        } else {
          return h('div', '\n')
        }

      case 'heading':
        if (checkCursorInNode(node)) {
          return renderPlainText(node, sliceTextFromSource(node), domToNode)
        } else {
          return h(
            'h' + node.depth,
            node.children.map((c) => renderNode(c))
          )
        }

      case 'thematicBreak':
        if (checkCursorInNode(node)) {
          return renderPlainText(node, sliceTextFromSource(node), domToNode)
        } else {
          return h('hr')
        }

      case 'blockquote':
        if (checkCursorInNode(node)) {
          return renderPlainText(node, sliceTextFromSource(node), domToNode)
        } else {
          return h(
            'blockquote',
            node.children.map((c) => renderNode(c))
          )
        }

      case 'code': {
        const nodeId = node.children[0].nodeId
        const isEditing = editingNodeMap.value.get(nodeId) || false
        return h(
          'div',
          {
            class: 'md-block-code-container',
          },
          !isEditing && node.html !== undefined
            ? // 高亮
              h('pre', {
                class: 'md-block-code',
                ref: (el) => {
                  if (isHTMLElement(el) && node.html !== undefined) {
                    el.innerHTML = node.html
                    editingBlockCodeDomMap.set(nodeId, el)
                  }
                },
                onClick: !isReadonly
                  ? () => {
                      const selection = window.getSelection()
                      if (selection && selection.toString().trim() !== '') {
                        // 有文本被选中 → 忽略这次 click
                        return
                      }
                      for (const nodeId of editingNodeMap.value.keys()) {
                        editingNodeMap.value.set(nodeId, false)
                      }
                      editingNodeMap.value.set(nodeId, true)
                      const el = editingBlockCodeDomMap.get(nodeId)
                      if (el) {
                        el.innerHTML = ''
                      }
                    }
                  : undefined,
              })
            : // 普通文本
              h(
                'pre',
                {
                  class: 'md-block-code md-block-code-plain',
                },
                node.children.map((c) => renderNode(c))
              )
        )
      }

      case 'list': {
        const tag = node.ordered ? 'ol' : 'ul'
        if (checkCursorInNode(node)) {
          return renderPlainText(node, sliceTextFromSource(node), domToNode)
        } else {
          return h(
            tag,
            {
              ...(tag === 'ol' && node.start !== 1 ? { start: node.start } : {}),
            },
            node.children.map((c) => renderNode(c))
          )
        }
      }

      case 'image': {
        return node.src
          ? h(
              'div',
              { class: 'md-img' },
              h('img', {
                src: node.src,
                alt: node.alt,
              })
            )
          : h('div', node.url)
      }

      case 'listItem':
        return h(
          'li',
          node.children.map((c) => renderNode(c))
        )

      case 'strong':
        if (checkCursorInNode(node)) {
          return renderPlainText(node, sliceTextFromSource(node), domToNode)
        } else {
          return h(
            'strong',
            node.children.map((c) => renderNode(c))
          )
        }

      case 'emphasis':
        if (checkCursorInNode(node)) {
          return renderPlainText(node, sliceTextFromSource(node), domToNode)
        } else {
          return h(
            'em',
            node.children.map((c) => renderNode(c))
          )
        }

      case 'inlineCode':
        if (checkCursorInNode(node)) {
          return renderPlainText(node, sliceTextFromSource(node), domToNode)
        } else {
          return h(
            'code',
            node.children.map((c) => renderNode(c))
          )
        }

      default:
        return renderPlainText(node, sliceTextFromSource(node), domToNode)
      // return h('span', '?')
    }
  }

  return {
    renderNode,
  }

  function renderPlainText(node: Node, content: string, domToNode: DomToNode) {
    return h(
      'span',
      {
        class: 'md-text',
        ref: (el) => {
          if (isHTMLElement(el)) {
            domToNode.set(el, node)
            node.el = el
          }
        },
      },
      renderTextWithCursor(node, content)
    )
  }

  function renderTextWithCursor(node: Node, content: string) {
    if (editorRef.value === undefined) {
      return content
    }
    const editContainer: HTMLElement | null = editorRef.value.querySelector('.edit-container')
    const cursorLayer: HTMLElement | null = editorRef.value.querySelector('.cursor-layer')
    const imeTextarea: HTMLTextAreaElement | null = editorRef.value.querySelector('.ime-textarea')

    if (!editContainer || !cursorLayer) {
      return content
    }

    // 该节点需要渲染光标
    if (!selector.cursorRendered && checkCursorInNode(node) && cursorOffset.value !== -1) {
      nextTick(() => {
        const el = node.el
        if (el?.firstChild) {
          const localOffset = cursorOffset.value - node.position.start.offset

          // 光标相对于视口的位置
          const range = document.createRange()
          range.setStart(el.firstChild, localOffset)
          range.setEnd(el.firstChild, localOffset)
          const rects = range.getClientRects()
          if (rects.length) {
            const rect = rects[0]

            // 计算光标相对于容器的位置
            const boundingClientRect = editContainer.getBoundingClientRect()
            const top = rect.top - boundingClientRect.top
            const left = rect.left - boundingClientRect.left
            const height = rect.height - boundingClientRect.height
            // console.log(top, left, height)

            // 设置光标 html
            cursorLayer.innerHTML = `<div class="cursor" style="top:${top}px;left:${left}px;height:${height}px"></div>`

            if (imeTextarea) {
              imeTextarea.style.top = `${top}px`
              imeTextarea.style.left = `${left}px`
              imeTextarea.style.height = `${height}px`
            }
          }
        }
      })

      editingNodeMap.value.set(node.nodeId, true)
      selector.cursorRendered = true
    } else {
      if (cursorLayer) {
        cursorLayer.innerHTML = ''
      }
    }
    return content
  }

  function checkCursorInNode(node: Node) {
    const { start, end } = deconstructPosition(node)
    return cursorOffset.value >= 0 && cursorOffset.value >= start && cursorOffset.value <= end
  }

  function sliceTextFromSource(node: Node) {
    const { start, end } = deconstructPosition(node)
    return source.value.slice(start, end)
  }
}

export function preprocessAst(
  ast: Root,
  source: string,
  keyPositionMaps: KeyPositionMaps,
  { parseUrlToBlob, blobUrlMap }: BlobUrlManager,
  highlight: (code: string, lang: string) => string | undefined
) {
  const newChildren: RootContent[] = []
  let lastNode: { endLine: number; endOffset: number } | null = null
  let nodeId = 0

  for (const node of ast.children) {
    if (!hasPosition(node)) {
      newChildren.push(node)
      continue
    }

    processNode(node)

    const currentStart = node.position.start

    if (lastNode) {
      // 计算中间有多少个空行（即多少个 \n）
      const gapLines = currentStart.line - lastNode.endLine - 1

      if (gapLines > 0) {
        // 每个空行对应一个物理 \n 字符
        // 上一个节点结束于 offset = lastNode.endOffset
        // 第一个空行的 \n 位于 lastNode.endOffset + 1
        // 第二个位于 +2，依此类推

        for (let i = 0; i < gapLines; i++) {
          const lineNum = lastNode.endLine + 1 + i
          const offset = lastNode.endOffset + 1 + i

          const emptyLineNode: EmptyLine = {
            type: 'emptyLine',
            nodeId: nodeId++,
            position: {
              start: {
                line: lineNum,
                column: 1, // 空行没有内容，column=1
                offset: offset,
              },
              end: {
                line: lineNum,
                column: 1,
                offset: offset, // \n 是单字符，start == end
              },
            },
          }

          newChildren.push(emptyLineNode)
        }
      }
    }

    newChildren.push(node)
    lastNode = {
      endLine: node.position.end.line,
      endOffset: node.position.end.offset,
    }
  }

  if (lastNode && lastNode.endOffset < source.length - 1) {
    // 剩余内容从 lastNode.endOffset + 1 开始
    const trailingStartOffset = lastNode.endOffset + 1
    const trailingContent = source.slice(trailingStartOffset)

    let currentOffset = trailingStartOffset
    let currentLine = lastNode.endLine + 1

    // 遍历尾部每个字符
    for (const char of trailingContent) {
      if (char === '\n') {
        // 每个 \n 代表一个空行
        const emptyLineNode: EmptyLine = {
          type: 'emptyLine',
          nodeId: nodeId++,
          position: {
            start: { line: currentLine, column: 1, offset: currentOffset },
            end: { line: currentLine, column: 1, offset: currentOffset },
          },
        }
        newChildren.push(emptyLineNode)
        currentLine++
        currentOffset++
      } else if (/\s/.test(char)) {
        // 如果是空格、制表符等，可选择是否处理
        // 通常尾部空格无意义，但如果你需要保留，可创建 whitespace 节点
        // 这里暂不处理（CommonMark 会 trim）
        currentOffset++
      } else {
        console.warn('Unexpected trailing non-whitespace after AST')
        break
      }
    }
  }

  return {
    ...ast,
    children: newChildren,
  }

  // 预处理 AST (1. 添加节点唯一标签 nodeId; 2. 给 inlineCode 多包一层文本; 3. 给 Code 多包一层文本); 4. 处理图片 URL
  function processNode(node: Node) {
    if (node.type === 'inlineCode') {
      const textNode: Text & { nodeId: number } = {
        type: 'text',
        value: node.value,
        nodeId: nodeId++,
        position: {
          start: {
            offset: node.position.start.offset + 1,
            line: node.position.start.line,
            column: node.position.start.column + 1,
          },
          end: {
            offset: node.position.end.offset - 1,
            line: node.position.end.line,
            column: node.position.end.column - 1,
          },
        },
      }
      node.children = [textNode]
      node.nodeId = nodeId++
    } else if (node.type === 'code') {
      const { lang, value } = node
      // 处理代码高亮
      if (lang) {
        try {
          // node.html = hljs.highlight(value, { language: lang }).value
          node.html = highlight(value, lang)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
          /* empty */
        }
      }
      // 多包一层 Paragraph 节点
      const { contentPosition, headPosition, tailPosition } = calculateBlockCodePosition(node)
      // console.log(keyPosition)

      const textNode: Text & { nodeId: number; position: Position } = {
        type: 'text',
        value: node.value,
        nodeId: nodeId++,
        position: contentPosition,
      }
      // console.log(textNode)
      // const children = processBlockContent(node.value, contentPosition)
      // node.children = children
      node.children = [textNode]
      node.nodeId = nodeId++

      // 用 blockCode 的文本节点的 nodeId 作为 key
      keyPositionMaps.blockCode.set(textNode.nodeId, {
        content: contentPosition,
        head: headPosition,
        tail: tailPosition,
      })
    } else if (node.type === 'image' && parseUrlToBlob && blobUrlMap) {
      const existingSrc = blobUrlMap.get(node.url)
      if (existingSrc === undefined) {
        node.src = parseUrlToBlob(node.url)
        blobUrlMap.set(node.url, node.src)
      } else {
        node.src = existingSrc
      }
      node.nodeId = nodeId++
    } else {
      if (hasChildren(node)) {
        for (const child of node.children) {
          if (hasPosition(child)) {
            processNode(child)
          } else {
            console.warn(`${child.type} 没有 position 属性`)
          }
        }
      }
      node.nodeId = nodeId++
    }
  }

  function calculateBlockCodePosition(node: Node) {
    const blockSource = sliceTextFromSource(node)

    // 用正则匹配代码块
    // 支持形如: ```js\nabc\n```
    const codeBlockReg = /^ *`{3,} *(\w+)? *\r?\n([\s\S]*?)\r?\n *`{3,}/
    const match = blockSource.match(codeBlockReg)

    let codeTextStartOffset = node.position.start.offset
    let codeTextEndOffset = node.position.end.offset
    let codeTextStartLine = node.position.start.line
    let codeTextStartColumn = node.position.start.column
    let codeTextEndLine = node.position.end.line
    let codeTextEndColumn = node.position.end.column

    // 这些变量用于key/tail
    let headEndOffset = node.position.start.offset
    let headEndLine = node.position.start.line
    let headEndColumn = node.position.start.column
    let tailStartOffset = node.position.end.offset
    let tailStartLine = node.position.end.line
    let tailStartColumn = node.position.end.column
    let tailEnd!: PositionInfo

    if (match) {
      const beforeCodeText = match[0].split(match[2])[0]
      // 在 blockSource 里，正文起始和终止的偏移
      const codeTextRelativeStart = beforeCodeText.length
      const codeTextRelativeEnd = codeTextRelativeStart + match[2].length

      codeTextStartOffset = node.position.start.offset + codeTextRelativeStart
      codeTextEndOffset = node.position.start.offset + codeTextRelativeEnd

      // 计算 start/end 行/列
      const pre = blockSource.slice(0, codeTextRelativeStart)
      const linesBefore = pre.split(/\r?\n/)
      codeTextStartLine = node.position.start.line + linesBefore.length - 1
      codeTextStartColumn =
        linesBefore.length === 1 ? node.position.start.column + codeTextRelativeStart : 1
      const codeLines = match[2].split(/\r?\n/)
      codeTextEndLine = codeTextStartLine + codeLines.length - 1
      codeTextEndColumn =
        codeLines.length === 1
          ? codeTextStartColumn + match[2].length
          : codeLines[codeLines.length - 1].length + 1

      // head
      headEndOffset = codeTextStartOffset
      headEndLine = codeTextStartLine
      headEndColumn = codeTextStartColumn
      // tail
      // 用 match[0] 获取完整 block 长度，tailStartRelative = codeTextRelativeEnd
      const afterCodeText = match[0].slice(codeTextRelativeEnd)
      // 寻找尾三引号匹配
      const tailMatch = afterCodeText.match(/\r?\n *`{3,}/) // 包含换行的三引号块
      if (tailMatch) {
        tailStartOffset = node.position.start.offset + codeTextRelativeEnd + tailMatch.index!
        // 计算 tail 行号与列
        const linesAfterContent = afterCodeText.slice(0, tailMatch.index).split(/\r?\n/)
        tailStartLine = codeTextEndLine + linesAfterContent.length - 1
        tailStartColumn = 1
        // tail 结尾
        const tailEndOffset = tailStartOffset + tailMatch[0].length
        const tailEndLine = tailStartLine + tailMatch[0].split(/\r?\n/).length - 1
        const lastTailLine = tailMatch[0].split(/\r?\n/).pop() || ''
        const tailEndColumn = lastTailLine.length > 0 ? lastTailLine.length + 1 : 1
        // keyPosition.tail
        tailEnd = {
          line: tailEndLine,
          column: tailEndColumn,
          offset: tailEndOffset,
        }
      } else {
        // fallback: 整个块的结尾
        tailStartOffset = node.position.end.offset - 3
        tailStartLine = node.position.end.line
        tailStartColumn = Math.max(1, node.position.end.column - 2)
        tailEnd = {
          line: node.position.end.line,
          column: node.position.end.column,
          offset: node.position.end.offset,
        }
      }
    }

    const headPosition: Position = {
      start: {
        line: node.position.start.line,
        column: node.position.start.column,
        offset: node.position.start.offset,
      },
      end: {
        line: headEndLine,
        column: headEndColumn,
        offset: headEndOffset,
      }, // 到正文开始处
    }
    const tailPosition: Position = {
      start: {
        line: tailStartLine,
        column: tailStartColumn,
        offset: tailStartOffset,
      }, // 三引号开头
      end: tailEnd || {
        line: node.position.end.line,
        column: node.position.end.column,
        offset: node.position.end.offset,
      }, // 三引号结尾
    }

    const contentPosition: Position = {
      start: {
        line: codeTextStartLine,
        column: codeTextStartColumn,
        offset: codeTextStartOffset,
      },
      end: {
        line: codeTextEndLine,
        column: codeTextEndColumn,
        offset: codeTextEndOffset,
      },
    }

    return {
      contentPosition,
      headPosition,
      tailPosition,
    }
  }

  function sliceTextFromSource(node: Node) {
    const { start, end } = deconstructPosition(node)
    return source.slice(start, end)
  }
}
