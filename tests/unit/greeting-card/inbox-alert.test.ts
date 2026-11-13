import { describe, expect, it } from "vitest"
import { newItemsSince, stripCountPrefix, titleWithCount } from "@/modules/greeting-card/domain/inbox-alert"

describe("inbox-alert", () => {
  it("thêm và thay tiền tố số việc vào tiêu đề", () => {
    expect(titleWithCount("Thẻ chào", 3)).toBe("(3) Thẻ chào")
    expect(titleWithCount("(3) Thẻ chào", 5)).toBe("(5) Thẻ chào")
    expect(titleWithCount("(99+) Thẻ chào", 0)).toBe("Thẻ chào")
    expect(titleWithCount("Thẻ chào", 150)).toBe("(99+) Thẻ chào")
    expect(stripCountPrefix("(2) (khách) A")).toBe("(khách) A")
  })

  it("chỉ báo việc mới khi số việc tăng, không báo lần tải đầu", () => {
    expect(newItemsSince(null, 4)).toBe(0)
    expect(newItemsSince(2, 4)).toBe(2)
    expect(newItemsSince(4, 1)).toBe(0)
  })
})
