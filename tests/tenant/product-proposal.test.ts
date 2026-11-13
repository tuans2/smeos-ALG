import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as approveRoute } from "@/app/api/v1/products/[id]/approve/route"
import { PATCH as productPatch } from "@/app/api/v1/products/[id]/route"
import { POST as productCreate } from "@/app/api/v1/products/route"
import { POST as batchImport } from "@/app/api/v1/products/batch-import/route"
import { POST as rejectRoute } from "@/app/api/v1/products/[id]/reject/route"
import { GET as productList } from "@/app/api/v1/products/route"
import { sweepProductProposals } from "@/modules/products/use-cases/sweep-product-proposals"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * PO 23/10/2026 — giai đoạn 1 quản trị danh mục: Sale tạo mẫu đề xuất (dùng
 * được ngay, báo Điều hành), không ai ngoài Điều hành ghi đè mẫu chính thức,
 * Điều phối vẫn tạm ẩn được, chỉ Điều hành nhập Excel, tổ chức khác → 404.
 */
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const json = (body: unknown) => ({ method: "POST", body: JSON.stringify(body) })
const patch = (body: unknown) => ({ method: "PATCH", body: JSON.stringify(body) })

describe("sản phẩm: mẫu đề xuất và mẫu chính thức", () => {
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

  it("Sale tạo mẫu → dùng được ngay, mang nhãn đề xuất; Điều hành duyệt được", async () => {
    const sale = await addStaffWithSession(a, "sale", "sale")
    const res = await productCreate(withSession("http://localhost/api/v1/products", sale.token, json({ code: "DX-1", name: "Bó mới", status: "ACTIVE", attributes: { proposal: { status: "approved", byUserId: "gia-mao" } } })))
    expect(res.status).toBe(201)
    const created = await readJson(res)
    expect(created.status).toBe("ACTIVE")
    expect((created.attributes as Record<string, unknown>).proposal).toMatchObject({ status: "pending", byUserId: sale.userId })

    // Sale sửa được mẫu đề xuất của chính mình.
    const own = await productPatch(withSession(`http://localhost/api/v1/products/${created.id}`, sale.token, patch({ name: "Bó mới sửa" })), params(created.id as string))
    expect(own.status).toBe(200)

    const approved = await approveRoute(withSession(`http://localhost/api/v1/products/${created.id}/approve`, a.token, { method: "POST" }), params(created.id as string))
    expect(approved.status).toBe(200)
    const stored = (await prisma.products.findUniqueOrThrow({ where: { id: created.id as string } })).attributes as Record<string, unknown>
    expect(stored.proposal).toMatchObject({ status: "approved", byUserId: sale.userId })
    expect(await prisma.audit_logs.count({ where: { action: "product.approve", entity_id: created.id as string } })).toBe(1)

    // Đã duyệt = chính thức: Sale không sửa được nữa.
    const after = await productPatch(withSession(`http://localhost/api/v1/products/${created.id}`, sale.token, patch({ name: "Đổi lén" })), params(created.id as string))
    expect(after.status).toBe(403)
  })

  it("Điều phối không ghi đè mẫu chính thức nhưng tạm ẩn / mở bán được", async () => {
    const created = await readJson(await productCreate(withSession("http://localhost/api/v1/products", a.token, json({ code: "CT-1", name: "Mẫu chính thức", status: "ACTIVE" }))))
    expect((created.attributes as Record<string, unknown> | null)?.proposal).toBeUndefined()
    const dp = await addStaffWithSession(a, "dieu_phoi", "dp")
    const url = `http://localhost/api/v1/products/${created.id}`

    expect((await productPatch(withSession(url, dp.token, patch({ name: "Ghi đè" })), params(created.id as string))).status).toBe(403)
    expect((await productPatch(withSession(url, dp.token, patch({ status: "DRAFT" })), params(created.id as string))).status).toBe(200)
    expect((await productPatch(withSession(url, dp.token, patch({ status: "ACTIVE" })), params(created.id as string))).status).toBe(200)
  })

  it("chỉ Điều hành duyệt; duyệt mẫu của tổ chức khác → 404", async () => {
    const sale = await addStaffWithSession(a, "sale", "sale")
    const created = await readJson(await productCreate(withSession("http://localhost/api/v1/products", sale.token, json({ code: "DX-2", name: "Bó" }))))
    const url = `http://localhost/api/v1/products/${created.id}/approve`

    expect((await approveRoute(withSession(url, sale.token, { method: "POST" }), params(created.id as string))).status).toBe(403)
    expect((await approveRoute(withSession(url, b.token, { method: "POST" }), params(created.id as string))).status).toBe(404)
  })

  it("chỉ Điều hành nhập Excel", async () => {
    const dp = await addStaffWithSession(a, "dieu_phoi", "dp")
    const res = await batchImport(withSession("http://localhost/api/v1/products/batch-import", dp.token, json({ products: [] })))
    expect(res.status).toBe(403)
  })

  it("Điều hành từ chối kèm lý do → mẫu tạm ẩn, người đề xuất không sửa được nữa; tổ chức khác → 404", async () => {
    const sale = await addStaffWithSession(a, "sale", "sale")
    const created = await readJson(await productCreate(withSession("http://localhost/api/v1/products", sale.token, json({ code: "DX-3", name: "Bó", status: "ACTIVE" }))))
    const id = created.id as string
    const url = `http://localhost/api/v1/products/${id}/reject`

    expect((await rejectRoute(withSession(url, a.token, json({ reason: "" })), params(id))).status).toBe(400)
    expect((await rejectRoute(withSession(url, b.token, json({ reason: "Trùng" })), params(id))).status).toBe(404)
    expect((await rejectRoute(withSession(url, a.token, json({ reason: "Trùng mẫu có sẵn" })), params(id))).status).toBe(200)

    const stored = await prisma.products.findUniqueOrThrow({ where: { id } })
    expect(stored.status).toBe("DRAFT")
    expect((stored.attributes as Record<string, unknown>).proposal).toMatchObject({ status: "rejected", note: "Trùng mẫu có sẵn" })
    const edit = await productPatch(withSession(`http://localhost/api/v1/products/${id}`, sale.token, patch({ status: "ACTIVE" })), params(id))
    expect(edit.status).toBe(403)
  })

  it("hàng chờ duyệt chỉ trả mẫu đề xuất đang chờ của đúng tổ chức", async () => {
    const sale = await addStaffWithSession(a, "sale", "sale")
    await productCreate(withSession("http://localhost/api/v1/products", sale.token, json({ code: "DX-4", name: "Chờ" })))
    await productCreate(withSession("http://localhost/api/v1/products", a.token, json({ code: "CT-4", name: "Chính thức" })))
    await productCreate(withSession("http://localhost/api/v1/products", b.token, json({ code: "B-4", name: "Khác tổ chức" })))

    const list = await readJson(await productList(withSession("http://localhost/api/v1/products?proposal=pending", a.token)))
    expect((list.data as Array<{ code: string }>).map((p) => p.code)).toEqual(["DX-4"])
  })

  it("tác vụ quét: hết hạn sau 30 ngày → tạm ẩn; 30 ngày sau nữa → vào thùng rác", async () => {
    const sale = await addStaffWithSession(a, "sale", "sale")
    const created = await readJson(await productCreate(withSession("http://localhost/api/v1/products", sale.token, json({ code: "DX-5", name: "Bó", status: "ACTIVE" }))))
    const id = created.id as string
    const start = new Date((created.attributes as { proposal: { at: string } }).proposal.at)
    const day = (n: number) => new Date(start.getTime() + n * 86_400_000)

    expect(await sweepProductProposals(day(7))).toMatchObject({ reminded: 1 })
    expect(await sweepProductProposals(day(8))).toMatchObject({ reminded: 0 })
    expect(await sweepProductProposals(day(31))).toMatchObject({ expired: 1 })
    expect((await prisma.products.findUniqueOrThrow({ where: { id } })).status).toBe("DRAFT")
    expect(await sweepProductProposals(day(62))).toMatchObject({ purged: 1 })
    expect((await prisma.products.findUniqueOrThrow({ where: { id } })).status).toBe("ARCHIVED")
  })
})
