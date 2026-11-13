/**
 * Mẫu đề xuất — quản trị danh mục (PO chốt 23/10/2026,
 * `docs/dac-ta/ALG_PRODUCT_CATALOG_GOVERNANCE_SPEC.md`).
 *
 * Mẫu do người KHÔNG có `H3` (duyệt vào danh mục, trần cứng `dieu_hanh`) tạo
 * được dùng ngay, nhưng mang nhãn đề xuất trong `attributes.proposal` cho tới
 * khi Điều hành duyệt. Khoá này chỉ máy chủ được ghi, mọi giá trị client gửi
 * lên đều bị bỏ (`stripProposal`).
 *
 * Vòng đời: `pending` (hạn 30 ngày) → `approved` | `rejected` | `expired`.
 * Bị từ chối / hết hạn thì tạm ẩn; 30 ngày sau đó chuyển vào thùng rác.
 */

export const PROPOSAL_KEY = "proposal"
export const PROPOSAL_TTL_DAYS = 30
export const PROPOSAL_REMINDER_DAYS = [7, 21, 27] as const
/** Mẫu bị từ chối / hết hạn nằm thêm chừng này ngày rồi vào thùng rác. */
export const PROPOSAL_PURGE_AFTER_DAYS = 30

const DAY_MS = 86_400_000

export type ProposalStatus = "pending" | "approved" | "rejected" | "expired"

export interface ProductProposal {
  status: ProposalStatus
  byUserId: string
  at: string
  reviewedBy?: string
  reviewedAt?: string
  note?: string
  remindedDays?: number[]
}

type Attrs = Record<string, unknown> | null | undefined

const STATUSES: readonly ProposalStatus[] = ["pending", "approved", "rejected", "expired"]

export function readProposal(attrs: Attrs): ProductProposal | null {
  const raw = attrs?.[PROPOSAL_KEY]
  if (!raw || typeof raw !== "object") return null
  const p = raw as Record<string, unknown>
  if (!STATUSES.includes(p.status as ProposalStatus) || typeof p.byUserId !== "string") return null
  // `approvedBy`/`approvedAt`: tên trường của giai đoạn 1, đọc lại cho dữ liệu cũ.
  const reviewedBy = (p.reviewedBy ?? p.approvedBy) as string | undefined
  const reviewedAt = (p.reviewedAt ?? p.approvedAt) as string | undefined
  return {
    status: p.status as ProposalStatus,
    byUserId: p.byUserId,
    at: String(p.at ?? ""),
    ...(reviewedBy ? { reviewedBy, reviewedAt: String(reviewedAt ?? "") } : {}),
    ...(typeof p.note === "string" ? { note: p.note } : {}),
    ...(Array.isArray(p.remindedDays) ? { remindedDays: p.remindedDays.filter((d): d is number => typeof d === "number") } : {}),
  }
}

export function isPendingProposal(attrs: Attrs): boolean {
  return readProposal(attrs)?.status === "pending"
}

/** Bỏ `proposal` khỏi dữ liệu client gửi — nhãn đề xuất chỉ máy chủ ghi. */
export function stripProposal<T extends Record<string, unknown> | null | undefined>(attrs: T): T {
  if (!attrs || !(PROPOSAL_KEY in attrs)) return attrs
  const { [PROPOSAL_KEY]: _ignored, ...rest } = attrs
  return rest as T
}

export function newProposal(userId: string, now: Date = new Date()): ProductProposal {
  return { status: "pending", byUserId: userId, at: now.toISOString() }
}

function review(p: ProductProposal, status: ProposalStatus, by: string, now: Date, note?: string): ProductProposal {
  return { ...p, status, reviewedBy: by, reviewedAt: now.toISOString(), ...(note ? { note } : {}) }
}

export function approveProposal(p: ProductProposal, approverId: string, now: Date = new Date()): ProductProposal {
  return review(p, "approved", approverId, now)
}

export function rejectProposal(p: ProductProposal, reviewerId: string, note: string, now: Date = new Date()): ProductProposal {
  return review(p, "rejected", reviewerId, now, note)
}

export function expireProposal(p: ProductProposal, now: Date = new Date()): ProductProposal {
  return review(p, "expired", "system", now)
}

export function proposalExpiresAt(p: ProductProposal): Date {
  return new Date(new Date(p.at).getTime() + PROPOSAL_TTL_DAYS * DAY_MS)
}

export type SweepStep =
  | { kind: "remind"; day: number; daysLeft: number }
  | { kind: "expire" }
  | { kind: "purge" }
  | null

/**
 * Việc tác vụ quét hằng ngày cần làm với một đề xuất. Idempotent: lần nhắc đã
 * gửi nằm trong `remindedDays`, nên quét nhiều lần trong ngày không nhắc trùng.
 */
export function planSweep(p: ProductProposal, now: Date = new Date()): SweepStep {
  const at = new Date(p.at).getTime()
  if (Number.isNaN(at)) return null
  if (p.status === "pending") {
    if (now.getTime() >= proposalExpiresAt(p).getTime()) return { kind: "expire" }
    const elapsed = Math.floor((now.getTime() - at) / DAY_MS)
    const sent = new Set(p.remindedDays ?? [])
    const due = [...PROPOSAL_REMINDER_DAYS].reverse().find((d) => elapsed >= d)
    if (due !== undefined && !sent.has(due)) return { kind: "remind", day: due, daysLeft: PROPOSAL_TTL_DAYS - elapsed }
    return null
  }
  if (p.status === "rejected" || p.status === "expired") {
    const reviewed = new Date(p.reviewedAt ?? p.at).getTime()
    if (!Number.isNaN(reviewed) && now.getTime() >= reviewed + PROPOSAL_PURGE_AFTER_DAYS * DAY_MS) return { kind: "purge" }
  }
  return null
}

/** Ghi nhận đã nhắc mốc `day` — các mốc sớm hơn coi như đã qua, không nhắc bù. */
export function markReminded(p: ProductProposal, day: number): ProductProposal {
  const days = new Set(p.remindedDays ?? [])
  for (const d of PROPOSAL_REMINDER_DAYS) if (d <= day) days.add(d)
  return { ...p, remindedDays: [...days].sort((a, b) => a - b) }
}

/** Trường vận hành người không phải Điều hành được đổi trên mẫu chính thức. */
const OPERATIONAL_FIELDS = new Set(["status", "availabilityConfig"])

export type EditDecision = "allow" | "deny"

/**
 * Ai được sửa gì trên một mẫu đã có. `input` là các trường thực sự gửi lên
 * (giá trị `undefined` coi như không gửi). Mẫu bị từ chối / hết hạn coi như
 * đã đóng: chỉ Điều hành mở lại.
 */
export function decideEdit(args: {
  canManageCatalog: boolean
  userId: string
  storedAttributes: Attrs
  input: Record<string, unknown>
}): EditDecision {
  if (args.canManageCatalog) return "allow"
  const proposal = readProposal(args.storedAttributes)
  if (proposal?.status === "pending" && proposal.byUserId === args.userId) return "allow"
  if (proposal?.status === "rejected" || proposal?.status === "expired") return "deny"

  const sent = Object.entries(args.input).filter(([, v]) => v !== undefined)
  const onlyOperational = sent.every(([k]) => OPERATIONAL_FIELDS.has(k))
  // Tạm ẩn / mở bán thôi — ngừng kinh doanh vẫn cần L4 ở route.
  const statusOk = args.input.status === undefined || args.input.status === "ACTIVE" || args.input.status === "DRAFT"
  return onlyOperational && statusOk ? "allow" : "deny"
}
