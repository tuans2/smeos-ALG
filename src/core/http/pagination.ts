import { z } from "zod"

import { validationFailed } from "./errors"

/**
 * Phân trang chuẩn cho route mới (chuẩn API Contract v1.1 §6, PO chốt 07/11/2026): `?limit=` 1–100,
 * mặc định 25 (đặc tả 06 §2); `?cursor=` là con trỏ MỜ — client chỉ gửi lại, không tự dựng.
 * Kết quả `{ data, next_cursor }`.
 */
export const DEFAULT_PAGE_LIMIT = 25
export const MAX_PAGE_LIMIT = 100
const LIMIT_MESSAGE = `Phải là số nguyên từ 1 đến ${MAX_PAGE_LIMIT}`

/** Ghép vào `query` của `defineRoute`: `query: z.object({ ...pageQuery, status: … })`. */
export const pageQuery = {
  limit: z.coerce
    .number({ error: LIMIT_MESSAGE })
    .int(LIMIT_MESSAGE)
    .min(1, LIMIT_MESSAGE)
    .max(MAX_PAGE_LIMIT, LIMIT_MESSAGE)
    .default(DEFAULT_PAGE_LIMIT),
  cursor: z.string().trim().min(1).max(512, "Con trỏ không hợp lệ").optional(),
}

export type Page<T> = { data: T[]; next_cursor: string | null }

type CursorValue = Record<string, string | number>

/** Con trỏ mờ: base64url của JSON khoá sắp xếp (vd. `{ created_at, id }`). */
export function encodeCursor(value: CursorValue): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url")
}

/** Giải con trỏ client gửi lại; hỏng/giả → 400 `cursor` (không để lọt thành lỗi máy chủ). */
export function decodeCursor(raw: string): CursorValue {
  try {
    const value: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"))
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const entries = Object.entries(value)
      if (entries.length > 0 && entries.every(([, v]) => typeof v === "string" || typeof v === "number")) {
        return value as CursorValue
      }
    }
  } catch {
    // rơi xuống lỗi chung bên dưới
  }
  throw validationFailed({ cursor: "Con trỏ không hợp lệ" })
}

/**
 * Repository lấy `limit + 1` dòng; hàm này cắt về `limit` và dựng con trỏ từ dòng cuối của trang
 * (mặc định theo `id`) khi còn trang sau.
 */
export function toPage<T>(rows: T[], limit: number, cursorOf: (row: T) => CursorValue = defaultCursorOf): Page<T> {
  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows
  const last = data[data.length - 1]
  return { data, next_cursor: hasMore && last !== undefined ? encodeCursor(cursorOf(last)) : null }
}

function defaultCursorOf<T>(row: T): CursorValue {
  const id = (row as { id?: unknown }).id
  if (typeof id !== "string" && typeof id !== "number") {
    throw new Error("toPage: dòng không có `id` — truyền `cursorOf`")
  }
  return { id }
}

/**
 * Đọc một tham số số nguyên của query cho route CŨ (chưa dùng `defineRoute` + `pageQuery`): bỏ trống →
 * `fallback`; không phải số nguyên hoặc ngoài [`min`, `max`] → 400 `details.<field>`. Trước đây các route
 * này đưa thẳng `Number(...)`/`parseInt(...)` xuống Prisma, chữ thành `NaN` → 500 (audit API §15, §29).
 */
export function parseIntParam(
  raw: string | null,
  opts: { field: string; fallback: number; min: number; max: number }
): number {
  if (raw === null || raw.trim() === "") return opts.fallback
  const value = /^-?\d+$/.test(raw.trim()) ? Number(raw.trim()) : Number.NaN
  if (!Number.isSafeInteger(value) || value < opts.min || value > opts.max) {
    throw validationFailed({ [opts.field]: `Phải là số nguyên từ ${opts.min} đến ${opts.max}` })
  }
  return value
}
