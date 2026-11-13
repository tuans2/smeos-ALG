import { describe, expect, it, vi, beforeEach } from "vitest"
import type { TenantContext } from "@/core/tenancy"

const mockTenantContext: TenantContext = {
  organizationId: "org-1",
  workspaceId: "ws-1",
  userId: "user-1",
  branchId: null,
  capabilities: new Set(["H6"]),
}

vi.mock("@/modules/product-copies/infra/product-copy-repository", () => {
  const mocked = {
    ProductCopyRepository: vi.fn().mockImplementation(function () { return {
      approve: vi.fn(),
      reject: vi.fn(),
    } }),
  }
  return { ...mocked, getProductCopyRepository: vi.fn(() => new mocked.ProductCopyRepository()) }
})

vi.mock("@/modules/audit/use-cases/record-audit-log", () => ({
  recordAuditLog: vi.fn(),
}))

vi.mock("@/modules/jobs/infra/transaction", () => ({
  runInTransaction: vi.fn(),
}))

import { approveProductCopy, rejectProductCopy } from "@/modules/product-copies/use-cases/approve-product-copy"
import { runInTransaction } from "@/modules/jobs/infra/transaction"

describe("approveProductCopy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls runInTransaction", async () => {
    vi.mocked(runInTransaction).mockResolvedValue({ productId: "product-1", copyId: "copy-1" })

    const result = await approveProductCopy(mockTenantContext, "copy-1")

    expect(result).toEqual({ productId: "product-1", copyId: "copy-1" })
    expect(runInTransaction).toHaveBeenCalled()
  })

  it("propagates error from runInTransaction", async () => {
    vi.mocked(runInTransaction).mockRejectedValue(new Error("NOT_FOUND"))

    await expect(approveProductCopy(mockTenantContext, "non-existent")).rejects.toThrow("NOT_FOUND")
  })
})

describe("rejectProductCopy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls runInTransaction", async () => {
    vi.mocked(runInTransaction).mockResolvedValue(undefined)

    await rejectProductCopy(mockTenantContext, "copy-1", "Reason")

    expect(runInTransaction).toHaveBeenCalled()
  })

  it("propagates error from runInTransaction", async () => {
    vi.mocked(runInTransaction).mockRejectedValue(new Error("NOT_FOUND"))

    await expect(rejectProductCopy(mockTenantContext, "non-existent")).rejects.toThrow("NOT_FOUND")
  })
})