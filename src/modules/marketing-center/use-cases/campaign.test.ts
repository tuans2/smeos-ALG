import { describe, expect, it } from "vitest"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import {
  canTransitionCampaignStatus,
  validateCampaignInput,
  type Campaign,
  type CampaignStats,
} from "../domain/campaign"
import type { ICampaignRepository } from "../domain/repositories/campaign-repository.interface"
import type { AssetUsage } from "../domain/asset-usage"
import type { IAssetUsageRepository } from "../domain/repositories/asset-usage-repository.interface"
import { createCampaignUseCase } from "./create-campaign.use-case"
import { updateCampaignUseCase } from "./update-campaign.use-case"
import { listCampaignsUseCase } from "./list-campaigns.use-case"
import { getCampaignDetailsUseCase } from "./get-campaign-details.use-case"

const fakeCtx: TenantContext = {
  organizationId: "org-1",
  workspaceId: "ws-1",
  branchId: "br-1",
  userId: "user-1",
  capabilities: new Set(["M1", "M2", "M3"]),
}

class FakeCampaignRepo implements ICampaignRepository {
  public items: Campaign[] = []

  async create(data: Omit<Campaign, "id" | "createdAt" | "updatedAt">): Promise<Campaign> {
    const campaign: Campaign = {
      ...data,
      id: `camp-${this.items.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.items.push(campaign)
    return campaign
  }

  async findById(ctx: TenantContext, id: string): Promise<Campaign | null> {
    return this.items.find((c) => c.organizationId === ctx.organizationId && c.id === id) ?? null
  }

  async list(ctx: TenantContext): Promise<{ items: Campaign[]; nextCursor: string | null }> {
    const matched = this.items.filter((c) => c.organizationId === ctx.organizationId)
    return { items: matched, nextCursor: null }
  }

  async update(
    ctx: TenantContext,
    id: string,
    patch: Partial<Pick<Campaign, "name" | "objective" | "occasionCode" | "startsAt" | "endsAt" | "status">>,
  ): Promise<Campaign | null> {
    const item = await this.findById(ctx, id)
    if (!item) return null
    Object.assign(item, patch, { updatedAt: new Date() })
    return item
  }

  async getStats(_ctx: TenantContext, _campaignId: string): Promise<CampaignStats> {
    return {
      totalUsages: 2,
      totalScans: 150,
      totalLeads: 25,
      convertedOrders: 5,
    }
  }

  async countByStatus(ctx: TenantContext): Promise<Record<string, number>> {
    const matched = this.items.filter((c) => c.organizationId === ctx.organizationId)
    const counts: Record<string, number> = {}
    for (const c of matched) {
      counts[c.status] = (counts[c.status] ?? 0) + 1
    }
    return counts
  }
}

class FakeUsageRepo implements Partial<IAssetUsageRepository> {
  async list(): Promise<readonly AssetUsage[]> {
    return []
  }
}

describe("Campaign Domain & Use Cases", () => {
  it("validateCampaignInput kiểm tra hợp lệ và bắt lỗi", () => {
    expect(validateCampaignInput({ name: "  ", objective: "LEAD" })).toHaveProperty("name")
    expect(validateCampaignInput({ name: "Hợp lệ", objective: "INVALID" as unknown as Parameters<typeof validateCampaignInput>[0]["objective"] })).toHaveProperty("objective")
    expect(
      validateCampaignInput({
        name: "Hợp lệ",
        objective: "LEAD",
        startsAt: "2026-11-10",
        endsAt: "2026-11-01",
      }),
    ).toHaveProperty("endsAt")
    expect(
      validateCampaignInput({
        name: "Chiến dịch 20/10",
        objective: "SALE",
        occasionCode: "20_10",
      }),
    ).toEqual({})
  })

  it("canTransitionCampaignStatus tuân thủ vòng đời chiến dịch", () => {
    expect(canTransitionCampaignStatus("DRAFT", "ACTIVE")).toBe(true)
    expect(canTransitionCampaignStatus("ACTIVE", "PAUSED")).toBe(true)
    expect(canTransitionCampaignStatus("ACTIVE", "COMPLETED")).toBe(true)
    expect(canTransitionCampaignStatus("DRAFT", "COMPLETED")).toBe(false)
    expect(canTransitionCampaignStatus("COMPLETED", "DRAFT")).toBe(false)
  })

  it("createCampaignUseCase tạo chiến dịch với tổ chức từ ctx", async () => {
    const repo = new FakeCampaignRepo()
    const created = await createCampaignUseCase(
      fakeCtx,
      {
        name: "Tết Bính Ngọ 2026",
        objective: "SALE",
        occasionCode: "TET",
      },
      repo,
    )

    expect(created.id).toBeDefined()
    expect(created.organizationId).toBe("org-1")
    expect(created.name).toBe("Tết Bính Ngọ 2026")
    expect(created.status).toBe("DRAFT")
    expect(repo.items).toHaveLength(1)
  })

  it("updateCampaignUseCase cập nhật và từ chối chuyển trạng thái sai", async () => {
    const repo = new FakeCampaignRepo()
    const created = await repo.create({
      organizationId: "org-1",
      name: "Tết",
      objective: "SALE",
      occasionCode: "TET",
      startsAt: null,
      endsAt: null,
      status: "DRAFT",
      createdBy: "user-1",
    })

    // DRAFT không thể nhảy sang COMPLETED
    await expect(
      updateCampaignUseCase(fakeCtx, created.id, { status: "COMPLETED" }, repo),
    ).rejects.toThrow()

    // Chuyển sang ACTIVE hợp lệ
    const updated = await updateCampaignUseCase(fakeCtx, created.id, { status: "ACTIVE", name: "Tết 2026 Đổi Tên" }, repo)
    expect(updated.status).toBe("ACTIVE")
    expect(updated.name).toBe("Tết 2026 Đổi Tên")
  })

  it("listCampaignsUseCase trả về danh sách và bộ đếm trạng thái", async () => {
    const repo = new FakeCampaignRepo()
    await repo.create({
      organizationId: "org-1",
      name: "C1",
      objective: "AWARENESS",
      occasionCode: null,
      startsAt: null,
      endsAt: null,
      status: "DRAFT",
      createdBy: "u1",
    })
    await repo.create({
      organizationId: "org-1",
      name: "C2",
      objective: "LEAD",
      occasionCode: null,
      startsAt: null,
      endsAt: null,
      status: "ACTIVE",
      createdBy: "u1",
    })

    const res = await listCampaignsUseCase(fakeCtx, undefined, repo)
    expect(res.items).toHaveLength(2)
    expect(res.counts.DRAFT).toBe(1)
    expect(res.counts.ACTIVE).toBe(1)
  })

  it("getCampaignDetailsUseCase trả về chi tiết kèm thống kê", async () => {
    const repo = new FakeCampaignRepo()
    const created = await repo.create({
      organizationId: "org-1",
      name: "C1",
      objective: "SALE",
      occasionCode: null,
      startsAt: null,
      endsAt: null,
      status: "ACTIVE",
      createdBy: "u1",
    })

    const details = await getCampaignDetailsUseCase(fakeCtx, created.id, repo, new FakeUsageRepo() as unknown as IAssetUsageRepository)
    expect(details.campaign.id).toBe(created.id)
    expect(details.stats.totalScans).toBe(150)
    expect(details.stats.totalLeads).toBe(25)
    expect(details.stats.convertedOrders).toBe(5)
  })
})
