import { jsonResponse } from "@/core/http/response"
import { notFound, validationFailed } from "@/core/http/errors"
import { setPartnerUnlockedTools } from "@/modules/chain-partnership/infra/partner-tool-settings-repository"
import { getChainPartnershipRepository } from "@/modules/chain-partnership/infra/prisma-partnership-repository"
import { partnerToolsBody } from "@/app/api/v1/_contracts/requests-coordinator"
import { defineRoute } from "@/core/http/define-route"

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx, params }) => {
    const { id: partnershipId } = params as { id: string }

    const partnershipRepo = getChainPartnershipRepository()
    const partnership = await partnershipRepo.findPartnershipById(partnershipId)

    if (!partnership) {
      throw notFound()
    }

    // Kiểm tra quyền: Chỉ chuỗi sở hữu quan hệ đối tác này mới được cấu hình
    if (partnership.chainOrgId !== ctx.organizationId) {
      throw notFound()
    }

    const rawBody = (await request.json()) as unknown
    const parsed = partnerToolsBody.safeParse(rawBody)

    if (!parsed.success) {
      throw validationFailed({ reason: "Dữ liệu danh mục công cụ không hợp lệ" })
    }

    const saved = await setPartnerUnlockedTools(partnership.partnerOrgId, [...new Set(parsed.data.unlockedTools)])
    if (!saved) {
      throw notFound()
    }

    return jsonResponse({
      data: {
        partnershipId,
        partnerOrgId: partnership.partnerOrgId,
        unlockedTools: parsed.data.unlockedTools,
      },
    })
  },
})
