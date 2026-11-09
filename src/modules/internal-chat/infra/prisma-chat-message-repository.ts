import type { Prisma, PrismaClient } from "@/generated/prisma/client"
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
    const where: Prisma.internal_chat_messagesWhereInput = { conversation_id: conversationId, deleted_at: null }
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
  }
}
