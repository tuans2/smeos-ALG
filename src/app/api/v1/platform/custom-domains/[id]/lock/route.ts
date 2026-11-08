/**
 * POST /api/v1/platform/custom-domains/:id/lock (`N20`) — `{ locked: true, reason }` khoá tên miền riêng (ngừng
 * phục vụ ngay); `{ locked: false }` mở lại về "Chờ xác minh" (checklist ALG 10.8).
 */
import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { setCustomDomainLock } from "@/modules/custom-domain/use-cases/platform-custom-domains"
import { customDomainLockBody } from "@/app/api/v1/platform/_contracts/requests"

type Ctx = { params: Promise<{ id: string }> }

export const POST = handle(async (request, context: Ctx) => {
  const pctx = await requirePlatformContext(request)
  const { id } = await context.params
  const parsed = customDomainLockBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return jsonResponse({ data: await setCustomDomainLock(pctx, id, parsed.data) })
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
