/**
 * Kiểu dữ liệu lõi của Nhóm công cụ 6 (#31–#35) — dùng chung mọi ngành.
 * Đặc điểm ngành đến từ `IndustryCostingSpec` (organization/domain/industry-costing-spec.ts).
 * Thuần: không import Prisma.
 */

export interface Material {
  id: string
  name: string
  unit: string
  categoryKey: string
  /** `null` = cửa hàng chưa nhập đơn giá — không bao giờ đoán thay. */
  unitCostVnd: number | null
  onHandQty: number | null
  active: boolean
}

export interface RecipeLine {
  materialId: string
  quantity: number
}

export interface Recipe {
  productId: string
  lines: RecipeLine[]
  /** % hao hụt riêng của công thức; `null` = dùng mặc định theo nhóm nguyên liệu của ngành. */
  wastePercent: number | null
  laborMinutes: number | null
}

/** Cấu hình chi phí hiệu lực của cửa hàng = mặc định ngành ghi đè bởi `pricing_rules`. */
export interface CostConfig {
  laborModel: "PER_COMPLEXITY" | "PER_MINUTE"
  laborRatePerHourVnd: number | null
  laborByComplexityVnd: Readonly<Record<"EASY" | "MEDIUM" | "HARD", number>> | null
  overheadPercent: number
  packagingVnd: number
  wastePercentByCategory: Readonly<Record<string, number>>
}

export interface CostLine {
  materialId: string
  name: string
  quantity: number
  unit: string
  unitCostVnd: number | null
  lineCostVnd: number | null
}

export interface CostBreakdown {
  lines: CostLine[]
  materialVnd: number
  wasteVnd: number
  laborVnd: number
  packagingVnd: number
  overheadVnd: number
  totalVnd: number
  /** Tên nguyên liệu chưa có đơn giá — giá vốn chưa đủ tin cậy khi danh sách này khác rỗng. */
  missingPrices: string[]
  /** Không tính được tiền công vì thiếu dữ liệu (độ khó / số phút / đơn giá công). */
  laborMissing: boolean
  complete: boolean
}
