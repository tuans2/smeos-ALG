import { randomUUID } from "node:crypto"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import {
  GET as getAnalysisRoute,
  PATCH as patchAnalysisRoute,
} from "@/app/api/v1/vision/analyses/[id]/route"
import { POST as approveAnalysisRoute } from "@/app/api/v1/vision/analyses/[id]/approve/route"
import { POST as createAnalysisRoute } from "@/app/api/v1/vision/analyses/route"
import type { TenantContext } from "@/core/tenancy"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { ProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

async function seedAsset(ctx: TenantContext): Promise<string> {
  const asset = await new AssetRepository().create(ctx, {
    id: randomUUID(),
    productId: null,
    parentAssetId: null,
    kind: "ORIGINAL",
    version: 1,
    storageKey: `org/${ctx.organizationId}/khong-san-pham/${randomUUID()}.jpg`,
    mimeType: "image/jpeg",
    createdBy: ctx.userId,
  })
  return asset.id
}

/** Chèn thẳng một `product_analyses` — mô phỏng dòng worker Python ghi sau khi phân tích xong (D6-1: không có đường TS nào tạo dòng này trong luồng thật). */
async function seedAnalysis(ctx: TenantContext, assetId: string) {
  return new ProductAnalysisRepository().create(ctx, {
    productId: null,
    assetId,
    jobId: randomUUID(),
    provider: "openai",
    model: "gpt-4o",
    modelVersion: "2026-08-01",
    contractName: "PhanTichSanPhamHoa",
    contractVersion: "1",
    raw: { identity: { category: "Bó hoa", shape: "Tròn", facing: "Một mặt", container: "Giấy gói" } },
  })
}

describe("cách ly tenant — M01 phân tích ảnh (P5)", () => {
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

  it("POST /vision/analyses với asset_id của tổ chức khác trả 404", async () => {
    const assetOfA = await seedAsset(a.ctx)

    const response = await createAnalysisRoute(
      withSession(`${BASE}/vision/analyses`, b.token, {
        method: "POST",
        headers: { "idempotency-key": randomUUID() },
        body: JSON.stringify({ asset_ids: [assetOfA] }),
      })
    )

    expect(response.status).toBe(404)
  })

  it("POST /vision/analyses thiếu Idempotency-Key trả 400 (YC-U7)", async () => {
    const assetOfA = await seedAsset(a.ctx)

    const response = await createAnalysisRoute(
      withSession(`${BASE}/vision/analyses`, a.token, {
        method: "POST",
        body: JSON.stringify({ asset_ids: [assetOfA] }),
      })
    )

    expect(response.status).toBe(400)
  })

  it("POST /vision/analyses hợp lệ trả job_id và usage.cost_credit", async () => {
    // Workspace mặc định của `sign-up` LUÔN là EXPERIENCE (đường TRIAL,
    // cost_credit = 0 — xem chú thích đầu tệp `enqueue-job.test.ts`). Muốn
    // kiểm đúng ví dụ đặc tả 06 mục 8 (`"cost_credit": 1`) phải đổi workspace
    // MẶC ĐỊNH (sớm nhất theo created_at, xem `findDefaultForSessionOrganization`)
    // sang PRODUCTION trước — không tạo thêm workspace mới như
    // `withProductionWorkspace`, vì route đi qua phiên thật sẽ luôn giải ra
    // workspace sớm nhất, không phải workspace vừa tạo thêm.
    await prisma.workspaces.update({
      where: { id: a.ctx.workspaceId },
      data: { kind: "PRODUCTION" },
    })
    const assetOfA = await seedAsset(a.ctx)

    const response = await createAnalysisRoute(
      withSession(`${BASE}/vision/analyses`, a.token, {
        method: "POST",
        headers: { "idempotency-key": randomUUID() },
        body: JSON.stringify({ asset_ids: [assetOfA], product_id: null }),
      })
    )

    expect(response.status).toBe(201)
    const body = await readJson(response)
    expect(typeof body.job_id).toBe("string")
    expect(body.status).toBe("PENDING")
    expect((body.usage as { cost_credit: number }).cost_credit).toBe(1)
  })

  it("GET /vision/analyses/:id của tổ chức khác trả 404, không lộ dữ liệu", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await seedAnalysis(a.ctx, assetOfA)

    const asOwner = await getAnalysisRoute(
      withSession(`${BASE}/vision/analyses/${analysis.id}`, a.token),
      { params: Promise.resolve({ id: analysis.id }) }
    )
    expect(asOwner.status).toBe(200)

    const asOther = await getAnalysisRoute(
      withSession(`${BASE}/vision/analyses/${analysis.id}`, b.token),
      { params: Promise.resolve({ id: analysis.id }) }
    )
    expect(asOther.status).toBe(404)
  })

  it("PATCH /vision/analyses/:id ghi vào edited, không đụng raw (YC-R3)", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await seedAnalysis(a.ctx, assetOfA)

    const response = await patchAnalysisRoute(
      withSession(`${BASE}/vision/analyses/${analysis.id}`, a.token, {
        method: "PATCH",
        body: JSON.stringify({ edited: { identity: { category: "Giỏ hoa" } } }),
      }),
      { params: Promise.resolve({ id: analysis.id }) }
    )

    expect(response.status).toBe(200)
    const body = await readJson(response)
    expect((body.edited as { identity: { category: string } }).identity.category).toBe("Giỏ hoa")
    expect((body.raw as { identity: { category: string } }).identity.category).toBe("Bó hoa")
  })

  it("PATCH /vision/analyses/:id của tổ chức khác trả 404", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await seedAnalysis(a.ctx, assetOfA)

    const response = await patchAnalysisRoute(
      withSession(`${BASE}/vision/analyses/${analysis.id}`, b.token, {
        method: "PATCH",
        body: JSON.stringify({ edited: {} }),
      }),
      { params: Promise.resolve({ id: analysis.id }) }
    )

    expect(response.status).toBe(404)
  })

  it("POST /vision/analyses/:id/approve tạo sản phẩm mới khi chưa gắn product_id, ghi audit_logs, và trả 409 khi duyệt lại", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await seedAnalysis(a.ctx, assetOfA)

    const response = await approveAnalysisRoute(
      withSession(`${BASE}/vision/analyses/${analysis.id}/approve`, a.token, { method: "POST" }),
      { params: Promise.resolve({ id: analysis.id }) }
    )

    expect(response.status).toBe(200)
    const body = await readJson(response)
    expect(body.approval_state).toBe("APPROVED")
    expect(body.approved_by).toBe(a.userId)
    expect(typeof body.product_id).toBe("string")

    const product = await prisma.products.findUnique({ where: { id: body.product_id as string } })
    expect(product?.category).toBe("Bó hoa")
    expect(product?.organization_id).toBe(a.organizationId)

    const auditRows = await prisma.audit_logs.findMany({
      where: { organization_id: a.organizationId, action: "product.approve" },
    })
    expect(auditRows).toHaveLength(1)
    expect(auditRows[0]?.entity_id).toBe(analysis.id)

    const second = await approveAnalysisRoute(
      withSession(`${BASE}/vision/analyses/${analysis.id}/approve`, a.token, { method: "POST" }),
      { params: Promise.resolve({ id: analysis.id }) }
    )
    expect(second.status).toBe(409)
  })

  it("POST /vision/analyses/:id/approve của tổ chức khác trả 404", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await seedAnalysis(a.ctx, assetOfA)

    const response = await approveAnalysisRoute(
      withSession(`${BASE}/vision/analyses/${analysis.id}/approve`, b.token, { method: "POST" }),
      { params: Promise.resolve({ id: analysis.id }) }
    )

    expect(response.status).toBe(404)
  })

})
