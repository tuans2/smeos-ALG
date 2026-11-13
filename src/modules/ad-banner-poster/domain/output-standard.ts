/**
 * output-standard.ts — Tiêu chuẩn đầu ra chuẩn SSOT cho Công cụ 05: Tạo poster và banner quảng cáo.
 * Sử dụng để thẩm định chất lượng hình ảnh từ Provider Single-Call và Template Engine.
 */

export interface BannerOutputStandardCriterion {
  readonly code: string
  readonly name: string
  readonly type: "MANDATORY" | "SCORED"
  readonly description: string
  readonly passCondition: string
}

export const OUTPUT_STANDARDS_05: readonly BannerOutputStandardCriterion[] = [
  {
    code: "product_fidelity",
    name: "Giữ nguyên sản phẩm thật",
    type: "MANDATORY",
    description: "Sản phẩm trung tâm giữ nguyên chi tiết, không bị biến dạng hoặc cắt xén mất trọng tâm",
    passCondition: "Sản phẩm nằm trọn vẹn trong vùng hiển thị an toàn, tỉ lệ cân xứng",
  },
  {
    code: "text_clarity",
    name: "Chữ tiếng Việt rõ nét & không lỗi font",
    type: "MANDATORY",
    description: "Tiêu đề, ưu đãi và nội dung có dấu tiếng Việt chuẩn xác, độ tương phản cao dễ đọc",
    passCondition: "Tỉ lệ tương phản chữ trên nền đạt chuẩn WCAG AA",
  },
  {
    code: "brand_identity",
    name: "Thông tin nhận diện cửa hàng",
    type: "MANDATORY",
    description: "Có ít nhất Tên cửa hàng và kênh liên hệ (Hotline/Địa chỉ) để khách tương tác",
    passCondition: "Có tên tiệm và hotline hoặc địa chỉ",
  },
  {
    code: "cta_presence",
    name: "Lời kêu gọi hành động (CTA)",
    type: "MANDATORY",
    description: "Có nút hoặc dòng CTA rõ ràng hướng dẫn khách hàng hành động tiếp theo",
    passCondition: "Nội dung CTA không được để trống",
  },
  {
    code: "layout_balance",
    name: "Bố cục cân đối tỉ lệ vàng",
    type: "SCORED",
    description: "Không gian giữa ảnh sản phẩm và khối văn bản hài hòa, không bị tràn viền",
    passCondition: "Điểm bố cục >= 0.8",
  },
  {
    code: "promo_prominence",
    name: "Điểm nhấn ưu đãi bắt mắt",
    type: "SCORED",
    description: "Badge giảm giá hoặc ưu đãi dễ thấy ngay trong 3 giây đầu tiên",
    passCondition: "Điểm bắt mắt >= 0.75",
  },
] as const
