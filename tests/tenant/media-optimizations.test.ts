import { randomUUID } from "node:crypto"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getOptimizationRoute } from "@/app/api/v1/media/optimizations/[id]/route"
import { POST as approveRoute } from "@/app/api/v1/media/optimizations/[id]/approve/route"
// @release-strip — route/mô-đun không có trong bản giao GD1; phần còn lại của test vẫn chạy trên bản cắt
import { GET as downloadRoute } from "@/app/api/v1/media/optimizations/[id]/download/route"
// @release-strip-end
import { POST as createOptimizationRoute } from "@/app/api/v1/media/optimizations/route"
import { GET as integrationMasterImageRoute } from "@/app/api/v1/integration/products/[id]/master-image/route"
import { POST as issueTokenRoute } from "@/app/api/v1/integration-tokens/route"
import { POST as createProductRoute } from "@/app/api/v1/products/route"
import type { TenantContext } from "@/core/tenancy"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { GenerationJobRepository } from "@/modules/jobs/infra/generation-job-repository"
import { JobEventRepository } from "@/modules/jobs/infra/job-event-repository"
import { MEDIA_OPTIMIZE_FEATURE } from "@/modules/media/use-cases/request-optimization"
import { refundJob } from "@/modules/usage/use-cases/refund-job"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withBearer, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

/**
 * Cách ly tenant và hai cổng của M04a — P9.
 *
 * Worker Python là nơi chạy Identity Guard thật; ở đây ta CHÈN kết quả của
 * nó (job `COMPLETED` + sự kiện `guard` + asset `MASTER`) rồi kiểm phía TS
 * xử lý đúng — đúng cách `vision-analyses.test.ts` mô phỏng dòng
 * `product_analyses` do worker M01 ghi (D6-1: không có đường TS nào tạo
 * những dòng đó trong luồng thật).
 */
