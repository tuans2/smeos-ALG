/**
 * platform-data-repository.ts
 *
 * Infra repository for Platform Admin data aggregations and folder queries.
 * Cross-tenant queries are restricted to Platform use-cases only.
 */

import { prisma } from "@/core/tenancy/infra/prisma"

export class PlatformDataRepository {
  async getOrganizationsDataWithCounts() {
    const orgs = await prisma.organizations.findMany({
      orderBy: { created_at: "desc" },
      include: {
        _count: {
          select: {
            memberships: true,
            branches: true,
          },
        },
        business_profile: { select: { id: true } },
        brand_profile: { select: { id: true } },
        workspaces: { select: { kind: true } },
      },
    })

    const orgIds = orgs.map((o) => o.id)

    const [productGroups, orderGroups, jobGroups, sheetGroups, recentOrders] = await Promise.all([
      prisma.products.groupBy({
        by: ["organization_id"],
        where: { organization_id: { in: orgIds } },
        _count: { _all: true },
      }),
      prisma.orders.groupBy({
        by: ["organization_id"],
        where: { organization_id: { in: orgIds } },
        _count: { _all: true },
      }),
      prisma.generation_jobs.groupBy({
        by: ["organization_id"],
        where: { organization_id: { in: orgIds } },
        _count: { _all: true },
      }),
      prisma.assets.groupBy({
        by: ["organization_id"],
        where: {
          organization_id: { in: orgIds },
          mime_type: {
            in: [
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              "application/vnd.ms-excel",
              "text/csv",
            ],
          },
        },
        _count: { _all: true },
      }),
      prisma.orders.findMany({
        where: { organization_id: { in: orgIds } },
        orderBy: { created_at: "desc" },
        select: { organization_id: true, created_at: true },
        distinct: ["organization_id"],
      }),
    ])

    const productCountMap = new Map(productGroups.map((r) => [r.organization_id, r._count._all]))
    const orderCountMap = new Map(orderGroups.map((r) => [r.organization_id, r._count._all]))
    const jobCountMap = new Map(jobGroups.map((r) => [r.organization_id, r._count._all]))
    const sheetCountMap = new Map(sheetGroups.map((r) => [r.organization_id, r._count._all]))
    const lastActivityMap = new Map(recentOrders.map((r) => [r.organization_id, r.created_at]))

    return {
      orgs,
      productCountMap,
      orderCountMap,
      jobCountMap,
      sheetCountMap,
      lastActivityMap,
    }
  }

  async getOrgFolderDetails(orgId: string) {
    const org = await prisma.organizations.findUnique({
      where: { id: orgId },
      include: {
        business_profile: true,
        brand_profile: true,
        _count: {
          select: {
            memberships: true,
            branches: true,
          },
        },
        branches: {
          select: { id: true, name: true, address: true, code: true },
          take: 5,
          orderBy: { created_at: "asc" },
        },
      },
    })
    if (!org) return null

    const [productCount, orderCount] = await Promise.all([
      prisma.products.count({ where: { organization_id: orgId } }),
      prisma.orders.count({ where: { organization_id: orgId } }),
    ])

    return { org, productCount, orderCount }
  }
}

let _platformDataRepositorySingleton: PlatformDataRepository | null = null
export function getPlatformDataRepository(): PlatformDataRepository {
  if (!_platformDataRepositorySingleton) {
    _platformDataRepositorySingleton = new PlatformDataRepository()
  }
  return _platformDataRepositorySingleton
}
