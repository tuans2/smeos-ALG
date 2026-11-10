import { randomUUID } from "node:crypto"

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

// Cổng AI giả lập: dữ liệu bán hàng trả bản cố định; lời gọi khác (khẩu hiệu, nội dung landing) hỏng — use-case tự
// lùi về nội dung dựng sẵn, đúng đường khi nhà cung cấp lỗi.
vi.mock("@/core/ai/gateway", () => ({
  callCapability: async (req: { capability: string }) => {
    if (req.capability !== "product_copy") throw new Error("AI giả lập không phục vụ lời gọi này")
    return {
      kind: "xong",
      model: { key: "gia-lap", provider: "gia-lap" },
      attempts: [{ costUsd: 0.001, latencyMs: 10 }],
      evaluation: { needsReview: false },
      output: {
        suggested_name: "Bó hồng đỏ Kỷ Niệm", short_headline: "12 bông hồng cho 12 tháng", suggested_description: "Bó hoa hồng đỏ tươi trong ngày.",
        suggested_style: "Lãng mạn", suggested_tags: ["hoa hồng"], seo_keywords: ["bó hoa hồng đỏ"], suggested_occasions: ["Sinh nhật"], secondary_occasions: [],
        target_audience: { recipient: "Người yêu", buyer_persona: "Nam 25–35" }, flower_meaning_story: "Hồng đỏ là lời yêu thương.", key_selling_points: ["Hoa tươi"],
        card_message_suggestions: { romantic: "Yêu em", subtle: "Nhớ em", congratulatory: "Chúc mừng" }, care_instructions: ["Thay nước mỗi ngày"],
        suggested_price_segment: "standard", suggested_price_range: { min_price: 450000, target_price: 550000, max_price: 650000 }, recommended_upsells: ["Thiệp"],
      },
    }
  },
}))

import * as R from "@/app/api/v1/_contracts/responses-brand"
import { POST as selectIdentity } from "@/app/api/v1/brand-kit/identity-options/[id]/select/route"
import { POST as genIdentity } from "@/app/api/v1/brand-kit/identity-options/route"
import { POST as selectLanding } from "@/app/api/v1/brand-kit/landing-options/[id]/select/route"
import { POST as genLanding } from "@/app/api/v1/brand-kit/landing-options/route"
import { GET as brandKit } from "@/app/api/v1/brand-kit/route"
import { GET as getItem, PATCH as patchItem } from "@/app/api/v1/brand-library/[id]/route"
import { POST as addVersion } from "@/app/api/v1/brand-library/[id]/versions/route"
import { GET as chainLibrary } from "@/app/api/v1/brand-library/chain/route"
import { GET as listLibrary, POST as createItem } from "@/app/api/v1/brand-library/route"
import { POST as approveCopy } from "@/app/api/v1/product-copies/[id]/approve/route"
import { POST as rejectCopy } from "@/app/api/v1/product-copies/[id]/reject/route"
import { GET as getCopy, PATCH as patchCopy } from "@/app/api/v1/product-copies/[id]/route"
import { POST as generateCopy } from "@/app/api/v1/product-copies/generate/route"
import { GET as listCopies } from "@/app/api/v1/product-copies/route"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { ProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository"
import { putBrandProfile } from "@/modules/profiles/use-cases/put-brand-profile"
import { putBusinessProfile } from "@/modules/profiles/use-cases/put-business-profile"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi `/brand-kit/*`, `/brand-library/*`, `/product-copies/*` (OpenAPI nội bộ, PO 07/11/2026) trên CSDL thật. */
const BASE = "http://localhost/api/v1"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })

