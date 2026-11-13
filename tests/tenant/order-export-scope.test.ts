import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import * as XLSX from "xlsx"

import { GET as exportOrders } from "@/app/api/v1/orders/export/route"
import { RoleRepository } from "@/modules/organization/infra/role-repository"
import { updateRoleCapabilities } from "@/modules/organization/use-cases/update-role-capabilities"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 4.10 — mỗi nhân viên chỉ xuất được đơn thuộc phạm vi xem của mình. */

const URL_EXPORT = "http://localhost/api/v1/orders/export"

async function exportedCodes(token: string): Promise<string[]> {
  const res = await exportOrders(withSession(URL_EXPORT, token))
  expect(res.status).toBe(200)
  const wb = XLSX.read(new Uint8Array(await res.arrayBuffer()), { type: "array" })
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]!]!)
  return rows.map((r) => String(Object.values(r).find((v) => typeof v === "string" && v.startsWith("DH-")) ?? ""))
}

describe("xuất Excel đơn hàng theo phạm vi nhân viên", () => {
  let a: Tenant
  let lan: { userId: string; token: string }
  let minh: { userId: string; token: string }

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    lan = await addStaffWithSession(a, "sale", "lan")
    minh = await addStaffWithSession(a, "sale", "minh")
    // Điều hành cấp quyền xuất Excel (R13) cho vai Sale
    const saleRole = (await new RoleRepository().findSystemRoleByKey("sale"))!
    await updateRoleCapabilities(a.ctx, saleRole.id, [{ code: "R13", allowed: true }])

    for (const [code, owner] of [["DH-LAN", lan.userId], ["DH-MINH", minh.userId]] as const) {
      await prisma.orders.create({
        data: {
          id: randomUUID(), organization_id: a.organizationId, code, source: "MANUAL", status: "CONFIRMED",
          total_vnd: 500_000, paid_vnd: 0, balance_vnd: 500_000, created_by: a.userId, owner_sale_id: owner,
        },
      })
    }
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("sale chế độ 'chỉ khách của mình' chỉ xuất đơn mình phụ trách", async () => {
    await prisma.organizations.update({
      where: { id: a.organizationId },
      data: { settings: { brochure_visibility: { mode: "OWN", members: {} } } },
    })
    expect(await exportedCodes(lan.token)).toEqual(["DH-LAN"])
    expect(await exportedCodes(minh.token)).toEqual(["DH-MINH"])
  })

  it("chế độ xem tất cả và Điều hành xuất đủ đơn của tổ chức", async () => {
    expect((await exportedCodes(lan.token)).sort()).toEqual(["DH-LAN", "DH-MINH"])
    expect((await exportedCodes(a.token)).sort()).toEqual(["DH-LAN", "DH-MINH"])
  })
})
