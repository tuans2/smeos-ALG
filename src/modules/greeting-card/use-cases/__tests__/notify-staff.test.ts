import { describe, expect, it, vi } from "vitest"
import { notifyStaffEvent } from "../notify-staff"
import type { StaffNotificationRepository } from "../../infra/staff-notification-repository"

describe("notifyStaffEvent use-case", () => {
  it("luôn ghi nhận thông báo vào APP_INBOX cho các vai trò liên quan", async () => {
    const recorded: Array<Record<string, unknown>> = []

    const mockRepo = {
      getSaasAllowedChannels: vi.fn().mockResolvedValue(["APP_INBOX", "TELEGRAM"]),
      getShopStaffNotificationConfig: vi.fn().mockResolvedValue({
        staffNotifyEnabled: false, // Tiệm chưa bật kênh ngoài
        staffNotifyChannels: [],
        staffNotifyConfigEncrypted: null,
        staffNotifyEvents: {},
      }),
      findRecipientsByRole: vi.fn().mockImplementation((_orgId, role) => {
        if (role === "ADMIN") {
          return [{ userId: "u-admin", name: "Admin 1", email: "admin@test.com", phone: null, role: "ADMIN" }]
        }
        if (role === "SALE") {
          return [{ userId: "u-sale", name: "Sale 1", email: "sale@test.com", phone: null, role: "SALE" }]
        }
        return []
      }),
      recordStaffNotification: vi.fn().mockImplementation((data) => {
        recorded.push(data)
        return Promise.resolve({ id: "notif-1" })
      }),
    } as unknown as StaffNotificationRepository

    const summary = await notifyStaffEvent(
      "org-123",
      "ORDER_RECEIVED",
      {
        orderId: "ord-1",
        orderCode: "DH9999",
        customerName: "Khách VIP",
        productName: "Giỏ hoa",
        amountVnd: 1200000,
        assignedSaleId: "u-sale",
      },
      mockRepo
    )

    expect(summary.totalRecipients).toBe(2) // 1 Admin, 1 Sale
    expect(summary.deliveredCount).toBe(2)
    expect(recorded.every((r) => r.channel === "APP_INBOX")).toBe(true)
    expect(recorded.some((r) => r.recipientRole === "ADMIN")).toBe(true)
    expect(recorded.some((r) => r.recipientRole === "SALE")).toBe(true)
  })

  it("gửi thông báo ra kênh ngoài khi tiệm đã bật và được SaaS cho phép", async () => {
    const recorded: Array<Record<string, unknown>> = []

    const mockRepo = {
      getSaasAllowedChannels: vi.fn().mockResolvedValue(["APP_INBOX", "TELEGRAM"]),
      getShopStaffNotificationConfig: vi.fn().mockResolvedValue({
        staffNotifyEnabled: true,
        staffNotifyChannels: ["TELEGRAM"],
        staffNotifyConfigEncrypted: null,
        staffNotifyEvents: { CANCELLATION_REQUESTED: true },
      }),
      findRecipientsByRole: vi.fn().mockResolvedValue([
        { userId: "u-admin", name: "Chủ shop", email: "admin@shop.com", phone: "0901234567", role: "ADMIN" },
      ]),
      recordStaffNotification: vi.fn().mockImplementation((data) => {
        recorded.push(data)
        return Promise.resolve({ id: "notif-2" })
      }),
    } as unknown as StaffNotificationRepository

    await notifyStaffEvent(
      "org-123",
      "CANCELLATION_REQUESTED",
      {
        orderId: "ord-2",
        orderCode: "DH8888",
        customerName: "Trần B",
        reason: "Khách bận",
      },
      mockRepo
    )

    // Cả APP_INBOX và TELEGRAM được ghi nhận
    const channels = recorded.map((r) => r.channel)
    expect(channels).toContain("APP_INBOX")
    expect(channels).toContain("TELEGRAM")
  })

  it("không làm ném lỗi ra ngoài khi repo gặp sự cố", async () => {
    const failingRepo = {
      getSaasAllowedChannels: vi.fn().mockRejectedValue(new Error("DB Connection Error")),
    } as unknown as StaffNotificationRepository

    const summary = await notifyStaffEvent(
      "org-123",
      "ORDER_RECEIVED",
      { orderCode: "DH0000" },
      failingRepo
    )

    expect(summary.deliveredCount).toBe(0)
    expect(summary.totalRecipients).toBe(0)
  })
})
