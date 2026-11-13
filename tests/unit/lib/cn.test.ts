import { describe, expect, it } from "vitest"
import { cn } from "@/lib/utils"

describe("cn — className đè class của variant/size", () => {
  it("class viết sau thắng khi xung đột (nền, màu chữ, chiều cao, padding)", () => {
    expect(cn("bg-surface text-primary h-11 px-4", "bg-primary text-white h-7 p-0")).toBe(
      "bg-primary text-white h-7 p-0"
    )
  })

  it("cỡ chữ tự đặt không xoá màu chữ và ngược lại", () => {
    expect(cn("text-white", "text-caption")).toBe("text-white text-caption")
    expect(cn("text-body-sm text-text", "text-title-sm")).toBe("text-text text-title-sm")
  })

  it("bỏ giá trị rỗng", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b")
  })
})
