import "@/lib/brand-storage-migration"
/**
 * Khoá localStorage lưu job đang/vừa chạy của `/tai-anh` — rời trang (đóng tab, F5, bấm nhầm
 * link) không mất dấu lượt chạy. Gắn organization_id: đổi tổ chức trong cùng trình duyệt không
 * đọc nhầm job của tổ chức khác. Chưa biết tổ chức → `null` (không đọc/ghi).
 */
export function jobStorageKeyFor(orgId: string | null | undefined): string | null {
  return orgId ? `alg.tai-anh.lastJobId__${orgId}` : null
}
export function legacyJobStorageKeyFor(orgId: string | null | undefined): string | null {
  return orgId ? `floraos.tai-anh.lastJobId__${orgId}` : null
}
