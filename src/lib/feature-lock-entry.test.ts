import { describe, expect, it } from "vitest"
import { filterOpenHrefs, isHrefOpen } from "./feature-lock"

/** Audit N-05: khoá bật thì ẩn lối vào tuyến khoá thay vì dẫn tới màn "Sắp ra mắt". */
describe("lối vào tuyến khoá", () => {
  it("khoá bật: tuyến khoá (kể cả tuyến con, có query) không còn là lối vào mở", () => {
    for (const href of ["/duyet", "/job?job_id=1", "/dieu-phoi/doi-tac", "/so-lieu", "/muc-dung", "/noi-bo/ket-noi"]) {
      expect(isHrefOpen(href, true, false)).toBe(false)
    }
  })

  it("khoá tắt (staging, bản giao GD1): mọi lối vào giữ nguyên", () => {
    expect(isHrefOpen("/duyet", false, false)).toBe(true)
    expect(isHrefOpen("/dieu-phoi", false, false)).toBe(true)
  })

  it("tuyến không khoá, link ngoài và giá trị rỗng luôn mở", () => {
    expect(isHrefOpen("/don-hang", true, true)).toBe(true)
    expect(isHrefOpen("https://example.com/duyet", true, true)).toBe(true)
    expect(isHrefOpen(null, true, true)).toBe(true)
    expect(isHrefOpen(undefined, true, true)).toBe(true)
  })

  it("tuyến chưa vận hành (/lich-dang) bị ẩn ở mọi bản build production", () => {
    expect(isHrefOpen("/lich-dang", false, true)).toBe(false)
  })

  it("lọc danh sách giữ đúng thứ tự mục còn mở", () => {
    const links = [{ href: "/don-hang" }, { href: "/so-lieu" }, { href: "/muc-dung" }, { href: "/khach-hang" }]
    expect(filterOpenHrefs(links, (l) => l.href, true, false)).toEqual([{ href: "/don-hang" }])
    expect(filterOpenHrefs(links, (l) => l.href, false, false)).toEqual(links)
  })
})
