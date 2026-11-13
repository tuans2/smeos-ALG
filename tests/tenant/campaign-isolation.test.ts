import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"
import { createCampaignUseCase } from "@/modules/marketing-center/use-cases/create-campaign.use-case"
import { listCampaignsUseCase } from "@/modules/marketing-center/use-cases/list-campaigns.use-case"
import { updateCampaignUseCase } from "@/modules/marketing-center/use-cases/update-campaign.use-case"
import { getCampaignDetailsUseCase } from "@/modules/marketing-center/use-cases/get-campaign-details.use-case"

describe("Marketing & Sales Center — Cách ly tenant cho Chiến dịch (Campaigns)", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
    const caps = (t: Tenant) => ({
      ...t,
      ctx: { ...t.ctx, capabilities: new Set([...t.ctx.capabilities, "M1", "M2", "M3"]) },
    })
    a = caps(a)
    b = caps(b)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("chiến dịch tạo bởi tổ chức A chỉ thấy bởi A, B không thấy", async () => {
    const campA = await createCampaignUseCase(a.ctx, {
      name: "Chiến dịch Tết Alpha",
      objective: "SALE",
      occasionCode: "TET",
    })

    expect(campA.id).toBeDefined()
    expect(campA.organizationId).toBe(a.organizationId)

    const listA = await listCampaignsUseCase(a.ctx)
    expect(listA.items).toHaveLength(1)
    expect(listA.items[0]?.name).toBe("Chiến dịch Tết Alpha")

    const listB = await listCampaignsUseCase(b.ctx)
    expect(listB.items).toHaveLength(0)
  })

  it("tổ chức B không thể cập nhật hoặc xem chi tiết chiến dịch của A", async () => {
    const campA = await createCampaignUseCase(a.ctx, {
      name: "Chiến dịch Valentine Alpha",
      objective: "LEAD",
      occasionCode: "VALENTINE",
    })

    // B cố gắng lấy chi tiết → 404
    await expect(getCampaignDetailsUseCase(b.ctx, campA.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    })

    // B cố gắng cập nhật → 404
    await expect(
      updateCampaignUseCase(b.ctx, campA.id, { name: "Hack B" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    })

    // Chiến dịch của A vẫn an toàn
    const detailsA = await getCampaignDetailsUseCase(a.ctx, campA.id)
    expect(detailsA.campaign.name).toBe("Chiến dịch Valentine Alpha")
  })
})
