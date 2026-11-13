import { jsonResponse } from "@/core/http/response"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { ChainBranchRepository } from "@/modules/greeting-card/infra/chain-branch-repository"
import { zaloOaConfigFromEnv } from "@/modules/greeting-card/adapters/staff-channels/zalo-oa-platform"
import { defineRoute } from "@/core/http/define-route"

/**
 * GET /api/v1/greeting-card/integrations/zalo-dispatch
 * Trạng thái Zalo OA chung + mã liên kết của từng chi nhánh thuộc tổ chức (sinh mã nếu chưa có).
 * Nhân viên chi nhánh quan tâm OA rồi nhắn mã → nhận lời mời nhận đơn qua Zalo.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.integrationManage },
  handler: async ({ ctx }) => {
    const config = zaloOaConfigFromEnv()
    const configured = Boolean(config.appId && config.appSecret)
    const branches = configured ? await new ChainBranchRepository().listZaloLinks(ctx.organizationId) : []
    return jsonResponse({
      data: {
        configured,
        followUrl: process.env.ZALO_OA_FOLLOW_URL || null,
        branches,
      },
    })
  },
})

export const dynamic = "force-dynamic"
