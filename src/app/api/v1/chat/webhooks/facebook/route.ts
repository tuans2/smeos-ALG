import { asSystemDb } from "@/core/tenancy/db-context"
import { NextRequest, NextResponse } from "next/server"
import { claimIdempotencyKey } from "@/core/idempotency/infra/idempotency-repository"
import { ChatChannelRepository } from "@/modules/chat-assistant/infra/chat-channel-repository"
import { handleIncomingChannelMessage } from "@/modules/chat-assistant/use-cases/handle-incoming-channel-message"
import { matchesVerifyToken, verifyFacebookSignature } from "@/core/http/webhook-signature"
import { recordManagedWebhook } from "@/modules/integration-hub/use-cases/record-managed-webhook"
import { isOwnConnectionAllowed } from "@/modules/integration-hub/use-cases/governance-mode"

// 1. Xác thực Webhook từ Facebook Developers
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  // Không còn token mặc định viết cứng (AUD-028): chưa cấu hình FB_WEBHOOK_VERIFY_TOKEN thì từ chối
  if (mode === "subscribe" && matchesVerifyToken(token, process.env.FB_WEBHOOK_VERIFY_TOKEN)) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse("Forbidden", { status: 403 })
}

// 2. Tiếp nhận sự kiện tin nhắn từ Facebook Messenger
/** Webhook / widget công khai ngoài `handle()`: chạy quyền hệ thống (tổ chức suy từ kênh), như nhóm đường dẫn của `handle()`. */
export function POST(req: NextRequest) {
  return asSystemDb("route:/api/v1/chat/webhooks/facebook", () => postUnscoped(req))
}

async function postUnscoped(req: NextRequest) {
  // AUD-028: chỉ nhận sự kiện có chữ ký X-Hub-Signature-256 hợp lệ (HMAC thân gốc với App Secret)
  const rawBody = await req.text()
  if (!verifyFacebookSignature(rawBody, req.headers.get("x-hub-signature-256"), process.env.FB_APP_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = JSON.parse(rawBody)
    if (body.object !== "page") {
      return NextResponse.json({ status: "ignored" }, { status: 200 })
    }

    const channelRepo = new ChatChannelRepository()

    for (const entry of body.entry || []) {
      const pageId = entry.id
      // Tìm shop hoa kích hoạt kênh Facebook có pageId này
      const channelIntegration = await channelRepo.findActiveByFbPageId(pageId)
      if (!channelIntegration) continue

      for (const messagingEvent of entry.messaging || []) {
        const senderId = messagingEvent.sender?.id
        const messageText = messagingEvent.message?.text
        const messageId = messagingEvent.message?.mid

        if (senderId && messageText) {
          // E5.3: Facebook gửi lại sự kiện khi phản hồi chậm — mỗi tin (theo `mid`) chỉ trả lời một lần.
          if (typeof messageId === "string" && !(await claimIdempotencyKey(channelIntegration.organizationId, "webhook.facebook", messageId))) continue
          // Mỗi tin xử lý riêng: một tin lỗi không chặn các tin sau; kết quả ghi vào nhật ký Trung tâm Tích hợp.
          let errorCode: string | undefined
          // Trung tâm Tích hợp GĐ3: cấp trên (nền tảng, ngành, chuỗi) đã khoá kênh này → không trả lời, ghi lý do vào nhật ký.
          if (!(await isOwnConnectionAllowed(channelIntegration.organizationId, "facebook_messenger"))) errorCode = "LOCKED_BY_UPPER"
          else try {
            const result = await handleIncomingChannelMessage({
              organizationId: channelIntegration.organizationId,
              channel: "FACEBOOK_MESSENGER",
              externalSenderId: senderId,
              messageText,
            })

            // Gửi phản hồi lại Facebook Send API nếu có page access token
            const pageToken = channelIntegration.config.fbPageAccessToken
            if (pageToken && !(await sendFacebookReply(pageToken, senderId, result.replyText))) errorCode = "REPLY_FAILED"
          } catch (err) {
            console.error("Facebook message handling error:", err)
            errorCode = "PROCESSING_FAILED"
          }
          await recordManagedWebhook({
            organizationId: channelIntegration.organizationId,
            connectorKey: "facebook_messenger",
            externalAccountId: String(pageId),
            displayName: "Trang Facebook",
            externalEventId: typeof messageId === "string" ? messageId : null,
            eventType: "message",
            ok: !errorCode,
            ...(errorCode ? { errorCode } : {}),
          })
        }
      }
    }

    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 })
  } catch (error) {
    console.error("Facebook Webhook error:", error)
    return NextResponse.json({ status: "ok" }, { status: 200 })
  }
}

/** true = Facebook nhận tin trả lời. */
async function sendFacebookReply(pageAccessToken: string, recipientId: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    })
    return res.ok
  } catch (err) {
    console.error("Failed to send Facebook reply:", err)
    return false
  }
}
