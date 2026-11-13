/**
 * advance-dispatch-round.ts
 *
 * Use-case: Hết hạn vòng nhận đơn mà chưa chi nhánh nào nhận → mời vòng tiếp theo
 * (loại các chi nhánh đã mời/đã từ chối), hoặc chuyển ESCALATED khi đã hết số vòng / hết ứng viên.
 * Gọi từ cron `internal/chain-dispatch-sweep`.
 */

import type { TenantContext } from "@/core/tenancy"
import { parseChainDispatchPolicy, renderDispatchMessage } from "../domain/chain-dispatch-policy"
import { buildDispatchTitle } from "../domain/dispatch-message-titles"
import { matchCandidateBranches, type BranchCandidate, type GeoCoordinate } from "../domain/chain-dispatch-engine"
import type { IDispatchNotifier, ISubcontractClaimStore } from "./dispatch-subcontract-order"
import { subcontractBranchUrl } from "@/modules/greeting-card/infra/subcontract-link-token"
import type { InviteCardRef, SubcontractOrderState } from "../domain/subcontract-order"
import { CLAIM_BUTTON_TEXT, closeCardsAfterClaim, expireRoundCards, inviteCardText, rememberInviteCard } from "./invite-cards"
import type { AdministrativeArea } from "../domain/area-match"
import { subcontractAreaText } from "../domain/subcontract-share"

export interface AdvanceDispatchRoundInput {
  state: SubcontractOrderState
  shopSettings: unknown
  branches: BranchCandidate[]
  deliveryAddress: string
  /** Toạ độ người nhận (null = xếp hạng không theo khoảng cách) */
  deliveryLocation?: GeoCoordinate | null | undefined
  /** Phường / quận / tỉnh người nhận — sàng lọc khi không có toạ độ */
  deliveryArea?: AdministrativeArea | null | undefined
  deliveryTime: string
  baseUrl: string
  imageUrl?: string | null | undefined
  coordinatorTelegramChatId?: string | null | undefined
}

export type AdvanceDispatchRoundResult =
  | { action: "NONE" }
  | { action: "NEXT_ROUND"; round: number; invitedBranchIds: string[]; sentCount: number }
  | { action: "ESCALATED"; reason: "MAX_ROUNDS" | "NO_CANDIDATES" }
  /** Một chi nhánh vừa nhận đơn trong lúc quét — không ghi đè */
  | { action: "SKIPPED_RACE" }

