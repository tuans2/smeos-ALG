/**
 * Infrastructure Repository for M10 — Orders (Store OS).
 * Implements IOrderRepository port interface.
 * Enforces Tenant Isolation on all queries via scoped organization_id.
 */

import { prisma } from "@/core/tenancy/infra/prisma"
import { allocateOrderCodeNumber } from "./order-code-sequence"
import { takeStock } from "./order-stock"
import { clientItemMetadata } from "../domain/order-item-metadata"
import { storedDeliveryAddress, upsertOrderRecipient } from "./order-recipient-repository"
import { RECIPIENT_VIEW_SELECT, withDeliveryView } from "./order-recipient-view"
import type {
  Prisma,
  order_assignments,
  order_events,
  order_items,
  orders,
} from "@/generated/prisma/client"
import type {
  CreateOrderInput,
  UpdateOrderInput,
  OrderFilter,
  OrderRecord,
  OrderItemRecord,
  OrderAssignmentRecord,
  OrderEventRecord,
  OrderEventAxis,
} from "../domain/order-types"
import type { IOrderRepository, OrderListPage, PendingOrderEvent } from "../domain/repositories/order-repository.interface"
import { linkLeadToOrder } from "./order-lead-link"
import { buildOrderListWhere, ORDER_LIST_ORDER_BY } from "./order-list-where"

/** Hàng `orders` kèm các quan hệ mà truy vấn nào `include` thì có. */
type OrderRow = orders & {
  items?: order_items[]
  assignments?: order_assignments[]
  events?: order_events[]
}

function mapPrismaOrder(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id,
    code: row.code,
    customerId: row.customer_id,
    source: row.source ?? null,
    status: row.status,
    productionStatus: row.production_status,
    deliveryStatus: row.delivery_status,
    totalVnd: Number(row.total_vnd),
    pricingRuleRef: row.pricing_rule_ref as Record<string, unknown> | null,
    voucherId: row.voucher_id,
    cardMessage: row.card_message,
    internalNote: row.internal_note,
    deliveryWindow: row.delivery_window as OrderRecord["deliveryWindow"],
    deliveryAddress: row.delivery_address as OrderRecord["deliveryAddress"],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: row.items?.map((it): OrderItemRecord => ({
      id: it.id,
      organizationId: it.organization_id,
      orderId: it.order_id,
      productId: it.product_id,
      variantId: it.variant_id,
      description: it.description,
      quantity: it.quantity,
      unitPriceVnd: Number(it.unit_price_vnd),
      metadata: it.metadata as Record<string, unknown> | null,
    })),
    assignments: row.assignments?.map((as) => ({
      id: as.id,
      organizationId: as.organization_id,
      orderId: as.order_id,
      assigneeId: as.assignee_id,
      assignedBy: as.assigned_by,
      difficulty: as.difficulty ?? undefined,
      assignedAt: as.assigned_at,
      releasedAt: as.released_at,
    })),
    events: row.events?.map((ev) => ({
      id: ev.id,
      organizationId: ev.organization_id,
      orderId: ev.order_id,
      axis: ev.axis as OrderEventRecord["axis"],
      fromValue: ev.from_value,
      toValue: ev.to_value,
      actorId: ev.actor_id,
      reason: ev.reason,
      createdAt: ev.created_at,
    })),
  }
}

export class OrderRepository implements IOrderRepository {
  allocateOrderCodeNumber(organizationId: string, prefix: string): Promise<number> {
    return allocateOrderCodeNumber(organizationId, prefix)
  }

