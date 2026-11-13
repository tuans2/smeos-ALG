import type { ProductPatchPayload } from "./ai-product-helpers"

/**
 * "Lưu thành mẫu mới" trong hộp sửa mẫu: giữ nguyên mẫu gốc, tạo mẫu mới từ
 * dữ liệu đang có trong form. Ảnh dùng chung `image_asset_id`/`imageUrl` với
 * mẫu gốc — không chép tệp. Trạng thái bán giữ theo form (PO 23/10/2026: mẫu
 * mới dùng được ngay); người không phải Điều hành tạo thì máy chủ gắn nhãn đề xuất.
 */

export const COPY_NAME_SUFFIX = " (bản sao)"

/** Hậu tố mã ngắn, đủ khác nhau giữa các lần bấm; trùng thì server trả 409. */
export function copyCodeSuffix(now: number = Date.now()): string {
  return now.toString(36).slice(-5).toUpperCase()
}

export function buildSaveAsPayload(
  payload: ProductPatchPayload,
  original: { name?: string | null; code?: string | null },
  suffix: string = copyCodeSuffix()
): ProductPatchPayload {
  const sameName = payload.name === (original.name ?? "").trim()
  const sameCode = payload.code === (original.code ?? "").trim()
  return {
    ...payload,
    name: sameName ? `${payload.name}${COPY_NAME_SUFFIX}` : payload.name,
    code: sameCode ? `${payload.code}-${suffix}` : payload.code,
  }
}

export interface CreatedProduct {
  id: string
}

/** Gọi `POST /api/v1/products`; trả về mẫu mới hoặc ném lỗi tiếng Việt. */
export async function createProductCopy(payload: ProductPatchPayload, label: string): Promise<CreatedProduct> {
  const res = await fetch("/api/v1/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.id) {
    throw new Error(body?.error?.message || `Không tạo được ${label} mới, vui lòng thử lại`)
  }
  return body as CreatedProduct
}
