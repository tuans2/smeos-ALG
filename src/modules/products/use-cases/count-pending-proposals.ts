import type { TenantContext } from "@/core/tenancy"
import { ProductGovernanceRepository } from "@/modules/products/infra/product-governance-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"

/** Trần đếm — Hộp việc chỉ cần biết "có việc", hiển thị "100+" khi vượt. */
const COUNT_CAP = 100

/** Số việc duyệt đang chờ của tổ chức: mẫu đề xuất mới + đề xuất sửa (tối đa `COUNT_CAP`). */
export async function countPendingProposals(ctx: TenantContext): Promise<number> {
  const [products, changes] = await Promise.all([
    new ProductRepository().list(ctx, { proposalStatus: "pending" }, { limit: COUNT_CAP }),
    new ProductGovernanceRepository().listChangeRequests(ctx, { status: "PENDING" }, COUNT_CAP),
  ])
  return Math.min(COUNT_CAP, products.length + changes.length)
}
