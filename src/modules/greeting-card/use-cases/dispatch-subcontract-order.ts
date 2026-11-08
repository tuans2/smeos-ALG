/**
 * dispatch-subcontract-order.ts
 *
 * Use-case: Bắn Đơn Gia Công Tự Động Cho Chuỗi Cửa Hàng (Automated Chain Dispatch).
 * Clean Architecture — Orchestration giữa Policy, Matching Engine và Notification Channels.
 */

import type { TenantContext } from "@/core/tenancy"
import {
  parseChainDispatchPolicy,
  renderDispatchMessage,
  type ChainDispatchPolicy,
} from "../domain/chain-dispatch-policy"
import {
  matchCandidateBranches,
  type BranchCandidate,
  type MatchBranchesResult,
} from "../domain/chain-dispatch-engine"
import type { SubcontractOrderState } from "../domain/subcontract-order"
import { subcontractBranchUrl } from "@/modules/greeting-card/infra/subcontract-link-token"
import { subcontractAreaText } from "../domain/subcontract-share"
import type { AdministrativeArea } from "../domain/area-match"

export interface DispatchOrderInput {
  orderId: string
  orderCode: string
  deliveryAddress: string
  /** Phường/quận/tỉnh — tin mời chỉ ghi khu vực (P-4); địa chỉ đầy đủ chỉ dùng để tìm chi nhánh gần */
  deliveryArea?: AdministrativeArea | null | undefined
  deliveryTime: string
  deliveryLocation?: { latitude: number; longitude: number } | null | undefined
  subcontractPriceVnd: number
  baseUrl?: string | undefined
}

export interface DispatchNotificationTarget {
  branch: BranchCandidate
  orderCode: string
  messageText: string
  claimUrl: string
  title?: string | undefined
  actions?: Array<{ text: string; url: string }> | undefined
  imageUrl?: string | null | undefined
  /**
   * Nếu có: đây là bản cập nhật — adapter sẽ EDIT tin nhắn cũ thay vì gửi mới.
   * Nếu không có: gửi mới và trả về telegramMsgId để caller lưu lại.
   */
  existingTelegramCard?: { msgId: string; chatId: string; isCaption?: boolean | undefined } | null | undefined
}

export interface LiveCardSendResult {
  sent: boolean
  /** Message ID của thẻ Telegram vừa gửi (chỉ có khi gửi mới, không edit) */
  telegramMsgId?: string | null
  /** Chat ID tương ứng — cần lưu cùng msgId */
  telegramChatId?: string | null
  /** Thẻ được gửi dạng caption của ảnh hay text thuần */
  isCaption?: boolean
  error?: string | null
}

export interface IDispatchNotifier {
  /**
   * Gửi thẻ gia công hoặc cập nhật Thẻ Tiến Độ (Live Dashboard Card) trên Telegram.
   * - Nếu target.existingTelegramCard có giá trị: EDIT tin nhắn cũ (không gửi mới).
   * - Nếu không: Gửi tin mới và trả về telegramMsgId + telegramChatId để lưu vào state.
   */
  sendSubcontractInvite(
    ctx: TenantContext,
    target: DispatchNotificationTarget
  ): Promise<LiveCardSendResult>
  /**
   * Chỉ sửa một thẻ Telegram đã gửi (không bao giờ gửi tin mới). `actions` rỗng = gỡ nút.
   * Trả false nếu không sửa được (thiếu bot, tin đã bị xoá...).
   */
  editInviteCard?(
    ctx: TenantContext,
    card: { msgId: string; chatId: string; isCaption: boolean },
    text: string,
    actions: Array<{ text: string; url: string }>
  ): Promise<boolean>
}

export interface ISubcontractStateStore {
  saveSubcontractState(ctx: TenantContext, state: SubcontractOrderState): Promise<void>
  loadSubcontractState(ctx: TenantContext, orderId: string): Promise<SubcontractOrderState | null>
  /** Đọc–sửa–ghi dưới khoá dòng; `change` nhận trạng thái mới nhất (xem SubcontractOrderRepository). */
  updateSubcontractState<T>(
    ctx: TenantContext,
    orderId: string,
    change: (current: SubcontractOrderState | null) => { next: SubcontractOrderState | null; result: T }
  ): Promise<T>
}

