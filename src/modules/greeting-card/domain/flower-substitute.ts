/**
 * Đổi một loại hoa phụ (checklist ALG 5.14): tiệm thiếu một loại hoa không phải hoa chủ đạo → chụp
 * ảnh hoa thay thế, ghi lý do → khách đồng ý / không đồng ý trên trang theo dõi → đồng ý thì công thức
 * cắm của đơn đổi đúng dòng hoa đó, tổng tiền giữ nguyên. Hành trình ảnh (PO Q12): chặng 01 Tải ảnh,
 * 02 Nhận diện (kho ảnh kiểm tệp ảnh thuộc tiệm), 09 Chủ shop duyệt (nhân viên có quyền gửi) — không
 * sinh nội dung AI, không trừ credit. Pure TypeScript.
 */

export const FLOWER_REASON_MIN = 5
export const FLOWER_REASON_MAX = 500
export const FLOWER_NAME_MAX = 80
export const FLOWER_NOTE_MAX = 300

/** Hoa chủ đạo quyết định mẫu — thiếu hoa chủ đạo thì đi luồng đổi cả mẫu. */
export const MAIN_FLOWER_ROLE = "Chủ đạo"

export type FlowerChoice = "ACCEPT" | "DECLINE"

export const FLOWER_CHOICE_LABEL: Record<FlowerChoice, string> = {
  ACCEPT: "Khách đồng ý đổi hoa",
  DECLINE: "Khách không đồng ý đổi hoa",
}

export interface FlowerLine {
  index: number
  flowerName: string
  quantity: number
  unit: string | null
  color: string | null
  role: string | null
}

export interface FlowerSubstitutePayload {
  kind: "FLOWER"
  status: "PENDING" | "ANSWERED"
  reason: string
  productName: string
  line: FlowerLine
  replacement: { flowerName: string; color: string | null; photoAssetId: string }
  proposedBy: string
  proposedAt: string
  choice?: FlowerChoice | undefined
  customerNote?: string | undefined
  answeredAt?: string | undefined
}

type Loose = Record<string, unknown>
const obj = (v: unknown): Loose => (v && typeof v === "object" && !Array.isArray(v) ? (v as Loose) : {})
const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null)

/** Các dòng hoa trong công thức của đơn (metadata dòng hàng), giữ đúng vị trí. */
export function orderFlowerLines(metadata: unknown): FlowerLine[] {
  const flowers = obj(metadata).flowers
  if (!Array.isArray(flowers)) return []
  return flowers.flatMap((raw, index) => {
    const f = obj(raw)
    const flowerName = text(f.flowerName)
    if (!flowerName) return []
    return [{ index, flowerName, quantity: typeof f.quantity === "number" ? f.quantity : 0, unit: text(f.unit), color: text(f.color), role: text(f.role) }]
  })
}

/** Dòng tiệm được đề xuất đổi: mọi dòng trừ hoa chủ đạo. */
export function secondaryFlowerLines(metadata: unknown): FlowerLine[] {
  return orderFlowerLines(metadata).filter((l) => l.role !== MAIN_FLOWER_ROLE)
}

export interface FlowerProposalInput {
  reason: string
  lineIndex: number
  replacementName: string
  replacementColor?: string | undefined
  photoAssetId: string
}

export type FlowerProposalResult =
  | { ok: true; reason: string; line: FlowerLine; replacement: FlowerSubstitutePayload["replacement"] }
  | { ok: false; errors: Record<string, string> }

/** `photoOk` = ảnh thuộc đúng tiệm và là tệp ảnh (máy chủ tự kiểm, không tin client). */
export function buildFlowerProposal(input: FlowerProposalInput, metadata: unknown, photoOk: boolean): FlowerProposalResult {
  const errors: Record<string, string> = {}
  const reason = input.reason.trim()
  if (reason.length < FLOWER_REASON_MIN) errors.reason = "Vui lòng ghi lý do cho khách hiểu (ít nhất 5 ký tự)."
  else if (reason.length > FLOWER_REASON_MAX) errors.reason = `Lý do tối đa ${FLOWER_REASON_MAX} ký tự.`
  const all = orderFlowerLines(metadata)
  const line = all.find((l) => l.index === input.lineIndex)
  if (!line) errors.lineIndex = "Chọn thành phần cần đổi trong công thức của đơn."
  else if (line.role === MAIN_FLOWER_ROLE) errors.lineIndex = "Hoa chủ đạo không đổi được ở đây — hãy đề xuất đổi cả mẫu."
  const name = input.replacementName.trim()
  if (name.length < 2 || name.length > FLOWER_NAME_MAX) errors.replacementName = `Tên hoa thay thế cần từ 2 đến ${FLOWER_NAME_MAX} ký tự.`
  else if (line && name.toLowerCase() === line.flowerName.toLowerCase()) errors.replacementName = "Hoa thay thế phải khác hoa đang dùng."
  if (!photoOk) errors.photoAssetId = "Vui lòng chụp ảnh hoa thay thế để khách xem."
  if (Object.keys(errors).length > 0 || !line) return { ok: false, errors }
  const color = input.replacementColor?.trim() ? input.replacementColor.trim().slice(0, 40) : null
  return { ok: true, reason, line, replacement: { flowerName: name, color, photoAssetId: input.photoAssetId } }
}

