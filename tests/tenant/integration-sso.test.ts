import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getIntegrationBrandProfile } from "@/app/api/v1/integration/brand-profile/route"
import { GET as getIntegrationBusinessProfile } from "@/app/api/v1/integration/business-profile/route"
import { GET as listIntegrationProducts } from "@/app/api/v1/integration/products/route"
import { POST as issueToken } from "@/app/api/v1/integration-tokens/route"
import { GET as listProductsBySession, POST as createProduct } from "@/app/api/v1/products/route"
import { PUT as putBrandProfile } from "@/app/api/v1/brand-profile/route"
import { PUT as putBusinessProfile } from "@/app/api/v1/business-profile/route"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withBearer, withSession, withSso, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

/**
 * Cách ly tenant — đường danh tính SSO của Integration Layer (quyết định của
 * anh Tony, AskUserQuestion 2026-09-10).
 *
 * Đây là bộ test khoá lỗi rò dữ liệu chéo tổ chức đã phát hiện ở bản rà soát
 * `docs/kien-truc/RA_SOAT_DONG_BO_BA_REPO.md` mục 3.1: trước khi có nhánh
 * `sso`, `LocalBudd` mang MỘT token toàn cục gắn cứng một tổ chức, nên người
 * của tổ chức B đăng nhập vào vẫn đọc danh mục của tổ chức A. Ca thử đầu tiên
 * dưới đây là ca sẽ đỏ nếu ai đó quay lại thiết kế cũ.
 */
