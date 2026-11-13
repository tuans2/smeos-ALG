/**
 * Order Exception Repository Port (Domain Interface).
 * Belongs to Coordinator / Operations module (Chain OS).
 * Pure TypeScript — No Prisma or external infrastructure imports.
 */

import type { TenantContext } from "@/core/tenancy"

export interface OrderExceptionEntity {
  id: string
  organization_id: string
  order_id: string
  code: string
  type: string
  severity: string
  description: string
  status: string
  resolution: string | null
  reported_by: string
  resolved_by: string | null
  resolved_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface CreateOrderExceptionInput {
  orderId: string
  code: string
  type: string
  severity: string
  description: string
}

export interface IOrderExceptionRepository {
  createException(ctx: TenantContext, data: CreateOrderExceptionInput): Promise<OrderExceptionEntity>
  findException(ctx: TenantContext, id: string): Promise<OrderExceptionEntity | null>
  resolveException(ctx: TenantContext, id: string, resolution: string): Promise<void>
  countOpenExceptions(ctx: TenantContext, orderId: string): Promise<number>
  countExceptions(ctx: TenantContext, orderId: string): Promise<number>
}
