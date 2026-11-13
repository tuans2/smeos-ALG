import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"

// Trang ký lại mỗi lần tải (10 giây/lần) — link ảnh không cần sống 7 ngày như trước (rà soát M7)
export const SIGNED_URL_TTL_SECONDS = 3600

/**
 * Khoá kho của ảnh nếu nó nằm trong thư mục của CHÍNH tổ chức (`org/<organizationId>/…`), kể cả
 * URL cũ còn chứa khoá. Khoá của tổ chức khác → `null`: dữ liệu đơn là do tiệm nhập, không được
 * dùng để ký URL tới ảnh của tenant khác (rà soát cụm G, 22/10/2026).
 */
export function ownStorageKey(photo: string | null | undefined, organizationId: string): string | null {
  if (!photo) return null
  const key = photo.startsWith("org/") ? photo : photo.match(/(?:floraos-core|smeos-core)\/(org\/[^?]+)/)?.[1]
  if (!key || key.includes("..")) return null
  return key.startsWith(`org/${organizationId}/`) ? key : null
}

/**
 * Ảnh QC / giao hàng lưu dạng khoá kho — đổi thành URL ký để trang Thẻ Gia Công hiển thị.
 * Khoá ngoài thư mục tổ chức hoặc ký lỗi → bỏ ảnh (chuỗi rỗng), không trả lại giá trị gốc.
 */
export async function signSubcontractPhoto(photo: string, organizationId: string): Promise<string> {
  const key = ownStorageKey(photo, organizationId)
  if (!key) return photo.startsWith("https://") ? photo : ""
  try {
    return await getStorageProvider().signedUrl(key, SIGNED_URL_TTL_SECONDS, "GET")
  } catch {
    return ""
  }
}
