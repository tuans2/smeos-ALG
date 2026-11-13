/**
 * Coordinator Repository — Chức năng 12.
 *
 * Mọi truy vấn đi qua `scopedWhere`/`scopedData` (organization_id chỉ đến từ
 * `TenantContext`). KHÔNG còn nhánh "bảng chưa tồn tại thì trả rỗng": bản
 * trước nuốt lỗi P2021 nên thiếu migration vẫn trông như chạy được. Nay thiếu
 * bảng là lỗi 500 thật, lộ ngay lần gọi đầu.
 */

import { branchScopedWhere, scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma } from "@/generated/prisma/client"
import type { CoordinatorStage, CoordinationRiskLevel } from "../domain/coordinator-types"
import type { ICoordinatorRepository } from "../domain/repositories/coordinator-repository.interface"
import { changedAxes, type StageTransitionFacts } from "../domain/stage-transitions"
import type { MappedOrderAxes } from "../domain/state-mapper"
import type { IPartnerRepository } from "../domain/repositories/partner-repository.interface"
import { getPartnerRepository } from "./partner-repository"
import type { IOrderExceptionRepository } from "../domain/repositories/order-exception-repository.interface"
import { getOrderExceptionRepository } from "./order-exception-repository"
import type { DbClient } from "./transaction"

import {
  ORDER_INCLUDE,
  executeCreateOrder,
  type CoordinatorOrderRow,
  type PartnerRow,
  type ExceptionRow,
  type CreateCoordinatorOrderData,
} from "./coordinator-query-helper"

export {
  ORDER_INCLUDE,
  type CoordinatorOrderRow,
  type PartnerRow,
  type ExceptionRow,
  type CreateCoordinatorOrderData,
}

export class CoordinatorRepository implements ICoordinatorRepository<CoordinatorOrderRow> {
  private readonly partnerRepo: IPartnerRepository
  private readonly exceptionRepo: IOrderExceptionRepository

  constructor(private readonly db: DbClient = prisma) {
    this.partnerRepo = getPartnerRepository(db)
    this.exceptionRepo = getOrderExceptionRepository(db)
  }

  // ── Đọc ────────────────────────────────────────────────────────────────

  findOrder(ctx: TenantContext, idOrCode: string): Promise<CoordinatorOrderRow | null> {
    return this.db.orders.findFirst({
      where: scopedWhere(ctx, {
        OR: [{ id: idOrCode }, { code: idOrCode }],
        coordination: { isNot: null },
        ...branchScopedWhere(ctx),
      }),
      include: ORDER_INCLUDE,
    })
  }

  listOrders(
    ctx: TenantContext,
    options: { stage?: CoordinatorStage | undefined; limit: number }
  ): Promise<CoordinatorOrderRow[]> {
    return this.db.orders.findMany({
      where: scopedWhere(ctx, {
        coordination: options.stage ? { is: { stage: options.stage } } : { isNot: null },
        ...branchScopedWhere(ctx),
      }),
      include: ORDER_INCLUDE,
      orderBy: { created_at: "desc" },
      take: options.limit,
    })
  }

  countOrdersWithCodePrefix(ctx: TenantContext, prefix: string): Promise<number> {
    return this.db.orders.count({ where: scopedWhere(ctx, { code: { startsWith: prefix } }) })
  }

  countOpenExceptions(ctx: TenantContext, orderId: string): Promise<number> {
    return this.db.order_exceptions.count({
      where: scopedWhere(ctx, { order_id: orderId, status: { in: ["OPEN", "IN_PROGRESS"] } }),
    })
  }

  countExceptions(ctx: TenantContext, orderId: string): Promise<number> {
    return this.db.order_exceptions.count({ where: scopedWhere(ctx, { order_id: orderId }) })
  }

  async facts(ctx: TenantContext, row: CoordinatorOrderRow): Promise<StageTransitionFacts> {
    const c = row.coordination!
    return {
      partnerAssigned: Boolean(c.partner_id),
      latestQcStatus: row.qc_records[0]?.status ?? null,
      podCaptured: Boolean(c.pod_asset_id || c.pod_recipient_name),
      openExceptionCount: await this.countOpenExceptions(ctx, row.id),
      resumeStage: c.resume_stage ?? null,
      balanceVnd: Number(row.balance_vnd),
    }
  }

  // ── Ghi đơn ─────────────────────────────────────────────────────────────

  async createOrder(ctx: TenantContext, data: CreateCoordinatorOrderData): Promise<{ id: string; code: string }> {
    const result = await executeCreateOrder(this.db, ctx, data)
    await this.recordEvent(ctx, result.id, "order", null, data.axes.status, "Tiếp nhận đơn điều phối")
    return result
  }

  /**
   * Chuyển bước: ba trục `orders` + `order_coordinations` + `order_events` cho
   * từng trục đổi giá trị (M10 đo SLA từ chuỗi sự kiện này).
   */
  async applyTransition(
    ctx: TenantContext,
    row: CoordinatorOrderRow,
    params: {
      from: CoordinatorStage
      to: CoordinatorStage
      axes: MappedOrderAxes
      nextAction: string
      reason: string
      coordination?: Prisma.order_coordinationsUncheckedUpdateInput
    }
  ): Promise<boolean> {
    const before: MappedOrderAxes = {
      status: row.status,
      productionStatus: row.production_status,
      deliveryStatus: row.delivery_status,
    }
    // Khoá lạc quan: chỉ chuyển nếu bước vẫn là `from`. Hai điều phối viên
    // bấm cùng lúc thì người thứ hai nhận 409, không ghi đè lẫn nhau.
    const moved = await this.db.order_coordinations.updateMany({
      where: scopedWhere(ctx, { order_id: row.id, stage: params.from }),
      data: { ...params.coordination, stage: params.to, next_action: params.nextAction },
    })
    if (moved.count === 0) return false

    const changes = changedAxes(before, params.axes)
    if (changes.length > 0) {
      await this.db.orders.updateMany({
        where: scopedWhere(ctx, { id: row.id }),
        data: {
          status: params.axes.status,
          production_status: params.axes.productionStatus,
          delivery_status: params.axes.deliveryStatus,
        },
      })
    }
    for (const ch of changes) {
      await this.recordEvent(ctx, row.id, ch.axis, ch.from, ch.to, params.reason)
    }
    return true
  }

