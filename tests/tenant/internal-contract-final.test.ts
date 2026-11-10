import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-final"
import { POST as revokeLink } from "@/app/api/v1/catalog-links/[slug]/revoke/route"
import { GET as getLink, PATCH as patchLink } from "@/app/api/v1/catalog-links/[slug]/route"
import { GET as listLinks, POST as createLink } from "@/app/api/v1/catalog-links/route"
import { POST as dispatchSweep } from "@/app/api/v1/internal/chain-dispatch-sweep/route"
import { GET as internalHealth } from "@/app/api/v1/internal/health/route"
import { POST as integrationsSweep } from "@/app/api/v1/internal/integrations-sweep/route"
import { GET as productIntelligence } from "@/app/api/v1/product-intelligence/[id]/route"
import { cronSecretFor } from "@/core/http/cron-auth"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi nhóm cuối (OpenAPI nội bộ, PO 07/11/2026) trên CSDL thật. Route catalog-links chỉ được GỌI (vùng đóng băng). */
const BASE = "http://localhost/api/v1"
const ps = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) })
const cron = (path: string, method = "POST") => new Request(`${BASE}${path}`, { method, headers: { "x-cron-secret": cronSecretFor(process.env) ?? "" } })

describe("hợp đồng — link catalog, kết quả phân tích sản phẩm, cron nội bộ", () => {
  let t: Tenant
  let other: Tenant
  const get = (path: string, who: Tenant = t) => withSession(`${BASE}${path}`, who.token)
  const send = (path: string, method: string, body?: unknown, who: Tenant = t) =>
    withSession(`${BASE}${path}`, who.token, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-cuoi")
    other = await createTenant("hop-dong-cuoi-khac")
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("link catalog: tạo, danh sách, xem công khai, sửa, thu hồi", async () => {
    await expectContract(await createLink(send("/catalog-links", "POST", { slug: "hop-dong-tet", name: "Hoa Tết", description: "Bộ sưu tập Tết", filters: { tag: "tet" } })), 201, R.catalogLinkCreatedResponse, "link-create")
    await expectContract(await listLinks(get("/catalog-links")), 200, R.catalogLinksResponse, "links")
    await expectContract(await getLink(new Request(`${BASE}/catalog-links/hop-dong-tet`), ps({ slug: "hop-dong-tet" })), 200, R.catalogLinkPublicResponse, "link-public")
    await expectContract(await patchLink(send("/catalog-links/hop-dong-tet", "PATCH", { name: "Hoa Tết 2027" }), ps({ slug: "hop-dong-tet" })), 200, R.catalogLinkResponse, "link-patch")
    expect((await patchLink(send("/catalog-links/hop-dong-tet", "PATCH", { name: "Lấy" }, other), ps({ slug: "hop-dong-tet" }))).status).toBe(404)
    await expectContract(await revokeLink(send("/catalog-links/hop-dong-tet/revoke", "POST"), ps({ slug: "hop-dong-tet" })), 200, R.catalogLinkRevokedResponse, "link-revoke")
    await expectContract(await listLinks(get("/catalog-links?include_revoked=true")), 200, R.catalogLinksResponse, "links-revoked")
    expect((await getLink(new Request(`${BASE}/catalog-links/khong-co`), ps({ slug: "khong-co" }))).status).toBe(404)
  })

  it("kết quả phân tích sản phẩm theo lượt chạy và theo bản phân tích ảnh", async () => {
    const assetId = randomUUID()
    await new AssetRepository().create(t.ctx, { id: assetId, productId: null, parentAssetId: null, kind: "ORIGINAL", version: 1, storageKey: `org/${t.organizationId}/unfiled/${assetId}.jpg`, mimeType: "image/jpeg", createdBy: t.userId })
    const analysis = await prisma.product_analyses.create({
      data: {
        organization_id: t.organizationId, asset_id: assetId, job_id: randomUUID(), provider: "local", model: "thu", model_version: "1", contract_name: "PhanTichSanPhamHoa", contract_version: "1",
        raw: { identity: { category: "Bó hoa", phong_cach: "Hiện đại", dip_su_dung: "Sinh nhật", shape: "tròn" }, bom: { flowers: [{ name: "Hồng", quantity: 12, dvt_dem: "cành", color: "hồng" }], foliage: [{ name: "Lá bạc", quantity: 5 }] }, palette_accounting: [{ nhom: "hồng pastel" }] },
      },
    })
    const fromAnalysis = await expectContract(await productIntelligence(get(`/product-intelligence/${analysis.id}`), ps({ id: analysis.id })), 200, R.productIntelligenceResponse, "pi-from-analysis")
    const run = await prisma.product_analysis_runs.create({ data: { organization_id: t.organizationId, asset_id: assetId, product_name: "Bó hồng", trend_fit_score: 0.7, audience_fit_score: 0.6, content_fit_score: 0.8, overall_fit: "GOOD", report: fromAnalysis.report as object } })
    await expectContract(await productIntelligence(get(`/product-intelligence/${run.id}`), ps({ id: run.id })), 200, R.productIntelligenceResponse, "pi-run")
    expect((await productIntelligence(get(`/product-intelligence/${run.id}`, other), ps({ id: run.id }))).status).toBe(404)
  })

  it("cron nội bộ: sức khoẻ, quét tích hợp, quét nhắc mốc", async () => {
    expect((await internalHealth(new Request(`${BASE}/internal/health`))).status).toBe(401)
    const health = await internalHealth(cron("/internal/health", "GET"))
    await expectContract(health, health.status, R.healthResponse, "health")
    expect((await integrationsSweep(new Request(`${BASE}/internal/integrations-sweep`, { method: "POST" }))).status).toBe(401)
    await expectContract(await integrationsSweep(cron("/internal/integrations-sweep")), 200, R.integrationsSweepResponse, "integrations-sweep")
    expect((await dispatchSweep(new Request(`${BASE}/internal/chain-dispatch-sweep`, { method: "POST" }))).status).toBe(401)
    await expectContract(await dispatchSweep(cron("/internal/chain-dispatch-sweep")), 200, R.dispatchSweepResponse, "dispatch-sweep")
  })
})
