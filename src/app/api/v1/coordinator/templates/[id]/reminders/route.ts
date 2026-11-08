import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { PrismaDispatchReminderRepository } from "@/modules/coordinator/infra/prisma-dispatch-reminder-repository"
import {
  getTemplateReminderOverrides,
  updateTemplateReminderOverrides,
} from "@/modules/coordinator/use-cases/manage-template-reminder-settings"
import { templateRemindersBody } from "@/app/api/v1/_contracts/requests-coordinator"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * `GET /api/v1/coordinator/templates/[id]/reminders` (R1)
 * Lấy cấu hình override nhắc việc của một Thẻ chào sản phẩm.
 */
export const GET = handle(async (request, context: unknown) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "R1")

  const { id: productId } = await (context as RouteContext).params
  const repository = new PrismaDispatchReminderRepository()
  const overrides = await getTemplateReminderOverrides(
    ctx.organizationId,
    productId,
    repository
  )

  return jsonResponse({ overrides })
})

/**
 * `PUT /api/v1/coordinator/templates/[id]/reminders` (R12)
 * Cập nhật cấu hình override nhắc việc cho một Thẻ chào sản phẩm.
 */
export const PUT = handle(async (request, context: unknown) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "R12")

  const { id: productId } = await (context as RouteContext).params
  const raw = await request.json().catch(() => null)
  const parsed = templateRemindersBody.safeParse(raw)
  if (!parsed.success) {
    throw validationFailed({ issues: parsed.error.issues })
  }

  // Lọc các giá trị null/undefined thành object hợp lệ
  const sanitizedOverrides = Object.fromEntries(
    Object.entries(parsed.data).filter(([_, v]) => v !== undefined && v !== null)
  )

  const repository = new PrismaDispatchReminderRepository()
  const updated = await updateTemplateReminderOverrides(
    ctx.organizationId,
    productId,
    sanitizedOverrides,
    repository
  )

  return jsonResponse({ overrides: updated })
})