describe("cách ly tenant — Integration Layer qua SSO", () => {
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

  async function seedProduct(tenant: Tenant, code: string, name: string): Promise<void> {
    const created = await createProduct(
      withSession(`${BASE}/products`, tenant.token, {
        method: "POST",
        body: JSON.stringify({ code, name, status: "ACTIVE" }),
      })
    )
    expect(created.status).toBe(201)
  }

  it("người của tổ chức B chỉ thấy sản phẩm của B, kể cả khi A đã cấp token tích hợp", async () => {
    await seedProduct(a, "A-001", "Bó hồng Alpha")
    await seedProduct(b, "B-001", "Giỏ lan Beta")

    // A cấp token máy gọi máy — đúng tình huống cũ: một token toàn cục nằm
    // trong biến môi trường của LocalBudd.
    const issued = await readJson(
      await issueToken(
        withSession(`${BASE}/integration-tokens`, a.token, {
          method: "POST",
          body: JSON.stringify({ client: "LOCALBUDD" }),
        })
      )
    )

    // Lời gọi thay mặt người của B, nhưng KÈM cả token của A. SSO phải thắng.
    const request = withSso(
      `${BASE}/integration/products`,
      { userId: b.userId, organizationId: b.organizationId },
      { headers: { authorization: `Bearer ${issued.token as string}` } }
    )
    const body = await readJson(await listIntegrationProducts(request))
    const codes = (body.data as Array<{ code: string }>).map((row) => row.code)

    expect(codes).toEqual(["B-001"])
  })

  it("token của A vẫn chỉ đọc được dữ liệu của A khi không có SSO", async () => {
    await seedProduct(a, "A-001", "Bó hồng Alpha")
    await seedProduct(b, "B-001", "Giỏ lan Beta")

    const issued = await readJson(
      await issueToken(
        withSession(`${BASE}/integration-tokens`, a.token, {
          method: "POST",
          body: JSON.stringify({ client: "LOCALBUDD" }),
        })
      )
    )

    const body = await readJson(
      await listIntegrationProducts(
        withBearer(`${BASE}/integration/products`, issued.token as string)
      )
    )
    expect((body.data as Array<{ code: string }>).map((row) => row.code)).toEqual(["A-001"])
  })

  it("JWT của người KHÔNG còn là thành viên tổ chức bị từ chối", async () => {
    const request = withSso(`${BASE}/integration/products`, {
      userId: b.userId,
      organizationId: a.organizationId,
    })
    expect((await listIntegrationProducts(request)).status).toBe(401)
  })

  it("JWT chưa chọn tổ chức (org = null) bị từ chối", async () => {
    const request = withSso(`${BASE}/integration/products`, {
      userId: a.userId,
      organizationId: null,
    })
    expect((await listIntegrationProducts(request)).status).toBe(401)
  })

  it("JWT bị sửa chữ ký bị từ chối", async () => {
    const good = withSso(`${BASE}/integration/products`, {
      userId: a.userId,
      organizationId: a.organizationId,
    })
    const tampered = new Request(good.url, {
      headers: { "x-floraos-sso": `${good.headers.get("x-floraos-sso")}x` },
    })
    expect((await listIntegrationProducts(tampered)).status).toBe(401)
  })

  it("BusinessProfile qua SSO gác bằng năng lực thật, không bằng tên app", async () => {
    // Người sáng lập có `F1` mặc định nên đọc được — và đọc đúng của mình,
    // không cần token `LOCALBUDD` nào.
    await putBusinessProfile(
      withSession(`${BASE}/business-profile`, a.token, {
        method: "PUT",
        body: JSON.stringify({ display_name: "Tiệm hoa Alpha" }),
      })
    )
    await putBusinessProfile(
      withSession(`${BASE}/business-profile`, b.token, {
        method: "PUT",
        body: JSON.stringify({ display_name: "Tiệm hoa Beta" }),
      })
    )

    const body = await readJson(
      await getIntegrationBusinessProfile(
        withSso(`${BASE}/integration/business-profile`, {
          userId: a.userId,
          organizationId: a.organizationId,
        })
      )
    )
    expect(body.display_name).toBe("Tiệm hoa Alpha")
  })

  it("khối pricing KHÔNG vượt ranh giới core, dù người gọi có L5 thật", async () => {
    await seedProduct(a, "A-001", "Bó hồng Alpha")

    // `filterProductLookup` cắt khối giá bằng cách đặt `pricing: null` và kê
    // tên trường bị cắt ở `redacted_fields` — nó KHÔNG bỏ hẳn khoá. Nên phép
    // thử ở đây soi GIÁ TRỊ, không soi sự tồn tại của khoá.

    // Qua chính phiên người dùng ở core: người sáng lập có `L5` nên THẤY giá.
    const trongCore = await readJson(
      await listProductsBySession(withSession(`${BASE}/products?status=ACTIVE`, a.token))
    )
    const sanPhamTrongCore = (trongCore.data as Array<Record<string, unknown>>)[0]
    expect(sanPhamTrongCore?.pricing).not.toBeNull()

    // Qua Integration API bằng chính JWT của người ấy: KHÔNG thấy giá.
    const quaBien = await readJson(
      await listIntegrationProducts(
        withSso(`${BASE}/integration/products`, {
          userId: a.userId,
          organizationId: a.organizationId,
        })
      )
    )
    const sanPham = (quaBien.data as Array<Record<string, unknown>>)[0]
    expect(sanPham).toBeDefined()
    expect(sanPham?.pricing).toBeNull()
    expect(sanPham?.redacted_fields).toContain("pricing")
  })

  it("BrandProfile đọc qua JWT của B trả đúng hồ sơ của B, không phải của A", async () => {
    await putBrandProfile(
      withSession(`${BASE}/brand-profile`, a.token, {
        method: "PUT",
        body: JSON.stringify({ primary_color: "#ff0000" }),
      })
    )
    await putBrandProfile(
      withSession(`${BASE}/brand-profile`, b.token, {
        method: "PUT",
        body: JSON.stringify({ primary_color: "#0000ff" }),
      })
    )

    const body = await readJson(
      await getIntegrationBrandProfile(
        withSso(`${BASE}/integration/brand-profile`, {
          userId: b.userId,
          organizationId: b.organizationId,
        })
      )
    )
    expect(body.primary_color).toBe("#0000ff")
  })
})
