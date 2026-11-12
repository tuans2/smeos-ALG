import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as closeRequest } from "@/app/api/v1/orders/[id]/info-requests/[requestId]/route"
import { GET as listForOrder, POST as createRequest } from "@/app/api/v1/orders/[id]/info-requests/route"
import { PATCH as patchOrder } from "@/app/api/v1/orders/[id]/route"
import { GET as listOpen } from "@/app/api/v1/orders/info-requests/route"
import { POST as createOrder } from "@/app/api/v1/orders/route"
import { syncOrderInfoRequests } from "@/modules/orders/use-cases/order-info-requests"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 4.14 — đơn thiếu thông tin tự sinh yêu cầu bổ sung, đủ thì tự đóng, quá hạn thì nhắc. */

const BASE = "http://localhost/api/v1/orders"
type Req = { id: string; field: string; status: string; orderCode: string }
const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe("theo dõi đơn thiếu thông tin", () => {
  let a: Tenant
  let b: Tenant

  async function newOrder(token: string, extra: Record<string, unknown> = {}) {
    const res = await createOrder(withSession(BASE, token, {
      method: "POST", body: JSON.stringify({ items: [{ description: "Bó hồng", quantity: 1, unitPriceVnd: 500_000 }], ...extra }),
    }))
    expect(res.status).toBe(201)
    return ((await readJson(res)).order as { id: string }).id
  }
  const requests = async (token: string, id: string) =>
    (await readJson(await listForOrder(withSession(`${BASE}/${id}/info-requests`, token), params(id)))).data as Req[]

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("đơn thiếu địa chỉ và SĐT người nhận → hai yêu cầu mở; bổ sung → tự đóng", async () => {
    const id = await newOrder(a.token)
    const open = await requests(a.token, id)
    expect(open.map((r) => [r.field, r.status]).sort()).toEqual([["deliveryAddress", "OPEN"], ["recipientPhone", "OPEN"]])
    expect(((await readJson(await listOpen(withSession(`${BASE}/info-requests`, a.token)))).data as Req[])).toHaveLength(2)

    const patched = await patchOrder(withSession(`${BASE}/${id}`, a.token, {
      method: "PATCH", body: JSON.stringify({ delivery_address: { recipientName: "Bình", phone: "0901234567", street: "12 Phố Huế" } }),
    }), params(id))
    expect(patched.status).toBe(200)
    expect((await requests(a.token, id)).map((r) => r.status)).toEqual(["RECEIVED", "RECEIVED"])
    expect(((await readJson(await listOpen(withSession(`${BASE}/info-requests`, a.token)))).data as Req[])).toHaveLength(0)
  })

  it("đơn đủ thông tin không sinh yêu cầu; tổ chức khác → 404 / danh sách rỗng", async () => {
    const id = await newOrder(a.token, { delivery_address: { recipientName: "Bình", phone: "0901234567", street: "12 Phố Huế" } })
    expect(await requests(a.token, id)).toHaveLength(0)
    const other = await newOrder(a.token)
    expect((await listForOrder(withSession(`${BASE}/${other}/info-requests`, b.token), params(other))).status).toBe(404)
    expect(((await readJson(await listOpen(withSession(`${BASE}/info-requests`, b.token)))).data as Req[])).toHaveLength(0)
  })

  it("quá hạn → chuyển Quá hạn; yêu cầu tay tạo/huỷ (bắt buộc lý do); Sale không tạo được yêu cầu", async () => {
    const id = await newOrder(a.token)
    const later = new Date(Date.now() + 3 * 3600_000)
    expect((await syncOrderInfoRequests(a.ctx, id, later)).map((r) => r.status)).toEqual(["OVERDUE", "OVERDUE"])

    const body = { field: "custom:giờ nhận", label: "Giờ nhận hoa", reason: "Khách chưa chốt giờ", requested_from: "Khách qua Zalo" }
    const sale = await addStaffWithSession(a, "sale", "lan")
    expect((await createRequest(withSession(`${BASE}/${id}/info-requests`, sale.token, { method: "POST", body: JSON.stringify(body) }), params(id))).status).toBe(403)
    const created = await createRequest(withSession(`${BASE}/${id}/info-requests`, a.token, { method: "POST", body: JSON.stringify(body) }), params(id))
    expect(created.status).toBe(201)
    const reqId = ((await readJson(created)).data as Req).id

    const close = (payload: Record<string, unknown>) =>
      closeRequest(withSession(`${BASE}/${id}/info-requests/${reqId}`, a.token, { method: "POST", body: JSON.stringify(payload) }), { params: Promise.resolve({ id, requestId: reqId }) })
    expect((await close({ outcome: "CANCELLED" })).status).toBe(400)
    expect((await close({ outcome: "CANCELLED", note: "Khách tự đến lấy" })).status).toBe(200)
    expect((await close({ outcome: "RECEIVED" })).status).toBe(409)
    expect((await prisma.order_info_requests.findUniqueOrThrow({ where: { id: reqId } })).status).toBe("CANCELLED")
  })
})
