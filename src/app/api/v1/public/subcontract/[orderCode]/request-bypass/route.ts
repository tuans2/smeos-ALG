/**
 * request-bypass/route.ts
 *
 * POST /api/v1/public/subcontract/[orderCode]/request-bypass
 *
 * Cửa hàng xin bỏ qua bằng chứng (QC, Shipper, POD) vì lý do bất khả kháng.
 * Gửi thông báo đến Điều phối viên qua Telegram/Zalo và tạo pending request trên Thẻ Điều phối.
 */

import { conflict, unprocessable, validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { loadSubcontractOrderForBranch } from "@/modules/greeting-card/use-cases/authorize-subcontract-branch"
import { SubcontractOrderRepository } from "@/modules/greeting-card/infra/subcontract-order-repository"
import { escapeTelegramHtml } from "@/modules/greeting-card/domain/chain-dispatch-policy"
import { publicAppUrl } from "@/lib/public-url"
import { MultiChannelDispatchNotifier } from "@/modules/greeting-card/infra/dispatch-notification-adapter"
import { SubcontractStepStore } from "@/modules/greeting-card/infra/subcontract-step-store"
import type { TenantContext } from "@/core/tenancy"
import { subcontractBypassBody } from "@/app/api/v1/public/_contracts/requests"

export const POST = handle<[{ params: Promise<{ orderCode: string }> }]>(async (request, context) => {
  await enforceRateLimit(request, { scope: "subcontract-bypass-request", limit: 20, windowMs: 60_000 })
  const { orderCode } = await context.params

  const body = await request.json().catch(() => ({}))
  const parsed = subcontractBypassBody.safeParse(body)
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const { branchId, step, reason } = parsed.data
  const repo = new SubcontractOrderRepository()
  const order = await loadSubcontractOrderForBranch(request, orderCode, branchId, repo)

  const branch = await repo.findBranchInOrganization(branchId, order.organization_id)
  if (!branch) throw unprocessable("Chi nhánh không hợp lệ hoặc không thuộc hệ thống.")

  const nowIso = new Date().toISOString()
  // Kiểm và ghi dưới khoá dòng: chi nhánh đang làm đơn, công đoạn chưa chờ duyệt/đã duyệt
  await new SubcontractStepStore().mutateMetadata(order.organization_id, order.id, (current) => {
    const dispatch = current.subcontract_dispatch as { claimedBranchId?: string | null } | undefined
    // Chi nhánh được mời nhưng không nhận vẫn giữ link 14 ngày: trước 22/10/2026 ghi đè được yêu
    // cầu của chi nhánh đang làm đơn (rà soát cụm G)
    if (dispatch?.claimedBranchId !== branch.id) throw conflict("Chỉ chi nhánh đang thực hiện đơn này mới gửi được yêu cầu.")
    const requests = (current.bypass_requests as Record<string, unknown> | undefined) ?? {}
    const previous = (requests[step] as { status?: string } | undefined)?.status
    if (previous === "PENDING") throw conflict("Yêu cầu cho công đoạn này đang chờ điều phối duyệt.")
    if (previous === "APPROVED") throw conflict("Công đoạn này đã được duyệt bỏ qua.")
    const request = {
      requestedAt: nowIso, requestedByBranchId: branch.id, requestedByBranchName: branch.name,
      reason, status: "PENDING", decisionAt: null, decidedBy: null,
    }
    return { next: { ...current, bypass_requests: { ...requests, [step]: request } }, result: undefined }
  })

  // Báo Điều phối qua kênh điều phối của CHÍNH tổ chức. Không rơi về nhóm chung của nền tảng hay
  // nhóm của chi nhánh khác; thiếu kênh thì Điều phối vẫn thấy yêu cầu trên Thẻ Điều phối.
  const org = await repo.findOrganizationSettings(order.organization_id)
  const settings = (org?.settings as Record<string, unknown> | null) ?? {}
  const coordChannel = settings.coordinator_channel as { telegramChatId?: string; phone?: string } | undefined
  const targetChatId = coordChannel?.telegramChatId
  let notified = false

  if (targetChatId) {
    const notifier = new MultiChannelDispatchNotifier()
    const ctx: TenantContext = {
      organizationId: order.organization_id,
      workspaceId: "default",
      userId: `branch_${branch.id}`,
      branchId: branch.id,
      capabilities: new Set(),
    }

    const stepLabel = step === "QC" ? "Ảnh thành phẩm (QC)" : step === "SHIPPER" ? "Thông tin Shipper" : "Bằng chứng giao hàng (POD)"
    const alertMsg = `⚠️ [XIN BỎ QUA BẰNG CHỨNG - CẦN DUYỆT]\nĐơn hàng: #${order.code}\nChi nhánh: ${escapeTelegramHtml(branch.name)}\nCông đoạn: ${stepLabel}\nLý do: "${escapeTelegramHtml(reason)}"\n\n👉 Điều phối vui lòng kiểm tra và duyệt trong Tab Quản lý / Điều phối để đơn hàng tiếp tục được thực hiện.`

    const sent = await notifier.sendSubcontractInvite(ctx, {
      branch: {
        branchId: "coordinator",
        branchName: "Điều Phối Chuỗi",
        qualityScore: 100,
        activeJobsCount: 0,
        maxConcurrentJobs: 1,
        isActive: true,
        channels: {
          telegramChatId: targetChatId,
          phone: coordChannel?.phone,
        },
      },
      orderCode: order.code,
      title: `⚠️ [XIN BỎ QUA BẰNG CHỨNG #${order.code}]`,
      messageText: alertMsg,
      claimUrl: `${publicAppUrl()}/the-chao`,
    }).catch(() => ({ sent: false }))
    notified = sent.sent
  }

  return jsonResponse({
    data: {
      success: true,
      message: "Yêu cầu bỏ qua bằng chứng đã được gửi đến Điều phối viên. Vui lòng chờ phê duyệt để tiếp tục bước tiếp theo.",
      step,
      status: "PENDING",
      requestedAt: nowIso,
      coordinatorNotified: notified,
    },
  })
})

export const dynamic = "force-dynamic"
