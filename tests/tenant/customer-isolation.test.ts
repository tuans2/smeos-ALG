import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listCustomers, POST as createCustomer } from "@/app/api/v1/crm/customers/route"
import { GET as getCustomerById, PATCH as patchCustomer, DELETE as deleteCustomer } from "@/app/api/v1/crm/customers/[id]/route"
import { POST as addOccasion } from "@/app/api/v1/crm/customers/[id]/occasions/route"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"
import type { CustomerMasterIndex } from "@/modules/crm/domain/customer-master-index"

const BASE = "http://localhost/api/v1/crm"

describe("cách ly tenant — CRM & Khách hàng ngành hoa M09 (P21)", () => {
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

  it("POST /crm/customers rồi GET /crm/customers/:id chỉ đọc lại được bằng chính tổ chức đã tạo (404 cho bên khác)", async () => {
    const resCreate = await createCustomer(
      withSession(`${BASE}/customers`, a.token, {
        method: "POST",
        body: JSON.stringify({
          name: "Chị Ngọc Anh",
          phone: "0909111222",
          address: "123 Lê Lợi, Q1",
          preferredFlowers: ["Hồng Ecuador"],
        }),
      })
    )
    expect(resCreate.status).toBe(201)
    const { customer } = (await readJson(resCreate)) as { customer: { id: string } }
    const id = customer.id as string

    // Tổ chức A đọc lại được
    const ownRead = await getCustomerById(withSession(`${BASE}/customers/${id}`, a.token), {
      params: Promise.resolve({ id }),
    })
    expect(ownRead.status).toBe(200)
    const ownData = (await readJson(ownRead)) as { customer: CustomerMasterIndex }
    expect(ownData.customer.name).toBe("Chị Ngọc Anh")
    expect(ownData.customer.preferences.preferredFlowers).toContain("Hồng Ecuador")

    // Tổ chức B đọc -> 404
    const otherRead = await getCustomerById(withSession(`${BASE}/customers/${id}`, b.token), {
      params: Promise.resolve({ id }),
    })
    expect(otherRead.status).toBe(404)
  })

  it("PATCH /crm/customers/:id và DELETE từ tổ chức khác trả về 404", async () => {
    const resCreate = await createCustomer(
      withSession(`${BASE}/customers`, a.token, {
        method: "POST",
        body: JSON.stringify({
          name: "Anh Minh",
          phone: "0909333444",
        }),
      })
    )
    const { customer } = (await readJson(resCreate)) as { customer: { id: string } }
    const id = customer.id as string

    // Tổ chức B cố sửa -> 404
    const resPatchB = await patchCustomer(
      withSession(`${BASE}/customers/${id}`, b.token, {
        method: "PATCH",
        body: JSON.stringify({ name: "Tên đã bị sửa trộm" }),
      }),
      { params: Promise.resolve({ id }) }
    )
    expect(resPatchB.status).toBe(404)

    // Tổ chức B cố xoá -> 404
    const resDeleteB = await deleteCustomer(
      withSession(`${BASE}/customers/${id}`, b.token, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id }) }
    )
    expect(resDeleteB.status).toBe(404)
  })

  it("GET /crm/customers chỉ trả về khách hàng thuộc tổ chức của mình", async () => {
    await createCustomer(
      withSession(`${BASE}/customers`, a.token, {
        method: "POST",
        body: JSON.stringify({ name: "Khách A1", phone: "0901111111" }),
      })
    )
    await createCustomer(
      withSession(`${BASE}/customers`, a.token, {
        method: "POST",
        body: JSON.stringify({ name: "Khách A2", phone: "0902222222" }),
      })
    )
    await createCustomer(
      withSession(`${BASE}/customers`, b.token, {
        method: "POST",
        body: JSON.stringify({ name: "Khách B1", phone: "0903333333" }),
      })
    )

    const resListA = await listCustomers(withSession(`${BASE}/customers`, a.token))
    const dataA = (await readJson(resListA)) as { items: CustomerMasterIndex[] }
    expect(dataA.items.length).toBe(2)

    const resListB = await listCustomers(withSession(`${BASE}/customers`, b.token))
    const dataB = (await readJson(resListB)) as { items: CustomerMasterIndex[] }
    expect(dataB.items.length).toBe(1)
    expect(dataB.items[0]?.name).toBe("Khách B1")
  })

  it("thêm ngày kỷ niệm qua POST /crm/customers/:id/occasions không rò rỉ sang tổ chức khác", async () => {
    const resCreate = await createCustomer(
      withSession(`${BASE}/customers`, a.token, {
        method: "POST",
        body: JSON.stringify({ name: "Khách Thân Thiết", phone: "0909555666" }),
      })
    )
    const { customer } = (await readJson(resCreate)) as { customer: { id: string } }
    const id = customer.id as string

    // Tổ chức B cố thêm dịp -> 404
    const resOccasionB = await addOccasion(
      withSession(`${BASE}/customers/${id}/occasions`, b.token, {
        method: "POST",
        body: JSON.stringify({ name: "Kỷ niệm", date: "10-20" }),
      }),
      { params: Promise.resolve({ id }) }
    )
    expect(resOccasionB.status).toBe(404)

    // Tổ chức A thêm dịp -> 201
    const resOccasionA = await addOccasion(
      withSession(`${BASE}/customers/${id}/occasions`, a.token, {
        method: "POST",
        body: JSON.stringify({ name: "Sinh nhật bạn gái", date: "10-20" }),
      }),
      { params: Promise.resolve({ id }) }
    )
    expect(resOccasionA.status).toBe(201)
  })
})
