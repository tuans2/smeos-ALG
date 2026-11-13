import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"
import { GET as getLeadQueue } from "@/app/api/v1/orders/lead-queue/route"
import { GET as getEntryActions, PUT as putEntryActions } from "@/app/api/v1/orders/entry-actions/route"
import { POST as postLead } from "@/app/api/v1/leads/route"
import { recoverPaymentTimeoutLeads } from "@/modules/acquisition/use-cases/recover-payment-timeout-leads"
import { PAYMENT_TIMEOUT_REASON } from "@/modules/greeting-card/domain/background-sweep"

/**
 * Đơn hàng đa nguồn P2 (`KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md` §3): hàng đợi lead, lead do Sale nhập,
 * cài đặt nút trang khách và lead cứu đơn quá hạn — mọi thứ chỉ trong tổ chức của mình.
 */
const BASE = "http://localhost/api/v1"

type QueueBody = { items: { key: string; kind: string; name: string | null }[] }

async function seedSession(t: Tenant, customerName: string) {
  const catalog = await prisma.greeting_catalogs.create({
    data: { organization_id: t.organizationId, code: `cc-${t.organizationId.slice(0, 6)}`, name: "BST", created_by: t.userId },
  })
  await prisma.greeting_sessions.create({
    data: {
      organization_id: t.organizationId, catalog_id: catalog.id, send_code: `T-${t.organizationId.slice(0, 6)}`,
      sale_id: t.userId, customer_name: customerName, status: "SELECTED",
    },
  })
}

describe("cách ly tenant — hàng đợi lead, lead Sale nhập, nút trang khách, lead cứu đơn", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("POST /leads ghi vào tổ chức của phiên; hàng đợi B không thấy lead hay phiên Thẻ chào của A", async () => {
    const res = await postLead(withSession(`${BASE}/leads`, a.token, {
      method: "POST",
      body: JSON.stringify({ name: "Lan", phone: "0901234567", reason: "WALK_IN" }),
    }))
    expect(res.status).toBe(201)
    const lead = await prisma.leads.findFirstOrThrow()
    expect(lead.organization_id).toBe(a.organizationId)
    expect(lead.source).toBe("MANUAL")
    expect(lead.assignee_user_id).toBe(a.userId)
    await seedSession(a, "Hoa")

    const qa = (await readJson(await getLeadQueue(withSession(`${BASE}/orders/lead-queue`, a.token)))) as QueueBody
    expect(qa.items.map((i) => i.kind).sort()).toEqual(["BROCHURE_SESSION", "LEAD"])
    const qb = (await readJson(await getLeadQueue(withSession(`${BASE}/orders/lead-queue`, b.token)))) as QueueBody
    expect(qb.items).toEqual([])
  })

  it("PUT /orders/entry-actions chỉ đổi cài đặt của tổ chức mình", async () => {
    const res = await putEntryActions(withSession(`${BASE}/orders/entry-actions`, a.token, {
      method: "PUT",
      body: JSON.stringify({ bySource: { LANDING: { contact: false } } }),
    }))
    expect(res.status).toBe(200)
    const vb = (await readJson(await getEntryActions(withSession(`${BASE}/orders/entry-actions`, b.token)))) as {
      sources: { code: string; effective: { contact: boolean } }[]
    }
    expect(vb.sources.find((s) => s.code === "LANDING")?.effective.contact).toBe(true)
    const orgB = await prisma.organizations.findUniqueOrThrow({ where: { id: b.organizationId } })
    expect((orgB.settings as Record<string, unknown> | null)?.order_entry_actions).toBeUndefined()
  })

  it("đơn A quá hạn thanh toán → lead cứu đơn nằm ở A; chạy lại không tạo trùng", async () => {
    const customer = await prisma.customers.create({ data: { organization_id: a.organizationId, code: "KH-0001", name: "Mai", phone: "0912345678" } })
    const order = await prisma.orders.create({
      data: {
        organization_id: a.organizationId, code: "TC-0001", customer_id: customer.id, status: "CANCELLED",
        total_vnd: 500_000, balance_vnd: 500_000, created_by: a.userId, source: "BROCHURE",
        events: { create: { axis: "order", from_value: "DRAFT", to_value: "CANCELLED", reason: PAYMENT_TIMEOUT_REASON } },
      },
    })
    expect((await recoverPaymentTimeoutLeads()).created).toBe(1)
    expect((await recoverPaymentTimeoutLeads()).created).toBe(0)
    const leads = await prisma.leads.findMany()
    expect(leads).toHaveLength(1)
    expect(leads[0]).toMatchObject({ organization_id: a.organizationId, reason: "PAYMENT_TIMEOUT", source_ref: order.id, phone: "0912345678" })
    expect(await prisma.leads.count({ where: { organization_id: b.organizationId } })).toBe(0)
  })
})
