/**
 * Tiêu chuẩn đầu ra chuẩn hóa 01.1 cho Công cụ 01 — Tạo ảnh sản phẩm chuyên nghiệp.
 * SSOT cho 8 tiêu chí kiểm tra chất lượng ảnh studio.
 */

export type CriterionType = "MANDATORY" | "SCORED"

export interface OutputCriterion {
  readonly code: string
  readonly name: string
  readonly description: string
  readonly type: CriterionType
  readonly threshold: number
}

export const OUTPUT_STANDARDS_01: readonly OutputCriterion[] = [
  {
    code: "product_fidelity",
    name: "Giữ nguyên sản phẩm",
    description: "Sản phẩm gốc không bị biến dạng, méo mó, thêm bớt chi tiết hay sai màu sắc",
    type: "MANDATORY",
    threshold: 0.95,
  },
  {
    code: "forbidden_content",
    name: "Không chứa nội dung cấm",
    description: "Không chứa logo lạ, watermark rác, số điện thoại, text quảng cáo ngoài ý muốn",
    type: "MANDATORY",
    threshold: 1.0,
  },
  {
    code: "truthfulness",
    name: "Tính chân thực",
    description: "Không tạo cảm giác giả tạo quá mức, bảo tồn chất liệu thực tế của sản phẩm",
    type: "MANDATORY",
    threshold: 0.9,
  },
  {
    code: "background",
    name: "Phông nền studio",
    description: "Phông nền sạch sẽ, liền mạch, đồng nhất theo phong cách studio đã chọn",
    type: "SCORED",
    threshold: 0.8,
  },
  {
    code: "lighting",
    name: "Ánh sáng studio",
    description: "Ánh sáng mềm mại, đổ bóng tự nhiên ở chân sản phẩm, không gắt, không lóa",
    type: "SCORED",
    threshold: 0.8,
  },
  {
    code: "color",
    name: "Màu sắc & độ bão hòa",
    description: "Màu sắc sống động, tự nhiên, cân bằng trắng chuẩn xác",
    type: "SCORED",
    threshold: 0.8,
  },
  {
    code: "composition",
    name: "Bố cục & căn giữa",
    description: "Sản phẩm nằm trọn vẹn trong khung hình, tỷ lệ chiếm khung hài hòa (60-80%)",
    type: "SCORED",
    threshold: 0.8,
  },
  {
    code: "technical",
    name: "Chất lượng kỹ thuật",
    description: "Độ sắc nét cao, không bị vỡ hạt, không bị mờ nhòe do nén hoặc upscale",
    type: "SCORED",
    threshold: 0.8,
  },
] as const
