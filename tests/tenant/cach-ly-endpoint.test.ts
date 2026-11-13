import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as authMe } from "@/app/api/v1/auth/me/route"
import { GET as getBrandProfile, PUT as putBrandProfile } from "@/app/api/v1/brand-profile/route"
import {
  GET as getBusinessProfile,
  PUT as putBusinessProfile,
} from "@/app/api/v1/business-profile/route"
import { GET as listOrganizations } from "@/app/api/v1/organizations/route"
import { POST as switchOrganization } from "@/app/api/v1/session/organization/route"
import { defaultCodesForSystemRole } from "@/core/rbac/capability-catalog"
import { FOUNDER_ROLE_KEY } from "@/modules/organization/domain/system-roles"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

/**
 * Cùng phép thử ở mức endpoint (`YC-T10`): gọi endpoint bằng ngữ cảnh phiên của
 * tổ chức khác và soi kết quả.
 *
 * `POST /session/organization` là endpoint duy nhất của P1 nhận một mã tổ chức
 * từ client, nên nó là chỗ duy nhất phép thử "404 chứ không 403" có ý nghĩa —
 * và cũng là chỗ dễ sai nhất.
 */
describe("cách ly tenant ở tầng endpoint", () => {
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

  it("GET /auth/me chỉ trả tổ chức của chính phiên", async () => {
    const response = await authMe(withSession(`${BASE}/auth/me`, b.token))
    expect(response.status).toBe(200)

    const body = await readJson(response)
    const organization = body.organization as { id: string }
    expect(organization.id).toBe(b.organizationId)
    expect(organization.id).not.toBe(a.organizationId)
  })

  it("GET /auth/me trả đúng năng lực mặc định của vai điều hành — không rỗng, không lẫn tổ chức khác", async () => {
    // P1 khoá hành vi "luôn rỗng" vì chưa có role_capabilities. P2 nạp bảng
    // này ngay lúc ensureSystemRoles(), nên người sáng lập (vai dieu_hanh)
    // có năng lực ngay khi đăng ký — test này khoá lại hành vi mới đó, so
    // với đúng nguồn sự thật (defaultCodesForSystemRole), không phải danh
    // sách chép tay dễ lệch.
    const body = await readJson(await authMe(withSession(`${BASE}/auth/me`, a.token)))
    const expected = defaultCodesForSystemRole(FOUNDER_ROLE_KEY).sort()
    expect(body.capabilities).toEqual(expected)
  })

  it("GET /organizations chỉ liệt kê tổ chức người gọi là thành viên", async () => {
    const body = await readJson(
      await listOrganizations(withSession(`${BASE}/organizations`, a.token))
    )
    const data = body.data as Array<{ id: string }>
    expect(data.map((row) => row.id)).toEqual([a.organizationId])
  })

  it("POST /session/organization sang tổ chức của người khác trả 404, không trả 403", async () => {
    const response = await switchOrganization(
      withSession(`${BASE}/session/organization`, b.token, {
        method: "POST",
        body: JSON.stringify({ organization_id: a.organizationId }),
      })
    )

    expect(response.status).toBe(404)
    const body = await readJson(response)
    expect((body.error as { code: string }).code).toBe("NOT_FOUND")
  })

  it("POST /session/organization với mã tổ chức không tồn tại trả cùng một đáp ứng", async () => {
    const khongTonTai = await switchOrganization(
      withSession(`${BASE}/session/organization`, b.token, {
        method: "POST",
        body: JSON.stringify({ organization_id: "khong-co-that" }),
      })
    )
    const cuaNguoiKhac = await switchOrganization(
      withSession(`${BASE}/session/organization`, b.token, {
        method: "POST",
        body: JSON.stringify({ organization_id: a.organizationId }),
      })
    )

    expect(khongTonTai.status).toBe(cuaNguoiKhac.status)
    expect(await readJson(khongTonTai)).toEqual(await readJson(cuaNguoiKhac))
  })

  it("POST /session/organization sang tổ chức của chính mình vẫn chạy", async () => {
    const response = await switchOrganization(
      withSession(`${BASE}/session/organization`, a.token, {
        method: "POST",
        body: JSON.stringify({ organization_id: a.organizationId }),
      })
    )
    expect(response.status).toBe(200)
  })

  it("không có phiên thì không endpoint nào trả dữ liệu", async () => {
    const withoutCookie = new Request(`${BASE}/auth/me`)
    const response = await authMe(withoutCookie)
    expect(response.status).toBe(401)
    expect((((await readJson(response)).error as { code: string })).code).toBe(
      "UNAUTHENTICATED"
    )
  })

  it("token giả không mở được phiên nào", async () => {
    const response = await authMe(withSession(`${BASE}/auth/me`, "token-bia-ra"))
    expect(response.status).toBe(401)
  })

  it("PUT /business-profile rồi GET chỉ đọc lại được bằng chính phiên đã ghi (đặc tả 06 mục 5)", async () => {
    const put = await putBusinessProfile(
      withSession(`${BASE}/business-profile`, a.token, {
        method: "PUT",
        body: JSON.stringify({ display_name: "Tiệm hoa của A", phone: "0900000000" }),
      })
    )
    expect(put.status).toBe(200)
    expect((await readJson(put)).display_name).toBe("Tiệm hoa của A")

    const ownRead = await readJson(await getBusinessProfile(withSession(`${BASE}/business-profile`, a.token)))
    expect(ownRead.display_name).toBe("Tiệm hoa của A")
    expect(ownRead.phone).toBe("0900000000")

    // B chưa từng PUT — tổ chức của B đọc hồ sơ của chính nó, vẫn trống.
    const otherRead = await readJson(
      await getBusinessProfile(withSession(`${BASE}/business-profile`, b.token))
    )
    expect(otherRead).toEqual(null)
  })

  it("thông điệp thương hiệu và khách mục tiêu (checklist ALG 9.3): lưu, giữ khi PUT không gửi, chỉ chính tổ chức đọc được, có trong ngữ cảnh AI", async () => {
    const put = (token: string, body: object) =>
      putBusinessProfile(withSession(`${BASE}/business-profile`, token, { method: "PUT", body: JSON.stringify(body) }))
    expect((await put(a.token, { display_name: "Tiệm A", brand_message: "Hoa tươi giao đúng hẹn", target_customers: ["Văn phòng", "Cặp đôi"] })).status).toBe(200)
    expect((await put(a.token, { display_name: "Tiệm A đổi tên" })).status).toBe(200)
    const ownRead = await readJson(await getBusinessProfile(withSession(`${BASE}/business-profile`, a.token)))
    expect(ownRead).toMatchObject({ display_name: "Tiệm A đổi tên", brand_message: "Hoa tươi giao đúng hẹn", target_customers: ["Văn phòng", "Cặp đôi"] })
    expect((await put(a.token, { display_name: "Tiệm A", target_customers: Array.from({ length: 11 }, (_, i) => `Nhóm ${i}`) })).status).toBe(400)

    const { readShopContext } = await import("@/modules/content-engine/infra/read-shop-context")
    expect(await readShopContext(a.ctx)).toMatchObject({ brandMessage: "Hoa tươi giao đúng hẹn", targetCustomers: ["Văn phòng", "Cặp đôi"] })
    expect(await readShopContext(b.ctx)).toMatchObject({ brandMessage: null, targetCustomers: [] })
  })

  it("PUT /business-profile thiếu display_name trả 400 VALIDATION_FAILED", async () => {
    const response = await putBusinessProfile(
      withSession(`${BASE}/business-profile`, a.token, {
        method: "PUT",
        body: JSON.stringify({ phone: "0900000000" }),
      })
    )
    expect(response.status).toBe(400)
    expect((await readJson(response)).error).toMatchObject({ code: "VALIDATION_FAILED" })
  })

  it("PUT /brand-profile rồi GET chỉ đọc lại được bằng chính phiên đã ghi, mã màu sai hình dạng bị chặn", async () => {
    const invalid = await putBrandProfile(
      withSession(`${BASE}/brand-profile`, a.token, {
        method: "PUT",
        body: JSON.stringify({ primary_color: "khong-phai-hex" }),
      })
    )
    expect(invalid.status).toBe(400)

    const put = await putBrandProfile(
      withSession(`${BASE}/brand-profile`, a.token, {
        method: "PUT",
        body: JSON.stringify({ primary_color: "#0A74DA", tone_of_voice: "thân thiện" }),
      })
    )
    expect(put.status).toBe(200)

    const ownRead = await readJson(await getBrandProfile(withSession(`${BASE}/brand-profile`, a.token)))
    expect(ownRead.primary_color).toBe("#0A74DA")

    const otherRead = await readJson(await getBrandProfile(withSession(`${BASE}/brand-profile`, b.token)))
    expect(otherRead).toEqual(null)
  })
})
