import type { TenantContext } from "@/core/tenancy"
import { GreetingMessageRepository } from "../infra/greeting-message-repository"
import { GreetingIntegrationRepository } from "../infra/greeting-integration-repository"
import { roleOf, MESSAGE_ROLE_LABEL, CUSTOMER_SENDER_ID, CUSTOMER_SENDER_LABEL, type MessageRole } from "../domain/internal-message"
import { inboxActions, inboxUpdates, type InboxAction } from "../domain/inbox"
import { getTrackingPipeline } from "./get-tracking-pipeline"
import { resolveSaleScope } from "./order-scope"
import { DiscountRepository } from "../infra/discount-repository"
import { CancellationRepository } from "../infra/cancellation-repository"
import { CancellationFollowUpRepository } from "../infra/cancellation-follow-up-repository"
import { CANCELLATION_TYPE_LABEL, type CancellationPayload, type CancellationType } from "../domain/cancellation-request"
import { describeDiscount, parseMaxDiscountPercent, type DiscountPayload } from "../domain/discount-request"
import { getCurrentOrganization } from "@/modules/organization/use-cases/get-current-organization"
import { GREETING_CARD_CAPABILITY } from "../domain/greeting-card-capabilities"
import { changeRequestActions } from "./order-change"
import { BrochureOrderRepository } from "../infra/brochure-order-repository"
import { countPendingProposals } from "@/modules/products/use-cases/count-pending-proposals"
import { missingInfoActions } from "./missing-info-actions"

export interface InboxThread {
  key: string
  orderId: string | null
  sessionId: string | null
  title: string
  lastBody: string
  lastSender: string
  lastAt: string
  unread: number
  /** Tin chưa đọc mới nhất — để đánh dấu đã đọc khi mở. */
  unreadIds: string[]
}

/**
 * Hộp việc của người đang đăng nhập: việc cần làm (theo vai), tin nhắn gửi cho mình
 * (gom theo đơn), và đơn vừa đổi bước. Một lần gọi cho cả nút chuông lẫn bảng.
 */