  async create(
    organizationId: string,
    code: string,
    input: CreateOrderInput,
    totalVnd: number,
    createdBy: string
  ): Promise<OrderRecord> {
    const row = await prisma.$transaction(async (tx) => {
      const ord = await tx.orders.create({
        data: {
          organization_id: organizationId,
          branch_id: input.branchId ?? null,
          code,
          customer_id: input.customerId ?? null,
          total_vnd: totalVnd,
          balance_vnd: totalVnd,
          pricing_rule_ref: (input.pricingRuleRef as unknown as Prisma.InputJsonValue) ?? null,
          card_message: input.cardMessage ?? null,
          internal_note: input.internalNote ?? null,
          delivery_window: (input.deliveryWindow as unknown as Prisma.InputJsonValue) ?? null,
          delivery_address: storedDeliveryAddress(input.deliveryAddress), // P-3c: người nhận chỉ ở order_recipients
          created_by: createdBy,
          ...(input.source ? { source: input.source } : {}),
          owner_sale_id: input.ownerSaleId ?? null,
          lead_id: input.leadId ?? null,
          idempotency_key: input.idempotencyKey ?? null,
          idempotency_body_hash: input.idempotencyBodyHash ?? null,
          events: {
            create: {
              axis: "order",
              to_value: "DRAFT",
              actor_id: createdBy,
              reason: "Khởi tạo đơn hàng",
            },
          },
        },
      })

      if (input.leadId) await linkLeadToOrder(tx, organizationId, input.leadId, ord.id)
      await upsertOrderRecipient(tx, organizationId, ord.id, { deliveryAddress: input.deliveryAddress ?? null })

      if (input.items && input.items.length > 0) {
        const stock = await takeStock(tx, organizationId, input.branchId ?? null, input.items) // Q9: trừ tồn cùng giao dịch
        await tx.order_items.createMany({
          data: input.items.map((it, i) => ({
            organization_id: organizationId,
            order_id: ord.id,
            product_id: it.productId ?? null,
            variant_id: it.variantId ?? null,
            description: it.description ?? null,
            quantity: it.quantity,
            unit_price_vnd: it.unitPriceVnd,
            metadata: (stock[i] ? { ...clientItemMetadata(it.metadata), stock: stock[i] } : clientItemMetadata(it.metadata)) as unknown as Prisma.InputJsonValue ?? undefined, // BL-19
          })),
        })
      }

      return tx.orders.findUniqueOrThrow({
        where: { id: ord.id },
        include: {
          items: true,
          events: true,
        },
      })
    })

    return mapPrismaOrder(row)
  }

  async findById(organizationId: string, id: string): Promise<OrderRecord | null> {
    const row = await prisma.orders.findFirst({
      where: { id, organization_id: organizationId },
      include: {
        items: true,
        assignments: true,
        events: { orderBy: { created_at: "asc" } },
      },
    })
    return row ? mapPrismaOrder(row) : null
  }

  async findByIdempotencyKey(organizationId: string, key: string): Promise<{ order: OrderRecord; bodyHash: string | null } | null> {
    const row = await prisma.orders.findUnique({
      where: { organization_id_idempotency_key: { organization_id: organizationId, idempotency_key: key } },
      include: { items: true, events: true },
    })
    return row ? { order: mapPrismaOrder(row), bodyHash: row.idempotency_body_hash } : null
  }

  async findByCode(organizationId: string, code: string): Promise<OrderRecord | null> {
    const row = await prisma.orders.findUnique({
      where: { organization_id_code: { organization_id: organizationId, code } },
      include: {
        items: true,
        assignments: true,
        events: { orderBy: { created_at: "asc" } },
      },
    })
    return row ? mapPrismaOrder(row) : null
  }

