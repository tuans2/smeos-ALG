/**
 * Đường dẫn lưu trữ theo tổ chức, không theo người dùng (đặc tả 07 mục 5,
 * đặc tả 05 mục 5): `org/<organization_id>/<product_id>/<asset_id>.<ext>`.
 * Người dùng đổi vai, rời tổ chức hoặc bị xoá; quyền sở hữu dữ liệu thuộc về
 * tổ chức.
 *
 * `product_id` có thể null (asset ở workspace trải nghiệm, hoặc asset chưa
 * gắn sản phẩm nào) — đặc tả không nói đường dẫn trong trường hợp đó, dùng
 * `unfiled` làm đoạn cố định thay vì để trống (một đoạn rỗng làm đường dẫn
 * mơ hồ giữa hai cấp thư mục).
 *
 * Thuần: không import hạ tầng.
 */
export function buildStorageKey(input: {
  organizationId: string
  productId: string | null
  assetId: string
  extension: string
}): string {
  const ext = input.extension.replace(/^\./, "").toLowerCase()
  const product = input.productId ?? "unfiled"
  return `org/${input.organizationId}/${product}/${input.assetId}.${ext}`
}

const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  // Video ngắn của điều phối (ảnh thành phẩm / người nhận đơn Thẻ chào)
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  // Tệp dữ liệu / bảng tính đã qua kiểm định an toàn
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "text/csv": "csv",
}

export function extensionForMimeType(mimeType: string): string {
  const ext = EXTENSION_BY_MIME[mimeType.toLowerCase()]
  if (!ext) throw new Error(`Kiểu tệp không được hỗ trợ: ${mimeType}`)
  return ext
}

/**
 * `POST /assets` nhận `storage_key` trong thân yêu cầu, nhưng đường dẫn hợp
 * lệ chỉ có đúng một dạng — dạng mà `createUploadUrl` vừa ký. Hàm này dựng
 * lại đường dẫn đó từ ngữ cảnh tổ chức phía máy chủ và so khớp.
 *
 * Không so khớp thì `storage_key` là một biến do client điều khiển trỏ vào
 * đâu cũng được: `org/<tổ-chức-khác>/…` cho đọc ảnh xuyên tổ chức (vỡ luật 1
 * và luật 2 của PRD), `../../…` cho đọc tệp ngoài kho. Bản ghi vẫn mang
 * `organization_id` đúng nên mọi bộ lọc theo tenant phía sau đều cho qua —
 * đường dẫn là chỗ duy nhất chặn được.
 */
export function storageKeyMatchesContext(
  storageKey: string,
  input: {
    organizationId: string
    productId: string | null
    assetId: string
    mimeType: string
  }
): boolean {
  let expected: string
  try {
    expected = buildStorageKey({
      organizationId: input.organizationId,
      productId: input.productId,
      assetId: input.assetId,
      extension: extensionForMimeType(input.mimeType),
    })
  } catch {
    return false
  }
  return storageKey === expected
}
