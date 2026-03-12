import type { UseOptions } from './index'

export type ParseUrlToBlob = ((url: string) => string) | undefined
export type BlobUrlMap = Map<string, string> | undefined
export type BlobUrlManager = {
  parseUrlToBlob: ParseUrlToBlob
  blobUrlMap: BlobUrlMap
  cleanup: () => void
}

export function createBlobUrlManager(options?: UseOptions): BlobUrlManager {
  const parseUrlToBlob: ParseUrlToBlob = options?.parseUrlToBlob
  const blobUrlMap: BlobUrlMap = options?.parseUrlToBlob && new Map()
  const cleanup = () => {
    if (blobUrlMap) {
      for (const url of blobUrlMap.values()) {
        URL.revokeObjectURL(url)
      }
      blobUrlMap.clear()
    }
  }
  return { parseUrlToBlob, blobUrlMap, cleanup }
}
