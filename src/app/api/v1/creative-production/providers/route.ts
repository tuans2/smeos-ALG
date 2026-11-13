import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import {
  getProviderPreferences,
  setProviderOrder,
} from "@/modules/creative-production/use-cases/provider-preferences"
import { defineRoute } from "@/core/http/define-route"

/**
 * `GET /api/v1/creative-production/providers` (`I1`) — danh mục nhà cung cấp
 * theo loại (nội dung, ảnh, video, giọng, nhạc), thứ tự ưu tiên của tiệm và
 * bên nào đã có khoá. Gác quyền ở use-case.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: getProviderPreferences" },
  handler: async ({ ctx }) => {
    return jsonResponse(await getProviderPreferences(ctx))
  },
})

/** `PUT` (`U2`) — thân `{ kind, order: string[] }`: đặt thứ tự ưu tiên của tiệm cho một loại. */
export const PUT = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: setProviderOrder" },
  handler: async ({ request, ctx }) => {
    const body = (await request.json().catch(() => null)) as { kind?: unknown; order?: unknown } | null
    if (!body) throw validationFailed({ body: "Cần { kind, order }" })
    return jsonResponse(await setProviderOrder(ctx, body.kind, body.order))
  },
})
