import { randomUUID } from "node:crypto"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as approveBypass } from "@/app/api/v1/coordinator/orders/[id]/approve-bypass/route"
import { POST as approveCustomerPhoto } from "@/app/api/v1/coordinator/orders/[id]/approve-customer-photo/route"
import { POST as confirmDelivery } from "@/app/api/v1/coordinator/orders/[id]/confirm-delivery/route"
import { POST as setShipper } from "@/app/api/v1/coordinator/orders/[id]/set-shipper/route"
import { POST as uploadQc } from "@/app/api/v1/coordinator/orders/[id]/upload-qc-subcontract/route"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, withSession, type Tenant } from "../helpers/fixtures"

type Handler = (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>

const ROUTES: Array<[string, Handler]> = [
  ["approve-bypass", approveBypass as Handler],
  ["approve-customer-photo", approveCustomerPhoto as Handler],
  ["confirm-delivery", confirmDelivery as Handler],
  ["set-shipper", setShipper as Handler],
  ["upload-qc-subcontract", uploadQc as Handler],
]

/**
 * Năm thao tác Điều phối của đơn gia công trước đây chỉ kiểm phiên tổ chức — vai Sale cũng
 * duyệt được việc bỏ qua bằng chứng hay xác nhận đã giao (rà soát 21/10/2026, H4).
 */
describe("thao tác Điều phối đơn gia công gác bằng mã năng lực", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it.each(ROUTES)("%s: vai Sale bị từ chối 403 trước khi chạm dữ liệu", async (name, handler) => {
    const sale = await addStaffWithSession(a, "sale", "sale")
    const orderId = randomUUID()
    const req = withSession(`http://localhost/api/v1/coordinator/orders/${orderId}/${name}`, sale.token, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    })
    const res = await handler(req, { params: Promise.resolve({ id: orderId }) })
    expect(res.status).toBe(403)
  })

  it.each(ROUTES)("%s: vai Điều phối qua được cổng quyền (đơn không có → 404, không 403)", async (name, handler) => {
    const coordinator = await addStaffWithSession(a, "dieu_phoi", "dieu-phoi")
    const orderId = randomUUID()
    const req = withSession(`http://localhost/api/v1/coordinator/orders/${orderId}/${name}`, coordinator.token, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    })
    const res = await handler(req, { params: Promise.resolve({ id: orderId }) })
    expect(res.status).not.toBe(403)
  })
})
