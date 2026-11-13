import type { TenantContext } from "@/core/tenancy"
import {
  getRecentTelegramMessages,
  TelegramUpdatesError,
  type TelegramChatMessage,
} from "@/modules/integration-hub/adapters/connectors/telegram/telegram-bot-api"
import { telegramLegacyLinkCode, telegramLinkCode } from "@/modules/greeting-card/infra/telegram-link-code"
import { listLinkedTelegramChatIds, listUnlinkedTelegramChats, rememberLinkedTelegramChats } from "@/modules/greeting-card/infra/telegram-linked-chats"

export interface LinkedTelegramChat {
  id: string
  title: string
  type: string
}

/** Nhóm đã nhắn đúng mã liên kết của tổ chức — chỉ những nhóm này mới hiện cho tổ chức đó. */
export function chatsWithLinkCode(
  messages: TelegramChatMessage[],
  linkCode: string | readonly string[],
  unlinkedAt: Record<string, string> = {}
): LinkedTelegramChat[] {
  const codes = typeof linkCode === "string" ? [linkCode] : linkCode
  const byId = new Map<string, LinkedTelegramChat>()
  for (const m of messages) {
    const text = m.text.toUpperCase()
    if (!codes.some((c) => text.includes(c))) continue
    // Nhóm đã bị gỡ: chỉ liên kết lại khi có mã gửi SAU lúc gỡ, quét lại không làm nhóm hiện lại
    const removedAt = unlinkedAt[m.chatId]
    if (removedAt && (m.date ?? 0) * 1000 <= Date.parse(removedAt)) continue
    byId.set(m.chatId, { id: m.chatId, title: m.title, type: m.type })
  }
  return [...byId.values()]
}

/**
 * Chat Telegram mà tổ chức được phép xem và gửi qua bot chung của nền tảng: chat vừa nhắn mã liên
 * kết của tổ chức (được nhớ lại vào danh sách đã liên kết) cộng các chat đã liên kết trước đó.
 * Chat ID nhập tay hoặc từ Excel chi nhánh KHÔNG tự được tin (rà soát 22/10/2026, cụm G).
 */
export async function resolveTelegramDispatchAccess(ctx: TenantContext, botToken: string) {
  const linkCode = telegramLinkCode(ctx.organizationId)
  // Không đọc được tin mới (webhook / xung đột) vẫn trả các chat đã liên kết trước đó, kèm lý do
  let messages: TelegramChatMessage[] = []
  let scanError: string | null = null
  try {
    messages = await getRecentTelegramMessages(botToken)
  } catch (err) {
    // Lỗi mạng / timeout cũng chỉ là "chưa quét được", không làm mất các chat đã liên kết
    scanError = err instanceof TelegramUpdatesError ? err.message : "Không kết nối được Telegram lúc này"
  }
  const scanned = chatsWithLinkCode(messages, [linkCode, telegramLegacyLinkCode(ctx.organizationId)], await listUnlinkedTelegramChats(ctx.organizationId))
  await rememberLinkedTelegramChats(ctx.organizationId, scanned.map((c) => c.id))
  const allowedChatIds = new Set(await listLinkedTelegramChatIds(ctx.organizationId))
  // Hiển thị mọi chat đã liên kết (bot chỉ thấy tin trong 24 giờ — chat cũ hiện bằng ID)
  const scannedIds = new Set(scanned.map((c) => c.id))
  const linkedChats: LinkedTelegramChat[] = [
    ...scanned,
    ...[...allowedChatIds].filter((id) => !scannedIds.has(id)).map((id) => ({ id, title: id, type: "unknown" })),
  ]
  return { linkCode, linkedChats, allowedChatIds, scanError }
}
