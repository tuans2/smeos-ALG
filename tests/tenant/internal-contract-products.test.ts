import { randomUUID } from "node:crypto"

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-products"
import { POST as approve } from "@/app/api/v1/products/[id]/approve/route"
import { GET as listChanges, POST as proposeChange } from "@/app/api/v1/products/[id]/change-requests/route"
import { GET as itemMasterIndex } from "@/app/api/v1/products/[id]/master-index/route"
import { POST as reject } from "@/app/api/v1/products/[id]/reject/route"
import { POST as restore } from "@/app/api/v1/products/[id]/revisions/[revisionId]/restore/route"
import { GET as revisions } from "@/app/api/v1/products/[id]/revisions/route"
import { GET as getProduct, PATCH as patchProduct } from "@/app/api/v1/products/[id]/route"
import { POST as batchImport } from "@/app/api/v1/products/batch-import/route"
import { POST as bulkStatus } from "@/app/api/v1/products/bulk-status/route"
import { POST as driveThumbnails } from "@/app/api/v1/products/drive-thumbnails/route"
import { GET as exportProducts } from "@/app/api/v1/products/export/route"
import { POST as undo } from "@/app/api/v1/products/import-batches/[id]/undo/route"
import { GET as importBatches } from "@/app/api/v1/products/import-batches/route"
import { GET as listMasterIndex } from "@/app/api/v1/products/master-index/route"
import { GET as kitProgress, POST as kitStart } from "@/app/api/v1/products/one-image-kit/route"
import { POST as kitRun } from "@/app/api/v1/products/one-image-kit/run/route"
import { GET as listProducts, POST as createProduct } from "@/app/api/v1/products/route"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { ProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { addStaffWithSession, createTenant, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi sản phẩm (OpenAPI nội bộ, PO 07/11/2026) — CSDL thật, lược đồ strict. */
const BASE = "http://localhost/api/v1"
const ps = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) })
const pendingProposal = (userId: string) => ({ proposal: { status: "pending", byUserId: userId, proposedAt: new Date().toISOString() } })

