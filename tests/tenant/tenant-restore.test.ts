import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { eraseForCustomer } from "@/modules/crm/use-cases/data-subject-requests"
import { exportTenant, type TenantPackage } from "@/modules/organization/infra/tenant-export"
import { restoreTenant } from "@/modules/organization/infra/tenant-restore"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * ADR-016 D-S4, bước S-4: khôi phục riêng một tổ chức về mốc của gói (một giao dịch) — dữ liệu sau mốc biến mất, dữ liệu
 * trước mốc trở lại; yêu cầu xoá dữ liệu cá nhân có sau mốc được chạy lại nên khách đã xin xoá không "sống lại"; tổ chức
 * khác không bị chạm.
 */
async function order(t: Tenant, code: string, customerId: string) {
  return prisma.orders.create({
    data: { organization_id: t.organizationId, code, customer_id: customerId, status: "COMPLETED", total_vnd: 200_000, paid_vnd: 200_000, balance_vnd: 0, created_by: t.userId },
  })
}

describe("khôi phục riêng một tổ chức", () => {
  let a: Tenant
  let b: Tenant
  let customerId: string

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("khoi-phuc-a")
    b = await createTenant("khoi-phuc-b")
    customerId = (await prisma.customers.create({ data: { organization_id: a.organizationId, code: "KH-1", name: "Chị Lan", phone: "0100000001" } })).id
    await order(a, "DH-TRUOC", customerId)
    const other = await prisma.customers.create({ data: { organization_id: b.organizationId, code: "KH-B", name: "Anh Minh", phone: "0100000002" } })
    await order(b, "DH-B", other.id)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("về đúng mốc; yêu cầu xoá sau mốc chạy lại; tổ chức khác nguyên vẹn", async () => {
    const snapshot = JSON.parse(JSON.stringify(await exportTenant(a.organizationId, new Date()))) as TenantPackage
    const otherBefore = (await exportTenant(b.organizationId, new Date())).checksums

    await order(a, "DH-SAU", customerId) // sau mốc
    await prisma.products.deleteMany({ where: { organization_id: a.organizationId } })
    await eraseForCustomer(a.ctx, customerId, "khách gọi xin xoá") // sau mốc

    const result = await restoreTenant(snapshot, new Date())
    expect(result.reErased).toBe(1)

    const codes = (await prisma.orders.findMany({ where: { organization_id: a.organizationId }, select: { code: true } })).map((o) => o.code)
    expect(codes).toEqual(["DH-TRUOC"])
    expect(await prisma.customers.findUniqueOrThrow({ where: { id: customerId } })).toMatchObject({ name: "Khách đã xoá", phone: "ERASED" })
    expect(await prisma.data_subject_requests.count({ where: { organization_id: a.organizationId, type: "ERASE" } })).toBe(1)
    expect((await exportTenant(b.organizationId, new Date())).checksums).toEqual(otherBefore)
  })

  it("tổ chức chưa có ở đích → từ chối (dùng nhập); gói bị sửa → từ chối, dữ liệu hiện tại giữ nguyên", async () => {
    const snapshot = await exportTenant(a.organizationId, new Date())
    await expect(restoreTenant({ ...snapshot, organizationId: "khong-co" }, new Date())).rejects.toThrow()
    const tampered = JSON.parse(JSON.stringify(snapshot)) as TenantPackage
    ;(tampered.tables["orders"]![0] as Record<string, unknown>)["code"] = "SUA"
    await expect(restoreTenant(tampered, new Date())).rejects.toThrow(/Checksum/)
    expect(await prisma.orders.count({ where: { organization_id: a.organizationId } })).toBe(1)
  })
})
