import type { Position } from './select'
import type { RootContent } from 'mdast'

export type Node = RootContent & {
  position: Position
  el?: HTMLElement
  nodeId: number
  src?: string
}

export interface EmptyLine {
  type: 'emptyLine'
  position?: Position
  nodeId: number
}

// 扩展 RootContentMap
declare module 'mdast' {
  interface RootContentMap {
    emptyLine: EmptyLine
  }

  interface InlineCode {
    // 默认 inlineCode 没有 children，但会在预处理时加上
    children: Text[]
  }

  interface Code {
    html?: string
    children: [Text & { nodeId: number }]
  }
}
