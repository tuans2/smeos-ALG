import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { RibbonBannerPrint } from "@/components/orders/print/ribbon-banner-print"
import { FloristTicketA6 } from "@/components/orders/print/florist-ticket-a6"
import { getOrderPrintout } from "@/modules/orders/use-cases/get-order-printout"
import type { TenantContext } from "@/core/tenancy/tenant-context"

/**
 * Audit BL-37 (11/11/2026): đơn không có lời chúc → máy chủ trả câu "Không có lời nhắn thiệp" và băng rôn in to câu đó
 * lên dải băng; đơn thiếu địa chỉ → phiếu ghi "Nhận tại cửa hàng" như thể khách tự lấy.
 */
const ctx: TenantContext = { organizationId: "org-1", workspaceId: "ws-1", userId: "u-1", branchId: null, capabilities: new Set(["R7"]) }
const order = (over: Record<string, unknown> = {}) => ({
  id: "o-1", code: "DH261111-0001", branchId: null, createdAt: new Date("2026-11-11T03:00:00Z"), totalVnd: 500_000,
  deliveryWindow: { date: "2026-11-12", timeSlot: "14:00 - 16:00" }, deliveryAddress: null, cardMessage: null, internalNote: null,
  items: [{ description: "Kệ hoa", quantity: 1, unitPriceVnd: 500_000, metadata: null }],
  ...over,
})
const repo = (o: ReturnType<typeof order>) => ({ findById: async () => o }) as never

describe("phiếu in đơn", () => {
  it("không có lời chúc / địa chỉ → không bịa câu thay thế", async () => {
    const data = await getOrderPrintout(ctx, "o-1", repo(order()))
    expect(data.cardMessage).toBe("")
    expect(data.recipientInfo.address).toBe("Chưa có địa chỉ giao")
  })

  it("băng rôn không in câu thay thế khi đơn chưa có lời chúc; phiếu xưởng vẫn ghi rõ", async () => {
    const data = await getOrderPrintout(ctx, "o-1", repo(order()))
    const ribbon = renderToStaticMarkup(createElement(RibbonBannerPrint, { data }))
    expect(ribbon).not.toMatch(/Không có lời nhắn thiệp/i)
    expect(ribbon).toContain("chưa có lời chúc")
    expect(renderToStaticMarkup(createElement(FloristTicketA6, { data }))).toContain("Không có lời nhắn thiệp")
  })

  it("có lời chúc → băng rôn in từng dòng", async () => {
    const data = await getOrderPrintout(ctx, "o-1", repo(order({ cardMessage: "Hồng phát\nKhai trương đại cát" })))
    const ribbon = renderToStaticMarkup(createElement(RibbonBannerPrint, { data }))
    expect(ribbon).toContain("Hồng phát")
    expect(ribbon).toContain("Khai trương đại cát")
  })
})
