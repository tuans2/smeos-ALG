/**
 * Luật xoá payload trên kho khi xoá vĩnh viễn một asset (SDAGF-012, audit
 * `docs/audit/sdagf-2026-10/05-risk-register.md` R-03).
 *
 * Chỉ xoá khoá nằm dưới `org/<tổ chức của phiên>/` — khoá do máy chủ dựng
 * (`storage-key.ts`). Khoá khác (`videos/…`, khoá cũ, khoá hỏng) giữ nguyên
 * cho job đối soát xử lý sau, không đoán.
 *
 * Thuần: không import hạ tầng.
 */
export function payloadKeysToPurge(
  organizationId: string,
  asset: { storage_key: string; thumb_key: string | null }
): string[] {
  const prefix = `org/${organizationId}/`
  const keys = [asset.storage_key, asset.thumb_key].filter(
    (key): key is string => typeof key === "string" && key.startsWith(prefix) && !key.includes("..")
  )
  return [...new Set(keys)]
}

/**
 * Khoá tệp của một video được xoá khi xoá vĩnh viễn video (L-4): video dựng
 * xong (`videos/<tổ chức>/…`) và bản phối âm (`org/<tổ chức>/…`). Khoá của tổ
 * chức khác hoặc có `..` bị bỏ.
 */
export function videoPayloadKeysToPurge(organizationId: string, keys: readonly (string | null | undefined)[]): string[] {
  const allowed = [`org/${organizationId}/`, `videos/${organizationId}/`]
  const out = keys.filter(
    (key): key is string => typeof key === "string" && allowed.some((p) => key.startsWith(p)) && !key.includes("..")
  )
  return [...new Set(out)]
}
