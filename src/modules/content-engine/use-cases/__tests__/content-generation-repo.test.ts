import { describe, expect, it, vi, beforeEach } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type { IContentGenerationRepository } from "../../domain/repositories/content-generation-repository.interface"
import { getContentGenerationById, findLatestContentGeneration } from "../get-content-generation"
import { approveContentGeneration } from "../approve-content-generation"

const ctx: TenantContext = {
  organizationId: "org-ce-01",
  userId: "user-ce-01",
  workspaceId: "ws-ce-01",
  branchId: null,
  capabilities: new Set(["I1", "J5"]),
}

describe("content-engine: Content Generation use-cases with DI", () => {
  const mockRepo: IContentGenerationRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    findLatest: vi.fn(),
    approve: vi.fn(),
    markScheduled: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("getContentGenerationById trả về bản ghi khi tìm thấy", async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue({
      id: "gen-01",
      organization_id: "org-ce-01",
      status: "DRAFT",
    } as never)

    const result = await getContentGenerationById(ctx, "gen-01", mockRepo)
    expect(result.id).toBe("gen-01")
    expect(mockRepo.findById).toHaveBeenCalledWith(ctx, "gen-01")
  })

  it("getContentGenerationById ném lỗi khi không tìm thấy", async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null)
    await expect(getContentGenerationById(ctx, "gen-not-found", mockRepo)).rejects.toThrow(
      "Không có lượt sinh bài này"
    )
  })

  it("findLatestContentGeneration trả về null khi không khớp", async () => {
    vi.mocked(mockRepo.findLatest).mockResolvedValue(null)
    const result = await findLatestContentGeneration(ctx, { mode: "CREATIVE" }, mockRepo)
    expect(result).toBeNull()
  })

  it("approveContentGeneration ném lỗi 404 khi không tìm thấy id", async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null)
    await expect(approveContentGeneration(ctx, "gen-none", {}, mockRepo)).rejects.toThrow()
  })
})
