/**
 * dispatch-notification-adapter.ts
 *
 * Adapter gửi tin nhắn mời gia công và nhắc việc đa kênh (Telegram / Zalo / SMS / Messenger).
 * Triển khai IDispatchNotifier theo chuẩn Clean Architecture & Cổng tích hợp linh hoạt.
 *
 * Live Dashboard Card Model:
 *   - Lần đầu: gửi mới, lưu telegramMsgId + telegramChatId vào SubcontractOrderState.
 *   - Lần sau: EDIT tin nhắn cũ (editMessageText / editMessageCaption) thay vì gửi mới.
 *   => Mỗi đơn hàng chỉ có MỘT thẻ tiến độ duy nhất trên Telegram.
 */

import type { TenantContext } from "@/core/tenancy"
import { log } from "@/core/observability/log"
import type {
  IDispatchNotifier,
  DispatchNotificationTarget,
  LiveCardSendResult,
} from "../use-cases/dispatch-subcontract-order"
import { getStaffChannelProvider } from "../adapters/staff-channels"
import { listLinkedTelegramChatIds } from "./telegram-linked-chats"
import { ZaloOaPlatformClient } from "../adapters/staff-channels/zalo-oa-platform"
import { ZaloOaTokenVault } from "./platform-secret-repository"
import { CLAIM_BUTTON_TEXT } from "../use-cases/invite-cards"
import { publicAppUrl } from "@/lib/public-url"

/** Cửa hàng đối tác có tài khoản ALG: đăng tin vào phòng Trao đổi nội bộ (nạp động — không vòng phụ thuộc module). */
async function postToPartnerRoom(ctx: TenantContext, target: DispatchNotificationTarget, partnerOrgId: string, isInvite: boolean): Promise<boolean> {
  try {
    const { postSubcontractMessageToChat } = await import("@/modules/internal-chat/infra/subcontract-chat-channel")
    return await postSubcontractMessageToChat({
      chainOrgId: ctx.organizationId,
      partnerOrgId,
      orderCode: target.orderCode,
      branchCode: target.branch.branchId,
      title: target.title ?? `Đơn gia công #${target.orderCode}`,
      messageText: target.messageText,
      isInvite,
    })
  } catch (err) {
    log.warn("dispatch_notify.chat_err", { organizationId: ctx.organizationId, orderCode: target.orderCode, error: err instanceof Error ? err.name : "unknown" })
    return false
  }
}

export class MultiChannelDispatchNotifier implements IDispatchNotifier {
  constructor(
    private readonly linkedChatIds: (organizationId: string) => Promise<string[]> = listLinkedTelegramChatIds,
    private readonly zalo = new ZaloOaPlatformClient(new ZaloOaTokenVault())
  ) {}

  async editInviteCard(
    _ctx: TenantContext,
    card: { msgId: string; chatId: string; isCaption: boolean },
    text: string,
    actions: Array<{ text: string; url: string }>
  ): Promise<boolean> {
    const botToken = process.env.TELEGRAM_DISPATCH_BOT_TOKEN || process.env.TELEGRAM_STAFF_BOT_TOKEN
    const telegramProvider = getStaffChannelProvider("TELEGRAM")
    if (!botToken || !telegramProvider?.editMessage) return false
    try {
      const res = await telegramProvider.editMessage({
        messageId: card.msgId,
        chatId: card.chatId,
        text,
        isCaption: card.isCaption,
        actions,
        channelConfig: { botToken },
      })
      if (!res.ok) log.warn("dispatch_notify.invite_card_edit_failed", { msgId: card.msgId, error: res.error })
      return res.ok
    } catch (err) {
      log.warn("dispatch_notify.invite_card_edit_exception", { error: err instanceof Error ? err.message : String(err) })
      return false
    }
  }

