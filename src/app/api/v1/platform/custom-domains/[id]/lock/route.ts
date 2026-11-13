/**
 * POST /api/v1/platform/custom-domains/:id/lock (`N20`) — `{ locked: true, reason }` khoá tên miền riêng (ngừng
 * phục vụ ngay); `{ locked: false }` mở lại về "Chờ xác minh" (checklist ALG 10.8).
 */
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { setCustomDomainLock } from "@/modules/custom-domain/use-cases/platform-custom-domains"
import { customDomainLockBody } from "@/app/api/v1/platform/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

type Ctx = { params: Promise<{ id: string }> }

export const POST = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx, params }) => {
    const { id } = params as { id: string }
    const parsed = customDomainLockBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await setCustomDomainLock(pctx, id, parsed.data) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
