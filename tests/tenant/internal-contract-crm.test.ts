import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-crm"
import { POST as consent } from "@/app/api/v1/crm/customers/[id]/consent/route"
import { POST as addOccasion } from "@/app/api/v1/crm/customers/[id]/occasions/route"
import { GET as customerOrders } from "@/app/api/v1/crm/customers/[id]/orders/route"
import { DELETE as deleteCustomer, GET as getCustomer, PATCH as patchCustomer } from "@/app/api/v1/crm/customers/[id]/route"
import { GET as exportCustomers } from "@/app/api/v1/crm/customers/export/route"
import { GET as listCustomers, POST as createCustomer } from "@/app/api/v1/crm/customers/route"
import { GET as upcoming } from "@/app/api/v1/crm/reminders/upcoming/route"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi khách hàng `/crm/*` (OpenAPI nội bộ, PO 07/11/2026) — CSDL thật, lược đồ strict. */
const BASE = "http://localhost/api/v1"
const ps = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) })

describe("hợp đồng — khách hàng", () => {
  let t: Tenant
  const get = (path: string) => withSession(`${BASE}${path}`, t.token)
  const send = (path: string, method: string, body?: unknown) =>
    withSession(`${BASE}${path}`, t.token, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-khach")
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("tạo, liệt kê, đọc, sửa, dịp kỷ niệm, đồng ý nhận tin, đơn của khách, nhắc dịp, xuất, xoá", async () => {
    const created = await expectContract(
      await createCustomer(send("/crm/customers", "POST", { name: "Chị Mai", phone: "0912345678", email: "mai@vi-du.test", tags: ["quen"], preferredFlowers: ["Hồng"] })),
      201,
      R.customerResponse,
      "customer"
    )
    const id = (created.customer as { id: string }).id
    const soon = new Date(Date.now() + 5 * 86_400_000)
    const mmdd = `${String(soon.getMonth() + 1).padStart(2, "0")}-${String(soon.getDate()).padStart(2, "0")}`
    await expectContract(
      await addOccasion(send(`/crm/customers/${id}/occasions`, "POST", { name: "Sinh nhật", date: mmdd, recipientName: "Mẹ", reminderDaysBefore: 7 }), ps({ id })),
      201,
      R.occasionResponse,
      "occasion"
    )
    await expectContract(await consent(send(`/crm/customers/${id}/consent`, "POST", { channel: "ZALO_ZNS", granted: true }), ps({ id })), 200, R.consentResponse, "consent")
    await expectContract(await consent(send(`/crm/customers/${id}/consent`, "POST", { channel: "SMS" }), ps({ id })), 200, R.consentResponse, "consent")
    await expectContract(await listCustomers(get("/crm/customers?limit=10")), 200, R.customersResponse, "customers")
    await expectContract(await getCustomer(get(`/crm/customers/${id}`), ps({ id })), 200, R.customerResponse, "customer")
    await expectContract(await patchCustomer(send(`/crm/customers/${id}`, "PATCH", { notes: "Thích giao sáng", address: "12 Lê Lợi" }), ps({ id })), 200, R.customerResponse, "customer")

    await ingestOrder(t.ctx, { source: "MANUAL", customerId: id, items: [{ description: "Bó cúc", quantity: 1, unitPriceVnd: 300_000 }] })
    const orders = await expectContract(await customerOrders(get(`/crm/customers/${id}/orders`), ps({ id })), 200, R.customerOrdersResponse, "customer-orders")
    expect(orders.data).toHaveLength(1)
    const reminders = await expectContract(await upcoming(get("/crm/reminders/upcoming?days=14")), 200, R.upcomingRemindersResponse, "reminders")
    expect(reminders.count).toBe(1)
    const xlsx = await exportCustomers(get("/crm/customers/export"))
    expect(xlsx.status).toBe(200)
    expect(xlsx.headers.get("content-type")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

    const other = await createCustomer(send("/crm/customers", "POST", { name: "Anh Tú", phone: "0987654321" }))
    const otherId = ((await other.json()) as { customer: { id: string } }).customer.id
    await expectContract(await deleteCustomer(send(`/crm/customers/${otherId}`, "DELETE"), ps({ id: otherId })), 200, R.deleteCustomerResponse, "customer-deleted")
  })
})