export interface ISubcontractClaimStore extends ISubcontractStateStore {
  /**
   * Ghi state chỉ khi state đang lưu vẫn ở `expectedStatus` (khoá dòng, kiểm tra và ghi trong một giao dịch).
   * Trả false nếu đã có thao tác khác đổi trạng thái trước — hai chi nhánh bấm nhận cùng lúc chỉ một người thắng.
   */
  saveSubcontractStateIfStatus(
    ctx: TenantContext,
    state: SubcontractOrderState,
    expectedStatus: SubcontractOrderState["dispatchStatus"]
  ): Promise<boolean>
}

export interface AutomatedDispatchResult {
  dispatched: boolean
  round: number
  invitedBranchesCount: number
  invitedBranchNames: string[]
  reason?: string | undefined
}

/**
 * Thực thi quy trình Bắn Đơn Gia Công Tự Động cho đơn hàng thuộc Chuỗi.
 */
export async function executeAutomatedChainDispatch(
  ctx: TenantContext,
  order: DispatchOrderInput,
  branches: BranchCandidate[],
  shopSettings: unknown,
  notifier: IDispatchNotifier,
  store: ISubcontractStateStore,
  now = new Date()
): Promise<AutomatedDispatchResult> {
  const policy: ChainDispatchPolicy = parseChainDispatchPolicy(shopSettings)

  // 1. Kiểm tra chính sách: Nếu tính năng bắn tự động bị tắt -> Điều phối xử lý thủ công
  if (!policy.enabled) {
    return {
      dispatched: false,
      round: 0,
      invitedBranchesCount: 0,
      invitedBranchNames: [],
      reason: "Tự động điều phối đang tắt trong Cài đặt",
    }
  }

  // 2. Tải trạng thái điều phối trước đó (nếu là vòng 2, 3...)
  const existingState = await store.loadSubcontractState(ctx, order.orderId)
  const round = existingState ? existingState.currentRound : 1
  const excludedBranchIds = existingState ? existingState.declinedBranchIds : []

  // 3. Khớp và chấm điểm các chi nhánh tiềm năng
  const matchResult: MatchBranchesResult = matchCandidateBranches(
    order.deliveryLocation,
    branches,
    policy,
    { excludedBranchIds, round }
  )

  if (matchResult.topCandidates.length === 0) {
    return {
      dispatched: false,
      round,
      invitedBranchesCount: 0,
      invitedBranchNames: [],
      reason: "Không có chi nhánh phù hợp trong bán kính hoặc tất cả chi nhánh đều bận",
    }
  }

  const baseUrl = order.baseUrl || "https://app.smeos.vn"
  const invitedBranchIds: string[] = []
  const invitedBranchNames: string[] = []

  // 4. Bắn thẻ gia công qua các kênh liên lạc của từng chi nhánh
  for (const candidate of matchResult.topCandidates) {
    const branch = candidate.branch
    const claimUrl = subcontractBranchUrl({
      baseUrl,
      organizationId: ctx.organizationId,
      orderCode: order.orderCode,
      branchId: branch.branchId,
    })

    const messageText = renderDispatchMessage(policy.messageTemplates.inviteSubcontract, {
      orderCode: order.orderCode,
      deliveryAddress: subcontractAreaText(order.deliveryArea),
      deliveryTime: order.deliveryTime,
      subcontractPriceVnd: order.subcontractPriceVnd.toLocaleString("vi-VN") + " đ",
      claimUrl,
      timeoutMinutes: policy.claimTimeoutMinutes,
      branchName: branch.branchName,
    })

    await notifier.sendSubcontractInvite(ctx, {
      branch,
      orderCode: order.orderCode,
      messageText,
      claimUrl,
    })

    invitedBranchIds.push(branch.branchId)
    invitedBranchNames.push(branch.branchName)
  }

  // 5. Cập nhật và lưu trạng thái State Machine của Subcontract Order
  const roundExpiry = new Date(now.getTime() + policy.claimTimeoutMinutes * 60 * 1000).toISOString()
  const nextState: SubcontractOrderState = {
    orderId: order.orderId,
    orderCode: order.orderCode,
    dispatchStatus: "OPEN",
    currentRound: round,
    claimedBranchId: null,
    claimedBranchName: null,
    claimedAt: null,
    graceExpiresAt: null,
    declinedBranchIds: excludedBranchIds,
    invitedBranchIds,
    roundExpiresAt: roundExpiry,
  }

  await store.saveSubcontractState(ctx, nextState)

  return {
    dispatched: true,
    round,
    invitedBranchesCount: invitedBranchIds.length,
    invitedBranchNames,
  }
}
