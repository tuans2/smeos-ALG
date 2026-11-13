import { randomUUID } from "node:crypto"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as backgroundRemovalRoute } from "@/app/api/v1/media/background-removal/route"
import { GET as listVariantsRoute, POST as createVariantRoute } from "@/app/api/v1/media/variants/route"
import type { TenantContext } from "@/core/tenancy"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { GenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { JobEventRepository } from "@/modules/jobs/infra/job-event-repository"
import { MEDIA_VARIANT_CLOUD_FEATURE, MEDIA_VARIANT_FEATURE } from "@/modules/media/domain/variant-rules"
import { requestVariants } from "@/modules/media/use-cases/request-variants"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

/**
 * Cách ly tenant và cổng duyệt của M04b — P24.
 *
 * Worker Python là nơi dựng ảnh thật; ở đây ta CHÈN kết quả của nó (job
 * `COMPLETED` + sự kiện `variant_integrity` + asset `MARKETING`) rồi kiểm
 * phía TS xử lý đúng — cùng cách `media-optimizations.test.ts` mô phỏng
 * những gì worker M04a ghi.
 */
describe("cách ly tenant — M04b biến thể marketing (P24)", () => {
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

  const params = (id: string) => ({ params: Promise.resolve({ id }) })

  /**
   * Workspace `PRODUCTION` riêng — để kiểm đường hạn mức CREDIT.
   *
   * Workspace mặc định mà `sign-up` tạo LUÔN là `EXPERIENCE` (tổ chức mới là
   * tổ chức trải nghiệm), nên `a.ctx` và mọi lời gọi qua cookie phiên đều đi
   * đường hạn mức TRIAL: `cost_credit` là 0 và `credit_balance` không bị
   * đụng, bất kể bảng giá ghi bao nhiêu. Cùng khuôn
   * `withProductionWorkspace` của `enqueue-job.test.ts`, và cùng lý do.
   */
  async function withProductionWorkspace(tenant: Tenant) {
    const workspace = await prisma.workspaces.create({
      data: {
        organization_id: tenant.organizationId,
        name: "Sản xuất",
        kind: "PRODUCTION",
      },
    })
    return { ...tenant.ctx, workspaceId: workspace.id }
  }

  async function seedMaster(
    ctx: TenantContext,
    approvalState: "PENDING" | "APPROVED" = "APPROVED",
    kind: "MASTER" | "ORIGINAL" = "MASTER"
  ): Promise<string> {
    const asset = await new AssetRepository().create(ctx, {
      id: randomUUID(),
      productId: null,
      parentAssetId: null,
      kind,
      version: 2,
      storageKey: `org/${ctx.organizationId}/unfiled/${randomUUID()}.jpg`,
      mimeType: "image/jpeg",
      createdBy: ctx.userId,
    })
    if (approvalState === "APPROVED") {
      await prisma.assets.update({
        where: { id: asset.id },
        data: { approval_state: "APPROVED", approved_by: ctx.userId, approved_at: new Date() },
      })
    }
    return asset.id
  }

  /** Mô phỏng đúng những gì worker M04b ghi khi job chạy xong. */
  async function seedVariantJob(
    tenant: Tenant,
    doTrung: number,
    options: { ghiAsset?: boolean } = {}
  ): Promise<{ jobId: string; masterId: string; variantIds: string[] }> {
    const masterId = await seedMaster(tenant.ctx)
    const job = await new GenerationJobRepository().create(tenant.ctx, {
      workspaceId: tenant.ctx.workspaceId,
      branchId: null,
      userId: tenant.userId,
      productId: null,
      feature: MEDIA_VARIANT_FEATURE,
      payload: {
        master_asset_id: masterId,
        preset: "studio_white",
        ratio: "4:5",
        watermark: true,
      },
      idempotencyKey: randomUUID(),
    })
    await prisma.generation_jobs.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        result: doTrung >= 0.999 ? "SAFE" : doTrung >= 0.99 ? "WARNING" : "REJECTED",
        completed_at: new Date(),
      },
    })
    await new JobEventRepository().append(job.id, "variant_integrity", {
      subject_pixel_identity: doTrung,
      generative_fill_used: true,
      source_master_asset_id: masterId,
      ly_do: doTrung < 0.99 ? ["Lõi chủ thể đã bị thay đổi"] : [],
    })

    const variantIds: string[] = []
    // Worker KHÔNG ghi asset khi bị từ chối — mô phỏng đúng vậy.
    const ghiAsset = options.ghiAsset ?? doTrung >= 0.99
    if (ghiAsset) {
      for (const key of ["transparent", "styled", "branded"]) {
        const v = await new AssetRepository().create(tenant.ctx, {
          id: randomUUID(),
          productId: null,
          parentAssetId: masterId,
          kind: "MARKETING",
          version: 1,
          storageKey: `org/${tenant.organizationId}/unfiled/${randomUUID()}_m04b_${key}.png`,
          mimeType: "image/png",
          aspectRatio: "4:5",
          identityScore: doTrung,
          generatedFlags: { generative_fill_used: key !== "transparent", requires_reshoot_warning: false },
          metadata: {
            job_id: job.id,
            variant_key: key,
            title: `Biến thể ${key}`,
            background: "Studio trắng tinh khôi",
            ratio: "4:5",
            watermark: key === "branded",
            source_master_asset_id: masterId,
            subject_pixel_identity: doTrung,
          },
          createdBy: tenant.userId,
        })
        variantIds.push(v.id)
      }
    }
    return { jobId: job.id, masterId, variantIds }
  }

  describe("endpoint cũ đã đóng", () => {
    it("POST /media/background-removal không còn chạy mô hình nào", async () => {
      // Endpoint này từng không đòi đăng nhập và `spawn` thẳng Python. Ca thử
      // khoá việc nó đã đóng: một lượt gọi trần trụi, không cookie phiên.
      const response = await backgroundRemovalRoute(
        new Request(`${BASE}/media/background-removal`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ image_url: "http://169.254.169.254/latest/meta-data/" }),
        })
      )
      expect(response.status).toBe(409)
      const body = await readJson(response)
      expect(JSON.stringify(body)).toContain("/api/v1/media/variants")
    })
  })

  describe("tạo job", () => {
    it("từ chối Master của tổ chức khác TRƯỚC khi trừ credit", async () => {
      const cuaB = await seedMaster(b.ctx)
      const truoc = await prisma.organizations.findUnique({ where: { id: a.organizationId } })

      const response = await createVariantRoute(
        withSession(`${BASE}/media/variants`, a.token, {
          method: "POST",
          headers: { "idempotency-key": randomUUID() },
          body: JSON.stringify({
            master_asset_id: cuaB,
            preset: "studio_white",
            ratio: "1:1",
            watermark: true,
          }),
        })
      )

      expect(response.status).toBe(404)
      const sau = await prisma.organizations.findUnique({ where: { id: a.organizationId } })
      expect(sau?.credit_balance).toBe(truoc?.credit_balance)
      expect(await prisma.generation_jobs.count({ where: { organization_id: a.organizationId } })).toBe(0)
    })

    it("Master CHƯA duyệt trả 409 — không có đường vòng qua cổng 2", async () => {
      const choDuyet = await seedMaster(a.ctx, "PENDING")
      const response = await createVariantRoute(
        withSession(`${BASE}/media/variants`, a.token, {
          method: "POST",
          headers: { "idempotency-key": randomUUID() },
          body: JSON.stringify({
            master_asset_id: choDuyet,
            preset: "wedding",
            ratio: "9:16",
            watermark: false,
          }),
        })
      )
      // 409 chứ không 403: người gọi CÓ năng lực I4, bản ghi mới là thứ chưa dùng được.
      expect(response.status).toBe(409)
      expect(await prisma.generation_jobs.count({ where: { organization_id: a.organizationId } })).toBe(0)
    })

    it("ảnh gốc ORIGINAL đã duyệt cũng bị từ chối — biến thể dựng trên Master", async () => {
      const anhGoc = await seedMaster(a.ctx, "APPROVED", "ORIGINAL")
      const response = await createVariantRoute(
        withSession(`${BASE}/media/variants`, a.token, {
          method: "POST",
          headers: { "idempotency-key": randomUUID() },
          body: JSON.stringify({
            master_asset_id: anhGoc,
            preset: "studio_white",
            ratio: "1:1",
            watermark: true,
          }),
        })
      )
      expect(response.status).toBe(409)
    })

    it("thiếu Idempotency-Key bị từ chối (YC-U7)", async () => {
      const masterId = await seedMaster(a.ctx)
      const response = await createVariantRoute(
        withSession(`${BASE}/media/variants`, a.token, {
          method: "POST",
          body: JSON.stringify({
            master_asset_id: masterId,
            preset: "studio_white",
            ratio: "1:1",
            watermark: true,
          }),
        })
      )
      expect(response.status).toBe(400)
    })

    it("preset lạ bị từ chối ở biên, không xuống tới worker", async () => {
      const masterId = await seedMaster(a.ctx)
      const response = await createVariantRoute(
        withSession(`${BASE}/media/variants`, a.token, {
          method: "POST",
          headers: { "idempotency-key": randomUUID() },
          body: JSON.stringify({
            master_asset_id: masterId,
            preset: "bối cảnh tự chế",
            ratio: "1:1",
            watermark: true,
          }),
        })
      )
      expect(response.status).toBe(400)
    })

    it("lượt hợp lệ ghi dòng `usage` — không còn đường chạy ngoài sổ", async () => {
      const masterId = await seedMaster(a.ctx)

      const response = await createVariantRoute(
        withSession(`${BASE}/media/variants`, a.token, {
          method: "POST",
          headers: { "idempotency-key": randomUUID() },
          body: JSON.stringify({
            master_asset_id: masterId,
            preset: "studio_white",
            ratio: "4:5",
            watermark: true,
          }),
        })
      )

      expect(response.status).toBe(201)

      // Đây là điều ca này khoá lại, và là điều đường chạy cũ KHÔNG có: mỗi
      // lượt gọi mô hình để lại đúng một dòng trong sổ, gắn với tổ chức.
      // PO 25/09/2026: không nêu `engine` = nhà cung cấp trước (`media.variant.cloud`),
      // kèm thứ tự thử của tiệm trong payload.
      const rows = await prisma.usage.findMany({
        where: { organization_id: a.organizationId, feature: MEDIA_VARIANT_CLOUD_FEATURE },
      })
      expect(rows).toHaveLength(1)
      expect(rows[0]!.status).toBe("ENQUEUED")
      expect(await prisma.usage.count({ where: { organization_id: a.organizationId, feature: MEDIA_VARIANT_FEATURE } })).toBe(0)
      const job = await prisma.generation_jobs.findFirst({ where: { organization_id: a.organizationId } })
      expect((job!.payload as { provider_order: string[] }).provider_order).toEqual(["fal", "stability", "imagen"])

      // Workspace mặc định là `EXPERIENCE` nên lượt này đi hạn mức TRIAL:
      // `cost_credit` là 0 và `credit_balance` không bị đụng. Đường CREDIT
      // kiểm ở ca dưới, trên một workspace `PRODUCTION` thật.
      const usage = (await readJson(response)).usage as Record<string, unknown>
      expect(usage.cost_credit).toBe(0)
      expect((rows[0]!.metadata as Record<string, unknown>).funded_by).toBe("trial")
    })

    it("trên workspace PRODUCTION thì TRỪ đúng 1 credit theo bảng giá", async () => {
      const ctx = await withProductionWorkspace(a)
      await prisma.organizations.update({
        where: { id: a.organizationId },
        data: { credit_balance: 10 },
      })
      const masterId = await seedMaster(ctx)

      const result = await requestVariants(ctx, {
        masterAssetId: masterId,
        preset: "studio_white",
        ratio: "4:5",
        watermark: true,
        idempotencyKey: randomUUID(),
      })

      expect(result.usage.costCredit).toBe(1)
      expect(result.usage.balanceAfter).toBe(9)

      const sau = await prisma.organizations.findUnique({ where: { id: a.organizationId } })
      expect(sau!.credit_balance).toBe(9)
    })
  })

  describe("đọc kết quả", () => {
    it("trả URL ký có hạn cho từng biến thể, kèm số đo toàn vẹn", async () => {
      const { jobId } = await seedVariantJob(a, 1)


    })

    it("lõi lệch nhẹ bật cờ cảnh báo trước khi duyệt", async () => {
      const { jobId } = await seedVariantJob(a, 0.995)
    })

    it("job của tổ chức khác trả 404, không phải 403 (YC-T4)", async () => {
      const { jobId } = await seedVariantJob(a, 1)
    })

    it("bị từ chối thì không có biến thể nào và không duyệt được", async () => {
      const { jobId } = await seedVariantJob(a, 0.4)
    })

    it("phán quyết tính lại từ SỐ ĐO, không tin `result` trên dòng job", async () => {
      const { jobId } = await seedVariantJob(a, 0.4, { ghiAsset: true })
      // Giả cảnh worker cũ (hoặc bị sửa) ghi `result = SAFE` lên dòng job.
      await prisma.generation_jobs.update({ where: { id: jobId }, data: { result: "SAFE" } })

    })
  })

  describe("cổng duyệt biến thể", () => {

    it("REJECTED trả 409, KHÔNG phải 403", async () => {
      const { jobId, variantIds } = await seedVariantJob(a, 0.4, { ghiAsset: true })
      const rows = await prisma.assets.findMany({ where: { id: { in: variantIds } } })
      expect(rows.every((r) => r.approval_state === "PENDING")).toBe(true)
    })

    it("asset của job KHÁC không duyệt được qua job này", async () => {
      const mot = await seedVariantJob(a, 1)
      const hai = await seedVariantJob(a, 1)
    })

    it("duyệt hai lần trả 409, không ghi đè người duyệt trước", async () => {
      const { jobId, variantIds } = await seedVariantJob(a, 1)
    })

    it("tổ chức khác không duyệt được biến thể của mình", async () => {
      const { jobId, variantIds } = await seedVariantJob(a, 1)
    })
  })

  describe("tải về tách khỏi duyệt (M04 mục 5.1)", () => {
    it("tải được biến thể CHƯA duyệt, và nó vẫn chưa duyệt sau đó", async () => {
      const { jobId, variantIds } = await seedVariantJob(a, 1)

      const row = await prisma.assets.findUnique({ where: { id: variantIds[0]! } })
      expect(row?.approval_state).toBe("PENDING")
    })

    it("thiếu asset_id trả 400 — một lượt có nhiều biến thể", async () => {
      const { jobId } = await seedVariantJob(a, 1)
    })

    it("lượt bị cổng toàn vẹn từ chối thì không tải được", async () => {
      const { jobId, variantIds } = await seedVariantJob(a, 0.4, { ghiAsset: true })
    })
  })

  describe("hàng chờ duyệt", () => {
    it("chỉ liệt kê lượt của chính tổ chức mình", async () => {
      await seedVariantJob(a, 1)
      await seedVariantJob(b, 1)

      const body = await readJson(
        await listVariantsRoute(withSession(`${BASE}/media/variants`, a.token))
      )
      const data = body.data as Array<Record<string, unknown>>
      expect(data).toHaveLength(1)
      expect(data[0]!.pending_count).toBe(3)
      expect(data[0]!.total_count).toBe(3)
    })


    it("lượt bị từ chối không vào hàng chờ duyệt", async () => {
      await seedVariantJob(a, 0.4)
      const body = await readJson(
        await listVariantsRoute(withSession(`${BASE}/media/variants`, a.token))
      )
      expect(body.data).toHaveLength(0)
    })
  })
})