export async function getInbox(ctx: TenantContext, targetRole?: MessageRole | undefined, now = new Date()) {
  const canSwitchRole = ctx.capabilities.has("F2")
  const defaultRole: MessageRole = roleOf(ctx.capabilities) ?? "SALE"
  const role: MessageRole = canSwitchRole && targetRole ? targetRole : defaultRole
  const repo = new GreetingMessageRepository()
  const [pipeline, messages, members, scope] = await Promise.all([
    getTrackingPipeline(ctx),
    repo.listAddressed(ctx, role),
    repo.activeMembers(ctx),
    resolveSaleScope(ctx),
  ])

  const actions: InboxAction[] = inboxActions(pipeline, role, ctx.userId)
  // Khách xin đổi thông tin đơn → người có quyền sửa đơn (R3) duyệt
  if (ctx.capabilities.has(GREETING_CARD_CAPABILITY.orderUpdate)) actions.unshift(...(await changeRequestActions(ctx, pipeline)))
  if (role === "ADMIN") {
    const [pending, pendingCancellations, followUps, org] = await Promise.all([
      new DiscountRepository().listPending(ctx),
      new CancellationRepository().listPending(ctx),
      new CancellationFollowUpRepository().listPending(ctx),
      getCurrentOrganization(ctx),
    ])
    const maxPercent = parseMaxDiscountPercent(org?.settings)
    const names = new Map(members.map((m) => [m.userId, m.name]))
    for (const r of pendingCancellations) {
      const p = (r.payload && typeof r.payload === "object" ? r.payload : {}) as unknown as CancellationPayload
      const item = pipeline.find((i) => i.orderId === r.order_id)
      const typeLabel = CANCELLATION_TYPE_LABEL[p.type as CancellationType] ?? "Hủy / Hoàn tiền"
      actions.unshift({
        id: `cancellation:${r.id}`,
        kind: "CANCELLATION_REQUEST",
        title: `Đề xuất: ${typeLabel}`,
        detail: `${item?.orderCode ? `Đơn #${item.orderCode}` : (p.orderCode ? `Đơn #${p.orderCode}` : "Đơn")} · ${names.get(r.sender_id) ?? "Nhân viên"}: ${p.reason}`,
        orderId: r.order_id,
        sessionId: item?.sessionId || null,
        customerName: item?.customerName ?? null,
        imageUrl: item?.productImageUrl ?? null,
        tab: "payment",
        urgency: 2500,
      })
    }
    for (const r of followUps) {
      const item = pipeline.find((i) => i.orderId === r.order_id)
      const due = r.payload.followUp?.refundDueVnd ?? 0
      actions.unshift({
        id: `cancel-follow-up:${r.id}`, kind: "CANCELLATION_FOLLOW_UP",
        title: due > 0 ? `Cần hoàn tiền ${due.toLocaleString("vi-VN")}đ cho khách` : "Đơn tự huỷ — cần liên hệ khách",
        detail: `Đơn #${item?.orderCode ?? r.payload.orderCode} · ${r.payload.autoApproved ? "tự huỷ do quá hạn chưa duyệt đề xuất từ chối nhận đơn" : "đề xuất huỷ/hoàn đã duyệt — chuyển tiền rồi bấm xác nhận"}`,
        orderId: r.order_id, sessionId: item?.sessionId || null, customerName: item?.customerName ?? null,
        imageUrl: item?.productImageUrl ?? null, tab: "payment", urgency: 2600,
        followUp: { requestId: r.id, refundDueVnd: due, reason: r.payload.reason },
      })
    }
    for (const r of pending) {
      const p = r.payload as unknown as DiscountPayload
      const item = pipeline.find((i) => i.orderId === r.order_id)
      actions.unshift({
        id: `discount:${r.id}`, kind: "DISCOUNT", title: `Xin giảm ${describeDiscount(p)}`,
        detail: `${item?.orderCode ? `Đơn ${item.orderCode}` : "Đơn"} · ${names.get(r.sender_id) ?? "Sale"}: ${r.body}`,
        orderId: r.order_id, sessionId: item?.sessionId || null, customerName: item?.customerName ?? null,
        imageUrl: item?.productImageUrl ?? null, tab: "payment", urgency: 1500,
        discount: {
          requestId: r.id, requester: names.get(r.sender_id) ?? "Sale", reason: r.body, baseTotalVnd: p.baseTotalVnd,
          requestedVnd: p.requestedVnd, percent: typeof p.percent === "number" ? p.percent : null, maxPercent,
        },
      })
    }
    const proposals = ctx.capabilities.has("H3") ? await countPendingProposals(ctx) : 0 // mẫu mới + đề xuất sửa
    if (proposals > 0) {
      actions.push({
        id: "product-proposals", kind: "PRODUCT_PROPOSALS", title: `${proposals >= 100 ? "100+" : proposals} đề xuất mẫu sản phẩm chờ duyệt`,
        detail: "Mẫu mới và đề xuất sửa của nhân viên; duyệt hoặc từ chối trước hạn 30 ngày", orderId: null, sessionId: null, customerName: null, imageUrl: null,
        tab: "payment", urgency: 300, href: "/san-pham?duyet=1",
      })
    }
    const unmatched = await new GreetingIntegrationRepository().listPaymentEvents(ctx, { status: "UNMATCHED", limit: 50 })
    if (unmatched.length > 0) {
      actions.unshift({
        id: "unmatched", kind: "UNMATCHED_PAYMENTS", title: `${unmatched.length >= 50 ? "50+" : unmatched.length} khoản tiền vào chưa khớp đơn`,
        detail: "Gắn từng khoản vào đúng đơn", orderId: null, sessionId: null, customerName: null, imageUrl: null, tab: "payment", urgency: 2000,
      })
    }
  }

  // Đơn đã giao còn nợ ngoài cửa sổ 7 ngày của bảng theo dõi — nhắc tới khi thu đủ (mục 3, PO 15/10/2026)
  if (role === "ADMIN" || role === "SALE") {
    const seen = new Set(actions.map((a) => a.id))
    const debts = await new BrochureOrderRepository().listDeliveredWithDebt(ctx, role === "SALE" ? ctx.userId : scope)
    for (const d of debts) {
      const id = `collect-post-delivery:${d.orderId}`
      if (seen.has(id)) continue
      const days = Math.max(0, Math.floor((now.getTime() - d.deliveredAt.getTime()) / 86_400_000))
      actions.push({
        id, kind: "COLLECT_POST_DELIVERY_BALANCE", title: "Thu phần tiền còn lại sau giao",
        detail: `Đơn ${d.code} · Còn nợ ${d.balanceVnd.toLocaleString("vi-VN")} đ · đã giao ${days} ngày`,
        orderId: d.orderId, sessionId: d.sessionId, customerName: d.customerName, imageUrl: null,
        tab: role === "ADMIN" ? "payment" : "sales", urgency: 420 + Math.min(days, 30),
      })
    }
  }

  // Đơn thiếu thông tin cần hỏi lại khách (checklist ALG 4.14)
  if (ctx.capabilities.has("R1")) actions.push(...(await missingInfoActions(ctx, role, role === "SALE" ? ctx.userId : scope, now)))

  // Sale "chỉ khách của mình" không thấy trao đổi của đơn người khác, trừ tin gửi riêng cho mình
  const saleOf = scope ? await repo.saleOf(ctx, messages.flatMap((m) => (m.orderId ? [m.orderId] : [])), messages.flatMap((m) => (m.sessionId ? [m.sessionId] : []))) : null
  const visible = messages.filter((m) => !saleOf || m.toUserId === ctx.userId || saleOf.get(m.orderId ?? m.sessionId ?? "") === scope)
  const nameOf = new Map(members.map((m) => [m.userId, m.name]))
  const byKey = new Map(pipeline.map((p) => [p.orderId ?? p.sessionId, p]))
  const threads = new Map<string, InboxThread>()
  for (const m of visible) {
    const key = m.orderId ?? m.sessionId ?? m.id
    const item = byKey.get(key)
    const t = threads.get(key) ?? {
      key, orderId: m.orderId, sessionId: m.sessionId,
      title: item ? `${item.customerName} · ${item.orderCode ? `Đơn ${item.orderCode}` : `Link ${item.sendCode}`}` : "Trao đổi về đơn",
      lastBody: m.body, lastSender: m.senderId === CUSTOMER_SENDER_ID ? CUSTOMER_SENDER_LABEL : m.senderId.startsWith("system:") ? "Hệ thống" : `${nameOf.get(m.senderId) ?? "Nhân viên"} (${MESSAGE_ROLE_LABEL[m.senderRole as MessageRole] ?? "Nhân viên"})`,
      lastAt: m.createdAt.toISOString(), unread: 0, unreadIds: [],
    }
    if (!m.readByMe) {
      t.unread += 1
      t.unreadIds.push(m.id)
    }
    threads.set(key, t)
  }
  const threadList = [...threads.values()].sort((a, b) => (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) || b.lastAt.localeCompare(a.lastAt))

  const updates = inboxUpdates(pipeline, role, ctx.userId, now).map((i) => ({
    id: i.id, orderId: i.orderId ?? null, sessionId: i.sessionId || null, customerName: i.customerName,
    title: i.currentStepTitle, code: i.orderCode ? `Đơn ${i.orderCode}` : `Link ${i.sendCode}`, at: i.stepStartedAt,
  }))
  const unreadMessages = threadList.reduce((n, t) => n + t.unread, 0)
  return { role, canSwitchRole, actions, threads: threadList.slice(0, 50), updates, counts: { actions: actions.length, unreadMessages, total: actions.length + unreadMessages } }
}
