import { jsonResponse } from "@/core/http/response"
import { validationFailed } from "@/core/http/errors"
import { getChainPartnershipRepository } from "@/modules/chain-partnership/infra/prisma-partnership-repository"
import { LinkExistingStoreUseCase } from "@/modules/chain-partnership/use-cases/link-existing-store"
import { linkExistingBody } from "@/app/api/v1/_contracts/requests-coordinator"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx }) => {
    const body = await request.json().catch(() => null)
    const parsed = linkExistingBody.safeParse(body)

    if (!parsed.success) {
      const errorDetails = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
      throw validationFailed({ reason: errorDetails })
    }

    // Lỗi nghiệp vụ (không phải Chuỗi → 409, không tìm thấy → 404, đã liên kết → 409) đi thẳng qua `handle`;
    // trước đây mọi lỗi bị gói thành 400 kèm câu chữ nội bộ.
    const partnership = await new LinkExistingStoreUseCase(getChainPartnershipRepository()).execute({
      chainOrgId: ctx.organizationId,
      identifier: parsed.data.identifier,
      partnerCode: parsed.data.partnerCode,
      partnershipType: parsed.data.partnershipType,
      commissionRate: parsed.data.commissionRate,
      capacityDaily: parsed.data.capacityDaily,
    })

    return jsonResponse({ data: partnership }, { status: 201 })
  },
})
