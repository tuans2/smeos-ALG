/**
 * GET /api/v1/field-config/settings?entity=… (`D18`) — danh sách trường cho màn Cài đặt → Trường dữ liệu:
 * trường nền tảng kèm mức sàn và trường riêng của cửa hàng (gồm cả trường đang ẩn). Checklist ALG 1.9.
 */
import { jsonResponse } from "@/core/http/response"
import { listShopFieldSettings } from "@/modules/field-platform/use-cases/manage-shop-fields"
import type { FieldEntity } from "@/modules/field-platform/domain/core-field-registry"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: listShopFieldSettings" },
  handler: async ({ request, ctx }) => {
    const raw = new URL(request.url).searchParams.get("entity")
    const entity: FieldEntity | undefined = raw === "ORDER" || raw === "PARTNER" ? raw : undefined
    return jsonResponse({ data: await listShopFieldSettings(ctx, entity) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
