/**
 * industry-costing-spec.ts — Hồ sơ tính giá theo ngành (Nhóm công cụ 6, #31–#35).
 *
 * Lõi tính giá dùng chung mọi ngành nằm ở `src/modules/costing/domain/`. Ngành chỉ KHAI BÁO
 * đặc điểm của mình ở đây: đơn vị, nhóm nguyên liệu, hao hụt mặc định, cách tính công, kịch bản
 * giá, cách đọc BOM do AI bóc tách. Đây là **gợi ý khởi điểm** — công thức và đơn giá thật là dữ
 * liệu riêng của từng cửa hàng (REQ-BND-007/008: Industry Pack sở hữu định nghĩa, cửa hàng chỉ đọc).
 *
 * Thêm ngành mới: khai `costing` trong tệp ngành (hoặc `null` nếu chưa hỗ trợ) — không sửa lõi.
 */

export interface IndustryMaterialCategory {
  readonly key: string
  readonly label: string
  readonly defaultUnit: string
  /** % hao hụt mặc định khi dùng (hoa tươi dập/héo, vải cắt thừa…). */
  readonly defaultWastePercent: number
}

/**
 * Cách tính tiền công:
 * - `PER_COMPLEXITY`: theo độ khó của mẫu — dùng `craftFee.laborByComplexityVnd` của ngành.
 * - `PER_MINUTE`: theo số phút làm × đơn giá công/giờ của cửa hàng.
 */
export type IndustryLaborModel = "PER_COMPLEXITY" | "PER_MINUTE"

/** Bộ chuyển đổi BOM do AI bóc tách → dòng công thức. Đăng ký ở `costing/domain/bom-adapters.ts`. */
export type IndustryBomAdapterKey = "FLORAL_VISION" | "GENERIC"

export interface IndustryPriceScenarioPreset {
  readonly key: "SAFE" | "RECOMMENDED" | "COMPETITIVE"
  readonly label: string
  /** Biên lợi nhuận mục tiêu trên giá bán, phần trăm. */
  readonly marginPercent: number
}

export interface IndustryCostingSpec {
  readonly materialCategories: readonly IndustryMaterialCategory[]
  readonly laborModel: IndustryLaborModel
  readonly defaultOverheadPercent: number
  readonly defaultPackagingVnd: number
  /** Làm tròn giá bán đề xuất lên bội số này (VNĐ). */
  readonly priceRoundingVnd: number
  readonly priceScenarios: readonly IndustryPriceScenarioPreset[]
  /** Cảnh báo khi đơn giá nguyên liệu đổi quá mức này (phần trăm) so với lần trước. */
  readonly priceChangeAlertPercent: number
  /** Nguyên liệu tươi/dễ hỏng: dự toán khuyên mua sát ngày dùng, không tích trữ. */
  readonly perishable: boolean
  readonly bomAdapter: IndustryBomAdapterKey
  /** Nguyên liệu gợi ý cho lần dùng đầu (03c UX-023) — cửa hàng tự nhập đơn giá. */
  readonly starterMaterials: readonly { readonly name: string; readonly categoryKey: string; readonly unit: string }[]
}
