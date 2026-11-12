import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getFields, PATCH as patchFields, POST as postFields } from "@/app/api/v1/platform/fields/route"
import { POST as deactivateField } from "@/app/api/v1/platform/fields/[key]/deactivate/route"
import { PUT as putOrgOverride } from "@/app/api/v1/platform/organizations/[id]/field-overrides/route"
import { GET as getFieldConfig, POST as postShopField, PUT as putShopField } from "@/app/api/v1/field-config/route"

import { PlatformOperatorRepository } from "@/modules/platform/infra/platform-operator-repository"
import { PlatformAuditRepository } from "@/modules/platform/infra/platform-audit-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

function withParams<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) }
}

/**
 * ĐP-3 §6.5 — cổng ĐP-3: thiếu N12 → 403; mức sàn #1/#2 chặn ở lớp ghi;
 * không tắt được trường bắt buộc; ghi đè tổ chức A không ảnh hưởng tổ
 * chức B; mọi thao tác ghi có dòng `platform_audit_logs`.
 */
describe("Nền quản trị trường (ĐP-3) — N12", () => {
  let a: Tenant
  let b: Tenant
  let nguoiVanHanh: Tenant

  beforeEach(async () => {
    await resetDatabase()
    // Sổ đăng ký trường là bảng nền tảng, resetDatabase() không dọn — ca thử
    // tự tạo `customerPhone` ở hai ca liền nhau sẽ đụng khoá duy nhất.
    await prisma.$executeRawUnsafe(
      "TRUNCATE TABLE field_catalog_values, field_catalogs, field_definitions RESTART IDENTITY CASCADE"
    )
    a = await createTenant("field-a")
    b = await createTenant("field-b")
    nguoiVanHanh = await createTenant("field-nguoi-van-hanh")
    await new PlatformOperatorRepository().grant(nguoiVanHanh.userId, ["N12"], null)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("thiếu N12 → 403 CAPABILITY_DENIED", async () => {
    const res = await getFields(withSession(`${BASE}/platform/fields`, a.token))
    expect(res.status).toBe(403)
    const body = (await readJson(res)) as { error: { code: string } }
    expect(body.error.code).toBe("CAPABILITY_DENIED")
  })

  it("có N12 → liệt kê được trường (rỗng nếu chưa seed) và không lỗi 403", async () => {
    const res = await getFields(withSession(`${BASE}/platform/fields`, nguoiVanHanh.token))
    expect(res.status).toBe(200)
  })

  it("tạo trường tự tạo mới, khoá tự sinh cf_..., ghi platform_audit_logs", async () => {
    const res = await postFields(
      withSession(`${BASE}/platform/fields`, nguoiVanHanh.token, {
        method: "POST",
        body: JSON.stringify({ entity: "ORDER", label: "Mã PO khách", data_type: "TEXT" }),
      })
    )
    expect(res.status).toBe(200)
    const body = (await readJson(res)) as { data: { key: string; origin: string } }
    expect(body.data.key).toBe("cf_ma_po_khach")
    expect(body.data.origin).toBe("CUSTOM")

    const logs = await new PlatformAuditRepository().list(10)
    expect(logs.some((l) => l.action === "platform.field.create_custom")).toBe(true)
  })

  it("không tạo được trường tự tạo với kiểu dữ liệu không hợp lệ", async () => {
    const res = await postFields(
      withSession(`${BASE}/platform/fields`, nguoiVanHanh.token, {
        method: "POST",
        body: JSON.stringify({ entity: "ORDER", label: "X", data_type: "STRUCTURED_ADDRESS" }),
      })
    )
    expect(res.status).toBe(400)
  })

  it("không hạ được mức yêu cầu của trường lõi REQUIRED xuống OPTIONAL (mức sàn #2)", async () => {
    await prisma.field_definitions.create({
      data: {
        key: "customerPhone",
        entity: "ORDER",
        origin: "CORE",
        data_type: "PHONE",
        label: "SĐT người mua",
        requirement: "REQUIRED",
        required_at_stage: "INTAKE",
        sensitivity: "PII",
        status: "ACTIVE",
      },
    })

    const res = await patchFields(
      withSession(`${BASE}/platform/fields`, nguoiVanHanh.token, {
        method: "PATCH",
        body: JSON.stringify({ key: "customerPhone", requirement: "OPTIONAL" }),
      })
    )
    expect(res.status).toBe(400)
  })

  it("không tắt được trường lõi REQUIRED", async () => {
    await prisma.field_definitions.create({
      data: {
        key: "customerPhone",
        entity: "ORDER",
        origin: "CORE",
        data_type: "PHONE",
        label: "SĐT người mua",
        requirement: "REQUIRED",
        sensitivity: "PII",
        status: "ACTIVE",
      },
    })

    const res = await deactivateField(
      withSession(`${BASE}/platform/fields/customerPhone/deactivate`, nguoiVanHanh.token, { method: "POST" }),
      withParams({ key: "customerPhone" })
    )
    expect(res.status).toBe(400)
  })

  it("ghi đè tổ chức A không ảnh hưởng tổ chức B — GET /field-config", async () => {
    await prisma.field_definitions.create({
      data: {
        key: "cardMessage",
        entity: "ORDER",
        origin: "CORE",
        data_type: "LONG_TEXT",
        label: "Lời thiệp",
        requirement: "RECOMMENDED",
        visibility: { INTERNAL: true, PARTNER: true, SHIPPER: false, CUSTOMER: false },
        sensitivity: "NORMAL",
        status: "ACTIVE",
      },
    })

    const putRes = await putOrgOverride(
      withSession(`${BASE}/platform/organizations/${a.organizationId}/field-overrides`, nguoiVanHanh.token, {
        method: "PUT",
        body: JSON.stringify({ target: "field", field_key: "cardMessage", label: "Nội dung thiệp riêng của A" }),
      }),
      withParams({ id: a.organizationId })
    )
    expect(putRes.status).toBe(200)

    const configOfA = (await readJson(
      await getFieldConfig(withSession(`${BASE}/field-config?entity=ORDER`, a.token))
    )) as { data: Array<{ key: string; label: string }> }
    const configOfB = (await readJson(
      await getFieldConfig(withSession(`${BASE}/field-config?entity=ORDER`, b.token))
    )) as { data: Array<{ key: string; label: string }> }

    expect(configOfA.data.find((f) => f.key === "cardMessage")?.label).toBe("Nội dung thiệp riêng của A")
    expect(configOfB.data.find((f) => f.key === "cardMessage")?.label).toBe("Lời thiệp")
  })

  it("route tenant /field-config ghi trong phạm vi tổ chức (D18, checklist ALG 1.9): không hạ được sàn nền tảng, không ghi sổ trường chung", async () => {
    await prisma.field_definitions.create({
      data: { key: "customerPhone", entity: "ORDER", origin: "CORE", data_type: "PHONE", label: "SĐT người mua", requirement: "REQUIRED", sensitivity: "PII", status: "ACTIVE" },
    })
    const lower = await putShopField(
      withSession(`${BASE}/field-config`, a.token, { method: "PUT", body: JSON.stringify({ key: "customerPhone", requirement: "OPTIONAL" }) })
    )
    expect(lower.status).toBe(400)
    const hide = await putShopField(
      withSession(`${BASE}/field-config`, a.token, { method: "PUT", body: JSON.stringify({ key: "customerPhone", is_enabled: false }) })
    )
    expect(hide.status).toBe(400)

    const created = await postShopField(
      withSession(`${BASE}/field-config`, a.token, { method: "POST", body: JSON.stringify({ entity: "ORDER", label: "Mã thẻ thành viên", data_type: "TEXT" }) })
    )
    expect(created.status).toBe(201)
    const row = await prisma.field_definitions.findFirstOrThrow({ where: { label: "Mã thẻ thành viên" } })
    expect(row.owner_organization_id).toBe(a.organizationId)

    // Sổ trường của nền tảng không đổi; Console nền tảng không liệt kê trường riêng của cửa hàng
    const core = await prisma.field_definitions.findUniqueOrThrow({ where: { key: "customerPhone" } })
    expect(core.requirement).toBe("REQUIRED")
    const platformList = (await readJson(await getFields(withSession(`${BASE}/platform/fields`, nguoiVanHanh.token)))) as { data: Array<{ key: string }> }
    expect(platformList.data.some((f) => f.key === row.key)).toBe(false)

    const configOfB = (await readJson(await getFieldConfig(withSession(`${BASE}/field-config?entity=ORDER`, b.token)))) as { data: Array<{ key: string }> }
    expect(configOfB.data.some((f) => f.key === row.key)).toBe(false)
  })
})
