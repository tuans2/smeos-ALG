/**
 * GET /api/v1/platform/organizations (`N1`, P25a). POST (`N7`, gán gói cần `N19`): tạo tổ chức mới với tài
 * khoản chủ tiệm mật khẩu tạm và gói thuê bao — checklist ALG 9.10.
 * Xem đặc tả 06 mục 21 — ngoại lệ có chủ đích với Luật 2.
 */
import { jsonResponse } from "@/core/http/response"
import { listOrganizations } from "@/modules/platform/use-cases/list-organizations"
import { createOrganizationFromConsole } from "@/modules/platform/use-cases/create-organization"
import { validationFailed } from "@/core/http/errors"
import { createOrganizationBody } from "@/app/api/v1/platform/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ pctx }) => {
    return jsonResponse({ data: await listOrganizations(pctx) })
  },
})

export const POST = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx }) => {
    const parsed = createOrganizationBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await createOrganizationFromConsole(pctx, parsed.data) }, { status: 201 })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
