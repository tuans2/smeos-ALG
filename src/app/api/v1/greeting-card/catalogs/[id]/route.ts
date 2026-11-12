import { validationFailed, notFound } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { assertCanEditCatalog } from "@/modules/greeting-card/use-cases/catalog-edit-access"
import { GreetingCardRepository } from "@/modules/greeting-card/infra/greeting-card-repository"
import { GREETING_CARD_CAPABILITY } from "@/modules/greeting-card/domain/greeting-card-capabilities"
import { catalogPolicyKeysChanged } from "@/modules/greeting-card/domain/catalog-policy-keys"
import { deleteGreetingCatalog, restoreGreetingCatalog } from "@/modules/greeting-card/use-cases/delete-greeting-catalog"
import { updateCatalogBody } from "@/app/api/v1/_contracts/requests-greeting"
import { defineRoute } from "@/core/http/define-route"

type Context = { params: Promise<{ id: string }> }

export const GET = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.read },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const repo = new GreetingCardRepository()
    const catalog = await repo.getCatalogById(ctx, id)
    if (!catalog) throw notFound()
    return jsonResponse({ data: catalog })
  },
})

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.manage },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await request.json().catch(() => ({}))
    const parsed = updateCatalogBody.safeParse(body)
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    // Ẩn/hiện luôn đi qua use-case (kiểm người tạo/L4 + audit); trường còn lại cập nhật thường
    const { isActive, ...fields } = parsed.data
    const repo = new GreetingCardRepository()
    const editsContent = Object.values(fields).some((v) => v !== undefined)
    // Tên, mô tả, giao diện: chỉ người tạo hoặc L4 (PO 16/10/2026) — ẩn/hiện có luật riêng ở use-case
    if (editsContent) await assertCanEditCatalog(ctx, id, repo)
    // Ghi đè chính sách tiệm theo bộ sưu tập (ảnh bill, duyệt thanh toán, thời hạn) → cần quyền sửa cấu hình tiệm
    if (fields.filters !== undefined && catalogPolicyKeysChanged(await repo.getCatalogFilters(ctx, id), fields.filters)) {
      requireCapability(ctx, "F2")
    }
    if (isActive === true) await restoreGreetingCatalog(ctx, id)
    else if (isActive === false) await deleteGreetingCatalog(ctx, id)
    if (editsContent) await repo.updateCatalog(ctx, id, fields)
    const updated = await repo.getCatalogById(ctx, id)
    if (!updated) throw notFound()
    return jsonResponse({ data: updated })
  },
})

export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: GREETING_CARD_CAPABILITY.manage },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const result = await deleteGreetingCatalog(ctx, id)
    return jsonResponse(result)
  },
})
