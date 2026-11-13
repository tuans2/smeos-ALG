import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as instantTrial } from "@/app/api/v1/auth/instant-trial/route"
import { prisma } from "@/core/tenancy/infra/prisma"

import { approveAndLogIn } from "../helpers/approval"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, type Tenant } from "../helpers/fixtures"

const URL = "http://localhost/api/v1/auth/instant-trial"

function trialRequest(email: string): Request {
  return new Request(URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Khách dùng thử", phone: "0901234567", email, industry_key: "FLORAL" }),
  })
}

/**
 * Dùng thử không có mật khẩu: nếu luồng này gắn phiên vào tài khoản có sẵn thì ai
 * biết email của chủ tiệm cũng vào được tiệm thật của họ (rà soát 21/10/2026, C1).
 */
describe("dùng thử tức thì không chiếm được tài khoản có sẵn", () => {
  let owner: Tenant

  beforeEach(async () => {
    await resetDatabase()
    owner = await createTenant("alpha")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("email đã có tài khoản: 409, không phát cookie, không tạo phiên", async () => {
    const sessionsBefore = await prisma.sessions.count({ where: { user_id: owner.userId } })

    const res = await instantTrial(trialRequest("alpha@vi-du.test"))

    expect(res.status).toBe(409)
    expect(res.headers.get("set-cookie")).toBeNull()
    expect(await prisma.sessions.count({ where: { user_id: owner.userId } })).toBe(sessionsBefore)
    expect(await prisma.memberships.count({ where: { user_id: owner.userId } })).toBe(1)
  })

  it("email mới: tạo người dùng mới chờ duyệt (không phiên); duyệt xong phiên chỉ thấy tổ chức dùng thử", async () => {
    const res = await instantTrial(trialRequest("khach-moi@vi-du.test"))
    expect(res.status).toBe(202)
    expect(res.headers.get("set-cookie")).toBeNull()
    const body = await readJson(res)
    expect(await prisma.sessions.count({ where: { user_id: body.user_id as string } })).toBe(0)
    await approveAndLogIn(body.user_id as string, "khach-moi@vi-du.test")

    expect(body.user_id).not.toBe(owner.userId)
    expect(body.organization_id).not.toBe(owner.organizationId)
    const memberships = await prisma.memberships.findMany({ where: { user_id: body.user_id as string } })
    expect(memberships.map((m) => m.organization_id)).toEqual([body.organization_id])
  })
})
