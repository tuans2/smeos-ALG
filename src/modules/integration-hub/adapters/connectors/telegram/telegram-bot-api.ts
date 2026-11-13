/**
 * Lời gọi Telegram Bot API thô cho màn kết nối bot điều phối (getMe / getUpdates / sendMessage).
 * Nằm ở `adapters/` theo luật kiến trúc 4 — route không gọi thẳng nhà cung cấp.
 */
import { log } from "@/core/observability/log"

export interface TelegramBotInfo {
  id: number
  is_bot: boolean
  first_name: string
  username: string
  can_join_groups?: boolean
}

export interface TelegramChatMessage {
  chatId: string
  title: string
  type: string
  text: string
  /** Thời điểm gửi (giây Unix) — để bỏ qua mã liên kết gửi TRƯỚC khi nhóm bị gỡ */
  date?: number
}

const TIMEOUT_MS = 8000
const MAX_ATTEMPTS = 2

/** Lý do lỗi mạng để ghi log — chỉ tên lỗi + mã, không bao giờ kèm URL (URL chứa token bot) */
function networkReason(err: unknown): string {
  const e = err as { name?: string; cause?: { code?: string } }
  return [e?.name ?? "Error", e?.cause?.code].filter(Boolean).join(":")
}

/**
 * Client Telegram Bot API dùng chung (Trung tâm Tích hợp — gộp nợ #200, 31/10/2026): timeout, thử lại một lần
 * khi lỗi mạng với lệnh đọc, log không kèm URL. Lệnh ghi (có body) không thử lại để tránh gửi trùng.
 */
export async function callTelegramBotApi<T>(botToken: string, method: string, body?: unknown): Promise<{ ok: boolean; result?: T; description?: string }> {
  const init: RequestInit = body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : { method: "GET" }
  const methodName = method.split("?")[0]
  // Thử lại đúng 1 lần khi lỗi mạng / timeout (trước 23/10/2026 lỗi bị nuốt, không có log để tra)
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
        ...init,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      return (await res.json()) as { ok: boolean; result?: T; description?: string }
    } catch (err) {
      log.warn("telegram_bot_api.network_error", { method: methodName, attempt, reason: networkReason(err) })
      if (attempt >= MAX_ATTEMPTS || body) throw err
    }
  }
}

export async function getTelegramBotInfo(botToken: string): Promise<TelegramBotInfo | null> {
  const data = await callTelegramBotApi<TelegramBotInfo>(botToken, "getMe")
  return data.ok && data.result ? data.result : null
}

/** Telegram từ chối đọc tin của bot (đang dùng webhook / bị nơi khác đọc cùng lúc / token sai) */
export class TelegramUpdatesError extends Error {
  constructor(readonly reason: "WEBHOOK_ACTIVE" | "CONFLICT" | "UNAUTHORIZED" | "OTHER", message: string) {
    super(message)
  }
}

function updatesError(code: number | undefined, description: string | undefined): TelegramUpdatesError {
  const d = (description ?? "").toLowerCase()
  if (code === 409 && d.includes("webhook")) {
    return new TelegramUpdatesError("WEBHOOK_ACTIVE", "Bot đang gắn webhook ở hệ thống khác nên không đọc được tin nhắn mới")
  }
  if (code === 409) {
    return new TelegramUpdatesError("CONFLICT", "Bot đang được một hệ thống khác đọc tin cùng lúc (cùng token bot)")
  }
  if (code === 401) return new TelegramUpdatesError("UNAUTHORIZED", "Token bot Telegram không hợp lệ")
  return new TelegramUpdatesError("OTHER", description || "Telegram không trả tin nhắn")
}

/**
 * 100 tin MỚI NHẤT bot nhận được, kèm nhóm chat và nội dung. `offset=-100` lấy từ cuối hàng đợi —
 * trước 23/10/2026 gọi không offset nên chỉ nhận 100 tin CŨ NHẤT: khi hàng đợi quá 100, mã liên kết
 * vừa gửi không bao giờ được đọc. Telegram từ chối (webhook / xung đột) → ném lỗi thay vì trả rỗng.
 */
export async function getRecentTelegramMessages(botToken: string): Promise<TelegramChatMessage[]> {
  const data = (await callTelegramBotApi<Array<Record<string, unknown>>>(botToken, "getUpdates?offset=-100&limit=100")) as {
    ok: boolean
    result?: Array<Record<string, unknown>>
    description?: string
    error_code?: number
  }
  if (!data.ok) throw updatesError(data.error_code, data.description)
  if (!Array.isArray(data.result)) return []
  const out: TelegramChatMessage[] = []
  for (const update of data.result) {
    const message = (update.message || update.edited_message || update.channel_post) as Record<string, unknown> | undefined
    const chat = message?.chat as Record<string, unknown> | undefined
    if (!chat?.id) continue
    const id = String(chat.id)
    const title = (chat.title as string) ||
      [chat.first_name as string, chat.last_name as string].filter(Boolean).join(" ") ||
      (chat.username ? `@${chat.username as string}` : id)
    out.push({ chatId: id, title, type: (chat.type as string) || "unknown", text: String(message?.text ?? message?.caption ?? ""), date: Number(message?.date) || 0 })
  }
  return out
}

export async function sendTelegramText(
  botToken: string,
  chatId: string,
  text: string,
  replyMarkup?: unknown
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const data = await callTelegramBotApi<{ message_id: number }>(botToken, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  })
  if (!data.ok) return { ok: false, error: data.description || "Lỗi khi gửi tin nhắn Telegram" }
  return { ok: true, ...(data.result ? { messageId: data.result.message_id } : {}) }
}
