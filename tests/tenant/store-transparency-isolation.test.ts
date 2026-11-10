import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { GET as transparency } from "@/app/api/v1/store/collection-transparency/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Cách ly tenant — minh bạch thu thập dữ liệu (audit API §25, 09/11/2026). Trước bản sửa, `?storeId=` đọc chi nhánh và
 * thoả thuận chia sẻ dữ liệu theo id không lọc tổ chức: tổ chức A gửi mã chi nhánh của B nhận về 200 kèm tên chi nhánh
 * và mức trần DSA của B. Khác tổ chức hoặc mã lạ → 404, không lộ là có tồn tại.
 */
const URL = "http://localhost/api/v1/store/collection-transparency"

describe("minh bạch thu thập — cách ly tổ chức", () => {
  let a: Tenant
  let b: Tenant
  let branchB: string

  beforeAll(async () => {
    await resetDatabase()
    a = await createTenant("minh-bach-a")
    b = await createTenant("minh-bach-b")
    branchB = (await prisma.branches.create({ data: { organization_id: b.organizationId, code: "BIMAT", name: "Chi nhánh riêng của B" } })).id
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("chi nhánh của tổ chức khác → 404, không trả tên chi nhánh", async () => {
    const res = await transparency(withSession(`${URL}?storeId=${branchB}`, a.token))
    const body = JSON.stringify(await readJson(res))
    expect(res.status).toBe(404)
    expect(body).not.toContain("Chi nhánh riêng của B")
  })

  it("mã chi nhánh không tồn tại → 404", async () => {
    expect((await transparency(withSession(`${URL}?storeId=${randomUUID()}`, a.token))).status).toBe(404)
  })

  it("chủ chi nhánh vẫn xem được chi nhánh của mình", async () => {
    const res = await transparency(withSession(`${URL}?storeId=${branchB}`, b.token))
    expect(res.status).toBe(200)
    expect(((await readJson(res)).data as { storeName: string }).storeName).toBe("Chi nhánh riêng của B")
  })
})
