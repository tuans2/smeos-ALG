/**
 * Tải thumbnail Drive cho màn nhập hàng loạt: gom lô 50 folder/request, chạy tuần tự,
 * gặp 429/lỗi mạng thì chờ rồi thử lại có trần — file nghìn dòng vẫn ra đủ ảnh.
 */

export const THUMB_BATCH_SIZE = 50
export const MAX_ATTEMPTS = 4
const BASE_BACKOFF_MS = 2_000

export type ThumbBatchResult = { thumbnails: Record<string, string | null> }
export type FetchBatch = (folderIds: string[]) => Promise<{ status: number; body?: ThumbBatchResult | undefined }>

export const fetchBatchViaApi: FetchBatch = async (folderIds) => {
  const res = await fetch("/api/v1/products/drive-thumbnails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder_ids: folderIds }),
  })
  return { status: res.status, body: res.ok ? ((await res.json()) as ThumbBatchResult) : undefined }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Gọi `onBatch` sau mỗi lô: `found` = folder có ảnh, `missing` = folder không có ảnh
 * (khoá quyền / trống / hết lượt thử). Dừng khi `isAlive()` trả false.
 */
export async function loadDriveThumbs(
  folderIds: string[],
  onBatch: (found: Map<string, string>, missing: string[]) => void,
  opts: { fetchBatch?: FetchBatch; wait?: (ms: number) => Promise<void>; isAlive?: () => boolean } = {},
): Promise<void> {
  const fetchBatch = opts.fetchBatch ?? fetchBatchViaApi
  const wait = opts.wait ?? sleep
  const isAlive = opts.isAlive ?? (() => true)

  for (let i = 0; i < folderIds.length && isAlive(); i += THUMB_BATCH_SIZE) {
    const batch = folderIds.slice(i, i + THUMB_BATCH_SIZE)
    let body: ThumbBatchResult | undefined
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && isAlive(); attempt++) {
      const res = await fetchBatch(batch).catch(() => ({ status: 0, body: undefined }))
      if (res.body) {
        body = res.body
        break
      }
      // 4xx khác 429 (mất quyền, dữ liệu sai) → thử lại cũng vô ích.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) break
      if (attempt < MAX_ATTEMPTS) await wait(BASE_BACKOFF_MS * 2 ** (attempt - 1))
    }
    if (!isAlive()) return
    const found = new Map<string, string>()
    const missing: string[] = []
    for (const id of batch) {
      const url = body?.thumbnails[id]
      if (url) found.set(id, url)
      else missing.push(id)
    }
    onBatch(found, missing)
  }
}
