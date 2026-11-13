import { describe, expect, it } from "vitest"
import { buildStoreNav } from "./nav/nav-store"

/** AUD-025: chuỗi "bỏ chọn tất cả" lưu [] — trước đây [] bị hiểu là "không giới hạn" và mở hết công cụ. */
describe("whitelist công cụ do cấp trên mở khoá", () => {
  const allowAll = () => true
  const toolKeys = (unlocked: string[] | null) =>
    buildStoreNav(allowAll, null, null, null, unlocked)
      .groups.find((g) => g.key === "cong-cu")
      ?.entries.map((e) => e.navKey) ?? []

  it("null = chưa cấu hình: hiện toàn bộ công cụ", () => {
    expect(toolKeys(null).length).toBeGreaterThan(1)
  })

  it("[] = đã khoá hết: chỉ còn mục Thư viện", () => {
    expect(toolKeys([])).toEqual(["toolkit"])
  })

  it("danh sách cụ thể: chỉ công cụ được duyệt cùng Thư viện", () => {
    const all = toolKeys(null).filter((k) => k !== "toolkit")
    const picked = all.slice(0, 1)
    expect(toolKeys(picked).sort()).toEqual(["toolkit", ...picked].sort())
  })
})
