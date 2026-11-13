import type { TenantContext } from "@/core/tenancy/tenant-context"
import type {
  CustomerInteraction,
  CustomerInteractionChannel,
  CustomerInteractionDirection,
} from "../customer-segment"

export interface CreateCustomerInteractionDTO {
  customerId: string
  channel: CustomerInteractionChannel
  direction?: CustomerInteractionDirection | undefined
  assetUsageId?: string | null | undefined
  summary: string
  outcome?: string | null | undefined
  occurredAt?: Date | undefined
  createdBy: string
}

export interface CustomerInteractionFilter {
  customerId?: string | undefined
  channel?: CustomerInteractionChannel | undefined
  direction?: CustomerInteractionDirection | undefined
  assetUsageId?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export interface ICustomerInteractionRepository {
  create(ctx: TenantContext, data: CreateCustomerInteractionDTO): Promise<CustomerInteraction>
  findById(ctx: TenantContext, id: string): Promise<CustomerInteraction | null>
  list(ctx: TenantContext, filter?: CustomerInteractionFilter): Promise<{ items: CustomerInteraction[]; total: number }>
}

