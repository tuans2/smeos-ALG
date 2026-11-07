/**
 * industry-plugin-contract.ts — Hợp đồng Đặc tả Ngành SSOT (Industry Plugin Contract)
 *
 * Tiêu chuẩn kiến trúc cấp doanh nghiệp: Mọi ngành muốn vận hành trên smeOS
 * đều bắt buộc phải triển khai đầy đủ 6 khối thành phần chuẩn mực.
 *
 * Zero architectural leaks: Domain thuần, không import Prisma, không phụ thuộc client.
 */

export interface IndustryIdentity {
  readonly key: string
  readonly name: string
  readonly description: string
  readonly iconName: string
}

export interface IndustryTerminology {
  readonly makerTitle: string              // Tên vai trò người sản xuất (Thợ hoa, Thợ may, Đầu bếp...)
  readonly makerAction: string             // Hành động chế tác (Cắm hoa, May đo, Chế biến...)
  readonly productRecipe: string           // Tên công thức (Công thức cành, Bảng định mức vải, Định lượng món...)
  readonly sampleProduct: string           // Tên mẫu sản phẩm (Sản phẩm, Mẫu thiết kế, Món ăn chuẩn...)
  readonly rawMaterialItem: string         // Tên đơn vị nguyên liệu (Cành hoa, Vải/Phụ liệu, Nguyên liệu...)
  readonly completedProductPhoto: string   // Tên ảnh thành phẩm (Ảnh hoa hoàn thành, Ảnh trang phục, Ảnh món ra đĩa...)
  readonly printablesTitle: string         // Tên thẻ đính kèm (Thiệp chúc mừng, Thẻ bài & HD giặt, Menu để bàn...)
  readonly catalogTitle: string            // Tên danh mục tổng (Kho sản phẩm, Bộ sưu tập Lookbook, Thực đơn món...)
  readonly createButtonLabel: string       // Nút tạo mới (Thêm sản phẩm, Thêm mẫu thiết kế, Thêm món mới...)
  readonly scanButtonLabel: string         // Nút quét ảnh (Quét ảnh hoa, Quét mẫu trang phục, Quét ảnh món...)
  readonly defaultMeasurementUnits: readonly string[]
  readonly defaultComponentRoles: readonly { readonly key: string; readonly label: string; readonly isRequired?: boolean }[]
}

export interface IndustryTaxonomyCategory {
  readonly key: string
  readonly label: string
  readonly defaultUnit: string
  readonly iconName?: string
}

export interface IndustryTaxonomyOccasion {
  readonly key: string
  readonly label: string
  readonly suggestedPromotion?: string
}

export interface IndustryTaxonomy {
  readonly defaultCategories: readonly IndustryTaxonomyCategory[]
  readonly occasions: readonly IndustryTaxonomyOccasion[]
  readonly priceRanges: readonly { readonly label: string; readonly min: number; readonly max?: number }[]
  /** Gợi ý khai giá theo phiên bản / cao điểm (PO 22/10/2026). Cửa hàng vẫn tự thêm nhóm, giá trị riêng. */
  readonly pricingPresets: IndustryPricingPresets
}

export interface IndustryVariantDimensionPreset {
  readonly key: string
  readonly label: string
  readonly values: readonly string[]
}

export interface IndustryPricingPresets {
  /** Mặc định tính Thứ 7, Chủ nhật là ngày cao điểm (homestay, F&B, dịch vụ) */
  readonly weekendIsPeak: boolean
  readonly variantDimensions: readonly IndustryVariantDimensionPreset[]
}

export interface IndustryBomSpec {
  readonly measurementUnits: readonly string[]
  readonly componentRoles: readonly { readonly key: string; readonly label: string; readonly isRequired: boolean }[]
}

export interface IndustryPrintableTemplate {
  readonly type: "TAG" | "CARD" | "MENU" | "WARRANTY" | "CARE_GUIDE" | "DISPATCH"
  readonly title: string
  readonly description: string
  readonly defaultFrontTitle: string
  readonly defaultBackInstructions: readonly string[]
}

