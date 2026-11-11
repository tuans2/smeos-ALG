import { randomUUID } from "node:crypto"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import {
  GET as getAnalysisRoute,
  PATCH as patchAnalysisRoute,
} from "@/app/api/v1/vision/analyses/[id]/route"
import { POST as approveAnalysisRoute } from "@/app/api/v1/vision/analyses/[id]/approve/route"
import { POST as createAnalysisRoute } from "@/app/api/v1/vision/analyses/route"
// @release-strip — route/mô-đun không có trong bản giao GD1; phần còn lại của test vẫn chạy trên bản cắt
import { GET as getEngineRoute, PUT as putEngineRoute } from "@/app/api/v1/vision/engine/route"
// @release-strip-end
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

  // @release-strip — chọn bộ máy phân tích (route /vision/engine) không có trong bản giao GD1
  describe("bộ máy phân tích — Điều hành chọn cho cả tổ chức (H4)", () => {
    it("chưa chọn gì thì chạy bộ mặc định (openai_structured), và liệt kê đủ ba bộ", async () => {
      const body = await readJson(await getEngineRoute(withSession(`${BASE}/vision/engine`, a.token)))
      // Đọc từ `VISION_ENGINE_MAC_DINH` (`domain/vision-engine.ts`). Giá trị
      // này đã lật hai lần (`local_cv` → `openai_direct` → `openai_structured`)
      // mà không lần nào ca thử bắt được, vì tệp này im lặng suốt thời gian
      // `server-only` làm nó không nạp nổi. Chốt lại với chủ sản phẩm 09/17:
      // `openai_structured` là bộ mặc định đúng.
      expect(body.dang_dung).toBe("openai_structured")
      expect((body.danh_sach as { key: string }[]).map((b) => b.key)).toEqual([
        "openai_structured",
        "openai_direct",
        "local_cv",
      ])
    })

    it("đổi bộ máy rồi đọc lại thấy đúng, và ghi audit_logs", async () => {
      const res = await putEngineRoute(
        withSession(`${BASE}/vision/engine`, a.token, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bo_may: "local_cv" }),
        })
      )
      expect(res.status).toBe(200)
      expect((await readJson(await getEngineRoute(withSession(`${BASE}/vision/engine`, a.token)))).dang_dung).toBe(
        "local_cv"
      )
      expect(
        await prisma.audit_logs.count({
          where: { organization_id: a.organizationId, action: "vision.engine.change" },
        })
      ).toBe(1)
    })

    it("đổi bộ máy KHÔNG xoá công tắc khác trong cùng khối settings", async () => {
      await prisma.organizations.update({
        where: { id: a.organizationId },
        data: { settings: { cho_phep_tu_duyet: false } },
      })
      await putEngineRoute(
        withSession(`${BASE}/vision/engine`, a.token, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bo_may: "local_cv" }),
        })
      )
      const to = await prisma.organizations.findUnique({ where: { id: a.organizationId } })
      const settings = to!.settings as Record<string, unknown>
      expect(settings.cho_phep_tu_duyet).toBe(false)
      expect(settings.bo_may_phan_tich).toBe("local_cv")
    })

    it("tên bộ máy không có trong danh sách bị từ chối", async () => {
      const res = await putEngineRoute(
        withSession(`${BASE}/vision/engine`, a.token, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bo_may: "gpt-9-sieu-cap" }),
        })
      )
      expect(res.status).toBe(400)
    })

    it("lựa chọn của A không ảnh hưởng tổ chức B (YC-T4)", async () => {
      await putEngineRoute(
        withSession(`${BASE}/vision/engine`, a.token, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bo_may: "openai_direct" }),
        })
      )
      // B phải đọc ra bộ MẶC ĐỊNH, không phải bộ A vừa chọn.
      //
      // Bản trước kỳ vọng `openai_direct` ở đây — trùng khít với chính giá
      // trị A vừa đặt, nên ca thử xanh dù lựa chọn của A có rò sang B hay
      // không. Nó chỉ xanh được vì lúc đó `openai_direct` cũng đang là mặc
      // định. Kỳ vọng mặc định `openai_structured` mới thật sự phân biệt
      // được hai trường hợp.
      const cuaB = await readJson(await getEngineRoute(withSession(`${BASE}/vision/engine`, b.token)))
      expect(cuaB.dang_dung).toBe("openai_structured")
    })

    it("bộ máy CHỐT vào payload của job lúc tạo, không tra lại lúc worker nhận việc", async () => {
      await putEngineRoute(
        withSession(`${BASE}/vision/engine`, a.token, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bo_may: "openai_direct" }),
        })
      )
      const assetId = await seedAsset(a.ctx)
      const tao = await readJson(
        await createAnalysisRoute(
          withSession(`${BASE}/vision/analyses`, a.token, {
            method: "POST",
            headers: { "Content-Type": "application/json", "idempotency-key": randomUUID() },
            body: JSON.stringify({ asset_ids: [assetId], product_id: null }),
          })
        )
      )
      expect(tao.engine).toBe("openai_direct")

      // Điều hành đổi bộ máy SAU khi job đã xếp hàng — job cũ không đổi theo.
      await putEngineRoute(
        withSession(`${BASE}/vision/engine`, a.token, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bo_may: "local_cv" }),
        })
      )
      const job = await prisma.generation_jobs.findUnique({ where: { id: tao.job_id as string } })
      expect((job!.payload as Record<string, unknown>).engine).toBe("openai_direct")
    })
  })
  // @release-strip-end
})
