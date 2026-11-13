import { randomUUID } from "node:crypto"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import type { MessageRole } from "../domain/internal-message"

export interface ThreadTarget {
  orderId: string | null
  sessionId: string | null
  /** Sale phụ trách (người gửi link); "public" = link bộ sưu tập công khai. */
  saleId: string | null
  label: string
}

export interface StoredMessage {
  id: string
  orderId: string | null
  sessionId: string | null
  stepKey: string
  senderId: string
  senderRole: string
  toRole: string | null
  toUserId: string | null
  kind: string
  body: string
  replyToId: string | null
  createdAt: Date
  readByMe: boolean
  payload: unknown
}

const SELECT = {
  id: true, order_id: true, session_id: true, step_key: true, sender_id: true, sender_role: true,
  to_role: true, to_user_id: true, kind: true, body: true, reply_to_id: true, created_at: true, payload: true,
} as const

type Row = Prisma.greeting_messagesGetPayload<{ select: typeof SELECT }> & { reads?: Array<{ id: string }> }

const toStored = (r: Row): StoredMessage => ({
  id: r.id, orderId: r.order_id, sessionId: r.session_id, stepKey: r.step_key, senderId: r.sender_id,
  senderRole: r.sender_role, toRole: r.to_role, toUserId: r.to_user_id, kind: r.kind, body: r.body,
  replyToId: r.reply_to_id, createdAt: r.created_at, readByMe: (r.reads?.length ?? 0) > 0, payload: r.payload,
})

/** Tin nhắn nội bộ Thẻ chào — mọi truy vấn khoá theo tổ chức của phiên. */
export class GreetingMessageRepository {
  constructor(private readonly db = prisma) {}

  /** Đơn/link thuộc tổ chức; không thấy → `null` (route trả 404, không lộ tồn tại). */
  async findTarget(ctx: TenantContext, ref: { orderId?: string | undefined; sessionId?: string | undefined }): Promise<ThreadTarget | null> {
    if (ref.orderId) {
      const order = await this.db.orders.findFirst({
        where: scopedWhere(ctx, { id: ref.orderId, source: "BROCHURE" }),
        select: { id: true, code: true, greeting_sessions: { select: { id: true, sale_id: true }, take: 1 } },
      })
      if (!order) return null
      return { orderId: order.id, sessionId: order.greeting_sessions[0]?.id ?? null, saleId: order.greeting_sessions[0]?.sale_id ?? null, label: `Đơn ${order.code}` }
    }
    if (ref.sessionId) {
      const s = await this.db.greeting_sessions.findFirst({ where: scopedWhere(ctx, { id: ref.sessionId }), select: { id: true, order_id: true, sale_id: true, send_code: true } })
      if (!s) return null
      return { orderId: s.order_id, sessionId: s.id, saleId: s.sale_id, label: `Link ${s.send_code}` }
    }
    return null
  }

  async create(ctx: TenantContext, input: {
    target: ThreadTarget; stepKey: string; senderRole: MessageRole; toRole: MessageRole | null; toUserId: string | null
    body: string; replyToId: string | null
  }): Promise<StoredMessage> {
    const row = await this.db.greeting_messages.create({
      data: scopedData(ctx, {
        id: randomUUID(),
        order_id: input.target.orderId,
        session_id: input.target.orderId ? null : input.target.sessionId,
        step_key: input.stepKey,
        sender_id: ctx.userId,
        sender_role: input.senderRole,
        to_role: input.toRole,
        to_user_id: input.toUserId,
        body: input.body,
        reply_to_id: input.replyToId,
      }),
      select: SELECT,
    })
    // Người gửi coi như đã đọc tin của chính mình
    await this.markRead(ctx, [row.id])
    return toStored({ ...row, reads: [{ id: "self" }] })
  }

