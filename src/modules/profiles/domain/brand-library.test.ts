import { describe, expect, it } from "vitest"
import { isBrandLibraryCategory, isFileCategory, parseColorList, validateItemMeta, validateVersionContent } from "./brand-library"

describe("validateVersionContent", () => {
  it("loại tệp bắt buộc có ảnh", () => {
    expect(validateVersionContent("LOGO", {})).toHaveProperty("asset_id")
    expect(validateVersionContent("LOGO", { assetId: "a1" })).toEqual({})
  })

  it("loại văn bản bắt buộc có nội dung, có giới hạn độ dài", () => {
    expect(validateVersionContent("COPY", { textValue: "   " })).toHaveProperty("text_value")
    expect(validateVersionContent("COPY", { textValue: "x".repeat(5001) })).toHaveProperty("text_value")
    expect(validateVersionContent("FONT", { textValue: "Be Vietnam Pro" })).toEqual({})
  })

  it("bảng màu chỉ nhận mã hex", () => {
    expect(validateVersionContent("COLOR", { textValue: "#2f6f4e, #FFF\n#123456" })).toEqual({})
    expect(validateVersionContent("COLOR", { textValue: "#2f6f4e, xanh" })).toHaveProperty("text_value")
  })

  it("ghi chú quá dài bị chặn", () => {
    expect(validateVersionContent("COPY", { textValue: "a", note: "n".repeat(301) })).toHaveProperty("note")
  })
})

describe("validateItemMeta", () => {
  it("tên rỗng hoặc quá dài bị chặn; bỏ qua khi không gửi tên", () => {
    expect(validateItemMeta({ title: " " })).toHaveProperty("title")
    expect(validateItemMeta({ title: "x".repeat(121) })).toHaveProperty("title")
    expect(validateItemMeta({})).toEqual({})
  })
})

describe("phân loại", () => {
  it("nhận đúng loại, từ chối giá trị lạ", () => {
    expect(isBrandLibraryCategory("LOGO")).toBe(true)
    expect(isBrandLibraryCategory("PDF")).toBe(false)
    expect(isFileCategory("TEMPLATE")).toBe(true)
    expect(isFileCategory("COLOR")).toBe(false)
  })
  it("tách danh sách màu", () => {
    expect(parseColorList(" #a, #b;#c\n")).toEqual(["#a", "#b", "#c"])
  })
})
