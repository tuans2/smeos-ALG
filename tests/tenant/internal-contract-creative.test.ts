import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

// Cổng AI giả lập: kịch bản dựng bằng luật có sẵn của module, cảnh sửa = cảnh 1 của kịch bản đó, bài viết lại cố định.
// Lời gọi khác (bài đăng đi kèm kịch bản) hỏng — use-case tự bỏ qua và hoàn phần credit đó.
vi.mock("@/core/ai/gateway", async () => {
  const { buildRuleScenePlan } = await import("@/modules/creative-production/domain/scene-plan-rules")
  const plan = () =>
    buildRuleScenePlan({ mode: "CREATIVE", productName: "Bó hồng đỏ", colors: ["đỏ"], components: [], occasions: [], topic: { id: "t1", title: "Kỷ niệm ngày cưới" } })
  return {
    callCapability: async (req: { entity: { type: string } }) => {
      if (req.entity.type === "scene_plan") return { kind: "xong", output: plan() }
      if (req.entity.type === "scene_revise") return { kind: "xong", output: plan().scenes[0] }
      if (req.entity.type === "content_rewrite") return { kind: "xong", output: { text: "Bó hồng đỏ cho ngày kỷ niệm", hashtags: ["#hoahong"], warnings: [] } }
      throw new Error("AI giả lập không phục vụ lời gọi này")
    },
  }
})

import * as P from "@/app/api/v1/_contracts/responses-creative-plan"
import * as R from "@/app/api/v1/_contracts/responses-creative"
import { GET as getDraft, PUT as putDraft } from "@/app/api/v1/creative-production/content-drafts/route"
import { POST as rewrite } from "@/app/api/v1/creative-production/content-rewrites/route"
import { POST as packageDraft } from "@/app/api/v1/creative-production/package/route"
import { POST as approve } from "@/app/api/v1/creative-production/packages/[id]/approve/route"
import { PUT as launch } from "@/app/api/v1/creative-production/packages/[id]/launch/route"
import { GET as performance } from "@/app/api/v1/creative-production/packages/[id]/performance/route"
import { POST as qa } from "@/app/api/v1/creative-production/packages/[id]/qa/route"
import { GET as getPackage, PATCH as patchPackage } from "@/app/api/v1/creative-production/packages/[id]/route"
import { GET as listPackages, POST as createPackage } from "@/app/api/v1/creative-production/packages/route"
import { POST as plan } from "@/app/api/v1/creative-production/plan/route"
import { POST as produce } from "@/app/api/v1/creative-production/produce/route"
import { GET as getProviders, PUT as putProviders } from "@/app/api/v1/creative-production/providers/route"
import { GET as getScenePlan, PATCH as patchScenePlan } from "@/app/api/v1/creative-production/scene-plans/[id]/route"
import { GET as findScenePlan, POST as createScenePlan } from "@/app/api/v1/creative-production/scene-plans/route"
import { POST as reviseScene } from "@/app/api/v1/creative-production/scene-revisions/route"
import { POST as assembleVideo } from "@/app/api/v1/creative-production/video-assembly/route"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Hợp đồng phản hồi Creative Studio `/creative-production/*` (OpenAPI nội bộ, PO 07/11/2026 — chỉ ghi tài liệu,
 * PO 08/11/2026). Nhà cung cấp AI giả lập ở tầng HTTP; không gọi mạng thật.
 */
const BASE = "http://localhost/api/v1/creative-production"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })
const PASSPORT = { productName: "Bó hồng đỏ", category: "Bó hoa", style: "Lãng mạn", components: ["hồng đỏ"], colors: ["đỏ"] }
const TOPIC = {
  topicId: "t1", topicTitle: "Kỷ niệm ngày cưới", topicAngle: "Cảm xúc", topicCategory: "EMOTIONAL", topicHook: "12 bông cho 12 tháng",
  topicCta: "Nhắn tiệm", topicEmotionalTone: "ấm áp",
}

