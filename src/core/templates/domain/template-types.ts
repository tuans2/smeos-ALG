/**
 * ALG Template Engine — Domain Types
 * Định nghĩa cấu trúc cho hệ thống template đa tenant.
 *
 * DỰ TRỮ, KHÔNG PHẢI NỢ (nợ #99, chốt 17/09) — xem chú thích đầy đủ ở
 * `../golden-templates.ts`. Chưa có nơi gọi thật nào dùng `TemplateOverride`;
 * kiểu này mô tả trước cho một cơ chế chưa xây (bảng `template_overrides`
 * chưa tồn tại trong `prisma/schema.prisma`).
 */

export type TemplateCategory =
  | "guidance"      // Mẫu hướng dẫn thao tác tính năng
  | "inspection"    // Mẫu kết quả phân tích cấu phần hoa / BOM
  | "commercial"    // Mẫu nội dung bán hàng / SEO / phân khúc giá
  | "sales_pitch"   // Mẫu thẻ chào khách A6 / kịch bản tư vấn Zalo
  | "production"    // Mẫu vận hành / phiếu chế tác / thiệp mừng

export type TemplateOutputFormat =
  | "react_component" // Render giao diện React tương tác
  | "plain_text"      // Render chuỗi text / emoji (Zalo, SMS, Messenger)
  | "html"            // Render HTML (email, web, trang in)
  | "canvas_image"    // Render hình ảnh canvas (A6 PNG/JPEG)
  | "pdf"             // Render tài liệu PDF vector

export interface TemplateVariableMeta {
  key: string
  label: string
  category: "product" | "flower" | "pricing" | "service" | "shop"
  description: string
  exampleValue: string
}

export interface TemplateDefinition {
  id: string
  category: TemplateCategory
  name: string
  description: string
  format: TemplateOutputFormat
  templateString: string
  requiredVariables: string[]
  isSystemGolden: boolean
  schemaVersion: number
}

export interface TemplateOverride {
  id: string
  organizationId: string
  templateId: string
  customTemplateString: string
  customVariables?: Record<string, string>
  updatedAt: string
}

export interface InterpolationContext {
  product?: {
    name?: string | undefined
    sku?: string | undefined
    style?: string | undefined
    category?: string | undefined
    description?: string | undefined
  } | undefined
  flower?: {
    summaryList?: string | undefined
    mainTones?: string | undefined
    facing?: string | undefined
    wrapping?: string | undefined
    totalStems?: number | undefined
    items?: Array<{ name: string; quantity: number; color?: string | undefined; role?: string | undefined }> | undefined
  } | undefined
  pricing?: {
    sellingPrice?: number | undefined
    sellingPriceVnd?: string | undefined
    originalPrice?: number | undefined
    originalPriceVnd?: string | undefined
    discountPercent?: number | undefined
    segment?: string | undefined
  } | undefined
  service?: {
    giftsList?: string[] | undefined
    giftsBullets?: string | undefined
    commitmentsList?: string[] | undefined
    commitmentsBullets?: string | undefined
  } | undefined
  shop?: {
    name?: string | undefined
    hotline?: string | undefined
    address?: string | undefined
    zaloLink?: string | undefined
    brandTone?: string | undefined
  } | undefined
  [key: string]: unknown
}
