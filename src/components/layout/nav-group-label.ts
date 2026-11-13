/**
 * nav-group-label.ts — Chuẩn hoá nhãn nhóm khi hiển thị trên sidebar.
 *
 * Dữ liệu nav giữ nhãn gốc (vd "01 · CÔNG CỤ", "Việc hôm nay · Quản trị cửa hàng").
 * Sidebar chỉ hiển thị phần ý nghĩa: bỏ số thứ tự đầu dòng và phần đuôi sau dấu "·"
 * (tên vai trò đã có ở thẻ người dùng cuối sidebar).
 */

const ORDINAL_PREFIX = /^\s*\d+\s*·\s*/
const SEGMENT_SEPARATOR = /\s+·\s+/

export function formatNavGroupLabel(label: string): string {
  const withoutOrdinal = label.replace(ORDINAL_PREFIX, "")
  const [head] = withoutOrdinal.split(SEGMENT_SEPARATOR)
  return (head ?? withoutOrdinal).trim() || label.trim()
}
