/**
 * GET/PATCH/POST /api/v1/platform/fields (`N12`, ĐP-3 3.13).
 * GET: liệt kê (tuỳ chọn ?entity=ORDER|PARTNER). PATCH: sửa cấu hình
 * platform-wide của MỘT trường đã xây. POST: tạo trường tự tạo (D13).
 */
import { jsonResponse } from "@/core/http/response"
import { listFields } from "@/modules/field-platform/use-cases/list-fields"
import { updateFieldConfig } from "@/modules/field-platform/use-cases/update-field-config"
import { createCustomField } from "@/modules/field-platform/use-cases/create-custom-field"
import { updateFieldConfigSchema, createCustomFieldSchema, parseBody } from "@/modules/field-platform/adapters/http-schemas"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx }) => {
    const url = new URL(request.url)
    const entity = url.searchParams.get("entity") ?? undefined
    return jsonResponse({ data: await listFields(pctx, entity) })
  },
})

export const PATCH = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx }) => {
    const body = await parseBody(request, updateFieldConfigSchema)
    return jsonResponse({ data: await updateFieldConfig(pctx, body) })
  },
})

export const POST = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx }) => {
    const body = await parseBody(request, createCustomFieldSchema)
    return jsonResponse({ data: await createCustomField(pctx, body) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
