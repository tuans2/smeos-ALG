import { urlHostIs } from "@/lib/url-host"
/**
 * Ảnh xem trước của link Google Drive qua proxy nội bộ (máy chủ tải ảnh, trình duyệt không cần đăng nhập
 * Google). Sản phẩm nhập từ Excel thường chỉ có link Drive, chưa có ảnh trong kho. Thuần domain.
 */

/**
 * URL proxy thumbnail cho link Drive — thư mục (`/folders/<id>`, lấy ảnh đầu tiên) hoặc
 * tệp (`/file/d/<id>`, `open?id=`, `uc?id=`). Link khác (trang web bán hàng…) → null.
 */
export function driveThumbProxySrc(driveLink: string | null | undefined): string | null {
  if (!driveLink) return null
  const folderId = driveLink.match(/\/folders\/([a-zA-Z0-9_-]{20,})/)?.[1]
  if (folderId) return `/api/v1/public/drive-thumb-proxy?folder_id=${folderId}`
  if (!urlHostIs(driveLink, "drive.google.com")) return null
  const fileId = driveLink.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/)?.[1] ?? driveLink.match(/[?&]id=([a-zA-Z0-9_-]{20,})/)?.[1]
  return fileId ? `/api/v1/public/drive-thumb-proxy?file_id=${fileId}` : null
}
