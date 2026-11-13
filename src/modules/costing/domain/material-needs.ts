import type { Material, Recipe } from "./costing-types"

export interface DemandItem {
  orderId: string
  productId: string
  quantity: number
}

export interface MaterialNeed {
  materialId: string
  name: string
  unit: string
  requiredQty: number
  onHandQty: number | null
  /** Phải mua = cần − tồn (không âm). Tồn chưa nhập (`null`) thì phải mua = cần. */
  toBuyQty: number
  estimatedCostVnd: number | null
  orderIds: string[]
}

export interface MaterialNeedsResult {
  needs: MaterialNeed[]
  /** Sản phẩm trong đơn chưa có công thức — chưa cộng được vào dự toán. */
  productsWithoutRecipe: string[]
  totalEstimatedVnd: number
  /** Có dòng chưa có đơn giá → tổng chi phí chưa đủ. */
  costIncomplete: boolean
}

/**
 * Dự toán mua nguyên liệu (#35): cộng dồn (số lượng đặt × định mức × (1 + hao hụt)) theo nguyên
 * liệu, trừ tồn kho, ước chi phí. Sản phẩm thiếu công thức được liệt kê riêng, không bỏ im lặng.
 */
export function aggregateMaterialNeeds(
  demand: readonly DemandItem[],
  recipes: ReadonlyMap<string, Recipe>,
  materials: readonly Material[],
  wastePercentByCategory: Readonly<Record<string, number>>,
): MaterialNeedsResult {
  const byId = new Map(materials.map((m) => [m.id, m]))
  const acc = new Map<string, { qty: number; orders: Set<string> }>()
  const missing = new Set<string>()

  for (const d of demand) {
    const recipe = recipes.get(d.productId)
    if (!recipe || recipe.lines.length === 0) {
      missing.add(d.productId)
      continue
    }
    for (const line of recipe.lines) {
      const m = byId.get(line.materialId)
      if (!m) continue
      const waste = recipe.wastePercent ?? wastePercentByCategory[m.categoryKey] ?? 0
      const qty = d.quantity * line.quantity * (1 + waste / 100)
      const cur = acc.get(m.id) ?? { qty: 0, orders: new Set<string>() }
      cur.qty += qty
      cur.orders.add(d.orderId)
      acc.set(m.id, cur)
    }
  }

  let total = 0
  let costIncomplete = false
  const needs: MaterialNeed[] = []
  for (const [materialId, { qty, orders }] of acc) {
    const m = byId.get(materialId)
    if (!m) continue
    const requiredQty = Math.ceil(qty * 100) / 100
    const toBuyQty = Math.max(0, Math.ceil((requiredQty - (m.onHandQty ?? 0)) * 100) / 100)
    const estimatedCostVnd = m.unitCostVnd === null ? null : Math.round(toBuyQty * m.unitCostVnd)
    if (estimatedCostVnd === null) costIncomplete = true
    else total += estimatedCostVnd
    needs.push({ materialId, name: m.name, unit: m.unit, requiredQty, onHandQty: m.onHandQty, toBuyQty, estimatedCostVnd, orderIds: [...orders] })
  }
  needs.sort((a, b) => b.toBuyQty - a.toBuyQty || a.name.localeCompare(b.name, "vi"))
  return { needs, productsWithoutRecipe: [...missing], totalEstimatedVnd: total, costIncomplete }
}

/**
 * Câu báo khi dự toán không còn gì phải mua. Mẫu chưa có công thức thì chưa tính được nguyên liệu —
 * không được báo "tồn kho đã đủ" (dễ hiểu nhầm là không cần mua gì).
 */
export function noPurchaseMessage(needsCount: number, productsWithoutRecipe: number): string {
  if (needsCount === 0 && productsWithoutRecipe > 0) return "Chưa tính được nguyên liệu cần mua vì các mẫu trong đơn chưa có công thức."
  if (productsWithoutRecipe > 0) return "Tồn kho đủ cho các mẫu đã có công thức; mẫu chưa có công thức chưa được tính."
  return "Tồn kho đã đủ cho các đơn này."
}
