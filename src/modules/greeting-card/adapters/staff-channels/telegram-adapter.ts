import { log } from "@/core/observability/log"
import { safeRemoteUrl } from "@/lib/safe-remote-url"
import { uploadTelegramPhoto } from "./telegram-photo-upload"
import { callTelegramBotApi } from "@/modules/integration-hub/adapters/connectors/telegram/telegram-bot-api"
import type {
  ChannelSendResult,
  EditMessagePayload,
  IStaffNotificationProvider,
  StaffChannelMessage,
} from "./channel-provider.interface"

/**
 * Chuẩn hóa URL cho Telegram Inline Button:
 * Telegram Bot API từ chối localhost/127.0.0.1 trong inline_keyboard.
 * Khi ở môi trường local dev, tự động chuyển sang `127.0.0.1.nip.io` để
 * Telegram hiển thị nút bấm chuyển tiếp native và click mở thẳng vào local máy dev.
 */
function normalizeTelegramButtonUrl(rawUrl: string): string {
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

/**
 * Telegram chỉ nhận nút có URL http(s)/tg — nút `tel:` làm cả tin bị từ
 * chối ("Wrong port number specified in the URL"), tin nhắc mốc không tới
 * chi nhánh. Nút `tel:` chuyển thành dòng chữ: Telegram tự biến số điện
 * thoại trong tin thành chỗ bấm để gọi.
 */
export function splitTelegramActions(actions: readonly { text: string; url: string }[] | undefined): {
  buttons: { text: string; url: string }[]
  phoneLines: string[]
} {
  const buttons: { text: string; url: string }[] = []
  const phoneLines: string[] = []
  for (const act of actions ?? []) {
    const url = act.url?.trim()
    if (!url) continue
    if (/^tel:/i.test(url)) {
      const phone = url.slice(4).replace(/\s+/g, "")
      const line = act.text.includes(phone) ? `📞 ${act.text}` : `📞 ${act.text}: ${phone}`
      // Tin gửi với parse_mode HTML — thoát ký tự đặc biệt từ dữ liệu chi nhánh
      phoneLines.push(line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))
    } else if (/^(https?|tg):/i.test(url)) {
      buttons.push({ text: act.text, url: normalizeTelegramButtonUrl(url) })
    }
  }
  return { buttons, phoneLines }
}

/** URL ảnh Telegram được phép tự tải: chỉ https, không phải địa chỉ máy nội bộ. */
export const safeRemotePhotoUrl = safeRemoteUrl

export class TelegramStaffAdapter implements IStaffNotificationProvider {
  readonly channel = "TELEGRAM" as const