  async updateCoordination(
    ctx: TenantContext,
    orderId: string,
    data: Prisma.order_coordinationsUncheckedUpdateInput
  ): Promise<void> {
    await this.db.order_coordinations.updateMany({
      where: scopedWhere(ctx, { order_id: orderId }),
      data,
    })
  }

  /**
   * ĐP-3.16 (26/09/2026): ghi `custom_fields` (JSON) — tách riêng khỏi
   * `updateCoordination` vì cast `Prisma.InputJsonValue` phải nằm TRONG
   * `infra/`, không lộ kiểu Prisma ra `use-cases/`
   * (`tests/tenant/khong-import-prisma-ngoai-infra.test.ts`).
   */
  async updateCustomFields(ctx: TenantContext, orderId: string, customFields: Record<string, unknown>): Promise<void> {
    await this.updateCoordination(ctx, orderId, { custom_fields: customFields as Prisma.InputJsonValue })
  }

  async updateMetadata(ctx: TenantContext, orderId: string, metadata: Record<string, unknown>): Promise<void> {
    await this.updateCoordination(ctx, orderId, { metadata: metadata as Prisma.InputJsonValue })
  }

  async updateOrderAxis(
    ctx: TenantContext,
    orderId: string,
    data: Prisma.ordersUncheckedUpdateManyInput
  ): Promise<void> {
    await this.db.orders.updateMany({ where: scopedWhere(ctx, { id: orderId }), data })
  }

  async recordEvent(
    ctx: TenantContext,
    orderId: string,
    axis: "order" | "production" | "delivery",
    from: string | null,
    to: string,
    reason: string
  ): Promise<void> {
    await this.db.order_events.create({
      data: scopedData(ctx, {
        order_id: orderId,
        axis,
        from_value: from,
        to_value: to,
        actor_id: ctx.userId,
        reason,
      }),
    })
  }

  // ── QC ─────────────────────────────────────────────────────────────────

  createQcRecord(
    ctx: TenantContext,
    data: {
      orderId: string
      status: "PASSED" | "REJECTED" | "REWORK_REQUESTED"
      imageAssetIds: string[]
      checklist: Record<string, unknown> | null
      notes: string | null
    }
  ) {
    return this.db.order_qc_records.create({
      data: scopedData(ctx, {
        order_id: data.orderId,
        inspector_id: ctx.userId,
        status: data.status,
        image_asset_ids: data.imageAssetIds as Prisma.InputJsonValue,
        ...(data.checklist ? { checklist_result: data.checklist as Prisma.InputJsonValue } : {}),
        notes: data.notes,
      }),
    })
  }

  // ── Sự cố (Ủy thác qua OrderExceptionRepository) ──────────────────────

  createException(
    ctx: TenantContext,
    data: { orderId: string; code: string; type: string; severity: string; description: string }
  ): Promise<ExceptionRow> {
    return this.exceptionRepo.createException(ctx, data) as unknown as Promise<ExceptionRow>
  }

  findException(ctx: TenantContext, id: string): Promise<ExceptionRow | null> {
    return this.exceptionRepo.findException(ctx, id) as unknown as Promise<ExceptionRow | null>
  }

  resolveException(ctx: TenantContext, id: string, resolution: string): Promise<void> {
    return this.exceptionRepo.resolveException(ctx, id, resolution)
  }

  // ── Đối tác (Ủy thác qua PartnerRepository) ─────────────────────────────

  listPartners(ctx: TenantContext, options: { activeOnly: boolean }): Promise<PartnerRow[]> {
    return this.partnerRepo.listPartners(ctx, options) as unknown as Promise<PartnerRow[]>
  }

  findPartner(ctx: TenantContext, id: string): Promise<PartnerRow | null> {
    return this.partnerRepo.findPartner(ctx, id) as unknown as Promise<PartnerRow | null>
  }

  createPartner(
    ctx: TenantContext,
    data: {
      code: string
      name: string
      phone: string
      address: string | null
      district: string | null
      province: string | null
      tier: string
      capacityDaily: number
    }
  ): Promise<PartnerRow> {
    return this.partnerRepo.createPartner(ctx, data) as unknown as Promise<PartnerRow>
  }

  updatePartner(
    ctx: TenantContext,
    id: string,
    data: Prisma.partnersUncheckedUpdateManyInput
  ): Promise<void> {
    return this.partnerRepo.updatePartner(ctx, id, data as Parameters<typeof this.partnerRepo.updatePartner>[2])
  }

  countActiveOrdersForPartner(ctx: TenantContext, partnerId: string): Promise<number> {
    return this.partnerRepo.countActiveOrdersForPartner(ctx, partnerId)
  }
}

let defaultCoordinatorRepository: CoordinatorRepository | null = null

export function getCoordinatorRepository(db?: DbClient): CoordinatorRepository {
  if (db) return new CoordinatorRepository(db)
  if (!defaultCoordinatorRepository) {
    defaultCoordinatorRepository = new CoordinatorRepository()
  }
  return defaultCoordinatorRepository
}