  async sendSubcontractInvite(
    ctx: TenantContext,
    target: DispatchNotificationTarget
  ): Promise<LiveCardSendResult> {
    const branch = target.branch
    const botToken = process.env.TELEGRAM_DISPATCH_BOT_TOKEN || process.env.TELEGRAM_STAFF_BOT_TOKEN
    // Bot điều phối là bot chung của nền tảng: chỉ gửi tới chat đã nhắn mã liên kết của CHÍNH tổ
    // chức này, không tin chat ID nhập từ Excel/cấu hình (rà soát 22/10/2026, cụm G)
    const requestedChatId = branch.channels?.telegramChatId
    const linked = requestedChatId ? new Set(await this.linkedChatIds(ctx.organizationId)) : new Set<string>()
    if (requestedChatId && !linked.has(requestedChatId)) {
      log.warn("dispatch_notify.telegram_chat_not_linked", { organizationId: ctx.organizationId, orderCode: target.orderCode })
    }
    const channels = branch.channels && {
      ...branch.channels,
      telegramChatId: requestedChatId && linked.has(requestedChatId) ? requestedChatId : null,
    }
    const existingCard =
      target.existingTelegramCard && linked.has(target.existingTelegramCard.chatId) ? target.existingTelegramCard : null

    const baseActions =
      target.actions && target.actions.length > 0
        ? target.actions
        : [{ text: "👉 Nhận đơn ngay", url: target.claimUrl }]

    // Cửa hàng đối tác (PO P2: giữ Telegram/Zalo, khuyến khích Trao đổi nội bộ — D11): tin mới cũng vào phòng chung với
    // chuỗi (lời mời thành thẻ đơn, tin khác thành tin hệ thống) và tin Telegram/Zalo có thêm nút mở thẳng phòng đó.
    // Bản sửa thẻ Telegram cũ (existingTelegramCard) không đăng lại: thẻ trong phòng tự phản chiếu trạng thái.
    const partnerOrgId = branch.partnerOrgId ?? null
    const isInvite = baseActions.some((a) => a.text === CLAIM_BUTTON_TEXT)
    const chatSent = partnerOrgId && !target.existingTelegramCard ? await postToPartnerRoom(ctx, target, partnerOrgId, isInvite) : false
    const actions = partnerOrgId
      ? [...baseActions, { text: "💬 Mở trong ALG", url: `${publicAppUrl()}/tin-nhan?chuoi=${ctx.organizationId}` }]
      : baseActions

    const fullText = `<b>${target.title ?? `🌸 [ĐƠN GIA CÔNG #${target.orderCode}]`}</b>\n\n${target.messageText}`

    // ── EDIT MODE: Thẻ đã tồn tại → chỉ cập nhật nội dung, không gửi mới ──
    if (existingCard?.msgId && existingCard?.chatId && channels?.telegramChatId) {
      const telegramProvider = getStaffChannelProvider("TELEGRAM")
      if (telegramProvider?.editMessage && botToken) {
        try {
          const editRes = await telegramProvider.editMessage({
            messageId: existingCard.msgId,
            chatId: existingCard.chatId,
            text: fullText,
            isCaption: existingCard.isCaption ?? false,
            actions,
            channelConfig: { botToken },
          })
          if (editRes.ok) {
            log.info("dispatch_notify.live_card_updated", {
              orderCode: target.orderCode,
              branchId: branch.branchId,
              msgId: existingCard.msgId,
            })
            // Trả về sent=true nhưng KHÔNG trả telegramMsgId (đã có rồi, không thay đổi)
            return { sent: true }
          }
          log.warn("dispatch_notify.live_card_edit_failed_fallback_send", {
            error: editRes.error,
            orderCode: target.orderCode,
          })
        } catch (err) {
          log.warn("dispatch_notify.live_card_edit_exception", {
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    }

    // ── SEND MODE: Chưa có thẻ → gửi mới và trả về msgId + chatId để lưu vào state ──
    if (channels?.telegramChatId) {
      const telegramProvider = getStaffChannelProvider("TELEGRAM")
      if (telegramProvider && botToken) {
        try {
          const res = await telegramProvider.sendMessage({
            recipientId: branch.branchId,
            recipientName: branch.branchName,
            recipientPhone: channels.phone ?? null,
            title: target.title ?? `🌸 [ĐƠN GIA CÔNG #${target.orderCode}]`,
            message: target.messageText,
            channelConfig: {
              botToken,
              defaultChatId: channels.telegramChatId,
            },
            actions,
            imageUrl: target.imageUrl,
          })
          if (res.sent) {
            log.info("dispatch_notify.live_card_created", {
              orderCode: target.orderCode,
              branchId: branch.branchId,
              msgId: res.providerMsgId,
              chatId: res.providerChatId,
            })
            return {
              sent: true,
              telegramMsgId: res.providerMsgId ?? null,
              telegramChatId: res.providerChatId ?? channels.telegramChatId,
              isCaption: res.isCaption ?? false,
            }
          }
        } catch (err) {
          log.warn("dispatch_notify.telegram_err", {
            branchId: branch.branchId,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    }

    // Zalo OA chung (không hỗ trợ sửa tin → luôn gửi mới). Nút bấm Telegram → link trong thân tin.
    if (channels?.zaloUserId) {
      const links = actions.filter((a) => a.url).map((a) => `${a.text}: ${a.url}`).join("\n")
      const title = target.title ?? `Đơn gia công #${target.orderCode}`
      const res = await this.zalo.sendText(channels.zaloUserId, [title, target.messageText, links].filter(Boolean).join("\n\n"))
      if (res.sent) return { sent: true }
      log.warn("dispatch_notify.zalo_err", { branchId: branch.branchId, error: res.error })
    }

    // Cửa hàng đối tác chỉ dùng Trao đổi nội bộ (không Telegram / Zalo) — vẫn tính là đã gửi
    if (chatSent) return { sent: true }

    // Không kênh nào gửi được (chưa cấu hình hoặc đều lỗi) — báo đúng là CHƯA gửi, để mốc nhắc
    // không bị đánh dấu đã gửi và được thử lại ở lượt quét sau (rà soát M4)
    log.warn("dispatch_notify.not_delivered", {
      branchId: branch.branchId,
      orderCode: target.orderCode,
      hasTelegram: Boolean(channels?.telegramChatId),
      hasZalo: Boolean(channels?.zaloUserId),
    })

    return { sent: false, error: notDeliveredReason({ requestedChatId, telegramLinked: Boolean(channels?.telegramChatId), botConfigured: Boolean(botToken), hasZalo: Boolean(channels?.zaloUserId) }) }
  }
}

/** Lý do không gửi được, viết cho người điều phối — chỉ ra việc cần làm thay vì báo chung chung */
export function notDeliveredReason(input: {
  requestedChatId: string | null | undefined
  telegramLinked: boolean
  botConfigured: boolean
  hasZalo: boolean
}): string {
  if (input.requestedChatId && !input.telegramLinked) {
    return "Nhóm Telegram chưa liên kết — gửi mã liên kết vào nhóm rồi bấm \"Quét Chat ID mới\" trong Cài đặt"
  }
  if (input.requestedChatId && !input.botConfigured) return "Hệ thống chưa bật bot Telegram"
  if (input.requestedChatId) return "Telegram từ chối gửi — kiểm tra bot còn trong nhóm và chưa bị chặn"
  if (input.hasZalo) return "Zalo không gửi được — nhân viên cần nhắn tin cho trang Zalo trong 7 ngày gần nhất"
  return "Chi nhánh chưa có Telegram hoặc Zalo"
}
