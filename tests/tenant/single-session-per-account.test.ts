import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as me } from "@/app/api/v1/auth/me/route"
import { GET as sessionStatus } from "@/app/api/v1/auth/session-status/route"
import { POST as logout } from "@/app/api/v1/auth/logout/route"
import { logIn } from "@/modules/organization/use-cases/log-in"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"
const PASSWORD = "mat-khau-du-dai"

/** Một tài khoản chỉ một phiên: người đăng nhập sau thắng, thiết bị cũ được báo lý do. */
describe("mỗi tài khoản chỉ một phiên đăng nhập", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("đăng nhập lần mới thu hồi phiên cũ và phiên cũ nhận lý do SESSION_SUPERSEDED", async () => {
    const second = await logIn({ email: "alpha@vi-du.test", password: PASSWORD })

    const old = await me(withSession(`${BASE}/auth/me`, a.token))
    expect(old.status).toBe(401)
    const body = await readJson(old)
    expect((body.error as { details?: { reason?: string } }).details?.reason).toBe("SESSION_SUPERSEDED")

    const status = await sessionStatus(withSession(`${BASE}/auth/session-status`, a.token))
    expect(status.status).toBe(401)

    expect((await me(withSession(`${BASE}/auth/me`, second.token))).status).toBe(200)
    expect((await sessionStatus(withSession(`${BASE}/auth/session-status`, second.token))).status).toBe(200)
  })

  it("không đụng tới phiên của tài khoản khác", async () => {
    await logIn({ email: "alpha@vi-du.test", password: PASSWORD })
    expect((await me(withSession(`${BASE}/auth/me`, b.token))).status).toBe(200)
  })

  it("phiên tự đăng xuất không bị báo là đăng nhập nơi khác", async () => {
    await logout(withSession(`${BASE}/auth/logout`, a.token, { method: "POST" }))
    await logIn({ email: "alpha@vi-du.test", password: PASSWORD })

    const old = await me(withSession(`${BASE}/auth/me`, a.token))
    expect(old.status).toBe(401)
    const body = await readJson(old)
    expect((body.error as { details?: unknown }).details).toBeUndefined()
  })
})
