import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { devSeedEnabled } from "../../../prisma/seed/dev-seed-policy"

describe("seed tài khoản mẫu không chạy trên production", () => {
  it("production không bật cờ: không nạp", () => {
    expect(devSeedEnabled({ NODE_ENV: "production" })).toBe(false)
    expect(devSeedEnabled({ NODE_ENV: "production", SEED_DEV_DATA: "false" })).toBe(false)
  })

  it("dev, hoặc production bật cờ rõ ràng (demo/staging): nạp", () => {
    expect(devSeedEnabled({ NODE_ENV: "development" })).toBe(true)
    expect(devSeedEnabled({ NODE_ENV: "production", SEED_DEV_DATA: "true" })).toBe(true)
  })

  // @release-strip — khối seed của cửa hàng riêng không có trong bản giao (scripts/release/cut-strip.ts)
  it("seed.ts chỉ gọi syncSiinStoreAccount bên trong nhánh devSeedEnabled", () => {
    // Tài khoản Siin Store mang mật khẩu viết cứng — gọi nó ngoài nhánh này là C3 quay lại.
    const source = readFileSync(path.resolve(__dirname, "../../../prisma/seed.ts"), "utf-8")
    const guard = source.indexOf("if (devSeedEnabled(process.env))")
    const call = source.indexOf("syncSiinStoreAccount()")
    expect(guard).toBeGreaterThan(-1)
    expect(call).toBeGreaterThan(guard)
  })
  // @release-strip-end
})
