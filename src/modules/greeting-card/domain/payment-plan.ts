import { depositAmountVnd } from "./payment-schedule"
/**
 * Payment Policy + Payment Code cho đơn Thẻ chào. Pure TypeScript.
 *
 *   PaymentCode (DC30) → PaymentPolicy (DEPOSIT_30) → PaymentSchedule (`payment-schedule.ts`)
 *
 * - Payment Policy = cách/thời điểm thu tiền: `FULL_PAYMENT` hoặc `DEPOSIT_<n>` (cọc n%, 1–99).
 * - Mặc định của tiệm: `brochure_policy.deposit_percent`; có thể bị đợt (campaign) đang chạy
 *   ghi đè theo NGÀY GIAO — cấu hình, không hard-code ngày lễ.
 * - Payment Code KHÔNG phải mã giảm giá: chỉ đổi policy của đơn, KHÔNG đổi tổng tiền.
 *   Thêm DC20/DC40 = thêm một dòng cấu hình, không sửa logic.
 * Cấu hình ở `organizations.settings.brochure_payment_plans`.
 */

export const PAYMENT_PLANS_SETTINGS_KEY = "brochure_payment_plans"
export const FULL_PAYMENT = "FULL_PAYMENT"
export const MAX_PAYMENT_CODES = 50
export const MAX_POLICY_CAMPAIGNS = 20

export type PaymentPlanSource = "SHOP_DEFAULT" | "CAMPAIGN" | "PAYMENT_CODE"

export interface PaymentCodeRule {
  code: string
  /** `FULL_PAYMENT` | `DEPOSIT_<n>` */
  policy: string
  active: boolean
  /** Ngày bắt đầu/kết thúc hiệu lực (YYYY-MM-DD, giờ VN, tính cả hai đầu); null = không giới hạn. */
  startsOn: string | null
  endsOn: string | null
  /** Số đơn (chưa huỷ) tối đa được dùng mã; null = không giới hạn. */
  maxUses: number | null
  minOrderVnd: number | null
  maxOrderVnd: number | null
  /** Bộ sưu tập (loại đơn) áp dụng; rỗng = mọi bộ sưu tập. */
  catalogIds: string[]
  /** Người cấp mã (Sale/Điều hành) + ghi chú — để truy vết. */
  issuedBy: string | null
  note: string | null
}

export interface PolicyCampaign {
  id: string
  name: string
  policy: string
  active: boolean
  startsOn: string
  endsOn: string
}

export interface PaymentPlansConfig {
  campaigns: PolicyCampaign[]
  codes: PaymentCodeRule[]
}

/** Bản chụp kế hoạch thanh toán lưu trên đơn (`pricing_rule_ref.paymentPlan`). */
export interface PaymentPlanSnapshot {
  policy: string
  depositPercent: number
  source: PaymentPlanSource
  paymentCode: string | null
  campaignName: string | null
}

type Loose = Record<string, unknown>
const obj = (v: unknown): Loose => (v && typeof v === "object" && !Array.isArray(v) ? (v as Loose) : {})
const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null)
const posInt = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) && v > 0 ? v : null)
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const dateOrNull = (v: unknown): string | null => (typeof v === "string" && DATE_RE.test(v) ? v : null)
const CODE_RE = /^[A-Z0-9_-]{2,40}$/

/** Chuẩn hoá mã khách nhập: bỏ khoảng trắng, viết hoa. */
export function normalizePaymentCode(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\s+/g, "").toUpperCase()
}

/** % cọc của policy: FULL_PAYMENT → 0, DEPOSIT_30 → 30; không hợp lệ → null. */
export function depositPercentOf(policy: string): number | null {
  if (policy === FULL_PAYMENT) return 0
  const m = /^DEPOSIT_(\d{1,2})$/.exec(policy)
  if (!m) return null
  const pct = Number(m[1])
  return pct >= 1 && pct <= 99 ? pct : null
}

export function policyOf(depositPercent: number): string {
  return depositPercent >= 1 && depositPercent <= 99 ? `DEPOSIT_${Math.round(depositPercent)}` : FULL_PAYMENT
}

/** Nhãn tiếng Việt của policy (không hiện mã kỹ thuật lên màn hình). */
export function policyLabel(policy: string): string {
  const pct = depositPercentOf(policy)
  return pct ? `Đặt cọc ${pct}%` : "Thanh toán 100%"
}

function parseCode(raw: unknown): PaymentCodeRule | null {
  const r = obj(raw)
  const code = normalizePaymentCode(typeof r.code === "string" ? r.code : "")
  const policy = typeof r.policy === "string" ? r.policy : ""
  if (!CODE_RE.test(code) || depositPercentOf(policy) === null) return null
  return {
    code,
    policy,
    active: r.active !== false,
    startsOn: dateOrNull(r.starts_on),
    endsOn: dateOrNull(r.ends_on),
    maxUses: posInt(r.max_uses),
    minOrderVnd: posInt(r.min_order_vnd),
    maxOrderVnd: posInt(r.max_order_vnd),
    catalogIds: Array.isArray(r.catalog_ids) ? r.catalog_ids.filter((x): x is string => typeof x === "string").slice(0, 50) : [],
    issuedBy: str(r.issued_by, 80),
    note: str(r.note, 200),
  }
}

