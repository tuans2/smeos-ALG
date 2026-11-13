/**
 * invite-cards.ts
 *
 * Giữ các thẻ mời nhận đơn trên Telegram khớp với trạng thái đơn:
 * - Có chi nhánh nhận → thẻ của các chi nhánh khác đổi thành "đã có chi nhánh khác nhận", gỡ nút.
 * - Chi nhánh huỷ trong hạn kiểm kho → thẻ các chi nhánh còn lại trở về lời mời có nút "Nhận đơn ngay".
 * - Hết hạn vòng / chuyển Điều phối → thẻ vòng cũ báo lời mời đã hết hạn, gỡ nút.
 */

import type { TenantContext } from "@/core/tenancy"
import type { InviteCardRef, SubcontractOrderState } from "../domain/subcontract-order"
import type { IDispatchNotifier, LiveCardSendResult } from "./dispatch-subcontract-order"

export const CLAIM_BUTTON_TEXT = "👉 Nhận đơn ngay"

/** Nội dung thẻ như adapter gửi đi (tiêu đề đậm + thân) — lưu lại để mở lại đúng thẻ cũ */
export function inviteCardText(title: string, messageText: string): string {
  return `<b>${title}</b>\n\n${messageText}`
}

/** Ghi nhớ thẻ vừa gửi cho chi nhánh (chỉ khi Telegram trả về msgId) */
export function rememberInviteCard(
  cards: Record<string, InviteCardRef>,
  branchId: string,
  res: LiveCardSendResult,
  text: string,
  claimUrl: string
): void {
  if (!res.sent || !res.telegramMsgId || !res.telegramChatId) return
  cards[branchId] = { msgId: res.telegramMsgId, chatId: res.telegramChatId, isCaption: res.isCaption ?? false, text, claimUrl }
}

async function editCards(
  ctx: TenantContext,
  notifier: IDispatchNotifier,
  cards: InviteCardRef[],
  build: (card: InviteCardRef) => { text: string; actions: Array<{ text: string; url: string }> }
): Promise<number> {
  if (!notifier.editInviteCard) return 0
  let edited = 0
  for (const card of cards) {
    const { text, actions } = build(card)
    if (await notifier.editInviteCard(ctx, card, text, actions)) edited++
  }
  return edited
}

function otherCards(state: SubcontractOrderState, exceptBranchId: string | null): InviteCardRef[] {
  return Object.entries(state.inviteCards ?? {})
    .filter(([branchId]) => branchId !== exceptBranchId)
    .map(([, card]) => card)
}

export function closeCardsAfterClaim(
  ctx: TenantContext,
  state: SubcontractOrderState,
  claimedBranchId: string,
  notifier: IDispatchNotifier
): Promise<number> {
  const text = `<b>✅ [ĐÃ CÓ CHI NHÁNH NHẬN #${state.orderCode}]</b>\n\nĐơn #${state.orderCode} đã có chi nhánh khác nhận. Cảm ơn chi nhánh đã phản hồi!`
  return editCards(ctx, notifier, otherCards(state, claimedBranchId), () => ({ text, actions: [] }))
}

/** Đơn mở lại: thẻ các chi nhánh khác (trừ chi nhánh vừa huỷ / đã từ chối) trở về lời mời ban đầu */
export function reopenCardsAfterCancel(
  ctx: TenantContext,
  state: SubcontractOrderState,
  cancelledBranchId: string,
  notifier: IDispatchNotifier
): Promise<number> {
  const declined = new Set([...state.declinedBranchIds, cancelledBranchId])
  const cards = Object.entries(state.inviteCards ?? {})
    .filter(([branchId]) => !declined.has(branchId))
    .map(([, card]) => card)
  return editCards(ctx, notifier, cards, (card) => ({
    text: card.text,
    actions: [{ text: CLAIM_BUTTON_TEXT, url: card.claimUrl }],
  }))
}

export function expireRoundCards(
  ctx: TenantContext,
  state: SubcontractOrderState,
  notifier: IDispatchNotifier
): Promise<number> {
  const text = `<b>⏰ [HẾT HẠN NHẬN ĐƠN #${state.orderCode}]</b>\n\nLời mời nhận đơn #${state.orderCode} đã hết hạn. Cảm ơn chi nhánh!`
  return editCards(ctx, notifier, otherCards(state, null), () => ({ text, actions: [] }))
}
