import { describe, expect, it } from "vitest"

import { cronSecretFor, forceStepAllowed, isAuthorizedCronRequest } from "./cron-auth"

function req(secret?: string): Request {
  const headers = new Headers()
  if (secret !== undefined) headers.set("x-cron-secret", secret)
  return new Request("http://localhost/api/v1/internal/chain-dispatch-sweep", { method: "POST", headers })
}

describe("xác thực endpoint cron", () => {
  it("production thiếu CRON_SECRET: từ chối cả 'dev'", () => {
    const env = { NODE_ENV: "production" }
    expect(cronSecretFor(env)).toBeNull()
    expect(isAuthorizedCronRequest(req("dev"), env)).toBe(false)
    expect(isAuthorizedCronRequest(req(""), env)).toBe(false)
  })

  it("production có CRON_SECRET: chỉ đúng secret mới qua", () => {
    const env = { NODE_ENV: "production", CRON_SECRET: "s3cret-cron-value" }
    expect(isAuthorizedCronRequest(req("s3cret-cron-value"), env)).toBe(true)
    expect(isAuthorizedCronRequest(req("dev"), env)).toBe(false)
    expect(isAuthorizedCronRequest(req(), env)).toBe(false)
  })

  it("dev không cấu hình: dùng 'dev' như hướng dẫn gọi tay", () => {
    expect(isAuthorizedCronRequest(req("dev"), { NODE_ENV: "development" })).toBe(true)
  })

  it("forceStep bị tắt trên production", () => {
    expect(forceStepAllowed({ NODE_ENV: "production" })).toBe(false)
    expect(forceStepAllowed({ NODE_ENV: "development" })).toBe(true)
  })
})