function parseCampaign(raw: unknown): PolicyCampaign | null {
  const r = obj(raw)
  const id = str(r.id, 40)
  const name = str(r.name, 80)
  const policy = typeof r.policy === "string" ? r.policy : ""
  const startsOn = dateOrNull(r.starts_on)
  const endsOn = dateOrNull(r.ends_on)
  if (!id || !name || depositPercentOf(policy) === null || !startsOn || !endsOn || endsOn < startsOn) return null
  return { id, name, policy, active: r.active !== false, startsOn, endsOn }
}

/** Đọc cấu hình; dòng sai bị bỏ, mã trùng chỉ giữ dòng đầu. */
export function parsePaymentPlans(settings: unknown): PaymentPlansConfig {
  const raw = obj(obj(settings)[PAYMENT_PLANS_SETTINGS_KEY])
  const seen = new Set<string>()
  const codes: PaymentCodeRule[] = []
  for (const c of Array.isArray(raw.codes) ? raw.codes : []) {
    const rule = parseCode(c)
    if (!rule || seen.has(rule.code)) continue
    seen.add(rule.code)
    codes.push(rule)
  }
  const campaigns = (Array.isArray(raw.campaigns) ? raw.campaigns : [])
    .map(parseCampaign)
    .filter((c): c is PolicyCampaign => c !== null)
  return { campaigns: campaigns.slice(0, MAX_POLICY_CAMPAIGNS), codes: codes.slice(0, MAX_PAYMENT_CODES) }
}

/** Ghi cấu hình về dạng lưu trong settings (snake_case). */
export function serializePaymentPlans(config: PaymentPlansConfig): Loose {
  return {
    campaigns: config.campaigns.map((c) => ({
      id: c.id, name: c.name, policy: c.policy, active: c.active, starts_on: c.startsOn, ends_on: c.endsOn,
    })),
    codes: config.codes.map((c) => ({
      code: c.code, policy: c.policy, active: c.active, starts_on: c.startsOn, ends_on: c.endsOn, max_uses: c.maxUses,
      min_order_vnd: c.minOrderVnd, max_order_vnd: c.maxOrderVnd, catalog_ids: c.catalogIds, issued_by: c.issuedBy, note: c.note,
    })),
  }
}

/** Ngày hiện tại theo giờ Việt Nam (YYYY-MM-DD). */
export function vnToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10)
}

/** Có ô nhập mã thanh toán trên trang khách không (tiệm có ít nhất một mã đang bật). */
export function paymentCodesEnabled(config: PaymentPlansConfig): boolean {
  return config.codes.some((c) => c.active)
}

/**
 * Policy mặc định của một đơn: đợt (campaign) đang bật phủ ngày giao (thiếu ngày giao → hôm nay)
 * thắng mặc định của tiệm. Nhiều đợt chồng nhau → đợt khai báo trước thắng.
 */
export function defaultPaymentPlan(
  shopDepositPercent: number,
  config: PaymentPlansConfig,
  day: string,
): PaymentPlanSnapshot {
  const campaign = config.campaigns.find((c) => c.active && c.startsOn <= day && day <= c.endsOn)
  if (campaign) {
    return {
      policy: campaign.policy, depositPercent: depositPercentOf(campaign.policy) ?? 0,
      source: "CAMPAIGN", paymentCode: null, campaignName: campaign.name,
    }
  }
  return { policy: policyOf(shopDepositPercent), depositPercent: shopDepositPercent, source: "SHOP_DEFAULT", paymentCode: null, campaignName: null }
}

export function findPaymentCode(config: PaymentPlansConfig, raw: string): PaymentCodeRule | null {
  const code = normalizePaymentCode(raw)
  return config.codes.find((c) => c.code === code) ?? null
}