export type FlowerResponseResult = { ok: true; choice: FlowerChoice; note: string } | { ok: false; errors: Record<string, string> }

export function buildFlowerResponse(input: { choice: string; note?: string | undefined }): FlowerResponseResult {
  const note = (input.note ?? "").trim()
  const errors: Record<string, string> = {}
  if (input.choice !== "ACCEPT" && input.choice !== "DECLINE") errors.choice = "Vui lòng chọn đồng ý hoặc không đồng ý."
  if (note.length > FLOWER_NOTE_MAX) errors.note = `Ghi chú tối đa ${FLOWER_NOTE_MAX} ký tự.`
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, choice: input.choice as FlowerChoice, note }
}

/**
 * Công thức mới của đơn khi khách đồng ý: chỉ dòng được đề xuất đổi tên/màu, giữ số lượng, đơn vị,
 * vai trò; ghi lại hoa cũ để thợ cắm và báo cáo biết. Dòng đã đổi khác bản đề xuất → null (không ghi đè).
 */
export function applyFlowerSubstitution(metadata: unknown, payload: FlowerSubstitutePayload): Loose | null {
  const meta = obj(metadata)
  const flowers = Array.isArray(meta.flowers) ? [...meta.flowers] : []
  const current = obj(flowers[payload.line.index])
  if (text(current.flowerName) !== payload.line.flowerName) return null
  flowers[payload.line.index] = {
    ...current,
    flowerName: payload.replacement.flowerName,
    color: payload.replacement.color ?? current.color ?? null,
    substitutedFrom: { flowerName: payload.line.flowerName, color: payload.line.color, answeredAt: payload.answeredAt ?? null },
  }
  return { ...meta, flowers }
}

/** Dòng ghi chú nội bộ để thợ cắm thấy ngay. */
export function flowerInternalNote(payload: FlowerSubstitutePayload, answer: { choice: FlowerChoice; note: string }): string {
  const head = answer.choice === "ACCEPT"
    ? `[Đổi hoa] Khách đồng ý thay "${payload.line.flowerName}" bằng "${payload.replacement.flowerName}" (${payload.line.quantity}${payload.line.unit ? ` ${payload.line.unit}` : ""}).`
    : `[Đổi hoa] Khách không đồng ý thay "${payload.line.flowerName}" — cửa hàng liên hệ khách trước khi cắm.`
  return answer.note ? `${head} Ghi chú của khách: ${answer.note}` : head
}

export interface CustomerFlowerView {
  id: string
  status: "PENDING" | "ANSWERED"
  reason: string
  productName: string
  originalFlower: string
  replacementFlower: string
  replacementColor: string | null
  photoUrl: string | null
  proposedAt: string
  choice: FlowerChoice | null
  choiceLabel: string | null
  answeredAt: string | null
}

/** Bản cho trang theo dõi: bỏ người đề xuất và mã ảnh nội bộ. */
export function flowerForCustomer(id: string, p: FlowerSubstitutePayload, photoUrl: string | null): CustomerFlowerView {
  return {
    id, status: p.status, reason: p.reason, productName: p.productName,
    originalFlower: p.line.flowerName, replacementFlower: p.replacement.flowerName, replacementColor: p.replacement.color,
    photoUrl, proposedAt: p.proposedAt, choice: p.choice ?? null, choiceLabel: p.choice ? FLOWER_CHOICE_LABEL[p.choice] : null,
    answeredAt: p.answeredAt ?? null,
  }
}

export function readFlowerPayload(raw: unknown): FlowerSubstitutePayload | null {
  const p = obj(raw)
  if (p.kind !== "FLOWER" || (p.status !== "PENDING" && p.status !== "ANSWERED")) return null
  const line = obj(p.line)
  const replacement = obj(p.replacement)
  if (typeof line.index !== "number" || !text(line.flowerName) || !text(replacement.flowerName) || !text(replacement.photoAssetId)) return null
  return p as unknown as FlowerSubstitutePayload
}
