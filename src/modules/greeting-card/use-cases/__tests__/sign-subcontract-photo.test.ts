import { describe, expect, it } from "vitest"

import { ownStorageKey } from "../sign-subcontract-photo"

/** Chỉ ký URL cho ảnh trong thư mục của chính tổ chức sở hữu đơn (rà soát cụm G). */
describe("ownStorageKey", () => {
  it("nhận khoá và URL cũ chứa khoá của chính tổ chức", () => {
    expect(ownStorageKey("org/o1/p/a.jpg", "o1")).toBe("org/o1/p/a.jpg")
    expect(ownStorageKey("https://s3.example/floraos-core/org/o1/p/a.jpg?x=1", "o1")).toBe("org/o1/p/a.jpg")
    expect(ownStorageKey("https://s3.example/smeos-core/org/o1/p/a.jpg?x=1", "o1")).toBe("org/o1/p/a.jpg")
  })

  it("từ chối khoá của tổ chức khác, thoát thư mục, hoặc không phải khoá", () => {
    expect(ownStorageKey("org/o2/p/a.jpg", "o1")).toBeNull()
    expect(ownStorageKey("org/o1/../o2/a.jpg", "o1")).toBeNull()
    expect(ownStorageKey("org/o10/a.jpg", "o1")).toBeNull()
    expect(ownStorageKey("https://cdn.example.com/a.jpg", "o1")).toBeNull()
    expect(ownStorageKey(null, "o1")).toBeNull()
  })
})
