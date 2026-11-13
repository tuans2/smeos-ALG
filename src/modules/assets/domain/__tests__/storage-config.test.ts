import { describe, expect, it } from "vitest"

import { localStorageAllowed, missingStorageVars, storageConfigReady } from "../storage-config"

const FULL = {
  STORAGE_ENDPOINT: "https://example.r2.cloudflarestorage.com",
  STORAGE_BUCKET: "smeos",
  STORAGE_ACCESS_KEY: "access",
  STORAGE_SECRET_KEY: "secret",
}

describe("cấu hình kho tệp (P0-05)", () => {
  it("liệt kê đúng biến thiếu; chuỗi rỗng hoặc khoảng trắng tính là thiếu", () => {
    expect(missingStorageVars(FULL)).toEqual([])
    expect(missingStorageVars({ ...FULL, STORAGE_BUCKET: "  ", STORAGE_SECRET_KEY: undefined })).toEqual([
      "STORAGE_BUCKET",
      "STORAGE_SECRET_KEY",
    ])
  })

  it("production không được lùi về đĩa cục bộ, trừ khi bật ALLOW_LOCAL_STORAGE", () => {
    expect(localStorageAllowed({ NODE_ENV: "production" })).toBe(false)
    expect(localStorageAllowed({ NODE_ENV: "production", ALLOW_LOCAL_STORAGE: "false" })).toBe(false)
    expect(localStorageAllowed({ NODE_ENV: "production", ALLOW_LOCAL_STORAGE: "true" })).toBe(true)
    expect(localStorageAllowed({ NODE_ENV: "development" })).toBe(true)
    expect(localStorageAllowed({ NODE_ENV: "test" })).toBe(true)
  })

  it("sẵn sàng khi đủ kho dùng chung, hoặc khi được phép dùng đĩa cục bộ", () => {
    expect(storageConfigReady({ NODE_ENV: "production", ...FULL })).toBe(true)
    expect(storageConfigReady({ NODE_ENV: "production" })).toBe(false)
    expect(storageConfigReady({ NODE_ENV: "production", ALLOW_LOCAL_STORAGE: "true" })).toBe(true)
    expect(storageConfigReady({ NODE_ENV: "development" })).toBe(true)
  })
})
