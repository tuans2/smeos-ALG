import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getOrganizations } from "@/app/api/v1/platform/organizations/route"
import { GET as getHealth } from "@/app/api/v1/platform/health/route"
import { POST as createOrder } from "@/app/api/v1/orders/route"
import { GET as getOrderById } from "@/app/api/v1/orders/[id]/route"

import { ALL_PLATFORM_CAPABILITY_CODES } from "@/core/platform/platform-capability-catalog"
import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

/**
 * Ca thử cách ly cho P25a (kế hoạch mục 5.1) — bốn ca bắt buộc trước khi
 * coi console vận hành nền tảng là xong: một người dùng thường không vào
 * được, một người vận hành không có "quyền tenant" nào tự nhiên sinh ra,
 * người vận hành thiếu đúng mã N thì bị chặn đúng route đó, và người vận
 * hành đủ quyền thật sự đọc được dữ liệu XUYÊN hai tổ chức trong một lời
 * gọi — chứng minh `platform-query.ts` hoạt động, không chỉ chứng minh nó
 * bị khoá.
 */
describe("cách ly Console Vận hành Nền tảng (P25a)", () => {
  let a: Tenant
  let b: Tenant
  let nguoiVanHanh: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("plat-a")
    b = await createTenant("plat-b")
    nguoiVanHanh = await createTenant("plat-nguoi-van-hanh")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("ca 0 — chưa đăng nhập → 401 UNAUTHENTICATED, không phải 403", async () => {
    const res = await getOrganizations(new Request(`${BASE}/platform/organizations`))
    expect(res.status).toBe(401)
  })

  it("ca 1 — có phiên tenant hợp lệ nhưng không phải người vận hành → 403 CAPABILITY_DENIED, không phải 401", async () => {
    const res = await getOrganizations(withSession(`${BASE}/platform/organizations`, a.token))
    expect(res.status).toBe(403)
    const body = (await readJson(res)) as { error: { code: string } }
    expect(body.error.code).toBe("CAPABILITY_DENIED")
  })

  it("ca 2 — là người vận hành nền tảng KHÔNG cấp thêm quyền tenant nào: đọc đơn hàng của tổ chức khác vẫn 404, giống người ngoài", async () => {
    await new PlatformOperatorRepository().grant(nguoiVanHanh.userId, [...ALL_PLATFORM_CAPABILITY_CODES], null)

    const created = (await readJson(
      await createOrder(
        withSession(`${BASE}/orders`, a.token, {
          method: "POST",
          body: JSON.stringify({
            items: [{ description: "Bó hoa hướng dương", quantity: 1, unitPriceVnd: 300000 }],
          }),
        })
      )
    )) as { order: { id: string } }

    const res = await getOrderById(withSession(`${BASE}/orders/${created.order.id}`, nguoiVanHanh.token), {
      params: Promise.resolve({ id: created.order.id }),
    })
    expect(res.status).toBe(404)
  })

  it("ca 3 — người vận hành có N1 nhưng thiếu N5 → 403 đúng ở route cần N5", async () => {
    await new PlatformOperatorRepository().grant(nguoiVanHanh.userId, ["N1"], null)

    const okRoute = await getOrganizations(withSession(`${BASE}/platform/organizations`, nguoiVanHanh.token))
    expect(okRoute.status).toBe(200)

    const chanRoute = await getHealth(withSession(`${BASE}/platform/health`, nguoiVanHanh.token))
    expect(chanRoute.status).toBe(403)
    const body = (await readJson(chanRoute)) as { error: { code: string } }
    expect(body.error.code).toBe("CAPABILITY_DENIED")
  })

  it("ca 4 — người vận hành đủ quyền đọc được tổ chức A và B trong CÙNG một lời gọi", async () => {
    await new PlatformOperatorRepository().grant(nguoiVanHanh.userId, [...ALL_PLATFORM_CAPABILITY_CODES], null)

    const res = await getOrganizations(withSession(`${BASE}/platform/organizations`, nguoiVanHanh.token))
    expect(res.status).toBe(200)
    const body = (await readJson(res)) as { data: Array<{ id: string }> }
    const ids = body.data.map((org) => org.id)
    expect(ids).toContain(a.organizationId)
    expect(ids).toContain(b.organizationId)
  })
})
