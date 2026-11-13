import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { DELETE as revokeToken } from "@/app/api/v1/integration-tokens/[id]/route"
import { POST as rotateToken } from "@/app/api/v1/integration-tokens/[id]/rotate/route"
import { GET as listTokens, POST as issueToken } from "@/app/api/v1/integration-tokens/route"
import { GET as getIntegrationBrandProfile } from "@/app/api/v1/integration/brand-profile/route"
import { GET as getIntegrationBusinessProfile } from "@/app/api/v1/integration/business-profile/route"
import { POST as checkCapabilitiesRoute } from "@/app/api/v1/integration/capabilities/check/route"
import { POST as createIntegrationJob } from "@/app/api/v1/integration/jobs/route"
import { GET as getMasterImageRoute } from "@/app/api/v1/integration/products/[id]/master-image/route"
import { GET as listIntegrationProducts } from "@/app/api/v1/integration/products/route"
import { POST as recordIntegrationUsage } from "@/app/api/v1/integration/usage/route"
import { POST as createProduct } from "@/app/api/v1/products/route"
import { PUT as putBrandProfile } from "@/app/api/v1/brand-profile/route"
import { PUT as putBusinessProfile } from "@/app/api/v1/business-profile/route"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withBearer, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

/**
 * Cách ly tenant — Integration Layer (P7, `YC-T8`, đặc tả 06 mục 11 và đặc
 * tả 08). Hai lớp cần khoá riêng biệt:
 *
 *   1. Endpoint quản trị token (`F9`, cookie phiên người dùng) — cùng khuôn
 *      `cach-ly-endpoint.test.ts`: tổ chức B không đọc/sửa được token của A.
 *   2. Endpoint máy gọi máy (`Authorization: Bearer`, token đã cấp) — token
 *      của A không đọc được dữ liệu của B, và mỗi loại `client` chỉ đọc đúng
 *      phần bề mặt đặc tả 08 mục 4 cho phép.
 *
 * Người sáng lập (vai `dieu_hanh`) có sẵn `F9` theo mặc định
 * (`capability-catalog.ts`), nên `a.token`/`b.token` gọi thẳng được không
 * cần cấp quyền thêm.
 */
