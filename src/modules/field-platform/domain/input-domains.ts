/**
 * ALG Inputs Architecture v2.1 — 16 Input Domains SSOT
 *
 * Domain keys are stable string literals used across Registry, APIs,
 * permissions, and audit logs.
 */

export const INPUT_DOMAIN_KEYS = [
  "org_legal",
  "brand",
  "structure_access",
  "catalog",
  "supply_inventory",
  "resource_schedule",
  "pricing_cost",
  "finance_tax_payment",
  "sales_policy",
  "process_sla",
  "people_capacity",
  "customer_crm",
  "channels_integration",
  "marketing_promo",
  "knowledge_base",
  "ai_automation",
] as const

export type InputDomainKey = (typeof INPUT_DOMAIN_KEYS)[number]

export interface InputDomainMeta {
  readonly key: InputDomainKey
  readonly order: number
  readonly nameVi: string
  readonly nameEn: string
  readonly defaultLayer: "L1" | "L2" | "L3" | "L4"
  readonly defaultStage: "G1" | "G2" | "G3"
  readonly descriptionVi: string
}

export const INPUT_DOMAINS: Record<InputDomainKey, InputDomainMeta> = {
  org_legal: {
    key: "org_legal",
    order: 1,
    nameVi: "Tổ chức & pháp nhân",
    nameEn: "Organization & Legal Entity",
    defaultLayer: "L1",
    defaultStage: "G1",
    descriptionVi: "Owner, Legal Entity, Store, MST, địa chỉ, múi giờ",
  },
  brand: {
    key: "brand",
    order: 2,
    nameVi: "Thương hiệu",
    nameEn: "Brand & Identity",
    defaultLayer: "L1",
    defaultStage: "G1",
    descriptionVi: "Logo, màu sắc, phong cách, giọng điệu, mẫu hóa đơn",
  },
  structure_access: {
    key: "structure_access",
    order: 3,
    nameVi: "Cấu trúc chuỗi & phân quyền",
    nameEn: "Chain Structure & Access Control",
    defaultLayer: "L2",
    defaultStage: "G1",
    descriptionVi: "Sơ đồ chi nhánh, vai trò, quyền hạn (SSOT duy nhất)",
  },
  catalog: {
    key: "catalog",
    order: 4,
    nameVi: "Danh mục sản phẩm / dịch vụ",
    nameEn: "Product & Service Catalog",
    defaultLayer: "L1",
    defaultStage: "G1",
    descriptionVi: "Mã, tên, ảnh, biến thể, giá niêm yết, kênh phân phối",
  },
  supply_inventory: {
    key: "supply_inventory",
    order: 5,
    nameVi: "Vật tư, nhà cung cấp, tồn kho",
    nameEn: "Supplies, Vendors & Inventory",
    defaultLayer: "L1",
    defaultStage: "G2",
    descriptionVi: "Vật tư, đơn vị tính, nhà cung cấp, giá nhập, tồn kho",
  },
  resource_schedule: {
    key: "resource_schedule",
    order: 6,
    nameVi: "Tài nguyên & lịch khả dụng",
    nameEn: "Resources & Scheduling",
    defaultLayer: "L2",
    defaultStage: "G2",
    descriptionVi: "Phòng, bàn, thợ, quy tắc đặt, chặn lịch (Lịch trống là L6 dẫn xuất)",
  },
  pricing_cost: {
    key: "pricing_cost",
    order: 7,
    nameVi: "Giá, chi phí, lợi nhuận",
    nameEn: "Pricing, Cost & Margin",
    defaultLayer: "L2",
    defaultStage: "G1",
    descriptionVi: "Công thức giá, BOM định mức, chi phí nhân công, biên lợi nhuận",
  },
  finance_tax_payment: {
    key: "finance_tax_payment",
    order: 8,
    nameVi: "Thuế, thanh toán, hóa đơn",
    nameEn: "Tax, Payment & Invoicing",
    defaultLayer: "L1",
    defaultStage: "G1",
    descriptionVi: "Thuế suất, tài khoản nhận tiền, đối soát, cổng tích hợp HĐĐT",
  },
  sales_policy: {
    key: "sales_policy",
    order: 9,
    nameVi: "Chính sách bán hàng & dịch vụ",
    nameEn: "Sales & Service Policies",
    defaultLayer: "L2",
    defaultStage: "G1",
    descriptionVi: "Đặt hàng, thanh toán, đổi trả, hủy hoàn tiền, cam kết chất lượng",
  },
  process_sla: {
    key: "process_sla",
    order: 10,
    nameVi: "Quy trình & tiêu chuẩn dịch vụ",
    nameEn: "Workflows & SLAs",
    defaultLayer: "L2",
    defaultStage: "G2",
    descriptionVi: "Workflow trạng thái đơn, điều kiện chuyển bước, SLA, checklist",
  },
  people_capacity: {
    key: "people_capacity",
    order: 11,
    nameVi: "Nhân sự & năng lực",
    nameEn: "Personnel & Capacity",
    defaultLayer: "L1",
    defaultStage: "G2",
    descriptionVi: "Nhân viên, gán vai trò, kỹ năng, ca trực, năng suất xử lý",
  },
  customer_crm: {
    key: "customer_crm",
    order: 12,
    nameVi: "Khách hàng & CRM",
    nameEn: "Customer & CRM",
    defaultLayer: "L1",
    defaultStage: "G2",
    descriptionVi: "Hồ sơ, địa chỉ, sở thích, đồng ý marketing & quy tắc lưu PII (L1+L2)",
  },
  channels_integration: {
    key: "channels_integration",
    order: 13,
    nameVi: "Kênh bán hàng & tích hợp",
    nameEn: "Sales Channels & Integrations",
    defaultLayer: "L2",
    defaultStage: "G1",
    descriptionVi: "Kênh bán, cổng thanh toán, đơn vị vận chuyển, cấu hình webhook",
  },
  marketing_promo: {
    key: "marketing_promo",
    order: 14,
    nameVi: "Marketing & khuyến mãi",
    nameEn: "Marketing & Promotions",
    defaultLayer: "L2",
    defaultStage: "G2",
    descriptionVi: "Chương trình ưu đãi, mã voucher, chiết khấu, ngân sách",
  },
  knowledge_base: {
    key: "knowledge_base",
    order: 15,
    nameVi: "Knowledge Base",
    nameEn: "Knowledge Base",
    defaultLayer: "L4",
    defaultStage: "G3",
    descriptionVi: "SOP, cẩm nang tư vấn, bảo quản, ý nghĩa sản phẩm, kịch bản",
  },
  ai_automation: {
    key: "ai_automation",
    order: 16,
    nameVi: "AI, tự động hóa & ngưỡng cảnh báo",
    nameEn: "AI, Automation & Thresholds",
    defaultLayer: "L2",
    defaultStage: "G3",
    descriptionVi: "Vai trò AI, giới hạn quyền, trigger tự động hóa, quy tắc chuyển người thật",
  },
}

export function isValidInputDomainKey(key: string): key is InputDomainKey {
  return (INPUT_DOMAIN_KEYS as readonly string[]).includes(key)
}
