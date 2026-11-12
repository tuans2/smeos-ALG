import { afterAll, beforeEach, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-crm"
import { POST as erase } from "@/app/api/v1/crm/customers/[id]/data-requests/erase/route"
import { POST as exportData } from "@/app/api/v1/crm/customers/[id]/data-requests/export/route"
import { POST as rectify } from "@/app/api/v1/crm/customers/[id]/data-requests/rectify/route"
import { PATCH as resolve } from "@/app/api/v1/crm/data-requests/[id]/route"
import { GET as listRequests } from "@/app/api/v1/crm/data-requests/route"
import { GET as viewSubcontract } from "@/app/api/v1/public/subcontract/[orderCode]/route"
import type { SubcontractOrderState } from "@/modules/greeting-card/domain/subcontract-order"
import { signSubcontractBranchToken } from "@/modules/greeting-card/infra/subcontract-link-token"
import { SubcontractOrderRepository } from "@/modules/greeting-card/infra/subcontract-order-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * ADR-014 D-P5, bước P-7a: khách yêu cầu xuất / xoá / sửa dữ liệu cá nhân. Xoá = ẩn danh xuyên bảng, giữ dòng tài chính
 * và hoá đơn VAT; chi nhánh được chia sẻ đơn thấy bản đã xoá; tổ chức khác không đụng được (404).
 */
const BASE = "http://localhost/api/v1"
const CODE = "DH261112-0001"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })

async function seed(t: Tenant, tag: string, phone: string) {
  const org = t.organizationId
  const c = await prisma.customers.create({ data: { organization_id: org, code: `KH-${tag}`, name: "Chị Lan", phone, email: "lan@vi-du.test", notes: "thích hồng" } })
  await prisma.customer_occasions.create({ data: { organization_id: org, customer_id: c.id, name: "Sinh nhật mẹ", date: "05-12", recipient_name: "Mẹ" } })
  await prisma.customer_consents.create({ data: { organization_id: org, customer_id: c.id, channel: "ZALO_ZNS", granted: true } })
  await prisma.leads.create({ data: { organization_id: org, customer_id: c.id, name: "Chị Lan", phone, source: "MANUAL", consent_at: new Date(), consent_version: "v1", message: "cần hoa cưới" } })
  const conv = await prisma.chat_conversations.create({ data: { organization_id: org, customer_id: c.id } })
  await prisma.chat_messages.create({ data: { organization_id: org, conversation_id: conv.id, sender_type: "USER", content: "Giao giúp em 12 Lý Thường Kiệt" } })
  const order = await prisma.orders.create({
    data: { organization_id: org, code: `${CODE}-${tag}`, source: "BROCHURE", status: "CONFIRMED", customer_id: c.id, total_vnd: 500_000, paid_vnd: 500_000, balance_vnd: 0, created_by: t.userId, card_message: "Chúc mừng sinh nhật" },
  })
  await prisma.order_recipients.create({
    data: { organization_id: org, order_id: order.id, recipient_name: "Bà Hoa", recipient_phone: "0100000003", address_line: "12 Lý Thường Kiệt", vat_company_name: "Công ty Hoa Việt", vat_tax_code: "0101234567" },
  })
  return { customerId: c.id, orderId: order.id, conversationId: conv.id, orderCode: order.code }
}

