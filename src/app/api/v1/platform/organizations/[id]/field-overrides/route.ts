/**
 * PUT /api/v1/platform/organizations/:id/field-overrides (`N12`, ĐP-3
 * 3.13) — ghi đè theo tổ chức, cho MỘT trường (`target: "field"`) hoặc MỘT
 * giá trị danh mục (`target: "catalogValue"`), chọn qua khoá body.
 */
import { jsonResponse } from "@/core/http/response"
import { recordPlatformAccess } from "@/modules/audit/use-cases/record-platform-access"
import {
  setFieldOverrideForOrganization,
  setCatalogValueOverrideForOrganization,
} from "@/modules/field-platform/use-cases/set-org-override"
import { parseBody } from "@/modules/field-platform/adapters/http-schemas"
import { fieldOverridesBody } from "@/app/api/v1/platform/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

export const PUT = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx, params }) => {
    await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
    const { id } = params as { id: string }
    const body = await parseBody(request, fieldOverridesBody)

    if (body.target === "field") {
      return jsonResponse({
        data: await setFieldOverrideForOrganization(pctx, { organizationId: id, ...body }),
      })
    }
    return jsonResponse({
      data: await setCatalogValueOverrideForOrganization(pctx, { organizationId: id, ...body }),
    })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
