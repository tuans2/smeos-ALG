/**
 * Ai sửa được nội dung bộ sưu tập Thẻ chào (thêm/xoá mẫu, đổi tên, đổi giao diện) — PO 16/10/2026:
 * người tạo bộ sưu tập, hoặc người có L4 (ngừng kinh doanh — trần cứng Điều hành).
 * Sale và Điều phối tạo được bộ sưu tập riêng và sửa toàn quyền bộ sưu tập của mình, nhưng không
 * đụng vào bộ sưu tập người khác tạo (Điều phối có L3 nhưng vẫn theo luật như Sale — PO 16/10/2026).
 * Cài đặt hiển thị dùng chung cả tiệm → chỉ L4.
 * Pure TypeScript — dùng chung cho máy chủ và giao diện (giao diện chỉ ẩn nút, máy chủ vẫn kiểm).
 */
export const CATALOG_EDIT_ANY_CAPABILITIES = ["L4"] as const

export function canEditAnyCatalog(has: (code: string) => boolean): boolean {
  return CATALOG_EDIT_ANY_CAPABILITIES.some((code) => has(code))
}

export function canEditCatalog(
  catalog: { createdBy: string | null | undefined },
  viewer: { userId: string | null | undefined; has: (code: string) => boolean },
): boolean {
  return canEditAnyCatalog(viewer.has) || (Boolean(viewer.userId) && catalog.createdBy === viewer.userId)
}
