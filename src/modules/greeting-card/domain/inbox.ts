/**
 * Hộp việc: gom "cần làm", "tin nhắn", "cập nhật" của một người về một chỗ, theo vai.
 * Pure TypeScript — nhận dữ liệu đã đọc, không truy vấn.
 */
import type { MessageRole } from "./internal-message"
import type { StuckInfo } from "./step-sla"
import type { TrackingPipelineStepId } from "./tracking-pipeline-types"
import type { ChangeItem } from "./order-change-request"

/** Tab nơi xử lý việc đó trên trang Thẻ chào. */
export type InboxTab = "payment" | "sales" | "coordinator" | "tracking"

export interface InboxAction {
  id: string
  kind:
    | "STUCK"
    | "CONFIRM_PAYMENT"
    | "QUOTE"
    | "ASSIGN"
    | "UNMATCHED_PAYMENTS"
    | "DISCOUNT"
    | "CHANGE_REQUEST"
    | "REDELIVER"
    | "CANCELLATION_REQUEST"
    | "REMIND_BALANCE_PAYMENT"
    | "WAITING_SECOND_PAYMENT"
    | "COLLECT_POST_DELIVERY_BALANCE"
    | "FOLLOW_UP_LEAD"
    | "REMIND_DEPOSIT"
    | "CLAIM_ORDER"
    | "SEND_PHOTO_QC"
    | "DELIVERY_FAILED_SALE_CONTACT"
    | "CHECK_ARRANGING_PROGRESS"
    | "QC_INSPECTION"
    | "ASSIGN_SHIPPER"
    | "CANCELLATION_FOLLOW_UP"
    | "PRODUCT_PROPOSALS"
    | "MISSING_INFO"
  title: string
  detail: string
  orderId: string | null
  sessionId: string | null
  customerName: string | null
  imageUrl: string | null
  tab: InboxTab
  /** Càng lớn càng gấp — kẹt quá lâu lên đầu. */
  urgency: number
  /** Việc nằm ngoài màn Thẻ Chào (vd. duyệt mẫu sản phẩm) — mở thẳng đường dẫn này. */
  href?: string | undefined
  /** Chỉ với DISCOUNT: để Điều hành duyệt/từ chối ngay trong Hộp việc. */
  discount?: {
    requestId: string
    requester: string
    reason: string
    baseTotalVnd: number
    requestedVnd: number
    percent: number | null
    maxPercent: number
  } | undefined
  /** Chỉ với CANCELLATION_FOLLOW_UP: đơn hệ thống tự huỷ, Điều hành xác nhận đã hoàn tiền / liên hệ khách. */
  followUp?: { requestId: string; refundDueVnd: number; reason: string } | undefined
  /** Chỉ với CHANGE_REQUEST: khách xin đổi gì — duyệt/từ chối ngay trong Hộp việc. */
  change?: {
    requestId: string
    changes: ChangeItem[]
    note: string | null
    expectedFeeDeltaVnd: number
    requestedAt: string
  } | undefined
}

export interface PipelineLike {
  id: string
  type: "ORDER" | "SESSION"
  orderId?: string | null | undefined
  sessionId: string
  orderCode?: string | null | undefined
  sendCode: string
  customerName: string
  productName: string
  productImageUrl?: string | null | undefined
  totalVnd: number
  paidVnd?: number | undefined
  balanceVnd?: number | undefined
  currentStepId: TrackingPipelineStepId
  currentStepTitle: string
  productionStatus?: string | null | undefined
  deliveryStatus?: string | null | undefined
  stepStartedAt: string
  stuck: StuckInfo | null
  saleId: string | null
  coordinatorId?: string | null | undefined
  /** Lần giao gần nhất không thành công — chờ Điều phối giao lại */
  deliveryFailed?: boolean | undefined
  sessionStatus?: string | null | undefined
  customerReportedPaid?: boolean | undefined
}