describe("hợp đồng — Thương hiệu, thư viện nhận diện, dữ liệu bán hàng", () => {
  let t: Tenant
  const get = (path: string) => withSession(`${BASE}${path}`, t.token)
  const send = (path: string, method: string, body?: unknown, headers: Record<string, string> = {}) =>
    withSession(`${BASE}${path}`, t.token, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-thuong-hieu")
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("mục Thương hiệu: trạng thái, sinh và chọn Bộ nhận diện, sinh và chọn Landing page", async () => {
    await expectContract(await brandKit(get("/brand-kit")), 200, R.brandKitResponse, "brand-kit-empty")
    const product = await prisma.products.create({ data: { organization_id: t.organizationId, code: "SP-1", name: "Bó hồng đỏ", status: "ACTIVE" } })
    await putBusinessProfile(t.ctx, {
      display_name: "Tiệm hoa Mộc Lan", phone: "0901234567", address: "12 Lê Lợi, Quận 1",
      description: "Hoa tươi cắm theo yêu cầu cho văn phòng.", target_customers: ["Văn phòng tặng sếp"],
    })
    await putBrandProfile(t.ctx, { brand_assets: { storefront_photos: ["org/x/cua-hang.jpg"], intro_video: "org/x/gioi-thieu.mp4", featured_product_ids: [product.id] } })
    const identity = await expectContract(await genIdentity(send("/brand-kit/identity-options", "POST", { mode: "initial" })), 201, R.identityGeneratedResponse, "brand-identity-gen")
    const identityId = String(((identity.data as { created: { id: string }[] }).created)[0]!.id)
    await expectContract(await selectIdentity(send(`/brand-kit/identity-options/${identityId}/select`, "POST"), ps(identityId)), 200, R.identitySelectedResponse, "brand-identity-select")
    const landing = await expectContract(await genLanding(send("/brand-kit/landing-options", "POST", { mode: "initial" })), 201, R.landingGeneratedResponse, "brand-landing-gen")
    const landingId = String(((landing.data as { created: { id: string }[] }).created)[0]!.id)
    await expectContract(await selectLanding(send(`/brand-kit/landing-options/${landingId}/select`, "POST"), ps(landingId)), 200, R.landingSelectedResponse, "brand-landing-select")
    await expectContract(await brandKit(get("/brand-kit")), 200, R.brandKitResponse, "brand-kit-done")
    expect((await genIdentity(send("/brand-kit/identity-options", "POST", { mode: "extra" }))).status).toBe(400)
  })

  it("thư viện nhận diện: tạo, danh sách, xem, sửa, thêm phiên bản, mục chuỗi", async () => {
    const created = await expectContract(
      await createItem(send("/brand-library", "POST", { title: "Khẩu hiệu chính", category: "COPY", text_value: "Hoa tươi mỗi sớm mai", note: "Bản đầu" })),
      201, R.brandLibraryItemResponse, "brand-lib-create"
    )
    const id = String((created.data as { id: string }).id)
    await expectContract(await listLibrary(get("/brand-library?include_archived=true")), 200, R.brandLibraryResponse, "brand-lib-list")
    await expectContract(await getItem(get(`/brand-library/${id}`), ps(id)), 200, R.brandLibraryItemResponse, "brand-lib-get")
    await expectContract(await patchItem(send(`/brand-library/${id}`, "PATCH", { description: "Dùng trên bao bì", share_with_members: true }), ps(id)), 200, R.brandLibraryItemResponse, "brand-lib-patch")
    await expectContract(await addVersion(send(`/brand-library/${id}/versions`, "POST", { text_value: "Hoa tươi mỗi ngày", note: "Bản hai" }), ps(id)), 201, R.brandLibraryItemResponse, "brand-lib-version")
    await expectContract(await chainLibrary(get("/brand-library/chain")), 200, R.brandLibraryChainResponse, "brand-lib-chain")
  })

  it("dữ liệu bán hàng: sinh, danh sách, xem, sửa, duyệt; từ chối bản khác", async () => {
    const seedAnalysis = async () => {
      const assetId = randomUUID()
      await new AssetRepository().create(t.ctx, { id: assetId, productId: null, parentAssetId: null, kind: "ORIGINAL", version: 1, storageKey: `org/${t.organizationId}/unfiled/${assetId}.jpg`, mimeType: "image/jpeg", createdBy: t.userId })
      return new ProductAnalysisRepository().createApprovedHistorical(t.ctx, {
        productId: null, assetId, jobId: randomUUID(), provider: "openai", model: "gpt-4o", modelVersion: "2026-08-01", contractName: "PhanTichSanPhamHoa", contractVersion: "2",
        raw: { identity: { category: "Bó hoa", shape: "Tròn", facing: "Một mặt", container: "Giấy gói", phong_cach: "Cổ điển", dip_su_dung: "Tết" }, bom: { flowers: [], foliage: [], accessories: [], wrapping: [], materials_note: null }, confidence: 90, flower_count: 10, bud_count: 2, damaged_count: 0 },
        approvedBy: t.userId, approvedAt: new Date(),
      })
    }
    const analysis = await seedAnalysis()
    await prisma.organizations.update({ where: { id: t.organizationId }, data: { credit_balance: 100 } })
    const gen = (key: string, analysisId = analysis.id) => generateCopy(send("/product-copies/generate", "POST", { analysisId }, { "Idempotency-Key": key }))
    const generated = await expectContract(await gen(randomUUID()), 200, R.productCopyGeneratedResponse, "copy-generate")
    const copyId = String(generated.copyId ?? generated.copy_id ?? generated.id)
    await expectContract(await listCopies(get("/product-copies?approval_state=PENDING")), 200, R.productCopiesResponse, "copy-list")
    await expectContract(await getCopy(get(`/product-copies/${copyId}`), ps(copyId)), 200, R.productCopyResponse, "copy-get")
    await expectContract(await patchCopy(send(`/product-copies/${copyId}`, "PATCH", { edited: { suggested_name: "Bó hồng đỏ 12 bông" } }), ps(copyId)), 200, R.productCopyResponse, "copy-patch")
    expect((await patchCopy(send(`/product-copies/${copyId}`, "PATCH", { edited: { gia: 1 } }), ps(copyId))).status).toBe(400)
    await expectContract(await approveCopy(send(`/product-copies/${copyId}/approve`, "POST"), ps(copyId)), 200, R.productCopyResponse, "copy-approve")

    // Một lượt phân tích chỉ có một bản dữ liệu bán hàng — sinh lại trả bản cũ; bản thứ hai cần lượt phân tích khác.
    const second = await gen(randomUUID(), (await seedAnalysis()).id)
    const secondBody = (await second.json()) as Record<string, unknown>
    const secondId = String(secondBody.copyId ?? secondBody.copy_id ?? secondBody.id)
    await expectContract(await rejectCopy(send(`/product-copies/${secondId}/reject`, "POST", { reason: "Sai dịp tặng" }), ps(secondId)), 200, R.productCopyResponse, "copy-reject")
    expect((await generateCopy(send("/product-copies/generate", "POST", { analysisId: analysis.id }))).status).toBe(400)
  })
})
