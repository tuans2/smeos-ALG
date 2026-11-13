/**
 * Các view của "Theo dõi tiến độ" (Kanban, Danh sách, Lịch, Công việc, Dashboard) là những cách
 * LỌC / NHÓM / SẮP XẾP / TỔNG HỢP khác nhau trên CÙNG một tập `TrackingPipelineItem` — không có
 * trạng thái riêng cho giao diện. Bước và SLA lấy nguyên từ quy trình 9 bước (`PIPELINE_STEPS`,
 * `STEP_SLA_RULES`, `item.stuck`). Pure TypeScript.
 */
import { STEP_SLA_RULES, type StepOwner, type StepSlaSetting } from "./step-sla"
import { inCategory, type TrackingCategory } from "./tracking-filters"
import { PIPELINE_STEPS, type StepDefinition, type TrackingPipelineItem, type TrackingPipelineStepId } from "./tracking-pipeline-types"
import { classifyOrderTimeTier } from "./order-time-tier"

export type SlaState = "NONE" | "ON_TRACK" | "DUE_SOON" | "OVERDUE"

export interface SlaInfo {
  state: SlaState
  /** Thời gian chuẩn của bước hiện tại (phút); `null` = bước không có/không bật thời gian chuẩn. */
  minutes: number | null
  dueAt: string | null
  /** Số phút đã ở bước hiện tại. */
  ageMinutes: number
  owner: StepOwner | null
}

export type TrackingViewItem = TrackingPipelineItem & { sla: SlaInfo }

/** "Sắp quá hạn": còn ≤ 20% thời gian chuẩn (tối đa 30 phút) — chỉ để ưu tiên hiển thị, không đổi luật kẹt. */
export function dueSoonWindow(minutes: number): number {
  return Math.min(30, Math.ceil(minutes * 0.2))
}

/**
 * SLA của bước hiện tại. OVERDUE trùng đúng với `item.stuck` (cùng `stuckOf`); link riêng chưa
 * sao chép gửi khách (stuck = null, chưa tính giờ) → NONE.
 */
export function slaStatusOf(item: TrackingPipelineItem, sla: Record<TrackingPipelineStepId, StepSlaSetting>, now: Date): SlaInfo {
  const started = Date.parse(item.stepStartedAt)
  const ageMinutes = Number.isFinite(started) ? Math.max(0, Math.floor((now.getTime() - started) / 60_000)) : 0
  const rule = STEP_SLA_RULES.find((r) => r.stepId === item.currentStepId)
  const setting = sla[item.currentStepId]
  const notSent = item.type === "SESSION" && item.linkKind === "PERSONAL" && !item.copiedAt
  if (!rule || !setting?.enabled || notSent || !Number.isFinite(started)) {
    return { state: item.stuck ? "OVERDUE" : "NONE", minutes: null, dueAt: null, ageMinutes, owner: rule?.owner ?? null }
  }
  const dueAt = new Date(started + setting.minutes * 60_000).toISOString()
  const remaining = setting.minutes - ageMinutes
  const state: SlaState = item.stuck ? "OVERDUE" : remaining <= dueSoonWindow(setting.minutes) ? "DUE_SOON" : "ON_TRACK"
  return { state, minutes: setting.minutes, dueAt, ageMinutes, owner: rule.owner }
}

// ── Lọc / sắp xếp / phân trang ───────────────────────────────────────────────

export interface TrackingFilter {
  q?: string | undefined
  category?: TrackingCategory | undefined
  steps?: TrackingPipelineStepId[] | undefined
  saleId?: string | undefined
  channel?: string | undefined
  type?: "ORDER" | "SESSION" | undefined
  /** ATTENTION = quá hạn hoặc sắp quá hạn */
  sla?: SlaState | "ATTENTION" | undefined
  owner?: StepOwner | undefined
  /** Ngày giao (YYYY-MM-DD, giờ VN) */
  deliveryFrom?: string | undefined
  deliveryTo?: string | undefined
  /** Chế độ hiển thị trạng thái: ACTIVE (đang hoạt động - mặc định), DISMISSED (đã hủy/bỏ hiển thị), ALL (tất cả) */
  statusMode?: "ACTIVE" | "DISMISSED" | "ALL" | undefined
}

