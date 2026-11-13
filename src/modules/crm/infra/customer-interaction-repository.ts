import { prisma } from "@/core/tenancy/infra/prisma"
import type {
  customer_interaction_channel,
  customer_interaction_direction,
  Prisma,
} from "@/generated/prisma/client"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type {
  CustomerInteraction,
  CustomerInteractionChannel,
  CustomerInteractionDirection,
} from "../domain/customer-segment"
import type {
  ICustomerInteractionRepository,
  CreateCustomerInteractionDTO,
  CustomerInteractionFilter,
} from "../domain/repositories/customer-interaction-repository.interface"

function toDomain(row: {
  id: string
  organization_id: string
  customer_id: string
  channel: string
  direction: string
  asset_usage_id: string | null
  summary: string
  outcome: string | null
  occurred_at: Date
  created_by: string
  created_at: Date
  updated_at: Date
}): CustomerInteraction {
  return {
    id: row.id,
    organizationId: row.organization_id,
    customerId: row.customer_id,
    channel: row.channel as CustomerInteractionChannel,
    direction: row.direction as CustomerInteractionDirection,
    assetUsageId: row.asset_usage_id,
    summary: row.summary,
    outcome: row.outcome,
    occurredAt: row.occurred_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class CustomerInteractionRepository implements ICustomerInteractionRepository {
  async create(ctx: TenantContext, data: CreateCustomerInteractionDTO): Promise<CustomerInteraction> {
    const row = await prisma.customer_interactions.create({
      data: {
        organization_id: ctx.organizationId,
        customer_id: data.customerId,
        channel: data.channel as customer_interaction_channel,
        direction: (data.direction ?? "OUTBOUND") as customer_interaction_direction,
        asset_usage_id: data.assetUsageId ?? null,
        summary: data.summary,
        outcome: data.outcome ?? null,
        occurred_at: data.occurredAt ?? new Date(),
        created_by: data.createdBy,
      },
    })
    return toDomain(row)
  }

  async findById(ctx: TenantContext, id: string): Promise<CustomerInteraction | null> {
    const row = await prisma.customer_interactions.findFirst({
      where: {
        id,
        organization_id: ctx.organizationId,
      },
    })
    return row ? toDomain(row) : null
  }

  async list(
    ctx: TenantContext,
    filter?: CustomerInteractionFilter
  ): Promise<{ items: CustomerInteraction[]; total: number }> {
    const where: Prisma.customer_interactionsWhereInput = {
      organization_id: ctx.organizationId,
      ...(filter?.customerId ? { customer_id: filter.customerId } : {}),
      ...(filter?.channel ? { channel: filter.channel as customer_interaction_channel } : {}),
      ...(filter?.direction ? { direction: filter.direction as customer_interaction_direction } : {}),
      ...(filter?.assetUsageId ? { asset_usage_id: filter.assetUsageId } : {}),
    }

    const [rows, total] = await Promise.all([
      prisma.customer_interactions.findMany({
        where,
        orderBy: { occurred_at: "desc" },
        take: filter?.limit ?? 50,
        skip: filter?.offset ?? 0,
      }),
      prisma.customer_interactions.count({ where }),
    ])

    return {
      items: rows.map(toDomain),
      total,
    }
  }
}

let interactionRepoSingleton: ICustomerInteractionRepository | null = null

export function getCustomerInteractionRepository(): ICustomerInteractionRepository {
  if (!interactionRepoSingleton) {
    interactionRepoSingleton = new CustomerInteractionRepository()
  }
  return interactionRepoSingleton
}

