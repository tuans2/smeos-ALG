import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { getTemplateOverrides } from "@/modules/templates/use-cases/get-template-overrides"
import { setTemplateOverride } from "@/modules/templates/use-cases/set-template-override"
import { putTemplateOverrideBody } from "@/app/api/v1/_contracts/requests-tools"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

// nợ #99: ghi đè template là một phần hồ sơ tổ chức, giống danh mục dịp (nợ
// #104) — dùng chung F1 (org.read)/F2 (org.update), không xin mã năng lực
// F-mới riêng, cùng lý do đã áp dụng cho `/occasions`.
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ request, ctx }) => {
    const templateKey = new URL(request.url).searchParams.get("template_key")
    if (!templateKey) throw validationFailed({ template_key: "Thiếu template_key" })

    return jsonResponse({ data: await getTemplateOverrides(ctx, templateKey), next_cursor: null })
  },
})

export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx }) => {
    const parsed = putTemplateOverrideBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const input = camelKeys(parsed.data)

    const override = await setTemplateOverride(ctx, input)
    return jsonResponse({ override })
  },
})