export const SORT_FIELDS = ["urgency", "stepStartedAt", "age", "step", "totalVnd", "deliveryDate", "createdAt", "customerName"] as const
export type SortField = (typeof SORT_FIELDS)[number]
export interface TrackingSort {
  field: SortField
  dir: "asc" | "desc"
}

const STEP_INDEX = new Map(PIPELINE_STEPS.map((s) => [s.id, s.orderIndex]))
const SLA_RANK: Record<SlaState, number> = { OVERDUE: 3, DUE_SOON: 2, ON_TRACK: 1, NONE: 0 }

export function matchesFilter(i: TrackingViewItem, f: TrackingFilter): boolean {
  const statusMode = f.statusMode ?? "ACTIVE"
  if (statusMode === "ACTIVE" && i.isCancelled) return false
  if (statusMode === "DISMISSED" && !i.isCancelled) return false

  const q = f.q?.trim().toLowerCase()
  if (q) {
    const cleanQ = q.replace(/^#/, "")
    const qDigits = q.replace(/\D/g, "")
    const hasLetters = /[a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9]/.test(q)
    const phoneDigits = (i.customerPhone || "").replace(/\D/g, "")
    const recipientDigits = (i.recipientPhone || "").replace(/\D/g, "")
    const phoneMatch = !hasLetters && qDigits.length >= 3 && (phoneDigits.includes(qDigits) || recipientDigits.includes(qDigits))
    const textMatch = [i.orderCode, i.sendCode, i.customerName, i.customerPhone, i.productName, i.recipientName, i.recipientPhone].some(
      (v) => v?.toLowerCase().includes(q) || (cleanQ && v?.toLowerCase().includes(cleanQ))
    )
    if (!phoneMatch && !textMatch) return false
  }
  if (f.category && !inCategory(i, f.category)) return false
  if (f.steps?.length && !f.steps.includes(i.currentStepId)) return false
  if (f.saleId && i.saleId !== f.saleId) return false
  if (f.channel && i.channel !== f.channel) return false
  if (f.type && i.type !== f.type) return false
  if (f.sla === "ATTENTION" ? !(i.sla.state === "OVERDUE" || i.sla.state === "DUE_SOON") : f.sla && i.sla.state !== f.sla) return false
  if (f.owner && i.sla.owner !== f.owner) return false
  if (f.deliveryFrom && (!i.deliveryDate || i.deliveryDate < f.deliveryFrom)) return false
  if (f.deliveryTo && (!i.deliveryDate || i.deliveryDate > f.deliveryTo)) return false
  return true
}

/** "urgency": quá hạn lâu nhất → sắp quá hạn gần nhất → còn lại theo lúc vào bước mới nhất. */
export function compareItems(a: TrackingViewItem, b: TrackingViewItem, sort: TrackingSort): number {
  const sign = sort.dir === "asc" ? 1 : -1
  switch (sort.field) {
    case "urgency": {
      const r = SLA_RANK[b.sla.state] - SLA_RANK[a.sla.state]
      if (r) return r
      if (a.sla.state === "OVERDUE") return (b.stuck?.overdueMinutes ?? 0) - (a.stuck?.overdueMinutes ?? 0)
      if (a.sla.state === "DUE_SOON") return Date.parse(a.sla.dueAt ?? "") - Date.parse(b.sla.dueAt ?? "")
      return Date.parse(b.stepStartedAt) - Date.parse(a.stepStartedAt)
    }
    case "age": return sign * (a.sla.ageMinutes - b.sla.ageMinutes)
    case "step": return sign * ((STEP_INDEX.get(a.currentStepId) ?? 0) - (STEP_INDEX.get(b.currentStepId) ?? 0))
    case "totalVnd": return sign * (a.totalVnd - b.totalVnd)
    case "customerName": return sign * a.customerName.localeCompare(b.customerName, "vi")
    case "deliveryDate": return sign * `${a.deliveryDate ?? "9999"}`.localeCompare(`${b.deliveryDate ?? "9999"}`)
    case "createdAt": return sign * (Date.parse(a.createdAt) - Date.parse(b.createdAt))
    case "stepStartedAt": return sign * (Date.parse(a.stepStartedAt) - Date.parse(b.stepStartedAt))
  }
}

export function filterAndSort(items: TrackingViewItem[], f: TrackingFilter, sort: TrackingSort): TrackingViewItem[] {
  return items.filter((i) => matchesFilter(i, f)).sort((a, b) => compareItems(a, b, sort) || a.id.localeCompare(b.id))
}

/** Phân trang theo vị trí (con trỏ = số thứ tự kế tiếp, dạng chuỗi). */
export function paginate<T>(rows: T[], limit: number, cursor?: string): { data: T[]; next_cursor: string | null; total: number } {
  const start = Math.max(0, Number.parseInt(cursor ?? "0", 10) || 0)
  const data = rows.slice(start, start + limit)
  return { data, next_cursor: start + limit < rows.length ? String(start + limit) : null, total: rows.length }
}

// ── Kanban / Lịch / Dashboard ────────────────────────────────────────────────

export interface KanbanColumn {
  stepId: TrackingPipelineStepId
  title: string
  count: number
  overdue: number
  dueSoon: number
  /** Thời gian ở bước — trung bình / lâu nhất (phút) */
  avgAgeMinutes: number
  maxAgeMinutes: number
  totalVnd: number
  /** Số thẻ theo tầng thời gian trên CẢ cột (tiêu đề cột) — không chỉ phần thẻ đang hiện */
  tierOverdue: number
  tierUrgent: number
  items: TrackingViewItem[]
  hasMore: boolean
}

/** Mỗi lần bấm "Xem thêm" mở thêm chừng này thẻ; trần một cột (lưới an toàn dữ liệu). */
export const KANBAN_PAGE_SIZE = 20
export const KANBAN_MAX_PER_COLUMN = 1000

export type KanbanColumnLimits = Partial<Record<TrackingPipelineStepId, number>>

/**
 * Nhóm theo 9 bước; mỗi cột trả `perColumn` thẻ gấp nhất, hoặc số riêng của cột trong
 * `columnLimits` (nút "Xem thêm" của cột). Đếm và số quá hạn/sắp hạn vẫn tính trên cả cột.
 */
export function kanbanColumns(
  items: TrackingViewItem[],
  perColumn: number,
  columnLimits: KanbanColumnLimits = {},
  nowMs = Date.now(),
  steps: StepDefinition[] = PIPELINE_STEPS
): KanbanColumn[] {
  return steps.map((step) => {
    const inStep = items.filter((i) => i.currentStepId === step.id).sort((a, b) => compareItems(a, b, { field: "urgency", dir: "desc" }))
    const ages = inStep.map((i) => i.sla.ageMinutes)
    const limit = Math.min(KANBAN_MAX_PER_COLUMN, Math.max(perColumn, columnLimits[step.id] ?? 0))
    // Bước Hoàn tất không phân tầng quá hạn (khớp cách Kanban hiển thị)
    const tiers = step.id === "STEP_9_COMPLETED" ? [] : inStep.map((i) =>
      classifyOrderTimeTier({ deliveryDate: i.deliveryDate, deliveryTimeSlot: i.deliveryTimeSlot, isStuck: !!i.stuck, slaState: i.sla.state }, nowMs))
    return {
      stepId: step.id, title: step.shortTitle, count: inStep.length,
      overdue: inStep.filter((i) => i.sla.state === "OVERDUE").length,
      dueSoon: inStep.filter((i) => i.sla.state === "DUE_SOON").length,
      avgAgeMinutes: ages.length ? Math.round(ages.reduce((s, x) => s + x, 0) / ages.length) : 0,
      maxAgeMinutes: ages.length ? Math.max(...ages) : 0,
      totalVnd: inStep.reduce((s, i) => s + i.totalVnd, 0),
      tierOverdue: tiers.filter((t) => t === "OVERDUE").length,
      tierUrgent: tiers.filter((t) => t === "URGENT").length,
      items: inStep.slice(0, limit), hasMore: inStep.length > limit,
    }
  })
}

export interface CalendarDay {
  date: string
  count: number
  slots: Array<{ slot: string; items: TrackingViewItem[] }>
}

/** Đơn theo ngày giao trong [from, to], nhóm theo khung giờ; đơn chưa có ngày giao không vào lịch. */
export function calendarDays(items: TrackingViewItem[], from: string, to: string): CalendarDay[] {
  const days = new Map<string, Map<string, TrackingViewItem[]>>()
  for (const i of items) {
    if (!i.deliveryDate || i.deliveryDate < from || i.deliveryDate > to) continue
    const slots = days.get(i.deliveryDate) ?? new Map<string, TrackingViewItem[]>()
    const key = i.deliveryTimeSlot || "Chưa chọn giờ"
    slots.set(key, [...(slots.get(key) ?? []), i])
    days.set(i.deliveryDate, slots)
  }
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, slots]) => ({
      date,
      count: [...slots.values()].reduce((s, l) => s + l.length, 0),
      slots: [...slots.entries()].sort(([a], [b]) => a.localeCompare(b, "vi")).map(([slot, list]) => ({ slot, items: list })),
    }))
}

