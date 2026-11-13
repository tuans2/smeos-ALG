import type { QuickCollectionCandidate } from "./quick-collection-engine"

/** Một dòng sản phẩm từ `GET /api/v1/products` (các trang khác nhau đặt tên trường giá/ảnh hơi khác). */
export interface QuickCollectionProductRow {
  id: string
  name: string
  code?: string | null | undefined
  category?: string | null | undefined
  status?: string | undefined
  price?: number | null | undefined
  price_vnd?: number | null | undefined
  imageUrl?: string | null | undefined
  masterImageUrl?: string | null | undefined
  attributes?: Record<string, unknown> | null | undefined
}

/**
 * Chuyển sản phẩm thật thành ứng viên "Tạo nhanh bộ sưu tập". KHÔNG gán cứng dịp/màu: bộ lọc đọc
 * `attributes.occasionCodes` / `attributes.color`, thiếu thì đoán theo tên sản phẩm. Bản cũ gán mọi mẫu
 * là "Sinh nhật/Kỷ niệm/Khai trương" + "Đa sắc" → kệ chia buồn lọt vào BST sinh nhật, lọc "Chia buồn"
 * hay lọc theo màu thì ra rỗng (soát 14/10/2026).
 */
export function toQuickCollectionCandidate(p: QuickCollectionProductRow): QuickCollectionCandidate {
  return {
    id: p.id,
    code: p.code || p.id,
    name: p.name,
    price: p.price ?? p.price_vnd ?? null,
    category: p.category ?? null,
    imageUrl: p.imageUrl || p.masterImageUrl || undefined,
    status: p.status ?? "ACTIVE",
    attributes: p.attributes ?? null,
  }
}
