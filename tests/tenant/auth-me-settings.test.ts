import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as me } from "@/app/api/v1/auth/me/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, withSession } from "../helpers/fixtures"

/**
 * `GET /auth/me` từng trả nguyên `organizations.settings` cho mọi thành viên — kể cả vai Sale:
 * SĐT và chat id của Điều phối, chính sách phí gia công (rà soát lại cụm A, 23/10/2026).
 */
describe("GET /auth/me chỉ trả phần cấu hình giao diện cần", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("nhân viên Sale thấy ngành, không thấy cấu hình nội bộ của tiệm", async () => {
    const shop = await createTenant("alpha")
    await prisma.organizations.update({
      where: { id: shop.organizationId },
      data: {
        industry_key: "FASHION", // ADR-012 T-6c-2: ngành chỉ ở cột
        settings: {
          industry_locked: true,
          coordinator_channel: { telegramChatId: "123456", phone: "0901234567" },
          craft_fee_policy: { method: "TIERED" },
        },
      },
    })
    const staff = await addStaffWithSession(shop, "sale", "sale")

    const res = await me(withSession("http://localhost/api/v1/auth/me", staff.token))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { organization: Record<string, unknown> }
    expect(body.organization).toMatchObject({ industry: "FASHION", industry_locked: true, pending_model_change: null })
    expect(body.organization).not.toHaveProperty("settings")
    expect(JSON.stringify(body)).not.toMatch(/0901234567|123456|TIERED/)
  })
})
