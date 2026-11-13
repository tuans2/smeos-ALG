/**
 * handle-subcontract-claim.ts
 *
 * Use-case: Tiếp nhận hoặc Hủy nhận Thẻ Gia Công (Claim / Cancel Subcontract Order).
 * Clean Architecture — Đảm bảo khóa đồng thời 1-chạm và tự động bắn lại khi hủy trong hạn.
 */

import { publicAppUrl } from "@/lib/public-url"
import type { TenantContext } from "@/core/tenancy"
import { conflict, notFound, unprocessable } from "@/core/http/errors"
import { buildDispatchTitle } from "../domain/dispatch-message-titles"
import {
  branchTelegramCard,
  cancelClaimSubcontractOrder,
  claimSubcontractOrder,
  withBranchTelegramCard,
  type CancelClaimResult,
  type ClaimResult,
  type SubcontractOrderState,
} from "../domain/subcontract-order"
import {
  parseChainDispatchPolicy,
  renderDispatchMessage,
  type ChainDispatchPolicy,
} from "../domain/chain-dispatch-policy"
import type { IDispatchNotifier, ISubcontractClaimStore, ISubcontractStateStore } from "./dispatch-subcontract-order"
import type { BranchCandidate } from "../domain/chain-dispatch-engine"
import { subcontractBranchUrl } from "@/modules/greeting-card/infra/subcontract-link-token"
import { closeCardsAfterClaim, reopenCardsAfterCancel } from "./invite-cards"

export interface ClaimSubcontractInput {
  orderId: string
  branchId: string
  branchName: string
  shopSettings: unknown
  baseUrl?: string | undefined
  productImageUrl?: string | null | undefined
}

export interface ClaimSubcontractResponse {
  success: boolean
  orderId: string
  claimedBranchId: string
  graceMinutes: number
  graceExpiresAt: string
}

/**
 * Xử lý khi chi nhánh bấm [TIẾP NHẬN ĐƠN] trên Thẻ Gia Công trực tuyến.
 */
export async function claimSubcontractUseCase(
  ctx: TenantContext,
  input: ClaimSubcontractInput,
  store: ISubcontractClaimStore,
  notifier: IDispatchNotifier,
  branches: BranchCandidate[],
  now = new Date()
): Promise<ClaimSubcontractResponse> {
  const policy: ChainDispatchPolicy = parseChainDispatchPolicy(input.shopSettings)

  // 1. Kiểm và chuyển sang CLAIMED_GRACE trong CÙNG một khoá dòng: hai chi nhánh bấm nhận cùng lúc
  // thì chỉ một bên thành công (trước 22/10/2026 cả hai đều được 200, rà soát cụm G)
  const claimResult = await store.updateSubcontractState(ctx, input.orderId, (current) => {
    if (!current) throw notFound()
    const result: ClaimResult = claimSubcontractOrder(current, input.branchId, input.branchName, policy.cancellationGraceMinutes, now)
    if (!result.success) {
      if (result.reason === "ALREADY_CLAIMED") throw conflict("Đơn hàng này đã được một chi nhánh khác tiếp nhận trước đó. Cảm ơn bạn!")
      if (result.reason === "DECLINED_PREVIOUSLY") throw unprocessable("Chi nhánh của bạn đã từ chối hoặc hủy đơn này trước đó.")
      if (result.reason === "NOT_INVITED") throw unprocessable("Lời mời nhận đơn này đã chuyển sang vòng khác.")
      throw conflict("Đơn hàng hiện không ở trạng thái sẵn sàng để nhận.")
    }
    // Thẻ tiến độ của đơn = thẻ mời đã gửi cho chính chi nhánh nhận (không phải thẻ của chi nhánh khác)
    const next = result.nextState
    if (current.inviteCards) {
      const ownCard = current.inviteCards[input.branchId]
      next.telegramMsgId = ownCard?.msgId ?? null
      next.telegramChatId = ownCard?.chatId ?? null
      next.isCaption = ownCard?.isCaption ?? false
    }
    return { next, result }
  })
  const state = claimResult.nextState

  // Thẻ mời của các chi nhánh khác: báo đã có chi nhánh nhận, gỡ nút
  await closeCardsAfterClaim(ctx, state, input.branchId, notifier)

  // 2. Bắn tin nhắn xác nhận tiếp nhận thành công cho chi nhánh vừa nhận
  const claimingBranch = branches.find((b) => b.branchId === input.branchId)
  if (claimingBranch) {
    const successMsg = renderDispatchMessage(policy.messageTemplates.claimSuccess, {
      orderCode: state.orderCode,
      branchName: input.branchName,
      graceMinutes: policy.cancellationGraceMinutes,
    })

    const claimUrl = subcontractBranchUrl({
      baseUrl: input.baseUrl || publicAppUrl(),
      organizationId: ctx.organizationId,
      orderCode: state.orderCode,
      branchId: claimingBranch.branchId,
    })

    // Sửa thẻ mời trong chat của CHÍNH chi nhánh vừa nhận (mỗi chi nhánh một thẻ)
    const existingCard = branchTelegramCard(claimResult.nextState, input.branchId)

    const notifyRes = await notifier.sendSubcontractInvite(ctx, {
      branch: claimingBranch,
      orderCode: state.orderCode,
      messageText: successMsg,
      claimUrl,
      title: buildDispatchTitle({ emoji: "🔔", action: "Bắt đầu chế tác", level: "normal", orderCode: state.orderCode }),
      actions: [{ text: "Xem thẻ gia công", url: claimUrl }],
      imageUrl: input.productImageUrl,
      existingTelegramCard: existingCard,
    })

    // Thẻ mới tạo (chi nhánh chưa có thẻ mời): thành thẻ tiến độ của đơn, gộp vào trạng thái mới nhất
    if (notifyRes.sent && notifyRes.telegramMsgId) {
      await store.updateSubcontractState(ctx, input.orderId, (current) =>
        current?.claimedBranchId === input.branchId
          ? {
              next: {
                ...withBranchTelegramCard(current, input.branchId, notifyRes, { text: successMsg, claimUrl }),
                telegramMsgId: notifyRes.telegramMsgId ?? null,
                telegramChatId: notifyRes.telegramChatId ?? null,
                isCaption: notifyRes.isCaption ?? false,
              },
              result: undefined,
            }
          : { next: null, result: undefined }
      )
    }
  }

  return {
    success: true,
    orderId: input.orderId,
    claimedBranchId: input.branchId,
    graceMinutes: policy.cancellationGraceMinutes,
    graceExpiresAt: claimResult.nextState.graceExpiresAt!,
  }
}

