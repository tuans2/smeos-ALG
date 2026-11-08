import { handle, jsonResponse } from "@/core/http/response"
import { notFound, validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getChainPartnershipRepository } from "@/modules/chain-partnership/infra/prisma-partnership-repository"
import { partnershipStatusBody } from "@/app/api/v1/_contracts/requests-coordinator"

export const PATCH = handle<[{ params: Promise<{ id: string }> }]>(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F2")
  const { id: partnershipId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = partnershipStatusBody.safeParse(body)

  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
    throw validationFailed({ reason: errorDetails })
  }

  const partnershipRepo = getChainPartnershipRepository()
  // Chỉ chuỗi sở hữu quan hệ đối tác được đổi trạng thái; chuỗi khác → 404 (không lộ id tồn tại)
  const partnership = await partnershipRepo.findPartnershipById(partnershipId)
  if (!partnership || partnership.chainOrgId !== ctx.organizationId) throw notFound()
  const updated = await partnershipRepo.updateStatus(partnershipId, parsed.data.status)

  return jsonResponse({
    success: true,
    data: updated,
  })
})
