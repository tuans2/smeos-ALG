import { describe, expect, it } from "vitest"

import { axesAfterTransition, COORDINATOR_STAGES, FORWARD } from "@/modules/coordinator/domain/stage-transitions"
import { mapStageToOrderAxes } from "@/modules/coordinator/domain/state-mapper"
import { checkLifecycleTransition } from "@/modules/orders/domain/order-lifecycle"

/**
 * Audit BL-03 (06/11/2026): Điều phối và sổ đơn ghi cùng ba cột của `orders` theo hai bộ luật — vd. Điều phối
 * đưa trục giao hàng DISPATCHED → DELIVERED mà máy M10 cấm. Bảng dưới bắt mọi bước điều phối hợp lệ phải cho ra
 * bộ ba trục hợp lệ theo `checkLifecycleTransition`.
 */
describe("vòng đời đơn — mọi bước điều phối hợp lệ theo máy trạng thái M10", () => {
  const pairs = COORDINATOR_STAGES.flatMap((from) => FORWARD[from].map((to) => [from, to] as const))

  it.each(pairs)("%s → %s", (from, to) => {
    const before = mapStageToOrderAxes(from)
    expect(checkLifecycleTransition(before, axesAfterTransition(to, before))).toEqual({ valid: true })
  })

  it("bảng có đủ các bước thuận", () => {
    expect(pairs.length).toBeGreaterThan(8)
  })
})

describe("thông điệp lỗi vòng đời không lộ mã kỹ thuật (audit BL-18)", () => {
  it("bước sai trả nhãn tiếng Việt", () => {
    const r = checkLifecycleTransition(
      { status: "CONFIRMED", productionStatus: "WAITING", deliveryStatus: "PENDING" },
      { status: "DRAFT", productionStatus: "WAITING", deliveryStatus: "PENDING" },
    )
    expect(r.valid).toBe(false)
    if (!r.valid) {
      expect(r.reason).toContain("Đã xác nhận")
      expect(r.reason).not.toMatch(/\b[A-Z_]{4,}\b/)
    }
  })
})
