import { describe, it, expect, vi } from "vitest"
import { getAvailabilityBoard } from "../use-cases/get-availability-board"
import { bindOrderBooking, ensureHomestayOrderBooking, releaseOrderBooking } from "../use-cases/bind-order-booking"
import { createManualBlock, removeManualBlock } from "../use-cases/manage-manual-block"
import type { AvailabilityRepository } from "../infra/availability-repository"

describe("Availability Module Use-Cases", () => {
  it("getAvailabilityBoard creates proper days array and aggregates product data", async () => {
    const mockRepo = {
      listProductsWithAvailability: vi.fn().mockResolvedValue([
        {
          id: "prod-1",
          code: "ROOM-01",
          name: "Phòng VIP 1",
          category: "VIP",
          status: "ACTIVE",
          availabilityConfig: { mode: "HOMESTAY_CALENDAR" },
          inventoryStatus: "IN_STOCK",
          quantityAvailable: null,
        },
      ]),
      listBookings: vi.fn().mockResolvedValue([
        {
          id: "book-1",
          productId: "prod-1",
          productName: "Phòng VIP 1",
          orderId: "order-123",
          orderCode: "DH-001",
          customerName: "Nguyễn Văn A",
          customerPhone: "0901234567",
          checkInDate: "2026-10-10",
          checkOutDate: "2026-10-12",
          note: null,
          status: "ACTIVE",
          createdAt: "2026-10-01T00:00:00Z",
        },
      ]),
    } as unknown as AvailabilityRepository

    const result = await getAvailabilityBoard("org-1", "2026-10", "HOMESTAY", mockRepo)

    expect(result.month).toBe("2026-10")
    expect(result.fromDate).toBe("2026-10-01")
    expect(result.toDate).toBe("2026-10-31")
    expect(result.days).toHaveLength(31)
    expect(result.days[0]).toBe("2026-10-01")
    expect(result.days[30]).toBe("2026-10-31")
    expect(result.products).toHaveLength(1)
    expect(result.products[0]?.code).toBe("ROOM-01")
    expect(result.bookings).toHaveLength(1)
    expect(result.bookings[0]?.id).toBe("book-1")
  })

  it("bindOrderBooking validates inputs and calls repo", async () => {
    const mockRepo = {
      findBookingByOrderId: vi.fn().mockResolvedValue(null),
      createBooking: vi.fn().mockResolvedValue("booking-new"),
    } as unknown as AvailabilityRepository

    const res = await bindOrderBooking({
      organizationId: "org-1",
      productId: "prod-1",
      orderId: "order-1",
      checkInDate: "2026-10-20",
      checkOutDate: "2026-10-22",
    }, mockRepo)

    expect(res).toBe("booking-new")
    expect(mockRepo.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        productId: "prod-1",
        orderId: "order-1",
        checkInDate: "2026-10-20",
        checkOutDate: "2026-10-22",
      })
    )
  })

  it("bindOrderBooking safely returns null when checkOutDate <= checkInDate", async () => {
    const mockRepo = {
      createBooking: vi.fn(),
    } as unknown as AvailabilityRepository

    const res = await bindOrderBooking({
      organizationId: "org-1",
      productId: "prod-1",
      orderId: "order-1",
      checkInDate: "2026-10-25",
      checkOutDate: "2026-10-20",
    }, mockRepo)

    expect(res).toBeNull()
    expect(mockRepo.createBooking).not.toHaveBeenCalled()
  })

  it("releaseOrderBooking calls cancelByOrderId", async () => {
    const mockRepo = {
      cancelByOrderId: vi.fn().mockResolvedValue(undefined),
    } as unknown as AvailabilityRepository

    await releaseOrderBooking("org-1", "order-1", mockRepo)
    expect(mockRepo.cancelByOrderId).toHaveBeenCalledWith("org-1", "order-1")
  })

  it("createManualBlock and removeManualBlock invoke repository correctly", async () => {
    const mockRepo = {
      productBelongsToOrganization: vi.fn().mockResolvedValue(true),
      createBooking: vi.fn().mockResolvedValue("manual-1"),
      deleteManualBlock: vi.fn().mockResolvedValue(true),
    } as unknown as AvailabilityRepository

    const blockId = await createManualBlock({
      organizationId: "org-1",
      productId: "prod-1",
      checkInDate: "2026-11-01",
      checkOutDate: "2026-11-05",
      note: "Bảo trì định kỳ",
    }, mockRepo)

    expect(blockId).toBe("manual-1")

    const removed = await removeManualBlock("org-1", "manual-1", mockRepo)
    expect(removed).toBe(true)
    expect(mockRepo.deleteManualBlock).toHaveBeenCalledWith("org-1", "manual-1")
  })

  it("createManualBlock throws validation error for invalid dates", async () => {
    const mockRepo = {
      createBooking: vi.fn(),
    } as unknown as AvailabilityRepository

    await expect(
      createManualBlock({
        organizationId: "org-1",
        productId: "prod-1",
        checkInDate: "2026-11-05",
        checkOutDate: "2026-11-01",
      }, mockRepo)
    ).rejects.toThrow()
  })

  it("ensureHomestayOrderBooking recovers checkOutDate from internal_note and persists it", async () => {
    const mockRepo = {
      findBookingByOrderId: vi.fn().mockResolvedValue(null),
      createBooking: vi.fn().mockResolvedValue("booking-recovered"),
      updateOrderDeliveryWindow: vi.fn().mockResolvedValue(undefined),
    } as unknown as AvailabilityRepository

    const res = await ensureHomestayOrderBooking(
      {
        id: "order-99",
        code: "DH261018-TEST",
        organization_id: "org-1",
        delivery_window: { date: "2026-10-25" }, // missing checkOutDate
        internal_note: "Lưu trú: 3 đêm (2026-10-25 ➔ 2026-10-28)",
        items: [{ product_id: "prod-1", quantity: 3 }],
      },
      mockRepo,
    )

    expect(res).toBe("booking-recovered")
    expect(mockRepo.updateOrderDeliveryWindow).toHaveBeenCalledWith(
      "org-1",
      "order-99",
      { date: "2026-10-25", checkOutDate: "2026-10-28" },
    )
    expect(mockRepo.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        productId: "prod-1",
        checkInDate: "2026-10-25",
        checkOutDate: "2026-10-28",
      }),
    )
  })
})

