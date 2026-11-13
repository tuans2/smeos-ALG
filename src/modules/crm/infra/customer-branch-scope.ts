/**
 * Phạm vi chi nhánh của khách hàng (ADR-012 T-5, D-58/D-59). Nhân viên bị giới hạn theo chi nhánh cho quyền xem khách
 * (`Q1`) chỉ thấy khách của chi nhánh mình và khách dùng chung (`branch_id` null) — khi tổ chức đã bật đợt 1.
 * Ngoài phạm vi → không thấy (route trả 404 như khác tổ chức).
 */
import type { Prisma } from "@/generated/prisma/client"
import { branchScopeFor, type TenantContext } from "@/core/tenancy"
import { isBranchScopeWaveEnabled } from "@/core/tenancy/branch-scope-rollout"
import { prisma } from "@/core/tenancy/infra/prisma"

const CUSTOMER_READ = "Q1"

/** Điều kiện thêm vào `where` của `customers`; `{}` khi không giới hạn. */
export async function customerBranchWhere(ctx: TenantContext): Promise<Prisma.customersWhereInput> {
  const scope = branchScopeFor(ctx, CUSTOMER_READ)
  if (!scope) return {}
  const org = await prisma.organizations.findUnique({ where: { id: ctx.organizationId }, select: { settings: true } })
  if (!isBranchScopeWaveEnabled(org?.settings, "wave1")) return {}
  return { OR: [{ branch_id: null }, { branch_id: scope }] }
}

/** Chi nhánh gán cho khách tạo mới: chi nhánh của người tạo khi người đó bị giới hạn theo chi nhánh (D-58). */
export function branchForNewCustomer(ctx: TenantContext): string | null {
  return branchScopeFor(ctx, CUSTOMER_READ)
}
