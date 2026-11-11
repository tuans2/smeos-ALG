import { describe, expect, it } from "vitest"

import { parseEnv } from "@/lib/env"

const required = {
  DATABASE_URL: "postgresql://smeos:smeos@localhost:5433/smeos",
  SESSION_SECRET: "khoa-phien-du-dai-0001",
  INTEGRATION_TOKEN_SECRET: "khoa-tich-hop-du-dai-0001",
  SSO_SESSION_SECRET: "khoa-sso-du-dai-0001",
}

/** `cp .env.example .env` (README bản giao) để trống nhiều biến tuỳ chọn — app phải khởi động được. */
describe("biến môi trường để trống", () => {
  it("biến tuỳ chọn để trống được coi là chưa đặt", () => {
    const result = parseEnv({ ...required, STORAGE_SIGNING_SECRET: "", STORAGE_DELETE_PAYLOADS: "", SEPAY_PLATFORM_API_KEY: "", REDIS_URL: "", RATE_LIMIT_TRUSTED_PROXY_HOPS: "" })
    expect(result.success).toBe(true)
    expect(result.data?.STORAGE_SIGNING_SECRET).toBeUndefined()
    expect(result.data?.STORAGE_DELETE_PAYLOADS).toBeUndefined()
  })

  it("biến bắt buộc để trống vẫn báo thiếu", () => {
    const result = parseEnv({ ...required, SESSION_SECRET: "" })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((i) => i.path.join("."))).toContain("SESSION_SECRET")
  })

  it("giá trị sai vẫn bị chặn", () => {
    expect(parseEnv({ ...required, STORAGE_DELETE_PAYLOADS: "co" }).success).toBe(false)
  })
})
