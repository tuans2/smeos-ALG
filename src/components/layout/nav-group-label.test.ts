import { describe, expect, it } from "vitest"
import { formatNavGroupLabel } from "./nav-group-label"

describe("formatNavGroupLabel", () => {
  it("bỏ số thứ tự đầu nhãn", () => {
    expect(formatNavGroupLabel("01 · CÔNG CỤ")).toBe("CÔNG CỤ")
    expect(formatNavGroupLabel("05 · BÁO CÁO & TÀI CHÍNH")).toBe("BÁO CÁO & TÀI CHÍNH")
  })

  it("bỏ phần vai trò sau dấu chấm giữa", () => {
    expect(formatNavGroupLabel("Việc hôm nay · Quản trị cửa hàng")).toBe("Việc hôm nay")
  })

  it("giữ nguyên nhãn không có tiền tố", () => {
    expect(formatNavGroupLabel("Ma trận 4 tầng")).toBe("Ma trận 4 tầng")
    expect(formatNavGroupLabel("HẠ TẦNG & TÀI NGUYÊN")).toBe("HẠ TẦNG & TÀI NGUYÊN")
  })

  it("không trả về chuỗi rỗng", () => {
    expect(formatNavGroupLabel("  ")).toBe("")
    expect(formatNavGroupLabel("01 · ")).toBe("01 ·")
  })
})
