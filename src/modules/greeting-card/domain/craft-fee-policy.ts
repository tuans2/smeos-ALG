/**
 * craft-fee-policy.ts
 *
 * Phí trả cho bên làm thay đơn (chi nhánh trong chuỗi / đối tác ngoài chuỗi) — DÙNG CHUNG MỌI NGÀNH.
 * Ngành chỉ khai số khởi điểm và nhãn (`IndustryCraftFeeSpec`); tiệm tự chọn phương án trong
 * Cài đặt → Điều phối chuỗi (PO 22/10/2026). Trước đó "50%" viết cứng ở 6 chỗ, mỗi chỗ một nền giá.
 *
 * Domain thuần: không Prisma, không gọi mạng.
 */

import type { CraftComplexity, IndustryCraftFeeSpec } from "@/modules/organization/domain/industry-plugin-contract"
import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"

export const CRAFT_FEE_METHODS = [
  "PERCENT", // % giá hàng
  "PERCENT_BOUNDED", // % có sàn và trần (mặc định)
  "TIERED", // bậc thang theo giá trị đơn
  "FIXED_PER_PRODUCT", // giá cố định theo mẫu (ô "Phí gia công" của sản phẩm)
  "MATERIAL_PLUS_LABOR", // nguyên liệu theo định mức + công theo độ khó
  "PARTNER_PERCENT", // đối tác ngoài chuỗi
] as const
export type CraftFeeMethod = (typeof CRAFT_FEE_METHODS)[number]

/** Nền tính phí: giá hàng niêm yết (mặc định) hoặc giá hàng sau mã giảm giá. Luôn trước VAT, không gồm phí giao/phụ kiện. */
export type CraftFeeBase = "LIST_PRICE" | "AFTER_DISCOUNT"

export interface CraftFeeTier {
  /** Giá hàng tối đa của bậc (VNĐ); `null` = bậc cuối, không giới hạn. */
  upToVnd: number | null
  percent: number
}

export interface CraftFeePolicy {
  method: CraftFeeMethod
  base: CraftFeeBase
  percent: number
  minVnd: number
  maxVnd: number
  tiers: CraftFeeTier[]
  partnerPercent: number
  laborByComplexityVnd: Record<CraftComplexity, number>
  /** % cộng thêm trên chi phí nguyên liệu (phương án nguyên liệu + công). */
  materialMarkupPercent: number
  /** Đơn gấp: giao trong vòng `rushWithinMinutes` kể từ lúc gửi lời mời. */
  rushSurchargePercent: number
  rushWithinMinutes: number
  peakSurchargePercent: number
  /** Ngày cao điểm hằng năm (MM-DD) — mặc định theo ngành. */
  peakDays: string[]
  /** Ngày cao điểm riêng từng năm (YYYY-MM-DD) — Tết, Trung thu… theo âm lịch. */
  extraPeakDates: string[]
  roundToVnd: number
  /** Điều phối sửa phí trong khoảng ±% này; vượt → cần Điều hành duyệt. */
  coordinatorAdjustPercent: number
  /** Khấu trừ khi giao trễ / bị khiếu nại (% phí đã chốt). Mặc định 0% — PO 22/10/2026. */
  lateDeliveryDeductionPercent: number
  complaintDeductionPercent: number
  /** Công tắc áp dụng khấu trừ (PO 12/11/2026, audit BL-24). Tắt → không trừ đơn nào, kể cả đơn đang làm. */
  deductionsEnabled: boolean
  /** Ân hạn trước khi tính giao trễ (phút, 0–60, mặc định 15). */
  lateGraceMinutes: number
}

export interface CraftFeeInput {
  /** Giá hàng niêm yết trước VAT (đơn giá × số lượng), không gồm phí giao/phụ kiện. */
  listPriceVnd: number
  /** Giảm giá trên tiền hàng (mã giảm giá). */
  discountVnd: number
  productFixedFeeVnd?: number | null | undefined
  materialCostVnd?: number | null | undefined
  complexity?: CraftComplexity | null | undefined
  /** Số lượng sản phẩm của đơn — nhân với công làm (phí cố định và nguyên liệu đã nhân sẵn). */
  quantity?: number | undefined
  /** Đơn gửi cho đối tác ngoài chuỗi (luôn tính theo % đối tác, bất kể phương án). */
  isPartner?: boolean | undefined
  /** Lúc gửi lời mời và lúc phải giao — để tính phụ cấp gấp/cao điểm. */
  invitedAt: Date
  deliverAt: Date | null
}

