/**
 * Dịch vụ gửi email qua SMTP — chỉ dùng cho thông báo hệ thống.
 * Cấu hình qua biến môi trường SMTP_*. Không cần email đẹp, chỉ cần hoạt động.
 *
 * Thiếu cấu hình SMTP → log cảnh báo + bỏ qua (không ném lỗi để không block luồng chính).
 */
import nodemailer from "nodemailer"

interface EmailPayload {
  to: string
  subject: string
  html: string
}

function createTransport() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT ?? 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) return null

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const transport = createTransport()
  if (!transport) {
    // eslint-disable-next-line no-console
    console.warn("[email] SMTP chưa cấu hình — bỏ qua gửi email:", payload.subject)
    return
  }

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@smeos.app"

  await transport.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  })
}
