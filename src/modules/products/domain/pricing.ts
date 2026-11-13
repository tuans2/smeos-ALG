/**
 * Công thức giá — M02, P6. Thu hoạch R3 từ `FloraOS/floraos-web/src/lib/pricing.ts`
 * (227 dòng, hạng REUSE — `HARVEST_MANIFEST.md`), viết lại tên định danh sang
 * tiếng Anh theo quy ước `AGENTS.md` ("mã nguồn tiếng Anh"). Không import
 * Prisma — luật nghiệp vụ thuần, test không cần cơ sở dữ liệu.
 *
 * So với bản gốc, tệp này KHÔNG mang theo hai phần:
 *  - Nhánh "giá đã chào cho một đối tác cụ thể" (`giaChaoDoiTac`/`theoDoiTac`)
 *    và `quetLoDuLieu` (quét lộ dữ liệu khách trong ghi chú đơn) — cả hai
 *    thuộc luồng "thẻ chào giá" (nhóm năng lực `pricing_card`, C1–C28, đã có
 *    sẵn trong `capability-catalog.ts` nhưng KHÔNG nằm trong phạm vi PRD/
 *    Checklist của P6, đã xác nhận với chủ sản phẩm 09/10). Xem
 *    `TECHNICAL_DEBT.md` #26.
 *  - Sàn/Trần: tách hẳn sang `price-guard.ts`, đúng ranh giới module mà bản
 *    gốc đã tự vẽ ("`lib/sanTran` lo phần tra số; tệp này lo phần đối soát").
 *
 * `effectiveCostVnd` (giá vốn hiệu lực) là THAM SỐ đầu vào, không phải giá
 * trị tính trong tệp này — giống hệt bản gốc (`vao.giaVonHieuLuc`). Nguồn của
 * con số ấy (từ `gia_von.py`, REUSE nhưng chưa xếp vào đợt harvest H1–H10
 * nào) nằm ngoài phạm vi P6, ghi ở `TECHNICAL_DEBT.md` #26.
 */

/** Làm tròn LÊN hàng nghìn — giá vốn không bao giờ bị đọc thấp hơn giá trị thật. */
export function roundUpToThousand(value: number): number {
  return Math.ceil((Number(value) || 0) / 1000) * 1000
}

/** Làm tròn NỬA LÊN hàng nghìn — phải khớp `round_half_up_thousand` phía nào
 *  dùng lại luật này bằng ngôn ngữ khác (bản gốc khớp với `template_validator.py`). */
export function roundHalfToThousand(value: number): number {
  return Math.round((Number(value) || 0) / 1000) * 1000
}

/** Hệ số thưởng theo hạng đối tác, vd `{ Growth: 0, Certified: 0.05, Premium: 0.1 }`. */
export type PartnerTierBonus = Record<string, number>

export interface SurchargeOption {
  label: string
  value: number
}

export interface SurchargeGroup {
  id: string
  name: string
  options: SurchargeOption[]
}

/** id nhóm phụ phí → số tiền đã chọn (VNĐ). */
export type SelectedSurcharges = Record<string, number>

/** Cấu hình giá hiệu lực của một tổ chức (có thể theo chi nhánh) — nguồn ở `pricing-rules.ts`. */
export interface PricingConfig {
  partnerTierBonus: PartnerTierBonus
  surchargeGroups: SurchargeGroup[]
  /** Tỷ lệ giá tối ưu / giá bán, mặc định 0.5. */
  optimalPriceRatio: number
}

export interface PriceQuoteInput {
  /** Giá vốn hiệu lực — đầu vào, không tính trong tệp này. */
  effectiveCostVnd: number
  partnerTier: string
  selectedSurcharges: SelectedSurcharges
  otherSurchargeVnd: number
  listPriceVnd: number
  /** Giá nhân viên đã chốt tay — thay thế mốc `listPriceVnd` khi có, giống `giaChot` bản gốc. */
  closedPriceVnd?: number | null | undefined
  /** Tỷ lệ cọc, phần trăm (0–100). Mặc định 100 — trả đủ. */
  depositPercent?: number | undefined
}

export interface SurchargeLine {
  label: string
  amountVnd: number
}

export interface PriceQuoteResult {
  costVnd: number
  tierBonusVnd: number
  hotBonusVnd: number
  totalVnd: number
  listPriceVnd: number
  optimalPriceVnd: number
  /** Tỷ lệ giá tối ưu, tính theo phần trăm nguyên — dùng lại trong `checkPriceInvariants`. */
  optimalPriceRatioPercent: number
  /** Hệ số thưởng theo hạng, tính theo phần trăm nguyên — dùng lại trong `checkPriceInvariants`. */
  tierBonusRatioPercent: number
  surcharges: SurchargeLine[]
  depositPercent: number
  depositVnd: number
  remainingVnd: number
}

