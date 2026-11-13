import { describe, expect, it } from "vitest"
import { safeImageSrc } from "./safe-image-src"

describe("safeImageSrc", () => {
  it("giữ URL ảnh hợp lệ", () => {
    for (const ok of ["blob:https://app/x", "data:image/png;base64,AAA", "https://cdn.vi-du.test/a.jpg", "/uploads/a.png"]) {
      expect(safeImageSrc(ok)).toBe(ok)
    }
  })
  it("chặn giao thức nguy hiểm và URL không rõ nguồn", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,<b>", "//evil.test/a.png", "vbscript:x", null, ""]) {
      expect(safeImageSrc(bad)).toBe("")
    }
  })
  it("mã hoá ký tự meta HTML, giữ nguyên query ký số", () => {
    expect(safeImageSrc('https://cdn.vi-du.test/a.png?x="><b>')).toBe("https://cdn.vi-du.test/a.png?x=%22%3E%3Cb%3E")
    expect(safeImageSrc("/api/v1/storage/a.png?exp=1&sig=ab")).toBe("/api/v1/storage/a.png?exp=1&sig=ab")
  })
})
