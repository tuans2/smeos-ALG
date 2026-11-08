import { describe, expect, it } from "vitest"

import * as req from "@/app/api/v1/_contracts/requests-orders"
import { validateDeliverBeforePaySettings } from "@/modules/orders/workflow/deliver-before-pay"
import { PAYMENT_METHODS } from "@/modules/orders/use-cases/confirm-order-payment"
import { MAX_QUOTE_VND } from "@/modules/orders/use-cases/quote-order"

/**
 * Thân do use-case tự kiểm; OpenAPI nội bộ khai lược đồ MÔ TẢ ở `_contracts/requests-*.ts`. Test này giữ hai bên
 * khớp nhau (OpenAPI nội bộ, PO 07/11/2026).
 */
describe("lược đồ mô tả khớp hàm kiểm của module — đơn hàng", () => {
  it("cách thanh toán và trần báo giá dùng cùng hằng số", () => {
    expect([...req.PAYMENT_METHODS_DOC]).toEqual([...PAYMENT_METHODS])
    expect(req.MAX_QUOTE_VND_DOC).toBe(MAX_QUOTE_VND)
  })

  it.each([
    [{}],
    [{ allowSelfDecide: true, selfDecideMaxVnd: 1_000_000, minCompletedOrders: 2, collectDueDays: 3, customerDebtCapVnd: null }],
    [{ selfDecideMaxVnd: 1_000_000_001 }],
    [{ selfDecideMaxVnd: -1 }],
    [{ minCompletedOrders: 1001 }],
    [{ collectDueDays: 0 }],
    [{ collectDueDays: 91 }],
    [{ collectDueDays: 1.5 }],
    [{ customerDebtCapVnd: 500_000 }],
    [{ customerDebtCapVnd: "500000" }],
    [{ allowSelfDecide: "yes" }],
  ])("hạn mức giao trước %j", (sample) => {
    expect(req.deliverBeforePaySettingsBody.safeParse(sample).success).toBe(Object.keys(validateDeliverBeforePaySettings(sample)).length === 0)
  })
})
