import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { AssetUsage } from "../domain/asset-usage"
import type { IAssetUsageRepository } from "../domain/repositories/asset-usage-repository.interface"
import { createAssetUsageUseCase } from "./create-asset-usage.use-case"
import { listAssetUsagesUseCase } from "./list-asset-usages.use-case"

type CreateLink = NonNullable<NonNullable<Parameters<typeof createAssetUsageUseCase>[2]>["createLink"]>
import { updateAssetUsageUseCase } from "./update-asset-usage.use-case"

const makeCtx = (capabilities: string[] = ["M1", "M2"]): TenantContext => ({
  organizationId: "org-123",
  workspaceId: "ws-123",
  userId: "user-abc",
  branchId: null,
  capabilities: new Set(capabilities),
})

function makeMockRepo(initialUsages: AssetUsage[] = []): IAssetUsageRepository {
  const store = new Map<string, AssetUsage>(initialUsages.map((u) => [u.id, u]))
  return {
    create: vi.fn(async (_ctx, data) => {
      const usage: AssetUsage = {
        id: `usage-${Date.now()}`,
        organizationId: _ctx.organizationId,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        assetTypeCode: data.assetTypeCode,
        destination: data.destination,
        ctaCode: data.ctaCode,
        title: data.title,
        shortLinkId: data.shortLinkId ?? null,
        campaignId: data.campaignId ?? null,
        config: data.config ?? {},
        status: data.status ?? "ACTIVE",
        createdBy: data.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      store.set(usage.id, usage)
      return usage
    }),
    findById: vi.fn(async (_ctx, id) => store.get(id) ?? null),
    listBySource: vi.fn(async (_ctx, sourceType, sourceId) =>
      [...store.values()].filter((u) => u.sourceType === sourceType && u.sourceId === sourceId)
    ),
    list: vi.fn(async () => [...store.values()]),
    update: vi.fn(async (_ctx, id, data) => {
      const existing = store.get(id)
      if (!existing) throw new Error("Not found")
      const updated: AssetUsage = {
        ...existing,
        title: data.title ?? existing.title,
        ctaCode: data.ctaCode ?? existing.ctaCode,
        destination: data.destination ?? existing.destination,
        status: data.status ?? existing.status,
        config: data.config ?? existing.config,
        updatedAt: new Date(),
      }
      store.set(id, updated)
      return updated
    }),
  }
}

describe("Asset Usage Use-Cases (PR-2)", () => {
  it("tạo nơi dùng Quảng bá với CTA hợp lệ thành công", async () => {
    const ctx = makeCtx()
    const repo = makeMockRepo()
    const result = await createAssetUsageUseCase(
      ctx,
      {
        sourceType: "ai_image",
        sourceId: "asset-1",
        assetTypeCode: "8", // Poster quảng cáo
        destination: "PROMOTION",
        ctaCode: "LEARN_MORE",
        title: "Banner quảng cáo Facebook",
      },
      { repo }
    )

    expect(result.usage.id).toBeTruthy()
    expect(result.usage.destination).toBe("PROMOTION")
    expect(result.usage.ctaCode).toBe("LEARN_MORE")
    expect(result.usage.status).toBe("ACTIVE")
    expect(repo.create).toHaveBeenCalledOnce()
  })

  it("tự động tạo short link khi cung cấp channel WEB_LINK và targetPath", async () => {
    const ctx = makeCtx()
    const repo = makeMockRepo()
    const mockCreateLink = vi.fn(async () => ({
      id: "sl-123",
      code: "abcxyz",
      targetPath: "/c/bo-suu-tap-moi",
    }))

    const result = await createAssetUsageUseCase(
      ctx,
      {
        sourceType: "catalog",
        sourceId: "cat-1",
        assetTypeCode: "18", // Catalog sản phẩm
        destination: "SALES",
        ctaCode: "ORDER",
        title: "Catalog bán hàng trực tuyến",
        channelId: "WEB_LINK",
        targetPath: "/c/bo-suu-tap-moi",
      },
      { repo, createLink: mockCreateLink as unknown as CreateLink }
    )

    expect(mockCreateLink).toHaveBeenCalledOnce()
    expect(result.usage.shortLinkId).toBe("sl-123")
    expect(result.shortLink?.code).toBe("abcxyz")
  })

  it("từ chối khi CTA không hợp lệ cho nơi dùng", async () => {
    const ctx = makeCtx()
    const repo = makeMockRepo()

    // Quảng bá không cho phép ORDER
    await expect(
      createAssetUsageUseCase(
        ctx,
        {
          sourceType: "ai_image",
          sourceId: "asset-1",
          assetTypeCode: "8",
          destination: "PROMOTION",
          ctaCode: "ORDER",
          title: "Sai CTA",
        },
        { repo }
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    })
  })

  it("từ chối khi Nơi dùng không được phép cho loại asset", async () => {
    const ctx = makeCtx()
    const repo = makeMockRepo()

    // Asset #1 (Ảnh bìa sản phẩm) không áp dụng PRINT trực tiếp
    await expect(
      createAssetUsageUseCase(
        ctx,
        {
          sourceType: "original",
          sourceId: "asset-1",
          assetTypeCode: "1",
          destination: "PRINT",
          ctaCode: "ORDER",
          title: "Sai nơi dùng",
        },
        { repo }
      )
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    })
  })

  it("đọc danh sách nơi dùng theo source hoặc toàn tổ chức", async () => {
    const ctx = makeCtx()
    const initial: AssetUsage = {
      id: "u-1",
      organizationId: ctx.organizationId,
      sourceType: "ai_image",
      sourceId: "img-1",
      assetTypeCode: "8",
      destination: "PROMOTION",
      ctaCode: "LEARN_MORE",
      title: "Quảng cáo 1",
      shortLinkId: null,
      campaignId: null,
      config: {},
      status: "ACTIVE",
      createdBy: ctx.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const repo = makeMockRepo([initial])

    const bySource = await listAssetUsagesUseCase(ctx, { sourceType: "ai_image", sourceId: "img-1" }, { repo })
    expect(bySource).toHaveLength(1)
    expect(bySource[0]?.id).toBe("u-1")

    const empty = await listAssetUsagesUseCase(ctx, { sourceType: "ai_image", sourceId: "non-existent" }, { repo })
    expect(empty).toHaveLength(0)
  })

  it("cập nhật thông tin và tạm dừng nơi dùng", async () => {
    const ctx = makeCtx()
    const initial: AssetUsage = {
      id: "u-1",
      organizationId: ctx.organizationId,
      sourceType: "ai_image",
      sourceId: "img-1",
      assetTypeCode: "8",
      destination: "PROMOTION",
      ctaCode: "LEARN_MORE",
      title: "Quảng cáo cũ",
      shortLinkId: null,
      campaignId: null,
      config: {},
      status: "ACTIVE",
      createdBy: ctx.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const repo = makeMockRepo([initial])

    const updated = await updateAssetUsageUseCase(
      ctx,
      {
        id: "u-1",
        title: "Quảng cáo mới",
        status: "PAUSED",
      },
      { repo }
    )

    expect(updated.title).toBe("Quảng cáo mới")
    expect(updated.status).toBe("PAUSED")
  })

  it("chặn khi người dùng thiếu quyền M1 hoặc M2", async () => {
    const noM2Ctx = makeCtx(["M1"])
    const repo = makeMockRepo()

    await expect(
      createAssetUsageUseCase(
        noM2Ctx,
        {
          sourceType: "ai_image",
          sourceId: "asset-1",
          assetTypeCode: "8",
          destination: "PROMOTION",
          ctaCode: "LEARN_MORE",
          title: "Thiếu quyền",
        },
        { repo }
      )
    ).rejects.toMatchObject({
      code: "CAPABILITY_DENIED",
    })

    const noM1Ctx = makeCtx(["M2"])
    await expect(listAssetUsagesUseCase(noM1Ctx, {}, { repo })).rejects.toMatchObject({
      code: "CAPABILITY_DENIED",
    })
  })
})

