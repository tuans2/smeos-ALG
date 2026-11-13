import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { PATCH as productPatch } from "@/app/api/v1/products/[id]/route"
import { POST as bulkStatus } from "@/app/api/v1/products/bulk-status/route"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { ProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { listProductMasterIndex } from "@/modules/products/use-cases/get-product-master-index"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Checklist ALG 7.3 (PO 05/11/2026: chỉ cảnh báo, không chặn) — mở bán mẫu chưa đủ điều kiện vẫn lưu, phản hồi kèm
 * danh sách còn thiếu, gồm tiêu chí "có bài viết đã duyệt"; có bài viết đã duyệt thì hết cảnh báo đó.
 */
describe("sẵn sàng ra thị trường", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("ready-a")
    b = await createTenant("ready-b")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function approvedCopyFor(ctx: TenantContext, productId: string) {
    const asset = await new AssetRepository().create(ctx, {
      id: randomUUID(), productId: null, parentAssetId: null, kind: "ORIGINAL", version: 1,
      storageKey: `org/${ctx.organizationId}/khong-san-pham/${randomUUID()}.jpg`, mimeType: "image/jpeg", createdBy: ctx.userId,
    })
    const analysis = await new ProductAnalysisRepository().create(ctx, {
      productId, assetId: asset.id, jobId: randomUUID(), provider: "openai", model: "gpt-4o", modelVersion: "1",
      contractName: "PhanTichSanPhamHoa", contractVersion: "1", raw: {},
    })
    await prisma.product_copies.create({
      data: { organization_id: ctx.organizationId, analysis_id: analysis.id, product_id: productId, raw: {}, approval_state: "APPROVED", approved_by: ctx.userId, approved_at: new Date() },
    })
  }

  it("mở bán vẫn lưu và trả danh sách còn thiếu; có bài viết đã duyệt thì bớt cảnh báo đó", async () => {
    const p = await new ProductRepository().create(a.ctx, { code: "RD-1", name: "Bó mới", status: "DRAFT", attributes: { price_vnd: 300_000 } })
    const url = `http://localhost/api/v1/products/${p.id}`
    const res = await productPatch(withSession(url, a.token, { method: "PATCH", body: JSON.stringify({ status: "ACTIVE" }) }), { params: Promise.resolve({ id: p.id }) })
    expect(res.status).toBe(200)
    const body = (await readJson(res)) as { status: string; readiness_warnings: string[] }
    expect(body.status).toBe("ACTIVE")
    expect(body.readiness_warnings).toEqual(expect.arrayContaining(["Thiếu ảnh sản phẩm chính thức", "Chưa có bài viết bán hàng được duyệt"]))

    await approvedCopyFor(a.ctx, p.id)
    const again = (await readJson(await productPatch(withSession(url, a.token, { method: "PATCH", body: JSON.stringify({ status: "ACTIVE" }) }), { params: Promise.resolve({ id: p.id }) }))) as { readiness_warnings: string[] }
    expect(again.readiness_warnings).not.toContain("Chưa có bài viết bán hàng được duyệt")
    expect((await listProductMasterIndex(a.ctx)).find((i) => i.id === p.id)?.hasApprovedCopy).toBe(true)

    const off = (await readJson(await productPatch(withSession(url, a.token, { method: "PATCH", body: JSON.stringify({ status: "DRAFT" }) }), { params: Promise.resolve({ id: p.id }) }))) as { readiness_warnings: string[] }
    expect(off.readiness_warnings).toEqual([])
  })

  it("mở bán hàng loạt: cảnh báo theo từng mẫu của đúng tổ chức; mẫu của tổ chức khác không đổi, không lộ", async () => {
    const mine = await new ProductRepository().create(a.ctx, { code: "RD-2", name: "Giỏ", status: "DRAFT" })
    const theirs = await new ProductRepository().create(b.ctx, { code: "RD-3", name: "Của B", status: "DRAFT" })
    const res = await bulkStatus(withSession("http://localhost/api/v1/products/bulk-status", a.token, { method: "POST", body: JSON.stringify({ ids: [mine.id, theirs.id], status: "ACTIVE" }) }))
    const body = (await readJson(res)) as { updated: string[]; failed: Array<{ id: string }>; warnings: Array<{ id: string; code: string; missing: string[] }> }
    expect(body.updated).toEqual([mine.id])
    expect(body.failed.map((f) => f.id)).toEqual([theirs.id])
    expect(body.warnings).toEqual([expect.objectContaining({ id: mine.id, code: "RD-2" })])
    expect((await prisma.products.findUniqueOrThrow({ where: { id: theirs.id } })).status).toBe("DRAFT")
  })
})
