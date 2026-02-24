import { nextTick } from 'vue'
import type { EditorRef } from '.'
import type { Editor } from './edit'
import type { Selector } from './select'

export function setupIme(editorRef: EditorRef, editor: Editor, selector: Selector) {
  let isComposing = false
  let compositionStartOffset: number | null = null
  const listeners: Array<() => void> = []

  nextTick(() => {
    initImeListeners()
  })

  const getImeTextArea = () => {
    if (!editorRef.value) return null
    return editorRef.value.querySelector('.ime-textarea') as HTMLTextAreaElement | null
  }

  const initImeListeners = () => {
    // console.log('editorRef.value: ', editorRef.value)
    let textArea: HTMLTextAreaElement | null = null
    if (editorRef.value) {
      textArea = editorRef.value.querySelector('.ime-textarea')

      const onCompositionStart = () => {
        isComposing = true

        const { startOffset, endOffset } = selector.position
        if (startOffset !== endOffset) {
          editor.handleDelete()
        }
        compositionStartOffset = selector.cursorOffset.value
      }

      const onInput = (e: Event) => {
        const inputEvent = e as InputEvent
        const text = inputEvent.data || ''

        if (isComposing && text) {
          if (compositionStartOffset !== null) {
            editor.handleCompositionUpdate(compositionStartOffset, text)
          }
        } else if (!isComposing && text) {
          editor.handleInsert(text)
        }
      }

      const onCompositionEnd = (e: CompositionEvent) => {
        // console.log('compositionend: ', e.data)
        isComposing = false
        const finalText = e.data || ''
        if (finalText && compositionStartOffset !== null) {
          editor.handleCompositionUpdate(compositionStartOffset, finalText)
          editor.record() // 记录状态
        }
        compositionStartOffset = null
      }

      const onKeyDown = (e: KeyboardEvent) => {
        // console.log('keydown: ', e)
        const controlKeys = [
          // 'Process',
          'Backspace',
          'Delete',
          'Enter',
          'Tab',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Home',
          'End',
        ]

        if (controlKeys.includes(e.key)) {
          editor.handleKeydown(e)
        }

        if (e.ctrlKey) {
          // console.log('ctrlKey: ', e.key)
          editor.handleKeydown(e)
        }
      }

      if (textArea) {
        textArea.addEventListener('compositionstart', onCompositionStart)
        textArea.addEventListener('input', onInput)
        textArea.addEventListener('compositionend', onCompositionEnd)
        textArea.addEventListener('keydown', onKeyDown)
        listeners.push(() => {
          textArea?.removeEventListener('compositionstart', onCompositionStart)
          textArea?.removeEventListener('input', onInput)
          textArea?.removeEventListener('compositionend', onCompositionEnd)
          textArea?.removeEventListener('keydown', onKeyDown)
        })
      }
    }
  }

  const cleanupImeListener = () => {
    listeners.forEach((removeListener) => removeListener())
    listeners.length = 0
  }

  return {
    getImeTextArea,
    cleanupImeListener,
  }
}
