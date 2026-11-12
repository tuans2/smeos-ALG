/**
 * terminology-contract.ts — Master Terminology Contracts & Tier Definitions (SSOT)
 *
 * Tầng SaaS Mother quy định, quản lý & chuẩn hóa toàn bộ Terminology cho 4 tầng:
 * - Tầng 1: SaaS Mother (Platform & Governance)
 * - Tầng 2: SaaS Ngành (Industry Standards & Affiliate Network)
 * - Tầng 3: ChainOS (Chain HQ, Coordination & Workshop Network)
 * - Tầng 4: StoreOS (Store Retail Operations & Workshop Queue)
 *
 * Zero architectural leaks: Domain thuần túy, không import Prisma/DB.
 */

export type AlgTier =
  | "TIER_1_SAAS"      // SaaS Mother (Platform Governance)
  | "TIER_2_INDUSTRY"  // SaaS Ngành (Industry & Affiliate)
  | "TIER_3_CHAIN"     // ChainOS (Brand HQ & Multi-branch Control Tower)
  | "TIER_4_STORE"     // StoreOS (Independent Store & Workshop Hub)

/**
 * 🏛️ TẦNG 1: Thuật ngữ Chuẩn hóa Nền tảng SaaS Mẹ
 */
export interface SaasMotherTerminology {
  readonly platformName: string           // "ALG — Nền tảng Điều hành Doanh nghiệp"
  readonly platformAdminTitle: string     // "Quản trị viên nền tảng"
  readonly tenantEntityTitle: string      // "Tổ chức / Doanh nghiệp"
  readonly subscriptionPlanTitle: string  // "Gói giải pháp dịch vụ"
  readonly quotaUsageTitle: string        // "Hạn ngạch tiêu thụ AI & Dịch vụ"
  readonly modelLicenseTitle: string      // "Giấy phép thương mại mô hình AI"
  readonly auditLogTitle: string          // "Nhật ký kiểm toán an toàn hệ thống"
  readonly tenantIsolationTitle: string   // "Cơ chế cách ly dữ liệu doanh nghiệp"
}

/**
 * 🌐 TẦNG 2: Thuật ngữ Chuẩn hóa SaaS Ngành & Mạng Lưới Bán Hàng
 */
export interface SaasIndustryTerminology {
  readonly networkSalesTitle: string      // "Mạng lưới tiếp thị liên kết đa đối tác"
  readonly autoDispatchTitle: string      // "Bộ máy tự động định tuyến gia công"
  readonly partnerCommissionTitle: string // "Hoa hồng đối tác gia công"
  readonly taxonomyRegistryTitle: string  // "Danh mục chuẩn hóa ngành"
  readonly bomSpecTitle: string           // "Định mức nguyên phụ liệu chuẩn"
  readonly printableA6Title: string       // "Kho mẫu ấn phẩm A6 đính kèm"
  readonly promptBlueprintTitle: string   // "Kịch bản tạo mẫu AI chuyên ngành"
}

/**
 * 🔗 TẦNG 3: Thuật ngữ Chuẩn hóa Chuỗi Thương Hiệu (ChainOS)
 */
export interface ChainOsTerminology {
  readonly chainHqTitle: string           // "Tổng bộ Chuỗi Thương Hiệu"
  readonly controlTowerTitle: string      // "Tháp điều phối đơn hàng mạng lưới"
  readonly chainOrderTitle: string        // "Đơn hàng thương hiệu Chuỗi"
  readonly subcontractOrderTitle: string  // "Đơn gia công điều phối"
  readonly workshopTitle: string          // "Trạm chế tác / Chi nhánh nhận việc"
  readonly qualityReviewTitle: string     // "Kiểm duyệt chất lượng thành phẩm (QC)"
  readonly reconciliationTitle: string    // "Đối soát công nợ chi nhánh & xưởng"
  readonly dispatchActionTitle: string    // "Bắn đơn về xưởng / chi nhánh"
}

/**
 * 🏪 TẦNG 4: Thuật ngữ Chuẩn hóa Cửa Hàng Bán Lẻ (StoreOS)
 */
export interface StoreOsTerminology {
  readonly posRetailTitle: string         // "Bán lẻ tại quầy"
  readonly localOrderTitle: string        // "Đơn hàng tại cửa hàng"
  readonly networkInboxTitle: string      // "Đơn nhận từ mạng lưới (Gia công)"
  readonly workshopQueueTitle: string     // "Hàng đợi thợ chế tác"
  readonly completionProofTitle: string   // "Ảnh nghiệm thu thành phẩm"
  readonly cashierTitle: string           // "Sổ quỹ thu chi tiệm"
  readonly localInventoryTitle: string    // "Kho nguyên liệu tại chỗ"
  readonly printTagActionTitle: string    // "In ấn phẩm & Thẻ kèm"
}

/**
 * Tổng hợp toàn bộ Terminology của một Tier
 */
export interface MasterTierTerminology {
  readonly tier: AlgTier
  readonly name: string
  readonly description: string
  readonly terms: Record<string, string>
}