  async list(organizationId: string, filter: OrderFilter = {}): Promise<OrderListPage> {
    const where = buildOrderListWhere(organizationId, filter)
    const limit = filter.limit ?? 50
    // Đếm tổng KHÔNG theo con trỏ (cả danh sách đang lọc); lấy dư 1 dòng để biết còn trang sau (audit API-10).
    const [total, rows] = await Promise.all([
      prisma.orders.count({ where: buildOrderListWhere(organizationId, { ...filter, cursor: undefined }) }),
      prisma.orders.findMany({ where, include: { items: true, assignments: true, events: { orderBy: { created_at: "asc" } } }, orderBy: ORDER_LIST_ORDER_BY, take: limit + 1 }),
    ])
    const page = rows.slice(0, limit)
    const last = rows.length > limit ? page[page.length - 1] : undefined
    return { orders: page.map(mapPrismaOrder), total, nextCursor: last ? { createdAt: last.created_at.toISOString(), id: last.id } : null }
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateOrderInput,
    events: readonly PendingOrderEvent[] = []
  ): Promise<OrderRecord> {
    // Đảm bảo cô lập tenant: đơn phải thuộc tổ chức
    const existing = await prisma.orders.findFirst({
      where: { id, organization_id: organizationId },
      select: { id: true },
    })
    if (!existing) {
      throw new Error(`Đơn hàng ${id} không thuộc tổ chức ${organizationId}`)
    }

    const data: Prisma.ordersUpdateInput = {}
    if (input.status) data.status = input.status
    if (input.productionStatus) data.production_status = input.productionStatus
    if (input.deliveryStatus) data.delivery_status = input.deliveryStatus
    if (input.cardMessage !== undefined) data.card_message = input.cardMessage
    if (input.internalNote !== undefined) data.internal_note = input.internalNote
    if (input.deliveryWindow !== undefined) data.delivery_window = input.deliveryWindow as unknown as Prisma.InputJsonValue
    if (input.deliveryAddress !== undefined) data.delivery_address = storedDeliveryAddress(input.deliveryAddress) // P-3c

    // Sự kiện + người nhận + đơn: một giao dịch (audit BL-18)
    const row = await prisma.$transaction(async (tx) => {
      if (events.length > 0) {
        await tx.order_events.createMany({
          data: events.map((e) => ({ organization_id: organizationId, order_id: id, axis: e.axis, from_value: e.fromValue, to_value: e.toValue, actor_id: e.actorId, reason: e.reason })),
        })
      }
      if (input.deliveryAddress !== undefined) await upsertOrderRecipient(tx, organizationId, id, { deliveryAddress: input.deliveryAddress })
      return tx.orders.update({
        where: { id },
        data,
        include: {
          items: true,
          assignments: true,
          events: { orderBy: { created_at: "asc" } },
          recipient: RECIPIENT_VIEW_SELECT, // `update` không qua extension đọc — ghép tay
        },
      })
    })
    return mapPrismaOrder(withDeliveryView(row))
  }

  async createAssignment(
    organizationId: string,
    orderId: string,
    assigneeId: string,
    assignedBy: string,
    difficulty = "trung_binh"
  ): Promise<OrderAssignmentRecord> {
    const row = await prisma.order_assignments.create({
      data: {
        organization_id: organizationId,
        order_id: orderId,
        assignee_id: assigneeId,
        assigned_by: assignedBy,
        difficulty,
      },
    })
    return {
      id: row.id,
      organizationId: row.organization_id,
      orderId: row.order_id,
      assigneeId: row.assignee_id,
      assignedBy: row.assigned_by,
      difficulty: row.difficulty ?? undefined,
      assignedAt: row.assigned_at,
      releasedAt: row.released_at,
    }
  }

  async recordEvent(
    organizationId: string,
    orderId: string,
    axis: OrderEventAxis,
    toValue: string,
    actorId?: string,
    fromValue?: string,
    reason?: string
  ): Promise<OrderEventRecord> {
    const row = await prisma.order_events.create({
      data: {
        organization_id: organizationId,
        order_id: orderId,
        axis,
        from_value: fromValue ?? null,
        to_value: toValue,
        actor_id: actorId ?? null,
        reason: reason ?? null,
      },
    })
    return {
      id: row.id,
      organizationId: row.organization_id,
      orderId: row.order_id,
      axis: row.axis as OrderEventAxis,
      fromValue: row.from_value,
      toValue: row.to_value,
      actorId: row.actor_id,
      reason: row.reason,
      createdAt: row.created_at,
    }
  }
}

// Singleton factory
let orderRepoInstance: IOrderRepository | null = null

export function getOrderRepository(): IOrderRepository {
  if (!orderRepoInstance) {
    orderRepoInstance = new OrderRepository()
  }
  return orderRepoInstance
}
