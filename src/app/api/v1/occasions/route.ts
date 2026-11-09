import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { handle, jsonResponse } from "@/core/http/response"
import { createOccasion } from "@/modules/organization/use-cases/create-occasion"
import { listOccasions } from "@/modules/organization/use-cases/list-occasions"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { createOccasionBody } from "@/app/api/v1/_contracts/requests-marketing"

// nợ #104: danh mục dịp là một phần hồ sơ tổ chức (giống brand-profile) — dùng
// chung F1 (org.read)/F2 (org.update), không xin mã năng lực F-mới riêng vì
// 38 mã F–L gốc (đặc tả 02 mục 4) đã đóng, và tính năng này không nằm trong
// đặc tả đó (chốt qua AskUserQuestion 17/09, không phải một hạng mục có sẵn).
export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F1")
  return jsonResponse({ data: await listOccasions(ctx), next_cursor: null })
})

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F2")

  const parsed = createOccasionBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const occasion = await createOccasion(ctx, {
    code: parsed.data.code,
    name: parsed.data.name,
    ...(parsed.data.register !== undefined ? { register: parsed.data.register } : {}),
    ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
  })
  return jsonResponse({ occasion }, { status: 201 })
})
