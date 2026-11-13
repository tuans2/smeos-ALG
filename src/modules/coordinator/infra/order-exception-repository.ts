/**
 * Infrastructure Repository for Order Exceptions (Chain OS).
 * Implements IOrderExceptionRepository port interface.
 * Enforces Tenant Isolation via scopedWhere / scopedData.
 */

import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { order_exceptions } from "@/generated/prisma/client"
import type {
  CreateOrderExceptionInput,
  IOrderExceptionRepository,
  OrderExceptionEntity,
} from "../domain/repositories/order-exception-repository.interface"
import type { DbClient } from "./transaction"

export type ExceptionRow = order_exceptions

function mapException(e: order_exceptions): OrderExceptionEntity {
  return {
    id: e.id,
    organization_id: e.organization_id,
    order_id: e.order_id,
    code: e.code,
    type: e.type,
    severity: e.severity,
    description: e.description,
    status: e.status,
    resolution: e.resolution,
    reported_by: e.reported_by ?? "",
    resolved_by: e.resolved_by,
    resolved_at: e.resolved_at,
    created_at: e.created_at,
    updated_at: e.updated_at,
  }
}

export class OrderExceptionRepository implements IOrderExceptionRepository {
  constructor(private readonly db: DbClient = prisma) {}

  async createException(ctx: TenantContext, data: CreateOrderExceptionInput): Promise<OrderExceptionEntity> {
    const row = await this.db.order_exceptions.create({
      data: scopedData(ctx, {
        order_id: data.orderId,
        code: data.code,
        type: data.type,
        severity: data.severity,
        description: data.description,
        status: "OPEN",
        reported_by: ctx.userId,
      }),
    })
    return mapException(row)
  }

  async findException(ctx: TenantContext, id: string): Promise<OrderExceptionEntity | null> {
    const row = await this.db.order_exceptions.findFirst({ where: scopedWhere(ctx, { id }) })
    return row ? mapException(row) : null
  }

  async resolveException(ctx: TenantContext, id: string, resolution: string): Promise<void> {
    await this.db.order_exceptions.updateMany({
      where: scopedWhere(ctx, { id }),
      data: { status: "RESOLVED", resolution, resolved_by: ctx.userId, resolved_at: new Date() },
    })
  }

  countOpenExceptions(ctx: TenantContext, orderId: string): Promise<number> {
    return this.db.order_exceptions.count({
      where: scopedWhere(ctx, { order_id: orderId, status: "OPEN" }),
    })
  }

  countExceptions(ctx: TenantContext, orderId: string): Promise<number> {
    return this.db.order_exceptions.count({
      where: scopedWhere(ctx, { order_id: orderId }),
    })
  }
}

let defaultOrderExceptionRepository: IOrderExceptionRepository | null = null

export function getOrderExceptionRepository(db?: DbClient): IOrderExceptionRepository {
  if (db) return new OrderExceptionRepository(db)
  if (!defaultOrderExceptionRepository) {
    defaultOrderExceptionRepository = new OrderExceptionRepository()
  }
  return defaultOrderExceptionRepository
}
