import type { UseOptions } from './index'

export type ParseUrlToBlob = ((url: string) => string) | undefined
export type BlobUrlSet = Set<string> | undefined
export type BlobUrlManager = {
  parseUrlToBlob: ParseUrlToBlob
  blobUrlSet: BlobUrlSet
  cleanup: () => void
}

export function createBlobUrlManager(options?: UseOptions): BlobUrlManager {
  const parseUrlToBlob: ParseUrlToBlob = options?.parseUrlToBlob
  const blobUrlSet: BlobUrlSet = options?.parseUrlToBlob && new Set()
  const cleanup = () => {
    if (blobUrlSet) {
      for (const url of blobUrlSet) {
        URL.revokeObjectURL(url)
      }
      blobUrlSet.clear()
    }
  }
  return { parseUrlToBlob, blobUrlSet, cleanup }
}
