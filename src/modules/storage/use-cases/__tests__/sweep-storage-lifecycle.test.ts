import { describe, expect, it, vi } from "vitest"

import { sweepExpiredLibraryTrash, sweepExpiredTrash } from "../sweep-storage-lifecycle"

describe("sweepExpiredTrash", () => {
  it("xoá từng asset quá hạn dưới ngữ cảnh đúng tổ chức của nó", async () => {
    const now = new Date("2026-10-29T00:00:00Z")
    const remove = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    const findExpired = vi.fn().mockResolvedValue([
      { id: "a1", organization_id: "org-a", storage_key: "org/org-a/p/a1.jpg", thumb_key: null },
      { id: "b1", organization_id: "org-b", storage_key: "org/org-b/p/b1.jpg", thumb_key: null },
    ])
    expect(await sweepExpiredTrash(now, { findExpired, remove, usages: async () => [] })).toBe(1)
    expect(findExpired).toHaveBeenCalledWith(now, expect.any(Number))
    expect(remove.mock.calls[0]![0].organizationId).toBe("org-a")
    expect(remove.mock.calls[1]![0].organizationId).toBe("org-b")
  })

  it("bỏ qua ảnh đang được dùng: giữ trong thùng rác, không xoá", async () => {
    const remove = vi.fn().mockResolvedValue(true)
    const findExpired = vi.fn().mockResolvedValue([{ id: "a1", organization_id: "org-a", storage_key: "org/org-a/p/a1.jpg", thumb_key: null }])
    expect(await sweepExpiredTrash(new Date(), { findExpired, remove, usages: async () => ["product_image"] })).toBe(0)
    expect(remove).not.toHaveBeenCalled()
  })
})

describe("sweepExpiredLibraryTrash (L-4)", () => {
  it("xoá vĩnh viễn mục quá hạn bằng hành động cron, bỏ qua mục đang dùng", async () => {
    const findExpired = vi.fn().mockResolvedValue([
      { type: "VIDEO", id: "v1", organization_id: "org-a" },
      { type: "GREETING_CATALOG", id: "g1", organization_id: "org-b" },
    ])
    const library = {
      findUsages: vi.fn(async (_ctx: unknown, _type: string, id: string) => (id === "v1" ? (["campaign"] as const) : [])),
      permanentDelete: vi.fn().mockResolvedValue("deleted"),
    }
    expect(await sweepExpiredLibraryTrash(new Date(), { findExpired, library: library as never })).toBe(1)
    expect(library.permanentDelete).toHaveBeenCalledTimes(1)
    expect(library.permanentDelete.mock.calls[0]!.slice(1)).toEqual(["GREETING_CATALOG", "g1", "trash.auto_purge"])
    expect((library.permanentDelete.mock.calls[0]![0] as { organizationId: string }).organizationId).toBe("org-b")
  })
})
