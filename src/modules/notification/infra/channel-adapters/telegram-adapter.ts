/**
 * TELEGRAM CHANNEL ADAPTER
 *
 * Gửi thông báo tới Telegram chat của người dùng / chi nhánh.
 * Tự động chuyển đổi deep link local sang nip.io khi dev.
 *
 * @module notification/infra/channel-adapters
 */
import { log } from "@/core/observability/log"
import type { INotificationChannelAdapter } from "./_channel-adapter.interface"
import type { NotificationPayload, ChannelSendResult } from "../../domain/notification-payload"
import { escapeNotificationHtml } from "../../domain/notification-text"
import { sendTelegramText } from "@/modules/integration-hub/adapters/connectors/telegram/telegram-bot-api"

function normalizeButtonUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      parsed.hostname = "127.0.0.1.nip.io"
      return parsed.toString()
    }
    return rawUrl
  } catch {
    return rawUrl
  }
}

export class TelegramNotificationAdapter implements INotificationChannelAdapter {
  readonly channel = "TELEGRAM" as const

  async send(payload: NotificationPayload): Promise<ChannelSendResult> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    // Không rơi về một chat dùng chung: thiếu chatId thì bỏ qua, tránh lộ thông báo sang tổ chức khác
    const chatId = payload.recipient.telegramChatId

    if (!botToken || !chatId) {
      log.warn("Telegram adapter skipped: missing bot token or recipient chatId", {
        userId: payload.recipient.userId,
      })
      return {
        channel: "TELEGRAM",
        success: false,
        error: "Chưa cấu hình Telegram Bot Token hoặc Chat ID người nhận",
      }
    }

    try {
      const text = `<b>${escapeNotificationHtml(payload.title)}</b>\n\n${escapeNotificationHtml(payload.message)}`
      const inlineButtons: Array<{ text: string; url: string }> = []

      if (payload.deepLink) {
        const fullUrl = payload.deepLink.startsWith("http")
          ? payload.deepLink
          : `${process.env.NEXTAUTH_URL ?? "http://localhost:3200"}${payload.deepLink}`
        inlineButtons.push({
          text: "👉 Xem chi tiết",
          url: normalizeButtonUrl(fullUrl),
        })
      }

      const replyMarkup = inlineButtons.length > 0 ? { inline_keyboard: [inlineButtons] } : undefined
      // Client Bot API dùng chung của Trung tâm Tích hợp (nợ #200): timeout, log không lộ token.
      const sent = await sendTelegramText(botToken, chatId, text, replyMarkup)
      if (!sent.ok) {
        return {
          channel: "TELEGRAM",
          success: false,
          error: sent.error ?? "Telegram API returned failure",
        }
      }

      return {
        channel: "TELEGRAM",
        success: true,
        messageId: String(sent.messageId),
      }
    } catch (err) {
      log.warn("Lỗi gửi Telegram notification", {
        error: err instanceof Error ? err.message : String(err),
      })
      return {
        channel: "TELEGRAM",
        success: false,
        error: err instanceof Error ? err.message : "Telegram request failed",
      }
    }
  }
}
