import { randomUUID } from "node:crypto"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as logIn } from "@/app/api/v1/auth/login/route"
import { POST as createOrder } from "@/app/api/v1/orders/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/**
 * ARC-022 (PO D-25, 11/11/2026): trên route thật, lệnh ghi có cookie phiên và đăng nhập gửi từ origin khác → 403
 * `CROSS_ORIGIN_REJECTED`, không ghi gì. Ngoài production, `ORIGIN_CHECK_MODE` mặc định `enforce`.
 */
const BASE = "http://localhost/api/v1"
const body = JSON.stringify({ items: [{ description: "Bó hồng", quantity: 1, unitPriceVnd: 500_000 }] })

describe("kiểm Origin cho lệnh ghi", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("origin")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const post = (headers: Record<string, string>) => createOrder(withSession(`${BASE}/orders`, a.token, { method: "POST", body, headers }))
  const count = () => prisma.orders.count({ where: { organization_id: a.organizationId } })

  it("tạo đơn từ origin lạ hoặc Sec-Fetch-Site cross-site/same-site → 403, không tạo đơn", async () => {
    for (const headers of [{ origin: "https://evil.example" }, { origin: "https://khac.localhost" }, { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "same-site" }]) {
      const res = await post(headers)
      expect(res.status).toBe(403)
      expect((await res.json()).error.code).toBe("CROSS_ORIGIN_REJECTED")
    }
    expect(await count()).toBe(0)
  })

  it("cùng origin, Sec-Fetch-Site same-origin, hoặc máy gọi máy (không header) → tạo đơn như cũ", async () => {
    expect((await post({ origin: "http://localhost" })).status).toBe(201)
    expect((await post({ "sec-fetch-site": "same-origin" })).status).toBe(201)
    expect((await post({})).status).toBe(201)
    expect(await count()).toBe(3)
  })

  it("đăng nhập từ origin lạ → 403 trước khi xét mật khẩu, không mở phiên (login CSRF)", async () => {
    const sessionsBefore = await prisma.sessions.count()
    // Mật khẩu sinh lúc chạy (không viết cứng): qua được bộ kiểm thì sẽ là 401 sai mật khẩu, nên 403 chứng minh
    // request bị chặn ở bước kiểm Origin
    const login = (origin: string) => logIn(new Request(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ email: "origin@vi-du.test", password: randomUUID() }),
    }))
    expect((await login("http://localhost")).status).toBe(401)
    const res = await login("https://evil.example")
    expect(res.status).toBe(403)
    expect((await res.json()).error.code).toBe("CROSS_ORIGIN_REJECTED")
    expect(res.headers.getSetCookie()).toEqual([])
    expect(await prisma.sessions.count()).toBe(sessionsBefore)
  })
})
