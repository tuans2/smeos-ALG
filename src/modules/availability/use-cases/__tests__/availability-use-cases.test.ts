import { describe, it, expect, vi } from "vitest"
import type { IAvailabilityRepository } from "../../domain/repositories/availability-repository.interface"
import { createManualBlock, removeManualBlock } from "../manage-manual-block"
import { bindOrderBooking, releaseOrderBooking } from "../bind-order-booking"
import { getAvailabilityBoard } from "../get-availability-board"

function createMockAvailabilityRepo(
  overrides?: Partial<IAvailabilityRepository>
): IAvailabilityRepository {
  return {
    listBookings: vi.fn().mockResolvedValue([]),
    createBooking: vi.fn().mockResolvedValue("booking_123"),
    deleteManualBlock: vi.fn().mockResolvedValue(true),
    findBookingByOrderId: vi.fn().mockResolvedValue(null),
    cancelByOrderId: vi.fn().mockResolvedValue(undefined),
    listProductsWithAvailability: vi.fn().mockResolvedValue([]),
    updateOrderDeliveryWindow: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe("Availability Use-Cases with IAvailabilityRepository Port", () => {
  describe("manageManualBlock", () => {
    it("tạo manual block thành công khi ngày hợp lệ", async () => {
      const repo = createMockAvailabilityRepo()
      const result = await createManualBlock(
        {
          organizationId: "org_1",
          productId: "prod_1",
          checkInDate: "2026-11-01",
          checkOutDate: "2026-11-03",
          note: "Bảo trì định kỳ",
        },
        repo
      )

      expect(repo.createBooking).toHaveBeenCalledWith({
        organizationId: "org_1",
        productId: "prod_1",
        orderId: null,
        checkInDate: "2026-11-01",
        checkOutDate: "2026-11-03",
        note: "Bảo trì định kỳ",
      })
      expect(result).toBe("booking_123")
    })

    it("báo lỗi nếu checkOutDate <= checkInDate", async () => {
      const repo = createMockAvailabilityRepo()
      await expect(
        createManualBlock(
          {
            organizationId: "org_1",
            productId: "prod_1",
            checkInDate: "2026-11-05",
            checkOutDate: "2026-11-05",
          },
          repo
        )
      ).rejects.toThrow()
    })

    it("xóa manual block thành công", async () => {
      const repo = createMockAvailabilityRepo()
      const result = await removeManualBlock("org_1", "block_123", repo)

      expect(repo.deleteManualBlock).toHaveBeenCalledWith("org_1", "block_123")
      expect(result).toBe(true)
    })
  })

  describe("bindOrderBooking & releaseOrderBooking", () => {
    it("tự động tạo booking cho đơn hàng", async () => {
      const repo = createMockAvailabilityRepo()
      const result = await bindOrderBooking(
        {
          organizationId: "org_1",
          productId: "prod_1",
          orderId: "ord_1",
          checkInDate: "2026-11-01",
          checkOutDate: "2026-11-02",
        },
        repo
      )

      expect(repo.findBookingByOrderId).toHaveBeenCalledWith("org_1", "ord_1")
      expect(repo.createBooking).toHaveBeenCalled()
      expect(result).toBe("booking_123")
    })

    it("không tạo trùng nếu đã có active booking cho orderId", async () => {
      const repo = createMockAvailabilityRepo({
        findBookingByOrderId: vi.fn().mockResolvedValue({ id: "existing_b", status: "ACTIVE" }),
      })
      const result = await bindOrderBooking(
        {
          organizationId: "org_1",
          productId: "prod_1",
          orderId: "ord_1",
          checkInDate: "2026-11-01",
          checkOutDate: "2026-11-02",
        },
        repo
      )

      expect(repo.createBooking).not.toHaveBeenCalled()
      expect(result).toBe("existing_b")
    })

    it("giải phóng booking khi đơn hàng hủy", async () => {
      const repo = createMockAvailabilityRepo()
      await releaseOrderBooking("org_1", "ord_1", repo)
      expect(repo.cancelByOrderId).toHaveBeenCalledWith("org_1", "ord_1")
    })
  })

  describe("getAvailabilityBoard", () => {
    it("trả về cấu trúc bảng khả dụng theo tháng", async () => {
      const repo = createMockAvailabilityRepo({
        listProductsWithAvailability: vi.fn().mockResolvedValue([
          {
            id: "p1",
            code: "P-01",
            name: "Phòng VIP",
            category: "Phòng",
            status: "ACTIVE",
            availabilityConfig: { mode: "DAILY_CALENDAR" },
          },
        ]),
      })

      const board = await getAvailabilityBoard("org_1", "2026-11", "HOMESTAY", repo)
      expect(board.month).toBe("2026-11")
      expect(board.days).toHaveLength(30)
      expect(board.products).toHaveLength(1)
      expect(board.products[0]?.code).toBe("P-01")
    })
  })
})

// Audit BL-16: tồn của cả tổ chức gộp mọi chi nhánh, không lấy một dòng bất kỳ
describe("aggregateInventory", () => {
  it("cộng số lượng các chi nhánh có theo dõi; còn hàng nếu một chi nhánh còn", async () => {
    const { aggregateInventory } = await import("../../infra/availability-repository")
    expect(aggregateInventory([{ status: "OUT_OF_STOCK", quantity_available: 0 }, { status: "IN_STOCK", quantity_available: 4 }])).toEqual({ status: "IN_STOCK", quantity: 4 })
    expect(aggregateInventory([{ status: "IN_STOCK", quantity_available: null }])).toEqual({ status: "IN_STOCK", quantity: null })
    expect(aggregateInventory([])).toEqual({ status: undefined, quantity: undefined })
  })
})
