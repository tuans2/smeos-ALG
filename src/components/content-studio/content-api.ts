/**
 * Lời gọi API của hành trình Tạo nội dung — chỉ dùng endpoint sẵn có của SMEOS (kho tệp, quét ảnh, bài giới thiệu)
 * và 3 endpoint đọc/ghi gộp dưới `/api/v1/content-studio/*`. Mọi lỗi ném `Error` với câu tiếng Việt cho user.
 */
import type { ChannelPost, ContentLibraryItem, ContentProductView } from "@/modules/content-studio/use-cases/content-product"
import type { ScanResult } from "@/modules/content-studio/use-cases/scan-results"
import type { ScanJobStatus } from "@/modules/content-studio/domain/photo-batch"
import type { SalesPitchRecord, StoredSalesPitch } from "@/modules/products/domain/sales-pitch-record"

export type { ChannelPost, ContentLibraryItem, ContentProductView, ScanResult }

type Json = Record<string, unknown>

async function failure(res: Response, fallback: string): Promise<Error> {
  const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
  if (res.status === 403) return new Error("Tài khoản của bạn chưa được cấp quyền cho thao tác này")
  if (res.status === 404) return new Error("Không tìm thấy dữ liệu — có thể đã bị xoá")
  return new Error(body?.error?.message || fallback)
}

async function call<T>(url: string, init: RequestInit | undefined, fallback: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } })
  } catch {
    throw new Error("Mất kết nối mạng — kiểm tra mạng rồi thử lại")
  }
  if (!res.ok) throw await failure(res, fallback)
  return (await res.json()) as T
}

const post = (body: unknown, headers?: Record<string, string>): RequestInit => ({ method: "POST", body: JSON.stringify(body), ...(headers ? { headers } : {}) })

/** Tải 1 ảnh lên kho của cửa hàng (xin link → PUT → đăng ký) — trả mã ảnh. */
export async function uploadPhoto(file: File, productId: string | null): Promise<string> {
  const target = await call<{ asset_id: string; storage_key: string; upload_url: string }>(
    "/api/v1/assets/upload-url", post({ product_id: productId, mime_type: file.type }), `Không tải được "${file.name}"`,
  )
  let put: Response
  try {
    put = await fetch(target.upload_url, { method: "PUT", headers: { "Content-Type": file.type }, body: file })
  } catch {
    throw new Error(`Mất kết nối khi tải "${file.name}"`)
  }
  if (!put.ok) throw new Error(`Tải "${file.name}" lên kho chưa được — thử lại`)
  await call("/api/v1/assets", post({
    asset_id: target.asset_id, product_id: productId, kind: "ORIGINAL", storage_key: target.storage_key, mime_type: file.type, file_size: file.size,
  }), `Chưa lưu được "${file.name}" vào kho`)
  return target.asset_id
}

/** Gửi một lượt quét — khoá chống trùng do nơi gọi giữ, bấm lại / mạng chập không bị trừ credit hai lần. */
export async function requestScan(assetIds: readonly string[], idempotencyKey: string): Promise<string> {
  const r = await call<{ job_id: string }>("/api/v1/vision/analyses", post({ asset_ids: assetIds, product_id: null }, { "idempotency-key": idempotencyKey }), "Chưa gửi được ảnh đi quét")
  return r.job_id
}

export async function scanStatus(jobId: string): Promise<{ status: ScanJobStatus; error: string | null }> {
  const r = await call<{ job: { status: ScanJobStatus; error: string | null } }>(`/api/v1/jobs/${encodeURIComponent(jobId)}`, undefined, "Chưa đọc được tiến độ quét")
  return { status: r.job.status, error: r.job.error }
}

export async function scanResults(jobId: string): Promise<ScanResult[]> {
  return (await call<{ data: ScanResult[] }>(`/api/v1/content-studio/scans/${encodeURIComponent(jobId)}`, undefined, "Chưa đọc được kết quả quét")).data
}

export async function saveCardDraft(analysisId: string, edited: Json): Promise<void> {
  await call(`/api/v1/vision/analyses/${encodeURIComponent(analysisId)}`, { method: "PATCH", body: JSON.stringify({ edited }) }, "Chưa lưu được Thẻ sản phẩm")
}