export interface CraftFeeLine {
  label: string
  amountVnd: number
}

export interface CraftFeeResult {
  feeVnd: number
  lines: CraftFeeLine[]
}

const DEFAULT_TIERS: CraftFeeTier[] = [
  { upToVnd: 500_000, percent: 60 },
  { upToVnd: 1_500_000, percent: 55 },
  { upToVnd: null, percent: 50 },
]

/** Số mặc định khi tiệm chưa lưu cấu hình — lấy theo ngành. */
export function defaultCraftFeePolicy(spec: IndustryCraftFeeSpec): CraftFeePolicy {
  return {
    method: "PERCENT_BOUNDED",
    base: "LIST_PRICE",
    percent: spec.defaultPercent,
    minVnd: spec.minVnd,
    maxVnd: spec.maxVnd,
    tiers: DEFAULT_TIERS,
    partnerPercent: spec.partnerPercent,
    laborByComplexityVnd: { ...spec.laborByComplexityVnd },
    materialMarkupPercent: 0,
    rushSurchargePercent: 15,
    rushWithinMinutes: 120,
    peakSurchargePercent: 20,
    peakDays: spec.peakDays.map((d) => d.monthDay),
    extraPeakDates: [],
    roundToVnd: 5_000,
    coordinatorAdjustPercent: 20,
    lateDeliveryDeductionPercent: 0,
    complaintDeductionPercent: 0,
    deductionsEnabled: true,
    lateGraceMinutes: 15,
  }
}

const num = (v: unknown, fallback: number, min: number, max: number): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback

const MONTH_DAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const ISO_DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

/**
 * Đọc cấu hình tiệm đã lưu (`settings.craft_fee_policy`), kẹp mọi số vào khoảng hợp lệ;
 * thiếu khoá nào lấy mặc định của ngành khoá đó.
 */
export function parseCraftFeePolicy(raw: unknown, spec: IndustryCraftFeeSpec): CraftFeePolicy {
  const d = defaultCraftFeePolicy(spec)
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const method = CRAFT_FEE_METHODS.includes(r.method as CraftFeeMethod) ? (r.method as CraftFeeMethod) : d.method
  const tiers = Array.isArray(r.tiers)
    ? (r.tiers as unknown[])
        .map((t) => t as Record<string, unknown>)
        .map((t) => ({
          upToVnd: t.upToVnd === null ? null : num(t.upToVnd, NaN, 0, 1e12),
          percent: num(t.percent, NaN, 0, 100),
        }))
        .filter((t) => Number.isFinite(t.percent) && (t.upToVnd === null || Number.isFinite(t.upToVnd)))
    : []
  const labor = (r.laborByComplexityVnd ?? {}) as Record<string, unknown>
  const strings = (v: unknown, re: RegExp) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && re.test(x)) : null)
  const minVnd = num(r.minVnd, d.minVnd, 0, 1e10)
  return {
    method,
    base: r.base === "AFTER_DISCOUNT" ? "AFTER_DISCOUNT" : "LIST_PRICE",
    percent: num(r.percent, d.percent, 0, 100),
    minVnd,
    maxVnd: Math.max(minVnd, num(r.maxVnd, d.maxVnd, 0, 1e10)),
    tiers: tiers.length > 0 ? sortTiers(tiers) : d.tiers,
    partnerPercent: num(r.partnerPercent, d.partnerPercent, 0, 100),
    laborByComplexityVnd: {
      EASY: num(labor.EASY, d.laborByComplexityVnd.EASY, 0, 1e10),
      MEDIUM: num(labor.MEDIUM, d.laborByComplexityVnd.MEDIUM, 0, 1e10),
      HARD: num(labor.HARD, d.laborByComplexityVnd.HARD, 0, 1e10),
    },
    materialMarkupPercent: num(r.materialMarkupPercent, d.materialMarkupPercent, 0, 500),
    rushSurchargePercent: num(r.rushSurchargePercent, d.rushSurchargePercent, 0, 200),
    rushWithinMinutes: num(r.rushWithinMinutes, d.rushWithinMinutes, 0, 24 * 60),
    peakSurchargePercent: num(r.peakSurchargePercent, d.peakSurchargePercent, 0, 200),
    peakDays: strings(r.peakDays, MONTH_DAY) ?? d.peakDays,
    extraPeakDates: strings(r.extraPeakDates, ISO_DAY) ?? d.extraPeakDates,
    roundToVnd: num(r.roundToVnd, d.roundToVnd, 1, 1_000_000),
    coordinatorAdjustPercent: num(r.coordinatorAdjustPercent, d.coordinatorAdjustPercent, 0, 100),
    lateDeliveryDeductionPercent: num(r.lateDeliveryDeductionPercent, d.lateDeliveryDeductionPercent, 0, 100),
    complaintDeductionPercent: num(r.complaintDeductionPercent, d.complaintDeductionPercent, 0, 100),
    deductionsEnabled: r.deductionsEnabled !== false,
    lateGraceMinutes: num(r.lateGraceMinutes, d.lateGraceMinutes, 0, 60),
  }
}