describe("cách ly tenant — M04a tối ưu ảnh và hai cổng (P9)", () => {
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

  async function seedAsset(ctx: TenantContext, productId: string | null): Promise<string> {
    const asset = await new AssetRepository().create(ctx, {
      id: randomUUID(),
      productId,
      parentAssetId: null,
      kind: "ORIGINAL",
      version: 1,
      storageKey: `org/${ctx.organizationId}/${productId ?? "unfiled"}/${randomUUID()}.jpg`,
      mimeType: "image/jpeg",
      createdBy: ctx.userId,
    })
    return asset.id
  }

  function khoiGuard(result: string, overrides: Record<string, unknown> = {}) {
    const diem = result === "REJECTED" ? 0.75 : result === "WARNING" ? 0.93 : 1
    return {
      identity_score: diem, color_score: diem, geometry_score: diem,
      component_consistency: diem, result,
      ly_do: result === "SAFE" ? [] : ["Số lượng cẩm chướng đổi: 30 → 20"],
      provider: "gia", model_version: "v1",
      ...overrides,
    }
  }

  /** Mô phỏng đúng những gì worker M04a ghi khi job chạy xong. */
  async function seedJobDaChay(
    tenant: Tenant,
    result: string,
    options: { taoMaster?: boolean; productId?: string | null } = {}
  ): Promise<{ jobId: string; masterAssetId: string | null; assetGocId: string }> {
    const productId = options.productId ?? null
    const assetGocId = await seedAsset(tenant.ctx, productId)
    const jobRepo = new GenerationJobRepository()
    const job = await jobRepo.create(tenant.ctx, {
      workspaceId: tenant.ctx.workspaceId,
      branchId: null,
      userId: tenant.userId,
      productId,
      feature: MEDIA_OPTIMIZE_FEATURE,
      payload: { asset_id: assetGocId },
      idempotencyKey: randomUUID(),
    })
    await prisma.generation_jobs.update({
      where: { id: job.id },
      data: { status: "COMPLETED", result, completed_at: new Date() },
    })
    await new JobEventRepository().append(job.id, "guard", khoiGuard(result))

    let masterAssetId: string | null = null
    // Worker KHÔNG ghi asset khi bị từ chối — mô phỏng đúng vậy.
    const taoMaster = options.taoMaster ?? result !== "REJECTED"
    if (taoMaster) {
      const master = await new AssetRepository().create(tenant.ctx, {
        id: randomUUID(),
        productId,
        parentAssetId: assetGocId,
        kind: "MASTER",
        version: 2,
        storageKey: `org/${tenant.organizationId}/${productId ?? "unfiled"}/${randomUUID()}.jpg`,
        mimeType: "image/jpeg",
        generatedFlags: { generative_fill_used: false, requires_reshoot_warning: false },
        metadata: { job_id: job.id, identity_guard: khoiGuard(result) },
        createdBy: tenant.userId,
      })
      masterAssetId = master.id
    }
    return { jobId: job.id, masterAssetId, assetGocId }
  }

  const params = (id: string) => ({ params: Promise.resolve({ id }) })

  describe("tạo job", () => {
    it("POST /media/optimizations từ chối asset của tổ chức khác TRƯỚC khi trừ credit", async () => {
      const cuaB = await seedAsset(b.ctx, null)
      const truoc = await prisma.organizations.findUnique({ where: { id: a.organizationId } })

      const response = await createOptimizationRoute(
        withSession(`${BASE}/media/optimizations`, a.token, {
          method: "POST",
          headers: { "idempotency-key": randomUUID() },
          body: JSON.stringify({ asset_id: cuaB }),
        })
      )

      expect(response.status).toBe(404)
      const sau = await prisma.organizations.findUnique({ where: { id: a.organizationId } })
      expect(sau?.credit_balance).toBe(truoc?.credit_balance)
      expect(await prisma.generation_jobs.count({ where: { organization_id: a.organizationId } })).toBe(0)
    })

    it("thiếu Idempotency-Key bị từ chối (YC-U7)", async () => {
      const assetId = await seedAsset(a.ctx, null)
      const response = await createOptimizationRoute(
        withSession(`${BASE}/media/optimizations`, a.token, {
          method: "POST",
          body: JSON.stringify({ asset_id: assetId }),
        })
      )
      expect(response.status).toBe(400)
    })

    // Nợ #120 (trả 25/09/2026): nhánh nhà cung cấp từng gọi API trả phí đồng
    // bộ, không trừ credit, bỏ qua Idempotency-Key, trả `balance_after: 99` giả.
    it("nhánh nhà cung cấp vào hàng đợi, trừ credit thật, trùng khoá không trừ lần hai", async () => {
      const assetId = await seedAsset(a.ctx, null)
      const wsTruoc = await prisma.workspaces.findUnique({ where: { id: a.ctx.workspaceId } })
      const key = randomUUID()
      const goi = () =>
        createOptimizationRoute(
          withSession(`${BASE}/media/optimizations`, a.token, {
            method: "POST",
            headers: { "idempotency-key": key },
            body: JSON.stringify({ asset_id: assetId, config: { engine: "cloud_provider", enhancer_provider: "photoroom" } }),
          })
        )

      const lan1 = await goi()
      expect(lan1.status).toBe(201)
      const body = await readJson(lan1)
      expect(body.engine).toBe("cloud_provider")
      expect(body.status).toBe("PENDING")

      // Lượt trùng khoá trả lại job cũ, không tính tiền lần hai.
      expect((await readJson(await goi())).job_id).toBe(body.job_id)
      // Tổ chức thử (workspace EXPERIENCE) trả bằng lượt dùng thử thay credit —
      // cùng một giao dịch `enqueueJob`; điều cần khoá là lượt này VÀO SỔ, đúng một lần.
      const wsSau = await prisma.workspaces.findUnique({ where: { id: a.ctx.workspaceId } })
      expect(wsSau?.trial_count).toBe((wsTruoc?.trial_count ?? 0) + 1)
      expect(await prisma.usage.count({ where: { organization_id: a.organizationId, job_id: body.job_id as string } })).toBe(1)
      const jobs = await prisma.generation_jobs.findMany({ where: { organization_id: a.organizationId } })
      expect(jobs).toHaveLength(1)
      expect(jobs[0]?.feature).toBe(MEDIA_OPTIMIZE_FEATURE)
      expect((jobs[0]?.payload as { config: Record<string, unknown> }).config.enhancer_provider).toBe("photoroom")
      // Không còn asset nào được ghi ngay trong request — worker ghi sau khi đo guard.
      expect(await prisma.assets.count({ where: { organization_id: a.organizationId, kind: "MASTER" } })).toBe(0)
    })

    it("nhà cung cấp worker không có bị từ chối 400 trước khi trừ credit", async () => {
      const assetId = await seedAsset(a.ctx, null)
      const truoc = await prisma.organizations.findUnique({ where: { id: a.organizationId } })
      const response = await createOptimizationRoute(
        withSession(`${BASE}/media/optimizations`, a.token, {
          method: "POST",
          headers: { "idempotency-key": randomUUID() },
          body: JSON.stringify({ asset_id: assetId, config: { engine: "cloud_provider", enhancer_provider: "gemini" } }),
        })
      )
      expect(response.status).toBe(400)
      const sau = await prisma.organizations.findUnique({ where: { id: a.organizationId } })
      expect(sau?.credit_balance).toBe(truoc?.credit_balance)
      expect(await prisma.generation_jobs.count({ where: { organization_id: a.organizationId } })).toBe(0)
    })
  })

  describe("đọc kết quả", () => {
    it("GET trả khối bốn điểm đọc từ sự kiện guard, kèm cờ cho giao diện", async () => {
      const { jobId } = await seedJobDaChay(a, "WARNING")
      const body = await readJson(
        await getOptimizationRoute(withSession(`${BASE}/media/optimizations/${jobId}`, a.token), params(jobId))
      )

      const guard = body.identity_guard as Record<string, unknown>
      expect(guard.result).toBe("WARNING")
      expect(guard.identity_score).toBe(0.93)
      const approval = body.approval as Record<string, unknown>
      expect(approval.can_approve).toBe(true)
      expect(approval.requires_warning).toBe(true) // YC-R6
      expect(approval.state).toBe("pending")
    })

    it("job của tổ chức khác trả 404, không phải 403 (YC-T4)", async () => {
      const { jobId } = await seedJobDaChay(a, "SAFE")
      const response = await getOptimizationRoute(
        withSession(`${BASE}/media/optimizations/${jobId}`, b.token), params(jobId)
      )
      expect(response.status).toBe(404)
    })

    it("bị từ chối thì không có Master Image và không duyệt được", async () => {
      const { jobId } = await seedJobDaChay(a, "REJECTED")
      const body = await readJson(
        await getOptimizationRoute(withSession(`${BASE}/media/optimizations/${jobId}`, a.token), params(jobId))
      )
      expect((body.outputs as Record<string, unknown>).master).toBeNull()
      expect((body.approval as Record<string, unknown>).can_approve).toBe(false)
    })
  })

  describe("cổng 2 — Review & Approve", () => {
    it("REJECTED trả 409, KHÔNG phải 403 (YC-R5)", async () => {
      const { jobId } = await seedJobDaChay(a, "REJECTED")
      const response = await approveRoute(
        withSession(`${BASE}/media/optimizations/${jobId}/approve`, a.token, { method: "POST" }),
        params(jobId)
      )
      // Người gọi CÓ quyền I2; bản ghi mới là thứ không duyệt được.
      expect(response.status).toBe(409)
    })

    it("WARNING duyệt được (YC-R6) và ghi audit log trong cùng giao dịch", async () => {
      const { jobId, masterAssetId } = await seedJobDaChay(a, "WARNING")
      const response = await approveRoute(
        withSession(`${BASE}/media/optimizations/${jobId}/approve`, a.token, { method: "POST" }),
        params(jobId)
      )
      expect(response.status).toBe(200)

      const asset = await prisma.assets.findUnique({ where: { id: masterAssetId! } })
      expect(asset?.approval_state).toBe("APPROVED")
      expect(asset?.approved_by).toBe(a.userId)
      expect(asset?.approved_at).not.toBeNull()

      const log = await prisma.audit_logs.findFirst({
        where: { organization_id: a.organizationId, action: "media.approve" },
      })
      expect(log?.entity_id).toBe(masterAssetId)
    })

    it("duyệt hai lần thì lần sau trả 409, không ghi đè người duyệt trước", async () => {
      const { jobId, masterAssetId } = await seedJobDaChay(a, "SAFE")
      await approveRoute(
        withSession(`${BASE}/media/optimizations/${jobId}/approve`, a.token, { method: "POST" }),
        params(jobId)
      )
      const truoc = await prisma.assets.findUnique({ where: { id: masterAssetId! } })

      const lai = await approveRoute(
        withSession(`${BASE}/media/optimizations/${jobId}/approve`, a.token, { method: "POST" }),
        params(jobId)
      )
      expect(lai.status).toBe(409)
      const sau = await prisma.assets.findUnique({ where: { id: masterAssetId! } })
      expect(sau?.approved_at?.getTime()).toBe(truoc?.approved_at?.getTime())
      expect(await prisma.audit_logs.count({
        where: { organization_id: a.organizationId, action: "media.approve" },
      })).toBe(1)
    })

    it("job chưa chạy xong thì chưa có gì để duyệt", async () => {
      const assetId = await seedAsset(a.ctx, null)
      const job = await new GenerationJobRepository().create(a.ctx, {
        workspaceId: a.ctx.workspaceId, branchId: null, userId: a.userId, productId: null,
        feature: MEDIA_OPTIMIZE_FEATURE, payload: { asset_id: assetId },
        idempotencyKey: randomUUID(),
      })
      const response = await approveRoute(
        withSession(`${BASE}/media/optimizations/${job.id}/approve`, a.token, { method: "POST" }),
        params(job.id)
      )
      expect(response.status).toBe(409)
    })
  })

  describe("tải về — không phải phê duyệt", () => {
    it("tải được ảnh đã qua cổng mà KHÔNG làm nó thành ảnh chính thức", async () => {
      const { jobId, masterAssetId } = await seedJobDaChay(a, "GOOD")
      // @release-strip
      const body = await readJson(
        await downloadRoute(withSession(`${BASE}/media/optimizations/${jobId}/download`, a.token), params(jobId))
      )
      expect(body.asset_id).toBe(masterAssetId)
      expect(typeof body.url).toBe("string")
      // @release-strip-end

      // M04 mục 5.1 — tải về không phải phê duyệt.
      const asset = await prisma.assets.findUnique({ where: { id: masterAssetId! } })
      expect(asset?.approval_state).toBe("PENDING")
    })

    it("ảnh bị từ chối không tải được", async () => {
      const { jobId } = await seedJobDaChay(a, "REJECTED")
      // @release-strip
      const response = await downloadRoute(
        withSession(`${BASE}/media/optimizations/${jobId}/download`, a.token), params(jobId)
      )
      expect(response.status).toBe(409)
      // @release-strip-end
    })
  })

  describe("nợ #30 — master-image hết 404 sau khi duyệt", () => {
    it("engine ngoài chỉ thấy ảnh SAU khi cổng 2 duyệt", async () => {
      const san_pham = await readJson(
        await createProductRoute(
          withSession(`${BASE}/products`, a.token, {
            method: "POST",
            body: JSON.stringify({ code: "BHSK0001", name: "Bó hoa", status: "ACTIVE" }),
          })
        )
      )
      const productId = san_pham.id as string
      const { jobId } = await seedJobDaChay(a, "SAFE", { productId })

      const token = await readJson(
        await issueTokenRoute(
          withSession(`${BASE}/integration-tokens`, a.token, {
            method: "POST",
            body: JSON.stringify({ client: "LOCALBUDD" }),
          })
        )
      )
      const goi = () =>
        integrationMasterImageRoute(
          withBearer(`${BASE}/integration/products/${productId}/master-image`, token.token as string),
          params(productId)
        )

      // Trước khi duyệt: đúng 404 — ảnh chờ duyệt không rò ra ngoài core.
      expect((await goi()).status).toBe(404)

      await approveRoute(
        withSession(`${BASE}/media/optimizations/${jobId}/approve`, a.token, { method: "POST" }),
        params(jobId)
      )

      // Sau khi duyệt: nợ #30 đã trả.
      expect((await goi()).status).toBe(200)
    })
  })

  /**
   * Dựng một job ĐÃ TRỪ CREDIT THẬT, qua đúng đường `POST /media/optimizations`
   * → `enqueueJob`.
   *
   * `seedJobDaChay` gọi thẳng `GenerationJobRepository.create` nên không sinh
   * dòng `usage` nào và không trừ credit — dùng nó để thử hoàn credit thì
   * `refundJob` trả `khong-co-gi-de-hoan` và ca thử đỏ vì fixture, không phải
   * vì mã sai.
   *
   * Workspace mặc định của `signUp` là `EXPERIENCE` (đường TRIAL, không đụng
   * `credit_balance`) và `beforeEach` reset lại mỗi ca, nên phải chuyển sang
   * `PRODUCTION` TRONG từng ca — cùng cái bẫy đã gặp ở P3/P5.
   */
  async function seedJobDaTruCredit(tenant: Tenant): Promise<{ jobId: string; soDuSauKhiTru: number }> {
    await prisma.workspaces.update({
      where: { id: tenant.ctx.workspaceId },
      data: { kind: "PRODUCTION" },
    })
    const assetId = await seedAsset(tenant.ctx, null)
    const body = await readJson(
      await createOptimizationRoute(
        withSession(`${BASE}/media/optimizations`, tenant.token, {
          method: "POST",
          headers: { "idempotency-key": randomUUID() },
          body: JSON.stringify({ asset_id: assetId }),
        })
      )
    )
    const to = await prisma.organizations.findUnique({ where: { id: tenant.organizationId } })
    return { jobId: body.job_id as string, soDuSauKhiTru: to!.credit_balance }
  }

  describe("D3 — hoàn credit khi Guard từ chối", () => {
    it("hoàn đúng số credit đã trừ, ghi dòng REFUNDED, và idempotent", async () => {
      // Workspace mặc định của `signUp` là EXPERIENCE (đường TRIAL, không trừ
      // credit) — phải chuyển sang PRODUCTION mới kiểm được đường CREDIT,
      // cùng cái bẫy đã gặp bốn lần ở P3/P5.
      await prisma.workspaces.update({
        where: { id: a.ctx.workspaceId }, data: { kind: "PRODUCTION" },
      })
      const assetId = await seedAsset(a.ctx, null)
      await createOptimizationRoute(
        withSession(`${BASE}/media/optimizations`, a.token, {
          method: "POST",
          headers: { "idempotency-key": randomUUID() },
          body: JSON.stringify({ asset_id: assetId }),
        })
      )
      const job = await prisma.generation_jobs.findFirst({
        where: { organization_id: a.organizationId, feature: MEDIA_OPTIMIZE_FEATURE },
      })
      const sauKhiTru = await prisma.organizations.findUnique({ where: { id: a.organizationId } })

      await prisma.generation_jobs.update({
        where: { id: job!.id },
        data: { status: "COMPLETED", result: "REJECTED", completed_at: new Date() },
      })

      const lanMot = await refundJob(a.ctx, job!.id)
      expect(lanMot.refunded).toBe(true)

      const sauKhiHoan = await prisma.organizations.findUnique({ where: { id: a.organizationId } })
      expect(sauKhiHoan!.credit_balance).toBeGreaterThan(sauKhiTru!.credit_balance)
      expect(await prisma.usage.count({
        where: { organization_id: a.organizationId, job_id: job!.id, status: "REFUNDED" },
      })).toBe(1)

      // Chạy lại không hoàn lần hai.
      const lanHai = await refundJob(a.ctx, job!.id)
      expect(lanHai.refunded).toBe(false)
      const cuoi = await prisma.organizations.findUnique({ where: { id: a.organizationId } })
      expect(cuoi!.credit_balance).toBe(sauKhiHoan!.credit_balance)
    })

    it("job KHÔNG bị từ chối thì không hoàn gì", async () => {
      const { jobId } = await seedJobDaChay(a, "SAFE")
      const ketQua = await refundJob(a.ctx, jobId)
      expect(ketQua.refunded).toBe(false)
      expect(await prisma.usage.count({
        where: { organization_id: a.organizationId, status: "REFUNDED" },
      })).toBe(0)
    })

    it("job bị huỷ khi còn xếp hàng được hoàn credit", async () => {
      const { jobId, soDuSauKhiTru } = await seedJobDaTruCredit(a)
      await prisma.generation_jobs.update({
        where: { id: jobId },
        data: { status: "CANCELLED", result: null, cancelled_at: new Date() },
      })

      const ketQua = await refundJob(a.ctx, jobId)
      expect(ketQua.refunded).toBe(true)
      if (ketQua.refunded) expect(ketQua.lyDo).toBe("bi-huy")

      const sau = await prisma.organizations.findUnique({ where: { id: a.organizationId } })
      expect(sau!.credit_balance).toBeGreaterThan(soDuSauKhiTru)
      expect(await prisma.usage.count({
        where: { organization_id: a.organizationId, job_id: jobId, status: "REFUNDED" },
      })).toBe(1)
    })

    it("job hỏng vì lỗi kỹ thuật được hoàn credit", async () => {
      const { jobId, soDuSauKhiTru } = await seedJobDaTruCredit(a)
      await prisma.generation_jobs.update({
        where: { id: jobId },
        data: { status: "FAILED", result: null, error: "worker timeout" },
      })

      const ketQua = await refundJob(a.ctx, jobId)
      expect(ketQua.refunded).toBe(true)
      if (ketQua.refunded) expect(ketQua.lyDo).toBe("loi-ky-thuat")

      const sau = await prisma.organizations.findUnique({ where: { id: a.organizationId } })
      expect(sau!.credit_balance).toBeGreaterThan(soDuSauKhiTru)

      // Chạy lại không hoàn lần hai.
      expect((await refundJob(a.ctx, jobId)).refunded).toBe(false)
      const cuoi = await prisma.organizations.findUnique({ where: { id: a.organizationId } })
      expect(cuoi!.credit_balance).toBe(sau!.credit_balance)
    })

    it("job chưa trừ credit thì không có gì để hoàn, dù ở trạng thái thuộc diện", async () => {
      // Workspace EXPERIENCE đi đường hạn mức TRIAL, `credit_balance` không
      // đổi — ghi một dòng REFUNDED rỗng chỉ làm bẩn sổ.
      const { jobId } = await seedJobDaChay(a, "SAFE")
      await prisma.generation_jobs.update({
        where: { id: jobId },
        data: { status: "FAILED", result: null },
      })
      const ketQua = await refundJob(a.ctx, jobId)
      expect(ketQua.refunded).toBe(false)
      if (!ketQua.refunded) expect(ketQua.reason).toBe("khong-co-gi-de-hoan")
    })
  })
})
