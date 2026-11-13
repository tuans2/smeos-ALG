import type { CostBreakdown, Material } from "@/modules/costing/domain/costing-types"
import type { PriceScenario } from "@/modules/costing/domain/price-scenarios"

/** Dòng nguyên liệu như API `GET /costing/materials` trả về. */
export type MaterialRow = Material & {
  supplierName: string | null
  priceChange: { previousVnd: number; currentVnd: number; changePercent: number; alert: boolean } | null
}

export interface ProductOption {
  id: string
  name: string
}

/** Số nhập từ ô văn bản: rỗng → null; sai → NaN để báo lỗi. Tiền: dấu chấm là phân cách nghìn. */
export function parseNumberInput(v: string, money = false): number | null {
  const t = (money ? v.replace(/[.\s]/g, "") : v.replace(/\s/g, "").replace(",", ".")).trim()
  if (t === "") return null
  const n = Number(t)
  return Number.isFinite(n) ? n : Number.NaN
}

export const selectClass =
  "h-11 w-full rounded-xl border border-border bg-surface px-3 text-body text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"

/** Phản hồi `GET /costing/products/:id/cost` — dùng chung cho #33 và #34. */
export interface CostResponse {
  product: { id: string; name: string; priceVnd: number | null }
  hasRecipe: boolean
  cost: CostBreakdown | null
  scenarios: PriceScenario[]
}
