import { describe, expect, it, vi } from "vitest"
import { AppError, notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { bulkUpdateStatus } from "../bulk-update-status"

const ctx = { organizationId: "org-1", userId: "u-1" } as unknown as TenantContext

describe("bulkUpdateStatus", () => {
  it("rejects empty or oversized selections", async () => {
    await expect(bulkUpdateStatus(ctx, [], "ACTIVE", vi.fn())).rejects.toThrow(AppError)
    const many = Array.from({ length: 101 }, (_, i) => `p${i}`)
    await expect(bulkUpdateStatus(ctx, many, "ACTIVE", vi.fn())).rejects.toThrow(AppError)
  })

  it("dedupes ids, reports per-row failures and keeps going", async () => {
    const update = vi.fn(async (_c: TenantContext, id: string) => {
      if (id === "other-org") throw notFound()
      if (id === "official") throw new AppError("CAPABILITY_DENIED", "Chỉ Điều hành sửa được")
      return {} as never
    })
    const res = await bulkUpdateStatus(ctx, ["a", "a", "other-org", "official", "b"], "ARCHIVED", update as never)
    expect(update).toHaveBeenCalledTimes(4)
    expect(update).toHaveBeenCalledWith(ctx, "a", { status: "ARCHIVED" })
    expect(res.updated).toEqual(["a", "b"])
    expect(res.failed).toEqual([
      { id: "other-org", reason: "Không tìm thấy" },
      { id: "official", reason: "Chỉ Điều hành sửa được" },
    ])
  })

  it("rethrows unexpected errors", async () => {
    const update = vi.fn(async () => { throw new Error("db down") })
    await expect(bulkUpdateStatus(ctx, ["a"], "ACTIVE", update as never)).rejects.toThrow("db down")
  })
})
