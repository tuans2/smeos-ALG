import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"
import { POST as postDeliverBeforePay } from "@/app/api/v1/orders/[id]/deliver-before-pay/route"
import { POST as postQuote } from "@/app/api/v1/orders/[id]/quote/route"
import { GET as listRequests } from "@/app/api/v1/orders/approval-requests/route"
import { POST as postDecision } from "@/app/api/v1/orders/approval-requests/[requestId]/decision/route"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"
import { remindCollectDue } from "@/modules/orders/use-cases/remind-collect-due"
import { CollectDueRepository } from "@/modules/orders/infra/collect-due-repository"
import { GET as getCoordinationQueue } from "@/app/api/v1/orders/coordination-queue/route"

/**
 * Đơn hàng đa nguồn P3 — yêu cầu duyệt theo đơn (`order_approval_requests`), báo giá ngoài Thẻ chào.
 * Mọi thao tác trên đơn/yêu cầu của tổ chức khác → 404; đơn Thẻ chào không đi qua đường này.
 */
const BASE = "http://localhost/api/v1"
const strictPolicy = { brochure_policy: { require_full_before_dispatch: true } }

describe("cách ly tenant — yêu cầu duyệt giao trước thu sau, báo giá", () => {
  let a: Tenant
  let b: Tenant
  let orderId: string

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: strictPolicy } })
    orderId = (await ingestOrder(a.ctx, { source: "MANUAL", items: [{ description: "Kệ hoa khai trương", quantity: 1, unitPriceVnd: 3_000_000 }] })).id
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  const params = (id: string) => ({ params: Promise.resolve({ id }) })

  it("A xin → chờ Điều hành (ngoài hạn mức); B không xin được, không thấy, không duyệt được (404)", async () => {
    const req = withSession(`${BASE}/orders/${orderId}/deliver-before-pay`, a.token, { method: "POST", body: JSON.stringify({ reason: "Khách công ty" }) })
    const res = await postDeliverBeforePay(req, params(orderId))
    expect(res.status).toBe(201)
    const row = await prisma.order_approval_requests.findFirstOrThrow()
    expect(row).toMatchObject({ organization_id: a.organizationId, status: "PENDING", requested_by: a.userId })

    const other = withSession(`${BASE}/orders/${orderId}/deliver-before-pay`, b.token, { method: "POST", body: JSON.stringify({ reason: "x" }) })
    expect((await postDeliverBeforePay(other, params(orderId))).status).toBe(404)

    const listB = (await readJson(await listRequests(withSession(`${BASE}/orders/approval-requests`, b.token)))) as { items: unknown[] }
    expect(listB.items).toEqual([])

    const decideB = withSession(`${BASE}/orders/approval-requests/${row.id}/decision`, b.token, { method: "POST", body: JSON.stringify({ approve: true }) })
    expect((await postDecision(decideB, { params: Promise.resolve({ requestId: row.id }) })).status).toBe(404)
    expect((await prisma.order_approval_requests.findUniqueOrThrow({ where: { id: row.id } })).status).toBe("PENDING")
    expect(await prisma.order_coordinations.count()).toBe(0)
  })

  it("Điều hành A duyệt → đơn sang Điều phối của A, workflow STANDARD; duyệt lần hai → 409", async () => {
    await postDeliverBeforePay(withSession(`${BASE}/orders/${orderId}/deliver-before-pay`, a.token, { method: "POST", body: JSON.stringify({ reason: "Khách công ty" }) }), params(orderId))
    const row = await prisma.order_approval_requests.findFirstOrThrow()
    const decideAs = (token: string) => postDecision(
      withSession(`${BASE}/orders/approval-requests/${row.id}/decision`, token, { method: "POST", body: JSON.stringify({ approve: true, note: "Đã gọi xác nhận" }) }),
      { params: Promise.resolve({ requestId: row.id }) },
    )
    // Người tạo phiếu không tự duyệt (checklist ALG 9.12)
    expect((await decideAs(a.token)).status).toBe(422)
    const secondManager = await addStaffWithSession(a, "dieu_hanh", "dieu-hanh-2")
    const decide = () => decideAs(secondManager.token)
    expect((await decide()).status).toBe(200)
    const coord = await prisma.order_coordinations.findUniqueOrThrow({ where: { order_id: orderId } })
    expect(coord).toMatchObject({ organization_id: a.organizationId, stage: "INTAKE", source: "MANUAL" })
    expect((await prisma.orders.findUniqueOrThrow({ where: { id: orderId } })).workflow).toBe("STANDARD")
    expect((await decide()).status).toBe(409)
    const qa = (await readJson(await getCoordinationQueue(withSession(`${BASE}/orders/coordination-queue`, a.token)))) as { items: { orderId: string }[] }
    const qb = (await readJson(await getCoordinationQueue(withSession(`${BASE}/orders/coordination-queue`, b.token)))) as { items: unknown[] }
    expect(qa.items.map((i) => i.orderId)).toEqual([orderId])
    expect(qb.items).toEqual([])
  })

  it("báo giá: chỉ đơn của mình; B → 404 và giá không đổi", async () => {
    const draft = await ingestOrder(a.ctx, { source: "CHAT", items: [{ description: "Mẫu ngoài danh mục", quantity: 1, unitPriceVnd: 0 }] })
    const quote = (t: Tenant) => postQuote(withSession(`${BASE}/orders/${draft.id}/quote`, t.token, { method: "POST", body: JSON.stringify({ totalVnd: 1_200_000 }) }), params(draft.id))
    expect((await quote(b)).status).toBe(404)
    expect(Number((await prisma.orders.findUniqueOrThrow({ where: { id: draft.id } })).total_vnd)).toBe(0)
    expect((await quote(a)).status).toBe(200)
    expect(Number((await prisma.orders.findUniqueOrThrow({ where: { id: draft.id } })).total_vnd)).toBe(1_200_000)
  })

  it("quá hạn thu: nhắc đúng tổ chức của đơn, một lần", async () => {
    await prisma.order_approval_requests.create({
      data: {
        organization_id: a.organizationId, order_id: orderId, kind: "DELIVER_BEFORE_PAY", status: "APPROVED", reason: "Khách công ty",
        requested_by: a.userId, collect_due_at: new Date(Date.now() - 60_000),
      },
    })
    const sent: { organizationId: string }[] = []
    const notify = async (input: { organizationId: string }) => (sent.push(input), 1)
    expect((await remindCollectDue(new Date(), undefined, notify as never)).reminded).toBe(1)
    expect((await remindCollectDue(new Date(), undefined, notify as never)).reminded).toBe(0)
    expect(sent.map((x) => x.organizationId)).toEqual([a.organizationId])
    expect(await prisma.order_events.count({ where: { organization_id: b.organizationId } })).toBe(0)
  })

  // Audit BL-09 (06/11/2026): lọc "đã nhắc" sau `take` → khi trang đầu toàn đơn đã nhắc, đơn mới không bao giờ lọt vào.
  it("quá hạn thu: đơn đã nhắc không chiếm chỗ trang — đơn quá hạn mới vẫn được lấy", async () => {
    const second = (await ingestOrder(a.ctx, { source: "MANUAL", items: [{ description: "Bó hoa", quantity: 1, unitPriceVnd: 500_000 }] })).id
    for (const [id, minutesAgo] of [[orderId, 120], [second, 60]] as const) {
      await prisma.order_approval_requests.create({
        data: {
          organization_id: a.organizationId, order_id: id, kind: "DELIVER_BEFORE_PAY", status: "APPROVED", reason: "Khách quen",
          requested_by: a.userId, collect_due_at: new Date(Date.now() - minutesAgo * 60_000),
        },
      })
    }
    const repo = new CollectDueRepository()
    await repo.markReminded(a.organizationId, orderId, "DRAFT")
    const page = await repo.listOverdue(new Date(), 1)
    expect(page.map((r) => r.order.id)).toEqual([second])
  })

  // PO 07/11/2026 (Q7), audit BL-15: trần công nợ theo tổng còn phải thu của các đơn khách đã được giao trước
  it("trần công nợ: khách đã nợ 2.000.000 ở đơn giao trước, đơn mới vượt trần 3.000.000 → chờ Điều hành", async () => {
    const customer = await prisma.customers.create({ data: { organization_id: a.organizationId, code: "KH-0001", name: "Khách quen", phone: "0901234567" } })
    await prisma.organizations.update({
      where: { id: a.organizationId },
      data: { settings: { ...strictPolicy, order_deliver_before_pay: { customerDebtCapVnd: 3_000_000, minCompletedOrders: 0, selfDecideMaxVnd: 5_000_000 } } },
    })
    const old = (await ingestOrder(a.ctx, { source: "MANUAL", customerId: customer.id, items: [{ description: "Đơn cũ", quantity: 1, unitPriceVnd: 2_000_000 }] })).id
    await prisma.order_approval_requests.create({
      data: { organization_id: a.organizationId, order_id: old, kind: "DELIVER_BEFORE_PAY", status: "APPROVED", reason: "Khách quen", requested_by: a.userId, collect_due_at: new Date(Date.now() + 86_400_000) },
    })
    const ask = async (amount: number) => {
      const id = (await ingestOrder(a.ctx, { source: "MANUAL", customerId: customer.id, items: [{ description: "Đơn mới", quantity: 1, unitPriceVnd: amount }] })).id
      const res = await postDeliverBeforePay(withSession(`${BASE}/orders/${id}/deliver-before-pay`, a.token, { method: "POST", body: JSON.stringify({ reason: "Khách quen" }) }), params(id))
      expect(res.status).toBe(201)
      return (await prisma.order_approval_requests.findFirstOrThrow({ where: { order_id: id } })).status
    }
    expect(await ask(900_000)).toBe("AUTO_APPROVED")
    // Nợ đang mở giờ 2.900.000 → đơn 500.000 vượt trần
    expect(await ask(500_000)).toBe("PENDING")
  })
})
