import type { CostBreakdown, CostConfig, CostLine, Material, Recipe } from "./costing-types"

export type Complexity = "EASY" | "MEDIUM" | "HARD"

/**
 * Giá vốn một sản phẩm (#33) = nguyên liệu + hao hụt + công + bao bì + chi phí chung.
 *
 * Quy tắc "không đoán số" (03c UX-016/UX-017): nguyên liệu thiếu đơn giá được liệt kê trong
 * `missingPrices` và KHÔNG tính bằng số giả; `complete = false` để giao diện báo rõ.
 */
export function computeProductCost(
  recipe: Recipe,
  materials: readonly Material[],
  config: CostConfig,
  complexity: Complexity | null,
): CostBreakdown {
  const byId = new Map(materials.map((m) => [m.id, m]))
  const lines: CostLine[] = []
  const missingPrices: string[] = []
  let materialVnd = 0
  let wasteVnd = 0

  for (const line of recipe.lines) {
    if (line.quantity <= 0) continue
    const m = byId.get(line.materialId)
    if (!m) {
      // Nguyên liệu đã xoá/ngừng dùng: bỏ qua thì giá vốn (và giá sàn) thấp hơn thật — báo thiếu (audit BL-07)
      missingPrices.push("Nguyên liệu không còn trong danh mục")
      continue
    }
    const lineCostVnd = m.unitCostVnd === null ? null : Math.round(m.unitCostVnd * line.quantity)
    lines.push({ materialId: m.id, name: m.name, quantity: line.quantity, unit: m.unit, unitCostVnd: m.unitCostVnd, lineCostVnd })
    if (lineCostVnd === null) {
      missingPrices.push(m.name)
      continue
    }
    materialVnd += lineCostVnd
    const wastePercent = recipe.wastePercent ?? config.wastePercentByCategory[m.categoryKey] ?? 0
    wasteVnd += Math.round((lineCostVnd * wastePercent) / 100)
  }

  let laborVnd = 0
  let laborMissing = false
  if (config.laborModel === "PER_COMPLEXITY") {
    if (complexity && config.laborByComplexityVnd) laborVnd = config.laborByComplexityVnd[complexity]
    else laborMissing = true
  } else if (recipe.laborMinutes !== null && config.laborRatePerHourVnd !== null) {
    laborVnd = Math.round((recipe.laborMinutes / 60) * config.laborRatePerHourVnd)
  } else {
    laborMissing = true
  }

  const packagingVnd = Math.max(0, Math.round(config.packagingVnd))
  const direct = materialVnd + wasteVnd + laborVnd + packagingVnd
  const overheadVnd = Math.round((direct * Math.max(0, config.overheadPercent)) / 100)
  const totalVnd = direct + overheadVnd

  return {
    lines,
    materialVnd,
    wasteVnd,
    laborVnd,
    packagingVnd,
    overheadVnd,
    totalVnd,
    missingPrices,
    laborMissing,
    complete: lines.length > 0 && missingPrices.length === 0 && !laborMissing,
  }
}
