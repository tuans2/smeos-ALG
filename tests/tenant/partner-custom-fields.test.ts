import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { createPartner, listPartners, updatePartner } from "@/modules/coordinator/use-cases/manage-partners"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Audit L-09 (12/11/2026): trường tự tạo cho ĐỐI TÁC (Console → Trường dữ liệu, entity PARTNER) đã có định nghĩa và cột
 * `partners.custom_fields` nhưng chưa có đường ghi. Tạo/sửa đối tác nay kiểm giá trị qua `applyCustomFields` (cùng hàm với
 * đơn điều phối), lưu vào cột, trả về ở view; sửa thì trộn vào giá trị cũ. CSDL thật.
 */
const KEYS = ["cf_partner_ma_so_thue_test", "cf_partner_ngan_hang_test"]

async function seedPartnerField(key: string) {
  // `field_definitions` là bảng nền tảng, không bị TRUNCATE giữa các ca — upsert như tests/tenant/coordinator.test.ts
  const data = {
    entity: "PARTNER" as const,
    origin: "CUSTOM" as const,
    data_type: "TEXT" as const,
    label: `Nhãn ${key}`,
    requirement: "OPTIONAL" as const,
    status: "ACTIVE" as const,
    default_enabled: true,
  }
  await prisma.field_definitions.upsert({ where: { key }, create: { key, ...data }, update: data })
}

const base = { name: "Xưởng hoa Sen", phone: "0100000001", tier: "STANDARD" as const, capacityDaily: 10 }

describe("trường tự tạo của đối tác gia công", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    await prisma.field_definitions.deleteMany({ where: { key: { in: KEYS } } })
    for (const key of KEYS) await seedPartnerField(key)
    a = await createTenant("doi-tac-cf-a")
    b = await createTenant("doi-tac-cf-b")
  })

  afterAll(async () => {
    await prisma.field_definitions.deleteMany({ where: { key: { in: KEYS } } })
    await disconnectDatabase()
  })

  it("tạo đối tác: giá trị được kiểm, lưu vào custom_fields và trả về ở view", async () => {
    const partner = await createPartner(a.ctx, { ...base, code: "SEN-01", customFields: { cf_partner_ma_so_thue_test: "0101234567" } })
    expect(partner.customFields).toEqual({ cf_partner_ma_so_thue_test: "0101234567" })

    const row = await prisma.partners.findUniqueOrThrow({ where: { id: partner.id } })
    expect(row.custom_fields).toEqual({ cf_partner_ma_so_thue_test: "0101234567" })
    expect((await listPartners(a.ctx, { activeOnly: false }))[0]?.customFields).toEqual({ cf_partner_ma_so_thue_test: "0101234567" })
  })

  it("không gửi trường tự tạo: view trả {} (đối tác cũ vẫn đọc được)", async () => {
    const partner = await createPartner(a.ctx, { ...base, code: "SEN-02" })
    expect(partner.customFields).toEqual({})
  })

  it("giá trị sai kiểu (số cho trường chữ) → bị từ chối, không tạo đối tác (route trả 400)", async () => {
    await expect(createPartner(a.ctx, { ...base, code: "SEN-03", customFields: { cf_partner_ma_so_thue_test: 123 } })).rejects.toMatchObject({
      name: "ZodError",
    })
    expect(await prisma.partners.count({ where: { organization_id: a.organizationId } })).toBe(0)
  })

  it("sửa đối tác: trộn giá trị mới vào giá trị cũ; tổ chức khác sửa → 404", async () => {
    const partner = await createPartner(a.ctx, { ...base, code: "SEN-04", customFields: { cf_partner_ma_so_thue_test: "0101234567" } })
    const updated = await updatePartner(a.ctx, partner.id, { customFields: { cf_partner_ngan_hang_test: "VCB 0123" } })
    expect(updated.customFields).toEqual({ cf_partner_ma_so_thue_test: "0101234567", cf_partner_ngan_hang_test: "VCB 0123" })

    await expect(updatePartner(b.ctx, partner.id, { customFields: { cf_partner_ngan_hang_test: "chiếm" } })).rejects.toMatchObject({
      code: "NOT_FOUND",
    })
    const row = await prisma.partners.findUniqueOrThrow({ where: { id: partner.id } })
    expect((row.custom_fields as Record<string, unknown>).cf_partner_ngan_hang_test).toBe("VCB 0123")
  })
})
