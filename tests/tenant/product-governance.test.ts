import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as crApprove } from "@/app/api/v1/product-change-requests/[id]/approve/route"
import { POST as crReject } from "@/app/api/v1/product-change-requests/[id]/reject/route"
import { GET as crQueue } from "@/app/api/v1/product-change-requests/route"
import { GET as crList, POST as crSubmit } from "@/app/api/v1/products/[id]/change-requests/route"
import { GET as revisionList } from "@/app/api/v1/products/[id]/revisions/route"
import { POST as revisionRestore } from "@/app/api/v1/products/[id]/revisions/[revisionId]/restore/route"
import { PATCH as productPatch } from "@/app/api/v1/products/[id]/route"
import { POST as batchImport } from "@/app/api/v1/products/batch-import/route"
import { POST as batchUndo } from "@/app/api/v1/products/import-batches/[id]/undo/route"
import { GET as batchList } from "@/app/api/v1/products/import-batches/route"
import { POST as productCreate } from "@/app/api/v1/products/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Giai đoạn 3 quản trị danh mục (PO 23/10/2026): `product_change_requests`,
 * `product_revisions`, `product_import_batches`. Tổ chức khác luôn 404.
 */
const U = "http://localhost/api/v1"
const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) })
const post = (body?: unknown) => ({ method: "POST", ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

describe("quản trị danh mục: đề xuất sửa, phiên bản, lô nhập", () => {
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

  async function official(code = "CT-1") {
    return readJson(await productCreate(withSession(`${U}/products`, a.token, post({ code, name: "Bó gốc", status: "ACTIVE", attributes: { price: 500_000 } }))))
  }

  it("nhân viên đề xuất sửa → bản gốc giữ nguyên; Điều hành duyệt một phần → lưu phiên bản", async () => {
    const product = await official()
    const id = product.id as string
    const dp = await addStaffWithSession(a, "dieu_phoi", "dp")

    const empty = await crSubmit(withSession(`${U}/products/${id}/change-requests`, dp.token, post({ name: "Bó gốc" })), params({ id }))
    expect(empty.status).toBe(422)
    const sent = await crSubmit(withSession(`${U}/products/${id}/change-requests`, dp.token, post({ name: "Bó mới", category: "Hoa chia buồn" })), params({ id }))
    expect(sent.status).toBe(201)
    const cr = await readJson(sent)
    expect((await prisma.products.findUniqueOrThrow({ where: { id } })).name).toBe("Bó gốc")

    // Điều hành tự sửa không cần đề xuất.
    expect((await crSubmit(withSession(`${U}/products/${id}/change-requests`, a.token, post({ name: "x" })), params({ id }))).status).toBe(422)

    const queue = await readJson(await crQueue(withSession(`${U}/product-change-requests`, a.token)))
    expect((queue.data as unknown[]).length).toBe(1)
    expect(((await readJson(await crQueue(withSession(`${U}/product-change-requests`, b.token)))).data as unknown[]).length).toBe(0)
    expect((await crList(withSession(`${U}/products/${id}/change-requests`, dp.token), params({ id }))).status).toBe(403)

    // Tổ chức khác không duyệt / từ chối được.
    const crId = cr.id as string
    expect((await crApprove(withSession(`${U}/product-change-requests/${crId}/approve`, b.token, post({})), params({ id: crId }))).status).toBe(404)
    expect((await crReject(withSession(`${U}/product-change-requests/${crId}/reject`, b.token, post({ reason: "x" })), params({ id: crId }))).status).toBe(404)

    const ok = await crApprove(withSession(`${U}/product-change-requests/${crId}/approve`, a.token, post({ fields: ["name"] })), params({ id: crId }))
    expect(ok.status).toBe(200)
    const after = await prisma.products.findUniqueOrThrow({ where: { id } })
    expect(after.name).toBe("Bó mới")
    expect(after.category).toBeNull()
    expect(await prisma.product_change_requests.findUniqueOrThrow({ where: { id: crId } })).toMatchObject({ status: "PARTIAL" })
    expect(await prisma.product_revisions.count({ where: { product_id: id, reason: "CHANGE_REQUEST" } })).toBe(1)

    // Duyệt lần hai → đã xử lý.
    expect((await crApprove(withSession(`${U}/product-change-requests/${crId}/approve`, a.token, post({})), params({ id: crId }))).status).toBe(422)
  })

  it("bản gốc đổi sau khi gửi đề xuất → duyệt bị 409, từ chối được", async () => {
    const product = await official()
    const id = product.id as string
    const sale = await addStaffWithSession(a, "sale", "sale")
    const cr = await readJson(await crSubmit(withSession(`${U}/products/${id}/change-requests`, sale.token, post({ name: "Đề xuất" })), params({ id })))
    await new Promise((r) => setTimeout(r, 5))
    await productPatch(withSession(`${U}/products/${id}`, a.token, { method: "PATCH", body: JSON.stringify({ name: "Điều hành sửa" }) }), params({ id }))

    const crId = cr.id as string
    expect((await crApprove(withSession(`${U}/product-change-requests/${crId}/approve`, a.token, post({})), params({ id: crId }))).status).toBe(409)
    expect((await crReject(withSession(`${U}/product-change-requests/${crId}/reject`, a.token, post({ reason: "Đã sửa" })), params({ id: crId }))).status).toBe(200)
  })

  it("Điều hành sửa → có phiên bản; khôi phục đưa nội dung về bản cũ; tổ chức khác 404", async () => {
    const product = await official()
    const id = product.id as string
    await productPatch(withSession(`${U}/products/${id}`, a.token, { method: "PATCH", body: JSON.stringify({ name: "Tên mới" }) }), params({ id }))

    const list = await readJson(await revisionList(withSession(`${U}/products/${id}/revisions`, a.token), params({ id })))
    const revisions = list.data as Array<{ id: string; reason: string }>
    expect(revisions[0]).toMatchObject({ reason: "EDIT" })
    expect((await revisionList(withSession(`${U}/products/${id}/revisions`, b.token), params({ id }))).status).toBe(404)

    const revisionId = revisions[0]!.id
    expect((await revisionRestore(withSession(`${U}/products/${id}/revisions/${revisionId}/restore`, b.token, post()), params({ id, revisionId }))).status).toBe(404)
    expect((await revisionRestore(withSession(`${U}/products/${id}/revisions/${revisionId}/restore`, a.token, post()), params({ id, revisionId }))).status).toBe(200)
    expect((await prisma.products.findUniqueOrThrow({ where: { id } })).name).toBe("Bó gốc")
  })

  it("hoàn tác lô nhập: mẫu mới vào thùng rác, mẫu bị cập nhật trả về bản trước; tổ chức khác 404", async () => {
    const existing = await official("CT-OLD")
    const res = await batchImport(withSession(`${U}/products/batch-import`, a.token, post({
      items: [
        { code: "CT-OLD", name: "Tên ghi đè" },
        { code: "NEW-1", name: "Mẫu mới từ Excel" },
      ],
      overwrite_existing: true,
    })))
    expect(res.status).toBe(201)
    const body = (await readJson(res)).data as Record<string, unknown>
    const batchId = body.batch_id as string
    expect((await prisma.products.findUniqueOrThrow({ where: { id: existing.id as string } })).name).toBe("Tên ghi đè")
    expect(await prisma.product_import_batches.count({ where: { id: batchId } })).toBe(1)

    const listed = await readJson(await batchList(withSession(`${U}/products/import-batches`, a.token)))
    expect((listed.data as Array<{ id: string; canUndo: boolean }>).find((x) => x.id === batchId)?.canUndo).toBe(true)
    expect(((await readJson(await batchList(withSession(`${U}/products/import-batches`, b.token)))).data as unknown[]).length).toBe(0)

    expect((await batchUndo(withSession(`${U}/products/import-batches/${batchId}/undo`, b.token, post()), params({ id: batchId }))).status).toBe(404)
    const undone = await readJson(await batchUndo(withSession(`${U}/products/import-batches/${batchId}/undo`, a.token, post()), params({ id: batchId })))
    expect(undone).toMatchObject({ trashed: 1, restored: 1, failedCount: 0 })
    expect((await prisma.products.findUniqueOrThrow({ where: { id: existing.id as string } })).name).toBe("Bó gốc")
    expect((await prisma.products.findFirstOrThrow({ where: { code: "NEW-1" } })).status).toBe("ARCHIVED")
    expect((await batchUndo(withSession(`${U}/products/import-batches/${batchId}/undo`, a.token, post()), params({ id: batchId }))).status).toBe(422)
  })
})
