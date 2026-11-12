/**
 * Đề xuất sửa mẫu chính thức — giai đoạn 3 quản trị danh mục
 * (`docs/dac-ta/ALG_PRODUCT_CATALOG_GOVERNANCE_SPEC.md` mục 6). Thuần TS.
 */

/** Trường nội dung đề xuất sửa được. Trạng thái bán và khả dụng đi đường vận hành riêng. */
export const CHANGEABLE_FIELDS = ["name", "code", "category", "shape", "facing", "container", "attributes", "imageAssetId"] as const
export type ChangeableField = (typeof CHANGEABLE_FIELDS)[number]
export type ProductChanges = Partial<Record<ChangeableField, unknown>>

export const CHANGE_REQUEST_TTL_DAYS = 30
export type ChangeRequestStatus = "PENDING" | "APPROVED" | "PARTIAL" | "REJECTED" | "EXPIRED"

export const FIELD_LABEL: Record<ChangeableField, string> = {
  name: "Tên mẫu",
  code: "Mã mẫu",
  category: "Danh mục",
  shape: "Kiểu dáng",
  facing: "Mặt hoa",
  container: "Đồ chứa",
  attributes: "Giá, thành phần, mô tả",
  imageAssetId: "Ảnh chính",
}

type CurrentProduct = {
  name: string
  code: string
  category: string | null
  shape: string | null
  facing: string | null
  container: string | null
  attributes: unknown
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/** Chỉ giữ các trường thật sự khác bản hiện tại — đề xuất không đổi gì thì rỗng. */
export function pickChanges(current: CurrentProduct, input: ProductChanges): ProductChanges {
  const out: ProductChanges = {}
  for (const field of CHANGEABLE_FIELDS) {
    const next = input[field]
    if (next === undefined) continue
    if (field === "imageAssetId") {
      out.imageAssetId = next
      continue
    }
    if (!same(current[field as keyof CurrentProduct], next)) out[field] = next
  }
  return out
}

/** Áp một phần đề xuất: `fields` rỗng / không gửi = áp toàn bộ. Trường lạ bị bỏ. */
export function selectFields(changes: ProductChanges, fields?: readonly string[] | null): { applied: ProductChanges; partial: boolean } {
  const all = Object.keys(changes) as ChangeableField[]
  const chosen = fields && fields.length > 0 ? all.filter((f) => fields.includes(f)) : all
  const applied: ProductChanges = {}
  for (const f of chosen) applied[f] = changes[f]
  return { applied, partial: chosen.length < all.length }
}

/** Bản gốc đã đổi sau lúc gửi đề xuất → xung đột, Điều hành phải xem lại. */
export function hasConflict(baseUpdatedAt: Date, currentUpdatedAt: Date): boolean {
  return currentUpdatedAt.getTime() > baseUpdatedAt.getTime()
}

export function changeRequestExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + CHANGE_REQUEST_TTL_DAYS * 86_400_000)
}