  async sendMessage(msg: StaffChannelMessage): Promise<ChannelSendResult> {
    const config = msg.channelConfig as { botToken?: string; defaultChatId?: string; chatMap?: Record<string, string> } | undefined
    const botToken = config?.botToken
    const chatId = (config?.chatMap && config.chatMap[msg.recipientId]) || config?.defaultChatId

    if (!botToken || !chatId) {
      return {
        sent: false,
        error: "Chưa cấu hình Telegram Bot Token hoặc Chat ID",
      }
    }

    try {
      // Tạo các nút bấm chuyển tiếp native (Inline Keyboard); nút gọi điện thành dòng chữ
      const { buttons: inlineButtons, phoneLines } = splitTelegramActions(msg.actions)
      const phoneBlock = phoneLines.length > 0 ? `\n\n${phoneLines.join("\n")}` : ""
      const text = `<b>${msg.title}</b>\n\n${msg.message}${phoneBlock}`

      const replyMarkup = inlineButtons.length > 0
        ? { inline_keyboard: [inlineButtons] }
        : undefined

      // Ảnh sản phẩm: chỉ chuyển URL https công khai cho Telegram tự tải. Máy chủ KHÔNG tự tải URL
      // hay đọc tệp theo đường dẫn lấy từ dữ liệu tiệm nhập — trước 22/10/2026 kiểm tra kiểu chuỗi
      // con (".onrender.com") cho phép gọi địa chỉ nội bộ và đọc tệp tuỳ ý (rà soát cụm G).
      const remotePhotoUrl = safeRemotePhotoUrl(msg.imageUrl)

      // 1. Có ảnh -> sendPhoto, Telegram tự tải từ URL
      if (remotePhotoUrl) {
        try {
          const photoData = await callTelegramBotApi<{ message_id: number }>(botToken, "sendPhoto", {
            chat_id: chatId,
            photo: remotePhotoUrl,
            caption: text.slice(0, 1024),
            parse_mode: "HTML",
            ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
          })
          if (photoData.ok) {
            return {
              sent: true,
              providerMsgId: photoData.result?.message_id ? String(photoData.result.message_id) : null,
              providerChatId: chatId,
              isCaption: true,
            }
          }
          log.warn("staff_notify.telegram_remote_photo_failed, fallback to sendMessage", { error: photoData.description })
        } catch (err) {
          log.warn("staff_notify.telegram_remote_photo_err, fallback to sendMessage", { error: String(err) })
        }
        // 1b. Telegram không tự tải được URL → máy chủ tải ảnh của chính hệ thống rồi gửi tệp
        try {
          const up = await uploadTelegramPhoto(botToken, { chatId, photoUrl: remotePhotoUrl, caption: text.slice(0, 1024), replyMarkup })
          if (up.ok) {
            return { sent: true, providerMsgId: up.messageId ? String(up.messageId) : null, providerChatId: chatId, isCaption: true }
          }
          log.warn("staff_notify.telegram_upload_photo_failed", { error: up.error })
        } catch (err) {
          log.warn("staff_notify.telegram_upload_photo_err", { error: err instanceof Error ? err.name : "Error" })
        }
      }

      // 2. Gửi tin nhắn text kèm các nút bấm native (sendMessage)
      const bodyPayload: Record<string, unknown> = {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }

      const data = await callTelegramBotApi<{ message_id: number }>(botToken, "sendMessage", bodyPayload)

      if (!data.ok) {
        log.warn("staff_notify.telegram_failed", { error: data.description })
        return { sent: false, error: data.description || "Lỗi gửi Telegram" }
      }

      return {
        sent: true,
        providerMsgId: data.result?.message_id ? String(data.result.message_id) : null,
        providerChatId: chatId,
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      log.error("staff_notify.telegram_exception", { error: errMsg })
      return { sent: false, error: errMsg }
    }
  }

  /**
   * Chỉnh sửa nội dung Thẻ Tiến Độ (Live Dashboard Card) thay vì gửi tin mới.
   * Sử dụng editMessageCaption (nếu là nhắn kèm ảnh) hoặc editMessageText (nếu là text thuần).
   */
  async editMessage(payload: EditMessagePayload): Promise<{ ok: boolean; error?: string }> {
    const config = payload.channelConfig as { botToken?: string } | undefined
    const botToken = config?.botToken
    if (!botToken) return { ok: false, error: "Missing botToken" }

    const { buttons: inlineButtons } = splitTelegramActions(payload.actions)
    const replyMarkup = inlineButtons.length > 0 ? { inline_keyboard: [inlineButtons] } : undefined

    const endpoint = payload.isCaption ? "editMessageCaption" : "editMessageText"
    const bodyKey = payload.isCaption ? "caption" : "text"

    try {
      const data = await callTelegramBotApi(botToken, endpoint, {
        chat_id: payload.chatId,
        message_id: Number(payload.messageId),
        [bodyKey]: payload.text.slice(0, payload.isCaption ? 1024 : 4096),
        parse_mode: "HTML",
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      })
      if (!data.ok) {
        log.warn("staff_notify.telegram_edit_failed", { error: data.description })
        const result: { ok: boolean; error?: string } = { ok: false }
        if (data.description) result.error = data.description
        return result
      }
      return { ok: true }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      log.error("staff_notify.telegram_edit_exception", { error: errMsg })
      return { ok: false, error: errMsg }
    }
  }
}
