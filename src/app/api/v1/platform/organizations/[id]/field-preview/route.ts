/**
 * GET /api/v1/platform/organizations/:id/field-preview (`N12`, ĐP-3
 * 3.15) — "tổ chức này sẽ thấy cấu hình trường nào" sau khi cộng ghi đè.
 * Tuỳ chọn `?entity=ORDER|PARTNER`, mặc định trả cả hai.
 */
import { handle, jsonResponse } from "@/core/http/response"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { recordPlatformAccess } from "@/modules/audit/use-cases/record-platform-access"
import { previewEffectiveConfig } from "@/modules/field-platform/use-cases/preview-effective-config"
import type { FieldEntity } from "@/modules/field-platform/domain/core-field-registry"

export const GET = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const pctx = await requirePlatformContext(request)
  await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
  const { id } = await context.params
  const url = new URL(request.url)
  const entity = (url.searchParams.get("entity") ?? undefined) as FieldEntity | undefined
  return jsonResponse({ data: await previewEffectiveConfig(pctx, id, entity) })
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
