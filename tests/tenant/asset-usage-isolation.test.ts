import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { createAssetUsageUseCase } from "@/modules/marketing-center/use-cases/create-asset-usage.use-case"
import { createCampaignUseCase } from "@/modules/marketing-center/use-cases/create-campaign.use-case"
import { listAssetUsagesUseCase } from "@/modules/marketing-center/use-cases/list-asset-usages.use-case"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

describe("Marketing & Sales Center — Cách ly tenant cho Nơi dùng tư liệu (asset_usages)", () => {
  let a: Tenant
  let b: Tenant

  const withCaps = (t: Tenant): Tenant => ({
    ...t,
    ctx: { ...t.ctx, capabilities: new Set([...t.ctx.capabilities, "M1", "M2", "M3"]) },
  })

  const usageInput = {
    sourceType: "ai_image",
    sourceId: "asset-1",
    assetTypeCode: "8",
    destination: "PROMOTION",
    ctaCode: "LEARN_MORE",
    title: "Banner quảng cáo",
  } as const

  beforeEach(async () => {
    await resetDatabase()
    a = withCaps(await createTenant("alpha"))
    b = withCaps(await createTenant("beta"))
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("nơi dùng của tổ chức A chỉ thấy bởi A", async () => {
    const { usage } = await createAssetUsageUseCase(a.ctx, usageInput)
    expect(usage.organizationId).toBe(a.organizationId)

    const listA = await listAssetUsagesUseCase(a.ctx, {})
    expect(listA.map((u) => u.id)).toEqual([usage.id])
    const listB = await listAssetUsagesUseCase(b.ctx, {})
    expect(listB).toHaveLength(0)
  })

  it("không gắn được nơi dùng vào chiến dịch của tổ chức khác", async () => {
    const campaignB = await createCampaignUseCase(b.ctx, { name: "Chiến dịch Beta", objective: "SALE" })

    await expect(
      createAssetUsageUseCase(a.ctx, { ...usageInput, campaignId: campaignB.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(await prisma.asset_usages.count({ where: { organization_id: a.organizationId } })).toBe(0)

    const campaignA = await createCampaignUseCase(a.ctx, { name: "Chiến dịch Alpha", objective: "SALE" })
    const { usage } = await createAssetUsageUseCase(a.ctx, { ...usageInput, campaignId: campaignA.id })
    expect(usage.campaignId).toBe(campaignA.id)
  })
})
