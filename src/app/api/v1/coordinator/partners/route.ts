import { jsonResponse } from "@/core/http/response"
import { validationFailed } from "@/core/http/errors"
import { createPartnerSchema } from "@/modules/coordinator/adapters/http-schemas"
import { createPartner, listPartners } from "@/modules/coordinator/use-cases/manage-partners"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

/**
 * Đối tác gia công của Điều phối. Cửa hàng đối tác của chuỗi ở `/coordinator/chain-partners` (tách 12/11/2026 —
 * trước đó route này phân nhánh theo `?active` / thân, gọi không kèm `active` thì nhận nhầm danh sách chuỗi).
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R1" },
  handler: async ({ request, ctx }) => {
    const activeOnly = new URL(request.url).searchParams.get("active") === "1"
    return jsonResponse({ data: await listPartners(ctx, { activeOnly }) })
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "R4" },
  handler: async ({ request, ctx }) => {
    const parsed = createPartnerSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await createPartner(ctx, camelKeys(parsed.data)) }, { status: 201 })
  },
})