describe("cách ly tenant — Integration Layer (P7)", () => {
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

  it("POST /integration-tokens rồi GET /integration-tokens chỉ liệt kê token của chính tổ chức", async () => {
    const issued = await readJson(
      await issueToken(
        withSession(`${BASE}/integration-tokens`, a.token, {
          method: "POST",
          body: JSON.stringify({ client: "LOCALBUDD" }),
        })
      )
    )
    expect(typeof issued.token).toBe("string")

    const listOfA = await readJson(await listTokens(withSession(`${BASE}/integration-tokens`, a.token)))
    expect((listOfA.data as Array<{ id: string }>).map((row) => row.id)).toEqual([issued.id])

    const listOfB = await readJson(await listTokens(withSession(`${BASE}/integration-tokens`, b.token)))
    expect(listOfB.data).toEqual([])
  })

  it("DELETE /integration-tokens/:id của A trả 404 khi gọi bằng phiên của B", async () => {
    const issued = await readJson(
      await issueToken(
        withSession(`${BASE}/integration-tokens`, a.token, {
          method: "POST",
          body: JSON.stringify({ client: "SOCIALFLOW" }),
        })
      )
    )

    const revokedByOther = await revokeToken(
      withSession(`${BASE}/integration-tokens/${issued.id}`, b.token),
      { params: Promise.resolve({ id: issued.id as string }) }
    )
    expect(revokedByOther.status).toBe(404)

    const revokedByOwner = await revokeToken(
      withSession(`${BASE}/integration-tokens/${issued.id}`, a.token),
      { params: Promise.resolve({ id: issued.id as string }) }
    )
    expect(revokedByOwner.status).toBe(200)
  })

  it("token bị thu hồi hoặc hết hạn không dùng gọi lại được nữa (`YC-T8`)", async () => {
    const issued = await readJson(
      await issueToken(
        withSession(`${BASE}/integration-tokens`, a.token, {
          method: "POST",
          body: JSON.stringify({ client: "SOCIALFLOW" }),
        })
      )
    )
    const rawToken = issued.token as string
    const tokenId = issued.id as string

    const beforeRevoke = await getIntegrationBrandProfile(withBearer(`${BASE}/integration/brand-profile`, rawToken))
    expect(beforeRevoke.status).toBe(200)

    await revokeToken(withSession(`${BASE}/integration-tokens/${tokenId}`, a.token), {
      params: Promise.resolve({ id: tokenId }),
    })

    const afterRevoke = await getIntegrationBrandProfile(withBearer(`${BASE}/integration/brand-profile`, rawToken))
    expect(afterRevoke.status).toBe(401)
  })

  it("xoay token: token cũ vẫn dùng được song song với token mới cho tới khi bị thu hồi tay (đặc tả 08 mục 3)", async () => {
    const issued = await readJson(
      await issueToken(
        withSession(`${BASE}/integration-tokens`, a.token, {
          method: "POST",
          body: JSON.stringify({ client: "LOCALBUDD" }),
        })
      )
    )
    const oldToken = issued.token as string
    const oldId = issued.id as string

    const rotated = await readJson(
      await rotateToken(withSession(`${BASE}/integration-tokens/${oldId}/rotate`, a.token, { method: "POST" }), {
        params: Promise.resolve({ id: oldId }),
      })
    )
    const newToken = rotated.token as string
    expect(rotated.rotated_from_id).toBe(oldId)

    // Cả hai cùng dùng được — chưa ai bị thu hồi.
    expect((await getIntegrationBrandProfile(withBearer(`${BASE}/integration/brand-profile`, oldToken))).status).toBe(200)
    expect((await getIntegrationBrandProfile(withBearer(`${BASE}/integration/brand-profile`, newToken))).status).toBe(200)

    await revokeToken(withSession(`${BASE}/integration-tokens/${oldId}`, a.token), {
      params: Promise.resolve({ id: oldId }),
    })

    expect((await getIntegrationBrandProfile(withBearer(`${BASE}/integration/brand-profile`, oldToken))).status).toBe(401)
    expect((await getIntegrationBrandProfile(withBearer(`${BASE}/integration/brand-profile`, newToken))).status).toBe(200)
  })

  it("GET /integration/products chỉ trả sản phẩm ACTIVE của đúng tổ chức của token (đặc tả 08 mục 4)", async () => {
    await createProduct(
      withSession(`${BASE}/products`, a.token, {
        method: "POST",
        body: JSON.stringify({ code: "BHBB0001", name: "Bó hoa baby", status: "ACTIVE" }),
      })
    )
    await createProduct(
      withSession(`${BASE}/products`, a.token, {
        method: "POST",
        body: JSON.stringify({ code: "BHBB0002", name: "Bó hoa hồng nháp" }), // DRAFT mặc định
      })
    )
    await createProduct(
      withSession(`${BASE}/products`, b.token, {
        method: "POST",
        body: JSON.stringify({ code: "BHBB0001", name: "Sản phẩm của B", status: "ACTIVE" }),
      })
    )

    const issued = await readJson(
      await issueToken(
        withSession(`${BASE}/integration-tokens`, a.token, {
          method: "POST",
          body: JSON.stringify({ client: "LOCALBUDD" }),
        })
      )
    )

    const result = await readJson(
      await listIntegrationProducts(withBearer(`${BASE}/integration/products`, issued.token as string))
    )
    const codes = (result.data as Array<{ code: string }>).map((row) => row.code)
    expect(codes).toEqual(["BHBB0001"]) // chỉ bản ACTIVE của A, không có bản DRAFT, không có sản phẩm của B
  })

  it("GET /integration/business-profile chỉ token LOCALBUDD đọc được, SOCIALFLOW bị chặn (đặc tả 08 mục 4)", async () => {
    await putBusinessProfile(
      withSession(`${BASE}/business-profile`, a.token, {
        method: "PUT",
        body: JSON.stringify({ display_name: "Tiệm hoa Alpha" }),
      })
    )

    const localbudd = await readJson(
      await issueToken(
        withSession(`${BASE}/integration-tokens`, a.token, {
          method: "POST",
          body: JSON.stringify({ client: "LOCALBUDD" }),
        })
      )
    )
    const socialflow = await readJson(
      await issueToken(
        withSession(`${BASE}/integration-tokens`, a.token, {
          method: "POST",
          body: JSON.stringify({ client: "SOCIALFLOW" }),
        })
      )
    )

    const okResponse = await getIntegrationBusinessProfile(
      withBearer(`${BASE}/integration/business-profile`, localbudd.token as string)
    )
    expect(okResponse.status).toBe(200)
    expect((await readJson(okResponse)).display_name).toBe("Tiệm hoa Alpha")

    const deniedResponse = await getIntegrationBusinessProfile(
      withBearer(`${BASE}/integration/business-profile`, socialflow.token as string)
    )
    expect(deniedResponse.status).toBe(403)
  })

  it("GET /integration/brand-profile đọc được bằng CẢ HAI loại token (đặc tả 08 mục 4)", async () => {
    await putBrandProfile(
      withSession(`${BASE}/brand-profile`, a.token, {
        method: "PUT",
        body: JSON.stringify({ primary_color: "#1A73E8", tone_of_voice: "ấm, gần gũi" }),
      })
    )

    const localbudd = await readJson(
      await issueToken(
        withSession(`${BASE}/integration-tokens`, a.token, {
          method: "POST",
          body: JSON.stringify({ client: "LOCALBUDD" }),
        })
      )
    )
    const socialflow = await readJson(
      await issueToken(
        withSession(`${BASE}/integration-tokens`, a.token, {
          method: "POST",
          body: JSON.stringify({ client: "SOCIALFLOW" }),
        })
      )
    )

    // Khác `business-profile` (chỉ LOCALBUDD): bộ nhận diện thương hiệu là
    // thứ SocialFlow cần để dựng nội dung, nên cả hai engine đều đọc được.
    // `brand_profiles` KHÔNG có `display_name` — tên hiển thị nằm ở
    // `business_profiles`; ở đây danh tính là màu/font/tông giọng.
    for (const token of [localbudd.token as string, socialflow.token as string]) {
      const response = await getIntegrationBrandProfile(
        withBearer(`${BASE}/integration/brand-profile`, token)
      )
      expect(response.status).toBe(200)
      const body = await readJson(response)
      expect(body.primary_color).toBe("#1A73E8")
      expect(body.tone_of_voice).toBe("ấm, gần gũi")
    }

    // Token của tổ chức B không bao giờ thấy hồ sơ của A (`YC-T4`). B chưa
    // nhập hồ sơ thương hiệu nào nên `getBrandProfile` trả `null` — điều cần
    // khoá là B KHÔNG đọc ra màu của A, không phải mã lỗi cụ thể.
    const foreign = await readJson(
      await issueToken(
        withSession(`${BASE}/integration-tokens`, b.token, {
          method: "POST",
          body: JSON.stringify({ client: "LOCALBUDD" }),
        })
      )
    )
    const foreignResponse = await getIntegrationBrandProfile(
      withBearer(`${BASE}/integration/brand-profile`, foreign.token as string)
    )
    expect(foreignResponse.status).toBe(200)
    expect(await foreignResponse.json()).toBeNull()
  })

  it("GET /integration/products/:id/master-image trả 404 khi chưa có Master Image APPROVED (nợ #30) và khi sản phẩm thuộc tổ chức khác", async () => {
    const created = await readJson(
      await createProduct(
        withSession(`${BASE}/products`, a.token, {
          method: "POST",
          body: JSON.stringify({ code: "BHBB0001", name: "Bó hoa baby", status: "ACTIVE" }),
        })
      )
    )
    const issued = await readJson(
      await issueToken(
        withSession(`${BASE}/integration-tokens`, a.token, {
          method: "POST",
          body: JSON.stringify({ client: "LOCALBUDD" }),
        })
      )
    )
    const token = issued.token as string

    const noMaster = await getMasterImageRoute(
      withBearer(`${BASE}/integration/products/${created.id}/master-image`, token),
      { params: Promise.resolve({ id: created.id as string }) }
    )
    expect(noMaster.status).toBe(404)

    const createdByB = await readJson(
      await createProduct(
        withSession(`${BASE}/products`, b.token, {
          method: "POST",
          body: JSON.stringify({ code: "BHBB0001", name: "Sản phẩm của B", status: "ACTIVE" }),
        })
      )
    )
    const crossTenant = await getMasterImageRoute(
      withBearer(`${BASE}/integration/products/${createdByB.id}/master-image`, token),
      { params: Promise.resolve({ id: createdByB.id as string }) }
    )
    expect(crossTenant.status).toBe(404)
  })

  it("POST /integration/capabilities/check trả false hết cho user_id thuộc tổ chức khác, không rò rỉ (`YC-T4`)", async () => {
    const issued = await readJson(
      await issueToken(
        withSession(`${BASE}/integration-tokens`, a.token, {
          method: "POST",
          body: JSON.stringify({ client: "SOCIALFLOW" }),
        })
      )
    )

    const ownUser = await readJson(
      await checkCapabilitiesRoute(
        withBearer(`${BASE}/integration/capabilities/check`, issued.token as string, {
          method: "POST",
          body: JSON.stringify({ user_id: a.userId, capability_codes: ["F9", "L1"] }),
        })
      )
    )
    expect(ownUser.granted).toEqual({ F9: true, L1: true })

    const foreignUser = await readJson(
      await checkCapabilitiesRoute(
        withBearer(`${BASE}/integration/capabilities/check`, issued.token as string, {
          method: "POST",
          body: JSON.stringify({ user_id: b.userId, capability_codes: ["F9", "L1"] }),
        })
      )
    )
    expect(foreignUser.granted).toEqual({ F9: false, L1: false })
  })

  it("POST /integration/jobs tạo job trong đúng tổ chức của token, POST /integration/usage ghi được usage ngoài", async () => {
    const issued = await readJson(
      await issueToken(
        withSession(`${BASE}/integration-tokens`, a.token, {
          method: "POST",
          body: JSON.stringify({ client: "LOCALBUDD" }),
        })
      )
    )
    const token = issued.token as string

    const jobResponse = await createIntegrationJob(
      withBearer(`${BASE}/integration/jobs`, token, {
        method: "POST",
        body: JSON.stringify({
          feature: "landing.create",
          payload: { page: "trang-chu" },
          idempotency_key: "integration-test-1",
        }),
      })
    )
    expect(jobResponse.status).toBe(201)
    const job = (await readJson(jobResponse)).job as { id: string; organization_id: string }
    expect(job.organization_id).toBe(a.organizationId)

    const usageResponse = await recordIntegrationUsage(
      withBearer(`${BASE}/integration/usage`, token, {
        method: "POST",
        body: JSON.stringify({ feature: "landing.create", status: "COMPLETED", cost_usd: 0.02, job_id: job.id }),
      })
    )
    expect(usageResponse.status).toBe(201)
    const usageRow = await readJson(usageResponse)
    expect(usageRow.cost_credit).toBe(0) // ghi ngoài không trừ credit lần hai
    expect(usageRow.status).toBe("COMPLETED")
  })
})
