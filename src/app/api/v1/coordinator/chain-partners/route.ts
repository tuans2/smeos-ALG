import { jsonResponse } from "@/core/http/response"
import { validationFailed } from "@/core/http/errors"
import { getChainPartnershipRepository } from "@/modules/chain-partnership/infra/prisma-partnership-repository"
import { getInternalChatRepository } from "@/modules/internal-chat/infra/prisma-chat-repository"
import { ListChainPartnersUseCase } from "@/modules/chain-partnership/use-cases/list-chain-partners"
import { ProvisionPartnerAccountUseCase } from "@/modules/chain-partnership/use-cases/provision-partner-account"
import { provisionPartnerBody } from "@/app/api/v1/_contracts/requests-coordinator"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

/**
 * Cửa hàng đối tác của chuỗi (`organization_links`). Tách khỏi `/coordinator/partners` (PO 12/11/2026): route cũ
 * phân nhánh theo query/thân giữa hai nghiệp vụ, nên màn đối tác gia công và bảng điều phối từng nhận nhầm danh
 * sách này. Các route con `/coordinator/partners/link-existing`, `/[id]/status`, `/[id]/tools` giữ đường dẫn.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get("status") as never
    const province = url.searchParams.get("province") ?? undefined
    const query = url.searchParams.get("q") ?? undefined
    const result = await new ListChainPartnersUseCase(getChainPartnershipRepository()).execute({
      chainOrgId: ctx.organizationId,
      status: status || undefined,
      province,
      query,
    })
    return jsonResponse({ data: result.items, meta: { total: result.total } })
  },
})

/** Tạo tài khoản + tổ chức cửa hàng đối tác mới — chỉ Điều hành (AUD-009, `F2` hardCap). Mật khẩu tạm trả MỘT lần. */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx }) => {
    const parsed = provisionPartnerBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      const errorDetails = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
      throw validationFailed({ reason: errorDetails })
    }
    const input = camelKeys(parsed.data)

    const partnershipRepo = getChainPartnershipRepository()
    const chatRepo = getInternalChatRepository()
    const useCase = new ProvisionPartnerAccountUseCase(partnershipRepo, chatRepo)

    const { partnership, temporaryPassword } = await useCase.execute(
      {
        chainOrgId: ctx.organizationId,
        partnerStoreName: input.partnerStoreName,
        partnerCode: input.partnerCode,
        partnershipType: input.partnershipType,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        password: input.password,
        address: input.address,
        province: input.province,
        district: input.district,
        capacityDaily: input.capacityDaily,
        commissionRate: input.commissionRate,
      },
      ctx.userId
    )

    return jsonResponse(
      { data: { partnership, ...(temporaryPassword ? { temporary_password: temporaryPassword } : {}) } },
      { status: 201 }
    )
  },
})
