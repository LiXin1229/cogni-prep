import type { RootContent } from 'mdast'
import type { Node } from '../ast'

export const isHTMLElement = (el: unknown): el is HTMLElement => !!(el && el instanceof HTMLElement)
export const isArray = Array.isArray
export const isString = (val: unknown): val is string => typeof val === 'string'
export const hasPosition = (node: RootContent): node is Node => {
  return node.position !== undefined
}
export const hasOwn = (val: object, key: string | symbol): key is keyof typeof val =>
  Object.prototype.hasOwnProperty.call(val, key)
export const hasChildren = (node: RootContent) => {
  return !!('children' in node)
}
export const deconstructPosition = (node: Node) => {
  return {
    start: node.position.start.offset,
    end: node.position.end.offset,
  }
}

// import type { Position } from '../select'
// export function hasPosition<T extends Node>(node: T): node is T & { position: Position } {
//   return node.position !== undefined
// }