const TAB_OF_ROLE: Record<MessageRole, InboxTab> = { ADMIN: "payment", SALE: "sales", COORDINATOR: "coordinator" }
const COORDINATOR_STEPS = new Set<TrackingPipelineStepId>(["STEP_5_PAYMENT_CONFIRMED", "STEP_6_ARRANGING", "STEP_7_READY_QC", "STEP_8_DELIVERING", "STEP_9_COMPLETED"])
const code = (i: PipelineLike) => (i.orderCode ? `Đơn ${i.orderCode}` : `Link ${i.sendCode}`)
/** Dùng chung cho Điều hành và Sale — cùng một việc, tránh lệch câu chữ giữa 2 vai. */
const COLLECT_POST_DELIVERY_TITLE = "Thu phần tiền còn lại sau giao"

/** Việc cần làm của một vai từ quy trình theo dõi. */
export function inboxActions(items: PipelineLike[], role: MessageRole, userId: string): InboxAction[] {
  const out: InboxAction[] = []

  for (const i of items) {
    const isMySale = i.saleId === userId
    const isUnassignedSale = i.type === "ORDER" && (!i.saleId || i.saleId === "public") && i.currentStepId !== "STEP_9_COMPLETED"
    
    // Lọc theo vai trò: Sale chỉ nhận đơn của mình hoặc đơn chưa có người phụ trách
    if (role === "SALE" && !isMySale && !isUnassignedSale) continue

    const base = { orderId: i.orderId ?? null, sessionId: i.sessionId || null, customerName: i.customerName, imageUrl: i.productImageUrl ?? null }

    if (i.stuck?.owner === role) {
      out.push({ ...base, id: `stuck:${i.id}`, kind: "STUCK", title: i.stuck.message, detail: `${code(i)} · ${i.productName}`, tab: TAB_OF_ROLE[role], urgency: 1000 + i.stuck.overdueMinutes })
      continue
    }

    const paid = i.paidVnd ?? 0
    const total = i.totalVnd
    const balance = i.balanceVnd ?? Math.max(0, total - paid)
    const hasDeposit = paid > 0 && balance > 0
    const isReady = (i.productionStatus === "READY" || i.currentStepId === "STEP_7_READY_QC") && i.currentStepId !== "STEP_3_FILLING_FORM" && i.currentStepId !== "STEP_4_PAYMENT_PENDING"
    const isDelivered = i.deliveryStatus === "DELIVERED" || i.currentStepId === "STEP_9_COMPLETED"
    const isReported = Boolean(i.customerReportedPaid || i.sessionStatus === "PAYMENT_REPORTED")
    // Đã giao mà còn nợ — kể cả đơn chưa thu đồng nào (PO 15/10/2026, mục 3)
    const deliveredWithDebt = i.type === "ORDER" && isDelivered && total > 0 && balance > 0

    // --- 1. NGHIỆP VỤ ĐIỀU HÀNH (ADMIN) ---
    if (role === "ADMIN") {
      if (i.type === "ORDER" && hasDeposit && isReported) {
        out.push({
          ...base,
          id: `approve-balance-pay:${i.id}`,
          kind: "CONFIRM_PAYMENT",
          title: "Khách báo đã chuyển phần còn lại",
          detail: `${code(i)} · Cần xác nhận số tiền ${balance.toLocaleString("vi-VN")} đ`,
          tab: "payment",
          urgency: 1200,
        })
      } else if (i.type === "ORDER" && i.totalVnd <= 0 && i.currentStepId !== "STEP_9_COMPLETED") {
        out.push({ ...base, id: `quote:${i.id}`, kind: "QUOTE", title: "Báo giá mẫu chưa niêm yết", detail: `${code(i)} · ${i.productName}`, tab: "payment", urgency: 500 })
      } else if (i.currentStepId === "STEP_4_PAYMENT_PENDING") {
        out.push({ ...base, id: `pay:${i.id}`, kind: "CONFIRM_PAYMENT", title: "Đối chiếu và xác nhận tiền", detail: `${code(i)} · khách báo đã chuyển`, tab: "payment", urgency: 400 })
      } else if (deliveredWithDebt) {
        out.push({
          ...base,
          id: `collect-post-delivery:${i.id}`,
          kind: "COLLECT_POST_DELIVERY_BALANCE",
          title: COLLECT_POST_DELIVERY_TITLE,
          detail: `${code(i)} · Còn nợ ${balance.toLocaleString("vi-VN")} đ`,
          tab: "payment",
          urgency: 420,
        })
      }
    }

    // --- 2. NGHIỆP VỤ SALE ---
    if (role === "SALE") {
      if (isUnassignedSale) {
        out.push({
          ...base,
          id: `claim-order:${i.id}`,
          kind: "CLAIM_ORDER",
          title: "Tiếp nhận đơn mới chưa có Sale phụ trách",
          detail: `${code(i)} · ${i.customerName} · ${i.productName}`,
          tab: "sales",
          urgency: 700,
        })
      } else if (isMySale) {
        if (i.deliveryFailed && !isDelivered) {
          out.push({
            ...base,
            id: `delivery-failed-contact:${i.id}`,
            kind: "DELIVERY_FAILED_SALE_CONTACT",
            title: "Giao không thành công — Liên hệ lại người nhận",
            detail: `${code(i)} · Kiểm tra lại SĐT/địa chỉ để điều phối giao lại`,
            tab: "sales",
            urgency: 850,
          })
        } else if (i.type === "ORDER" && hasDeposit && isReady && !isDelivered) {
          out.push({
            ...base,
            id: `remind-second-pay:${i.id}`,
            kind: "REMIND_BALANCE_PAYMENT",
            title: "Nhắc khách xác nhận hoa và thanh toán lần 2",
            detail: `${code(i)} · Còn thiếu ${balance.toLocaleString("vi-VN")} đ để giao ship`,
            tab: "sales",
            urgency: 650,
          })
        } else if (i.type === "ORDER" && !hasDeposit && isReady && !isDelivered) {
          out.push({
            ...base,
            id: `send-photo-qc:${i.id}`,
            kind: "SEND_PHOTO_QC",
            title: "Gửi ảnh hoa thành phẩm cho khách duyệt",
            detail: `${code(i)} · Hoa đã cắm xong, gửi ảnh xác nhận trước khi giao`,
            tab: "sales",
            urgency: 620,
          })
        } else if (deliveredWithDebt) {
          out.push({
            ...base,
            id: `collect-post-delivery:${i.id}`,
            kind: "COLLECT_POST_DELIVERY_BALANCE",
            title: COLLECT_POST_DELIVERY_TITLE,
            detail: `${code(i)} · Còn nợ ${balance.toLocaleString("vi-VN")} đ`,
            tab: "sales",
            urgency: 420,
          })
        } else if (i.currentStepId === "STEP_4_PAYMENT_PENDING" && !isReported && paid === 0) {
          out.push({
            ...base,
            id: `remind-deposit:${i.id}`,
            kind: "REMIND_DEPOSIT",
            title: "Nhắc khách thanh toán tiền cọc",
            detail: `${code(i)} · Cần đặt cọc để xưởng chuẩn bị hoa`,
            tab: "sales",
            urgency: 550,
          })
        } else if (i.currentStepId === "STEP_3_FILLING_FORM") {
          out.push({
            ...base,
            id: `follow-up-lead:${i.id}`,
            kind: "FOLLOW_UP_LEAD",
            title: "Hỗ trợ khách đang điền form đặt hoa",
            detail: `${code(i)} · ${i.customerName} đang chọn mẫu/nhập đơn`,
            tab: "sales",
            urgency: 350,
          })
        }
      }
    }

    // --- 3. NGHIỆP VỤ ĐIỀU PHỐI (COORDINATOR) ---
    if (role === "COORDINATOR") {
      if (i.deliveryFailed) {
        out.push({
          ...base,
          id: `redeliver:${i.id}`,
          kind: "REDELIVER",
          title: "Giao không thành công — Hẹn giao lại",
          detail: `${code(i)} · ${i.productName} · Cần xếp tài xế hoặc đổi giờ giao`,
          tab: "coordinator",
          urgency: 950,
        })
      } else if (i.currentStepId === "STEP_5_PAYMENT_CONFIRMED" || (i.currentStepId === "STEP_4_PAYMENT_PENDING" && isReported)) {
        const isWaitingAcceptance = i.productionStatus === "WAITING"
        out.push({
          ...base,
          id: `assign:${i.id}`,
          kind: "ASSIGN",
          title: isWaitingAcceptance
            ? "Thẩm định nhận đơn (Liên hệ chuỗi)"
            : "Phân công sản xuất",
          detail: isWaitingAcceptance
            ? `${code(i)} · ${i.productName} · Cần liên hệ cửa hàng trong chuỗi để nhận đơn hoặc từ chối hoàn tiền`
            : `${code(i)} · ${i.productName} · Đơn đã tiếp nhận · Sẵn sàng phân công sản xuất`,
          tab: "coordinator",
          urgency: 750,
        })
      } else if (i.currentStepId === "STEP_6_ARRANGING" || i.productionStatus === "ARRANGING") {
        out.push({
          ...base,
          id: `check-arranging:${i.id}`,
          kind: "CHECK_ARRANGING_PROGRESS",
          title: "Theo dõi tiến độ nghệ nhân",
          detail: `${code(i)} · Xưởng đang cắm · Đôn đốc hoàn thành đúng giờ`,
          tab: "coordinator",
          urgency: 400,
        })
      } else if (isReady && !isDelivered) {
        if (i.productionStatus !== "READY") {
          out.push({
            ...base,
            id: `qc-inspect:${i.id}`,
            kind: "QC_INSPECTION",
            title: "Kiểm tra chất lượng và chụp ảnh thành phẩm",
            detail: `${code(i)} · Thợ đã cắm xong, cần kiểm tra và tải ảnh thành phẩm`,
            tab: "coordinator",
            urgency: 720,
          })
        } else if (hasDeposit) {
          if (isReported) {
            out.push({
              ...base,
              id: `confirm-second-pay:${i.id}`,
              kind: "CONFIRM_PAYMENT",
              title: "Khách đã chuyển tiền lần 2 — Xác nhận để giao hoa",
              detail: `${code(i)} · Đã có bill chuyển khoản lần 2 · Cần xác nhận ${balance.toLocaleString("vi-VN")} đ để mở giao hàng`,
              tab: "coordinator",
              urgency: 920,
            })
          } else {
            out.push({
              ...base,
              id: `wait-second-pay:${i.id}`,
              kind: "WAITING_SECOND_PAYMENT",
              title: "Chờ khách thanh toán lần 2 để giao hoa",
              detail: `${code(i)} · Đã có ảnh thành phẩm, còn nợ ${balance.toLocaleString("vi-VN")} đ`,
              tab: "coordinator",
              urgency: 280,
            })
          }
        } else {
          out.push({
            ...base,
            id: `assign-shipper:${i.id}`,
            kind: "ASSIGN_SHIPPER",
            title: "Sẵn sàng giao — Điều phối tài xế hoặc shipper",
            detail: `${code(i)} · Đã hoàn thiện, cần gán tài xế xuất giao`,
            tab: "coordinator",
            urgency: 680,
          })
        }
      }
    }
  }

  return out.sort((a, b) => b.urgency - a.urgency)
}

/** Đơn đổi bước trong `hours` giờ gần nhất mà người này cần biết. */
export function inboxUpdates(items: PipelineLike[], role: MessageRole, userId: string, now: Date, hours = 24): PipelineLike[] {
  const since = now.getTime() - hours * 3_600_000
  const relevant = (i: PipelineLike) =>
    role === "SALE" ? i.saleId === userId : role === "COORDINATOR" ? i.type === "ORDER" && COORDINATOR_STEPS.has(i.currentStepId) : i.type === "ORDER"
  return items
    .filter((i) => relevant(i) && Date.parse(i.stepStartedAt) >= since)
    .sort((a, b) => Date.parse(b.stepStartedAt) - Date.parse(a.stepStartedAt))
    .slice(0, 20)
}
