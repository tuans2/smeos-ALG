/**
 * Cổng Vision — quyết định D5-c (kiến trúc V2 mục 17.1).
 *
 * Cổng đặt ở mức HỢP ĐỒNG JSON, không ở mức detect/segment/recognize.
 * Không module nào được gọi thẳng API nhà cung cấp; mọi provider nằm sau cổng này.
 */

/**
 * Hợp đồng JSON của M01.
 *
 * Hình dạng thật lấy nguyên từ `Schema.json` (thu hoạch R1, HARVEST_MANIFEST mục 3.1)
 * khi làm P5. Không khai lại bằng tay ở đây.
 * Luật sửa đổi: chỉ được THÊM field, không xoá và không đổi field đã có.
 */
export type ProductAnalysis = Record<string, unknown>;

export interface VisionAnalysisContext {
  /** Giải từ phiên đăng nhập phía máy chủ. Không bao giờ nhận từ client. */
  organizationId: string;
  productId?: string;
}

export interface VisionAnalyzer {
  readonly name: string;

  /**
   * Ghi vào metadata asset. Product Identity Guard (M04a) bắt buộc dùng
   * cùng một provider và cùng một model version cho cả hai lần phân tích
   * của một job — khác model thì điểm so sánh mất ý nghĩa.
   */
  readonly modelVersion: string;

  analyze(image: Uint8Array, context: VisionAnalysisContext): Promise<ProductAnalysis>;
}
