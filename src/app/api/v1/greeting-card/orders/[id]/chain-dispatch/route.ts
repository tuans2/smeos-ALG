import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { SubcontractOrderRepository } from "@/modules/greeting-card/infra/subcontract-order-repository"
import { CraftFeeFactsRepository } from "@/modules/greeting-card/infra/craft-fee-facts-repository"
import { suggestCraftFee } from "@/modules/greeting-card/use-cases/suggest-craft-fee"
import { listLinkedTelegramChatIds } from "@/modules/greeting-card/infra/telegram-linked-chats"
import { rankBranchesForOrder, startChainDispatch } from "@/modules/greeting-card/use-cases/start-chain-dispatch"
import { chainDispatchBody } from "@/app/api/v1/_contracts/requests-greeting-orders"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

type RouteCtx = { params: Promise<{ id: string }> }

/**
 * GET /api/v1/greeting-card/orders/[id]/chain-dispatch
 * Trả về danh sách chi nhánh đã sàng lọc, xếp hạng tự động theo địa chỉ giao hàng của đơn.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.assignFlorist },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }

    const { order, recipientAddress, policy, orderLocation, matchResult } = await rankBranchesForOrder(ctx, id)
    const stateRepo = new SubcontractOrderRepository()

    const linkedChatIds = new Set(await listLinkedTelegramChatIds(ctx.organizationId))

    // Tải trạng thái điều phối của đơn hàng (nếu đã tiếp nhận hoặc đã chốt)
    const subcontractState = await stateRepo.loadSubcontractState(ctx, order.id)
    const suggestion = await suggestCraftFee(ctx.organizationId, order.id, new CraftFeeFactsRepository())

    return jsonResponse({
      data: {
        orderCode: order.code,
        deliveryAddress: recipientAddress,
        deliveryLocationResolved: Boolean(orderLocation),
        dispatchState: subcontractState
          ? {
              status: subcontractState.dispatchStatus,
              claimedBranchId: subcontractState.claimedBranchId,
              claimedBranchName: subcontractState.claimedBranchName,
              claimedAt: subcontractState.claimedAt,
              graceExpiresAt: subcontractState.graceExpiresAt,
              remindersSent: subcontractState.remindersSent,
            }
          : null,
        topBranches: matchResult.topCandidates.map((sc) => ({
          branchId: sc.branch.branchId,
          branchName: sc.branch.branchName,
          distanceKm: sc.distanceKm,
          areaMatch: sc.areaMatch,
          qualityScore: sc.branch.qualityScore,
          activeJobsCount: sc.branch.activeJobsCount,
          totalScore: sc.totalScore,
          rank: sc.rank,
          channels: {
            hasTelegram: Boolean(sc.branch.channels?.telegramChatId),
            // Bot chung chỉ gửi tới chat đã nhắn mã liên kết của tổ chức — báo trước khi phát lệnh
            telegramLinked: Boolean(sc.branch.channels?.telegramChatId && linkedChatIds.has(sc.branch.channels.telegramChatId)),
            hasZalo: Boolean(sc.branch.channels?.zaloUserId),
            phone: sc.branch.channels?.phone,
          },
        })),
        craftFee: {
          feeLabel: suggestion.feeLabel,
          suggestedVnd: suggestion.suggestedVnd,
          lines: suggestion.lines,
          adjustPercent: suggestion.adjustPercent,
          finalVnd: subcontractState?.craftFee?.finalVnd ?? subcontractState?.subcontractPriceVnd ?? null,
        },
        policy: {
          topN: policy.topN,
          claimWindowMinutes: policy.claimTimeoutMinutes,
        },
      },
    })
  },
})

/**
 * POST /api/v1/greeting-card/orders/[id]/chain-dispatch
 * Điều hành duyệt danh sách chi nhánh → hệ thống phát lệnh gửi tin nhắn riêng 1:1 cho từng chi nhánh.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.assignFlorist },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await request.json().catch(() => ({}))
    const parsed = chainDispatchBody.safeParse(body)
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const input = camelKeys(parsed.data)

    const { approvedBranchIds, subcontractPriceVnd } = input

    const result = await startChainDispatch(ctx, id, { approvedBranchIds, subcontractPriceVnd })
    return jsonResponse({ data: result })
  },
})

export const dynamic = "force-dynamic"
