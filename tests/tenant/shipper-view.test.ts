import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as createOrder } from "@/app/api/v1/coordinator/orders/route"
import { POST as report } from "@/app/api/v1/delivery/my-runs/[id]/route"
import { GET as myRuns } from "@/app/api/v1/delivery/my-runs/route"
import { PUT as setPhone } from "@/app/api/v1/members/[id]/phone/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Checklist ALG 4.5 — Shipper chỉ thấy đơn được giao cho mình, không thấy giá hay ghi chú nội bộ. */

const BASE = "http://localhost/api/v1"
const ORDER_BODY = {
  customer_name: "Nguyễn Văn An", customer_phone: "0987654321", customer_tier: "VIP",
  recipient_name: "Trần Thị Bình", recipient_phone: "0901234567",
  delivery_address: { street: "123 Phố Huế", ward: "Ngô Thì Nhậm", district: "Hai Bà Trưng", city: "Hà Nội" },
  delivery_target_time: "17:00 hôm nay", delivery_target_at: new Date(Date.now() + 6 * 3600_000).toISOString(),
  product_title: "Bó hoa hồng Pastel", unit_price_vnd: 850000, internal_note: "Khách khó tính, giảm giá 10%",
  flowers: [{ flowerName: "Hồng Ohara", quantity: 12, unit: "cành", color: "hồng", role: "Chủ đạo" }],
}

type Run = { orderId: string; code: string; recipientName: string; recipientPhone: string; deliveryState: string | null }

describe("màn Đơn cần giao của Shipper", () => {
  let a: Tenant
  let b: Tenant
  let hung: { userId: string; token: string }
  let tuan: { userId: string; token: string }

  async function dispatched(shipperPhone: string) {
    const res = await createOrder(withSession(`${BASE}/coordinator/orders`, a.token, { method: "POST", body: JSON.stringify(ORDER_BODY) }))
    expect(res.status).toBe(201)
    const id = ((await readJson(res)).order as { id: string }).id
    await prisma.order_coordinations.update({ where: { order_id: id }, data: { stage: "DISPATCHING", shipper_name: "Hùng", shipper_phone: shipperPhone } })
    return id
  }
  const runs = async (token: string) => (await readJson(await myRuns(withSession(`${BASE}/delivery/my-runs`, token)))) as { phoneMissing: boolean; runs: Run[] }
  const send = (token: string, id: string, body: Record<string, unknown>) =>
    report(withSession(`${BASE}/delivery/my-runs/${id}`, token, { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id }) })

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    hung = await addStaffWithSession(a, "shipper", "hung")
    tuan = await addStaffWithSession(a, "shipper", "tuan")
    await prisma.users.update({ where: { id: hung.userId }, data: { phone: "+84 933 221 100" } })
    await prisma.users.update({ where: { id: tuan.userId }, data: { phone: "0911000111" } })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("chỉ đơn gắn số của mình; có người nhận, không có giá, ghi chú nội bộ hay người đặt", async () => {
    const mine = await dispatched("0933.221.100")
    await dispatched("0911000111")

    const list = await runs(hung.token)
    expect(list.runs.map((r) => r.orderId)).toEqual([mine])
    expect(list.runs[0]).toMatchObject({ recipientName: "Trần Thị Bình", recipientPhone: "0901234567" })
    const raw = JSON.stringify(list)
    for (const hidden of ["850000", "Khách khó tính", "Nguyễn Văn An", "0987654321"]) expect(raw).not.toContain(hidden)

    await prisma.users.update({ where: { id: b.userId }, data: { phone: "0933221100" } })
    expect((await runs(b.token)).runs).toHaveLength(0)
  })

  it("báo lấy hàng → giao xong phải có ảnh; đơn của shipper khác hoặc tổ chức khác → 404", async () => {
    const id = await dispatched("0933221100")
    expect((await send(tuan.token, id, { event: "PICKED_UP" })).status).toBe(404)
    await prisma.users.update({ where: { id: b.userId }, data: { phone: "0933221100" } })
    expect((await send(b.token, id, { event: "PICKED_UP" })).status).toBe(404)

    expect((await send(hung.token, id, { event: "PICKED_UP" })).status).toBe(200)
    expect((await prisma.order_coordinations.findUniqueOrThrow({ where: { order_id: id } })).delivery_state).toBe("PICKED_UP")
    expect((await send(hung.token, id, { event: "DELIVERED_SUCCESS", recipient_signed_name: "Bình" })).status).toBe(422)

    const photo = await prisma.assets.create({
      data: { organization_id: a.organizationId, kind: "ORIGINAL", storage_key: `org/${a.organizationId}/unfiled/pod.png`, mime_type: "image/png", created_by: hung.userId },
    })
    expect((await send(hung.token, id, { event: "DELIVERED_SUCCESS", pod_asset_id: photo.id })).status).toBe(200)
    expect((await prisma.order_coordinations.findUniqueOrThrow({ where: { order_id: id } })).stage).toBe("DELIVERED")
    expect((await runs(hung.token)).runs).toHaveLength(0)
  })

  it("tài khoản chưa có số điện thoại → báo thiếu số, không thấy đơn nào", async () => {
    await dispatched("0933221100")
    await prisma.users.update({ where: { id: hung.userId }, data: { phone: null } })
    expect(await runs(hung.token)).toEqual({ phoneMissing: true, runs: [] })
  })

  it("Điều hành sửa số điện thoại Shipper → shipper thấy đơn; số sai → 400; tổ chức khác → 404; không phải Điều hành → 403", async () => {
    const id = await dispatched("0977000222")
    await prisma.users.update({ where: { id: hung.userId }, data: { phone: null } })
    const membership = await prisma.memberships.findFirstOrThrow({ where: { organization_id: a.organizationId, user_id: hung.userId } })
    const put = (token: string, phone: string | null) =>
      setPhone(withSession(`${BASE}/members/${membership.id}/phone`, token, { method: "PUT", body: JSON.stringify({ phone }) }), { params: Promise.resolve({ id: membership.id }) })

    expect((await put(a.token, "12ab")).status).toBe(400)
    expect((await put(b.token, "0977000222")).status).toBe(404)
    expect((await put(tuan.token, "0977000222")).status).toBe(403)
    expect((await put(a.token, "+84 977 000 222")).status).toBe(200)
    expect((await prisma.users.findUniqueOrThrow({ where: { id: hung.userId } })).phone).toBe("0977000222")
    expect((await runs(hung.token)).runs.map((r) => r.orderId)).toEqual([id])
  })
})
