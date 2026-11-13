import { describe, expect, it } from "vitest"
import { buildNav, type NavEntry } from "./nav-model"
import {
  isNavGroupExpanded,
  resolveActiveHref,
  matrixChildLabel,
  splitMatrixEntries,
} from "./nav-group-layout"

const entry = (href: string, label: string): NavEntry =>
  ({ href, label, iconKey: "Tag", navKey: href, group: "g" }) as unknown as NavEntry

describe("isNavGroupExpanded", () => {
  const group = { key: "kho", entries: [entry("/kho", "Kho"), entry("/gia", "Tính giá")] }

  it("mặc định đóng nhóm không chứa trang hiện tại", () => {
    expect(isNavGroupExpanded(group, "/", {})).toBe(false)
  })

  it("luôn mở nhóm chứa trang hiện tại", () => {
    expect(isNavGroupExpanded(group, "/kho", { kho: false })).toBe(true)
  })

  it("tôn trọng lựa chọn đã lưu của người dùng", () => {
    expect(isNavGroupExpanded(group, "/", { kho: true })).toBe(true)
  })
})

describe("resolveActiveHref", () => {
  const hrefs = ["/", "/cai-dat", "/cai-dat/ma-tran-uudai", "/san-pham"]

  it("chọn href khớp dài nhất", () => {
    expect(resolveActiveHref(hrefs, "/cai-dat/ma-tran-uudai")).toBe("/cai-dat/ma-tran-uudai")
    expect(resolveActiveHref(hrefs, "/cai-dat")).toBe("/cai-dat")
  })

  it("trang con khớp mục cha gần nhất, không khớp trang chủ", () => {
    expect(resolveActiveHref(hrefs, "/san-pham/abc")).toBe("/san-pham")
    expect(resolveActiveHref(hrefs, "/so-lieu")).toBe("/so-lieu")
  })
})

describe("splitMatrixEntries", () => {
  it("gom từ 3 mục ma trận trở lên", () => {
    const entries = [
      entry("/a", "Cài đặt"),
      entry("/b", "Ma trận ưu đãi"),
      entry("/c", "Ma trận cam kết"),
      entry("/d", "Ma trận chính sách"),
    ]
    const { primary, matrix } = splitMatrixEntries(entries)
    expect(primary.map((e) => e.href)).toEqual(["/a"])
    expect(matrix).toHaveLength(3)
  })

  it("không gom khi ít hơn 3 mục hoặc cả nhóm đều là ma trận", () => {
    expect(splitMatrixEntries([entry("/a", "A"), entry("/b", "Ma trận x"), entry("/c", "Ma trận y")]).matrix).toHaveLength(0)
    const all = [entry("/b", "Ma trận x"), entry("/c", "Ma trận y"), entry("/d", "Ma trận z")]
    expect(splitMatrixEntries(all).matrix).toHaveLength(0)
  })

  it("nhóm Quản trị tiệm của StoreOS gom đủ 6 mục ma trận", () => {
    const view = buildNav(() => true, null, "FLORAL", [], "SINGLE", [])
    const quanTri = view.groups.find((g) => g.key === "quan-tri")
    expect(quanTri).toBeDefined()
    expect(splitMatrixEntries(quanTri!.entries).matrix).toHaveLength(6)
  })
})

describe("matrixChildLabel", () => {
  it("bỏ tiền tố và viết hoa chữ đầu", () => {
    expect(matrixChildLabel("Ma trận ưu đãi")).toBe("Ưu đãi")
    expect(matrixChildLabel("Ma trận phí gia công")).toBe("Phí gia công")
  })
})
