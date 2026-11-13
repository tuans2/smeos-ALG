import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-studio"
import { PUT as pitchPut } from "@/app/api/v1/content-studio/products/[id]/sales-pitch/route"
import { GET as productGet } from "@/app/api/v1/content-studio/products/[id]/route"
import { GET as libraryGet } from "@/app/api/v1/content-studio/products/route"
import { GET as scanGet } from "@/app/api/v1/content-studio/scans/[jobId]/route"
import { GET as callbackGet } from "@/app/api/v1/social-publishing/channels/[channel]/callback/route"
import { POST as connectPost } from "@/app/api/v1/social-publishing/channels/[channel]/connect/route"
import { POST as disconnectPost } from "@/app/api/v1/social-publishing/channels/[channel]/disconnect/route"
import { GET as channelsGet } from "@/app/api/v1/social-publishing/channels/route"
import { GET as pagesGet, POST as pagesPost } from "@/app/api/v1/social-publishing/facebook-pages/route"
import { POST as cancelPost } from "@/app/api/v1/social-publishing/posts/[id]/cancel/route"
import { POST as retryPost } from "@/app/api/v1/social-publishing/posts/[id]/retry/route"
import { GET as postsGet, POST as postsPost } from "@/app/api/v1/social-publishing/posts/route"
import type { TenantContext } from "@/core/tenancy"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { pitchToRecord } from "@/modules/products/domain/sales-pitch-record"
import type { SalesPitchData } from "@/modules/products/domain/sales-pitch-template"
import { ProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository"
import { ProductRepository } from "@/modules/products/infra/product-repository"
import { finishConnect, startConnect } from "@/modules/social-publishing/use-cases/connect-channel"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Hợp đồng phản hồi `/content-studio/*`, `/social-publishing/*` (OpenAPI nội bộ, PO 07/11/2026) trên CSDL thật. Nền
 * tảng mạng xã hội giả lập qua tham số `fetch` của use-case — không gọi mạng.
 */
const BASE = "http://localhost/api/v1"
const ps = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) })
const ENV = { META_APP_ID: "meta-app", META_APP_SECRET: "meta-secret", PUBLIC_APP_URL: "https://app.smeos.test" } as const
const pitch: SalesPitchData = {
  productName: "Giỏ quà An Khang", style: "Sang trọng", occasions: ["Tết"], occasionRegister: "FESTIVE",
  description: "Giỏ quà trà và bánh.", mainFlowers: [{ name: "Hộp trà", quantity: 2, unit: "hộp" }], foliageItems: [], accessoryItems: [],
  wrapping: "Giỏ mây", container: "Giỏ", dimensions: { heightCm: 40, widthCm: 30 }, priceVnd: 850_000, originalPriceVnd: null,
  priceSegment: "premium", freeGifts: ["Thiệp"], guarantees: ["Giao 2 giờ"], status: "DRAFT",
}

