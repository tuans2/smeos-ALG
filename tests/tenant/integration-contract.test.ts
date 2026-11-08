import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { z } from "zod"

import { POST as registerAsset } from "@/app/api/v1/integration/assets/route"
import { GET as getBrandProfile } from "@/app/api/v1/integration/brand-profile/route"
import { GET as getBusinessProfile } from "@/app/api/v1/integration/business-profile/route"
import { POST as checkCapabilities } from "@/app/api/v1/integration/capabilities/check/route"
import { POST as revokeCatalogLink } from "@/app/api/v1/integration/catalog-links/[slug]/revoke/route"
import { PATCH as updateCatalogLink } from "@/app/api/v1/integration/catalog-links/[slug]/route"
import { GET as listCatalogLinks, POST as createCatalogLink } from "@/app/api/v1/integration/catalog-links/route"
import { POST as recordContentMetrics } from "@/app/api/v1/integration/content-metrics/route"
import { POST as createJob } from "@/app/api/v1/integration/jobs/route"
import { GET as getMasterImage } from "@/app/api/v1/integration/products/[id]/master-image/route"
import { GET as listProducts } from "@/app/api/v1/integration/products/route"
import { POST as recordUsage } from "@/app/api/v1/integration/usage/route"
import { POST as issueToken } from "@/app/api/v1/integration-tokens/route"
import { PUT as putBrandProfile } from "@/app/api/v1/brand-profile/route"
import { PUT as putBusinessProfile } from "@/app/api/v1/business-profile/route"
import { POST as createProduct } from "@/app/api/v1/products/route"
import * as res from "@/modules/integration/contracts/http-responses"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withBearer, withSession, withSso, type Tenant } from "../helpers/fixtures"

/**
 * Hợp đồng PHẢN HỒI của Integration API trên CSDL thật (audit API đợt 4, PO 07/11/2026): mọi operation
 * trong `docs/spec/contracts/openapi/integration.openapi.json` trả đúng lược đồ `strictObject` ở
 * `contracts/http-responses.ts` — trường mới chưa ghi vào hợp đồng, sai kiểu hay sai mã HTTP là đỏ.
 */
const BASE = "http://localhost/api/v1"

async function expectContract(response: Response, status: number, schema: z.ZodType): Promise<Record<string, unknown>> {
  const text = await response.text()
  expect(response.status, text).toBe(status)
  const body: unknown = JSON.parse(text)
  const parsed = schema.safeParse(body)
  expect(parsed.success ? [] : parsed.error.issues, "phản hồi lệch hợp đồng").toEqual([])
  return body as Record<string, unknown>
}

