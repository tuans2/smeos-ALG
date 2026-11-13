import type { TenantContext } from "@/core/tenancy"
import { notFound, AppError } from "@/core/http/errors"
import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"

/** L4 `product.archive` — "Ngừng kinh doanh sản phẩm", mặc định & trần cứng là Điều hành. */
export const CATALOG_ARCHIVE_ANY_CAPABILITY = "L4"

/** Được ẩn/khôi phục catalog của người khác (không chỉ catalog do mình tạo). */
export function isCatalogAdmin(ctx: TenantContext): boolean {
  return ctx.capabilities.has(CATALOG_ARCHIVE_ANY_CAPABILITY)
}

type CatalogRepo = Pick<GreetingCardRepository, "getCatalogById" | "setCatalogActiveWithAudit">

async function loadOwnedOrAdmin(ctx: TenantContext, catalogId: string, repo: CatalogRepo, deniedMessage: string) {
  const catalog = await repo.getCatalogById(ctx, catalogId)
  if (!catalog) throw notFound()
  if (!isCatalogAdmin(ctx) && catalog.created_by !== ctx.userId) {
    throw new AppError("CAPABILITY_DENIED", deniedMessage)
  }
  return catalog
}

/**
 * Ẩn (soft-delete) bộ sưu tập Thẻ chào: người tạo, hoặc người có L4.
 * Thay đổi và `audit_logs` ghi trong cùng transaction.
 */
export async function deleteGreetingCatalog(ctx: TenantContext, catalogId: string, repo: CatalogRepo = getGreetingCardRepository()) {
  const catalog = await loadOwnedOrAdmin(ctx, catalogId, repo, "Bạn chỉ có quyền xóa bộ sưu tập do chính mình tạo ra")
  await repo.setCatalogActiveWithAudit(ctx, catalogId, false, {
    action: "greeting_catalog.delete",
    entityType: "greeting_catalog",
    entityId: catalog.id,
    before: {
      id: catalog.id, code: catalog.code, name: catalog.name, type: catalog.type,
      created_by: catalog.created_by, is_active: catalog.is_active,
    },
    after: { is_active: false, deleted_by: ctx.userId },
  })
  return { success: true }
}

/** Khôi phục bộ sưu tập đã ẩn: người tạo, hoặc người có L4. */
export async function restoreGreetingCatalog(ctx: TenantContext, catalogId: string, repo: CatalogRepo = getGreetingCardRepository()) {
  const catalog = await loadOwnedOrAdmin(ctx, catalogId, repo, "Bạn không có quyền khôi phục bộ sưu tập này")
  await repo.setCatalogActiveWithAudit(ctx, catalogId, true, {
    action: "greeting_catalog.restore",
    entityType: "greeting_catalog",
    entityId: catalog.id,
    before: { is_active: catalog.is_active },
    after: { is_active: true, restored_by: ctx.userId },
  })
  return { success: true }
}
