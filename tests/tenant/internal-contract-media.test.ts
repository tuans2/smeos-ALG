import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-media"
import { POST as backgroundRemoval } from "@/app/api/v1/media/background-removal/route"
import { POST as approveOptimization } from "@/app/api/v1/media/optimizations/[id]/approve/route"
// @release-strip — route/mô-đun không có trong bản giao GD1; phần còn lại của test vẫn chạy trên bản cắt
import { GET as downloadOptimization } from "@/app/api/v1/media/optimizations/[id]/download/route"
// @release-strip-end
import { GET as getOptimization } from "@/app/api/v1/media/optimizations/[id]/route"
import { GET as listOptimizations, POST as createOptimization } from "@/app/api/v1/media/optimizations/route"
import { POST as promote } from "@/app/api/v1/media/promote-to-master/route"
// @release-strip
import { POST as approveVariant } from "@/app/api/v1/media/variants/[id]/approve/route"
import { GET as downloadVariant } from "@/app/api/v1/media/variants/[id]/download/route"
import { GET as getVariant } from "@/app/api/v1/media/variants/[id]/route"
import { POST as createBatch } from "@/app/api/v1/media/variants/batch/route"
// @release-strip-end
import { GET as listVariants, POST as createVariants } from "@/app/api/v1/media/variants/route"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { GenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { JobEventRepository } from "@/modules/jobs/infra/job-event-repository"
import { MEDIA_VARIANT_FEATURE } from "@/modules/media/domain/variant-rules"
import { MEDIA_OPTIMIZE_FEATURE } from "@/modules/media/use-cases/request-optimization"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Hợp đồng phản hồi `/media/*` (OpenAPI nội bộ, PO 07/11/2026). Worker Python không chạy ở đây: kết quả của nó (job
 * `COMPLETED`, sự kiện `guard`/`variant_integrity`, asset sinh ra) được chèn thẳng — cùng cách
 * `media-optimizations.test.ts` và `media-variants.test.ts`.
 */
const BASE = "http://localhost/api/v1/media"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })
const GUARD = { identity_score: 1, color_score: 1, geometry_score: 1, component_consistency: 1, result: "SAFE", ly_do: [], provider: "gia", model_version: "v1" }

