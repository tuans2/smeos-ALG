import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as libraryGet } from "@/app/api/v1/content-studio/products/route"
import { GET as productGet } from "@/app/api/v1/content-studio/products/[id]/route"
import { PUT as pitchPut } from "@/app/api/v1/content-studio/products/[id]/sales-pitch/route"
import { GET as scanGet } from "@/app/api/v1/content-studio/scans/[jobId]/route"
import type { TenantContext } from "@/core/tenancy"
import { prisma } from "@/core/tenancy/infra/prisma"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { getContentProduct, saveSalesPitch } from "@/modules/content-studio/use-cases/content-product"
import { getContentBrief } from "@/modules/content-engine/use-cases/get-content-brief"
import { pitchToRecord, readSalesPitch } from "@/modules/products/domain/sales-pitch-record"
import type { SalesPitchData } from "@/modules/products/domain/sales-pitch-template"
import { ProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const pitch: SalesPitchData = {
  productName: "Giỏ quà An Khang", style: "Sang trọng", occasions: ["Tết"], occasionRegister: "FESTIVE",
  description: "Giỏ quà trà và bánh.", mainFlowers: [{ name: "Hộp trà", quantity: 2, unit: "hộp" }], foliageItems: [], accessoryItems: [],
  wrapping: "Giỏ mây", container: "Giỏ", dimensions: { heightCm: 40, widthCm: 30 }, priceVnd: 850_000, originalPriceVnd: null,
  priceSegment: "premium", freeGifts: ["Thiệp"], guarantees: ["Giao 2 giờ"], status: "DRAFT",
}

/**
 * Hành trình Tạo nội dung (PO 08/11/2026): đọc dữ liệu đã duyệt của sản phẩm đang làm, Kho sản phẩm có cờ, kết quả
 * một lượt quét, và chốt Thẻ chào lưu vào `products.attributes.sales_pitch`. Máy chủ tự khoá bước; tổ chức khác → 404
 * (danh sách rỗng với lượt quét); thiếu quyền → bị chặn.
 */
describe("hành trình Tạo nội dung", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("cs-a")
    b = await createTenant("cs-b")
  })
  afterAll(async () => disconnectDatabase())

  async function scanned(ctx: TenantContext, opts: { approveCard: boolean; approveCopy: boolean }) {
    const product = await new ProductRepository().create(ctx, { code: `SP-${randomUUID().slice(0, 6)}`, name: "Giỏ quà", status: "DRAFT", attributes: { bom: { a: 1 } } })
    const asset = await new AssetRepository().create(ctx, {
      id: randomUUID(), productId: null, parentAssetId: null, kind: "ORIGINAL", version: 1,
      storageKey: `org/${ctx.organizationId}/khong-san-pham/${randomUUID()}.jpg`, mimeType: "image/jpeg", createdBy: ctx.userId,
    })
    const jobId = randomUUID()
    const analysis = await new ProductAnalysisRepository().create(ctx, {
      productId: product.id, assetId: asset.id, jobId, provider: "openai", model: "m", modelVersion: "1",
      contractName: "PhanTichSanPhamHoa", contractVersion: "1", raw: { product_name: "Giỏ quà" },
    })
    if (opts.approveCard) await prisma.product_analyses.update({ where: { id: analysis.id }, data: { approval_state: "APPROVED", approved_at: new Date() } })
    await prisma.product_copies.create({
      data: {
        organization_id: ctx.organizationId, analysis_id: analysis.id, product_id: product.id, raw: { suggested_name: "Giỏ quà An Khang" },
        approval_state: opts.approveCopy ? "APPROVED" : "PENDING", ...(opts.approveCopy ? { approved_by: ctx.userId, approved_at: new Date() } : {}),
      },
    })
    return { productId: product.id, jobId }
  }

  const params = (id: string) => ({ params: Promise.resolve({ id }) })
  const can = (t: Tenant, codes = ["L1", "L3", "H3"]): TenantContext => ({ ...t.ctx, capabilities: new Set(codes) })

  it("đủ Bước 1 → chốt Thẻ chào lưu vào Kho, giữ khoá khác, chốt lại tăng phiên bản", async () => {
    const { productId } = await scanned(a.ctx, { approveCard: true, approveCopy: true })
    const view = await getContentProduct(a.ctx, productId)
    expect(view.flags).toEqual({ card_approved: true, copy_approved: true, pitch_saved: false, approved_posts: 0 })

    const url = `http://localhost/api/v1/content-studio/products/${productId}/sales-pitch`
    const res = await pitchPut(withSession(url, a.token, { method: "PUT", body: JSON.stringify({ pitch: pitchToRecord(pitch) }) }), params(productId))
    expect(res.status).toBe(200)
    expect(((await readJson(res)).data as { version: number }).version).toBe(1)

    const row = await prisma.products.findUniqueOrThrow({ where: { id: productId } })
    expect((row.attributes as Record<string, unknown>).bom).toEqual({ a: 1 })
    expect(readSalesPitch(row.attributes)?.data.product_name).toBe("Giỏ quà An Khang")

    const again = await saveSalesPitch(can(a), productId, pitchToRecord({ ...pitch, priceVnd: 900_000 }))
    expect(again.version).toBe(2)
    expect((await getContentProduct(a.ctx, productId)).flags.pitch_saved).toBe(true)
    expect(await prisma.audit_logs.count({ where: { organization_id: a.organizationId, action: "product.sales_pitch.finalize" } })).toBe(2)
  })

  it("Bài giới thiệu chưa duyệt → máy chủ khoá chốt Thẻ chào (409)", async () => {
    const { productId } = await scanned(a.ctx, { approveCard: true, approveCopy: false })
    await expect(saveSalesPitch(can(a), productId, pitchToRecord(pitch))).rejects.toMatchObject({ code: "CONFLICT" })
  })

  it("sản phẩm / lượt quét của tổ chức khác → 404 hoặc rỗng; thẻ của B không bị đổi", async () => {
    const theirs = await scanned(b.ctx, { approveCard: true, approveCopy: true })
    const get = await productGet(withSession(`http://localhost/api/v1/content-studio/products/${theirs.productId}`, a.token), params(theirs.productId))
    expect(get.status).toBe(404)
    const put = await pitchPut(
      withSession(`http://localhost/api/v1/content-studio/products/${theirs.productId}/sales-pitch`, a.token, { method: "PUT", body: JSON.stringify({ pitch: pitchToRecord(pitch) }) }),
      params(theirs.productId),
    )
    expect(put.status).toBe(404)
    expect(readSalesPitch((await prisma.products.findUniqueOrThrow({ where: { id: theirs.productId } })).attributes)).toBeNull()

    const scan = await scanGet(withSession(`http://localhost/api/v1/content-studio/scans/${theirs.jobId}`, a.token), { params: Promise.resolve({ jobId: theirs.jobId }) })
    expect(scan.status).toBe(200)
    expect((await readJson(scan)).data).toEqual([])
  })

  it("Kho sản phẩm chỉ có sản phẩm của mình, kèm cờ Bài giới thiệu / Thẻ chào; lượt quét trả đúng thẻ", async () => {
    const mine = await scanned(a.ctx, { approveCard: true, approveCopy: true })
    await scanned(b.ctx, { approveCard: true, approveCopy: true })
    await saveSalesPitch(can(a), mine.productId, pitchToRecord(pitch))

    const res = await libraryGet(withSession("http://localhost/api/v1/content-studio/products?limit=10", a.token))
    expect(res.status).toBe(200)
    const body = (await readJson(res)) as { data: Array<{ id: string; has_copy: boolean; has_pitch: boolean }>; next_cursor: string | null }
    expect(body.data).toEqual([expect.objectContaining({ id: mine.productId, has_copy: true, has_pitch: true })])
    expect(body.next_cursor).toBeNull()

    const scan = (await readJson(await scanGet(withSession(`http://localhost/api/v1/content-studio/scans/${mine.jobId}`, a.token), { params: Promise.resolve({ jobId: mine.jobId }) }))) as { data: Array<{ product_id: string }> }
    expect(scan.data.map((s) => s.product_id)).toEqual([mine.productId])
  })

  it("mẫu chính thức: chỉ Điều hành (H3) chốt được Thẻ chào; dữ liệu lỗi → 400", async () => {
    const { productId } = await scanned(a.ctx, { approveCard: true, approveCopy: true })
    await expect(saveSalesPitch(can(a, ["L1", "L3"]), productId, pitchToRecord(pitch))).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
    const bad = await pitchPut(
      withSession(`http://localhost/api/v1/content-studio/products/${productId}/sales-pitch`, a.token, { method: "PUT", body: JSON.stringify({ pitch: { ...pitchToRecord(pitch), product_name: "" } }) }),
      params(productId),
    )
    expect(bad.status).toBe(400)
  })

  it("Bước 3: Brief viết bài lấy dữ liệu đã duyệt (Bài giới thiệu + Thẻ chào); tổ chức khác không đọc được", async () => {
    const { productId } = await scanned(a.ctx, { approveCard: true, approveCopy: true })
    await prisma.product_copies.updateMany({ where: { product_id: productId }, data: { raw: { suggested_name: "Giỏ quà An Khang", key_selling_points: ["Trà ngon đóng hộp"], target_audience: { recipient: "Đối tác" } } } })
    await saveSalesPitch(can(a), productId, pitchToRecord(pitch))

    const brief = await getContentBrief(a.ctx, { productId, channels: ["facebook"] })
    expect(brief.product.name).toBe("Giỏ quà An Khang")
    expect(brief.product.price.exact).toBe(850_000)
    expect(brief.passport?.sellingPoints).toEqual(["Trà ngon đóng hộp"])
    expect(brief.passport?.recipient).toBe("Đối tác")

    // Sản phẩm của A, gọi bằng ngữ cảnh B → không lấy được dữ liệu đã duyệt của A
    const leaked = await getContentBrief(b.ctx, { productId, channels: ["facebook"] })
    expect(leaked.passport ?? null).toBeNull()
    expect(leaked.product.name).not.toBe("Giỏ quà An Khang")
  })

  it("Bước 3: API trả lượt bài mới nhất của sản phẩm, bỏ lượt trong thùng rác; bài đã duyệt được đếm", async () => {
    const { productId } = await scanned(a.ctx, { approveCard: true, approveCopy: true })
    const base = { organization_id: a.organizationId, product_id: productId, origin: "content_engine_ui", channels: ["facebook"], brief: {}, brief_version: 1, prompt_versions: {}, rubric_version: "v1", created_by: a.userId }
    await prisma.content_generations.create({ data: { ...base, posts: [{ channel: "facebook", text: "Bài cũ", hashtags: [] }], status: "APPROVED", approved_posts: [{ channel: "facebook", text: "Bài cũ đã sửa", hashtags: ["#qua"] }], created_at: new Date(Date.now() - 60_000) } })
    await prisma.content_generations.create({ data: { ...base, posts: [{ channel: "facebook", text: "Bài trong thùng rác", hashtags: [] }], trashed_at: new Date() } })

    const view = await getContentProduct(a.ctx, productId)
    expect(view.latest_posts).toMatchObject({ status: "APPROVED", approved_posts: [{ channel: "facebook", text: "Bài cũ đã sửa", hashtags: ["#qua"] }] })
    expect(view.flags.approved_posts).toBe(1)
  })
})
