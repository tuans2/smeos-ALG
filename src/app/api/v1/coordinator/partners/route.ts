import { handle, jsonResponse } from "@/core/http/response"
import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getChainPartnershipRepository } from "@/modules/chain-partnership/infra/prisma-partnership-repository"
import { getInternalChatRepository } from "@/modules/internal-chat/infra/prisma-chat-repository"
import { ListChainPartnersUseCase } from "@/modules/chain-partnership/use-cases/list-chain-partners"
import { ProvisionPartnerAccountUseCase } from "@/modules/chain-partnership/use-cases/provision-partner-account"
import { provisionPartnerBody } from "@/app/api/v1/_contracts/requests-coordinator"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  const url = new URL(request.url)

  // 1. Luồng coordinator workshop partners truyền thống (?active=1)
  if (url.searchParams.has("active")) {
    const { listPartners } = await import("@/modules/coordinator/use-cases/manage-partners")
    requireCapability(ctx, "R1")
    const activeOnly = url.searchParams.get("active") === "1"
    const partners = await listPartners(ctx, { activeOnly })
    return jsonResponse({ partners })
  }

  // 2. Luồng Chain Partnership mới
  requireCapability(ctx, "F1")
  const status = url.searchParams.get("status") as never
  const province = url.searchParams.get("province") ?? undefined
  const query = url.searchParams.get("q") ?? undefined

  const partnershipRepo = getChainPartnershipRepository()
  const useCase = new ListChainPartnersUseCase(partnershipRepo)

  const result = await useCase.execute({
    chainOrgId: ctx.organizationId,
    status: status || undefined,
    province,
    query,
  })

  return jsonResponse({
    success: true,
    data: result.items,
    partners: result.items,
    total: result.total,
  })
})

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  const body = await request.json().catch(() => null)

  // 1. Nếu là luồng Provision tài khoản đối tác chuỗi mới (Chain Partnership)
  if (body && ("partnerStoreName" in body || "contactEmail" in body)) {
    // AUD-009: cấp tài khoản + tổ chức mới — chỉ Điều hành (F2, hardCap)
    requireCapability(ctx, "F2")
    const parsed = provisionPartnerBody.safeParse(body)
    if (!parsed.success) {
      const errorDetails = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
      throw validationFailed({ reason: errorDetails })
    }

    const partnershipRepo = getChainPartnershipRepository()
    const chatRepo = getInternalChatRepository()
    const useCase = new ProvisionPartnerAccountUseCase(partnershipRepo, chatRepo)

    const { partnership, temporaryPassword } = await useCase.execute(
      {
        chainOrgId: ctx.organizationId,
        partnerStoreName: parsed.data.partnerStoreName,
        partnerCode: parsed.data.partnerCode,
        partnershipType: parsed.data.partnershipType,
        contactName: parsed.data.contactName,
        contactPhone: parsed.data.contactPhone,
        contactEmail: parsed.data.contactEmail,
        password: parsed.data.password,
        address: parsed.data.address,
        province: parsed.data.province,
        district: parsed.data.district,
        capacityDaily: parsed.data.capacityDaily,
        commissionRate: parsed.data.commissionRate,
      },
      ctx.userId
    )

    return jsonResponse(
      {
        success: true,
        data: partnership,
        // Chỉ trả về đúng một lần — Điều hành chuyển cho đối tác và đối tác đổi sau khi đăng nhập
        ...(temporaryPassword ? { temporaryPassword } : {}),
      },
      { status: 201 }
    )
  }

  // 2. Luồng quản lý đối tác gia công truyền thống của Điều phối (Coordinator Workshop Partners)
  const { createPartnerSchema } = await import("@/modules/coordinator/adapters/http-schemas")
  const { createPartner } = await import("@/modules/coordinator/use-cases/manage-partners")

  requireCapability(ctx, "R4")
  const parsed = createPartnerSchema.safeParse(body)
  if (!parsed.success) {
    throw validationFailed({ issues: parsed.error.issues })
  }

  const partner = await createPartner(ctx, parsed.data)
  return jsonResponse({ partner }, { status: 201 })
})

