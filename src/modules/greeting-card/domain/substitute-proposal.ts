/**
 * Đề xuất mẫu thay thế (tình huống #18, 08/10/2026): tiệm không làm được mẫu khách chọn (hết hoa,
 * hoa kém) → nhân viên đề xuất 1–3 mẫu khác trong cùng bộ sưu tập kèm lý do → khách chọn trên trang
 * theo dõi: lấy một mẫu / để tiệm chọn mẫu tương đương / xin huỷ đơn. Lưu lại câu trả lời + thời điểm
 * làm bằng chứng khách đã đồng ý. Tổng tiền giữ nguyên (khung thoả thuận "ưu tiên hoa tương đương
 * hoặc giá trị cao hơn"); hoàn tiền, nếu có, đi luồng huỷ/hoàn hiện có. Pure TypeScript.
 */

export const SUBSTITUTE_MAX_OPTIONS = 3
export const SUBSTITUTE_REASON_MIN = 5
export const SUBSTITUTE_REASON_MAX = 500
export const SUBSTITUTE_NOTE_MAX = 300

export type SubstituteStatus = "PENDING" | "ANSWERED"
export type SubstituteChoice = "OPTION" | "SHOP_DECIDES" | "CANCEL"

export const SUBSTITUTE_CHOICE_LABEL: Record<SubstituteChoice, string> = {
  OPTION: "Khách chọn mẫu thay thế",
  SHOP_DECIDES: "Khách nhờ tiệm chọn mẫu tương đương",
  CANCEL: "Khách xin huỷ đơn",
}

export interface SubstituteOption {
  productId: string
  code: string
  name: string
  imageUrl: string | null
  driveLink: string | null
  priceVnd: number
}

export interface SubstituteProduct {
  productId: string
  name: string
}

export interface SubstitutePayload {
  status: SubstituteStatus
  reason: string
  original: SubstituteProduct
  options: SubstituteOption[]
  proposedBy: string
  proposedAt: string
  choice?: SubstituteChoice | undefined
  chosenProductId?: string | undefined
  customerNote?: string | undefined
  answeredAt?: string | undefined
}

interface OrderState {
  status: string
  deliveryStatus: string
}

/** Đổi mẫu chỉ còn ý nghĩa khi hoa chưa rời tiệm. */
export function substituteLockReason(o: OrderState): string | null {
  if (o.status === "CANCELLED") return "Đơn đã huỷ."
  if (o.status === "COMPLETED" || o.status === "DELIVERED" || o.deliveryStatus === "DELIVERED") return "Đơn đã giao xong."
  if (o.deliveryStatus === "DISPATCHED" || o.deliveryStatus === "DELIVERING") return "Hoa đã giao cho shipper."
  return null
}

export interface ProposalInput {
  reason: string
  productIds: readonly string[]
}

export type ProposalResult =
  | { ok: true; reason: string; options: SubstituteOption[] }
  | { ok: false; errors: Record<string, string> }

/**
 * Kiểm đề xuất: lý do đủ rõ; 1–3 mẫu khác nhau, có trong bộ sưu tập của đơn, khác mẫu đang đặt
 * và còn bán. `catalog` là các mẫu bộ sưu tập đã lọc còn bán (máy chủ tự dựng, không tin client).
 */
export function buildSubstituteProposal(
  input: ProposalInput,
  currentProductId: string,
  catalog: readonly SubstituteOption[],
): ProposalResult {
  const errors: Record<string, string> = {}
  const reason = input.reason.trim()
  if (reason.length < SUBSTITUTE_REASON_MIN) errors.reason = "Vui lòng ghi lý do cho khách hiểu (ít nhất 5 ký tự)."
  else if (reason.length > SUBSTITUTE_REASON_MAX) errors.reason = `Lý do tối đa ${SUBSTITUTE_REASON_MAX} ký tự.`

  const ids = [...new Set(input.productIds.map((id) => id.trim()).filter(Boolean))]
  const byId = new Map(catalog.map((p) => [p.productId, p]))
  if (ids.length === 0) errors.productIds = "Chọn ít nhất một mẫu thay thế."
  else if (ids.length > SUBSTITUTE_MAX_OPTIONS) errors.productIds = `Chỉ đề xuất tối đa ${SUBSTITUTE_MAX_OPTIONS} mẫu.`
  else if (ids.includes(currentProductId)) errors.productIds = "Mẫu thay thế phải khác mẫu khách đã chọn."
  else if (ids.some((id) => !byId.has(id))) errors.productIds = "Có mẫu không còn trong bộ sưu tập hoặc đã hết hàng."

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, reason, options: ids.map((id) => byId.get(id) as SubstituteOption) }
}

