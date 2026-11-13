/**
 * Những năng lực KHÔNG BAO GIỜ vượt ranh giới core — luật thuần, không chạm
 * Prisma.
 *
 * Đặt ra vì nhánh danh tính SSO của `/api/v1/integration/*` mang năng lực
 * THẬT của người dùng, khác nhánh token máy gọi máy (`capabilities` rỗng).
 * Điều đó đúng cho việc kiểm quyền, nhưng nó vô tình mở một khối dữ liệu mà
 * đặc tả 08 mục 4 cố ý không liệt kê trong bề mặt phơi ra: khối `pricing` của
 * `GET /products` (gác bằng `L5`).
 *
 * Luật của đặc tả 08 mục 4 là luật về ENGINE, không phải luật về NGƯỜI: thứ
 * gì không được rời core thì không rời core, bất kể ai đang thao tác. Người
 * sáng lập xem được giá vốn trong giao diện của chính core — chuyện đó không
 * đổi — nhưng `LocalBudd` sinh landing page và catalogue CÔNG KHAI và có
 * bảng `products` cache lại dữ liệu sản phẩm, nên một khối giá đi qua được
 * biên là một khối giá có đường tới trang public.
 *
 * Quyết định của anh Tony (AskUserQuestion 2026-09-10), sau khi lượt xác minh
 * đầu-cuối cho thấy `pricing` hiện ra trong đáp ứng thật.
 *
 * Đây KHÔNG phải cơ chế phân quyền thứ hai: nó chỉ trừ đi, không bao giờ
 * thêm. Người không có `L5` vẫn không có `L5`.
 */
export const CAPABILITIES_NEVER_CROSSING_BOUNDARY: readonly string[] = ["L5"]

/**
 * Bản sao của tập năng lực, đã trừ những mã không được vượt biên. Trả về một
 * `Set` mới — không sửa tại chỗ, để bên gọi không vô tình cắt luôn năng lực
 * của phiên người dùng đang dùng ở nơi khác.
 */
export function withoutBoundaryCapabilities(
  capabilities: ReadonlySet<string>
): ReadonlySet<string> {
  const ket_qua = new Set(capabilities)
  for (const ma of CAPABILITIES_NEVER_CROSSING_BOUNDARY) ket_qua.delete(ma)
  return ket_qua
}
