import type { SubcontractOrderState } from "@/modules/greeting-card/domain/subcontract-order"
import { classifyForBranch } from "@/modules/greeting-card/use-cases/branch-portal"
import type { InternalChatMessage } from "../domain/chat-entities"
import type { SubcontractCardPayload, SubcontractCardView } from "../domain/subcontract-card"

export interface SubcontractCardFacts {
  orderStatus: string
  productionStatus: string
  deliveryStatus: string
  state: SubcontractOrderState | null
  /** Cửa hàng đối tác mà mã ứng viên trên thẻ đại diện (null = chi nhánh nội bộ) */
  branchPartnerOrgId: string | null
  /** `shared_order_access` của ứng viên còn hiệu lực — Thẻ Gia Công mở được */
  hasShare: boolean
}

export interface SubcontractCardSource {
  /** Khoá kết quả: `<mã đơn>|<mã ứng viên>` */
  load(chainOrgId: string, cards: Array<{ orderCode: string; branchCode: string }>): Promise<Map<string, SubcontractCardFacts>>
}

export interface CardViewer {
  organizationId: string
  /** Có mã `S2` (nhận và cập nhật đơn gia công) */
  canFulfil: boolean
}

/** Dựng link Thẻ Gia Công đã ký cho đúng ứng viên — truyền từ ngoài để use-case không phụ thuộc khoá ký. */
export type CardUrlSigner = (input: { chainOrgId: string; orderCode: string; branchCode: string }) => string

/**
 * Thẻ đơn gia công trong phòng trao đổi chỉ PHẢN CHIẾU trạng thái thật (PO P1, P3): mỗi lần đọc tính lại giai đoạn
 * theo góc nhìn của ứng viên được mời (cùng luật với `/cua-hang` — `classifyForBranch`). Nút thao tác mở Thẻ Gia Công
 * có sẵn — Nhận, Chốt, ảnh thành phẩm, shipper, ảnh bàn giao chạy y như link Telegram (cùng kiểm ảnh, cùng duyệt).
 * Link chỉ cấp cho người của đúng cửa hàng đối tác được mời, có mã `S2`, khi đơn còn việc của cửa hàng đó.
 */
export function buildSubcontractCardView(
  payload: SubcontractCardPayload,
  facts: SubcontractCardFacts | undefined,
  context: { chainOrgId: string; viewer: CardViewer; sign: CardUrlSigner; now: Date }
): SubcontractCardView {
  if (!facts || !facts.state) return { stage: "CLOSED", closedReason: "EXPIRED", deadlineAt: null, productionStatus: null, deliveryStatus: null, actionUrl: null }
  const base = { productionStatus: facts.productionStatus, deliveryStatus: facts.deliveryStatus }
  if (facts.orderStatus === "CANCELLED") return { ...base, stage: "CLOSED", closedReason: "CANCELLED", deadlineAt: null, actionUrl: null }

  const view = classifyForBranch(facts.state, payload.branchCode, context.now)
  if (!view) {
    const takenByOther = Boolean(facts.state.claimedBranchId && facts.state.claimedBranchId !== payload.branchCode)
    const done = facts.orderStatus === "COMPLETED" || facts.deliveryStatus === "DELIVERED"
    return { ...base, stage: "CLOSED", closedReason: takenByOther ? "TAKEN" : done ? "DONE" : "EXPIRED", deadlineAt: null, actionUrl: null }
  }
  if (facts.orderStatus === "COMPLETED" || facts.deliveryStatus === "DELIVERED") {
    return { ...base, stage: "CLOSED", closedReason: "DONE", deadlineAt: null, actionUrl: null }
  }

  const isAssignee = facts.branchPartnerOrgId === context.viewer.organizationId
  const actionUrl =
    isAssignee && context.viewer.canFulfil && facts.hasShare
      ? context.sign({ chainOrgId: context.chainOrgId, orderCode: payload.orderCode, branchCode: payload.branchCode })
      : null
  return { ...base, stage: view.stage, closedReason: null, deadlineAt: view.deadlineAt, actionUrl }
}

/** Gắn `subcontractView` vào các thẻ đơn gia công của một trang tin. Tin khác giữ nguyên. */
export async function attachSubcontractViews(
  messages: InternalChatMessage[],
  context: { chainOrgId: string; viewer: CardViewer; source: SubcontractCardSource; sign: CardUrlSigner; now?: Date | undefined }
): Promise<InternalChatMessage[]> {
  const cards = messages.filter((m) => m.messageType === "ACTION_CARD_SUBCONTRACT")
  if (cards.length === 0) return messages
  const payloadOf = (m: InternalChatMessage) => m.actionPayload as unknown as SubcontractCardPayload
  const facts = await context.source.load(
    context.chainOrgId,
    cards.map((m) => ({ orderCode: payloadOf(m).orderCode, branchCode: payloadOf(m).branchCode }))
  )
  const now = context.now ?? new Date()
  return messages.map((m) => {
    if (m.messageType !== "ACTION_CARD_SUBCONTRACT") return m
    const payload = payloadOf(m)
    const view = buildSubcontractCardView(payload, facts.get(`${payload.orderCode}|${payload.branchCode}`), { chainOrgId: context.chainOrgId, viewer: context.viewer, sign: context.sign, now })
    return { ...m, subcontractView: view }
  })
}
