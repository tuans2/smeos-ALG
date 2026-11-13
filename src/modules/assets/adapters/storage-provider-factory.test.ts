import { afterEach, describe, expect, it, vi } from "vitest"

import { _resetStorageProviderCache, getStorageProvider } from "./storage-provider-factory"

const STORAGE_KEYS = ["STORAGE_ENDPOINT", "STORAGE_BUCKET", "STORAGE_ACCESS_KEY", "STORAGE_SECRET_KEY"] as const

function withoutSharedStorage(): void {
  for (const key of STORAGE_KEYS) vi.stubEnv(key, "")
}

afterEach(() => {
  vi.unstubAllEnvs()
  _resetStorageProviderCache()
})

describe("getStorageProvider — production thiếu kho dùng chung (P0-05)", () => {
  it("báo lỗi thay vì lặng lẽ ghi xuống đĩa cục bộ", () => {
    withoutSharedStorage()
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("ALLOW_LOCAL_STORAGE", "")
    expect(() => getStorageProvider()).toThrow(/Thiếu cấu hình kho tệp dùng chung/)
  })

  it("cho dùng đĩa cục bộ khi bật ALLOW_LOCAL_STORAGE", () => {
    withoutSharedStorage()
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("ALLOW_LOCAL_STORAGE", "true")
    expect(getStorageProvider().name).not.toBe("s3")
  })

  it("ngoài production vẫn dùng đĩa cục bộ như trước", () => {
    withoutSharedStorage()
    vi.stubEnv("NODE_ENV", "development")
    expect(getStorageProvider().name).not.toBe("s3")
  })
})