export interface PaymentCodeFacts {
  today: string
  /** Tổng đơn; null = mẫu chưa niêm yết giá (cửa hàng báo giá sau). */
  orderTotalVnd: number | null
  catalogId: string | null
  /** Số đơn chưa huỷ đã dùng mã. */
  usedCount: number
}

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`

/** Lý do mã thanh toán không dùng được (tiếng Việt) hoặc `null`. */
export function paymentCodeBlocker(rule: PaymentCodeRule, f: PaymentCodeFacts): string | null {
  if (!rule.active) return "Mã thanh toán đang tạm ngưng"
  if (rule.startsOn && f.today < rule.startsOn) return "Mã thanh toán chưa đến ngày áp dụng"
  if (rule.endsOn && f.today > rule.endsOn) return "Mã thanh toán đã hết hạn"
  if (rule.maxUses !== null && f.usedCount >= rule.maxUses) return "Mã thanh toán đã hết lượt sử dụng"
  if (rule.catalogIds.length > 0 && (!f.catalogId || !rule.catalogIds.includes(f.catalogId))) {
    return "Mã thanh toán không áp dụng cho bộ sưu tập này"
  }
  if (rule.minOrderVnd !== null || rule.maxOrderVnd !== null) {
    if (f.orderTotalVnd === null) return "Mẫu này chưa có giá nên chưa áp dụng được mã thanh toán"
    if (rule.minOrderVnd !== null && f.orderTotalVnd < rule.minOrderVnd) return `Mã thanh toán áp dụng cho đơn từ ${vnd(rule.minOrderVnd)}`
    if (rule.maxOrderVnd !== null && f.orderTotalVnd > rule.maxOrderVnd) return `Mã thanh toán áp dụng cho đơn đến ${vnd(rule.maxOrderVnd)}`
  }
  return null
}

export function planFromCode(rule: PaymentCodeRule): PaymentPlanSnapshot {
  return { policy: rule.policy, depositPercent: depositPercentOf(rule.policy) ?? 0, source: "PAYMENT_CODE", paymentCode: rule.code, campaignName: null }
}

/** Bản chụp đã lưu trên đơn, hoặc `null` (đơn cũ trước tính năng → theo chính sách tiệm hiện tại). */
export function readPaymentPlan(pricingRuleRef: unknown): PaymentPlanSnapshot | null {
  const p = obj(obj(pricingRuleRef).paymentPlan)
  const policy = typeof p.policy === "string" ? p.policy : ""
  const pct = depositPercentOf(policy)
  if (pct === null) return null
  const source = p.source === "CAMPAIGN" || p.source === "PAYMENT_CODE" ? p.source : "SHOP_DEFAULT"
  return {
    policy, depositPercent: pct, source,
    paymentCode: typeof p.paymentCode === "string" ? p.paymentCode : null,
    campaignName: typeof p.campaignName === "string" ? p.campaignName : null,
  }
}

/** Chính sách thu tiền ÁP CHO MỘT ĐƠN: % cọc theo bản chụp trên đơn, các cờ khác theo tiệm. */
export function policyForOrder<P extends { depositPercent: number }>(shopPolicy: P, pricingRuleRef: unknown): P {
  const plan = readPaymentPlan(pricingRuleRef)
  return plan ? { ...shopPolicy, depositPercent: plan.depositPercent } : shopPolicy
}

/**
 * Khoản Lần 1 của một đơn (cọc theo kế hoạch thanh toán của đơn, hoặc toàn bộ khi không cọc) — một
 * công thức chung cho máy chủ ghi sổ và giao diện hiển thị, để hai bên không lệch nhau.
 */
export function firstPaymentAmountVnd(totalVnd: number, pricingRuleRef: unknown, shopDepositPercent: number): number {
  const pct = readPaymentPlan(pricingRuleRef)?.depositPercent ?? shopDepositPercent
  const deposit = depositAmountVnd(totalVnd, pct)
  return pct > 0 && deposit < totalVnd ? deposit : totalVnd
}

/**
 * Lỗi cấu hình (tiếng Việt) để màn cài đặt chặn lưu thay vì âm thầm bỏ dòng sai lúc đọc.
 * Rỗng = hợp lệ.
 */
export function paymentPlansErrors(config: PaymentPlansConfig): string[] {
  const errors: string[] = []
  const seen = new Set<string>()
  config.codes.forEach((c, i) => {
    const at = `Mã thứ ${i + 1}`
    const code = normalizePaymentCode(c.code)
    if (!CODE_RE.test(code)) errors.push(`${at}: mã gồm 2–40 chữ in hoa/số (VD: DC30)`)
    else if (seen.has(code)) errors.push(`${at}: mã ${code} bị trùng`)
    seen.add(code)
    if (depositPercentOf(c.policy) === null) errors.push(`${at}: mức đặt cọc phải từ 1% đến 99%`)
    if (c.startsOn && c.endsOn && c.endsOn < c.startsOn) errors.push(`${at}: ngày kết thúc trước ngày bắt đầu`)
    if (c.minOrderVnd !== null && c.maxOrderVnd !== null && c.minOrderVnd > c.maxOrderVnd) errors.push(`${at}: giá trị đơn tối thiểu lớn hơn tối đa`)
  })
  if (config.codes.length > MAX_PAYMENT_CODES) errors.push(`Tối đa ${MAX_PAYMENT_CODES} mã thanh toán`)
  config.campaigns.forEach((c, i) => {
    const at = `Đợt thứ ${i + 1}`
    if (!c.name.trim()) errors.push(`${at}: cần tên đợt`)
    if (!DATE_RE.test(c.startsOn) || !DATE_RE.test(c.endsOn)) errors.push(`${at}: cần ngày bắt đầu và kết thúc`)
    else if (c.endsOn < c.startsOn) errors.push(`${at}: ngày kết thúc trước ngày bắt đầu`)
    if (depositPercentOf(c.policy) === null) errors.push(`${at}: cách thu không hợp lệ`)
  })
  if (config.campaigns.length > MAX_POLICY_CAMPAIGNS) errors.push(`Tối đa ${MAX_POLICY_CAMPAIGNS} đợt`)
  return errors
}
