/**
 * Truy vấn infra cho xuất khẩu dữ liệu khách hàng.
 * Tách riêng để use-case export-customers không import Prisma trực tiếp.
 */

import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import { customerBranchWhere } from "./customer-branch-scope"
import { phoneSearch } from "@/core/security/pii-lookup"

const MAX_CUSTOMERS = 10_000

export interface CustomerExportFilter {
  tier?: string | undefined
  search?: string | undefined
}

export async function queryCustomersForExport(ctx: TenantContext, filter: CustomerExportFilter = {}) {
  const where = {
    organization_id: ctx.organizationId,
    status: "ACTIVE" as const, // P-2: không xuất khách tiềm năng
    AND: [await customerBranchWhere(ctx)], // phạm vi chi nhánh (ADR-012 T-5)
    ...(filter.tier ? { tier: filter.tier as never } : {}),
    ...(filter.search
      ? {
          OR: [
            { name: { contains: filter.search, mode: "insensitive" as const } },
            ...[phoneSearch(ctx.organizationId, filter.search)].filter((w) => w !== null), // P-5b: 4 số cuối / đủ số (D-49)
            { code: { contains: filter.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  return prisma.customers.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: MAX_CUSTOMERS,
    include: {
      occasions: { orderBy: { date: "asc" } },
    },
  })
}
