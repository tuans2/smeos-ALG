import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as instantTrial } from "@/app/api/v1/auth/instant-trial/route"
import { POST as applyMockData } from "@/app/api/v1/business-profile/mock-data/route"
import { SESSION_COOKIE } from "@/core/http/cookies"

import { approveAndLogIn } from "../helpers/approval"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession } from "../helpers/fixtures"

const URL = "http://localhost/api/v1/business-profile/mock-data"

/**
 * "Nạp dữ liệu mẫu" ghi đè hồ sơ, đổi ngành và thay sản phẩm mẫu — PO 21/10/2026: chỉ tài
 * khoản dùng thử (rà soát H9).
 */
describe("nạp dữ liệu mẫu chỉ ở tài khoản dùng thử", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("tiệm thật (SINGLE): 403, ngành và sản phẩm không đổi", async () => {
    const shop = await createTenant("tiem-that")
    const res = await applyMockData(withSession(URL, shop.token, { method: "POST", body: JSON.stringify({ industry_key: "FNB" }) }))
    expect(res.status).toBe(403)

    const org = await prisma.organizations.findUniqueOrThrow({ where: { id: shop.organizationId } })
    expect(org.industry_key).not.toBe("FNB") // T-6c-1: ngành nằm ở cột industry_key
    expect(await prisma.products.count({ where: { organization_id: shop.organizationId } })).toBe(0)
  })

  it("tài khoản dùng thử (EXPERIENCE): nạp được", async () => {
    const trial = await instantTrial(new Request("http://localhost/api/v1/auth/instant-trial", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Khách thử", phone: "0901234567", email: "thu@vi-du.test", industry_key: "FLORAL" }),
    }))
    // Dùng thử chờ duyệt (PO 22/10/2026): duyệt rồi đăng nhập bằng mật khẩu tạm
    const created = (await trial.json()) as { user_id: string; organization_id: string }
    const token = await approveAndLogIn(created.user_id, "thu@vi-du.test")

    const res = await applyMockData(new Request(URL, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `${SESSION_COOKIE}=${token}` },
      body: JSON.stringify({}),
    }))
    expect(res.status).toBe(200)

    const bad = await applyMockData(new Request(URL, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `${SESSION_COOKIE}=${token}` },
      body: JSON.stringify({ industry_key: "KHONG_CO" }),
    }))
    expect(bad.status).toBe(400)
    const org = await prisma.organizations.findUniqueOrThrow({ where: { id: created.organization_id } })
    expect(org.industry_key).toBe("FLORAL") // T-6c-1: ngành nằm ở cột industry_key
  })
})
