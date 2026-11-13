import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as instantTrial } from "@/app/api/v1/auth/instant-trial/route"
import { POST as login } from "@/app/api/v1/auth/login/route"
import { GET as me } from "@/app/api/v1/auth/me/route"
import { POST as signup } from "@/app/api/v1/auth/signup/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1/auth"

function json(url: string, body: unknown): Request {
  return new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
}

const signupBody = { email: "moi@vi-du.test", password: "mat-khau-du-dai", name: "Khách mới", organization_name: "Tiệm mới" }

/** Mọi đăng ký công khai chờ superadmin duyệt trước khi đăng nhập được (PO 22/10/2026). */
describe("đăng ký công khai chờ duyệt", () => {
  beforeEach(async () => {
    await resetDatabase()
    await createTenant("co-san") // vai hệ thống
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("đăng ký: 202 chờ duyệt, không cookie, không phiên, tài khoản PENDING", async () => {
    const res = await signup(json(`${BASE}/signup`, signupBody))
    expect(res.status).toBe(202)
    expect(res.headers.get("set-cookie")).toBeNull()
    const body = await readJson(res)
    expect(body.status).toBe("PENDING_APPROVAL")
    const user = await prisma.users.findUniqueOrThrow({ where: { email: "moi@vi-du.test" } })
    expect(user.approval_status).toBe("PENDING")
    expect(await prisma.sessions.count({ where: { user_id: user.id } })).toBe(0)
  })

  it("chờ duyệt: đúng mật khẩu → 403 báo chờ duyệt; sai mật khẩu → 401 như mọi khi (không lộ trạng thái)", async () => {
    await signup(json(`${BASE}/signup`, signupBody))
    const ok = await login(json(`${BASE}/login`, { email: signupBody.email, password: signupBody.password }))
    expect(ok.status).toBe(403)
    expect(((await readJson(ok)).error as { message: string }).message).toMatch(/chờ quản trị viên duyệt/)
    expect(ok.headers.get("set-cookie")).toBeNull()

    const wrong = await login(json(`${BASE}/login`, { email: signupBody.email, password: "sai-mat-khau-roi" }))
    expect(wrong.status).toBe(401)
  })

  it("dùng thử: 202 chờ duyệt, không cookie, tài khoản PENDING", async () => {
    const res = await instantTrial(json(`${BASE}/instant-trial`, { name: "Khách thử", phone: "0901234567", email: "thu@vi-du.test" }))
    expect(res.status).toBe(202)
    expect(res.headers.get("set-cookie")).toBeNull()
    expect((await prisma.users.findUniqueOrThrow({ where: { email: "thu@vi-du.test" } })).approval_status).toBe("PENDING")
  })

  it("phiên đang mở của tài khoản bị chuyển về chờ duyệt / bị từ chối không dùng được nữa", async () => {
    const t = await createTenant("dang-dung")
    expect((await me(withSession(`${BASE}/me`, t.token))).status).toBe(200)
    await prisma.users.update({ where: { id: t.userId }, data: { approval_status: "REJECTED" } })
    expect((await me(withSession(`${BASE}/me`, t.token))).status).toBe(401)
  })
})
