/**
 * Luật lượt sinh phương án (PO 08/11/2026): lượt đầu luôn 3 phương án, miễn phí; mỗi lần "Tạo thêm" sinh
 * 1 phương án và trừ credit theo cấu hình Console (`credit_pricing.brandExtraOptionCredit`, mặc định 1).
 * Hồ sơ đổi sau lượt sinh → được tạo lại một lượt 3 phương án mới, miễn phí (lượt cũ vẫn giữ để xem lại).
 * Mọi vòng sinh có trần. Thuần — không import hạ tầng.
 */
import { styleForIndex, variantForIndex, type BrandStyleKey } from "./brand-styles"

export const BRAND_OPTION_KINDS = ["IDENTITY", "LANDING"] as const
export type BrandOptionKind = (typeof BRAND_OPTION_KINDS)[number]

export const INITIAL_OPTION_COUNT = 3
/** Trần phương án trong một lượt (3 gốc + tạo thêm) */
export const MAX_OPTIONS_PER_BATCH = 15
/** Trần số lượt tạo lại miễn phí do hồ sơ đổi */
export const MAX_BATCHES = 10

/** Khoá feature của job tạo thêm — một lần bấm = một lần thu. */
export const EXTRA_OPTION_FEATURE: Readonly<Record<BrandOptionKind, string>> = {
  IDENTITY: "brand.identity.extra_option",
  LANDING: "brand.landing.extra_option",
}

export type GenerationMode = "initial" | "extra" | "refresh"

export interface BatchState {
  /** Số lượt đã có (0 = chưa sinh lần nào) */
  readonly batchCount: number
  /** Số phương án trong lượt mới nhất */
  readonly latestBatchSize: number
  /** Dấu hồ sơ hiện tại khác dấu lúc sinh lượt mới nhất */
  readonly profileChanged: boolean
}

export type Slot = { readonly style: BrandStyleKey; readonly variant: number }

export type GenerationPlan =
  | { readonly ok: true; readonly batch: number; readonly paid: boolean; readonly slots: readonly Slot[] }
  | { readonly ok: false; readonly reason: string }

const initialSlots = (): Slot[] =>
  Array.from({ length: INITIAL_OPTION_COUNT }, (_, i) => ({ style: styleForIndex(i), variant: variantForIndex(i) }))

export function planGeneration(state: BatchState, mode: GenerationMode): GenerationPlan {
  if (mode === "initial") {
    if (state.batchCount > 0) return { ok: false, reason: "Đã có 3 phương án — chọn một phương án hoặc tạo thêm" }
    return { ok: true, batch: 1, paid: false, slots: initialSlots() }
  }
  if (state.batchCount === 0) return { ok: false, reason: "Chưa có phương án nào — hãy tạo 3 phương án đầu tiên" }
  if (mode === "refresh") {
    if (!state.profileChanged) return { ok: false, reason: "Hồ sơ chưa thay đổi kể từ lần tạo gần nhất" }
    if (state.batchCount >= MAX_BATCHES) return { ok: false, reason: "Đã đạt số lần tạo lại tối đa" }
    return { ok: true, batch: state.batchCount + 1, paid: false, slots: initialSlots() }
  }
  if (state.latestBatchSize >= MAX_OPTIONS_PER_BATCH) return { ok: false, reason: "Đã đạt số phương án tối đa" }
  const i = state.latestBatchSize
  return { ok: true, batch: state.batchCount, paid: true, slots: [{ style: styleForIndex(i), variant: variantForIndex(i) }] }
}