export interface IndustryTemplatesSpec {
  readonly printables: readonly IndustryPrintableTemplate[]
}

export interface IndustryAiConfig {
  readonly visionFocus: string
  readonly studioBackgroundStyles: readonly string[]
  readonly marketingToneExamples: readonly string[]
  readonly sampleProductNames: readonly string[]
}

/**
 * Cấu hình điều hướng sidebar theo ngành.
 *
 * Lớp 1 trong chuỗi lọc 3 lớp: Industry Nav Matrix → RBAC → Feature Lock.
 * Admin SaaS quyết định tại Console `/van-hanh`, tổ chức không biết/không thấy.
 */
export interface IndustryNavConfig {
  /** Danh sách navKey bị ẩn khỏi sidebar cho ngành này (mặc định [] = hiện tất cả). */
  readonly hiddenNavKeys: readonly string[]
}

export type CraftComplexity = "EASY" | "MEDIUM" | "HARD"

/**
 * Phí trả cho bên làm thay (chi nhánh trong chuỗi / đối tác) — SỐ MẶC ĐỊNH của ngành; tiệm tự sửa
 * trong Cài đặt → Điều phối chuỗi. Cách tính dùng chung mọi ngành nằm ở
 * `greeting-card/domain/craft-fee-policy.ts`; ngành chỉ khai nhãn và số khởi điểm.
 */
export interface IndustryCraftFeeSpec {
  readonly feeLabel: string // Tên khoản phí trên màn hình: "Phí cắm hoa", "Phí may đo", "Phí chế biến"…
  readonly defaultPercent: number // % giá hàng trả cho chi nhánh cùng chủ
  readonly minVnd: number
  readonly maxVnd: number
  readonly partnerPercent: number // % trả cho đối tác ngoài chuỗi
  readonly complexityLabels: Readonly<Record<CraftComplexity, string>>
  readonly laborByComplexityVnd: Readonly<Record<CraftComplexity, number>>
  /** Ngày cao điểm cố định hằng năm (MM-DD) — tiệm thêm ngày âm lịch (Tết, Trung thu) trong cài đặt. */
  readonly peakDays: readonly { readonly monthDay: string; readonly label: string }[]
  /**
   * Phí chế tác theo kiểu dáng sản phẩm, đã gồm trong giá niêm yết (PO Q8, checklist ALG 3.6). Cửa hàng sửa
   * đơn giá trong Cài đặt. Ngày lễ cộng phần chênh phí × (`holidayMultiplier` − 1). Ngành không khai → không áp.
   */
  readonly styles?: readonly { readonly key: string; readonly label: string; readonly defaultVnd: number }[]
  readonly holidayMultiplier?: number
}

import type { IndustryCostingSpec } from "./industry-costing-spec"
import type { CustomerTierThresholds } from "./industry-customer-tiers"

export interface IndustryPluginContract {
  readonly identity: IndustryIdentity
  readonly terminology: IndustryTerminology
  readonly taxonomy: IndustryTaxonomy
  readonly bomSpec: IndustryBomSpec
  readonly templates: IndustryTemplatesSpec
  readonly aiConfig: IndustryAiConfig
  readonly navigation: IndustryNavConfig
  /** `null` = ngành không thuê ngoài sản xuất (vd. homestay) — mục Phí gia công ẩn khỏi cài đặt. */
  readonly craftFee: IndustryCraftFeeSpec | null
  /**
   * Hồ sơ tính giá (Nhóm công cụ 6). `null` = ngành chưa hỗ trợ — các công cụ #31–#35 hiện
   * "Ngành của bạn chưa được hỗ trợ" thay vì chạy với số không phù hợp ngành.
   */
  readonly costing: IndustryCostingSpec | null
  /** Ngưỡng hạng khách của ngành (PO 07/11/2026, Q6); vắng = `DEFAULT_CUSTOMER_TIER_THRESHOLDS`. */
  readonly customerTiers?: CustomerTierThresholds
}
