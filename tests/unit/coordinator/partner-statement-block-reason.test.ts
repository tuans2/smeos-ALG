import { describe, expect, it } from "vitest"

import { blockReason } from "@/components/coordinator/partner-statement-modal"

/** Màn Bảng kê (audit BL-22): nút "Lập sổ" khoá kèm lý do thay vì để máy chủ trả lỗi sau khi bấm (mở thử 12/11/2026). */
describe("lý do chưa lập được sổ quyết toán", () => {
  const sett = (from: string, to: string) => ({ id: "s", from, to, status: "PAID", orderCount: 3, totalPayoutVnd: 900_000, paymentReference: null })
  it("chưa có đơn / còn đơn thiếu tiền công / trùng kỳ / lập được", () => {
    expect(blockReason({ orderCount: 0, missingPayoutCount: 0, settlements: [] }, "2026-11-01", "2026-11-30")).toContain("chưa có đơn")
    expect(blockReason({ orderCount: 4, missingPayoutCount: 1, settlements: [] }, "2026-11-01", "2026-11-30")).toContain("Còn 1 đơn")
    expect(blockReason({ orderCount: 2, missingPayoutCount: 0, settlements: [sett("2026-11-01", "2026-11-10")] }, "2026-11-05", "2026-11-09")).toContain("trùng")
    expect(blockReason({ orderCount: 2, missingPayoutCount: 0, settlements: [sett("2026-11-01", "2026-11-10")] }, "2026-11-11", "2026-11-30")).toBeNull()
  })
})
