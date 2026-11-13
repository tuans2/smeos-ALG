import { jsonResponse } from "@/core/http/response"
import { getAvailabilityBoard } from "@/modules/availability/use-cases/get-availability-board"

import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { defineRoute } from "@/core/http/define-route"

/**
 * GET /api/v1/availability/board?month=2026-10
 * Trả về toàn bộ dữ liệu bảng điều khiển khả dụng theo tháng và theo ngành của tổ chức.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "L1" },
  handler: async ({ request, ctx }) => {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month") ?? undefined

    const org = await new OrganizationRepository().current(ctx)
    const settings = org?.settings as Record<string, unknown> | null
    const industryKey = typeof settings?.industry === "string" ? settings.industry : "FLORAL"

    const board = await getAvailabilityBoard(
      ctx.organizationId,
      month,
      industryKey,
    )

    return jsonResponse(board)
  },
})

export const dynamic = "force-dynamic"
