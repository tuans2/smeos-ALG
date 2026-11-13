/**
 * Danh mục KPI của Marketing & Sales Center (SSOT: `03_KE_HOACH_TRIEN_KHAI.md` mục PR-7, 7.1).
 * Thuần domain, không ORM.
 */

import type { BusinessModuleKey } from "./asset-type"

export type KpiTimeWindow = "7D" | "30D" | "90D" | "ALL"

export type KpiSource =
  | "asset_usages"
  | "short_links"
  | "leads"
  | "quotations"
  | "customer_interactions"
  | "print_renditions"
  | "brand_profiles"

export interface KpiDefinition {
  readonly key: string
  readonly module: BusinessModuleKey
  readonly label: string
  readonly description: string
  readonly unit: string
  readonly formula: string
  readonly source: KpiSource
}

export const KPI_REGISTRY: readonly KpiDefinition[] = [
  // 1. Thương hiệu (brand)
  {
    key: "brand_assets_count",
    module: "brand",
    label: "Tư liệu thương hiệu",
    description: "Số lượng tư liệu nhận diện chính thức đã lưu trữ",
    unit: "tư liệu",
    formula: "COUNT(asset_usages WHERE destination = 'LIBRARY' AND module = 'brand')",
    source: "asset_usages",
  },
  {
    key: "brand_profile_score",
    module: "brand",
    label: "Hồ sơ thương hiệu",
    description: "Độ hoàn thiện định vị, màu sắc và logo cửa hàng",
    unit: "%",
    formula: "PERCENTAGE(brand_profile_completed_fields)",
    source: "brand_profiles",
  },

  // 2. Nội dung (content)
  {
    key: "content_created_count",
    module: "content",
    label: "Tư liệu sản xuất",
    description: "Tổng số tư liệu ảnh, bài viết, video đã sản xuất",
    unit: "tư liệu",
    formula: "COUNT(library_items)",
    source: "asset_usages",
  },
  {
    key: "content_reuse_rate",
    module: "content",
    label: "Tỷ lệ tái sử dụng",
    description: "Tỷ lệ tư liệu được dùng trên từ 2 kênh trở lên",
    unit: "%",
    formula: "COUNT(DISTINCT source_id with >1 usages) / COUNT(DISTINCT source_id) * 100",
    source: "asset_usages",
  },

  // 3. Quảng bá (promotion)
  {
    key: "promo_total_clicks",
    module: "promotion",
    label: "Lượt truy cập",
    description: "Tổng số lượt quét mã QR và bấm liên kết quảng bá",
    unit: "lượt",
    formula: "SUM(short_links.scan_count)",
    source: "short_links",
  },
  {
    key: "promo_leads_count",
    module: "promotion",
    label: "Khách tiềm năng",
    description: "Số khách để lại thông tin được quy thuộc lần chạm đầu (first-touch)",
    unit: "khách",
    formula: "COUNT(DISTINCT first_touch_leads)",
    source: "leads",
  },
  {
    key: "promo_conversion_rate",
    module: "promotion",
    label: "Tỷ lệ chuyển đổi lead",
    description: "Tỷ lệ khách để lại thông tin trên tổng lượt truy cập",
    unit: "%",
    formula: "(leads / clicks) * 100",
    source: "leads",
  },

  // 4. Bán hàng (sales)
  {
    key: "sales_quotes_created",
    module: "sales",
    label: "Báo giá đã gửi",
    description: "Số lượng báo giá soạn và gửi tới khách hàng",
    unit: "báo giá",
    formula: "COUNT(quotations)",
    source: "quotations",
  },
  {
    key: "sales_quotes_accepted",
    module: "sales",
    label: "Báo giá được chốt",
    description: "Số báo giá khách đồng ý hoặc đã chuyển thành đơn hàng",
    unit: "đơn",
    formula: "COUNT(quotations WHERE status = 'ACCEPTED')",
    source: "quotations",
  },
  {
    key: "sales_quote_revenue",
    module: "sales",
    label: "Doanh số báo giá",
    description: "Tổng giá trị các báo giá đã được duyệt chốt",
    unit: "₫",
    formula: "SUM(quotations.total_amount WHERE status = 'ACCEPTED')",
    source: "quotations",
  },

  // 5. Chăm sóc (care)
  {
    key: "care_customers_touched",
    module: "care",
    label: "Khách được chăm sóc",
    description: "Số khách hàng đã nhận thiệp hoặc lời hỏi thăm",
    unit: "khách",
    formula: "COUNT(DISTINCT customer_interactions.customer_id)",
    source: "customer_interactions",
  },
  {
    key: "care_interactions_count",
    module: "care",
    label: "Lượt tương tác",
    description: "Tổng số lượt trao đổi qua Zalo, gọi điện và gửi thiệp",
    unit: "lượt",
    formula: "COUNT(customer_interactions)",
    source: "customer_interactions",
  },
  {
    key: "care_active_segments",
    module: "care",
    label: "Nhóm khách mục tiêu",
    description: "Số nhóm khách hàng chủ động đang được theo dõi",
    unit: "nhóm",
    formula: "COUNT(customer_segments)",
    source: "customer_interactions",
  },

  // 6. Ấn phẩm & In (print)
  {
    key: "print_renditions_count",
    module: "print",
    label: "Bản in đã xuất",
    description: "Số file PDF chuẩn in ấn 300 DPI đã xuất xưởng",
    unit: "bản",
    formula: "COUNT(print_renditions WHERE status = 'COMPLETED')",
    source: "print_renditions",
  },
]
