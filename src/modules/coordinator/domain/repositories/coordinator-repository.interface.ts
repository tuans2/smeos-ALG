/**
 * Coordinator Repository Port (Domain Interface).
 * Pure TypeScript — No Prisma or external infrastructure imports.
 * Belongs to Domain Layer of M12 — Coordinator (Chain OS).
 */

import type { TenantContext } from "@/core/tenancy"
import type { CoordinatorStage, CoordinationRiskLevel } from "../coordinator-types"
import type { StageTransitionFacts } from "../stage-transitions"
import type { MappedOrderAxes } from "../state-mapper"

export interface CoordinatorOrderView {
  id: string
  code: string
  status: string
  productionStatus: string
  deliveryStatus: string
  totalVnd: number
  paidVnd: number
  balanceVnd: number
  customerId: string | null
  cardMessage: string | null
  internalNote: string | null
  deliveryWindow: Record<string, unknown> | null
  deliveryAddress: Record<string, unknown> | null
  coordination?: {
    stage: CoordinatorStage
    nextAction: string | null
    riskLevel: CoordinationRiskLevel
    partnerId: string | null
    customFields?: Record<string, unknown> | null
  } | null
  items: Array<{
    id: string
    productId?: string | null
    description: string | null
    quantity: number
    unitPriceVnd: number
    metadata?: Record<string, unknown> | null
  }>
  qcRecords?: Array<{
    id: string
    status: string
    createdAt: Date
  }>
  exceptions?: Array<{
    id: string
    code: string
    status: string
  }>
}

export interface ICoordinatorRepository<TOrder = CoordinatorOrderView> {
  findOrder(ctx: TenantContext, idOrCode: string): Promise<TOrder | null>
  listOrders(
    ctx: TenantContext,
    options: { stage?: CoordinatorStage | undefined; limit: number }
  ): Promise<TOrder[]>
  countOrdersWithCodePrefix(ctx: TenantContext, prefix: string): Promise<number>
  countOpenExceptions(ctx: TenantContext, orderId: string): Promise<number>
  countExceptions(ctx: TenantContext, orderId: string): Promise<number>
  facts(ctx: TenantContext, row: TOrder): Promise<StageTransitionFacts>
  
  updateCoordination(
    ctx: TenantContext,
    orderId: string,
    data: Record<string, unknown>
  ): Promise<void>
  updateCustomFields(ctx: TenantContext, orderId: string, customFields: Record<string, unknown>): Promise<void>
  updateMetadata(ctx: TenantContext, orderId: string, metadata: Record<string, unknown>): Promise<void>
  
  recordEvent(
    ctx: TenantContext,
    orderId: string,
    axis: "order" | "production" | "delivery",
    from: string | null,
    to: string,
    reason: string
  ): Promise<void>
}
