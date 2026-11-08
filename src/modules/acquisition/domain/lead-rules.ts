/**
 * Luật khách tiềm năng (công cụ 21) — Pure TypeScript.
 *
 * Khách để lại tên + SĐT trên trang công khai, BẮT BUỘC đồng ý cho cửa hàng liên hệ
 * (Nghị định 13/2023/NĐ-CP): lưu thời điểm + phiên bản lời đồng ý kèm mỗi lead.
 */

import { VN_PHONE, normalizeInquiryPhone } from "@/modules/crm/domain/product-inquiry"

export const LEAD_NAME_MAX = 100
export const LEAD_MESSAGE_MAX = 500
/** Mỗi SĐT tối đa bấy nhiêu lead/giờ mỗi cửa hàng — chặn gửi dồn. */
export const LEAD_PHONE_LIMIT_PER_HOUR = 3
/** Đổi câu chữ đồng ý ở form → tăng phiên bản. */
export const LEAD_CONSENT_VERSION = "2026-10-30"
export const LEAD_CONSENT_TEXT = "Tôi đồng ý để cửa hàng dùng tên và số điện thoại này để liên hệ tư vấn."

/** 10 trạng thái pipeline — Marketing & Sales Center (PO 01/11/2026, PR-3). */
export const LEAD_STATUSES = [
  "NEW",
  "QUALIFIED",
  "CONTACTED",
  "CONSULTING",
  "RECOMMENDED",
  "QUOTATION_SENT",
  "FOLLOW_UP",
  "WON",
  "LOST",
  "UNQUALIFIED",
] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "Mới",
  QUALIFIED: "Tiềm năng",
  CONTACTED: "Đã liên hệ",
  CONSULTING: "Đang tư vấn",
  RECOMMENDED: "Đã gợi ý",
  QUOTATION_SENT: "Đã báo giá",
  FOLLOW_UP: "Theo dõi",
  WON: "Đã chốt",
  LOST: "Không thành",
  UNQUALIFIED: "Không phù hợp",
}

/** Tập trạng thái đang mở — áp dụng gắn đơn hàng và tính lead queue. */
export const OPEN_LEAD_STATUSES = [
  "NEW",
  "QUALIFIED",
  "CONTACTED",
  "CONSULTING",
  "RECOMMENDED",
  "QUOTATION_SENT",
  "FOLLOW_UP",
] as const

/** Tập trạng thái kết thúc. */
export const CLOSED_LEAD_STATUSES = ["WON", "LOST", "UNQUALIFIED"] as const

/** 4 nhóm hiển thị Progressive Disclosure cho UI (tránh bày 10 nút cùng lúc). */
export const LEAD_STATUS_GROUPS = [
  { id: "NEW_GROUP", label: "Mới", statuses: ["NEW", "QUALIFIED"] as const },
  { id: "CONSULTING_GROUP", label: "Đang tư vấn", statuses: ["CONTACTED", "CONSULTING", "RECOMMENDED"] as const },
  { id: "QUOTATION_GROUP", label: "Báo giá & Theo dõi", statuses: ["QUOTATION_SENT", "FOLLOW_UP"] as const },
  { id: "CLOSED_GROUP", label: "Kết thúc", statuses: ["WON", "LOST", "UNQUALIFIED"] as const },
] as const

export type LeadStatusGroupId = (typeof LEAD_STATUS_GROUPS)[number]["id"]

/** Ma trận chuyển trạng thái hợp lệ trong pipeline 10 bước. */
export const LEAD_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  NEW: ["QUALIFIED", "CONTACTED", "CONSULTING", "LOST", "UNQUALIFIED"],
  QUALIFIED: ["CONTACTED", "CONSULTING", "RECOMMENDED", "LOST", "UNQUALIFIED"],
  CONTACTED: ["CONSULTING", "RECOMMENDED", "QUOTATION_SENT", "FOLLOW_UP", "WON", "LOST", "UNQUALIFIED"],
  CONSULTING: ["RECOMMENDED", "QUOTATION_SENT", "FOLLOW_UP", "WON", "LOST", "UNQUALIFIED"],
  RECOMMENDED: ["CONSULTING", "QUOTATION_SENT", "FOLLOW_UP", "WON", "LOST", "UNQUALIFIED"],
  QUOTATION_SENT: ["CONSULTING", "FOLLOW_UP", "WON", "LOST", "UNQUALIFIED"],
  FOLLOW_UP: ["CONSULTING", "RECOMMENDED", "QUOTATION_SENT", "WON", "LOST", "UNQUALIFIED"],
  // Đơn huỷ / khách bỏ sau khi chốt → theo dõi lại hoặc không thành (UJ-13)
  WON: ["FOLLOW_UP", "LOST"],
  LOST: ["NEW", "CONTACTED"],
  UNQUALIFIED: ["NEW", "QUALIFIED"],
}

export function canTransitionLeadStatus(current: string, next: LeadStatus): boolean {
  if (current === next) return true
  // Hỗ trợ chuyển đổi từ trạng thái cũ IN_PROGRESS
  const effectiveCurrent: LeadStatus = current === "IN_PROGRESS" ? "CONTACTED" : (current as LeadStatus)
  if (!isLeadStatus(effectiveCurrent)) return false
  const allowed = LEAD_TRANSITIONS[effectiveCurrent]
  return allowed ? allowed.includes(next) : false
}

export type LeadSource = "CATALOG_LINK" | "SHORT_LINK" | "LANDING" | "CHAT" | "MANUAL"

export interface LeadInput {
  name: string
  phone: string
  message?: string | undefined
  consent: boolean
}

export interface Utm {
  source: string | null
  medium: string | null
  campaign: string | null
}

/** Lỗi theo trường (tiếng Việt); rỗng = hợp lệ. */
export function validateLeadInput(input: LeadInput): Record<string, string> {
  const errors: Record<string, string> = {}
  const name = input.name.trim()
  if (!name) errors.name = "Vui lòng nhập tên của bạn"
  else if (name.length > LEAD_NAME_MAX) errors.name = `Tên tối đa ${LEAD_NAME_MAX} ký tự`
  if (!VN_PHONE.test(normalizeInquiryPhone(input.phone))) errors.phone = "Số điện thoại di động chưa đúng"
  if ((input.message ?? "").trim().length > LEAD_MESSAGE_MAX) errors.message = `Lời nhắn tối đa ${LEAD_MESSAGE_MAX} ký tự`
  if (input.consent !== true) errors.consent = "Vui lòng đồng ý để cửa hàng liên hệ lại"
  return errors
}

/** Chuỗi UTM: chỉ chữ, số, gạch; tối đa 60 ký tự; rỗng → null. */
export function sanitizeUtmValue(value: string | null | undefined): string | null {
  if (!value) return null
  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60)
  return cleaned || null
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as readonly string[]).includes(value)
}
