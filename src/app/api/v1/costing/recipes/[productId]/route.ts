import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { saveRecipeBody } from "@/app/api/v1/_contracts/requests-costing"
import { getRecipe, saveRecipe } from "@/modules/costing/use-cases/costing-service"
import { defineRoute } from "@/core/http/define-route"

/** `GET /costing/recipes/:productId` (`L1`) — công thức đã lưu, hoặc bản nháp đọc từ BOM AI (#31). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "L1" },
  handler: async ({ ctx, params }) => {
    const { productId } = params as { productId: string }
    return jsonResponse({ data: await getRecipe(ctx, productId) })
  },
})

/** `PUT /costing/recipes/:productId` (`L3`) — lưu công thức (thay toàn bộ dòng, tăng phiên bản). */
export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "L3" },
  handler: async ({ request, ctx, params }) => {
    const { productId } = params as { productId: string }
    const parsed = saveRecipeBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const d = parsed.data
    const saved = await saveRecipe(ctx, productId, {
      lines: d.lines.map((l) => ({ materialId: l.material_id, quantity: l.quantity })),
      wastePercent: d.waste_percent ?? null,
      laborMinutes: d.labor_minutes ?? null,
      note: d.note ?? null,
    })
    return jsonResponse({ data: saved })
  },
})
