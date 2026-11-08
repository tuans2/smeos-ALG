import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { assertCanEditSharedDisplay } from "@/modules/greeting-card/use-cases/catalog-edit-access"
import { getDisplaySettings, updateDisplaySettings } from "@/modules/greeting-card/use-cases/display-settings"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { displaySettingsBody } from "@/app/api/v1/_contracts/requests-greeting"

/** GET — trường thông tin hiển thị theo từng mẫu Thẻ chào (L1, như xem bộ sưu tập). */
export const GET = handle(async (request: Request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.read)
  return jsonResponse({ data: await getDisplaySettings(ctx) })
})

/** PUT — đổi trường hiển thị hoặc công tắc giá/giảm giá (R2 + L4: cài đặt dùng chung cả tiệm, Sale và Điều phối không đổi — PO 16/10/2026). Trả nợ #170. */
export const PUT = handle(async (request: Request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.manage)
  assertCanEditSharedDisplay(ctx)
  const parsed = displaySettingsBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return jsonResponse({ data: await updateDisplaySettings(ctx, parsed.data) })
})
