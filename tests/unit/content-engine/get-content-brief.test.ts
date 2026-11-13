import { describe, expect, it, vi, beforeEach } from "vitest"
import type { TenantContext } from "@/core/tenancy"

const { readProductContext, projectTopicFromReport, readShopContext, readStoryContext } = vi.hoisted(() => ({
  readProductContext: vi.fn(),
  projectTopicFromReport: vi.fn(),
  readShopContext: vi.fn(),
  readStoryContext: vi.fn(),
}))

vi.mock("@/modules/content-engine/infra/read-product-context", () => ({ readProductContext, projectTopicFromReport }))
vi.mock("@/modules/content-engine/infra/read-shop-context", () => ({ readShopContext }))
vi.mock("@/modules/content-engine/infra/read-story-context", () => ({ readStoryContext }))

import { getContentBrief } from "@/modules/content-engine/use-cases/get-content-brief"

const ctx: TenantContext = {
  organizationId: "org-1",
  workspaceId: "ws-1",
  userId: "user-1",
  branchId: null,
  capabilities: new Set(["I1"]),
}

const baseProduct = {
  productId: "p-1",
  name: "Bó hoa hồng đỏ",
  style: null,
  components: [],
  packaging: { wrappingMaterial: null, wrappingColor: null, ribbon: null, accessories: [], cardText: null },
  price: { exact: null, rangeLabel: null },
}

const baseShop = {
  displayName: "Tiệm hoa ABC",
  toneOfVoice: null,
  hashtags: [],
  ctaPhrase: null,
  defaultOffers: { freeGifts: [], guarantees: [] },
  forbiddenStyles: [],
  phone: null,
  address: null,
  website: null,
  operatingHours: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getContentBrief", () => {
  it("lắp Brief hợp lệ khi có đủ chủ đề từ báo cáo", async () => {
    readProductContext.mockResolvedValue({ product: baseProduct, passport: null, report: { topics: [] } })
    projectTopicFromReport.mockReturnValue({ topicId: "t-1", title: "Chủ đề sinh nhật", angleCategory: null, hook: null, cta: null, format: null, evidenceNote: null })
    readShopContext.mockResolvedValue(baseShop)
    readStoryContext.mockResolvedValue(null)

    const brief = await getContentBrief(ctx, { channels: ["facebook", "zalo"] })

    expect(brief.organizationId).toBe("org-1")
    expect(brief.topic.title).toBe("Chủ đề sinh nhật")
    expect(brief.channels.map((c) => c.channel)).toEqual(["facebook", "zalo"])
    expect(readProductContext).toHaveBeenCalledWith(ctx, { productId: null, analysisRunId: null })
    expect(readStoryContext).toHaveBeenCalledWith(ctx, null)
  })

  it("không có chủ đề từ báo cáo: dùng tên sản phẩm làm chủ đề tối thiểu, không bịa hook/CTA", async () => {
    readProductContext.mockResolvedValue({ product: baseProduct, passport: null, report: null })
    projectTopicFromReport.mockReturnValue(null)
    readShopContext.mockResolvedValue(baseShop)
    readStoryContext.mockResolvedValue(null)

    const brief = await getContentBrief(ctx, { channels: ["facebook"] })

    expect(brief.topic.title).toBe("Giới thiệu Bó hoa hồng đỏ")
    expect(brief.topic.hook).toBeNull()
    expect(brief.topic.cta).toBeNull()
  })

  it("truyền đủ productId/analysisRunId/topicId/scenePlanId/assetId xuống các đầu đọc", async () => {
    readProductContext.mockResolvedValue({ product: baseProduct, passport: null, report: { topics: [] } })
    projectTopicFromReport.mockReturnValue({ topicId: "t-9", title: "X", angleCategory: null, hook: null, cta: null, format: null, evidenceNote: null })
    readShopContext.mockResolvedValue(baseShop)
    readStoryContext.mockResolvedValue(null)

    const brief = await getContentBrief(ctx, {
      assetId: "asset-1",
      productId: "p-1",
      analysisRunId: "run-1",
      topicId: "t-9",
      scenePlanId: "scene-1",
      channels: ["instagram"],
    })

    expect(brief.assetId).toBe("asset-1")
    expect(readProductContext).toHaveBeenCalledWith(ctx, { productId: "p-1", analysisRunId: "run-1" })
    expect(projectTopicFromReport).toHaveBeenCalledWith({ topics: [] }, "t-9")
    expect(readStoryContext).toHaveBeenCalledWith(ctx, "scene-1")
  })
})