/**
 * Tính toàn bộ khối tiền của một lượt báo giá. Nguồn duy nhất cho mọi con số
 * tiền — không route hay use-case nào được tự cộng trừ lại.
 *
 * Làm tròn đặt tại TỪNG CẤU PHẦN (giá vốn, thưởng), không đặt ở tổng — tổng
 * cộng lại từ các cấu phần đã tròn, để `checkPriceInvariants` luôn khớp.
 */
export function quotePrice(input: PriceQuoteInput, config: PricingConfig): PriceQuoteResult {
  const costVnd = roundUpToThousand(input.effectiveCostVnd)

  let listPriceVnd = Number(input.listPriceVnd) || 0
  if (input.closedPriceVnd && input.closedPriceVnd > 0) listPriceVnd = input.closedPriceVnd
  const optimalPriceRatio = config.optimalPriceRatio || 0
  const optimalPriceVnd = listPriceVnd * optimalPriceRatio

  const tierBonusRatio = config.partnerTierBonus[input.partnerTier] ?? 0
  const tierBonusVnd = roundHalfToThousand(costVnd * tierBonusRatio)

  const surcharges: SurchargeLine[] = []
  let hotBonusVnd = 0
  for (const group of config.surchargeGroups) {
    const amount = Number(input.selectedSurcharges[group.id]) || 0
    if (amount <= 0) continue
    hotBonusVnd += amount
    const option = group.options.find((o) => o.value === amount)
    surcharges.push({ label: option ? `${group.name} (${option.label})` : group.name, amountVnd: amount })
  }
  const otherSurchargeVnd = Number(input.otherSurchargeVnd) || 0
  if (otherSurchargeVnd > 0) {
    hotBonusVnd += otherSurchargeVnd
    surcharges.push({ label: "Hỗ trợ đặc biệt", amountVnd: otherSurchargeVnd })
  }

  // Từng cấu phần đã là bội số 1.000 nên tổng cũng là bội số 1.000.
  const totalVnd = costVnd + tierBonusVnd + hotBonusVnd

  const depositPercent = input.depositPercent ?? 100
  const depositVnd = Math.round(costVnd * (depositPercent / 100))
  const remainingVnd = costVnd - depositVnd

  return {
    costVnd,
    tierBonusVnd,
    hotBonusVnd,
    totalVnd,
    listPriceVnd,
    optimalPriceVnd,
    optimalPriceRatioPercent: Math.round(optimalPriceRatio * 100),
    tierBonusRatioPercent: Math.round(tierBonusRatio * 100),
    surcharges,
    depositPercent,
    depositVnd,
    remainingVnd,
  }
}

/**
 * Bất biến số học — chốt chặn cuối trước khi một kết quả giá được coi là hợp
 * lệ. Thu hoạch R4 ("bất biến làm tròn từng cấu phần", `HARVEST_MANIFEST.md`).
 *
 * Bản gốc chạy CÙNG một luật ở hai nơi khác ngôn ngữ (`pricing.ts` phía trình
 * duyệt ↔ `template_validator.py` phía dịch vụ in thẻ) để hai nơi không lệch
 * kết luận. `floraos-core` không có một dịch vụ Python nào nằm trên đường đi
 * của phép tính giá (M02 không đụng `workers/`, chỉ M01/M04a mới gọi Python) —
 * nên "hai phía" ở đây là hai CHIỀU của cùng một phép tính trong cùng một
 * ngôn ngữ: `quotePrice` tính xuôi, `checkPriceInvariants` đối chiếu ngược —
 * không phải hai bản dịch song song như bản gốc. Bộ test của tệp này (và
 * `pricing.test.ts`) phủ cả hai chiều, đúng tinh thần "test hai phía xanh"
 * của `Checklist_Thuc_Thi.md` mục P6.
 *
 * Trả về mảng rỗng nghĩa là đạt.
 */
export function checkPriceInvariants(result: PriceQuoteResult): string[] {
  const problems: string[] = []

  const totalSurchargeVnd = result.surcharges.reduce((sum, line) => sum + line.amountVnd, 0)
  if (Math.abs(result.totalVnd - (result.costVnd + result.tierBonusVnd + totalSurchargeVnd)) > 1) {
    problems.push("Tổng shop nhận không bằng Giá vốn hiệu lực + Thưởng theo hạng + Hotbonus.")
  }

  if (Math.abs(result.costVnd - (result.depositVnd + result.remainingVnd)) > 1) {
    problems.push("Cọc + Còn lại không bằng Giá vốn hiệu lực.")
  }

  const expectedTierBonusVnd = roundHalfToThousand(
    (result.costVnd * result.tierBonusRatioPercent) / 100
  )
  if (Math.abs(result.tierBonusVnd - expectedTierBonusVnd) > 1) {
    problems.push(`Thưởng theo hạng không bằng Giá vốn hiệu lực × ${result.tierBonusRatioPercent}%.`)
  }

  return problems
}
