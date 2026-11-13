/**
 * platform-records-repository.ts
 *
 * Repository for Platform Admin domain record queries and export data.
 * Pure Infra layer encapsulating Prisma access.
 */

import { prisma } from "@/core/tenancy/infra/prisma"

export class PlatformRecordsRepository {
  async fetchCatalogRecords(orgId: string, skip: number, take: number) {
    const [total, products] = await Promise.all([
      prisma.products.count({ where: { organization_id: orgId } }),
      prisma.products.findMany({
        where: { organization_id: orgId },
        orderBy: { created_at: "desc" },
        skip,
        take,
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
          shape: true,
          status: true,
          attributes: true,
          created_at: true,
          images: {
            where: { role: "MAIN" },
            take: 1,
            select: { asset_id: true },
          },
        },
      }),
    ])

    const assetIds = products
      .map((p) => p.images[0]?.asset_id)
      .filter((id): id is string => Boolean(id))

    const assets = await prisma.assets.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, storage_key: true, thumb_key: true },
    })

    return { total, products, assets }
  }

  async fetchOrderRecords(orgId: string, skip: number, take: number) {
    const [total, orders] = await Promise.all([
      prisma.orders.count({ where: { organization_id: orgId } }),
      prisma.orders.findMany({
        where: { organization_id: orgId },
        orderBy: { created_at: "desc" },
        skip,
        take,
        select: {
          id: true,
          code: true,
          status: true,
          production_status: true,
          delivery_status: true,
          total_vnd: true,
          paid_vnd: true,
          balance_vnd: true,
          card_message: true,
          source: true,
          created_at: true,
          customer: { select: { name: true, phone: true } },
        },
      }),
    ])
    return { total, orders }
  }

  async fetchMemberRecords(orgId: string, skip: number, take: number) {
    const [total, members] = await Promise.all([
      prisma.memberships.count({ where: { organization_id: orgId } }),
      prisma.memberships.findMany({
        where: { organization_id: orgId },
        orderBy: { invited_at: "desc" },
        skip,
        take,
        select: {
          id: true,
          status: true,
          role_id: true,
          invited_at: true,
          joined_at: true,
          user: { select: { name: true, email: true } },
        },
      }),
    ])
    return { total, members }
  }

  async fetchBranchRecords(orgId: string, skip: number, take: number) {
    const [total, branches] = await Promise.all([
      prisma.branches.count({ where: { organization_id: orgId } }),
      prisma.branches.findMany({
        where: { organization_id: orgId },
        orderBy: { created_at: "asc" },
        skip,
        take,
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          is_active: true,
          created_at: true,
          _count: { select: { inventory: true } },
        },
      }),
    ])
    return { total, branches }
  }

  async fetchCustomerRecords(orgId: string, skip: number, take: number) {
    const [total, customers] = await Promise.all([
      prisma.customers.count({ where: { organization_id: orgId } }),
      prisma.customers.findMany({
        where: { organization_id: orgId },
        orderBy: { created_at: "desc" },
        skip,
        take,
        select: {
          id: true,
          code: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          tier: true,
          notes: true,
          total_spent: true,
          order_count: true,
          created_at: true,
        },
      }),
    ])
    return { total, customers }
  }

  async fetchJobRecords(orgId: string, skip: number, take: number) {
    const [total, jobs] = await Promise.all([
      prisma.generation_jobs.count({ where: { organization_id: orgId } }),
      prisma.generation_jobs.findMany({
        where: { organization_id: orgId },
        orderBy: { created_at: "desc" },
        skip,
        take,
        select: {
          id: true,
          feature: true,
          status: true,
          stage: true,
          result: true,
          attempts: true,
          user_id: true,
          created_at: true,
          started_at: true,
          completed_at: true,
        },
      }),
    ])
    return { total, jobs }
  }

  async fetchSpreadsheetRecords(orgId: string, skip: number, take: number) {
    const mimeFilter = {
      in: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ],
    }
    const [total, files] = await Promise.all([
      prisma.assets.count({
        where: { organization_id: orgId, mime_type: mimeFilter },
      }),
      prisma.assets.findMany({
        where: { organization_id: orgId, mime_type: mimeFilter },
        orderBy: { version: "desc" },
        skip,
        take,
        select: {
          id: true,
          storage_key: true,
          mime_type: true,
          file_size: true,
          created_at: true,
          parameters: true,
        },
      }),
    ])
    return { total, files }
  }

  async fetchExportZipData(orgId: string) {
    const [org, products, uploadedSpreadsheets] = await Promise.all([
      prisma.organizations.findUnique({
        where: { id: orgId },
        select: { name: true },
      }),
      prisma.products.findMany({
        where: { organization_id: orgId },
        select: {
          id: true,
          code: true,
          attributes: true,
          images: {
            where: { role: "MAIN" },
            take: 1,
            select: { asset_id: true },
          },
        },
      }),
      prisma.assets.findMany({
        where: {
          organization_id: orgId,
          mime_type: {
            in: [
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              "application/vnd.ms-excel",
              "text/csv",
            ],
          },
        },
        select: {
          id: true,
          storage_key: true,
          parameters: true,
        },
      }),
    ])

    const assetIds = products
      .map((p) => p.images[0]?.asset_id)
      .filter((id): id is string => Boolean(id))

    const assets = await prisma.assets.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, storage_key: true, mime_type: true },
    })

    return {
      org,
      products,
      assets,
      uploadedSpreadsheets,
    }
  }
}

let _platformRecordsRepositorySingleton: PlatformRecordsRepository | null = null
export function getPlatformRecordsRepository(): PlatformRecordsRepository {
  if (!_platformRecordsRepositorySingleton) {
    _platformRecordsRepositorySingleton = new PlatformRecordsRepository()
  }
  return _platformRecordsRepositorySingleton
}
