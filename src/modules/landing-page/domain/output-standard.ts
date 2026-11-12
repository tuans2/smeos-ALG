/**
 * Tiêu chuẩn đầu ra chuẩn hóa 08 cho Công cụ 08 — Tạo landing page cửa hàng hoặc chuỗi.
 * SSOT cho 8 tiêu chí kiểm tra chất lượng Landing Page theo chuẩn ALG v3.
 */

export type CriterionType = "MANDATORY" | "SCORED"

export interface LandingOutputCriterion {
  readonly code: string
  readonly name: string
  readonly description: string
  readonly type: CriterionType
  readonly threshold: number
}

export const OUTPUT_STANDARDS_08: readonly LandingOutputCriterion[] = [
  {
    code: "store_identity_fidelity",
    name: "Thông tin thương hiệu chính xác",
    description: "Tên thương hiệu, hotline, địa chỉ, logo và thông điệp nhận diện khớp chuẩn xác với hồ sơ cửa hàng/chuỗi",
    type: "MANDATORY",
    threshold: 1.0,
  },
  {
    code: "mobile_first_responsive",
    name: "Tối ưu hiển thị di động (Mobile-First)",
    description: "Bố cục hiển thị mượt mà trên smartphone, không vỡ layout, thao tác vuốt cuộn tự nhiên và tốc độ tải trang nhanh",
    type: "MANDATORY",
    threshold: 0.95,
  },
  {
    code: "clear_call_to_action",
    name: "Nút hành động (CTA) rõ ràng",
    description: "Có ít nhất 1 nút hành động nổi bật (Gọi hotline, Nhắn tin Zalo/Messenger, Đặt hàng trực tiếp hoặc Yêu cầu báo giá)",
    type: "MANDATORY",
    threshold: 1.0,
  },
  {
    code: "product_showcase_quality",
    name: "Trưng bày sản phẩm/dịch vụ nổi bật",
    description: "Hình ảnh sản phẩm sắc nét, giá bán rõ ràng và thông tin mô tả đầy đủ thu hút khách hàng",
    type: "SCORED",
    threshold: 0.85,
  },
  {
    code: "compelling_storytelling",
    name: "Văn phong tiếp thị & câu chuyện thương hiệu",
    description: "Nội dung giới thiệu truyền cảm hứng, ngắn gọn, phù hợp với văn hóa từng ngành nghề (sản phẩm, thời trang, F&B...)",
    type: "SCORED",
    threshold: 0.8,
  },
  {
    code: "trust_and_credibility",
    name: "Yếu tố tạo dựng niềm tin",
    description: "Có cam kết chất lượng, quy trình phục vụ minh bạch hoặc đánh giá thực tế từ khách hàng",
    type: "SCORED",
    threshold: 0.8,
  },
  {
    code: "contact_and_location_clarity",
    name: "Chỉ đường & kênh kết nối",
    description: "Địa chỉ cụ thể, tích hợp bản đồ chỉ đường và các kênh mạng xã hội chính thức",
    type: "SCORED",
    threshold: 0.85,
  },
  {
    code: "seo_and_social_sharing",
    name: "Tối ưu chia sẻ mạng xã hội (OpenGraph)",
    description: "Có tiêu đề, mô tả ngắn gọn và ảnh đại diện xem trước bắt mắt khi chia sẻ link qua Zalo, Facebook",
    type: "SCORED",
    threshold: 0.8,
  },
] as const
