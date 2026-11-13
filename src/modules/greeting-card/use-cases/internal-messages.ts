import { notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { GreetingMessageRepository, type ThreadTarget, getGreetingMessageRepository } from "../infra/greeting-message-repository"
import {
  MAX_MESSAGE_LENGTH, MESSAGE_ROLE_LABEL, recipientLabel, resolveRecipient, roleOf, isAddressedTo, CUSTOMER_SENDER_ID, CUSTOMER_SENDER_LABEL,
  type MessageRole, type RecipientChoice,
} from "../domain/internal-message"
import { PIPELINE_STEPS } from "../domain/tracking-pipeline-types"
import { describeDiscount, parseMaxDiscountPercent, type DiscountPayload } from "../domain/discount-request"
import { getCurrentOrganization } from "@/modules/organization/use-cases/get-current-organization"
import { resolveSaleScope } from "./order-scope"

import type { CancellationPayload } from "../domain/cancellation-request"

export interface ThreadRef {
  orderId?: string | undefined
  sessionId?: string | undefined
}

export interface ThreadMessageView {
  id: string
  stepKey: string
  stepTitle: string
  senderName: string
  senderRoleLabel: string
  toLabel: string | null
  body: string
  createdAt: string
  mine: boolean
  /** Gửi cho tôi và tôi chưa đọc. */
  unread: boolean
  kind: "MESSAGE" | "DISCOUNT_REQUEST" | "DISCOUNT_DECISION" | "CANCELLATION_REQUEST" | "CANCELLATION_DECISION"
  /** Xin giảm giá / kết quả duyệt: trạng thái và số tiền. */
  discount: {
    status: string; label: string; approvedVnd: number | null; requestId: string
    baseTotalVnd: number; requestedVnd: number; percent: number | null
  } | null
  /** Đề xuất hủy đơn/hoàn tiền và kết quả duyệt (Task #1). */
  cancellation: {
    requestId: string
    type: string
    status: string
    refundAmountVnd: number
    actualRefundVnd: number | null
    reason: string
    note?: string | undefined
  } | null
}

function discountView(m: { id: string; kind: string; payload: unknown; replyToId: string | null }): ThreadMessageView["discount"] {
  if (m.kind !== "DISCOUNT_REQUEST" && m.kind !== "DISCOUNT_DECISION") return null
  const p = (m.payload ?? {}) as DiscountPayload
  return {
    status: p.status, label: describeDiscount(p), approvedVnd: typeof p.approvedVnd === "number" ? p.approvedVnd : null,
    requestId: m.kind === "DISCOUNT_REQUEST" ? m.id : m.replyToId ?? m.id,
    baseTotalVnd: p.baseTotalVnd, requestedVnd: p.requestedVnd, percent: typeof p.percent === "number" ? p.percent : null,
  }
}

function cancellationView(m: { id: string; kind: string; payload: unknown; replyToId: string | null }): ThreadMessageView["cancellation"] {
  if (m.kind !== "CANCELLATION_REQUEST" && m.kind !== "CANCELLATION_DECISION") return null
  const p = (m.payload ?? {}) as CancellationPayload
  return {
    requestId: m.kind === "CANCELLATION_REQUEST" ? m.id : m.replyToId ?? m.id,
    type: p.type,
    status: p.status,
    refundAmountVnd: p.refundAmountVnd ?? 0,
    actualRefundVnd: typeof p.actualRefundVnd === "number" ? p.actualRefundVnd : null,
    reason: p.reason,
    note: p.note ?? p.decidedNote,
  }
}

const stepTitle = (key: string) => PIPELINE_STEPS.find((s) => s.id === key)?.shortTitle ?? "Chung"

/** Đơn/link phải thuộc tổ chức và nằm trong phạm vi xem của người dùng (sale "chỉ khách của mình"). */
export async function visibleTarget(ctx: TenantContext, ref: ThreadRef, repo: GreetingMessageRepository): Promise<ThreadTarget> {
  const target = await repo.findTarget(ctx, ref)
  if (!target) throw notFound()
  const scope = await resolveSaleScope(ctx)
  if (scope && target.saleId !== scope) throw notFound()
  return target
}

export async function getThread(ctx: TenantContext, ref: ThreadRef, repo = getGreetingMessageRepository()) {
  const target = await visibleTarget(ctx, ref, repo)
  const [messages, members, org] = await Promise.all([
    repo.listThread(ctx, target), repo.activeMembers(ctx), getCurrentOrganization(ctx),
  ])
  const nameOf = new Map(members.map((m) => [m.userId, m.name]))
  const me = { userId: ctx.userId, role: roleOf(ctx.capabilities) }
  const views: ThreadMessageView[] = [
    ...messages.map((m) => ({
      id: m.id, stepKey: m.stepKey, stepTitle: stepTitle(m.stepKey),
      senderName: m.senderId === CUSTOMER_SENDER_ID ? CUSTOMER_SENDER_LABEL : m.senderId.startsWith("system:") ? "Hệ thống" : nameOf.get(m.senderId) ?? "Nhân viên đã rời",
      senderRoleLabel: m.senderId === CUSTOMER_SENDER_ID ? "Trang theo dõi" : MESSAGE_ROLE_LABEL[m.senderRole as MessageRole] ?? "Nhân viên",
      toLabel: recipientLabel({ toRole: m.toRole, toUserName: m.toUserId ? nameOf.get(m.toUserId) ?? "Nhân viên" : null }),
      body: m.body, createdAt: m.createdAt.toISOString(), mine: m.senderId === ctx.userId,
      unread: !m.readByMe && isAddressedTo(m, me),
      kind: (
        m.kind === "DISCOUNT_REQUEST" ||
        m.kind === "DISCOUNT_DECISION" ||
        m.kind === "CANCELLATION_REQUEST" ||
        m.kind === "CANCELLATION_DECISION"
          ? m.kind
          : "MESSAGE"
      ) as ThreadMessageView["kind"],
      discount: discountView(m),
      cancellation: cancellationView(m),
    })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return {
    maxDiscountPercent: parseMaxDiscountPercent(org?.settings),
    // Chỉ Điều hành (F2 / R6) duyệt được giảm giá & hủy đơn — giao diện đọc để hiện nút, máy chủ vẫn kiểm
    canDecideDiscount: ctx.capabilities.has("F2"),
    canDecideCancellation: ctx.capabilities.has("R6") || ctx.capabilities.has("F2"),
    label: target.label, ownerSaleName: target.saleId && target.saleId !== "public" ? nameOf.get(target.saleId) ?? null : null, messages: views }
}

export async function sendMessage(
  ctx: TenantContext,
  input: ThreadRef & { stepKey: string; to: RecipientChoice; body: string; replyToId?: string | undefined },
  repo = getGreetingMessageRepository(),
) {
  const body = input.body.trim()
  if (!body || body.length > MAX_MESSAGE_LENGTH) throw validationFailed({ body: `Nội dung từ 1 đến ${MAX_MESSAGE_LENGTH} ký tự` })
  const target = await visibleTarget(ctx, input, repo)

  let recipient = resolveRecipient(input.to, target.saleId)
  if (input.replyToId) {
    // Trả lời luôn về đúng người đã nhắn, trong đúng đơn đó
    const original = await repo.findById(ctx, input.replyToId)
    const sameThread = original && ((target.orderId && original.orderId === target.orderId) || (target.sessionId && original.sessionId === target.sessionId))
    if (!original || !sameThread) throw notFound()
    recipient = { toRole: null, toUserId: original.senderId === ctx.userId ? original.toUserId : original.senderId }
    if (!recipient.toUserId) recipient = { toRole: original.toRole as MessageRole | null, toUserId: null }
  }
  if (recipient.toUserId) {
    const members = await repo.activeMembers(ctx)
    if (!members.some((m) => m.userId === recipient.toUserId)) throw notFound()
  }
  if (!recipient.toRole && !recipient.toUserId) throw validationFailed({ to: "Chọn người nhận" })

  const msg = await repo.create(ctx, {
    target, stepKey: input.stepKey, senderRole: roleOf(ctx.capabilities) ?? "SALE",
    toRole: recipient.toRole, toUserId: recipient.toUserId, body, replyToId: input.replyToId ?? null,
  })
  return { id: msg.id, createdAt: msg.createdAt.toISOString() }
}

export async function markMessagesRead(ctx: TenantContext, messageIds: string[], repo = getGreetingMessageRepository()) {
  return { marked: await repo.markRead(ctx, messageIds) }
}

/** Lựa chọn "Gửi cho": 3 vai + từng thành viên (trừ chính mình). */
export async function listRecipients(ctx: TenantContext, repo = getGreetingMessageRepository()) {
  const members = (await repo.activeMembers(ctx)).filter((m) => m.userId !== ctx.userId).sort((a, b) => a.name.localeCompare(b.name, "vi"))
  return {
    roles: (Object.keys(MESSAGE_ROLE_LABEL) as MessageRole[]).map((role) => ({ role, label: MESSAGE_ROLE_LABEL[role] })),
    members,
  }
}
