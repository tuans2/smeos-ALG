import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { OrderRecord } from "../../domain/order-types"
import type { IOrderRepository } from "../../domain/repositories/order-repository.interface"
import { createOrder } from "../create-order"
import { getOrder } from "../get-order"
import { listOrders } from "../list-orders"
import { progressEvents, updateOrderProgress } from "../update-order-progress"
import { assignFlorist } from "../assign-florist"

const mockTenant: TenantContext = {
  userId: "user-1",
  organizationId: "org-1",
  workspaceId: "ws-1",
  branchId: "branch-1",
  capabilities: new Set(["R1", "R2", "R3", "R4", "R5", "R6"]),
}

function createMockOrder(partial: Partial<OrderRecord> = {}): OrderRecord {
  return {
    id: "ord-123",
    organizationId: "org-1",
    branchId: "branch-1",
    code: "DH261025-0001",
    status: "CONFIRMED",
    productionStatus: "WAITING",
    deliveryStatus: "PENDING",
    totalVnd: 500000,
    createdBy: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    events: [],
    items: [],
    assignments: [],
    ...partial,
  }
}

describe("Order Use-cases with Mocked IOrderRepository (Clean Architecture)", () => {
  it("createOrder delegates to repo and calculates order total", async () => {
    const mockRepo: IOrderRepository = {
      countTodayOrders: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockImplementation((_orgId, code, input, totalVnd) =>
        Promise.resolve(createMockOrder({ code, totalVnd }))
      ),
      findById: vi.fn(),
      findByIdempotencyKey: vi.fn(),
      findByCode: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      createAssignment: vi.fn(),
      recordEvent: vi.fn(),
    }

    const notify = vi.fn().mockResolvedValue(1)
    const audit = vi.fn(async (..._args: unknown[]) => ({}) as never)
    const order = await createOrder(
      mockTenant,
      {
        items: [
          { description: "Sản phẩm hồng", quantity: 2, unitPriceVnd: 250000 },
        ],
      },
      mockRepo,
      notify,
      vi.fn(async () => []),
      vi.fn(async () => undefined),
      audit
    )

    expect(audit).toHaveBeenCalledWith(mockTenant, expect.objectContaining({ action: "order.create", entityType: "orders" }))
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", eventKey: "ORDER_RECEIVED" }))
    expect(mockRepo.countTodayOrders).toHaveBeenCalledWith("org-1")
    expect(mockRepo.create).toHaveBeenCalled()
    expect(order.totalVnd).toBe(500000)
    expect(order.code).toMatch(/^DH\d{6}-0001$/)
  })

  it("getOrder returns order and calculated SLA", async () => {
    const mockOrder = createMockOrder({
      events: [
        {
          id: "ev-1",
          organizationId: "org-1",
          orderId: "ord-123",
          axis: "order",
          toValue: "CONFIRMED",
          createdAt: new Date(Date.now() - 3600000),
        },
      ],
    })

    const mockRepo: IOrderRepository = {
      countTodayOrders: vi.fn(),
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(mockOrder),
      findByIdempotencyKey: vi.fn(),
      findByCode: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      createAssignment: vi.fn(),
      recordEvent: vi.fn(),
    }

    const result = await getOrder(mockTenant, "ord-123", mockRepo)
    expect(result.order.id).toBe("ord-123")
    expect(result.sla).toBeDefined()
    expect(mockRepo.findById).toHaveBeenCalledWith("org-1", "ord-123")
  })

  it("updateOrderProgress validates status transitions and records event", async () => {
    const existing = createMockOrder({ status: "CONFIRMED", productionStatus: "WAITING" })
    const updated = createMockOrder({ status: "PROCESSING", productionStatus: "ARRANGING" })

    const mockRepo: IOrderRepository = {
      countTodayOrders: vi.fn(),
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(existing),
      findByIdempotencyKey: vi.fn(),
      findByCode: vi.fn(),
      list: vi.fn(),
      update: vi.fn().mockResolvedValue(updated),
      createAssignment: vi.fn(),
      recordEvent: vi.fn().mockResolvedValue({
        id: "ev-2",
        organizationId: "org-1",
        orderId: "ord-123",
        axis: "production",
        toValue: "ARRANGING",
        createdAt: new Date(),
      }),
    }

    const result = await updateOrderProgress(
      mockTenant,
      "ord-123",
      { status: "PROCESSING", productionStatus: "ARRANGING" },
      mockRepo
    )

    expect(result.status).toBe("PROCESSING")
    // Sự kiện đi cùng lần cập nhật (một giao dịch — audit BL-18), không ghi riêng trước
    expect(mockRepo.recordEvent).not.toHaveBeenCalled()
    expect(mockRepo.update).toHaveBeenCalledWith("org-1", "ord-123", expect.anything(), [
      expect.objectContaining({ axis: "order", fromValue: "CONFIRMED", toValue: "PROCESSING" }),
      expect.objectContaining({ axis: "production", fromValue: "WAITING", toValue: "ARRANGING" }),
    ])
  })

  it("assignFlorist creates assignment record and updates productionStatus to ASSIGNED", async () => {
    const existing = createMockOrder({ status: "CONFIRMED", productionStatus: "WAITING" })
    const updated = createMockOrder({ productionStatus: "ASSIGNED" })

    const mockRepo: IOrderRepository = {
      countTodayOrders: vi.fn(),
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(existing),
      findByIdempotencyKey: vi.fn(),
      findByCode: vi.fn(),
      list: vi.fn(),
      update: vi.fn().mockResolvedValue(updated),
      createAssignment: vi.fn().mockResolvedValue({
        id: "as-1",
        organizationId: "org-1",
        orderId: "ord-123",
        assigneeId: "user-2",
        assignedBy: "user-1",
        assignedAt: new Date(),
      }),
      recordEvent: vi.fn().mockResolvedValue({
        id: "ev-3",
        organizationId: "org-1",
        orderId: "ord-123",
        axis: "production",
        toValue: "ASSIGNED",
        createdAt: new Date(),
      }),
    }

    const notifyAssign = vi.fn().mockResolvedValue(1)
    const queue = { isActiveMember: vi.fn().mockResolvedValue(true), releaseActive: vi.fn() }
    const result = await assignFlorist(
      mockTenant,
      "ord-123",
      { assigneeId: "user-2", difficulty: "trung_binh" },
      mockRepo,
      notifyAssign,
      queue
    )
    expect(queue.releaseActive).toHaveBeenCalledWith(mockTenant, "ord-123")

    expect(notifyAssign).toHaveBeenCalledWith(expect.objectContaining({ eventKey: "FLORIST_TASK_ASSIGNED", ownerUserId: "user-2" }))

    expect(mockRepo.createAssignment).toHaveBeenCalledWith(
      "org-1",
      "ord-123",
      "user-2",
      "user-1",
      "trung_binh"
    )
    expect(mockRepo.recordEvent).toHaveBeenCalledWith(
      "org-1",
      "ord-123",
      "production",
      "ASSIGNED",
      "user-1",
      "WAITING",
      "Phân công thợ chế tác (ID: user-2)"
    )
  })

  it("listOrders returns filtered list from repo", async () => {
    const mockRepo: IOrderRepository = {
      countTodayOrders: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      findByIdempotencyKey: vi.fn(),
      findByCode: vi.fn(),
      list: vi.fn().mockResolvedValue({ orders: [createMockOrder()], total: 1 }),
      update: vi.fn(),
      createAssignment: vi.fn(),
      recordEvent: vi.fn(),
    }

    const res = await listOrders(mockTenant, { status: "CONFIRMED" }, mockRepo)
    expect(res.total).toBe(1)
    // Nhân viên gắn chi nhánh (không có F7) chỉ thấy đơn của chi nhánh mình (checklist ALG 9.13)
    expect(mockRepo.list).toHaveBeenCalledWith("org-1", { status: "CONFIRMED", branchId: "branch-1" })
  })
})

describe("progressEvents — mốc tiến độ sinh thông báo", () => {
  const base = { status: "DRAFT", productionStatus: "WAITING", deliveryStatus: "PENDING" } as unknown as OrderRecord
  it("chỉ báo khi chuyển sang mốc mới", () => {
    expect(progressEvents(base, { status: "CONFIRMED" })).toEqual(["ORDER_ACCEPTED"])
    expect(progressEvents(base, { productionStatus: "READY", deliveryStatus: "DELIVERED" })).toEqual(["PRODUCT_READY_FOR_DELIVERY", "ORDER_DELIVERED"])
    expect(progressEvents({ ...base, status: "CONFIRMED" } as OrderRecord, { status: "CONFIRMED" })).toEqual([])
  })
})
