import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as login } from "@/app/api/v1/auth/login/route"
import { POST as instantTrial } from "@/app/api/v1/auth/instant-trial/route"
import { POST as signup } from "@/app/api/v1/auth/signup/route"
import { POST as decide } from "@/app/api/v1/platform/registrations/[userId]/decision/route"
import { GET as listPending } from "@/app/api/v1/platform/registrations/route"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

function json(url: string, body: unknown): Request {
  return new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
}

function decision(token: string, userId: string, value: "APPROVE" | "REJECT"): Promise<Response> {
  return decide(withSession(`${BASE}/platform/registrations/${userId}/decision`, token, { method: "POST", body: JSON.stringify({ decision: value }) }), {
    params: Promise.resolve({ userId }),
  })
}

/** Superadmin (N13) duyệt đăng ký công khai (PO 22/10/2026). */
describe("superadmin duyệt tài khoản tự đăng ký", () => {
  let admin: Tenant
  let pendingId: string
  let trialId: string

  beforeEach(async () => {
    await resetDatabase()
    admin = await createTenant("superadmin")
    await new PlatformOperatorRepository().grant(admin.userId, ["N13"], null)
    pendingId = (await readJson(await signup(json(`${BASE}/auth/signup`, {
      email: "moi@vi-du.test", password: "mat-khau-du-dai", organization_name: "Tiệm mới",
    })))).user_id as string
    trialId = (await readJson(await instantTrial(json(`${BASE}/auth/instant-trial`, {
      name: "Khách thử", phone: "0901234567", email: "thu@vi-du.test",
    })))).user_id as string
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("không có N13 → 403 cả xem lẫn duyệt; tài khoản vẫn chờ", async () => {
    const shop = await createTenant("chu-tiem")
    expect((await listPending(withSession(`${BASE}/platform/registrations`, shop.token))).status).toBe(403)
    expect((await decision(shop.token, pendingId, "APPROVE")).status).toBe(403)
    expect((await prisma.users.findUniqueOrThrow({ where: { id: pendingId } })).approval_status).toBe("PENDING")
  })

  it("N13 thấy hàng chờ; duyệt đăng ký thường → đăng nhập được bằng mật khẩu đã đặt, có nhật ký", async () => {
    const list = (await readJson(await listPending(withSession(`${BASE}/platform/registrations`, admin.token)))).data as Array<{ userId: string; instantTrial: boolean }>
    expect(list.map((r) => [r.userId, r.instantTrial])).toEqual([[pendingId, false], [trialId, true]])

    const res = await decision(admin.token, pendingId, "APPROVE")
    expect(res.status).toBe(200)
    expect(((await readJson(res)).data as Record<string, unknown>).temporaryPassword).toBeUndefined()
    const user = await prisma.users.findUniqueOrThrow({ where: { id: pendingId } })
    expect([user.approval_status, user.approval_decided_by]).toEqual(["APPROVED", admin.userId])
    expect((await login(json(`${BASE}/auth/login`, { email: "moi@vi-du.test", password: "mat-khau-du-dai" }))).status).toBe(200)

    const audit = await prisma.platform_audit_logs.findFirstOrThrow({ where: { entity_id: pendingId } })
    expect(audit.action).toBe("platform.registration.approve")
  })

  it("duyệt dùng thử → mật khẩu tạm một lần, đăng nhập được; nhật ký không chứa mật khẩu", async () => {
    const data = (await readJson(await decision(admin.token, trialId, "APPROVE"))).data as { temporaryPassword: string }
    expect(data.temporaryPassword.length).toBeGreaterThanOrEqual(12)
    expect((await login(json(`${BASE}/auth/login`, { email: "thu@vi-du.test", password: data.temporaryPassword }))).status).toBe(200)
    const audit = await prisma.platform_audit_logs.findFirstOrThrow({ where: { entity_id: trialId } })
    expect(JSON.stringify(audit)).not.toContain(data.temporaryPassword)
  })

  it("từ chối → không đăng nhập được; quyết lần hai → 409; không có tài khoản → 404", async () => {
    expect((await decision(admin.token, pendingId, "REJECT")).status).toBe(200)
    const res = await login(json(`${BASE}/auth/login`, { email: "moi@vi-du.test", password: "mat-khau-du-dai" }))
    expect(res.status).toBe(403)
    expect((await decision(admin.token, pendingId, "APPROVE")).status).toBe(409)
    expect((await decision(admin.token, "khong-co-ai", "APPROVE")).status).toBe(404)
  })
})