describe("hợp đồng — ảnh (tối ưu & biến thể)", () => {
  let t: Tenant
  const get = (path: string) => withSession(`${BASE}${path}`, t.token)
  const post = (path: string, body: unknown, idem = false) =>
    withSession(`${BASE}${path}`, t.token, { method: "POST", headers: idem ? { "Idempotency-Key": randomUUID() } : {}, body: JSON.stringify(body) })

  async function asset(kind: "ORIGINAL" | "MASTER" | "MARKETING", extra: { parentAssetId?: string; metadata?: Record<string, unknown> } = {}) {
    const id = randomUUID()
    await new AssetRepository().create(t.ctx, {
      id, productId: null, parentAssetId: extra.parentAssetId ?? null, kind, version: 1, aspectRatio: "4:5",
      storageKey: `org/${t.organizationId}/unfiled/${id}.png`, mimeType: "image/png", createdBy: t.userId,
      generatedFlags: { generative_fill_used: kind === "MARKETING", requires_reshoot_warning: false }, metadata: extra.metadata ?? {},
    })
    return id
  }
  async function completedJob(feature: string, payload: Record<string, unknown>, result: string) {
    const job = await new GenerationJobRepository().create(t.ctx, {
      workspaceId: t.ctx.workspaceId, branchId: null, userId: t.userId, productId: null, feature, payload, idempotencyKey: randomUUID(),
    })
    await prisma.generation_jobs.update({ where: { id: job.id }, data: { status: "COMPLETED", result, completed_at: new Date() } })
    return job.id
  }

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-media")
    await prisma.organizations.update({ where: { id: t.organizationId }, data: { credit_balance: 500 } })
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("tối ưu ảnh: xếp job, đọc, hàng chờ, duyệt, tải; duyệt nhanh ảnh gốc", async () => {
    const original = await asset("ORIGINAL")
    await expectContract(await createOptimization(post("/optimizations", { asset_id: original }, true)), 201, R.optimizationCreatedResponse, "media-opt-create")

    const jobId = await completedJob(MEDIA_OPTIMIZE_FEATURE, { asset_id: original }, "SAFE")
    await new JobEventRepository().append(jobId, "guard", GUARD)
    await asset("MASTER", { parentAssetId: original, metadata: { job_id: jobId, identity_guard: GUARD } })

    await expectContract(await getOptimization(get(`/optimizations/${jobId}`), ps(jobId)), 200, R.optimizationResponse, "media-opt-get")
    const queue = await expectContract(await listOptimizations(get("/optimizations?limit=10")), 200, R.pendingOptimizationsResponse, "media-opt-list")
    expect(queue.data).toHaveLength(1)
    await expectContract(await approveOptimization(post(`/optimizations/${jobId}/approve`, {}), ps(jobId)), 200, R.optimizationResponse, "media-opt-approve")
    // @release-strip
    await expectContract(await downloadOptimization(get(`/optimizations/${jobId}/download`), ps(jobId)), 200, R.downloadResponse, "media-opt-download")
    // @release-strip-end

    await expectContract(await promote(post("/promote-to-master", { asset_id: await asset("ORIGINAL") })), 201, R.promoteToMasterResponse, "media-promote")
    await expectContract(await getOptimization(get(`/optimizations/${randomUUID()}`), ps(randomUUID())), 404, null)
  })

  it("biến thể: xếp job (đơn, lô), đọc, hàng chờ, duyệt, tải", async () => {
    const master = await asset("MASTER")
    await prisma.assets.update({ where: { id: master }, data: { approval_state: "APPROVED", approved_by: t.userId, approved_at: new Date() } })

    const one = { master_asset_id: master, engine: "local_studio", preset: "studio_white", ratio: "4:5" }
    await expectContract(await createVariants(post("/variants", one, true)), 201, R.mediaVariantResultSchema, "media-var-create")
    await expectContract(await createVariants(post("/variants", { ...one, variant_count: 2 }, true)), 201, R.mediaVariantResultSchema, "media-var-create-group")
    // @release-strip
    await expectContract(
      await createBatch(post("/variants/batch", { master_asset_id: master, presets: ["studio_white"], ratios: ["1:1", "4:5"] }, true)),
      201,
      R.variantBatchResponse,
      "media-var-batch"
    )
    // @release-strip-end

    const payload = { master_asset_id: master, preset: "studio_white", ratio: "4:5", watermark: true }
    const jobId = await completedJob(MEDIA_VARIANT_FEATURE, payload, "SAFE")
    await new JobEventRepository().append(jobId, "variant_integrity", {
      subject_pixel_identity: 1, generative_fill_used: true, source_master_asset_id: master, ly_do: [],
    })
    const variant = await asset("MARKETING", {
      parentAssetId: master,
      metadata: { job_id: jobId, variant_key: "styled", title: "Biến thể", background: "Studio trắng", ratio: "4:5", watermark: false, source_master_asset_id: master, subject_pixel_identity: 1 },
    })

    // @release-strip
    await expectContract(await getVariant(get(`/variants/${jobId}`), ps(jobId)), 200, R.variantJobResponse, "media-var-get")
    // @release-strip-end
    const queue = await expectContract(await listVariants(get("/variants")), 200, R.pendingVariantsResponse, "media-var-list")
    expect(queue.data).toHaveLength(1)
    // @release-strip
    await expectContract(await approveVariant(post(`/variants/${jobId}/approve`, { asset_id: variant }), ps(jobId)), 200, R.variantJobResponse, "media-var-approve")
    await expectContract(await downloadVariant(get(`/variants/${jobId}/download?asset_id=${variant}`), ps(jobId)), 200, R.downloadResponse, "media-var-download")
    await expectContract(await downloadVariant(get(`/variants/${jobId}/download`), ps(jobId)), 400, null)
    // @release-strip-end
  })

  it("đường tách nền cũ luôn trả 409, không cần phiên", async () => {
    await expectContract(await backgroundRemoval(new Request(`${BASE}/background-removal`, { method: "POST" })), 409, null)
  })
})
