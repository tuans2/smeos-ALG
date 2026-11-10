/**
 * GET/POST /api/v1/custom-domains (`D19`, chỉ Điều hành) — tên miền riêng của cửa hàng (checklist ALG 10.8).
 * GET: danh sách kèm bản ghi DNS cần thêm. POST `{ hostname }`: gắn tên miền mới (chờ xác minh).
 */
import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { addCustomDomainBody } from "@/app/api/v1/_contracts/requests-profile"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { addCustomDomain, listCustomDomains } from "@/modules/custom-domain/use-cases/manage-custom-domains"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  return jsonResponse({ data: await listCustomDomains(ctx) })
})

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  const parsed = addCustomDomainBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ hostname: "Vui lòng nhập tên miền." })
  return jsonResponse({ data: await addCustomDomain(ctx, parsed.data) }, { status: 201 })
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
