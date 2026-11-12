import { randomUUID } from "node:crypto"

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  GET as getProductCopyRoute,
  PATCH as patchProductCopyRoute,
} from "@/app/api/v1/product-copies/[id]/route"
import { POST as approveProductCopyRoute } from "@/app/api/v1/product-copies/[id]/approve/route"
import { POST as rejectProductCopyRoute } from "@/app/api/v1/product-copies/[id]/reject/route"
import { POST as generateProductCopyRoute } from "@/app/api/v1/product-copies/generate/route"
import { GET as listProductCopiesRoute } from "@/app/api/v1/product-copies/route"
import type { TenantContext } from "@/core/tenancy"
import type { approval_state } from "@/generated/prisma/client"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import { ProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository"
import { ProductCopyRepository } from "@/modules/product-copies/infra/product-copy-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"

/**
 * Câu trả lời OpenAI giả (24/09/2026). `tests/setup.ts` chặn mạng thật — trước
 * đó ca "generate hợp lệ" gọi OpenAI THẬT bằng khoá trong `.env` (tốn tiền, kết
 * quả phụ thuộc mạng). Chỉ giả đúng một điểm: HTTP của nhà cung cấp; cổng AI,
 * adapter, job, bản ghi và cách ly tenant vẫn chạy thật.
 */
const FAKE_COPY = {
  suggested_name: "Bó hồng đỏ Kỷ Niệm",
  short_headline: "12 bông hồng cho 12 tháng yêu nhau",
  suggested_description:
    "Bó hoa gồm mười hai bông hồng đỏ tươi được tuyển chọn trong ngày, điểm baby trắng và lá bạc, gói giấy Hàn Quốc tông đen sang trọng. " +
    "Phù hợp tặng người thương vào ngày kỷ niệm, sinh nhật hay lời xin lỗi chân thành. Tiệm giao nhanh trong nội thành và kèm thiệp viết tay miễn phí.",
  suggested_style: "Lãng mạn",
  suggested_tags: ["hoa hồng", "kỷ niệm", "quà tặng người yêu"],
  seo_keywords: ["bó hoa hồng đỏ"],
  suggested_occasions: ["Sinh nhật"],
  secondary_occasions: [],
  target_audience: { recipient: "Người yêu", buyer_persona: "Nam 25–35" },
  flower_meaning_story: "Hồng đỏ là lời yêu thương nồng nàn.",
  key_selling_points: ["Hoa tươi trong ngày"],
  card_message_suggestions: { romantic: "Yêu em", subtle: "Nhớ em", congratulatory: "Chúc mừng" },
  care_instructions: ["Thay nước mỗi ngày"],
  suggested_price_segment: "standard",
  suggested_price_range: { min_price: 450000, target_price: 550000, max_price: 650000 },
  recommended_upsells: ["Thiệp"],
}

function fakeOpenAiFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    if (!url.includes("api.openai.com/v1/chat/completions")) {
      throw new Error(`[product-copies.test] Mạng thật bị chặn: ${url}`)
    }
    return new Response(
      JSON.stringify({
        model: "gpt-4o-mini-2024-07-18",
        choices: [{ message: { role: "assistant", content: JSON.stringify(FAKE_COPY) } }],
        usage: { prompt_tokens: 900, completion_tokens: 600, total_tokens: 1500 },
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    )
  })
}

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

async function seedApprovedAnalysis(ctx: TenantContext, assetId: string) {
  return new ProductAnalysisRepository().createApprovedHistorical(ctx, {
    productId: null,
    assetId,
    jobId: randomUUID(),
    provider: "openai",
    model: "gpt-4o",
    modelVersion: "2026-08-01",
    contractName: "PhanTichSanPhamHoa",
    contractVersion: "2",
    raw: {
      identity: { category: "Bó hoa", shape: "Tròn", facing: "Một mặt", container: "Giấy gói", phong_cach: "Cổ điển", dip_su_dung: "Tết" },
      bom: { flowers: [], foliage: [], accessories: [], wrapping: [], materials_note: null },
      confidence: 90,
      flower_count: 10,
      bud_count: 2,
      damaged_count: 0,
    },
    approvedBy: ctx.userId,
    approvedAt: new Date(),
  })
}

