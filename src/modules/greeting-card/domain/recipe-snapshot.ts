/**
 * Công thức của mẫu (`products.attributes.bom.flowers`, form Thêm sản phẩm) chép vào ảnh chụp mẫu của đơn Thẻ Chào
 * dưới dạng `flowers[]` — cùng định dạng đơn Điều phối ghi, để phiếu thợ (`orders/domain/florist-work.ts`) và
 * đề xuất thay hoa (`flower-substitute.ts`, 5.14) đọc được. Vai "Hoa chính" của form = "Chủ đạo" (không được đề
 * xuất thay). Pure TypeScript.
 */
import { MAIN_FLOWER_ROLE } from "./flower-substitute"

export interface RecipeFlower {
  flowerName: string
  quantity: number
  unit: string | null
  color: string | null
  role: string | null
}

const PRIMARY_ROLE_LABELS = new Set(["Hoa chính", "PRIMARY", MAIN_FLOWER_ROLE])
const MAX_LINES = 30

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const text = (v: unknown, max = 80): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null)

export function recipeFromAttributes(attributes: unknown): RecipeFlower[] {
  const list = rec(rec(attributes).bom).flowers
  if (!Array.isArray(list)) return []
  const out: RecipeFlower[] = []
  for (const raw of list) {
    const f = rec(raw)
    const flowerName = text(f.name) ?? text(f.flowerName)
    if (!flowerName) continue
    const role = text(f.role, 40)
    out.push({
      flowerName,
      quantity: typeof f.quantity === "number" && Number.isFinite(f.quantity) && f.quantity > 0 ? f.quantity : 0,
      unit: text(f.unit, 20),
      color: text(f.color, 40),
      role: role && PRIMARY_ROLE_LABELS.has(role) ? MAIN_FLOWER_ROLE : role,
    })
    if (out.length >= MAX_LINES) break
  }
  return out
}
