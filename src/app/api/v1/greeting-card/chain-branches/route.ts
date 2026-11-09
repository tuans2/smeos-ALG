import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { ChainBranchRepository } from "@/modules/greeting-card/infra/chain-branch-repository"
import { listLinkedTelegramChatIds } from "@/modules/greeting-card/infra/telegram-linked-chats"

/**
 * GET /api/v1/greeting-card/chain-branches
 * Danh sách đối tác (chi nhánh / xưởng) của tổ chức kèm trạng thái và kênh nhận tin — để xem và
 * bật / tạm dừng mà không phải sửa Excel. `telegramLinked`: chat ID đã liên kết với tổ chức.
 */
export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.assignFlorist)

  const [branches, linked] = await Promise.all([
    new ChainBranchRepository().listCandidates(ctx.organizationId),
    listLinkedTelegramChatIds(ctx.organizationId),
  ])
  const linkedIds = new Set(linked)
  return jsonResponse({
    data: branches.map((b) => ({
      branchCode: b.branchId,
      name: b.branchName,
      address: b.address ?? null,
      phone: b.channels?.phone ?? null,
      isActive: b.isActive,
      telegramChatId: b.channels?.telegramChatId ?? null,
      telegramLinked: Boolean(b.channels?.telegramChatId && linkedIds.has(b.channels.telegramChatId)),
      zalo: Boolean(b.channels?.zaloUserId || b.channels?.zaloPhone),
      // Cửa hàng đối tác có tài khoản smeOS — tự vào danh sách khi liên kết, nhận thẻ mời trong Trao đổi nội bộ
      partnerStore: Boolean(b.partnerOrgId),
    })),
  })
})

export const dynamic = "force-dynamic"
