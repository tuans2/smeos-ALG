import { describe, it, expect, vi, beforeEach } from "vitest"
import { SubcontractOrderRepository } from "../subcontract-order-repository"
import type { TenantContext } from "@/core/tenancy"
import type { SubcontractOrderState } from "../../domain/subcontract-order"

describe("SubcontractOrderRepository", () => {
  const ctx: TenantContext = {
    organizationId: "org-1",
    workspaceId: "ws-1",
    userId: "user-1",
    branchId: null,
    capabilities: new Set(),
  }

  const sampleState: SubcontractOrderState = {
    orderId: "ord-123",
    orderCode: "DH123",
    dispatchStatus: "CLAIMED_GRACE",
    currentRound: 1,
    claimedBranchId: "branch-abc",
    claimedBranchName: "Chi nhánh Quận 1",
    claimedAt: "2026-10-19T08:00:00.000Z",
    graceExpiresAt: "2026-10-19T08:05:00.000Z",
    declinedBranchIds: [],
    invitedBranchIds: ["branch-abc", "branch-xyz"],
    roundExpiresAt: "2026-10-19T08:10:00.000Z",
  }

  let mockDb: any
  let repo: SubcontractOrderRepository

  beforeEach(() => {
    mockDb = {
      order_coordinations: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      orders: {
        updateMany: vi.fn(),
        findFirst: vi.fn(),
      },
      branches: {
        findFirst: vi.fn().mockResolvedValue({ id: "branch-abc" }),
      },
      organizations: { findUnique: vi.fn().mockResolvedValue({ settings: {} }) },
      shared_order_access: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn() },
    }
    // Giao dịch giả: chạy thẳng trên mock; SELECT … FOR UPDATE trả dòng mà findFirst đang giả lập
    mockDb.$transaction = (fn: (tx: unknown) => unknown) => fn(mockDb)
    mockDb.$queryRaw = vi.fn(async () => {
      const row = await mockDb.order_coordinations.findFirst()
      return row ? [row] : []
    })
    repo = new SubcontractOrderRepository(mockDb)
  })

  it("loadSubcontractState trả về null khi không tìm thấy coordination", async () => {
    mockDb.order_coordinations.findFirst.mockResolvedValue(null)
    const result = await repo.loadSubcontractState(ctx, "ord-123")
    expect(result).toBeNull()
  })

  it("loadSubcontractState trả về null khi metadata không chứa subcontract_dispatch", async () => {
    mockDb.order_coordinations.findFirst.mockResolvedValue({ metadata: { someOtherKey: 123 } })
    const result = await repo.loadSubcontractState(ctx, "ord-123")
    expect(result).toBeNull()
  })

  it("loadSubcontractState trả về SubcontractOrderState khi có dữ liệu", async () => {
    mockDb.order_coordinations.findFirst.mockResolvedValue({
      metadata: { subcontract_dispatch: sampleState },
    })
    const result = await repo.loadSubcontractState(ctx, "ord-123")
    expect(result).toEqual(sampleState)
  })

  it("saveSubcontractState cập nhật coordination đã tồn tại và cập nhật branch_id khi CLAIMED_GRACE", async () => {
    mockDb.order_coordinations.findFirst.mockResolvedValue({
      id: "coord-1",
      metadata: { other_field: "value" },
    })

    await repo.saveSubcontractState(ctx, sampleState)

    expect(mockDb.order_coordinations.update).toHaveBeenCalledWith({
      where: { id: "coord-1" },
      data: expect.objectContaining({
        metadata: expect.objectContaining({
          other_field: "value",
          subcontract_dispatch: sampleState,
        }),
      }),
    })

    expect(mockDb.orders.updateMany).toHaveBeenCalledWith({
      where: { organization_id: "org-1", id: "ord-123" },
      data: { branch_id: "branch-abc" },
    })
    // P-4: chi nhánh đang giữ đơn được cấp quyền xem mức ASSIGNED
    expect(mockDb.shared_order_access.create).toHaveBeenCalledWith({
      data: { organization_id: "org-1", order_id: "ord-123", branch_key: "branch-abc", level: "ASSIGNED" },
    })
  })

  it("saveSubcontractState tạo mới coordination và xóa branch_id khi đơn quay về OPEN", async () => {
    mockDb.order_coordinations.findFirst.mockResolvedValue(null)

    const openState: SubcontractOrderState = {
      ...sampleState,
      dispatchStatus: "OPEN",
      claimedBranchId: null,
    }

    await repo.saveSubcontractState(ctx, openState)

    expect(mockDb.order_coordinations.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "coord_ord-123",
        organization_id: "org-1",
        order_id: "ord-123",
      }),
    })

    expect(mockDb.orders.updateMany).toHaveBeenCalledWith({
      where: { organization_id: "org-1", id: "ord-123" },
      data: { branch_id: null },
    })
    // P-4: quay về OPEN → các chi nhánh được mời ở vòng hiện tại có quyền INVITED
    expect(mockDb.shared_order_access.create.mock.calls.map((c: [{ data: { branch_key: string; level: string } }]) => [c[0].data.branch_key, c[0].data.level]))
      .toEqual([["branch-abc", "INVITED"], ["branch-xyz", "INVITED"]])
  })

  it("findSubcontractByCode tìm đơn với include relations", async () => {
    mockDb.orders.findFirst.mockResolvedValue({ id: "ord-123", code: "DH123" })
    const order = await repo.findSubcontractByCode("DH123", "org-1")
    expect(mockDb.orders.findFirst).toHaveBeenCalledWith({
      where: { organization_id: "org-1", code: "DH123" },
      include: {
        coordination: true,
        items: true,
        greeting_sessions: true,
        customer: true,
      },
    })
    expect(order?.code).toBe("DH123")
  })
})
