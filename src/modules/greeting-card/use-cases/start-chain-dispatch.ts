/**
 * start-chain-dispatch.ts
 *
 * Xếp hạng chi nhánh cho một đơn và phát lệnh mời gia công — dùng chung cho Điều phối chọn thủ công
 * (`POST .../chain-dispatch`) và chế độ tự động hoàn toàn (ngay sau khi xác nhận đã nhận tiền).
 */

import { CHAIN_ONLY_MESSAGE, isChainOrganizationType } from "../domain/brochure-workflow-policy"
import type { TenantContext } from "@/core/tenancy"
import { conflict, notFound, validationFailed } from "@/core/http/errors"
import { publicAppUrl } from "@/lib/public-url"
import { matchCandidateBranches } from "../domain/chain-dispatch-engine"
import { parseChainDispatchPolicy, renderDispatchMessage } from "../domain/chain-dispatch-policy"
import { deliveryAreaOf, formatDeliveryAddress, hasDeliveryAddress } from "../domain/delivery-address"
import type { InviteCardRef, SubcontractOrderState } from "../domain/subcontract-order"
import { GoongGeocoder } from "../adapters/goong-geocoder"
import { ChainBranchRepository } from "../infra/chain-branch-repository"
import { MultiChannelDispatchNotifier } from "../infra/dispatch-notification-adapter"
import { subcontractBranchUrl } from "../infra/subcontract-link-token"
import { SubcontractOrderRepository } from "../infra/subcontract-order-repository"
import { hasCapability } from "@/core/rbac/capabilities"
import { GREETING_CARD_CAPABILITY } from "../domain/greeting-card-capabilities"
import { CraftFeeFactsRepository } from "../infra/craft-fee-facts-repository"
import { resolveDispatchCraftFee, suggestCraftFee } from "./suggest-craft-fee"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { CLAIM_BUTTON_TEXT, closeCardsAfterClaim, inviteCardText, rememberInviteCard } from "./invite-cards"
import { resolveDeliveryLocation } from "./resolve-geo-location"
import { subcontractAreaText } from "../domain/subcontract-share"

export interface DispatchSendResult {
  branchId: string
  branchName: string
  sent: boolean
  channel: string
  error?: string
}

export interface StartChainDispatchResult {
  dispatched: boolean
  orderCode: string
  sentCount: number
  totalTargeted: number
  results: DispatchSendResult[]
  claimUrl: string
}

/** Chi nhánh đã sàng lọc và xếp hạng cho đơn (khoảng cách thật nếu có toạ độ, không thì theo khu vực) */
export async function rankBranchesForOrder(ctx: TenantContext, orderId: string) {
  const stateRepo = new SubcontractOrderRepository()
  const order = await stateRepo.findOrderForChainDispatch(ctx.organizationId, orderId)
  if (!order) throw notFound()
  const recipientAddress = formatDeliveryAddress(order.delivery_address)
  const shop = await new OrganizationRepository().current(ctx)
  if (!isChainOrganizationType(shop?.type)) throw conflict(CHAIN_ONLY_MESSAGE)
  const policy = parseChainDispatchPolicy(shop?.settings as Record<string, unknown> | null | undefined)
  const branches = await new ChainBranchRepository().listCandidates(ctx.organizationId)
  const orderLocation = hasDeliveryAddress(recipientAddress)
    ? await resolveDeliveryLocation(ctx, { orderId: order.id, address: recipientAddress }, new GoongGeocoder(), stateRepo)
    : null
  const matchResult = matchCandidateBranches(orderLocation, branches, policy, {
    excludedBranchIds: [],
    round: 1,
    orderArea: deliveryAreaOf(order.delivery_address),
  })
  return { order, recipientAddress, policy, branches, orderLocation, matchResult }
}

/**
 * Mở vòng mời và gửi thẻ gia công. `approvedBranchIds` có giá trị = Điều phối đã chọn; bỏ trống = tự động
 * lấy nhóm chi nhánh xếp hạng cao nhất (topN theo chính sách).
 */
