/**
 * GET /api/v1/field-config?entity=… (`R1`, tenant — cấu hình trường hiệu lực, ĐP-3 3.14).
 * POST (`D18`): cửa hàng tạo trường riêng. PUT (`D18`): ẩn/hiện, đổi nhãn, nâng mức một trường trong
 * phạm vi sàn nền tảng (checklist ALG 1.9). Tổ chức lấy từ phiên; trường riêng của tổ chức khác → 404.
 */
import { jsonResponse } from "@/core/http/response"
import { getEffectiveFieldConfig } from "@/modules/field-platform/use-cases/get-effective-field-config"
import { createShopField, updateShopField } from "@/modules/field-platform/use-cases/manage-shop-fields"
import { createShopFieldSchema, parseBody, updateShopFieldSchema } from "@/modules/field-platform/adapters/http-schemas"
import type { FieldEntity } from "@/modules/field-platform/domain/core-field-registry"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: getEffectiveFieldConfig" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const entity = (url.searchParams.get("entity") ?? undefined) as FieldEntity | undefined
    return jsonResponse({ data: await getEffectiveFieldConfig(ctx, entity) })
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: createShopField" },
  handler: async ({ request, ctx }) => {
    const body = await parseBody(request, createShopFieldSchema)
    return jsonResponse({ data: await createShopField(ctx, body) }, { status: 201 })
  },
})

export const PUT = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: updateShopField" },
  handler: async ({ request, ctx }) => {
    const body = await parseBody(request, updateShopFieldSchema)
    return jsonResponse({ data: await updateShopField(ctx, body) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
