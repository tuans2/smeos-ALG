import { describe, expect, expectTypeOf, it } from "vitest"

import { camelKeys, snakeKeys } from "./case-keys"

describe("case-keys (chuẩn API v1.1 §3, D-69)", () => {
  it("đổi khoá cấp đầu hai chiều, giữ nguyên giá trị và đối tượng lồng", () => {
    const nested = { userKey_A: 1, someField: 2 }
    const snake = snakeKeys({ orderId: "o1", unitPriceVnd: 5, customFields: nested, title: "x" })
    expect(snake).toEqual({ order_id: "o1", unit_price_vnd: 5, custom_fields: nested, title: "x" })
    expect(snake.custom_fields).toBe(nested)
    expect(camelKeys(snake)).toEqual({ orderId: "o1", unitPriceVnd: 5, customFields: nested, title: "x" })
  })

  it("kiểu khoá đổi theo", () => {
    expectTypeOf(camelKeys({ per_visitor: 1, note: "a" })).toEqualTypeOf<{ perVisitor: number; note: string }>()
    expectTypeOf(snakeKeys({ perVisitor: 1 })).toEqualTypeOf<{ per_visitor: number }>()
  })
})
