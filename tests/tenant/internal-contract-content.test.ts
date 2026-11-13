import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

// Cổng AI giả lập "không chạy được" — đúng kết quả cổng thật trả khi hết mô hình dự phòng (không ném lỗi). Mọi route
// viết nội dung phải lùi về nội dung dựng sẵn hoặc báo lỗi đúng mã; không gọi nhà cung cấp thật. Mạng ngoài (Google
// Trends…) đã bị `tests/setup.ts` chặn.
// Riêng đọc ảnh (`product_vision`) trả ví dụ đầu ra của hợp đồng Chặng 02 để phủ nhánh thành công.
vi.mock("@/core/ai/gateway", async () => {
  const { stage02Understand } = await import("@/modules/creative-production/contracts/stage-02-understand")
  return {
    callCapability: async (req: { capability: string }) =>
      req.capability === "product_vision"
        ? { kind: "xong", output: stage02Understand.examples.output, model: { key: "gia-lap", provider: "gia-lap" }, attempts: [], evaluation: { needsReview: false } }
        : { kind: "khong_chay_duoc", reason: "HET_DUONG_DU_PHONG", attempts: [] },
  }
})

import * as R from "@/app/api/v1/_contracts/responses-content"
import { POST as catalogGenerate } from "@/app/api/v1/content-engine/catalog-generate/route"
import { POST as approveGeneration } from "@/app/api/v1/content-engine/generations/[id]/approve/route"
import { GET as lookupGeneration, POST as createGeneration } from "@/app/api/v1/content-engine/generations/route"
import { POST as landingGenerate } from "@/app/api/v1/content-engine/landing-generate/route"
import { POST as rewrite } from "@/app/api/v1/content-engine/rewrite/route"
import { GET as health } from "@/app/api/v1/market-intelligence/health/route"
import { GET as opportunities } from "@/app/api/v1/market-intelligence/opportunities/route"
import { POST as productIntelligence } from "@/app/api/v1/market-intelligence/product-intelligence/route"
import { GET as listRuns, POST as triggerRun } from "@/app/api/v1/market-intelligence/research-runs/route"
import { POST as visionExtract } from "@/app/api/v1/market-intelligence/vision-extract/route"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { stage03Discover } from "@/modules/creative-production/contracts/stage-03-discover"
import { ContentGenerationRepository } from "@/modules/content-engine/infra/content-generation-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi `/content-engine/*`, `/market-intelligence/*` (OpenAPI nội bộ, PO 07/11/2026) trên CSDL thật. */
const BASE = "http://localhost/api/v1"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })

describe("hợp đồng — viết nội dung AI, xu hướng thị trường", () => {
  let t: Tenant
  const get = (path: string) => withSession(`${BASE}${path}`, t.token)
  const send = (path: string, method: string, body?: unknown, headers: Record<string, string> = {}) =>
    withSession(`${BASE}${path}`, t.token, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-noi-dung")
    await prisma.organizations.update({ where: { id: t.organizationId }, data: { credit_balance: 100 } })
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("bài đa kênh: tra bản mới nhất, xem, duyệt; tạo mới khi AI không chạy được (bài dựng sẵn)", async () => {
    await expectContract(await lookupGeneration(get("/content-engine/generations?topic_id=topic-1")), 200, R.generationLookupResponse, "gen-lookup-empty")
    const g = await new ContentGenerationRepository().create(t.ctx, {
      origin: "content_engine_ui", assetId: randomUUID(), topicId: "topic-1", mode: "AUTHENTIC", channels: ["facebook", "zalo"],
      brief: { briefVersion: 1, product: { name: "Bó hồng đỏ" } }, briefVersion: 1, promptVersions: { strategist: "v1", writer: "v1", critic: "v1", rewriter: "v1" },
      rubricVersion: "v1", posts: [{ channel: "facebook", text: "Bài Facebook", hashtags: ["#hoa"], factIds: ["F1"] }], createdBy: t.userId,
    })
    await expectContract(await lookupGeneration(get("/content-engine/generations?topic_id=topic-1&mode=AUTHENTIC")), 200, R.generationLookupResponse, "gen-lookup")
    await expectContract(await approveGeneration(send(`/content-engine/generations/${g.id}/approve`, "POST", { posts: [{ channel: "facebook", text: "Bài đã sửa" }] }), ps(g.id)), 200, R.generationApprovedResponse, "gen-approve")

    const product = await prisma.products.create({ data: { organization_id: t.organizationId, code: "ND-1", name: "Bó hồng đỏ", status: "ACTIVE" } })
    const created = await createGeneration(send("/content-engine/generations", "POST", { product_id: product.id, channels: ["facebook"] }, { "Idempotency-Key": randomUUID() }))
    await expectContract(created, 201, R.generationCreatedResponse, "gen-create")
    expect((await createGeneration(send("/content-engine/generations", "POST", { product_id: product.id, channels: ["facebook"] }))).status).toBe(400)
  })

  it("landing page, catalog, viết lại nhanh khi AI không chạy được (nội dung dựng sẵn)", async () => {
    const landing = await landingGenerate(send("/content-engine/landing-generate", "POST", { occasion_id: "tet", occasion_label: "Tết Nguyên Đán", selected_products: [{ name: "Bó hồng đỏ", price: 450000 }] }))
    await expectContract(landing, 200, R.landingContentResponse, "landing-generate")
    const catalog = await catalogGenerate(send("/content-engine/catalog-generate", "POST", { collectionName: "Hoa Tết 2027", productCount: 3 }))
    await expectContract(catalog, 200, R.catalogContentResponse, "catalog-generate")
    const rw = await rewrite(send("/content-engine/rewrite", "POST", { text: "Giao hoa nhanh trong 2 giờ", field_type: "guarantee", style: "concise" }))
    const rwBody = await expectContract(rw, 200, R.rewriteResponse, "rewrite")
    expect((rwBody.data as { fallback?: boolean }).fallback).toBe(true) // AI không chạy được → gợi ý dựng sẵn, không tính credit
  })

  it("xu hướng thị trường: cơ hội, lượt nghiên cứu, sức khoẻ nguồn, đọc ảnh, phân tích sản phẩm", async () => {
    await expectContract(await opportunities(get("/market-intelligence/opportunities?limit=10")), 200, R.opportunitiesResponse, "mi-opportunities")
    const run = await triggerRun(send("/market-intelligence/research-runs", "POST", { run_type: "MANUAL", keyword: "hoa hồng" }))
    await expectContract(run, 201, R.researchRunResponse, "mi-run")
    await expectContract(await listRuns(get("/market-intelligence/research-runs")), 200, R.researchRunsResponse, "mi-runs")
    await expectContract(await health(get("/market-intelligence/health")), 200, R.providerHealthResponse, "mi-health")
    const assetId = randomUUID()
    const storageKey = `org/${t.organizationId}/unfiled/${assetId}.png`
    // PNG 1×1 thật trong kho đĩa cục bộ — đọc ảnh chạy tới cổng AI (giả lập "không chạy được").
    await getStorageProvider().put(storageKey, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"), "image/png")
    await new AssetRepository().create(t.ctx, { id: assetId, productId: null, parentAssetId: null, kind: "ORIGINAL", version: 1, storageKey, mimeType: "image/png", createdBy: t.userId })
    const vision = await visionExtract(send("/market-intelligence/vision-extract", "POST", { asset_id: assetId, product_title: "Bó hồng đỏ" }))
    await expectContract(vision, 200, R.visionExtractResponse, "mi-vision")
    // Thân theo ví dụ của hợp đồng Chặng 03 (đầu ra Chặng 02 đã sửa), gắn ảnh của tổ chức này.
    const pi = await productIntelligence(send("/market-intelligence/product-intelligence", "POST", { ...stage03Discover.examples.input, asset_id: assetId }))
    await expectContract(pi, 200, R.productIntelligenceResponse, "mi-product-intelligence")
  })
})