function sortTiers(tiers: CraftFeeTier[]): CraftFeeTier[] {
  return [...tiers].sort((a, b) => (a.upToVnd ?? Infinity) - (b.upToVnd ?? Infinity))
}

const vnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`

/** Ngày (theo giờ Việt Nam) của một thời điểm, dạng YYYY-MM-DD. */
function vnDay(at: Date): string {
  return new Date(at.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** Phí gợi ý cho một đơn, kèm diễn giải từng bước (hiện trên màn hình Điều phối và thẻ chi nhánh). */
export function computeCraftFee(policy: CraftFeePolicy, input: CraftFeeInput): CraftFeeResult {
  const lines: CraftFeeLine[] = []
  const base = Math.max(0, policy.base === "AFTER_DISCOUNT" ? input.listPriceVnd - input.discountVnd : input.listPriceVnd)
  const baseLabel = policy.base === "AFTER_DISCOUNT" ? "giá hàng sau giảm giá" : "giá hàng"
  let fee: number

  const method: CraftFeeMethod = input.isPartner ? "PARTNER_PERCENT" : policy.method
  switch (method) {
    case "PARTNER_PERCENT":
      fee = (base * policy.partnerPercent) / 100
      lines.push({ label: `Đối tác ngoài chuỗi: ${policy.partnerPercent}% × ${baseLabel} ${vnd(base)}`, amountVnd: fee })
      break
    case "TIERED": {
      const tier = sortTiers(policy.tiers).find((t) => t.upToVnd === null || base <= t.upToVnd) ?? policy.tiers[policy.tiers.length - 1]
      const pct = tier?.percent ?? policy.percent
      fee = (base * pct) / 100
      lines.push({ label: `Bậc ${tier?.upToVnd ? `đến ${vnd(tier.upToVnd)}` : "cao nhất"}: ${pct}% × ${baseLabel} ${vnd(base)}`, amountVnd: fee })
      break
    }
    case "FIXED_PER_PRODUCT":
      if (typeof input.productFixedFeeVnd === "number" && input.productFixedFeeVnd > 0) {
        fee = input.productFixedFeeVnd
        lines.push({ label: "Phí cố định của mẫu", amountVnd: fee })
      } else {
        fee = (base * policy.percent) / 100
        lines.push({ label: `Mẫu chưa có phí cố định — tạm tính ${policy.percent}% × ${baseLabel} ${vnd(base)}`, amountVnd: fee })
      }
      break
    case "MATERIAL_PLUS_LABOR": {
      const complexity = input.complexity ?? "MEDIUM"
      const labor = policy.laborByComplexityVnd[complexity] * Math.max(1, input.quantity ?? 1)
      if (typeof input.materialCostVnd === "number" && input.materialCostVnd > 0) {
        const material = input.materialCostVnd * (1 + policy.materialMarkupPercent / 100)
        lines.push({ label: `Nguyên liệu theo định mức${policy.materialMarkupPercent ? ` (+${policy.materialMarkupPercent}%)` : ""}`, amountVnd: material })
        lines.push({ label: "Công làm theo độ khó", amountVnd: labor })
        fee = material + labor
      } else {
        fee = (base * policy.percent) / 100
        lines.push({ label: `Mẫu chưa có giá nguyên liệu — tạm tính ${policy.percent}% × ${baseLabel} ${vnd(base)}`, amountVnd: fee })
      }
      break
    }
    case "PERCENT":
    case "PERCENT_BOUNDED":
      fee = (base * policy.percent) / 100
      lines.push({ label: `${policy.percent}% × ${baseLabel} ${vnd(base)}`, amountVnd: fee })
      break
  }

  if (method === "PERCENT_BOUNDED") {
    if (fee < policy.minVnd) {
      lines.push({ label: `Nâng lên mức sàn ${vnd(policy.minVnd)}`, amountVnd: policy.minVnd - fee })
      fee = policy.minVnd
    } else if (fee > policy.maxVnd) {
      lines.push({ label: `Giữ ở mức trần ${vnd(policy.maxVnd)}`, amountVnd: policy.maxVnd - fee })
      fee = policy.maxVnd
    }
  }

  const before = fee
  if (input.deliverAt && policy.rushSurchargePercent > 0) {
    const minutes = (input.deliverAt.getTime() - input.invitedAt.getTime()) / 60_000
    if (minutes >= 0 && minutes <= policy.rushWithinMinutes) {
      const add = (before * policy.rushSurchargePercent) / 100
      lines.push({ label: `Đơn gấp (giao trong ${policy.rushWithinMinutes} phút): +${policy.rushSurchargePercent}%`, amountVnd: add })
      fee += add
    }
  }
  if (input.deliverAt && policy.peakSurchargePercent > 0) {
    const day = vnDay(input.deliverAt)
    if (policy.peakDays.includes(day.slice(5)) || policy.extraPeakDates.includes(day)) {
      const add = (before * policy.peakSurchargePercent) / 100
      lines.push({ label: `Ngày cao điểm: +${policy.peakSurchargePercent}%`, amountVnd: add })
      fee += add
    }
  }

  const rounded = Math.ceil(fee / policy.roundToVnd) * policy.roundToVnd
  if (rounded !== fee) lines.push({ label: `Làm tròn lên ${vnd(policy.roundToVnd)}`, amountVnd: rounded - fee })
  return { feeVnd: Math.max(0, rounded), lines: lines.map((l) => ({ ...l, amountVnd: Math.round(l.amountVnd) })) }
}

/** Phí Điều phối nhập tay có nằm trong biên độ cho phép quanh phí gợi ý không. */
export function craftFeeOverrideAllowed(policy: CraftFeePolicy, suggestedVnd: number, overrideVnd: number): boolean {
  if (overrideVnd < 0) return false
  const band = (suggestedVnd * policy.coordinatorAdjustPercent) / 100
  return overrideVnd >= suggestedVnd - band && overrideVnd <= suggestedVnd + band
}

export type CraftFeeDeductionKind = "LATE_DELIVERY" | "COMPLAINT"

export interface CraftFeeDeduction {
  kind: CraftFeeDeductionKind
  percent: number
  amountVnd: number
  reason: string
  at: string
}

/** Khoản trừ theo % đang cài; % = 0 → không trừ (trả `null`). */
export function craftFeeDeduction(
  policy: CraftFeePolicy,
  feeVnd: number,
  kind: CraftFeeDeductionKind,
  reason: string,
  at: Date
): CraftFeeDeduction | null {
  const percent = kind === "LATE_DELIVERY" ? policy.lateDeliveryDeductionPercent : policy.complaintDeductionPercent
  if (percent <= 0 || feeVnd <= 0) return null
  return { kind, percent, amountVnd: Math.round((feeVnd * percent) / 100), reason, at: at.toISOString() }
}

/** Số chi nhánh thực nhận: phí đã chốt trừ các khoản khấu trừ, không âm. */
export function craftFeePayable(feeVnd: number, deductions: readonly CraftFeeDeduction[]): number {
  return Math.max(0, feeVnd - deductions.reduce((sum, d) => sum + d.amountVnd, 0))
}

/** Khoá cấu hình trong `organizations.settings` (tiệm sửa qua Cài đặt → Phí gia công). */
export const CRAFT_FEE_POLICY_KEY = "craft_fee_policy"

/** Ngành không khai phí gia công (vd. homestay) mà vẫn điều phối: 50% giá trước VAT, không sàn/trần. */
const FALLBACK_SPEC: IndustryCraftFeeSpec = {
  feeLabel: "Phí gia công",
  defaultPercent: 50,
  minVnd: 0,
  maxVnd: 1e10,
  partnerPercent: 70,
  complexityLabels: { EASY: "Dễ", MEDIUM: "Vừa", HARD: "Khó" },
  laborByComplexityVnd: { EASY: 0, MEDIUM: 0, HARD: 0 },
  peakDays: [],
}

export function craftFeeSpecOf(settings: Record<string, unknown>): { spec: IndustryCraftFeeSpec; industryHasCraftFee: boolean } {
  const plugin = getIndustryPlugin(typeof settings.industry === "string" ? settings.industry : null)
  return { spec: plugin.craftFee ?? FALLBACK_SPEC, industryHasCraftFee: plugin.craftFee !== null }
}

export function craftFeePolicyOf(settings: Record<string, unknown>): CraftFeePolicy {
  return parseCraftFeePolicy(settings[CRAFT_FEE_POLICY_KEY], craftFeeSpecOf(settings).spec)
}
