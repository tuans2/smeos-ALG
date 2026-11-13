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

})
