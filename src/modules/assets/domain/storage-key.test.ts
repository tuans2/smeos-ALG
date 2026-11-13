import { describe, expect, it } from "vitest"

import { buildStorageKey, extensionForMimeType, storageKeyMatchesContext } from "./storage-key"

describe("buildStorageKey", () => {
  it("dựng đúng org/<org>/<product>/<asset>.<ext>", () => {
    expect(
      buildStorageKey({ organizationId: "o1", productId: "p1", assetId: "a1", extension: "JPG" })
    ).toBe("org/o1/p1/a1.jpg")
  })

  it("product_id null dùng đoạn 'unfiled' cố định", () => {
    expect(
      buildStorageKey({ organizationId: "o1", productId: null, assetId: "a1", extension: "png" })
    ).toBe("org/o1/unfiled/a1.png")
  })
})

describe("extensionForMimeType", () => {
  it("nhận diện các kiểu ảnh phổ biến", () => {
    expect(extensionForMimeType("image/png")).toBe("png")
    expect(extensionForMimeType("image/jpeg")).toBe("jpg")
  })

  it("từ chối kiểu tệp không hỗ trợ thay vì đoán bừa", () => {
    expect(() => extensionForMimeType("application/zip")).toThrow()
  })
})

describe("storageKeyMatchesContext", () => {
  const ctx = {
    organizationId: "org-a",
    productId: null,
    assetId: "asset-1",
    mimeType: "image/jpeg",
  }

  it("nhận đúng đường dẫn mà upload-url vừa ký", () => {
    expect(storageKeyMatchesContext("org/org-a/unfiled/asset-1.jpg", ctx)).toBe(true)
  })

  it("từ chối đường dẫn trỏ sang tổ chức khác", () => {
    expect(storageKeyMatchesContext("org/org-b/unfiled/asset-1.jpg", ctx)).toBe(false)
  })

  it("từ chối đường dẫn leo ra ngoài kho", () => {
    expect(storageKeyMatchesContext("../../../etc/passwd", ctx)).toBe(false)
    expect(storageKeyMatchesContext("org/org-a/unfiled/../../org-b/x/a.jpg", ctx)).toBe(false)
  })

  it("từ chối khi asset_id hoặc product_id không khớp ngữ cảnh", () => {
    expect(storageKeyMatchesContext("org/org-a/unfiled/asset-2.jpg", ctx)).toBe(false)
    expect(
      storageKeyMatchesContext("org/org-a/unfiled/asset-1.jpg", { ...ctx, productId: "p1" })
    ).toBe(false)
  })

  it("từ chối kiểu tệp không hỗ trợ thay vì ném lỗi ra ngoài", () => {
    expect(storageKeyMatchesContext("org/org-a/unfiled/asset-1.zip", { ...ctx, mimeType: "application/zip" })).toBe(
      false
    )
  })
})
