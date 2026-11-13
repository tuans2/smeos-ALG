import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import { applyCustomFields } from "@/modules/field-platform/use-cases/apply-custom-fields"
import { getEffectiveFieldConfig } from "@/modules/field-platform/use-cases/get-effective-field-config"
import { createShopField, listShopFieldSettings, updateShopField } from "@/modules/field-platform/use-cases/manage-shop-fields"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Checklist ALG 1.9 — cửa hàng (Điều hành, `D18`) tự tạo trường riêng, ẩn trường tuỳ chọn của nền tảng;
 * không tắt/hạ được trường lõi bắt buộc; không ảnh hưởng tổ chức khác (trường riêng của A → 404 với B).
 */
describe("trường dữ liệu do cửa hàng cấu hình", () => {
  let a: Tenant
  let b: Tenant
  const can = (t: Tenant, codes: string[]): TenantContext => ({ ...t.ctx, capabilities: new Set(codes) })

  beforeEach(async () => {
    await resetDatabase()
    await prisma.field_definitions.deleteMany({ where: { key: { in: ["customerPhone", "cardMessage"] } } })
    await prisma.field_definitions.deleteMany({ where: { owner_organization_id: { not: null } } })
    a = await createTenant("fc-a")
    b = await createTenant("fc-b")
    await prisma.field_definitions.createMany({
      data: [
        { key: "customerPhone", entity: "ORDER", origin: "CORE", data_type: "PHONE", label: "SĐT người mua", requirement: "REQUIRED", sensitivity: "PII", status: "ACTIVE" },
        { key: "cardMessage", entity: "ORDER", origin: "CORE", data_type: "LONG_TEXT", label: "Lời thiệp", requirement: "OPTIONAL", sensitivity: "NORMAL", status: "ACTIVE" },
      ],
    })
  })

  afterAll(async () => {
    await prisma.field_definitions.deleteMany({ where: { key: { in: ["customerPhone", "cardMessage"] } } })
    await disconnectDatabase()
  })

  it("thiếu D18 → bị chặn cả xem cài đặt, tạo và sửa", async () => {
    const ctx = can(a, ["R1"])
    await expect(listShopFieldSettings(ctx)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
    await expect(createShopField(ctx, { entity: "ORDER", label: "X", dataType: "TEXT" })).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
    await expect(updateShopField(ctx, { key: "cardMessage", isEnabled: false })).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
  })

  it("A tạo trường riêng và ẩn trường tuỳ chọn; B không thấy, không sửa được (404)", async () => {
    const adminA = can(a, ["D18", "R1"])
    const { key } = await createShopField(adminA, { entity: "ORDER", label: "Mã thẻ thành viên", dataType: "TEXT" })
    await updateShopField(adminA, { key: "cardMessage", isEnabled: false, label: "Lời nhắn kèm quà" })

    const effA = await getEffectiveFieldConfig(adminA, "ORDER")
    expect(effA.find((f) => f.key === key)?.label).toBe("Mã thẻ thành viên")
    expect(effA.find((f) => f.key === "cardMessage")).toMatchObject({ isEnabled: false, label: "Lời nhắn kèm quà" })

    const adminB = can(b, ["D18", "R1"])
    const effB = await getEffectiveFieldConfig(adminB, "ORDER")
    expect(effB.some((f) => f.key === key)).toBe(false)
    expect(effB.find((f) => f.key === "cardMessage")).toMatchObject({ isEnabled: true, label: "Lời thiệp" })
    await expect(updateShopField(adminB, { key, label: "Chiếm trường của A" })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect((await listShopFieldSettings(adminB)).some((f) => f.key === key)).toBe(false)

    // Luật của trường riêng (bắt buộc nhập) chỉ áp cho đơn của A
    await updateShopField(adminA, { key, requirement: "REQUIRED" })
    expect(await applyCustomFields(adminA, "ORDER", { [key]: "VIP-01" })).toMatchObject({ [key]: "VIP-01" })
    await expect(applyCustomFields(adminA, "ORDER", {})).rejects.toThrow()
    expect(await applyCustomFields(adminB, "ORDER", {})).toEqual({})
  })

  it("không ẩn, không hạ được trường lõi bắt buộc", async () => {
    const adminA = can(a, ["D18", "R1"])
    await expect(updateShopField(adminA, { key: "customerPhone", isEnabled: false })).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    await expect(updateShopField(adminA, { key: "customerPhone", requirement: "OPTIONAL" })).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    const settings = await listShopFieldSettings(adminA)
    expect(settings.find((f) => f.key === "customerPhone")).toMatchObject({ canHide: false, isEnabled: true, owner: "PLATFORM" })
  })

  it("ẩn rồi hiện lại trường riêng; trường đang ẩn vẫn liệt kê ở cài đặt", async () => {
    const adminA = can(a, ["D18", "R1"])
    const { key } = await createShopField(adminA, { entity: "ORDER", label: "Ghi chú kho", dataType: "LONG_TEXT" })
    await updateShopField(adminA, { key, isEnabled: false })
    expect((await getEffectiveFieldConfig(adminA, "ORDER")).some((f) => f.key === key)).toBe(false)
    expect((await listShopFieldSettings(adminA)).find((f) => f.key === key)).toMatchObject({ isEnabled: false, owner: "SHOP" })
    await updateShopField(adminA, { key, isEnabled: true })
    expect((await getEffectiveFieldConfig(adminA, "ORDER")).some((f) => f.key === key)).toBe(true)
    const audit = await prisma.audit_logs.count({ where: { organization_id: a.organizationId, action: { startsWith: "field.shop." } } })
    expect(audit).toBe(3)
  })
})