describe("hợp đồng — sản phẩm", () => {
  let t: Tenant
  const get = (path: string) => withSession(`${BASE}${path}`, t.token)
  const send = (path: string, method: string, body: unknown, headers: Record<string, string> = {}) =>
    withSession(`${BASE}${path}`, t.token, { method, body: JSON.stringify(body), headers })

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-san-pham")
    await prisma.organizations.update({ where: { id: t.organizationId }, data: { credit_balance: 100 } })
  })
  afterEach(() => vi.unstubAllGlobals())
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("tạo, liệt kê, đọc, sửa, hồ sơ đầy đủ, xuất, đổi trạng thái hàng loạt, ảnh Drive", async () => {
    const created = await expectContract(
      await createProduct(send("/products", "POST", { name: "Bó hồng đỏ", category: "Bó hoa", cost_price_vnd: 250_000, tags: ["hoa hồng"], attributes: { price_vnd: 550_000 } })),
      201,
      R.productRow,
      "product"
    )
    const id = created.id as string
    await expectContract(await listProducts(get("/products?limit=10")), 200, R.productsResponse, "products")
    await expectContract(await listProducts(get("/products?sort=price_desc")), 200, R.productsResponse, "products-scan")
    await expectContract(await getProduct(get(`/products/${id}`), ps({ id })), 200, R.productLookup, "product-lookup")
    await expectContract(await patchProduct(send(`/products/${id}`, "PATCH", { status: "ACTIVE", name: "Bó hồng đỏ Kỷ Niệm" }), ps({ id })), 200, R.updatedProductResponse, "product-updated")
    await expectContract(await listMasterIndex(get("/products/master-index?limit=5")), 200, R.masterIndexListResponse, "master-index")
    await expectContract(await itemMasterIndex(get(`/products/${id}/master-index`), ps({ id })), 200, R.masterIndexItemResponse, "master-index-item")
    const csv = await exportProducts(get("/products/export?status=ACTIVE"))
    expect(csv.status).toBe(200)
    expect(csv.headers.get("content-type")).toBe("text/csv; charset=utf-8")
    await expectContract(await bulkStatus(send("/products/bulk-status", "POST", { ids: [id, "khong-co"], status: "ACTIVE" })), 200, R.bulkStatusResponse, "bulk-status")
    // Drive giả lập không có ảnh — không gọi mạng thật
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })))
    await expectContract(
      await driveThumbnails(send("/products/drive-thumbnails", "POST", { folder_ids: ["1AbCdEfGhIjKlMnOpQrStUvWxYz012345"] })),
      200,
      R.driveThumbnailsResponse,
      "drive-thumbnails"
    )
  })

  it("duyệt/từ chối đề xuất, đề xuất sửa, phiên bản, nhập hàng loạt và hoàn tác", async () => {
    const mk = (name: string) =>
      prisma.products.create({ data: { id: randomUUID(), organization_id: t.organizationId, code: `DX-${name}`, name, status: "ACTIVE", attributes: pendingProposal(t.userId) } })
    const a = await mk("A")
    const b = await mk("B")
    await expectContract(await approve(send(`/products/${a.id}/approve`, "POST", {}), ps({ id: a.id })), 200, R.productRow, "approved")
    await expectContract(await reject(send(`/products/${b.id}/reject`, "POST", { reason: "Ảnh mờ" }), ps({ id: b.id })), 200, R.productRow, "rejected")
    // Đề xuất sửa là việc của người thiếu `H3` (Sale); Điều hành sửa thẳng
    const sale = await addStaffWithSession(t, "sale", "sale-de-xuat")
    const proposal = withSession(`${BASE}/products/${a.id}/change-requests`, sale.token, { method: "POST", body: JSON.stringify({ name: "Mẫu A mới" }) })
    await expectContract(await proposeChange(proposal, ps({ id: a.id })), 201, R.changeRequestRow, "change-request")
    await expectContract(await listChanges(get(`/products/${a.id}/change-requests`), ps({ id: a.id })), 200, R.changeRequestsResponse, "change-requests")

    await expectContract(await patchProduct(send(`/products/${a.id}`, "PATCH", { name: "Mẫu A sửa" }), ps({ id: a.id })), 200, R.updatedProductResponse, "product-updated")
    const revs = await expectContract(await revisions(get(`/products/${a.id}/revisions`), ps({ id: a.id })), 200, R.revisionsResponse, "revisions")
    const revisionId = (revs.data as { id: string }[])[0]?.id ?? ""
    expect(revisionId).not.toBe("")
    await expectContract(await restore(send(`/products/${a.id}/revisions/${revisionId}/restore`, "POST", {}), ps({ id: a.id, revisionId })), 200, R.productRow, "restored")

    const batch = await expectContract(
      await batchImport(send("/products/batch-import", "POST", { items: [{ code: "NK-01", name: "Giỏ hoa" }, { code: "DX-A", name: "Mẫu A", category: "Bó hoa" }], overwrite_existing: true })),
      201,
      R.batchImportResponse,
      "batch-import"
    )
    await expectContract(await importBatches(get("/products/import-batches")), 200, R.importBatchesResponse, "import-batches")
    const batchId = (batch.data as { batch_id: string }).batch_id
    await expectContract(await undo(send(`/products/import-batches/${batchId}/undo`, "POST", {}), ps({ id: batchId })), 200, R.undoImportBatchResponse, "undo-batch")
  })

  it("từ 1 ảnh: gửi nhận diện, xem tiến độ, chạy chuỗi (AI giả lập, bước hỏng trả FAILED)", async () => {
    const asset = await new AssetRepository().create(t.ctx, {
      id: randomUUID(), productId: null, parentAssetId: null, kind: "ORIGINAL", version: 1,
      storageKey: `org/${t.organizationId}/khong-san-pham/${randomUUID()}.jpg`, mimeType: "image/jpeg", createdBy: t.userId,
    })
    const started = await expectContract(
      await kitStart(send("/products/one-image-kit", "POST", { asset_id: asset.id }, { "Idempotency-Key": randomUUID() })),
      202,
      R.oneImageKitStartResponse,
      "kit-start"
    )
    const jobId = (started.data as { jobId: string }).jobId
    const progressPath = `/products/one-image-kit?job_id=${jobId}&asset_id=${asset.id}`
    await expectContract(await kitProgress(get(progressPath)), 200, R.oneImageKitProgressResponse, "kit-progress")
    await new ProductAnalysisRepository().create(t.ctx, {
      productId: null, assetId: asset.id, jobId, provider: "openai", model: "gpt-4o", modelVersion: "2026-08-01", contractName: "PhanTichSanPhamHoa", contractVersion: "2",
      raw: {
        identity: { category: "Bó hoa", shape: "Tròn", facing: "Một mặt", container: "Giấy gói", phong_cach: "Cổ điển", dip_su_dung: "Sinh nhật" },
        bom: { flowers: [{ flowerName: "Hồng đỏ", quantity: 12, unit: "cành", color: "Đỏ", role: "Chủ đạo" }], foliage: [], accessories: [], wrapping: [], materials_note: null },
        confidence: 90, flower_count: 12, bud_count: 0, damaged_count: 0,
      },
    })
    const progress = await expectContract(await kitProgress(get(progressPath)), 200, R.oneImageKitProgressResponse, "kit-progress")
    const analysisId = (progress.data as { analysis: { id: string } }).analysis.id
    // Nhà cung cấp AI giả lập hỏng → bước nội dung trả FAILED, vẫn 200
    vi.stubGlobal("fetch", vi.fn(async () => new Response("lỗi nhà cung cấp", { status: 500 })))
    const run = await expectContract(
      await kitRun(send("/products/one-image-kit/run", "POST", { analysis_id: analysisId }, { "Idempotency-Key": randomUUID() })),
      200,
      R.oneImageKitRunResponse,
      "kit-run"
    )
    expect((run.data as { status: string }).status).toBe("FAILED")
  })
})
