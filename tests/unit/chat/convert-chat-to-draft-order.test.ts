import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy/tenant-context"

const deps = vi.hoisted(() => ({ ingestOrder: vi.fn(), getProductMasterIndex: vi.fn() }))
vi.mock("@/modules/orders/use-cases/ingest-order", () => ({ ingestOrder: deps.ingestOrder }))
vi.mock("@/modules/products/use-cases/get-product-master-index", () => ({ getProductMasterIndex: deps.getProductMasterIndex }))

import { chatDeliveryAddress, convertChatToDraftOrder } from "@/modules/chat-assistant/use-cases/convert-chat-to-draft-order"

/**
 * Audit BL-25 (11/11/2026): đơn tạo từ chat từng điền một SĐT giả, người nhận "Khách đặt qua Chat", địa chỉ
 * "Nhận tại cửa hàng" và lời chúc "Chúc mừng kỷ niệm / sinh nhật!" — lời chúc bịa có thể bị in lên thiệp.
 */
const ctx: TenantContext = { organizationId: "org-1", workspaceId: "ws-1", userId: "u-1", branchId: null, capabilities: new Set(["T3"]) }
const messages: string[] = []
const repo = {
  getConversation: async () => ({ id: "c-1", customerId: "cus-1" }),
  addMessage: async (_ctx: unknown, _id: string, _role: string, text: string) => { messages.push(text) },
} as never

describe("đơn tạo từ chat", () => {
  beforeEach(() => {
    messages.length = 0
    deps.ingestOrder.mockClear()
    deps.ingestOrder.mockImplementation(async () => ({ id: "o-1", code: "DH261111-0001" }))
    deps.getProductMasterIndex.mockImplementation(async () => ({
      id: "p-1", name: "Bó hồng", code: "BH-1", pricing: { quotePriceVnd: 450_000 }, bom: { wrapStyle: "Giấy kraft" },
    }))
  })

  it("khách chưa cho thông tin → không bịa SĐT, người nhận, địa chỉ, lời chúc", async () => {
    await convertChatToDraftOrder(ctx, "c-1", "p-1", undefined, repo)
    const input = deps.ingestOrder.mock.calls[0]![1] as Record<string, unknown>
    expect(input.deliveryAddress).toBeUndefined()
    expect(input.cardMessage).toBeUndefined()
    expect(JSON.stringify(input)).not.toMatch(/Khách đặt qua Chat|Nhận tại cửa hàng|Chúc mừng kỷ niệm/)
  })

  it("giữ đúng thông tin khách đã cho, trường thiếu để trống", async () => {
    await convertChatToDraftOrder(ctx, "c-1", "p-1", { phone: " 0912 345 678 ", cardMessage: "Mừng sinh nhật mẹ" }, repo)
    const input = deps.ingestOrder.mock.calls[0]![1] as Record<string, unknown>
    expect(input.deliveryAddress).toEqual({ recipientName: "", phone: "0912 345 678", street: "" })
    expect(input.cardMessage).toBe("Mừng sinh nhật mẹ")
  })

  it("tin hệ thống không còn mã kỹ thuật", async () => {
    await convertChatToDraftOrder(ctx, "c-1", "p-1", undefined, repo)
    expect(messages[0]).not.toMatch(/M10/)
  })

  it("chatDeliveryAddress: không có gì → {}", () => {
    expect(chatDeliveryAddress(undefined)).toEqual({})
    expect(chatDeliveryAddress({ recipientName: "  " })).toEqual({})
  })
})
