import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy"

const findById = vi.fn()
const findLatest = vi.fn()
vi.mock("@/modules/content-engine/infra/content-generation-repository", () => {
  const mocked = {
    ContentGenerationRepository: vi.fn().mockImplementation(function () { return { findById, findLatest } }),
  }
  return { ...mocked, getContentGenerationRepository: vi.fn(() => new mocked.ContentGenerationRepository()) }
})

import { findLatestContentGeneration, getContentGenerationById } from "@/modules/content-engine/use-cases/get-content-generation"

const ctx: TenantContext = {
  organizationId: "org-1",
  workspaceId: "ws-1",
  userId: "user-1",
  branchId: null,
  capabilities: new Set(["I1"]),
}

describe("getContentGenerationById", () => {
  beforeEach(() => vi.clearAllMocks())

  it("trả về bản ghi khi có", async () => {
    findById.mockResolvedValue({ id: "gen-1" })
    const r = await getContentGenerationById(ctx, "gen-1")
    expect(r).toEqual({ id: "gen-1" })
    expect(findById).toHaveBeenCalledWith(ctx, "gen-1")
  })

  it("không có → NOT_FOUND", async () => {
    findById.mockResolvedValue(null)
    await expect(getContentGenerationById(ctx, "missing")).rejects.toThrow()
  })

  it("thiếu I1 thì từ chối trước khi đọc", async () => {
    await expect(getContentGenerationById({ ...ctx, capabilities: new Set() }, "gen-1")).rejects.toThrow()
    expect(findById).not.toHaveBeenCalled()
  })
})

describe("findLatestContentGeneration", () => {
  beforeEach(() => vi.clearAllMocks())

  it("chuyển bộ lọc thẳng xuống repository", async () => {
    findLatest.mockResolvedValue({ id: "gen-2" })
    const r = await findLatestContentGeneration(ctx, { assetId: "a1" })
    expect(r).toEqual({ id: "gen-2" })
    expect(findLatest).toHaveBeenCalledWith(ctx, { assetId: "a1" })
  })

  it("không có bản ghi → null", async () => {
    findLatest.mockResolvedValue(null)
    const r = await findLatestContentGeneration(ctx, {})
    expect(r).toBeNull()
  })
})
