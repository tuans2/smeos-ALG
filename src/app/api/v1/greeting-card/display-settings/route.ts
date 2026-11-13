import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { assertCanEditSharedDisplay } from "@/modules/greeting-card/use-cases/catalog-edit-access"
import { getDisplaySettings, updateDisplaySettings } from "@/modules/greeting-card/use-cases/display-settings"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { displaySettingsBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"
import { camelKeys } from "@/lib/case-keys"

/** GET — trường thông tin hiển thị theo từng mẫu Thẻ chào (L1, như xem bộ sưu tập). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.read },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await getDisplaySettings(ctx) })
  },
})

/** PUT — đổi trường hiển thị hoặc công tắc giá/giảm giá (R2 + L4: cài đặt dùng chung cả tiệm, Sale và Điều phối không đổi — PO 16/10/2026). Trả nợ #170. */
export const PUT = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.manage },
  handler: async ({ request, ctx }) => {
    assertCanEditSharedDisplay(ctx)
    const parsed = displaySettingsBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const input = camelKeys(parsed.data)
    return jsonResponse({ data: await updateDisplaySettings(ctx, input) })
  },
})
