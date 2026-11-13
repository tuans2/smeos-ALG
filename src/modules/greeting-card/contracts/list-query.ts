import { validationFailed } from "@/core/http/errors"

/** `?limit=&cursor=` chuẩn cho danh sách Thẻ chào (limit 1–100, mặc định 20). */
export function parseListQuery(url: URL): { limit: number; cursor: string | undefined } {
  const raw = url.searchParams.get("limit")
  const limit = raw === null ? 20 : Number(raw)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw validationFailed({ limit: "Phải là số nguyên từ 1 đến 100" })
  }
  const cursor = url.searchParams.get("cursor")?.trim() || undefined
  if (cursor && cursor.length > 64) throw validationFailed({ cursor: "Con trỏ không hợp lệ" })
  return { limit, cursor }
}

/** Lấy dư 1 bản ghi để biết còn trang sau; trả trang + con trỏ kế tiếp. */
export function toPage<T extends { id: string }>(rows: T[], limit: number): { data: T[]; next_cursor: string | null } {
  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows
  return { data, next_cursor: hasMore ? data[data.length - 1]?.id ?? null : null }
}
