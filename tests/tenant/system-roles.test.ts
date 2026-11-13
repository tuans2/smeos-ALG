import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listOrders } from "@/app/api/v1/orders/route"
import { GET as listPaymentEvents } from "@/app/api/v1/greeting-card/payment-events/route"
import { POST as passwordPost } from "@/app/api/v1/session/password/route"
import { RoleRepository } from "@/modules/organization/infra/role-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 1.12 (PO Q7) — vai Thợ cắm hoa, Shipper, Kế toán với bộ quyền mặc định. */

const BASE = "http://localhost/api/v1"

describe("ba vai hệ thống Thợ cắm hoa, Shipper, Kế toán", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("vai hệ thống có sẵn cho mọi tổ chức, mỗi vai nạp đúng bộ quyền mặc định", async () => {
    const roles = new RoleRepository()
    const codes = async (key: string) => {
      const role = await roles.findSystemRoleByKey(key)
      expect(role, key).not.toBeNull()
      const rows = await prisma.role_capabilities.findMany({ where: { role_id: role!.id } })
      return rows.map((r) => r.capability_code).sort()
    }
    // S1 (trao đổi nội bộ, mọi vai) và S2 (thực hiện đơn gia công, có Thợ cắm) — PO duyệt D2 ngày 09/11/2026
    expect(await codes("tho_cam")).toEqual(["A1", "A2", "G1", "G2", "R17", "S1", "S2"])
    expect(await codes("shipper")).toEqual(["A1", "A2", "G2", "R18", "S1"])
    expect(await codes("ke_toan")).toEqual(["A1", "A2", "F1", "G8", "Q1", "R1", "R13", "R19", "R20", "S1"])
  })

  it("Thợ cắm và Shipper không xem được danh sách đơn; Kế toán xem được đơn và đối soát ngân hàng", async () => {
    const tho = await addStaffWithSession(a, "tho_cam", "tho")
    const shipper = await addStaffWithSession(a, "shipper", "ship")
    const keToan = await addStaffWithSession(a, "ke_toan", "kt")

    expect((await listOrders(withSession(`${BASE}/orders`, tho.token))).status).toBe(403)
    expect((await listOrders(withSession(`${BASE}/orders`, shipper.token))).status).toBe(403)
    expect((await listOrders(withSession(`${BASE}/orders`, keToan.token))).status).toBe(200)

    const events = (token: string) => listPaymentEvents(withSession(`${BASE}/greeting-card/payment-events`, token))
    expect((await events(keToan.token)).status).toBe(200)
    expect((await events(tho.token)).status).toBe(403)
  })

  it("vai mới tự đổi được mật khẩu của mình", async () => {
    const shipper = await addStaffWithSession(a, "shipper", "ship")
    const res = await passwordPost(withSession(`${BASE}/session/password`, shipper.token, {
      method: "POST", body: JSON.stringify({ current_password: "x", new_password: "mat-khau-moi-cua-shipper" }),
    }))
    // Qua cổng quyền A2; mật khẩu hiện tại sai bị từ chối ở bước nghiệp vụ, không phải 403.
    expect(res.status).not.toBe(403)
    expect(((await readJson(res)).error as { code?: string } | undefined)?.code).not.toBe("CAPABILITY_DENIED")
  })
})