  async findById(ctx: TenantContext, id: string): Promise<StoredMessage | null> {
    const row = await this.db.greeting_messages.findFirst({ where: scopedWhere(ctx, { id }), select: SELECT })
    return row ? toStored(row) : null
  }

  /** Toàn bộ trao đổi của một đơn (gồm tin gửi lúc còn là link) — cũ trước. */
  async listThread(ctx: TenantContext, target: ThreadTarget): Promise<StoredMessage[]> {
    const or: Prisma.greeting_messagesWhereInput[] = []
    if (target.orderId) or.push({ order_id: target.orderId })
    if (target.sessionId) or.push({ session_id: target.sessionId })
    const rows = await this.db.greeting_messages.findMany({
      where: scopedWhere(ctx, { OR: or }),
      select: { ...SELECT, reads: { where: { user_id: ctx.userId }, select: { id: true } } },
      orderBy: { created_at: "asc" },
      take: 500,
    })
    return rows.map(toStored)
  }

  /** Tin gửi cho tôi (riêng tôi hoặc cả vai của tôi) trong `days` ngày, mới trước. */
  async listAddressed(ctx: TenantContext, role: MessageRole | null, days = 30): Promise<StoredMessage[]> {
    const since = new Date(Date.now() - days * 86_400_000)
    const rows = await this.db.greeting_messages.findMany({
      where: scopedWhere(ctx, {
        created_at: { gte: since },
        NOT: { sender_id: ctx.userId },
        OR: [{ to_user_id: ctx.userId }, ...(role ? [{ to_user_id: null, to_role: role }] : [])],
      }),
      select: { ...SELECT, reads: { where: { user_id: ctx.userId }, select: { id: true } } },
      orderBy: { created_at: "desc" },
      take: 300,
    })
    return rows.map(toStored)
  }

  /** Đánh dấu đã đọc — chỉ tin của chính tổ chức; đọc lại không lỗi. */
  async markRead(ctx: TenantContext, messageIds: string[]): Promise<number> {
    if (messageIds.length === 0) return 0
    const owned = await this.db.greeting_messages.findMany({ where: scopedWhere(ctx, { id: { in: messageIds } }), select: { id: true } })
    if (owned.length === 0) return 0
    const res = await this.db.greeting_message_reads.createMany({
      data: owned.map((m) => scopedData(ctx, { id: randomUUID(), message_id: m.id, user_id: ctx.userId })),
      skipDuplicates: true,
    })
    return res.count
  }

  /** Sale phụ trách của nhiều đơn/link một lượt (để lọc hộp việc theo quyền xem). */
  async saleOf(ctx: TenantContext, orderIds: string[], sessionIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    if (orderIds.length + sessionIds.length === 0) return map
    const rows = await this.db.greeting_sessions.findMany({
      where: scopedWhere(ctx, { OR: [{ order_id: { in: orderIds } }, { id: { in: sessionIds } }] }),
      select: { id: true, order_id: true, sale_id: true },
    })
    for (const r of rows) {
      map.set(r.id, r.sale_id)
      if (r.order_id) map.set(r.order_id, r.sale_id)
    }
    return map
  }

  /** Thành viên đang hoạt động (để chọn người nhận và hiện tên). */
  async activeMembers(ctx: TenantContext): Promise<Array<{ userId: string; name: string }>> {
    const rows = await this.db.memberships.findMany({
      where: scopedWhere(ctx, { status: "ACTIVE" as const }),
      select: { user_id: true, user: { select: { name: true, email: true } } },
    })
    return rows.map((r) => ({ userId: r.user_id, name: r.user.name?.trim() || r.user.email.split("@")[0] || "Nhân viên" }))
  }
}

let _greetingMessageRepositorySingleton: GreetingMessageRepository | null = null
export function getGreetingMessageRepository(): GreetingMessageRepository {
  if (!_greetingMessageRepositorySingleton) _greetingMessageRepositorySingleton = new GreetingMessageRepository()
  return _greetingMessageRepositorySingleton
}
