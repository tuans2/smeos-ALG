import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { manualStatusBlockReason } from "@/modules/orders/domain/order-rules"
import type { OrderRecord, OrderStatus } from "@/modules/orders/domain/order-types"
import type { IOrderRepository } from "@/modules/orders/domain/repositories/order-repository.interface"
import { updateOrderProgress } from "@/modules/orders/use-cases/update-order-progress"

/**
 * Audit BL-01 (06/11/2026): `PATCH /orders/:id` (R3) từng đặt được CANCELLED / CONFIRMED / COMPLETED —
 * Điều phối (có R3, không có R6) huỷ đơn không lý do, xác nhận đơn không cần tiền, hoàn tất khi còn nợ.
 */
const coordinator: TenantContext = {
  userId: "u-coord",
  organizationId: "org-1",
  workspaceId: "ws-1",
  branchId: null,
  capabilities: new Set(["R1", "R3"]),
}

function order(partial: Partial<OrderRecord>): OrderRecord {
  return {
    id: "ord-1", organizationId: "org-1", branchId: null, code: "DH261107-0001",
    status: "DRAFT", productionStatus: "WAITING", deliveryStatus: "PENDING", totalVnd: 500_000,
    createdBy: "u-sale", createdAt: new Date(), updatedAt: new Date(), events: [], items: [], assignments: [],
    ...partial,
  }
}

function repoFor(existing: OrderRecord) {
  return {
    countTodayOrders: vi.fn(), create: vi.fn(), findByCode: vi.fn(), list: vi.fn(), createAssignment: vi.fn(),
    findById: vi.fn().mockResolvedValue(existing),
    update: vi.fn(async (_org: string, _id: string, input: Partial<OrderRecord>) => ({ ...existing, ...input })),
    recordEvent: vi.fn().mockResolvedValue({}),
  } as unknown as IOrderRepository & { update: ReturnType<typeof vi.fn>; recordEvent: ReturnType<typeof vi.fn> }
}

describe("manualStatusBlockReason", () => {
  it.each<OrderStatus>(["CONFIRMED", "COMPLETED", "CANCELLED"])("%s có lối riêng → chặn, lý do tiếng Việt không mã", (s) => {
    const reason = manualStatusBlockReason(s)
    expect(reason).toBeTruthy()
    expect(reason).not.toMatch(/[A-Z_]{4,}/)
  })

  it.each<OrderStatus>(["PROCESSING", "DELIVERED"])("%s là bước tiến độ → cho phép", (s) => {
    expect(manualStatusBlockReason(s)).toBeNull()
  })
})

describe("updateOrderProgress — không đặt tay trạng thái xác nhận / hoàn tất / huỷ", () => {
  it.each<[OrderStatus, OrderStatus]>([
    ["CONFIRMED", "CANCELLED"],
    ["DRAFT", "CONFIRMED"],
    ["PROCESSING", "COMPLETED"],
    ["DELIVERED", "COMPLETED"],
  ])("%s → %s: 422, không ghi sự kiện, không cập nhật", async (from, to) => {
    const repo = repoFor(order({ status: from }))
    await expect(updateOrderProgress(coordinator, "ord-1", { status: to }, repo, vi.fn())).rejects.toMatchObject({
      code: "UNPROCESSABLE_ENTITY",
    })
    expect(repo.recordEvent).not.toHaveBeenCalled()
    expect(repo.update).not.toHaveBeenCalled()
  })

  it("CONFIRMED → PROCESSING vẫn đi được", async () => {
    const repo = repoFor(order({ status: "CONFIRMED" }))
    const updated = await updateOrderProgress(coordinator, "ord-1", { status: "PROCESSING" }, repo, vi.fn())
    expect(updated.status).toBe("PROCESSING")
    expect(repo.update).toHaveBeenCalled()
  })

  it("gửi lại đúng trạng thái hiện có (không đổi) không bị chặn", async () => {
    const repo = repoFor(order({ status: "CONFIRMED" }))
    await expect(updateOrderProgress(coordinator, "ord-1", { status: "CONFIRMED", internalNote: "x" }, repo, vi.fn())).resolves.toBeDefined()
  })

  // Audit BL-18: sự kiện từng được ghi riêng TRƯỚC khi cập nhật — cập nhật lỗi thì sự kiện vẫn còn.
  it("sự kiện đi cùng lần cập nhật; cập nhật lỗi thì không có sự kiện nào được ghi riêng", async () => {
    const repo = repoFor(order({ status: "CONFIRMED" }))
    repo.update.mockRejectedValueOnce(new Error("db down"))
    await expect(updateOrderProgress(coordinator, "ord-1", { status: "PROCESSING" }, repo, vi.fn())).rejects.toThrow("db down")
    expect(repo.recordEvent).not.toHaveBeenCalled()
    expect(repo.update).toHaveBeenCalledWith("org-1", "ord-1", { status: "PROCESSING" }, [
      expect.objectContaining({ axis: "order", fromValue: "CONFIRMED", toValue: "PROCESSING" }),
    ])
  })
})