describe("yêu cầu của khách về dữ liệu cá nhân", () => {
  let a: Tenant
  let b: Tenant
  const post = (t: Tenant, path: string, body: unknown = {}) => withSession(`${BASE}${path}`, t.token, { method: "POST", body: JSON.stringify(body) })

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("yeu-cau-a")
    b = await createTenant("yeu-cau-b")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("xuất: gói có đủ bản ghi của khách, yêu cầu hoàn tất ngay; tổ chức khác → 404", async () => {
    const s = await seed(a, "a", "0100000001")
    const res = await exportData(post(a, `/crm/customers/${s.customerId}/data-requests/export`), ps(s.customerId))
    expect(res.status).toBe(201)
    const { data } = (await readJson(res)) as { data: { request: { status: string; result: Record<string, number> }; package: Record<string, unknown> } }
    expect(data.request).toMatchObject({ status: "COMPLETED", result: { customer: 1, occasions: 1, leads: 1, orders: 1, conversations: 1 } })
    expect(data.package["customer"]).toMatchObject({ name: "Chị Lan", phone: "0100000001" })
    expect(JSON.stringify(data.package["orders"])).toContain("Bà Hoa")

    expect((await exportData(post(b, `/crm/customers/${s.customerId}/data-requests/export`), ps(s.customerId))).status).toBe(404)
  })

  it("xoá: ẩn danh xuyên bảng, giữ đơn và hoá đơn VAT, thu hồi đồng ý; chi nhánh được chia sẻ thấy bản đã xoá", async () => {
    const s = await seed(a, "a", "0100000001")
    const other = await seed(b, "b", "0100000002")
    const repo = new SubcontractOrderRepository()
    await prisma.branches.create({ data: { organization_id: a.organizationId, name: "Chi nhánh CN-A", code: "CN-A", accepts_dispatch: true } })
    const state: SubcontractOrderState = {
      orderId: s.orderId, orderCode: s.orderCode, dispatchStatus: "OPEN", currentRound: 1, claimedBranchId: null, claimedAt: null,
      graceExpiresAt: null, declinedBranchIds: [], invitedBranchIds: ["CN-A"], roundExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    }
    await repo.saveSubcontractState(a.ctx, state)
    const branchView = async () => {
      const token = signSubcontractBranchToken(a.organizationId, s.orderCode, "CN-A", Date.now())
      const req = new Request(`${BASE}/public/subcontract/${s.orderCode}?${new URLSearchParams({ branch: "CN-A", t: token })}`)
      const res = await viewSubcontract(req, { params: Promise.resolve({ orderCode: s.orderCode }) })
      expect(res.status).toBe(200)
      return JSON.stringify(await res.json())
    }
    expect(await branchView()).toContain("Bà Hoa")

    expect((await erase(post(b, `/crm/customers/${s.customerId}/data-requests/erase`), ps(s.customerId))).status).toBe(404)
    const res = await erase(post(a, `/crm/customers/${s.customerId}/data-requests/erase`, { note: "khách gọi điện yêu cầu" }), ps(s.customerId))
    expect(res.status).toBe(201)
    const { data } = (await readJson(res)) as { data: { status: string; result: Record<string, number> } }
    expect(data).toMatchObject({ status: "COMPLETED", result: expect.objectContaining({ customers: 1, leads: 1, chat_messages: 1, order_recipients: 1 }) })

    expect(await prisma.customers.findUniqueOrThrow({ where: { id: s.customerId } })).toMatchObject({ name: "Khách đã xoá", phone: "ERASED", email: null, notes: null, phone_hash: null })
    expect(await prisma.customer_occasions.count({ where: { customer_id: s.customerId } })).toBe(0)
    expect((await prisma.customer_consents.findFirstOrThrow({ where: { customer_id: s.customerId } })).granted).toBe(false)
    expect(await prisma.leads.findFirstOrThrow({ where: { customer_id: s.customerId } })).toMatchObject({ name: "Khách đã xoá", phone: "ERASED", message: null })
    expect(await prisma.chat_messages.count({ where: { conversation_id: s.conversationId } })).toBe(0)
    const order = await prisma.orders.findUniqueOrThrow({ where: { id: s.orderId } })
    expect(order).toMatchObject({ customer_id: s.customerId, card_message: null })
    expect(Number(order.paid_vnd)).toBe(500_000)
    expect(await prisma.order_recipients.findUniqueOrThrow({ where: { order_id: s.orderId } })).toMatchObject({
      recipient_name: null, recipient_phone: null, address_line: null, vat_company_name: "Công ty Hoa Việt", vat_tax_code: "0101234567",
    })
    expect(await branchView()).not.toContain("Bà Hoa")

    // Tổ chức khác nguyên vẹn
    expect((await prisma.customers.findUniqueOrThrow({ where: { id: other.customerId } })).name).toBe("Chị Lan")
    expect(await prisma.chat_messages.count({ where: { conversation_id: other.conversationId } })).toBe(1)
  })

  it("xoá hai khách trong cùng tổ chức: không vướng khoá duy nhất số điện thoại", async () => {
    const first = await seed(a, "a1", "0100000001")
    const second = await seed(a, "a2", "0100000004")
    for (const id of [first.customerId, second.customerId]) {
      expect((await erase(post(a, `/crm/customers/${id}/data-requests/erase`), ps(id))).status).toBe(201)
    }
    expect(await prisma.customers.count({ where: { organization_id: a.organizationId, name: "Khách đã xoá", phone_hash: null } })).toBe(2)
  })

  it("hợp đồng phản hồi (lược đồ strict) của 5 operation", async () => {
    const s = await seed(a, "a", "0100000001")
    const path = (kind: string) => `/crm/customers/${s.customerId}/data-requests/${kind}`
    await expectContract(await exportData(post(a, path("export")), ps(s.customerId)), 201, R.dataExportResponse, "data-request-export")
    const pending = await expectContract(await rectify(post(a, path("rectify")), ps(s.customerId)), 201, R.dataRequestResponse, "data-request-rectify")
    await expectContract(await listRequests(withSession(`${BASE}/crm/data-requests?customer_id=${s.customerId}`, a.token)), 200, R.dataRequestsResponse, "data-requests")
    const id = (pending.data as { id: string }).id
    await expectContract(
      await resolve(withSession(`${BASE}/crm/data-requests/${id}`, a.token, { method: "PATCH", body: JSON.stringify({ status: "REJECTED", note: "đã sửa trực tiếp" }) }), ps(id)),
      200, R.dataRequestResponse, "data-request-resolved",
    )
    await expectContract(await erase(post(a, path("erase")), ps(s.customerId)), 201, R.dataRequestResponse, "data-request-erase")
  })

  it("sửa: ghi nhận đang chờ, đóng một lần; tổ chức khác không thấy, không đóng được", async () => {
    const s = await seed(a, "a", "0100000001")
    const res = await rectify(post(a, `/crm/customers/${s.customerId}/data-requests/rectify`, { note: "đổi địa chỉ" }), ps(s.customerId))
    const { data } = (await readJson(res)) as { data: { id: string; status: string; overdue: boolean } }
    expect(data).toMatchObject({ status: "RECEIVED", overdue: false })

    const list = async (t: Tenant) => ((await readJson(await listRequests(withSession(`${BASE}/crm/data-requests?status=RECEIVED`, t.token)))).data as unknown[]).length
    expect(await list(a)).toBe(1)
    expect(await list(b)).toBe(0)

    const patch = (t: Tenant, status: string) => resolve(withSession(`${BASE}/crm/data-requests/${data.id}`, t.token, { method: "PATCH", body: JSON.stringify({ status }) }), ps(data.id))
    expect((await patch(b, "COMPLETED")).status).toBe(404)
    expect((await patch(a, "COMPLETED")).status).toBe(200)
    expect((await patch(a, "REJECTED")).status).toBe(409)
    expect(await prisma.audit_logs.count({ where: { organization_id: a.organizationId, entity_type: "data_subject_requests" } })).toBe(2)
  })
})