export async function advanceExpiredDispatchRound(
  ctx: TenantContext,
  input: AdvanceDispatchRoundInput,
  store: ISubcontractClaimStore,
  notifier: IDispatchNotifier,
  now = new Date()
): Promise<AdvanceDispatchRoundResult> {
  const { state } = input
  if (state.dispatchStatus !== "OPEN" || !state.roundExpiresAt) return { action: "NONE" }
  if (now.getTime() < new Date(state.roundExpiresAt).getTime()) return { action: "NONE" }

  const policy = parseChainDispatchPolicy(input.shopSettings)
  const previouslyInvited = [...new Set([...(state.previouslyInvitedBranchIds ?? []), ...state.invitedBranchIds])]
  const excludedBranchIds = [...new Set([...state.declinedBranchIds, ...previouslyInvited])]

  const match = state.currentRound < policy.maxRounds
    ? matchCandidateBranches(input.deliveryLocation ?? null, input.branches, policy, { excludedBranchIds, round: state.currentRound + 1, orderArea: input.deliveryArea })
    : null

  if (!match || match.topCandidates.length === 0) {
    const escalated: SubcontractOrderState = {
      ...state,
      dispatchStatus: "ESCALATED",
      previouslyInvitedBranchIds: previouslyInvited,
      invitedBranchIds: [],
      inviteCards: {},
      roundExpiresAt: null,
    }
    if (!(await store.saveSubcontractStateIfStatus(ctx, escalated, "OPEN"))) return { action: "SKIPPED_RACE" }
    await expireRoundCards(ctx, state, notifier)
    if (policy.autoEscalateToCoordinator && input.coordinatorTelegramChatId) {
      await notifier.sendSubcontractInvite(ctx, {
        branch: {
          branchId: "coordinator",
          branchName: "Điều phối",
          qualityScore: 100,
          activeJobsCount: 0,
          maxConcurrentJobs: 1,
          isActive: true,
          channels: { telegramChatId: input.coordinatorTelegramChatId },
        },
        orderCode: state.orderCode,
        messageText: `Đơn #${state.orderCode} đã qua ${state.currentRound} vòng mời nhưng chưa chi nhánh nào nhận. Điều phối vui lòng liên hệ chi nhánh trực tiếp.`,
        claimUrl: "",
        title: buildDispatchTitle({ emoji: "🚨", action: "Chưa có chi nhánh nhận", level: "normal", orderCode: state.orderCode }),
        actions: [],
      })
    }
    return { action: "ESCALATED", reason: match ? "NO_CANDIDATES" : "MAX_ROUNDS" }
  }

  const round = state.currentRound + 1
  const invitedBranchIds = match.topCandidates.map((c) => c.branch.branchId)
  const nextState: SubcontractOrderState = {
    ...state,
    currentRound: round,
    previouslyInvitedBranchIds: previouslyInvited,
    invitedBranchIds,
    inviteCards: {},
    roundExpiresAt: new Date(now.getTime() + policy.claimTimeoutMinutes * 60 * 1000).toISOString(),
  }
  // Ghi trước khi gửi: nếu chi nhánh vòng cũ vừa nhận thì dừng, không mời thêm ai
  if (!(await store.saveSubcontractStateIfStatus(ctx, nextState, "OPEN"))) return { action: "SKIPPED_RACE" }
  await expireRoundCards(ctx, state, notifier)

  const inviteCards: Record<string, InviteCardRef> = {}
  let sentCount = 0
  for (const { branch } of match.topCandidates) {
    const claimUrl = subcontractBranchUrl({
      baseUrl: input.baseUrl,
      organizationId: ctx.organizationId,
      orderCode: state.orderCode,
      branchId: branch.branchId,
    })
    const messageText = renderDispatchMessage(policy.messageTemplates.inviteSubcontract, {
      orderCode: state.orderCode,
      deliveryAddress: subcontractAreaText(input.deliveryArea), // P-4: tin mời chỉ ghi khu vực
      deliveryTime: input.deliveryTime,
      subcontractPriceVnd: (state.subcontractPriceVnd ?? 0).toLocaleString("vi-VN") + " đ",
      claimUrl,
      timeoutMinutes: policy.claimTimeoutMinutes,
      branchName: branch.branchName,
    })
    const title = `🌸 [ĐƠN GIA CÔNG #${state.orderCode}]`
    const res = await notifier.sendSubcontractInvite(ctx, {
      branch,
      orderCode: state.orderCode,
      messageText,
      claimUrl,
      title,
      actions: [{ text: CLAIM_BUTTON_TEXT, url: claimUrl }],
      imageUrl: input.imageUrl,
    })
    if (res.sent) sentCount++
    rememberInviteCard(inviteCards, branch.branchId, res, inviteCardText(title, messageText), claimUrl)
  }

  if (Object.keys(inviteCards).length > 0) {
    // Chỉ ghi khi đơn vẫn OPEN — nếu chi nhánh vòng mới đã nhận thì giữ nguyên trạng thái đó
    const saved = await store.saveSubcontractStateIfStatus(ctx, { ...nextState, inviteCards }, "OPEN")
    const latest = saved ? null : await store.loadSubcontractState(ctx, state.orderId)
    if (latest?.claimedBranchId) {
      await store.saveSubcontractStateIfStatus(ctx, { ...latest, inviteCards }, latest.dispatchStatus)
      await closeCardsAfterClaim(ctx, { ...latest, inviteCards }, latest.claimedBranchId, notifier)
    }
  }

  return { action: "NEXT_ROUND", round, invitedBranchIds, sentCount }
}
