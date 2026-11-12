/**
 * master-terminology-registry.ts — Tầng 1 SaaS Mother Master Registry
 *
 * Đóng vai trò là SSOT tối cao quy định toàn bộ từ điển chuẩn cho 4 tầng.
 * Hỗ trợ tra cứu theo Tier và kế thừa theo Industry/Role.
 *
 * Giới hạn dòng: < 350 lines (SRP Clean Architecture).
 */

import type {
  AlgTier,
  SaasMotherTerminology,
  SaasIndustryTerminology,
  ChainOsTerminology,
  StoreOsTerminology,
} from "./terminology-contract"

export const SAAS_MOTHER_TERMS: SaasMotherTerminology = {
  platformName: "ALG — Hệ Điều Hành Doanh Nghiệp Tinh Gọn",
  platformAdminTitle: "Quản trị viên nền tảng",
  tenantEntityTitle: "Tổ chức doanh nghiệp",
  subscriptionPlanTitle: "Gói giải pháp dịch vụ",
  quotaUsageTitle: "Hạn ngạch tiêu thụ AI & Hạ tầng",
  modelLicenseTitle: "Giấy phép thương mại mô hình AI",
  auditLogTitle: "Nhật ký kiểm toán an toàn hệ thống",
  tenantIsolationTitle: "Cách ly an toàn dữ liệu tổ chức",
}

export const SAAS_INDUSTRY_TERMS: SaasIndustryTerminology = {
  networkSalesTitle: "Mạng lưới tiếp thị liên kết đa đối tác",
  autoDispatchTitle: "Bộ máy tự động định tuyến đơn hàng",
  partnerCommissionTitle: "Hoa hồng đối tác gia công",
  taxonomyRegistryTitle: "Danh mục chuẩn hóa ngành",
  bomSpecTitle: "Định mức nguyên phụ liệu chuẩn",
  printableA6Title: "Kho mẫu ấn phẩm A6 đính kèm",
  promptBlueprintTitle: "Kịch bản tạo mẫu AI chuyên ngành",
}

export const CHAIN_OS_TERMS: ChainOsTerminology = {
  chainHqTitle: "Tổng bộ Chuỗi Thương Hiệu",
  controlTowerTitle: "Tháp điều phối đơn hàng mạng lưới",
  chainOrderTitle: "Đơn hàng thương hiệu Chuỗi",
  subcontractOrderTitle: "Đơn gia công điều phối",
  workshopTitle: "Trạm chế tác / Chi nhánh nhận việc",
  qualityReviewTitle: "Kiểm duyệt chất lượng thành phẩm (QC)",
  reconciliationTitle: "Đối soát công nợ chi nhánh & xưởng",
  dispatchActionTitle: "Bắn đơn về xưởng / chi nhánh",
}

export const STORE_OS_TERMS: StoreOsTerminology = {
  posRetailTitle: "Bán lẻ tại quầy",
  localOrderTitle: "Đơn hàng tại cửa hàng",
  networkInboxTitle: "Đơn nhận từ mạng lưới",
  workshopQueueTitle: "Hàng đợi thợ chế tác",
  completionProofTitle: "Ảnh nghiệm thu thành phẩm",
  cashierTitle: "Sổ quỹ thu chi tiệm",
  localInventoryTitle: "Kho nguyên liệu tại chỗ",
  printTagActionTitle: "In ấn phẩm & Thẻ kèm",
}

/**
 * Tra cứu thuật ngữ theo từng Tầng trong hệ sinh thái
 */
/** Bảng tầng → bộ thuật ngữ; kiểu trả về suy ra theo khoá, không cần ép `any`. */
export interface TierTerminologyMap {
  TIER_1_SAAS: SaasMotherTerminology
  TIER_2_INDUSTRY: SaasIndustryTerminology
  TIER_3_CHAIN: ChainOsTerminology
  TIER_4_STORE: StoreOsTerminology
}

const TIER_TERMS: TierTerminologyMap = {
  TIER_1_SAAS: SAAS_MOTHER_TERMS,
  TIER_2_INDUSTRY: SAAS_INDUSTRY_TERMS,
  TIER_3_CHAIN: CHAIN_OS_TERMS,
  TIER_4_STORE: STORE_OS_TERMS,
}

export function getTierTerminology<T extends AlgTier>(tier: T): TierTerminologyMap[T] {
  return TIER_TERMS[tier]
}
