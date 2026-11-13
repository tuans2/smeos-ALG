import { prisma } from "@/core/tenancy/infra/prisma"
import { type customer_segment_kind, Prisma } from "@/generated/prisma/client"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type {
  CustomerSegment,
  CustomerSegmentKind,
  CustomerSegmentRules,
} from "../domain/customer-segment"
import { customerSegmentRulesSchema } from "../domain/customer-segment"
import type {
  ICustomerSegmentRepository,
  CreateCustomerSegmentDTO,
  UpdateCustomerSegmentDTO,
  CustomerSegmentFilter,
} from "../domain/repositories/customer-segment-repository.interface"

function toDomain(row: {
  id: string
  organization_id: string
  name: string
  description: string | null
  kind: string
  rules: unknown
  created_by: string
  created_at: Date
  updated_at: Date
}): CustomerSegment {
  let parsedRules: CustomerSegmentRules | null = null
  if (row.rules && typeof row.rules === "object") {
    const parseRes = customerSegmentRulesSchema.safeParse(row.rules)
    if (parseRes.success) {
      parsedRules = parseRes.data
    }
  }

  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    kind: row.kind as CustomerSegmentKind,
    rules: parsedRules,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class CustomerSegmentRepository implements ICustomerSegmentRepository {
  async create(ctx: TenantContext, data: CreateCustomerSegmentDTO): Promise<CustomerSegment> {
    const row = await prisma.customer_segments.create({
      data: {
        organization_id: ctx.organizationId,
        name: data.name,
        description: data.description ?? null,
        kind: (data.kind ?? "DYNAMIC") as customer_segment_kind,
        rules: data.rules ? (data.rules as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        created_by: data.createdBy,
      },
    })
    return toDomain(row)
  }

  async findById(ctx: TenantContext, id: string): Promise<CustomerSegment | null> {
    const row = await prisma.customer_segments.findFirst({
      where: {
        id,
        organization_id: ctx.organizationId,
      },
    })
    return row ? toDomain(row) : null
  }

  async list(
    ctx: TenantContext,
    filter?: CustomerSegmentFilter
  ): Promise<{ items: CustomerSegment[]; total: number }> {
    const where: Prisma.customer_segmentsWhereInput = {
      organization_id: ctx.organizationId,
      ...(filter?.kind ? { kind: filter.kind as customer_segment_kind } : {}),
      ...(filter?.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: "insensitive" } },
              { description: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    }

    const [rows, total] = await Promise.all([
      prisma.customer_segments.findMany({
        where,
        orderBy: { created_at: "desc" },
        take: filter?.limit ?? 50,
        skip: filter?.offset ?? 0,
      }),
      prisma.customer_segments.count({ where }),
    ])

    return {
      items: rows.map(toDomain),
      total,
    }
  }

  async update(
    ctx: TenantContext,
    id: string,
    data: UpdateCustomerSegmentDTO
  ): Promise<CustomerSegment | null> {
    const existing = await prisma.customer_segments.findFirst({
      where: { id, organization_id: ctx.organizationId },
    })
    if (!existing) return null

    const updateData: Prisma.customer_segmentsUpdateInput = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.kind !== undefined ? { kind: data.kind as customer_segment_kind } : {}),
      ...(data.rules !== undefined
        ? { rules: data.rules ? (data.rules as unknown as Prisma.InputJsonValue) : Prisma.DbNull }
        : {}),
    }

    const updated = await prisma.customer_segments.update({
      where: { id },
      data: updateData,
    })

    return toDomain(updated)
  }

  async delete(ctx: TenantContext, id: string): Promise<boolean> {
    const existing = await prisma.customer_segments.findFirst({
      where: { id, organization_id: ctx.organizationId },
    })
    if (!existing) return false

    await prisma.customer_segments.delete({
      where: { id },
    })
    return true
  }
}

let segmentRepoSingleton: ICustomerSegmentRepository | null = null

export function getCustomerSegmentRepository(): ICustomerSegmentRepository {
  if (!segmentRepoSingleton) {
    segmentRepoSingleton = new CustomerSegmentRepository()
  }
  return segmentRepoSingleton
}
