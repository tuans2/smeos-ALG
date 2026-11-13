/**
 * Nút "Đặt hàng" và "Liên hệ / Cần tư vấn" trên trang khách — component Điều hành bật/tắt cho toàn bộ
 * hoặc từng nguồn (`docs/kien-truc/KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md` §3.2, PO 31/10/2026).
 * Pure TypeScript — không I/O.
 *
 * Lưu ở `organizations.settings.order_entry_actions`:
 *   { default?: { order?, contact? }, bySource?: { [nguồn]: { order?, contact? } } }
 * Thứ tự giải: bySource[nguồn] → default → mặc định hệ thống.
 *
 * Thẻ chào (B1): mặc định hệ thống `contact = false` → trang khách Thẻ chào y như hiện nay cho tới khi
 * Điều hành tự bật.
 */
import { isOrderSourceCode, ORDER_SOURCE_CODES, type OrderSourceCode } from "./order-source"

export const ORDER_ENTRY_ACTIONS_SETTINGS_KEY = "order_entry_actions"

export interface EntryActions {
  readonly order: boolean
  readonly contact: boolean
}

export interface EntryActionsSettings {
  readonly default?: Partial<EntryActions>
  readonly bySource?: Partial<Record<OrderSourceCode, Partial<EntryActions>>>
}

const SYSTEM_DEFAULT: EntryActions = { order: true, contact: true }
const SYSTEM_DEFAULT_BY_SOURCE: Partial<Record<OrderSourceCode, Partial<EntryActions>>> = {
  BROCHURE: { contact: false },
}

function pickFlags(raw: unknown): Partial<EntryActions> {
  if (!raw || typeof raw !== "object") return {}
  const r = raw as Record<string, unknown>
  const out: { order?: boolean; contact?: boolean } = {}
  if (typeof r.order === "boolean") out.order = r.order
  if (typeof r.contact === "boolean") out.contact = r.contact
  return out
}

/** Đọc cài đặt thô từ `organizations.settings` (JSON bất kỳ) — bỏ khoá/giá trị lạ. */
export function parseEntryActionsSettings(orgSettings: unknown): EntryActionsSettings {
  const raw = orgSettings && typeof orgSettings === "object"
    ? (orgSettings as Record<string, unknown>)[ORDER_ENTRY_ACTIONS_SETTINGS_KEY]
    : undefined
  if (!raw || typeof raw !== "object") return {}
  const r = raw as Record<string, unknown>
  const bySource: Partial<Record<OrderSourceCode, Partial<EntryActions>>> = {}
  if (r.bySource && typeof r.bySource === "object") {
    for (const [key, value] of Object.entries(r.bySource as Record<string, unknown>)) {
      if (isOrderSourceCode(key)) bySource[key] = pickFlags(value)
    }
  }
  return { default: pickFlags(r.default), bySource }
}

/**
 * Nút nào hiện cho nguồn này. Nếu cấu hình cũ (lưu trước khi có kiểm) làm tắt cả hai,
 * bật lại "Đặt hàng" để khách không bị kẹt trang không có lối đi.
 */
export function resolveEntryActions(settings: EntryActionsSettings, source: OrderSourceCode): EntryActions {
  const merged: EntryActions = {
    ...SYSTEM_DEFAULT,
    ...SYSTEM_DEFAULT_BY_SOURCE[source],
    ...settings.default,
    ...settings.bySource?.[source],
  }
  return merged.order || merged.contact ? merged : { order: true, contact: false }
}

export type EntryActionsValidationError = { source: OrderSourceCode | "default"; message: string }

/** Kiểm trước khi lưu: mọi nguồn (sau khi giải) phải còn ít nhất một nút. */
export function validateEntryActionsSettings(settings: EntryActionsSettings): EntryActionsValidationError[] {
  const errors: EntryActionsValidationError[] = []
  const d = settings.default
  if (d && d.order === false && d.contact === false) {
    errors.push({ source: "default", message: "Cần bật ít nhất một nút: Đặt hàng hoặc Liên hệ" })
  }
  for (const source of ORDER_SOURCE_CODES) {
    const merged = { ...SYSTEM_DEFAULT, ...SYSTEM_DEFAULT_BY_SOURCE[source], ...d, ...settings.bySource?.[source] }
    if (!merged.order && !merged.contact && settings.bySource?.[source]) {
      errors.push({ source, message: "Cần bật ít nhất một nút: Đặt hàng hoặc Liên hệ" })
    }
  }
  return errors
}
