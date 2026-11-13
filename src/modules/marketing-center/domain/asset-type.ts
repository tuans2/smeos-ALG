/**
 * Domain model cho danh mục loại Asset (Marketing & Sales Center).
 *
 * SSOT: `docs/kien-truc/Nâng cấp tasks/ALG_Marketing_Sales_Center/02_DANH_MUC_ASSET.md`.
 * 6 Business Modules: brand, content, promotion, sales, care, print.
 * Mức sẵn sàng tính động từ công cụ: Sẵn ⇔ công cụ DONE và fit === FULL.
 */

import type { ToolDefinition } from "@/modules/toolkit/domain/toolkit-catalog"

export type BusinessModuleKey = "brand" | "content" | "promotion" | "sales" | "care" | "print"

export type UsageDestination = "PROMOTION" | "SALES" | "CARE" | "PRINT" | "LIBRARY"

export type InputSource =
  | "STORE_PROFILE"
  | "BRAND_PROFILE"
  | "PRODUCT"
  | "PRODUCT_PHOTO"
  | "ACTIVE_PROMOTIONS"
  | "CUSTOMER"
  | "MANUAL_TEXT"

export type AssetFit = "FULL" | "PARTIAL"

export type AssetReadiness = "READY" | "EXTEND" | "NEW"

export interface AssetInputRequirement {
  readonly label: string
  readonly source: InputSource
  readonly required: boolean
}

export interface AssetTypeDefinition {
  readonly code: string
  readonly name: string
  readonly purpose: string
  readonly module: BusinessModuleKey
  readonly destinations: readonly UsageDestination[]
  readonly toolId: number | null
  readonly fit: AssetFit
  readonly inputs: readonly AssetInputRequirement[]
  readonly outputs: readonly string[]
  readonly customHref?: string
}

/**
 * Tính mức sẵn sàng của asset:
 * - READY (Sẵn): công cụ tương ứng đã DONE và độ khớp là FULL.
 * - NEW (Mới): chưa có công cụ gắn kèm (toolId null).
 * - EXTEND (Mở rộng): có công cụ nền tảng nhưng chưa DONE hoặc chỉ khớp PARTIAL.
 */
export function readinessOf(
  asset: AssetTypeDefinition,
  tool?: ToolDefinition | null,
): AssetReadiness {
  if (asset.customHref) {
    return "READY"
  }
  if (asset.toolId === null || !tool) {
    return "NEW"
  }
  if (tool.status === "DONE" && asset.fit === "FULL") {
    return "READY"
  }
  return "EXTEND"
}

/**
 * Trả về đường dẫn thao tác tạo asset:
 * Ưu tiên customHref nếu có, sau đó là tool.href.
 */
export function getAssetHref(
  asset: AssetTypeDefinition,
  tool?: ToolDefinition | null,
): string | null {
  return asset.customHref ?? tool?.href ?? null
}

/**
 * Lọc danh sách đầu vào cần người dùng nhập tay (source === MANUAL_TEXT hoặc bắt buộc mà không tự điền)
 */
export function getManualInputs(inputs: readonly AssetInputRequirement[]): readonly AssetInputRequirement[] {
  return inputs.filter((i) => i.source === "MANUAL_TEXT" || (i.required && i.source !== "STORE_PROFILE" && i.source !== "BRAND_PROFILE"))
}

export const USAGE_DESTINATION_DISPLAY: Record<UsageDestination, { label: string; short: string; description: string }> = {
  PROMOTION: { label: "Quảng bá", short: "QB", description: "Tiếp cận khách mới, chạy chiến dịch mạng xã hội" },
  SALES: { label: "Bán hàng", short: "BH", description: "Gửi khách tư vấn, chốt đơn, gửi báo giá" },
  CARE: { label: "Chăm sóc", short: "CS", description: "Giữ chân khách cũ, gửi thiệp, tri ân dịp lễ" },
  PRINT: { label: "In ấn", short: "IN", description: "In trưng bày tại quầy, standee, poster, thẻ treo" },
  LIBRARY: { label: "Lưu thư viện", short: "KHO", description: "Lưu trữ tập trung trong Kho dữ liệu để tái dùng" },
}

export const INPUT_SOURCE_DISPLAY: Record<InputSource, { label: string; isAuto: boolean }> = {
  STORE_PROFILE: { label: "Hồ sơ cửa hàng (tự điền)", isAuto: true },
  BRAND_PROFILE: { label: "Thương hiệu đã duyệt (tự điền)", isAuto: true },
  PRODUCT: { label: "Thông tin sản phẩm (tự chọn)", isAuto: true },
  PRODUCT_PHOTO: { label: "Ảnh sản phẩm thật (tự lấy)", isAuto: true },
  ACTIVE_PROMOTIONS: { label: "Chương trình ưu đãi đang bật (tự lấy)", isAuto: true },
  CUSTOMER: { label: "Thông tin khách hàng (tự chọn)", isAuto: true },
  MANUAL_TEXT: { label: "Nhập nội dung tay", isAuto: false },
}

export const READINESS_DISPLAY: Record<AssetReadiness, { label: string; badgeVariant: "success" | "warning" | "neutral" }> = {
  READY: { label: "Sẵn sàng", badgeVariant: "success" },
  EXTEND: { label: "Mở rộng", badgeVariant: "warning" },
  NEW: { label: "Sắp có", badgeVariant: "neutral" },
}