/** Duyệt Thẻ sản phẩm → tạo (hoặc cập nhật) sản phẩm trong Kho; trả mã sản phẩm. */
export async function approveCard(analysisId: string): Promise<string> {
  const r = await call<{ product_id: string | null }>(`/api/v1/vision/analyses/${encodeURIComponent(analysisId)}/approve`, post({ create_product: true }), "Chưa duyệt được Thẻ sản phẩm")
  if (!r.product_id) throw new Error("Đã duyệt nhưng chưa tạo được sản phẩm — thử tải lại")
  return r.product_id
}

/** Bỏ một Thẻ sản phẩm quét sai (từ chối) — không tạo sản phẩm. */
export async function rejectCard(analysisId: string): Promise<void> {
  await call(`/api/v1/vision/analyses/${encodeURIComponent(analysisId)}/reject`, post({ ly_do: null }), "Chưa bỏ được thẻ này")
}

export async function generateCopy(analysisId: string, productId: string): Promise<{ copyId: string; data: Json }> {
  const r = await call<{ copyId: string; raw: Json }>(
    "/api/v1/product-copies/generate", post({ analysisId, productId }, { "idempotency-key": `product-copy:${analysisId}` }), "Chưa viết được Bài giới thiệu",
  )
  return { copyId: r.copyId, data: r.raw }
}

export async function saveCopyDraft(copyId: string, edited: Json): Promise<void> {
  await call(`/api/v1/product-copies/${encodeURIComponent(copyId)}`, { method: "PATCH", body: JSON.stringify({ edited }) }, "Chưa lưu được Bài giới thiệu")
}

export async function approveCopy(copyId: string): Promise<void> {
  await call(`/api/v1/product-copies/${encodeURIComponent(copyId)}/approve`, post({}), "Chưa duyệt được Bài giới thiệu")
}

export async function fetchContentProduct(productId: string): Promise<ContentProductView> {
  return (await call<{ data: ContentProductView }>(`/api/v1/content-studio/products/${encodeURIComponent(productId)}`, undefined, "Chưa tải được sản phẩm")).data
}

export async function fetchLibrary(cursor: string | null): Promise<{ data: ContentLibraryItem[]; next_cursor: string | null }> {
  const q = new URLSearchParams({ limit: "24", ...(cursor ? { cursor } : {}) })
  return call(`/api/v1/content-studio/products?${q.toString()}`, undefined, "Chưa tải được Kho sản phẩm")
}

export async function saveSalesPitch(productId: string, pitch: SalesPitchRecord): Promise<StoredSalesPitch> {
  const r = await call<{ data: StoredSalesPitch }>(
    `/api/v1/content-studio/products/${encodeURIComponent(productId)}/sales-pitch`, { method: "PUT", body: JSON.stringify({ pitch }) }, "Chưa lưu được Thẻ chào sản phẩm",
  )
  return r.data
}

/** Viết bài đa kênh bằng Content Engine từ dữ liệu đã duyệt của sản phẩm (chạy tại chỗ, có thể mất vài chục giây). */
export async function generatePosts(productId: string, channels: readonly string[], idempotencyKey: string): Promise<{ generationId: string | null; status: string }> {
  const r = await call<{ generation_id: string | null; status: string }>(
    "/api/v1/content-engine/generations", post({ product_id: productId, channels }, { "Idempotency-Key": idempotencyKey }), "Chưa viết được bài đăng",
  )
  return { generationId: r.generation_id, status: r.status }
}

/** Duyệt các bài (kèm bản user đã sửa) — chuyển lượt bài sang "đã duyệt". */
export async function approvePosts(generationId: string, posts: readonly ChannelPost[]): Promise<void> {
  await call(`/api/v1/content-engine/generations/${encodeURIComponent(generationId)}/approve`, post({
    posts: posts.map((p) => ({ channel: p.channel, text: p.text, hashtags: [...p.hashtags] })),
  }), "Chưa duyệt được bài đăng")
}
