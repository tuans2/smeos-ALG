/**
 * Câu báo khi màn chi tiết không tải được dữ liệu. Mã 404 (không có, hoặc của tổ chức/chi nhánh khác — máy chủ
 * không phân biệt) hiện "Không tìm thấy", không lộ mã lỗi kỹ thuật (GD1 Bước 6, S-01).
 */
export function productLoadError(status: number): string {
  return status === 404 ? "Không tìm thấy sản phẩm này." : "Không tải được thông tin sản phẩm. Vui lòng thử lại."
}

export function orderPrintLoadError(status: number): string {
  if (status === 401) return "Vui lòng đăng nhập để in phiếu"
  if (status === 404) return "Không tìm thấy đơn hàng này."
  if (status === 403) return "Bạn chưa có quyền in phiếu của đơn hàng."
  return "Không tải được phiếu in. Vui lòng thử lại."
}
