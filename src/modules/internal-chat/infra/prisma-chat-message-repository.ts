import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { asSystemDb } from "@/core/tenancy/db-context"
import type { MessagePage, SendMessageParams } from "../domain/repositories/chat-repository.interface"
import type { InternalChatMessage, InternalChatMessageKind } from "../domain/chat-entities"
import { CHAT_PAGE_DEFAULT_LIMIT, CHAT_PAGE_MAX_LIMIT } from "../domain/chat-limits"
import type { MessageCursor } from "../domain/message-cursor"
import type { ChatRoomEvent } from "../domain/chat-room-event"

/** Báo "phòng vừa có tin" cho SSE — mặc định bộ phát của tiến trình; test thay được. */
export type ChatRoomEventSink = (event: ChatRoomEvent) => void

type MessageRow = Prisma.internal_chat_messagesGetPayload<object> & { sender?: { name: string | null } | null }

const WITH_SENDER = { sender: { select: { name: true } } } as const

/**
 * Phần tin nhắn của repository chat nội bộ (tách khỏi `prisma-chat-repository.ts` để giữ ≤ 350 dòng):
 * gửi, đọc theo trang, đánh dấu đã đọc, đếm chưa đọc, cập nhật thẻ có điều kiện.
 */
export class PrismaChatMessageStore {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly onRoomEvent?: ChatRoomEventSink | undefined
  ) {}

  async send(params: SendMessageParams): Promise<InternalChatMessage> {
    const now = new Date()
    // organization_id sao từ hội thoại cha — khoá ghép giữ tin nhắn cùng tổ chức với hội thoại.
    const conversation = await this.prisma.internal_chat_conversations.findUniqueOrThrow({
      where: { id: params.conversationId },
      select: { organization_id: true, counterpart_org_id: true, branch_id: true },
    })
    const [msgRow] = await this.prisma.$transaction([
      this.prisma.internal_chat_messages.create({
        data: {
          conversation_id: params.conversationId,
          organization_id: conversation.organization_id,
          // Sao bên kia của phòng để RLS cho cửa hàng đối tác đọc/ghi tin (trigger cũng điền, nhưng CSDL dựng bằng db push không có trigger)
          counterpart_org_id: conversation.counterpart_org_id,
          sender_user_id: params.senderUserId,
          sender_role: params.senderRole,
          message_type: params.messageType ?? "TEXT",
          content: params.content,
          attachments: (params.attachments ?? []) as never,
          action_payload: (params.actionPayload ?? {}) as never,
          created_at: now,
        },
        include: WITH_SENDER,
      }),
      this.prisma.internal_chat_conversations.update({
        where: { id: params.conversationId },
        data: { last_message_at: now },
      }),
      this.prisma.internal_chat_participants.updateMany({
        where: { conversation_id: params.conversationId, user_id: params.senderUserId },
        data: { last_read_at: now },
      }),
    ])
    this.onRoomEvent?.({ conversationId: params.conversationId, organizationId: conversation.organization_id, counterpartOrgId: conversation.counterpart_org_id, branchId: conversation.branch_id })
    return mapMessage(msgRow)
  }

  async findById(messageId: string): Promise<InternalChatMessage | null> {
    const row = await this.prisma.internal_chat_messages.findUnique({ where: { id: messageId }, include: WITH_SENDER })
    return row ? mapMessage(row) : null
  }

  /** Trang tin mới nhất trước `before` (lấy giảm dần + 1 dòng dò "còn nữa", rồi đảo lại cũ → mới). */
  async listPage(conversationId: string, limit = CHAT_PAGE_DEFAULT_LIMIT, before?: MessageCursor | undefined): Promise<MessagePage> {
    const take = Math.min(Math.max(limit, 1), CHAT_PAGE_MAX_LIMIT)
    // Tin đã thu hồi vẫn trả về (nội dung đã xoá) để phòng hiện "đã thu hồi" đúng chỗ
    const where: Prisma.internal_chat_messagesWhereInput = { conversation_id: conversationId }
    if (before) {
      where.OR = [{ created_at: { lt: before.createdAt } }, { created_at: before.createdAt, id: { lt: before.id } }]
    }
    const rows = await this.prisma.internal_chat_messages.findMany({
      where,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: take + 1,
      include: WITH_SENDER,
    })
    const pageRows = rows.slice(0, take)
    const oldest = pageRows[pageRows.length - 1]
    return {
      items: pageRows.reverse().map(mapMessage),
      nextCursor: rows.length > take && oldest ? { createdAt: oldest.created_at, id: oldest.id } : null,
    }
  }

  /** Vào phòng theo tổ chức (D1): dòng thành viên chỉ để lưu đã đọc / tắt tiếng, tạo khi mở lần đầu. */
  async markRead(conversationId: string, userId: string, organizationId: string): Promise<void> {
    const now = new Date()
    await this.prisma.internal_chat_participants.upsert({
      where: { conversation_id_user_id: { conversation_id: conversationId, user_id: userId } },
      update: { last_read_at: now },
      create: { conversation_id: conversationId, user_id: userId, organization_id: organizationId, role_in_chat: "MEMBER", last_read_at: now },
    })
  }

  async setMuted(conversationId: string, userId: string, organizationId: string, muted: boolean): Promise<void> {
    await this.prisma.internal_chat_participants.upsert({
      where: { conversation_id_user_id: { conversation_id: conversationId, user_id: userId } },
      update: { is_muted: muted },
      create: { conversation_id: conversationId, user_id: userId, organization_id: organizationId, role_in_chat: "MEMBER", is_muted: muted },
    })
  }

  async mutedUserIds(conversationId: string): Promise<string[]> {
    const rows = await this.prisma.internal_chat_participants.findMany({ where: { conversation_id: conversationId, is_muted: true }, select: { user_id: true }, take: 500 })
    return rows.map((r) => r.user_id)
  }

  /** Số tin của người khác sau mốc đã đọc của từng phòng — một truy vấn cho cả trang danh sách. */
  async countUnread(userId: string, lastReadByConversation: Map<string, Date>): Promise<Map<string, number>> {
    const result = new Map<string, number>()
    if (lastReadByConversation.size === 0) return result
    const groups = await this.prisma.internal_chat_messages.groupBy({
      by: ["conversation_id"],
      where: {
        deleted_at: null,
        sender_user_id: { not: userId },
        OR: [...lastReadByConversation].map(([conversationId, lastReadAt]) => ({ conversation_id: conversationId, created_at: { gt: lastReadAt } })),
      },
      _count: { _all: true },
    })
    for (const g of groups) result.set(g.conversation_id, g._count._all)
    return result
  }

  async editMessage(messageId: string, content: string, editedAt: Date): Promise<InternalChatMessage | null> {
    const current = await this.prisma.internal_chat_messages.findUnique({ where: { id: messageId }, select: { action_payload: true } })
    const payload = (current?.action_payload as Record<string, unknown> | null) ?? {}
    const { count } = await this.prisma.internal_chat_messages.updateMany({
      where: { id: messageId, deleted_at: null },
      data: { content, action_payload: { ...payload, editedAt: editedAt.toISOString() } as Prisma.InputJsonValue },
    })
    if (count !== 1) return null
    const updated = await this.findById(messageId)
    if (updated) await this.announce(updated.conversationId)
    return updated
  }

  async deleteMessage(messageId: string, deletedAt: Date, purge: { ownerOrgId: string; keys: string[] }): Promise<boolean> {
    // Có ảnh: dòng hàng đợi xoá tệp mang tổ chức chủ phòng (chủ khoá kho) — cửa hàng đối tác thu hồi ảnh của mình thì
    // RLS chặn ghi dòng đó; chạy quyền hệ thống có nhãn. Quyền thu hồi đã kiểm ở use-case (người gửi, phòng, 24 giờ).
    const run = <T>(fn: () => Promise<T>) => (purge.keys.length > 0 ? asSystemDb("internal-chat: thu hồi ảnh + hàng đợi xoá tệp của chủ phòng", fn) : fn())
    const conversationId = await run(() => this.prisma.$transaction(async (tx) => {
      const row = await tx.internal_chat_messages.findFirst({ where: { id: messageId, deleted_at: null }, select: { conversation_id: true } })
      if (!row) return null
      const { count } = await tx.internal_chat_messages.updateMany({
        where: { id: messageId, deleted_at: null },
        data: { deleted_at: deletedAt, content: "", attachments: [], action_payload: {} },
      })
      if (count !== 1) return null
      // Tệp ảnh của tin: vào hàng đợi xoá của kho (dưới tổ chức chủ phòng — khoá nằm ở đó). Cron xử lý theo cờ
      // STORAGE_DELETE_PAYLOADS và legal hold; tin đã bỏ khoá nên đếm tham chiếu về 0.
      for (const key of purge.keys) {
        await tx.storage_outbox.upsert({
          where: { op_storage_key: { op: "DELETE", storage_key: key } },
          create: { organization_id: purge.ownerOrgId, op: "DELETE", storage_key: key, asset_id: null },
          update: { done_at: null, attempts: 0, last_error: null },
        })
      }
      return row.conversation_id
    }))
    if (conversationId) await this.announce(conversationId)
    return conversationId !== null
  }

  /** Báo SSE "phòng vừa đổi" sau khi sửa / thu hồi. */
  private async announce(conversationId: string): Promise<void> {
    if (!this.onRoomEvent) return
    const conv = await this.prisma.internal_chat_conversations.findUnique({ where: { id: conversationId }, select: { organization_id: true, counterpart_org_id: true, branch_id: true } })
    if (conv) this.onRoomEvent({ conversationId, organizationId: conv.organization_id, counterpartOrgId: conv.counterpart_org_id, branchId: conv.branch_id })
  }

  /**
   * Gộp `patch` vào payload thẻ khi trạng thái còn là `expectedStatus`. Điều kiện nằm ngay trong câu UPDATE nên người
   * bấm sau (chờ khoá dòng rồi đánh giá lại WHERE trên bản mới) nhận 0 dòng → null.
   */
  async updateCardIfStatus(messageId: string, expectedStatus: string, patch: Record<string, unknown>): Promise<InternalChatMessage | null> {
    const current = await this.prisma.internal_chat_messages.findUnique({ where: { id: messageId }, select: { action_payload: true } })
    const payload = (current?.action_payload as Record<string, unknown> | null) ?? null
    if (!payload || payload.status !== expectedStatus) return null
    const { count } = await this.prisma.internal_chat_messages.updateMany({
      where: { id: messageId, action_payload: { path: ["status"], equals: expectedStatus } },
      data: { action_payload: { ...payload, ...patch } as Prisma.InputJsonValue },
    })
    return count === 1 ? this.findById(messageId) : null
  }
}

export function mapMessage(row: MessageRow): InternalChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderUserId: row.sender_user_id,
    senderRole: row.sender_role,
    senderName: row.sender?.name ?? undefined,
    messageType: row.message_type as InternalChatMessageKind,
    content: row.content,
    attachments: (row.attachments as string[]) ?? [],
    actionPayload: (row.action_payload as Record<string, unknown> | null) ?? {},
    isDeleted: row.deleted_at !== null,
    createdAt: row.created_at,
    ...editedAtOf(row),
  }
}

function editedAtOf(row: MessageRow): { editedAt?: string } {
  if (row.message_type !== "TEXT" && row.message_type !== "IMAGE") return {}
  const at = (row.action_payload as Record<string, unknown> | null)?.editedAt
  return typeof at === "string" ? { editedAt: at } : {}
}