/**
 * Xử lý khi chi nhánh bấm [HỦY NHẬN ĐƠN] trong thời gian kiểm tra kho (Grace Period).
 */
export async function cancelClaimSubcontractUseCase(
  ctx: TenantContext,
  input: { orderId: string; branchId: string },
  store: ISubcontractStateStore,
  now = new Date(),
  notifier?: IDispatchNotifier
): Promise<{ success: boolean; reopened: boolean }> {
  // Kiểm hạn huỷ và mở lại đơn trong cùng một khoá dòng
  const { before, reopened } = await store.updateSubcontractState(ctx, input.orderId, (current) => {
    if (!current) throw notFound()
    const cancelResult: CancelClaimResult = cancelClaimSubcontractOrder(current, input.branchId, now)
    if (!cancelResult.success) {
      if (cancelResult.reason === "GRACE_EXPIRED") throw unprocessable("Đã hết thời hạn hủy cho phép. Đơn hàng đã chính thức vào sản xuất!")
      if (cancelResult.reason === "UNAUTHORIZED_BRANCH") throw unprocessable("Bạn không phải chi nhánh đang tiếp nhận đơn này.")
      throw conflict("Đơn hàng không ở trạng thái có thể hủy nhận.")
    }
    // Quay lại OPEN, loại chi nhánh vừa huỷ. Thẻ tiến độ cũ thuộc chi nhánh vừa huỷ → bỏ.
    const reopened: SubcontractOrderState = current.inviteCards
      ? { ...cancelResult.nextState, telegramMsgId: null, telegramChatId: null, isCaption: false }
      : cancelResult.nextState
    return { next: reopened, result: { before: current, reopened } }
  })

  if (notifier) {
    const ownCard = before.inviteCards?.[input.branchId]
    if (ownCard && notifier.editInviteCard) {
      await notifier.editInviteCard(ctx, ownCard, `<b>↩️ [ĐÃ HUỶ NHẬN ĐƠN #${before.orderCode}]</b>\n\nChi nhánh đã huỷ nhận đơn #${before.orderCode}. Đơn được mở lại cho chi nhánh khác.`, [])
    }
    // Thẻ của các chi nhánh còn lại trong vòng: trở về lời mời có nút "Nhận đơn ngay"
    await reopenCardsAfterCancel(ctx, reopened, input.branchId, notifier)
  }

  return {
    success: true,
    reopened: true,
  }
}