export async function startChainDispatch(
  ctx: TenantContext,
  orderId: string,
  input: { approvedBranchIds?: string[] | undefined; subcontractPriceVnd?: number | undefined } = {}
): Promise<StartChainDispatchResult> {
  const stateRepo = new SubcontractOrderRepository()
  const ranking = await rankBranchesForOrder(ctx, orderId)
  const { order, recipientAddress, policy, branches: allBranches } = ranking
  const approvedBranchIds = input.approvedBranchIds ?? ranking.matchResult.topCandidates.map((c) => c.branch.branchId)
  const subcontractPriceVnd = input.subcontractPriceVnd

  const deliveryWindow = (order.delivery_window as Record<string, unknown> | null) ?? {}
  const deliveryTime = typeof deliveryWindow.timeSlot === "string" && typeof deliveryWindow.date === "string"
    ? `${deliveryWindow.timeSlot} ngày ${deliveryWindow.date}`
    : "Giao trong ngày"

  // Lọc ra các chi nhánh được duyệt
  const approvedBranches = allBranches.filter((b) => approvedBranchIds.includes(b.branchId))
  if (approvedBranches.length === 0) throw validationFailed({ approvedBranchIds: "Không tìm thấy chi nhánh hợp lệ trong danh sách" })

  // Phí theo phương án tiệm đã cài (mặc định 50% giá hàng trước VAT, có sàn/trần) — PO 22/10/2026
  const suggestion = await suggestCraftFee(ctx.organizationId, order.id, new CraftFeeFactsRepository())
  const craftFeeRecord = resolveDispatchCraftFee(suggestion, subcontractPriceVnd, {
    canApproveOutsideBand: hasCapability(ctx, GREETING_CARD_CAPABILITY.paymentRecord),
    actorId: ctx.userId,
  })
  const craftFee = craftFeeRecord.finalVnd

  // Link có chữ ký gửi cho chi nhánh luôn dùng địa chỉ cấu hình — header Host do client gửi từng đưa
  // token sang tên miền tuỳ ý (rà soát cụm G, 22/10/2026)
  const claimBaseUrl = publicAppUrl()

  // Khởi tạo Subcontract state
  const notifier = new MultiChannelDispatchNotifier()

  if (order.status === "CANCELLED" || order.status === "COMPLETED") throw conflict("Đơn hàng đã huỷ hoặc đã hoàn tất.")
  const roundExpiry = new Date(Date.now() + policy.claimTimeoutMinutes * 60 * 1000).toISOString()
  // Mở vòng mời mới dưới khoá dòng. Đơn đã có chi nhánh nhận/chốt thì không mở lại — "Gửi lại" trước
  // 22/10/2026 xoá mất chi nhánh đang làm đơn (rà soát cụm G). Chi nhánh đã từ chối không được mời lại.
  const subcontractState = await stateRepo.updateSubcontractState(ctx, order.id, (current) => {
    if (current && (current.dispatchStatus === "CLAIMED_GRACE" || current.dispatchStatus === "COMMITTED")) {
      throw conflict("Đơn đã có chi nhánh nhận. Huỷ nhận của chi nhánh đó trước khi mời lại.")
    }
    const declined = current?.declinedBranchIds ?? []
    const invited = approvedBranches.map((b) => b.branchId).filter((id) => !declined.includes(id))
    if (invited.length === 0) throw validationFailed({ approvedBranchIds: "Các chi nhánh đã chọn đều đã từ chối đơn này" })
    const next: SubcontractOrderState = {
      ...(current ?? {}),
      orderId: order.id,
      orderCode: order.code,
      dispatchStatus: "OPEN",
      currentRound: (current?.currentRound ?? 0) + 1,
      claimedBranchId: null,
      claimedBranchName: null,
      claimedAt: null,
      graceExpiresAt: null,
      declinedBranchIds: declined,
      invitedBranchIds: invited,
      roundExpiresAt: roundExpiry,
      subcontractPriceVnd: craftFee,
      craftFee: craftFeeRecord,
    }
    return { next, result: next }
  })
  const invitedBranches = approvedBranches.filter((b) => subcontractState.invitedBranchIds.includes(b.branchId))

  // Đồng bộ giá gia công vào pricing_rule_ref của đơn hàng để làm SSOT xuyên suốt
  const existingPricingRef = (order.pricing_rule_ref as Record<string, unknown> | null) ?? {}
  await stateRepo.updatePricingRef(ctx.organizationId, order.id, { ...existingPricingRef, subcontract_price_vnd: craftFee })

  // Phát lệnh gửi tin nhắn riêng 1:1 cho từng chi nhánh được duyệt
  const inviteCards: Record<string, InviteCardRef> = {}
  const results: DispatchSendResult[] = []

  for (const branch of invitedBranches) {
    const claimUrl = subcontractBranchUrl({
      baseUrl: claimBaseUrl,
      organizationId: ctx.organizationId,
      orderCode: order.code,
      branchId: branch.branchId,
    })
    const messageText = renderDispatchMessage(policy.messageTemplates.inviteSubcontract, {
      orderCode: order.code,
      deliveryAddress: subcontractAreaText(deliveryAreaOf(order.delivery_address)), // P-4: tin mời chỉ ghi khu vực
      deliveryTime,
      subcontractPriceVnd: craftFee.toLocaleString("vi-VN") + " đ",
      claimUrl,
      timeoutMinutes: policy.claimTimeoutMinutes,
      branchName: branch.branchName,
    })

    const { resolveSubcontractSamplePhoto } = await import("@/modules/greeting-card/use-cases/resolve-subcontract-sample-photo")
    const sampleImageUrl = await resolveSubcontractSamplePhoto(order, { baseUrl: claimBaseUrl })

    const title = `🌸 [ĐƠN GIA CÔNG #${order.code}]`
    const sendResult = await notifier.sendSubcontractInvite(ctx, {
      branch,
      orderCode: order.code,
      messageText,
      claimUrl,
      title,
      actions: [{ text: CLAIM_BUTTON_TEXT, url: claimUrl }],
      imageUrl: sampleImageUrl,
    })

    rememberInviteCard(inviteCards, branch.branchId, sendResult, inviteCardText(title, messageText), claimUrl)

    // Không có Telegram / Zalo: lời mời vẫn hiện trên trang cửa hàng (/cua-hang) của chi nhánh
    const channel = branch.channels?.telegramChatId ? "TELEGRAM"
      : branch.channels?.zaloUserId ? "ZALO"
      : "APP"

    results.push({
      branchId: branch.branchId,
      branchName: branch.branchName,
      sent: sendResult.sent,
      channel,
      ...(sendResult.error ? { error: sendResult.error } : {}),
    })
  }

  // Lưu thẻ mời riêng từng chi nhánh — để sửa thẻ khi có chi nhánh nhận / huỷ (không còn ghi đè bằng thẻ cuối)
  // Chi nhánh có thể đã bấm nhận trong lúc đang gửi: gộp vào state mới nhất, không đè trạng thái đã nhận
  if (Object.keys(inviteCards).length > 0) {
    const merged = await stateRepo.updateSubcontractState(ctx, order.id, (latest) => {
      const next = { ...(latest ?? subcontractState), inviteCards: { ...latest?.inviteCards, ...inviteCards } }
      return { next, result: next }
    })
    if (merged.claimedBranchId) await closeCardsAfterClaim(ctx, merged, merged.claimedBranchId, notifier)
  }

  const sentCount = results.filter((r) => r.sent).length

  return {
    dispatched: sentCount > 0,
    orderCode: order.code,
    sentCount,
    totalTargeted: invitedBranches.length,
    results,
    claimUrl: `${claimBaseUrl}/subcontract/${order.code}`,
  }
}
