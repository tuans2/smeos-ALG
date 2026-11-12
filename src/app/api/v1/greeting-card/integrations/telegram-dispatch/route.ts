import { notFound, unprocessable, validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { getTelegramBotInfo, sendTelegramText } from "@/modules/integration-hub/adapters/connectors/telegram/telegram-bot-api"
import { resolveTelegramDispatchAccess } from "@/modules/greeting-card/use-cases/telegram-dispatch-link"
import { listLinkedTelegramChatIds, unlinkTelegramChat } from "@/modules/greeting-card/infra/telegram-linked-chats"
import { telegramTestBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"

/** Lý do Telegram từ chối gửi, nói bằng lời của người dùng */
function telegramSendErrorText(error: string | undefined): string {
  const d = (error ?? "").toLowerCase()
  if (d.includes("upgraded to a supergroup")) {
    return "Nhóm đã được Telegram nâng cấp nên đổi ID mới. Gửi lại mã liên kết vào nhóm, bấm \"Quét Chat ID mới\" và dùng ID mới (bắt đầu bằng -100)."
  }
  if (d.includes("chat not found")) return "Không tìm thấy nhóm. Kiểm tra bot còn trong nhóm và ID đúng."
  if (d.includes("kicked") || d.includes("not a member")) return "Bot đã bị xoá khỏi nhóm. Thêm lại bot vào nhóm rồi thử lại."
  return `Telegram từ chối gửi: ${error || "không rõ lý do"}`
}

function dispatchBotToken(): string | undefined {
  return process.env.TELEGRAM_DISPATCH_BOT_TOKEN || process.env.TELEGRAM_STAFF_BOT_TOKEN
}

/**
 * GET /api/v1/greeting-card/integrations/telegram-dispatch
 * Trạng thái bot + mã liên kết của tổ chức + các nhóm ĐÃ nhắn mã đó. Bot là bot chung của nền
 * tảng nên không bao giờ trả danh sách mọi nhóm mà bot thấy (rà soát 21/10/2026, H1).
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.integrationManage },
  handler: async ({ ctx }) => {
    const botToken = dispatchBotToken()
    if (!botToken) {
      return jsonResponse({ data: { configured: false, bot: null, linkCode: null, recentChats: [] } })
    }

    // getMe lỗi thoáng qua (timeout, Telegram chậm) KHÔNG được xoá nhóm đã liên kết hay báo "chưa cấu hình"
    // — trước đây một lần lỗi trả bot=null + danh sách rỗng nên màn hình nhấp nháy giữa hai trạng thái.
    const [bot, access] = await Promise.all([
      getTelegramBotInfo(botToken).catch(() => null),
      resolveTelegramDispatchAccess(ctx, botToken),
    ])
    const error = access.scanError ?? (bot ? null : "Không kết nối được Telegram lúc này")
    return jsonResponse({
      data: {
        configured: true,
        bot,
        linkCode: access.linkCode,
        recentChats: access.linkedChats,
        ...(error ? { error } : {}),
      },
    })
  },
})

/**
 * POST /api/v1/greeting-card/integrations/telegram-dispatch
 * Gửi tin thử — chỉ tới nhóm đã liên kết hoặc đã cấu hình cho chi nhánh của chính tổ chức.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.integrationManage },
  handler: async ({ request, ctx }) => {
    const parsed = telegramTestBody.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const botToken = dispatchBotToken()
    if (!botToken) throw validationFailed({ token: "Chưa cấu hình TELEGRAM_DISPATCH_BOT_TOKEN trên máy chủ" })

    const { allowedChatIds } = await resolveTelegramDispatchAccess(ctx, botToken)
    if (!allowedChatIds.has(parsed.data.chatId)) {
      throw unprocessable("Nhóm này chưa liên kết với cửa hàng của bạn. Hãy gửi mã liên kết vào nhóm rồi quét lại.")
    }

    const text = parsed.data.message ||
      "🌸 <b>[TEST ĐIỀU PHỐI CHUỖI smeOS]</b>\n\nKết nối thành công giữa hệ thống smeOS và Nhóm chat Chi nhánh!\n\n<i>Mọi đơn hàng gia công mới sẽ tự động được gửi tới nhóm này.</i>"

    const sent = await sendTelegramText(botToken, parsed.data.chatId, text)
    // Lỗi phải nằm trong `error.message` để màn hình hiện đúng lý do (trước 23/10/2026 chỉ hiện câu chung)
    if (!sent.ok) throw unprocessable(telegramSendErrorText(sent.error))
    return jsonResponse({ data: { success: true, messageId: sent.messageId } })
  },
})

/**
 * DELETE /api/v1/greeting-card/integrations/telegram-dispatch?chatId=...
 * Gỡ một chat khỏi danh sách đã liên kết của tổ chức — bot không gửi tới đó nữa. Chat không thuộc
 * tổ chức → 404. Quét lại không làm chat hiện lại, trừ khi nhóm gửi mã liên kết MỚI.
 */
export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.integrationManage },
  handler: async ({ request, ctx }) => {
    const chatId = new URL(request.url).searchParams.get("chatId")?.trim()
    if (!chatId) throw validationFailed({ chatId: "Thiếu chat cần gỡ" })
    if (!(await listLinkedTelegramChatIds(ctx.organizationId)).includes(chatId)) throw notFound()

    await unlinkTelegramChat(ctx.organizationId, chatId)
    return jsonResponse({ data: { removed: chatId } })
  },
})