describe("hợp đồng — Tạo nội dung và đăng bài tự động", () => {
  let t: Tenant
  let other: Tenant
  const saved: Record<string, string | undefined> = {}
  const get = (path: string, who: Tenant = t) => withSession(`${BASE}${path}`, who.token)
  const send = (path: string, method: string, body?: unknown, headers: Record<string, string> = {}, who: Tenant = t) =>
    withSession(`${BASE}${path}`, who.token, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const ctxOf = (x: Tenant): TenantContext => ({ ...x.ctx, capabilities: new Set(["W2", "J5"]) })

  beforeAll(async () => {
    for (const k of Object.keys(ENV)) saved[k] = process.env[k]
    Object.assign(process.env, ENV)
    await resetDatabase()
    t = await createTenant("hop-dong-studio")
    other = await createTenant("hop-dong-studio-khac")
  })
  afterAll(async () => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
    await disconnectDatabase()
  })

  it("Tạo nội dung: Kho sản phẩm, sản phẩm đang làm, lượt quét, chốt Thẻ chào", async () => {
    const product = await new ProductRepository().create(t.ctx, { code: "SP-STUDIO-1", name: "Giỏ quà", status: "DRAFT", attributes: { bom: { a: 1 } } })
    const asset = await new AssetRepository().create(t.ctx, { id: randomUUID(), productId: null, parentAssetId: null, kind: "ORIGINAL", version: 1, storageKey: `org/${t.organizationId}/khong-san-pham/${randomUUID()}.jpg`, mimeType: "image/jpeg", createdBy: t.userId })
    const jobId = randomUUID()
    const analysis = await new ProductAnalysisRepository().create(t.ctx, { productId: product.id, assetId: asset.id, jobId, provider: "openai", model: "m", modelVersion: "1", contractName: "PhanTichSanPhamHoa", contractVersion: "1", raw: { product_name: "Giỏ quà" } })
    await prisma.product_analyses.update({ where: { id: analysis.id }, data: { approval_state: "APPROVED", approved_at: new Date() } })
    await prisma.product_copies.create({ data: { organization_id: t.organizationId, analysis_id: analysis.id, product_id: product.id, raw: { suggested_name: "Giỏ quà An Khang" }, approval_state: "APPROVED", approved_by: t.userId, approved_at: new Date() } })

    await expectContract(await libraryGet(get("/content-studio/products?limit=10")), 200, R.contentLibraryResponse, "library")
    await expectContract(await productGet(get(`/content-studio/products/${product.id}`), ps({ id: product.id })), 200, R.contentProductResponse, "product")
    await expectContract(await scanGet(get(`/content-studio/scans/${jobId}`), ps({ jobId })), 200, R.scanResultsResponse, "scan")
    await expectContract(await scanGet(get(`/content-studio/scans/${jobId}`, other), ps({ jobId })), 200, R.scanResultsResponse, "scan-foreign") // tổ chức khác → rỗng
    await expectContract(await pitchPut(send(`/content-studio/products/${product.id}/sales-pitch`, "PUT", { pitch: pitchToRecord(pitch) }), ps({ id: product.id })), 200, R.salesPitchSavedResponse, "pitch")
    const posts = [{ channel: "facebook", text: "Bài facebook — Giỏ quà", hashtags: ["#gioqua"] }]
    await prisma.content_generations.create({ data: { organization_id: t.organizationId, product_id: product.id, origin: "content_engine_ui", channels: ["facebook"], brief: {}, brief_version: 1, prompt_versions: {}, rubric_version: "v1", posts, approved_posts: posts, status: "APPROVED", created_by: t.userId } })
    await expectContract(await productGet(get(`/content-studio/products/${product.id}`), ps({ id: product.id })), 200, R.contentProductResponse, "product-pitched")
    expect((await productGet(get(`/content-studio/products/${product.id}`, other), ps({ id: product.id }))).status).toBe(404)
  })

  it("kết nối kênh: bắt đầu, trạng thái, Trang chờ chọn, chọn Trang, gọi về, ngắt", async () => {
    await expectContract(await connectPost(send("/social-publishing/channels/facebook/connect", "POST"), ps({ channel: "facebook" })), 200, R.connectStartedResponse, "connect")
    const { authorize_url } = await startConnect(ctxOf(t), "facebook")
    const state = new URL(authorize_url).searchParams.get("state") ?? ""
    const fakeFetch = async (url: string) => {
      const body = /oauth\/access_token/.test(url) ? { access_token: "user-token" } : { data: [{ id: "page-0", name: "Trang 0", access_token: "pt-0", instagram_business_account: { id: "ig-0", username: "cuahang" } }, { id: "page-1", name: "Trang 1", access_token: "pt-1" }] }
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } })
    }
    await finishConnect(ctxOf(t), "facebook", { code: "c", state, error: null }, fakeFetch)
    await expectContract(await pagesGet(get("/social-publishing/facebook-pages")), 200, R.pendingPagesResponse, "pages")
    await expectContract(await pagesPost(send("/social-publishing/facebook-pages", "POST", { page_id: "page-0" })), 200, R.pageSelectedResponse, "page-select")
    await expectContract(await channelsGet(get("/social-publishing/channels")), 200, R.channelsResponse, "channels")
    const cb = await callbackGet(get("/social-publishing/channels/facebook/callback?code=c&state=sai"), ps({ channel: "facebook" }))
    expect(cb.status).toBe(303)
    expect(new URL(cb.headers.get("location") ?? "").searchParams.get("ket_noi")).toBe("loi")
    expect((await connectPost(send("/social-publishing/channels/myspace/connect", "POST"), ps({ channel: "myspace" }))).status).toBe(404)
    const off = await disconnectPost(send("/social-publishing/channels/instagram/disconnect", "POST"), ps({ channel: "instagram" }))
    expect(off.status).toBe(204)
  })

  it("bài đăng tự động: lên lịch, danh sách, huỷ, thử lại", async () => {
    const product = await prisma.products.create({ data: { organization_id: t.organizationId, code: "SP-STUDIO-2", name: "Bó hồng", status: "ACTIVE" } })
    await prisma.assets.create({ data: { organization_id: t.organizationId, product_id: product.id, kind: "ORIGINAL", storage_key: `org/${t.organizationId}/${product.id}/a.jpg`, mime_type: "image/jpeg", created_by: t.userId } })
    const posts = [{ channel: "facebook", text: "Bài facebook — Bó hồng tươi", hashtags: ["#bohong"] }]
    const g = await prisma.content_generations.create({ data: { organization_id: t.organizationId, product_id: product.id, origin: "content_engine_ui", channels: ["facebook"], brief: {}, brief_version: 1, prompt_versions: {}, rubric_version: "v1", posts, approved_posts: posts, status: "APPROVED", created_by: t.userId } })
    const idem = { "Idempotency-Key": randomUUID() }
    const created = await expectContract(await postsPost(send("/social-publishing/posts", "POST", { content_generation_id: g.id, channels: ["facebook"], mode: "AT", scheduled_at: new Date(Date.now() + 3_600_000).toISOString() }, idem)), 201, R.postsScheduledResponse, "schedule")
    const id = String((created.data as { id: string }[])[0]!.id)
    expect((await postsPost(send("/social-publishing/posts", "POST", { content_generation_id: g.id, channels: ["facebook"], mode: "NOW" }))).status).toBe(400) // thiếu Idempotency-Key
    await expectContract(await postsGet(get("/social-publishing/posts?limit=10")), 200, R.postsResponse, "posts")
    await expectContract(await cancelPost(send(`/social-publishing/posts/${id}/cancel`, "POST"), ps({ id })), 200, R.postResponse, "cancel")
    expect((await cancelPost(send(`/social-publishing/posts/${id}/cancel`, "POST", undefined, {}, other), ps({ id }))).status).toBe(404)
    await prisma.social_posts.update({ where: { id }, data: { status: "FAILED" } })
    await expectContract(await retryPost(send(`/social-publishing/posts/${id}/retry`, "POST"), ps({ id })), 200, R.postResponse, "retry")
  })

  it("đường lỗi đã mô tả trong OpenAPI", async () => {
    const st = async (r: Response | Promise<Response>) => (await r).status
    const raw = await prisma.products.create({ data: { organization_id: t.organizationId, code: "SP-STUDIO-3", name: "Chưa quét", status: "DRAFT" } })
    expect(await st(pitchPut(send(`/content-studio/products/${raw.id}/sales-pitch`, "PUT", { pitch: pitchToRecord(pitch) }), ps({ id: raw.id })))).toBe(409) // chưa duyệt Thẻ sản phẩm
    expect(await st(pitchPut(send(`/content-studio/products/${raw.id}/sales-pitch`, "PUT", { pitch: { product_name: 1 } }), ps({ id: raw.id })))).toBe(400)
    expect(await st(libraryGet(get("/content-studio/products?limit=0")))).toBe(400)
    expect(await st(connectPost(send("/social-publishing/channels/zalo/connect", "POST"), ps({ channel: "zalo" })))).toBe(409) // ứng dụng Zalo chưa cấu hình
    const post = (await prisma.social_posts.findFirst({ where: { organization_id: t.organizationId } }))!
    await prisma.social_posts.update({ where: { id: post.id }, data: { status: "PUBLISHING" } })
    expect(await st(cancelPost(send(`/social-publishing/posts/${post.id}/cancel`, "POST"), ps({ id: post.id })))).toBe(409)
    expect(await st(retryPost(send(`/social-publishing/posts/${post.id}/retry`, "POST"), ps({ id: post.id })))).toBe(409) // chỉ thử lại bài FAILED
    const g = (await prisma.content_generations.findFirst({ where: { organization_id: t.organizationId, status: "APPROVED" } }))!
    const schedule = (generationId: string, channels: string[]) => postsPost(send("/social-publishing/posts", "POST", { content_generation_id: generationId, channels, mode: "NOW" }, { "Idempotency-Key": randomUUID() }))
    expect(await st(schedule(g.id, ["zalo"]))).toBe(400) // chưa có bài đã duyệt cho kênh
    const zaloPosts = [{ channel: "zalo", text: "Bài zalo — Giỏ quà", hashtags: [] }]
    const gz = await prisma.content_generations.create({ data: { organization_id: t.organizationId, product_id: g.product_id, origin: "content_engine_ui", channels: ["zalo"], brief: {}, brief_version: 1, prompt_versions: {}, rubric_version: "v1", posts: zaloPosts, approved_posts: zaloPosts, status: "APPROVED", created_by: t.userId } })
    expect(await st(schedule(gz.id, ["zalo"]))).toBe(409) // có bài nhưng kênh chưa kết nối
    expect(await st(postsGet(get("/social-publishing/posts?status=LA")))).toBe(400)
    expect(await st(pagesPost(send("/social-publishing/facebook-pages", "POST", { page_id: "khong-co" })))).toBe(400)
  })
})