export interface ResponseInput {
  choice: string
  productId?: string | undefined
  note?: string | undefined
}

export type ResponseResult =
  | { ok: true; choice: SubstituteChoice; option: SubstituteOption | null; note: string }
  | { ok: false; errors: Record<string, string> }

export function buildSubstituteResponse(payload: SubstitutePayload, input: ResponseInput): ResponseResult {
  const errors: Record<string, string> = {}
  const note = (input.note ?? "").trim()
  if (note.length > SUBSTITUTE_NOTE_MAX) errors.note = `Ghi chú tối đa ${SUBSTITUTE_NOTE_MAX} ký tự.`
  const choice = input.choice as SubstituteChoice
  if (!Object.hasOwn(SUBSTITUTE_CHOICE_LABEL, choice)) errors.choice = "Vui lòng chọn một cách xử lý."
  let option: SubstituteOption | null = null
  if (choice === "OPTION") {
    option = payload.options.find((o) => o.productId === input.productId) ?? null
    if (!option) errors.productId = "Vui lòng chọn một mẫu trong các mẫu tiệm đề xuất."
  }
  if (choice === "CANCEL" && note.length === 0) errors.note = "Vui lòng cho tiệm biết lý do huỷ."
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, choice, option, note }
}

/** Dòng ghi vào ghi chú nội bộ của đơn để thợ cắm thấy ngay. */
export function substituteInternalNote(payload: SubstitutePayload, answer: { choice: SubstituteChoice; option: SubstituteOption | null; note: string }): string {
  const head =
    answer.choice === "OPTION" && answer.option
      ? `[Đổi mẫu] Khách đồng ý đổi "${payload.original.name}" sang "${answer.option.name}" (${answer.option.code}).`
      : answer.choice === "SHOP_DECIDES"
        ? `[Đổi mẫu] Khách nhờ tiệm chọn mẫu tương đương thay "${payload.original.name}".`
        : `[Đổi mẫu] Khách xin huỷ đơn vì không làm được "${payload.original.name}".`
  return answer.note ? `${head} Ghi chú của khách: ${answer.note}` : head
}

export interface CustomerSubstituteView {
  id: string
  status: SubstituteStatus
  reason: string
  originalName: string
  options: Array<Pick<SubstituteOption, "productId" | "name" | "imageUrl" | "driveLink" | "priceVnd">>
  proposedAt: string
  choice: SubstituteChoice | null
  choiceLabel: string | null
  chosenName: string | null
  answeredAt: string | null
}

/** Bản cho trang theo dõi: bỏ mã nội bộ, người đề xuất. */
export function substituteForCustomer(id: string, p: SubstitutePayload): CustomerSubstituteView {
  const chosen = p.options.find((o) => o.productId === p.chosenProductId)
  return {
    id,
    status: p.status,
    reason: p.reason,
    originalName: p.original.name,
    options: p.options.map(({ productId, name, imageUrl, driveLink, priceVnd }) => ({ productId, name, imageUrl, driveLink, priceVnd })),
    proposedAt: p.proposedAt,
    choice: p.choice ?? null,
    choiceLabel: p.choice ? SUBSTITUTE_CHOICE_LABEL[p.choice] : null,
    chosenName: chosen?.name ?? null,
    answeredAt: p.answeredAt ?? null,
  }
}

export function readSubstitutePayload(raw: unknown): SubstitutePayload | null {
  if (!raw || typeof raw !== "object") return null
  const p = raw as Partial<SubstitutePayload>
  if ((p.status !== "PENDING" && p.status !== "ANSWERED") || !Array.isArray(p.options) || !p.original) return null
  return p as SubstitutePayload
}
