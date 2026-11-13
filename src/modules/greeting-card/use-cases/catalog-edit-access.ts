import type { TenantContext } from "@/core/tenancy"
import { AppError, notFound } from "@/core/http/errors"
import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import { canEditAnyCatalog, canEditCatalog } from "../domain/catalog-edit-policy"

/** Chặn sửa nội dung bộ sưu tập người khác tạo (thêm/xoá mẫu, đổi tên, giao diện) — xem `catalog-edit-policy`. */
export async function assertCanEditCatalog(
  ctx: TenantContext,
  catalogId: string,
  repo: Pick<GreetingCardRepository, "getCatalogById"> = getGreetingCardRepository(),
): Promise<void> {
  const catalog = await repo.getCatalogById(ctx, catalogId)
  if (!catalog) throw notFound()
  if (!canEditCatalog({ createdBy: catalog.created_by }, { userId: ctx.userId, has: (c) => ctx.capabilities.has(c) })) {
    throw new AppError("CAPABILITY_DENIED", "Bạn chỉ sửa được bộ sưu tập do chính mình tạo")
  }
}

/** Cài đặt hiển thị dùng chung cả tiệm — chỉ người sửa được mọi bộ sưu tập. */
export function assertCanEditSharedDisplay(ctx: TenantContext): void {
  if (!canEditAnyCatalog((c) => ctx.capabilities.has(c))) {
    throw new AppError("CAPABILITY_DENIED", "Chỉ Điều hành đổi được cài đặt hiển thị chung")
  }
}
