import { randomUUID } from "node:crypto"
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { ProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository"
import { oneImageKitProgress, runOneImageKit, startOneImageKit } from "@/modules/journey/use-cases/one-image-kit"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * ALG 7.2 — luồng "Từ 1 ảnh" với AI giả lập ở tầng HTTP của nhà cung cấp (cổng AI, job, credit thật):
 * một ảnh sinh đủ 5 đầu ra; bước AI hỏng giữa chừng thì dừng và credit của bước đó được hoàn.
 */
const FAKE_COPY = {
  suggested_name: "Bó hồng đỏ Kỷ Niệm", short_headline: "12 bông hồng", suggested_description: "Bó hoa gồm mười hai bông hồng đỏ tươi, điểm baby trắng, gói giấy tông đen. ".repeat(3),
  suggested_style: "Lãng mạn", suggested_tags: ["hoa hồng"], seo_keywords: ["bó hoa hồng"], suggested_occasions: ["Sinh nhật"], secondary_occasions: [],
  target_audience: { recipient: "Người yêu", buyer_persona: "Nam 25–35" }, flower_meaning_story: "Hồng đỏ là lời yêu thương.", key_selling_points: ["Hoa tươi trong ngày"],
  card_message_suggestions: { romantic: "Yêu em", subtle: "Nhớ em", congratulatory: "Chúc mừng" }, care_instructions: ["Thay nước mỗi ngày"],
  suggested_price_segment: "standard", suggested_price_range: { min_price: 450000, target_price: 550000, max_price: 650000 }, recommended_upsells: ["Thiệp"],
}

function fakeAi(ok: boolean) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    if (!ok || !url.includes("api.openai.com/v1/chat/completions")) return new Response("lỗi nhà cung cấp", { status: 500 })
    return new Response(JSON.stringify({
      model: "gpt-4o-mini-2024-07-18", choices: [{ message: { role: "assistant", content: JSON.stringify(FAKE_COPY) } }],
      usage: { prompt_tokens: 900, completion_tokens: 600, total_tokens: 1500 },
    }), { status: 200, headers: { "content-type": "application/json" } })
  })
}

const balanceOf = async (t: Tenant) => (await prisma.organizations.findUniqueOrThrow({ where: { id: t.organizationId } })).credit_balance

describe("luồng Từ 1 ảnh", () => {
  let a: Tenant
  let owner: TenantContext

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("kit-a")
    owner = { ...a.ctx, capabilities: new Set(["H1", "H3", "H5", "I1", "M5"]) }
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { credit_balance: 100 } })
  })
  afterEach(() => vi.unstubAllGlobals())
  afterAll(async () => disconnectDatabase())

  /** Chặng 01–02 qua use-case thật; kết quả nhận diện ghi như worker. */
  async function analyzed() {
    const asset = await new AssetRepository().create(a.ctx, {
      id: randomUUID(), productId: null, parentAssetId: null, kind: "ORIGINAL", version: 1,
      storageKey: `org/${a.organizationId}/khong-san-pham/${randomUUID()}.jpg`, mimeType: "image/jpeg", createdBy: a.userId,
    })
    const started = await startOneImageKit(owner, { assetId: asset.id, idempotencyKey: randomUUID() })
    expect((await oneImageKitProgress(owner, { jobId: started.jobId, assetId: asset.id })).analysis).toBeNull()
    await new ProductAnalysisRepository().create(a.ctx, {
      productId: null, assetId: asset.id, jobId: started.jobId, provider: "openai", model: "gpt-4o", modelVersion: "2026-08-01",
      contractName: "PhanTichSanPhamHoa", contractVersion: "2",
      raw: {
        identity: { category: "Bó hoa", shape: "Tròn", facing: "Một mặt", container: "Giấy gói", phong_cach: "Cổ điển", dip_su_dung: "Sinh nhật" },
        bom: { flowers: [{ flowerName: "Hồng đỏ", quantity: 12, unit: "cành", color: "Đỏ", role: "Chủ đạo" }], foliage: [], accessories: [], wrapping: [], materials_note: null },
        confidence: 90, flower_count: 12, bud_count: 0, damaged_count: 0,
      },
    })
    const progress = await oneImageKitProgress(owner, { jobId: started.jobId, assetId: asset.id })
    expect(progress.analysis).toMatchObject({ approvalState: "PENDING", category: "Bó hoa", flowers: [{ name: "Hồng đỏ", quantity: 12 }] })
    return { analysisId: progress.analysis!.id, chargedForVision: 100 - (await balanceOf(a)) }
  }

  it("một ảnh sinh đủ 5 đầu ra: thẻ sản phẩm, nội dung bán hàng, giá vốn, bài đăng Facebook/Zalo, thẻ A6", async () => {
    vi.stubGlobal("fetch", fakeAi(true))
    const { analysisId } = await analyzed()
    const kit = await runOneImageKit(owner, { analysisId, idempotencyKey: randomUUID() })
    expect(kit).toMatchObject({ status: "READY", failedStep: null })
    const o = kit.outputs
    expect(await prisma.products.count({ where: { id: o.productId!, organization_id: a.organizationId } })).toBe(1)
    expect(await prisma.product_copies.count({ where: { id: o.copyId!, organization_id: a.organizationId } })).toBe(1)
    expect(o.cost).toMatchObject({ complete: expect.any(Boolean) })
    expect(o.posts.map((p) => p.channel).sort()).toEqual(["facebook", "zalo"])
    expect(await prisma.print_renditions.count({ where: { id: o.printRenditionId!, organization_id: a.organizationId, preset_code: "A6" } })).toBe(1)
    expect(await prisma.generation_jobs.count({ where: { organization_id: a.organizationId, feature: "product.copy.generate" } })).toBe(1)

    const again = await runOneImageKit(owner, { analysisId, idempotencyKey: randomUUID() })
    expect(again.outputs.copyId).toBe(o.copyId) // bản nội dung đã có không tính tiền lại
  })

  it("AI hỏng ở bước nội dung bán hàng → dừng, giữ thẻ sản phẩm, credit của bước hỏng được hoàn", async () => {
    vi.stubGlobal("fetch", fakeAi(false))
    const { analysisId } = await analyzed()
    const before = await balanceOf(a)
    const kit = await runOneImageKit(owner, { analysisId, idempotencyKey: randomUUID() })
    expect(kit).toMatchObject({ status: "FAILED", failedStep: "COPY" })
    expect(kit.outputs.productId).not.toBeNull()
    expect(kit.outputs.copyId).toBeNull()
    expect(await balanceOf(a)).toBe(before)
  })

  it("thiếu quyền duyệt → 403", async () => {
    await expect(runOneImageKit({ ...a.ctx, capabilities: new Set(["H1"]) }, { analysisId: randomUUID(), idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
  })
})
