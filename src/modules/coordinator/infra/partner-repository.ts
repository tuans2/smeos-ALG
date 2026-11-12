/**
 * Infrastructure Repository for Partner Network (Chain OS).
 * Implements IPartnerRepository port interface.
 * Enforces Tenant Isolation via scopedWhere / scopedData.
 */

import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma, partners } from "@/generated/prisma/client"
import type {
  CreatePartnerInput,
  IPartnerRepository,
  PartnerEntity,
} from "../domain/repositories/partner-repository.interface"
import type { DbClient } from "./transaction"
import type { CoordinatorStage } from "../domain/coordinator-types"

function mapPartner(p: partners): PartnerEntity {
  return {
    id: p.id,
    organization_id: p.organization_id,
    code: p.code,
    name: p.name,
    phone: p.phone,
    address: p.address,
    district: p.district,
    province: p.province,
    tier: p.tier,
    capacity_daily: p.capacity_daily,
    is_active: p.is_active,
    rating: Number(p.rating),
    custom_fields: (p.custom_fields as Record<string, unknown> | null) ?? null,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }
}

export class PartnerRepository implements IPartnerRepository {
  constructor(private readonly db: DbClient = prisma) {}

  async listPartners(ctx: TenantContext, options: { activeOnly: boolean }): Promise<PartnerEntity[]> {
    const rows = await this.db.partners.findMany({
      where: scopedWhere(ctx, options.activeOnly ? { is_active: true } : {}),
      orderBy: [{ is_active: "desc" }, { rating: "desc" }, { name: "asc" }],
      take: 200,
    })
    return rows.map(mapPartner)
  }

  async findPartner(ctx: TenantContext, id: string): Promise<PartnerEntity | null> {
    const row = await this.db.partners.findFirst({ where: scopedWhere(ctx, { id }) })
    return row ? mapPartner(row) : null
  }

  async createPartner(ctx: TenantContext, data: CreatePartnerInput): Promise<PartnerEntity> {
    const row = await this.db.partners.create({
      data: scopedData(ctx, {
        code: data.code,
        name: data.name,
        phone: data.phone,
        address: data.address,
        district: data.district,
        province: data.province,
        tier: data.tier,
        capacity_daily: data.capacityDaily,
        ...(data.customFields ? { custom_fields: data.customFields as Prisma.InputJsonValue } : {}),
      }),
    })
    return mapPartner(row)
  }

  async updatePartner(ctx: TenantContext, id: string, data: Parameters<IPartnerRepository["updatePartner"]>[2]): Promise<void> {
    const { custom_fields, ...rest } = data
    await this.db.partners.updateMany({
      where: scopedWhere(ctx, { id }),
      data: { ...rest, ...(custom_fields ? { custom_fields: custom_fields as Prisma.InputJsonValue } : {}) },
    })
  }

  /** Đơn đang chạy của một đối tác hôm nay — để so với `capacity_daily`. */
  countActiveOrdersForPartner(ctx: TenantContext, partnerId: string): Promise<number> {
    return this.db.order_coordinations.count({
      where: scopedWhere(ctx, {
        partner_id: partnerId,
        stage: { in: ["ASSIGNING", "IN_PRODUCTION", "QUALITY_CHECK"] as CoordinatorStage[] },
      }),
    })
  }
}

let defaultPartnerRepository: IPartnerRepository | null = null

export function getPartnerRepository(db?: DbClient): IPartnerRepository {
  if (db) return new PartnerRepository(db)
  if (!defaultPartnerRepository) {
    defaultPartnerRepository = new PartnerRepository()
  }
  return defaultPartnerRepository
}