async function seedProductCopy(ctx: TenantContext, analysisId: string, approvalState: "PENDING" | "APPROVED" | "REJECTED" = "PENDING") {
  const analysis = await prisma.product_analyses.findUnique({ where: { id: analysisId } })
  if (!analysis) throw new Error("Analysis not found")

  const copy = await new ProductCopyRepository().createFromAnalysis(ctx, {
    analysisId,
    productId: null,
    raw: {
      suggested_name: "Bó Hoa Hồng Tết",
      suggested_description: "Bó hoa hồng đỏ tươi tắn, ý nghĩa may mắn cho năm mới",
      suggested_tags: ["hoa-hong", "tet", "may-man"],
      suggested_occasions: ["valentine", "wedding"],
      suggested_price_segment: "premium",
    },
    profileVersion: "v1",
  })

  if (approvalState !== "PENDING") {
    await prisma.product_copies.update({
      where: { id: copy.id },
      data: { approval_state: approvalState as approval_state },
    })
  }

  return copy
}

describe("cách ly tenant — M01b dữ liệu bán hàng sản phẩm (P14)", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    vi.stubGlobal("fetch", fakeOpenAiFetch())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("POST /product-copies/generate với analysis_id của tổ chức khác trả 404", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await seedApprovedAnalysis(a.ctx, assetOfA)

    const response = await generateProductCopyRoute(
      withSession(`${BASE}/product-copies/generate`, b.token, {
        method: "POST",
        headers: { "idempotency-key": randomUUID() },
        body: JSON.stringify({ analysisId: analysis.id }),
      })
    )

    expect(response.status).toBe(404)
  })

  it("POST /product-copies/generate với analysis chưa APPROVED trả 422", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await new ProductAnalysisRepository().create(a.ctx, {
      productId: null,
      assetId: assetOfA,
      jobId: randomUUID(),
      provider: "openai",
      model: "gpt-4o",
      modelVersion: "2026-08-01",
      contractName: "PhanTichSanPhamHoa",
      contractVersion: "2",
      raw: { identity: { category: "Bó hoa" }, bom: {}, confidence: 90, flower_count: 10, bud_count: 2, damaged_count: 0 },
    })

    const response = await generateProductCopyRoute(
      withSession(`${BASE}/product-copies/generate`, a.token, {
        method: "POST",
        headers: { "idempotency-key": randomUUID() },
        body: JSON.stringify({ analysisId: analysis.id }),
      })
    )

    expect(response.status).toBe(422)
  })

  it("POST /product-copies/generate hợp lệ trả copyId và raw", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await seedApprovedAnalysis(a.ctx, assetOfA)

    const response = await generateProductCopyRoute(
      withSession(`${BASE}/product-copies/generate`, a.token, {
        method: "POST",
        headers: { "idempotency-key": randomUUID() },
        body: JSON.stringify({ analysisId: analysis.id }),
      })
    )

    const body = (await readJson(response)) as { copyId: string; raw: Record<string, unknown> }
    expect(response.status).toBe(200)
    expect(typeof body.copyId).toBe("string")
    expect(typeof body.raw).toBe("object")
    expect(body.raw.suggested_name).toBeDefined()
  }, 15000)

  it("POST /product-copies/generate idempotent — gọi lại trả cùng copyId", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await seedApprovedAnalysis(a.ctx, assetOfA)

    // CÙNG một khoá cho cả hai lượt — đó chính là điều ca thử này khoá lại
    // (`YC-U7`): gọi lại với cùng `Idempotency-Key` trả về bản ghi cũ chứ
    // không sinh bản mới và không tiêu tiền nhà cung cấp lần hai.
    const idempotencyKey = randomUUID()

    const first = await generateProductCopyRoute(
      withSession(`${BASE}/product-copies/generate`, a.token, {
        method: "POST",
        headers: { "idempotency-key": idempotencyKey },
        body: JSON.stringify({ analysisId: analysis.id }),
      })
    )
    const firstBody = await readJson(first)
    expect(first.status).toBe(200)

    const second = await generateProductCopyRoute(
      withSession(`${BASE}/product-copies/generate`, a.token, {
        method: "POST",
        headers: { "idempotency-key": idempotencyKey },
        body: JSON.stringify({ analysisId: analysis.id }),
      })
    )
    const secondBody = await readJson(second)
    expect(second.status).toBe(200)
    expect(secondBody.copyId).toBe(firstBody.copyId)
  }, 15000)

  it("GET /product-copies/:id của tổ chức khác trả 404, không lộ dữ liệu", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await seedApprovedAnalysis(a.ctx, assetOfA)
    const copy = await seedProductCopy(a.ctx, analysis.id)

    const asOwner = await getProductCopyRoute(
      withSession(`${BASE}/product-copies/${copy.id}`, a.token),
      { params: Promise.resolve({ id: copy.id }) }
    )
    expect(asOwner.status).toBe(200)

    const asOther = await getProductCopyRoute(
      withSession(`${BASE}/product-copies/${copy.id}`, b.token),
      { params: Promise.resolve({ id: copy.id }) }
    )
    expect(asOther.status).toBe(404)
  })

  it("PATCH /product-copies/:id ghi vào edited, không đụng raw", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await seedApprovedAnalysis(a.ctx, assetOfA)
    const copy = await seedProductCopy(a.ctx, analysis.id)

    const response = await patchProductCopyRoute(
      withSession(`${BASE}/product-copies/${copy.id}`, a.token, {
        method: "PATCH",
        body: JSON.stringify({ edited: { suggested_name: "Tên Mới" } }),
      }),
      { params: Promise.resolve({ id: copy.id }) }
    )

    expect(response.status).toBe(200)
    const body = (await readJson(response)).data as { edited: { suggested_name: string }; raw: { suggested_name: string } }
    expect(body.edited?.suggested_name).toBe("Tên Mới")
    expect(body.raw.suggested_name).toBe("Bó Hoa Hồng Tết")
  })

  it("PATCH /product-copies/:id của tổ chức khác trả 404", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await seedApprovedAnalysis(a.ctx, assetOfA)
    const copy = await seedProductCopy(a.ctx, analysis.id)

    const response = await patchProductCopyRoute(
      withSession(`${BASE}/product-copies/${copy.id}`, b.token, {
        method: "PATCH",
        body: JSON.stringify({ edited: { suggested_name: "Tên Mới" } }),
      }),
      { params: Promise.resolve({ id: copy.id }) }
    )

    expect(response.status).toBe(404)
  })

  it("PATCH /product-copies/:id khi không PENDING trả 409", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await seedApprovedAnalysis(a.ctx, assetOfA)
    const copy = await seedProductCopy(a.ctx, analysis.id, "APPROVED")

    const response = await patchProductCopyRoute(
      withSession(`${BASE}/product-copies/${copy.id}`, a.token, {
        method: "PATCH",
        body: JSON.stringify({ edited: { suggested_name: "Tên Mới" } }),
      }),
      { params: Promise.resolve({ id: copy.id }) }
    )

    expect(response.status).toBe(409)
  })

  it("POST /product-copies/:id/approve tạo sản phẩm mới, ghi audit_logs, trả 409 khi duyệt lại", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await seedApprovedAnalysis(a.ctx, assetOfA)
    const copy = await seedProductCopy(a.ctx, analysis.id)

    const response = await approveProductCopyRoute(
      withSession(`${BASE}/product-copies/${copy.id}/approve`, a.token, { method: "POST" }),
      { params: Promise.resolve({ id: copy.id }) }
    )

    expect(response.status).toBe(200)
    const body = (await readJson(response)).data as { approval_state: string; approved_by: string; product_id: string }
    expect(body.approval_state).toBe("APPROVED")
    expect(body.approved_by).toBe(a.userId)
    expect(typeof body.product_id).toBe("string")

    const product = await prisma.products.findUnique({ where: { id: body.product_id as string } })
    expect(product?.name).toBe("Bó Hoa Hồng Tết")
    expect(product?.organization_id).toBe(a.organizationId)

    const auditRows = await prisma.audit_logs.findMany({
      where: { organization_id: a.organizationId, action: "product_copy.approve" },
    })
    expect(auditRows).toHaveLength(1)
    expect(auditRows[0]?.entity_id).toBe(copy.id)

    const second = await approveProductCopyRoute(
      withSession(`${BASE}/product-copies/${copy.id}/approve`, a.token, { method: "POST" }),
      { params: Promise.resolve({ id: copy.id }) }
    )
    expect(second.status).toBe(409)
  })

  it("POST /product-copies/:id/approve của tổ chức khác trả 404", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await seedApprovedAnalysis(a.ctx, assetOfA)
    const copy = await seedProductCopy(a.ctx, analysis.id)

    const response = await approveProductCopyRoute(
      withSession(`${BASE}/product-copies/${copy.id}/approve`, b.token, { method: "POST" }),
      { params: Promise.resolve({ id: copy.id }) }
    )

    expect(response.status).toBe(404)
  })

  it("POST /product-copies/:id/reject ghi audit_logs, trả 409 khi duyệt lại", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await seedApprovedAnalysis(a.ctx, assetOfA)
    const copy = await seedProductCopy(a.ctx, analysis.id)

    const response = await rejectProductCopyRoute(
      withSession(`${BASE}/product-copies/${copy.id}/reject`, a.token, {
        method: "POST",
        body: JSON.stringify({ reason: "Không phù hợp" }),
      }),
      { params: Promise.resolve({ id: copy.id }) }
    )

    expect(response.status).toBe(200)
    const body = (await readJson(response)).data as { approval_state: string }
    expect(body.approval_state).toBe("REJECTED")

    const copyAfter = await prisma.product_copies.findUnique({ where: { id: copy.id } })
    expect(copyAfter?.approval_state).toBe("REJECTED")

    const auditRows = await prisma.audit_logs.findMany({
      where: { organization_id: a.organizationId, action: "product_copy.reject" },
    })
    expect(auditRows).toHaveLength(1)

    const second = await approveProductCopyRoute(
      withSession(`${BASE}/product-copies/${copy.id}/approve`, a.token, { method: "POST" }),
      { params: Promise.resolve({ id: copy.id }) }
    )
    expect(second.status).toBe(409)
  })

  it("POST /product-copies/:id/reject của tổ chức khác trả 404", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await seedApprovedAnalysis(a.ctx, assetOfA)
    const copy = await seedProductCopy(a.ctx, analysis.id)

    const response = await rejectProductCopyRoute(
      withSession(`${BASE}/product-copies/${copy.id}/reject`, b.token, {
        method: "POST",
        body: JSON.stringify({ reason: "Không phù hợp" }),
      }),
      { params: Promise.resolve({ id: copy.id }) }
    )

    expect(response.status).toBe(404)
  })

  it("GET /product-copies lọc theo product_id", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await seedApprovedAnalysis(a.ctx, assetOfA)
    const copy = await seedProductCopy(a.ctx, analysis.id)

    // Approve the copy first to create a product
    await approveProductCopyRoute(
      withSession(`${BASE}/product-copies/${copy.id}/approve`, a.token, { method: "POST" }),
      { params: Promise.resolve({ id: copy.id }) }
    )

    const approvedCopy = await prisma.product_copies.findUnique({ where: { id: copy.id } })
    const product = await prisma.products.findUnique({ where: { id: approvedCopy?.product_id as string } })
    const response = await listProductCopiesRoute(
      withSession(`${BASE}/product-copies?product_id=${product?.id}`, a.token)
    )

    expect(response.status).toBe(200)
    const body = await readJson(response) as { data: Array<{ id: string }> }
    expect(body.data.some((c: { id: string }) => c.id === copy.id)).toBe(true)
  })

  it("GET /product-copies lọc theo approval_state", async () => {
    const assetOfA = await seedAsset(a.ctx)
    const analysis = await seedApprovedAnalysis(a.ctx, assetOfA)
    await seedProductCopy(a.ctx, analysis.id, "APPROVED")

    const response = await listProductCopiesRoute(
      withSession(`${BASE}/product-copies?approval_state=APPROVED`, a.token)
    )

    expect(response.status).toBe(200)
    const body = await readJson(response) as { data: Array<{ approval_state: string }> }
    expect(body.data.every((c: { approval_state: string }) => c.approval_state === "APPROVED")).toBe(true)
  })
})