/**
 * EMAIL CHANNEL ADAPTER
 *
 * Kênh gửi thông báo qua Email SMTP.
 * Tái sử dụng core/notifications/email-service.
 *
 * @module notification/infra/channel-adapters
 */
import { log } from "@/core/observability/log"
import { sendEmail } from "@/core/notifications/email-service"
import type { INotificationChannelAdapter } from "./_channel-adapter.interface"
import type { NotificationPayload, ChannelSendResult } from "../../domain/notification-payload"
import { escapeNotificationHtml, safeHttpLink } from "../../domain/notification-text"

export class EmailNotificationAdapter implements INotificationChannelAdapter {
  readonly channel = "EMAIL" as const

  async send(payload: NotificationPayload): Promise<ChannelSendResult> {
    const email = payload.recipient.email
    if (!email) {
      log.debug("Email adapter skipped: recipient has no email", {
        userId: payload.recipient.userId,
      })
      return {
        channel: "EMAIL",
        success: false,
        error: "Người nhận không có địa chỉ email",
      }
    }

    try {
      const title = escapeNotificationHtml(payload.title)
      const link = safeHttpLink(payload.deepLink)
      const htmlContent = `
        <div style="font-family: 'Google Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #242C28;">${title}</h2>
          <p style="color: #5A6360; line-height: 1.6;">${escapeNotificationHtml(payload.message)}</p>
          ${
            link
              ? `<div style="margin-top: 24px;">
                   <a href="${escapeNotificationHtml(link ?? "")}" style="background-color: #133D31; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                     Xem chi tiết
                   </a>
                 </div>`
              : ""
          }
        </div>
      `

      await sendEmail({
        to: email,
        subject: `[ALG] ${payload.title}`,
        html: htmlContent,
      })

      return {
        channel: "EMAIL",
        success: true,
      }
    } catch (err) {
      // Không ghi địa chỉ email vào log (dữ liệu cá nhân)
      log.warn("Lỗi gửi Email notification", {
        userId: payload.recipient.userId,
        error: err instanceof Error ? err.message : String(err),
      })
      return {
        channel: "EMAIL",
        success: false,
        error: err instanceof Error ? err.message : "Email delivery failed",
      }
    }
  }
}