export const AGING_BUCKETS = [
  { id: "LT_1H", label: "Dưới 1 giờ", max: 60 },
  { id: "H1_4", label: "1–4 giờ", max: 240 },
  { id: "H4_24", label: "4–24 giờ", max: 1440 },
  { id: "GT_1D", label: "Trên 1 ngày", max: Number.POSITIVE_INFINITY },
] as const

export interface TrackingDashboard {
  total: number
  orders: number
  links: number
  overdue: number
  dueSoon: number
  completed: number
  outstandingVnd: number
  byStep: Array<{ stepId: TrackingPipelineStepId; title: string; count: number; overdue: number; totalVnd: number }>
  aging: Array<{ id: string; label: string; count: number }>
  byOwner: Array<{ owner: StepOwner; overdue: number; dueSoon: number }>
  /** Tiến độ: tỷ lệ đơn đã qua bước thu tiền (≥ bước 5) và đã hoàn tất trong tập đang xem. */
  progress: { paidOrBeyondRate: number; completedRate: number }
}

export function dashboardOf(items: TrackingViewItem[], steps: StepDefinition[] = PIPELINE_STEPS): TrackingDashboard {
  const orders = items.filter((i) => i.type === "ORDER")
  const rate = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0)
  const idx = (i: TrackingViewItem) => STEP_INDEX.get(i.currentStepId) ?? 0
  return {
    total: items.length,
    orders: orders.length,
    links: items.length - orders.length,
    overdue: items.filter((i) => i.sla.state === "OVERDUE").length,
    dueSoon: items.filter((i) => i.sla.state === "DUE_SOON").length,
    completed: items.filter((i) => i.currentStepId === "STEP_9_COMPLETED").length,
    outstandingVnd: orders.reduce((s, i) => s + Math.max(0, i.balanceVnd), 0),
    byStep: steps.map((s) => {
      const inStep = items.filter((i) => i.currentStepId === s.id)
      return { stepId: s.id, title: s.shortTitle, count: inStep.length, overdue: inStep.filter((i) => i.sla.state === "OVERDUE").length, totalVnd: inStep.reduce((t, i) => t + i.totalVnd, 0) }
    }),
    aging: AGING_BUCKETS.map((b, n) => ({
      id: b.id, label: b.label,
      count: items.filter((i) => i.currentStepId !== "STEP_9_COMPLETED" && i.sla.ageMinutes < b.max && (n === 0 || i.sla.ageMinutes >= AGING_BUCKETS[n - 1]!.max)).length,
    })),
    byOwner: (["SALE", "ADMIN", "COORDINATOR"] as const).map((owner) => ({
      owner,
      overdue: items.filter((i) => i.sla.owner === owner && i.sla.state === "OVERDUE").length,
      dueSoon: items.filter((i) => i.sla.owner === owner && i.sla.state === "DUE_SOON").length,
    })),
    progress: {
      paidOrBeyondRate: rate(orders.filter((i) => idx(i) >= 5).length, orders.length),
      completedRate: rate(orders.filter((i) => i.currentStepId === "STEP_9_COMPLETED").length, orders.length),
    },
  }
}
