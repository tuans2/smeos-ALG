import type { IndustryPriceScenarioPreset } from "@/modules/organization/domain/industry-costing-spec"
import { ceilingPriceVnd, floorPriceVnd } from "./price-floor"

export interface PriceScenario {
  key: IndustryPriceScenarioPreset["key"] | "CURRENT" | "COMPETITOR"
  label: string
  priceVnd: number
  profitVnd: number
  /** Biên lợi nhuận trên giá bán, phần trăm (làm tròn 1 chữ số). */
  marginPercent: number
  warnings: string[]
}

export interface PriceScenarioInput {
  costVnd: number
  presets: readonly IndustryPriceScenarioPreset[]
  roundingVnd: number
  currentPriceVnd?: number | null | undefined
  competitorPriceVnd?: number | null | undefined
  /** Sàn/trần theo tỉ lệ giá vốn từ `pricing_rules` (0 = không áp). */
  floorRatio?: number | undefined
  ceilingRatio?: number | undefined
}

function roundUpTo(value: number, step: number): number {
  return step > 0 ? Math.ceil(value / step) * step : Math.round(value)
}

function scenario(key: PriceScenario["key"], label: string, priceVnd: number, input: PriceScenarioInput): PriceScenario {
  const profitVnd = priceVnd - input.costVnd
  const marginPercent = priceVnd > 0 ? Math.round((profitVnd / priceVnd) * 1000) / 10 : 0
  const warnings: string[] = []
  if (profitVnd < 0) warnings.push("Giá này đang lỗ so với giá vốn")
  // Cùng cách làm tròn với chặn thật (`floorPriceVnd`) — giá "không cảnh báo" thì không bao giờ bị chặn (audit BL-07)
  if (input.floorRatio && priceVnd < floorPriceVnd(input.costVnd, input.floorRatio)) warnings.push("Thấp hơn giá sàn của cửa hàng")
  if (input.ceilingRatio && priceVnd > ceilingPriceVnd(input.costVnd, input.ceilingRatio)) warnings.push("Cao hơn giá trần của cửa hàng")
  return { key, label, priceVnd, profitVnd, marginPercent, warnings }
}

/**
 * Đề xuất giá bán theo các kịch bản biên lợi nhuận của ngành (#34):
 * giá = giá vốn / (1 − biên), làm tròn lên theo bước của ngành. Kèm giá hiện tại và giá đối thủ
 * (nếu có) để so sánh trên cùng một thước đo.
 */
export function priceScenarios(input: PriceScenarioInput): PriceScenario[] {
  if (!(input.costVnd > 0)) return []
  const out = input.presets.map((p) => {
    const raw = input.costVnd / (1 - Math.min(Math.max(p.marginPercent, 0), 95) / 100)
    return scenario(p.key, p.label, roundUpTo(raw, input.roundingVnd), input)
  })
  if (input.currentPriceVnd && input.currentPriceVnd > 0) out.push(scenario("CURRENT", "Giá đang bán", input.currentPriceVnd, input))
  if (input.competitorPriceVnd && input.competitorPriceVnd > 0) out.push(scenario("COMPETITOR", "Giá đối thủ", input.competitorPriceVnd, input))
  return out
}
