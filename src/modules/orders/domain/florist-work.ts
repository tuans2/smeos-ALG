/**
 * Việc chế tác của thợ (checklist ALG 4.13) — luật thuần: thợ chỉ nhận việc và báo xong; công thức
 * đọc từ `order_items.metadata` (đơn Điều phối ghi `flowers` + `sampleImageUrl`). Không có giá.
 */

import type { ProductionStatus } from "./order-types"

export type FloristAction = "START" | "FINISH"

export const FLORIST_ACTIONS: readonly FloristAction[] = ["START", "FINISH"]

const FROM: Record<FloristAction, readonly ProductionStatus[]> = {
  START: ["ASSIGNED"],
  FINISH: ["ARRANGING", "QUALITY_CHECK"],
}
const TO: Record<FloristAction, ProductionStatus> = { START: "ARRANGING", FINISH: "READY" }

/** Trạng thái chế tác sau thao tác, hoặc `null` khi thao tác không hợp ở trạng thái hiện tại. */
export function floristNextStatus(current: ProductionStatus, action: FloristAction): ProductionStatus | null {
  return FROM[action].includes(current) ? TO[action] : null
}

export interface RecipeLine {
  flowerName: string
  quantity: number
  unit: string | null
  color: string | null
  role: string | null
}

export interface FloristItem {
  description: string | null
  quantity: number
  /** Phiên bản khách chọn và số cành của phiên bản (checklist ALG 2.4) */
  variantName: string | null
  stemCount: number | null
  recipe: RecipeLine[]
  sampleImageUrl: string | null
}

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null)

/** Rút công thức và ảnh mẫu từ metadata dòng hàng; bỏ mọi trường khác (giá vốn, ghi chú nội bộ). */
export function toFloristItem(item: { description: string | null; quantity: number; metadata: unknown }): FloristItem {
  const meta = item.metadata && typeof item.metadata === "object" ? (item.metadata as Record<string, unknown>) : {}
  const flowers = Array.isArray(meta.flowers) ? meta.flowers : []
  const recipe: RecipeLine[] = []
  for (const raw of flowers) {
    if (!raw || typeof raw !== "object") continue
    const f = raw as Record<string, unknown>
    const flowerName = text(f.flowerName)
    if (!flowerName) continue
    recipe.push({
      flowerName,
      quantity: typeof f.quantity === "number" ? f.quantity : 0,
      unit: text(f.unit),
      color: text(f.color),
      role: text(f.role),
    })
  }
  const variant = meta.variant && typeof meta.variant === "object" ? (meta.variant as Record<string, unknown>) : {}
  const stemCount = typeof variant.stemCount === "number" && variant.stemCount > 0 ? variant.stemCount : null
  // Đơn Điều phối ghi `sampleImageUrl`; ảnh chụp mẫu của đơn Thẻ Chào ghi `imageUrl`
  const sampleImageUrl = text(meta.sampleImageUrl) ?? text(meta.imageUrl)
  return { description: item.description, quantity: item.quantity, variantName: text(variant.name), stemCount, recipe, sampleImageUrl }
}

/** Ảnh mẫu và công thức đọc từ sản phẩm lúc in — dùng khi dòng hàng không mang theo (đơn tạo tay) hoặc ảnh đã hết hạn ký. */
export interface FloristProductFallback {
  imageUrl: string | null
  recipe: RecipeLine[]
}

export function withProductFallback(item: FloristItem, product: FloristProductFallback | undefined): FloristItem {
  if (!product) return item
  return {
    ...item,
    sampleImageUrl: product.imageUrl ?? item.sampleImageUrl,
    recipe: item.recipe.length > 0 ? item.recipe : product.recipe,
  }
}

// Ghi chú về tiền (đối soát, xác nhận thu, báo giá, phí giao lại) không in lên phiếu xưởng — thợ không thấy giá (4.9)
const MONEY_NOTE_TAGS = ["[Báo giá]", "[Điều hành: chưa nhận được tiền]", "[Điều phối xác nhận đã nhận tiền]", "[Điều hành xác nhận đơn]"]

/** Ghi chú nội bộ còn lại cho xưởng: bỏ dòng về tiền, bỏ nhãn "Chờ báo giá" và phần phí giao lại. */
export function floristNoteFrom(internalNote: string | null | undefined): string {
  return (internalNote ?? "")
    .split("\n")
    .filter((line) => !MONEY_NOTE_TAGS.some((tag) => line.trim().startsWith(tag)))
    .map((line) => line.replace("[Chờ báo giá]", "").replace(/\s*·\s*phí giao lại[^·]*$/u, "").replace(/\s{2,}/g, " ").trim())
    .filter(Boolean)
    .join("\n")
}
