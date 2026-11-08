import { handle, jsonResponse } from "@/core/http/response"
import { notFound, validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { setPartnerUnlockedTools } from "@/modules/chain-partnership/infra/partner-tool-settings-repository"
import { getChainPartnershipRepository } from "@/modules/chain-partnership/infra/prisma-partnership-repository"
import { partnerToolsBody } from "@/app/api/v1/_contracts/requests-coordinator"

export const PATCH = handle(async (request, { params }: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F2")
  const { id: partnershipId } = await params

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
    success: true,
    data: {
      partnershipId,
      partnerOrgId: partnership.partnerOrgId,
      unlockedTools: parsed.data.unlockedTools,
    },
  })
})
