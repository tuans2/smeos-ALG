import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as instantTrial } from "@/app/api/v1/auth/instant-trial/route"
import { POST as signup } from "@/app/api/v1/auth/signup/route"
import { prisma } from "@/core/tenancy/infra/prisma"

import { disconnectDatabase, resetDatabase } from "../helpers/database"

function post(url: string, body: Record<string, unknown>, ip: string): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  })
}

const signupBody = (email: string, extra: Record<string, unknown> = {}) => ({
  email, password: "mat-khau-du-dai", name: "Chủ tiệm", organization_name: `Tiệm ${email}`, ...extra,
})

/**
 * Đăng ký / dùng thử (rà soát cụm B, 22/10/2026): mã ngành lạ từng được ghi và khoá ngành vĩnh viễn,
 * chuỗi dài tuỳ ý, và đăng ký không giới hạn tần suất (mỗi lần tạo một tổ chức).
 */
describe("giới hạn đầu vào đăng ký và dùng thử", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("mã ngành không có trong danh mục → 400, không tạo gì; mã đúng thì nhận", async () => {
    const bad = await signup(post("http://localhost/api/v1/auth/signup", signupBody("a@vi-du.test", { industry_key: "KHONG_CO" }), "10.0.0.1"))
    expect(bad.status).toBe(400)
    const trial = await instantTrial(
      post("http://localhost/api/v1/auth/instant-trial", { name: "Lan", phone: "0901234567", email: "t@vi-du.test", industry_key: "<script>" }, "10.0.0.1")
    )
    expect(trial.status).toBe(400)
    expect(await prisma.organizations.count()).toBe(0)

    const ok = await signup(post("http://localhost/api/v1/auth/signup", signupBody("b@vi-du.test", { industry_key: "FASHION" }), "10.0.0.1"))
    expect(ok.status).toBe(202)
  })

  it("chuỗi quá dài và số điện thoại sai dạng → 400", async () => {
    const long = await signup(post("http://localhost/api/v1/auth/signup", signupBody("c@vi-du.test", { organization_name: "x".repeat(500) }), "10.0.0.2"))
    expect(long.status).toBe(400)
    const phone = await instantTrial(post("http://localhost/api/v1/auth/instant-trial", { name: "Lan", phone: "abcdefghij", email: "p@vi-du.test" }, "10.0.0.2"))
    expect(phone.status).toBe(400)
  })

  it("đăng ký quá 20 lần/giờ từ một IP → 429", async () => {
    const statuses: number[] = []
    for (let i = 0; i < 21; i++) {
      statuses.push((await signup(post("http://localhost/api/v1/auth/signup", signupBody(`r${i}@vi-du.test`), "10.0.0.3"))).status)
    }
    expect(statuses.slice(0, 20).every((s) => s === 202)).toBe(true)
    expect(statuses[20]).toBe(429)
  }, 60_000) // 21 lần băm mật khẩu
})
