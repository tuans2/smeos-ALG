import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as signup } from "@/app/api/v1/auth/signup/route"
import { resolvePlanFromOrg } from "@/core/entitlements/entitlement-service"
import { prisma } from "@/core/tenancy/infra/prisma"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { readJson } from "../helpers/fixtures"

function signupRequest(email: string, organizationType: "SINGLE" | "CHAIN"): Request {
  return new Request("http://localhost/api/v1/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password: "mat-khau-du-dai",
      name: "Chủ chuỗi",
      organization_name: `Chuỗi thử ${email}`,
      organization_type: organizationType,
    }),
  })
}

/**
 * Chọn "Chuỗi" khi đăng ký từng trao ngay gói FLOWER_NETWORK, bỏ qua duyệt N2 (rà soát
 * 21/10/2026, H5). Giờ tổ chức luôn bắt đầu là 1 cửa hàng, kèm yêu cầu chờ duyệt.
 */
describe("đăng ký chọn mô hình Chuỗi", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("tạo tổ chức SINGLE kèm yêu cầu chuyển Chuỗi chờ duyệt, không có gói Chuỗi", async () => {
    const res = await signup(signupRequest("chuoi@vi-du.test", "CHAIN"))
    expect(res.status).toBe(202) // chờ superadmin duyệt (PO 22/10/2026)
    const body = await readJson(res)

    const org = await prisma.organizations.findUniqueOrThrow({ where: { id: body.organization_id as string } })
    expect(org.type).toBe("SINGLE")
    const pending = (org.settings as Record<string, Record<string, unknown>>).pending_model_change
    expect(pending?.requested_type).toBe("CHAIN")
    expect(pending?.requested_by).toBe(body.user_id)
    expect(resolvePlanFromOrg(null, org.type)).not.toBe("FLOWER_NETWORK")
  })

  it("chọn 1 cửa hàng: không có yêu cầu chờ duyệt", async () => {
    const res = await signup(signupRequest("mot-cua-hang@vi-du.test", "SINGLE"))
    const body = await readJson(res)
    const org = await prisma.organizations.findUniqueOrThrow({ where: { id: body.organization_id as string } })
    expect(org.type).toBe("SINGLE")
    expect((org.settings as Record<string, unknown>).pending_model_change).toBeUndefined()
  })
})
