import { describe, expect, it } from "vitest"

import { isValidSlug, slugCandidates, toSlug } from "./slug"

describe("slug tổ chức", () => {
  it("bỏ dấu tiếng Việt", () => {
    expect(toSlug("Tiệm hoa Mộc Lan")).toBe("tiem-hoa-moc-lan")
    expect(toSlug("Cửa hàng ĐÔNG ĐÔ")).toBe("cua-hang-dong-do")
  })

  it("gộp ký tự lạ thành một dấu nối và cắt hai đầu", () => {
    expect(toSlug("  Hoa & Lá  ")).toBe("hoa-la")
    expect(toSlug("--- ???")).toBe("")
  })

  it("nhận diện slug hợp lệ", () => {
    expect(isValidSlug("tiem-hoa-moc-lan")).toBe(true)
    expect(isValidSlug("-mo-dau-bang-gach")).toBe(false)
    expect(isValidSlug("Hoa")).toBe(false)
    expect(isValidSlug("")).toBe(false)
  })

  it("sinh ứng viên nối số khi tên đã bị chiếm", () => {
    const candidates = slugCandidates("Tiệm hoa Mộc Lan", 3)
    expect(candidates[0]).toBe("tiem-hoa-moc-lan")
    expect(candidates[1]).toBe("tiem-hoa-moc-lan-2")
    expect(candidates[2]).toBe("tiem-hoa-moc-lan-3")
    expect(candidates.every(isValidSlug)).toBe(true)
  })

  it("tên không còn ký tự nào dùng được vẫn ra slug hợp lệ", () => {
    expect(slugCandidates("???", 1)[0]).toBe("to-chuc")
  })
})
