import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { CustomerSegment, CustomerSegmentKind, CustomerSegmentRules } from "../customer-segment"

export interface CreateCustomerSegmentDTO {
  name: string
  description?: string | null | undefined
  kind?: CustomerSegmentKind | undefined
  rules?: CustomerSegmentRules | null | undefined
  createdBy: string
}

export interface UpdateCustomerSegmentDTO {
  name?: string | undefined
  description?: string | null | undefined
  kind?: CustomerSegmentKind | undefined
  rules?: CustomerSegmentRules | null | undefined
}

export interface CustomerSegmentFilter {
  kind?: CustomerSegmentKind | undefined
  search?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export interface ICustomerSegmentRepository {
  create(ctx: TenantContext, data: CreateCustomerSegmentDTO): Promise<CustomerSegment>
  findById(ctx: TenantContext, id: string): Promise<CustomerSegment | null>
  list(ctx: TenantContext, filter?: CustomerSegmentFilter): Promise<{ items: CustomerSegment[]; total: number }>
  update(ctx: TenantContext, id: string, data: UpdateCustomerSegmentDTO): Promise<CustomerSegment | null>
  delete(ctx: TenantContext, id: string): Promise<boolean>
}

