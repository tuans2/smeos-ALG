import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type { IAssetRepository } from "@/modules/assets/domain/repositories/asset-repository.interface"
import type { StorageProvider } from "@/core/ports"
import { saveBannerToLibraryUseCase } from "./save-banner-to-library.use-case"

// Valid 2x2 PNG Base64
const VALID_PNG_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg=="

describe("saveBannerToLibraryUseCase (PR-1)", () => {
  const ctx: TenantContext = {
    organizationId: "org-test-123",
    workspaceId: "ws-1",
    userId: "user-456",
    branchId: null,
    capabilities: new Set(["G2"]),
  }

  it("lưu banner thành công vào storage và assets repository", async () => {
    let savedStorageKey = ""
    let savedContentType = ""

    const mockStorage: StorageProvider = {
      name: "mock-storage",
      put: vi.fn(async (key, _body, contentType) => {
        savedStorageKey = key
        savedContentType = contentType
      }),
      get: vi.fn(),
      delete: vi.fn(),
      signedUrl: vi.fn(),
      list: vi.fn(),
    }

    let createdAssetInput: Parameters<IAssetRepository["create"]>[1] | null = null
    const mockAssetRepo: Partial<IAssetRepository> = {
      create: vi.fn(async (_c, input) => {
        createdAssetInput = input
        return {
          ...input,
          organization_id: ctx.organizationId,
          created_at: new Date(),
          approval_state: "PENDING",
          approved_by: null,
          approved_at: null,
          width: input.width ?? null,
          height: input.height ?? null,
          aspect_ratio: null,
          file_size: input.fileSize ?? null,
          provider: null,
          model: null,
          model_version: null,
          pipeline_version: null,
          parameters: null,
          prompt: null,
          input_sha256: null,
          output_sha256: null,
          quality_score: null,
          identity_score: null,
          generated_flags: null,
          cost_usd: null,
          thumb_key: null,
          state: "READY",
        } as unknown as Awaited<ReturnType<IAssetRepository["create"]>>
      }),
    }

    const result = await saveBannerToLibraryUseCase(
      ctx,
      {
        title: "Poster khuyến mãi mùa hè",
        assetTypeCode: "9",
        imageData: VALID_PNG_BASE64,
        width: 1080,
        height: 1080,
        metadata: { campaign_name: "He_2026" },
      },
      {
        storage: mockStorage,
        assetRepo: mockAssetRepo as IAssetRepository,
      },
    )

    expect(result.title).toBe("Poster khuyến mãi mùa hè")
    expect(result.assetTypeCode).toBe("9")
    expect(result.approvalState).toBe("PENDING")
    expect(savedStorageKey).toContain(`org/${ctx.organizationId}/unfiled/`)
    expect(savedStorageKey.endsWith(".png")).toBe(true)
    expect(savedContentType).toBe("image/png")

    expect(createdAssetInput).toMatchObject({
      kind: "MARKETING",
      metadata: { asset_type_code: "9", title: "Poster khuyến mãi mùa hè" },
      createdBy: ctx.userId,
    })
  })

  it("từ chối khi ảnh không đúng định dạng PNG", async () => {
    const mockStorage: StorageProvider = {
      name: "mock",
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      signedUrl: vi.fn(),
      list: vi.fn(),
    }
    const mockAssetRepo: Partial<IAssetRepository> = { create: vi.fn() }

    await expect(
      saveBannerToLibraryUseCase(
        ctx,
        {
          title: "Ảnh giả",
          assetTypeCode: "9",
          imageData: "data:image/png;base64,bm90LWEtcG5nLWZpbGU=", // "not-a-png-file"
        },
        {
          storage: mockStorage,
          assetRepo: mockAssetRepo as IAssetRepository,
        },
      ),
    ).rejects.toThrow()
  })
})