describe("hợp đồng — Creative Studio", () => {
  let t: Tenant
  let master: string
  const get = (path: string) => withSession(`${BASE}${path}`, t.token)
  const send = (path: string, method: string, body?: unknown, headers: Record<string, string> = {}) =>
    withSession(`${BASE}${path}`, t.token, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const idem = () => ({ "Idempotency-Key": randomUUID() })

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-creative")
    await prisma.organizations.update({ where: { id: t.organizationId }, data: { credit_balance: 500 } })
    master = randomUUID()
    await new AssetRepository().create(t.ctx, {
      id: master, productId: null, parentAssetId: null, kind: "MASTER", version: 1,
      storageKey: `org/${t.organizationId}/unfiled/${master}.png`, mimeType: "image/png", createdBy: t.userId,
    })
    await prisma.assets.update({ where: { id: master }, data: { approval_state: "APPROVED", approved_by: t.userId, approved_at: new Date(), identity_score: 1, aspect_ratio: "1:1" } })
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("lập kế hoạch, dựng đề bài, gộp bản nháp chiến dịch (hàm thuần)", async () => {
    const productContext = { sourceImageUrl: "https://cdn.vi-du.test/anh.jpg", commercialPassport: PASSPORT }
    await expectContract(
      await plan(send("/plan", "POST", { brief: { organizationId: t.organizationId, mode: "CREATIVE", productContext, selectedTopics: [TOPIC] } })),
      201,
      P.planResponse,
      "cp-plan"
    )
    const results: Record<string, unknown> = {}
    for (const mode of ["CREATIVE", "AUTHENTIC"]) {
      results[mode] = await expectContract(await produce(send("/produce", "POST", { brief: { mode, productContext, selectedTopics: [TOPIC] } })), 201, P.produceResponse, "cp-produce")
    }
    await expectContract(
      await packageDraft(send("/package", "POST", { campaignName: "Chiến dịch thử", creativeResult: results.CREATIVE, authenticResult: results.AUTHENTIC })),
      201,
      P.packageResponse,
      "cp-package"
    )
  })

  it("bản nháp bài đăng, nhà cung cấp AI", async () => {
    const key = { asset_id: master, topic_id: "t1", mode: "CREATIVE" }
    await expectContract(await getDraft(get(`/content-drafts?asset_id=${master}&topic_id=t1&mode=CREATIVE`)), 200, R.contentDraftResponse, "cp-draft")
    await expectContract(
      await putDraft(send("/content-drafts", "PUT", { ...key, topic_title: "Kỷ niệm", posts: [{ channel: "facebook", text: "Bó hồng đỏ tặng vợ", hashtags: ["#hoahong"] }] })),
      200,
      R.contentDraftResponse,
      "cp-draft"
    )
    await expectContract(await getDraft(get(`/content-drafts?asset_id=${master}&topic_id=t1&mode=CREATIVE`)), 200, R.contentDraftResponse, "cp-draft")
    const providers = await expectContract(await getProviders(get("/providers")), 200, R.providerPreferencesResponse, "cp-providers")
    const order = (providers.kinds as { content: { order: string[] } }).content.order
    await expectContract(await putProviders(send("/providers", "PUT", { kind: "content", order: [...order].reverse() })), 200, R.providerPreferencesResponse, "cp-providers")
  })

  it("kịch bản phân cảnh, sửa cảnh, viết lại bài, ráp video (AI giả lập)", async () => {
    const created = await expectContract(
      await createScenePlan(send("/scene-plans", "POST", {
        mode: "CREATIVE", asset_id: master, product: { name: "Bó hồng đỏ", colors: ["đỏ"] }, topic: { id: "t1", title: "Kỷ niệm ngày cưới" },
      }, idem())),
      201,
      R.scenePlanCreatedResponse,
      "cp-scene-plan"
    )
    const jobId = created.job_id as string
    await expectContract(await findScenePlan(get(`/scene-plans?asset_id=${master}&topic_id=t1&mode=CREATIVE`)), 200, R.scenePlanResponse, "cp-scene-plan-find")
    await expectContract(await getScenePlan(get(`/scene-plans/${jobId}`), ps(jobId)), 200, R.scenePlanResponse, "cp-scene-plan-get")
    await expectContract(
      await patchScenePlan(send(`/scene-plans/${jobId}`, "PATCH", { scenes: [{ scene_index: 1, text_overlay: "Kỷ niệm" }] }), ps(jobId)),
      200,
      R.scenePlanResponse,
      "cp-scene-plan-patch"
    )
    await expectContract(
      await reviseScene(send("/scene-revisions", "POST", { instruction: "Ánh sáng ấm hơn", scene_plan_id: jobId, scene_index: 1, mode: "CREATIVE" }, idem())),
      200,
      R.sceneRevisionResponse,
      "cp-scene-revision"
    )
    await expectContract(
      await rewrite(send("/content-rewrites", "POST", { channel: "facebook", text: "Bó hồng đỏ tặng vợ", instruction: "Ngắn gọn hơn" }, idem())),
      200,
      R.contentRewriteResponse,
      "cp-rewrite"
    )
    await expectContract(
      await assembleVideo(send("/video-assembly", "POST", { scene_plan_id: jobId, master_asset_id: master, dry_run: true })),
      200,
      R.videoAssemblyResponse,
      "cp-video-assembly"
    )
  })

  it("gói chiến dịch: tạo, liệt kê, đọc, sửa, QA, duyệt, kế hoạch đăng, hiệu quả", async () => {
    // Biến thể MARKETING đã duyệt của đúng Master + logo thương hiệu — để QA không từ chối gói
    const variant = randomUUID()
    await new AssetRepository().create(t.ctx, {
      id: variant, productId: null, parentAssetId: master, kind: "MARKETING", version: 1,
      storageKey: `org/${t.organizationId}/unfiled/${variant}.png`, mimeType: "image/png", createdBy: t.userId,
    })
    await prisma.assets.update({
      where: { id: variant },
      data: { approval_state: "APPROVED", approved_by: t.userId, approved_at: new Date(), identity_score: 1, aspect_ratio: "1:1", metadata: { watermark: true } },
    })
    await prisma.brand_profiles.upsert({
      where: { organization_id: t.organizationId },
      create: { organization_id: t.organizationId, logo_asset_id: master },
      update: { logo_asset_id: master },
    })
    const created = await expectContract(
      await createPackage(send("/packages", "POST", {
        name: "Gói Tết", mode: "CREATIVE", master_asset_id: master, variant_asset_ids: [variant],
        posts: [{ channel: "facebook", text: "Bó hoa hồng đỏ tặng sinh nhật", hashtags: ["#hoatuoi"] }],
      })),
      201,
      R.campaignPackageResponse,
      "cp-package-created"
    )
    const id = created.id as string
    await expectContract(await listPackages(get("/packages?limit=5")), 200, R.campaignPackagesResponse, "cp-packages")
    await expectContract(await getPackage(get(`/packages/${id}`), ps(id)), 200, R.campaignPackageResponse, "cp-package")
    await expectContract(await patchPackage(send(`/packages/${id}`, "PATCH", { name: "Gói Tết 2027" }), ps(id)), 200, R.campaignPackageResponse, "cp-package")
    await expectContract(await qa(send(`/packages/${id}/qa`, "POST"), ps(id)), 200, R.campaignPackageResponse, "cp-package-qa")
    await expectContract(await approve(send(`/packages/${id}/approve`, "POST", { acknowledge_warnings: true }), ps(id)), 200, R.campaignPackageResponse, "cp-package-approved")
    await expectContract(await launch(send(`/packages/${id}/launch`, "PUT", { channels: ["facebook"], post_refs: [] }), ps(id)), 200, R.campaignPackageResponse, "cp-package-launch")
    const perf = await expectContract(await performance(get(`/packages/${id}/performance`), ps(id)), 200, R.campaignPerformanceResponse, "cp-performance")
    expect(perf.package_id).toBe(id)
  })
})
