/**
 * Tiêu chuẩn đầu ra chuẩn hóa 02.1 cho Công cụ 02 — Tạo bộ ảnh sản phẩm từ một ảnh gốc.
 * SSOT bổ sung tiêu chí Set Consistency (Tính nhất quán cả bộ).
 */

import { OUTPUT_STANDARDS_01, type OutputCriterion } from "@/modules/product-photo-studio/domain/output-standard"

export interface SetConsistencyCriterion extends OutputCriterion {
  readonly isSetLevel?: boolean
}

export const OUTPUT_STANDARDS_02: readonly SetConsistencyCriterion[] = [
  ...OUTPUT_STANDARDS_01,
  {
    code: "set_consistency",
    name: "Nhất quán giữa các ảnh trong bộ",
    description: "Tất cả các ảnh trong bộ phải bảo đảm là cùng một thực thể sản phẩm (chủng loại chi tiết, số lượng, màu sắc, phụ kiện)",
    type: "MANDATORY",
    threshold: 0.95,
    isSetLevel: true,
  },
] as const