describe("hợp đồng phản hồi — Integration API", () => {
  let a: Tenant
  let token: string
  let productId: string
  let masterId: string
  const sso = (url: string, init?: RequestInit) => withSso(url, { userId: a.userId, organizationId: a.organizationId }, init)
  const bearer = (url: string, init?: RequestInit) => withBearer(url, token, init)
  const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) })

  beforeAll(async () => {
    await resetDatabase()
    a = await createTenant("hop-dong")
    token = (await readJson(await issueToken(withSession(`${BASE}/integration-tokens`, a.token, post({ client: "LOCALBUDD" }))))).token as string
    const product = await readJson(
      await createProduct(withSession(`${BASE}/products`, a.token, post({ code: "BHHD0001", name: "Bó hoa hợp đồng", status: "ACTIVE" })))
    )
    productId = product.id as string
    masterId = randomUUID()
    await prisma.assets.create({
      data: {
        id: masterId,
        organization_id: a.organizationId,
        product_id: productId,
        kind: "MASTER",
        state: "READY",
        approval_state: "APPROVED",
        storage_key: `org/${a.organizationId}/${productId}/${masterId}.jpg`,
        mime_type: "image/jpeg",
        width: 1200,
        height: 1200,
        created_by: a.userId,
      },
    })
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("GET /integration/products — token và SSO", async () => {
    const page = await expectContract(await listProducts(bearer(`${BASE}/integration/products`)), 200, res.listProductsResponse)
    expect((page.data as unknown[]).length).toBe(1)
    await expectContract(await listProducts(sso(`${BASE}/integration/products`)), 200, res.listProductsResponse)
  })

  it("GET /integration/products/{id}/master-image", async () => {
    const body = await expectContract(
      await getMasterImage(bearer(`${BASE}/integration/products/${productId}/master-image`), { params: Promise.resolve({ id: productId }) }),
      200,
      res.masterImageResponse
    )
    expect((body.master as { id: string }).id).toBe(masterId)
  })

  it("GET /integration/brand-profile và /business-profile — trước và sau khi nhập", async () => {
    await expectContract(await getBrandProfile(bearer(`${BASE}/integration/brand-profile`)), 200, res.brandProfileResponse)
    await expectContract(await getBusinessProfile(bearer(`${BASE}/integration/business-profile`)), 200, res.businessProfileResponse)
    await putBrandProfile(withSession(`${BASE}/brand-profile`, a.token, { method: "PUT", body: JSON.stringify({ primary_color: "#1A73E8", tone_of_voice: "ấm" }) }))
    await putBusinessProfile(withSession(`${BASE}/business-profile`, a.token, { method: "PUT", body: JSON.stringify({ display_name: "Tiệm hợp đồng" }) }))
    expect(await expectContract(await getBrandProfile(bearer(`${BASE}/integration/brand-profile`)), 200, res.brandProfileResponse)).not.toBeNull()
    expect(await expectContract(await getBusinessProfile(bearer(`${BASE}/integration/business-profile`)), 200, res.businessProfileResponse)).not.toBeNull()
  })

  it("POST /integration/capabilities/check", async () => {
    await expectContract(
      await checkCapabilities(bearer(`${BASE}/integration/capabilities/check`, post({ user_id: a.userId, capability_codes: ["F9", "L1", "KHONG-CO"] }))),
      200,
      res.capabilitiesCheckResponse
    )
  })

  it("POST /integration/jobs — 201 lần đầu, 200 khi trùng idempotency_key; POST /integration/usage", async () => {
    const body = { feature: "landing.create", payload: { page: "trang-chu" }, idempotency_key: "hop-dong-1" }
    const created = await expectContract(await createJob(bearer(`${BASE}/integration/jobs`, post(body))), 201, res.createJobResponse)
    const again = await expectContract(await createJob(bearer(`${BASE}/integration/jobs`, post(body))), 200, res.createJobResponse)
    expect(again.deduped).toBe(true)
    const jobId = (created.job as { id: string }).id
    await expectContract(
      await recordUsage(bearer(`${BASE}/integration/usage`, post({ feature: "landing.create", status: "COMPLETED", cost_usd: 0.02, job_id: jobId }))),
      201,
      res.usageResponse
    )
  })

  it("POST /integration/content-metrics", async () => {
    await expectContract(
      await recordContentMetrics(
        bearer(`${BASE}/integration/content-metrics`, post({ platform: "facebook", content_id: "bai-1", metric_date: "2026-11-07", reach: 120, spend_usd: 1.5 }))
      ),
      201,
      res.contentMetricsResponse
    )
  })

  it("POST /integration/assets", async () => {
    const assetId = randomUUID()
    await expectContract(
      await registerAsset(
        bearer(
          `${BASE}/integration/assets`,
          post({
            asset_id: assetId,
            product_id: productId,
            parent_asset_id: masterId,
            kind: "SOCIAL",
            storage_key: `org/${a.organizationId}/${productId}/${assetId}.png`,
            mime_type: "image/png",
            width: 1080,
            height: 1080,
            generated_flags: { generative_fill_used: false, requires_reshoot_warning: false },
          })
        )
      ),
      201,
      res.assetResponse
    )
  })

  it("/integration/catalog-links — tạo, liệt kê, sửa, thu hồi (nhánh SSO)", async () => {
    const slug = `hop-dong-${randomUUID().slice(0, 8)}`
    const params = { params: Promise.resolve({ slug }) }
    await expectContract(await createCatalogLink(sso(`${BASE}/integration/catalog-links`, post({ slug, name: "Bộ sưu tập" }))), 201, res.catalogLinkRecord)
    await expectContract(await listCatalogLinks(sso(`${BASE}/integration/catalog-links`)), 200, res.listCatalogLinksResponse)
    await expectContract(
      await updateCatalogLink(sso(`${BASE}/integration/catalog-links/${slug}`, { method: "PATCH", body: JSON.stringify({ name: "Tên mới" }) }), params),
      200,
      res.catalogLinkView
    )
    await expectContract(await revokeCatalogLink(sso(`${BASE}/integration/catalog-links/${slug}/revoke`, { method: "POST" }), params), 200, res.revokeCatalogLinkResponse)
  })
})
