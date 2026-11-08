import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { parseListQuery, toPage } from "@/modules/greeting-card/contracts/list-query"
import { catalogPolicyKeysChanged } from "@/modules/greeting-card/domain/catalog-policy-keys"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { createCatalogBody } from "@/app/api/v1/_contracts/requests-greeting"

export const GET = handle(async (request: Request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.read)
  const url = new URL(request.url)
  const limit = url.searchParams.has("limit") ? parseListQuery(url).limit : 100
  const cursor = url.searchParams.get("cursor")?.trim() || undefined
  const createdBy = url.searchParams.get("created_by")?.trim() || undefined
  const statusParam = url.searchParams.get("status")?.trim()
  const status = statusParam === "archived" || statusParam === "all" ? statusParam : "active"
  const daysParam = url.searchParams.get("days")
  const days = daysParam && Number(daysParam) > 0 ? Number(daysParam) : undefined

  const rows = await new GreetingCardRepository().listCatalogs(ctx, { limit, cursor, createdBy, status, days })
  return jsonResponse(toPage(rows, limit))
})

export const POST = handle(async (request: Request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, GREETING_CARD_CAPABILITY.manage)
  const body = await request.json().catch(() => ({}))
  const parsed = createCatalogBody.safeParse(body)
  if (!parsed.success) {
    throw validationFailed({ issues: parsed.error.issues })
  }
  // Bộ sưu tập mới mang sẵn khoá chính sách (ảnh bill, duyệt thanh toán, thời hạn) → cần quyền sửa cấu hình tiệm
  if (catalogPolicyKeysChanged(null, parsed.data.filters)) requireCapability(ctx, "F2")

  const repo = new GreetingCardRepository()
  const catalog = await repo.createCatalog(ctx, {
    code: parsed.data.code,
    name: parsed.data.name,
    type: parsed.data.type,
    description: parsed.data.description,
    filters: parsed.data.filters,
    productIds: parsed.data.productIds,
    createdBy: ctx.userId,
  })

  // Ghi nhật ký audit log cho Điều hành theo dõi
  const { AuditLogRepository } = await import("@/modules/audit/infra/audit-log-repository")
  await new AuditLogRepository().record(ctx, {
    action: "greeting_catalog.create",
    entityType: "greeting_catalog",
    entityId: catalog.id,
    after: {
      id: catalog.id,
      code: catalog.code,
      name: catalog.name,
      type: catalog.type,
      created_by: ctx.userId,
    },
  })

  return jsonResponse({ data: catalog }, { status: 201 })
})
