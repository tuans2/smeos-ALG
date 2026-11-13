import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

import { GET as getOrganizations } from "@/app/api/v1/platform/organizations/route"
import { SESSION_COOKIE } from "@/core/http/cookies"
import { prisma } from "@/core/tenancy/infra/prisma"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

const URL_ORGS = "http://localhost/api/v1/platform/organizations"

/**
 * P0-04 (ARC-003): quyền console nền tảng CHỈ đến từ `platform_operators`, ở mọi môi trường.
 * Trước đây khi `NODE_ENV !== "production"`, email đuôi `@dev.com` hoặc cookie `smeos_dev_role`
 * tự có mã N — người lạ đăng ký trên môi trường thử là vào được console xuyên tổ chức.
 */
describe("không còn cửa hậu console nền tảng ngoài production (P0-04)", () => {
  let nguoiLa: Tenant

  beforeEach(async () => {
    await resetDatabase()
    nguoiLa = await createTenant("cua-hau")
    vi.stubEnv("NODE_ENV", "development")
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await disconnectDatabase()
  })

  it("email đuôi @dev.com không phải người vận hành → 403", async () => {
    await prisma.users.update({ where: { id: nguoiLa.userId }, data: { email: "nguoi-la@dev.com" } })
    const res = await getOrganizations(withSession(URL_ORGS, nguoiLa.token))
    expect(res.status).toBe(403)
  })

  it("cookie smeos_dev_role tự khai platform_admin → 403", async () => {
    const devCookie = encodeURIComponent(JSON.stringify({ roleKey: "platform_admin", organizationType: "PLATFORM" }))
    const cookie = `${SESSION_COOKIE}=${encodeURIComponent(nguoiLa.token)}; smeos_dev_role=${devCookie}`
    const res = await getOrganizations(new Request(URL_ORGS, { headers: { cookie } }))
    expect(res.status).toBe(403)
  })
})
