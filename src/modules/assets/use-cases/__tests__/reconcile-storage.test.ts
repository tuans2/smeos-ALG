import { describe, expect, it, vi } from "vitest"

import { reconcileStorageRegistry } from "../reconcile-storage"

describe("reconcileStorageRegistry", () => {
  it("liệt kê đủ các trang của mọi tiền tố quản lý rồi đối soát với registry", async () => {
    const list = vi.fn(async (prefix: string, cursor?: string | null) => {
      if (prefix === "org/" && !cursor) return { items: [{ key: "org/o1/p/a.jpg", size: 1 }], nextCursor: "p2" }
      if (prefix === "org/") return { items: [{ key: "org/o1/p/b.jpg", size: 2 }], nextCursor: null }
      return { items: [], nextCursor: null }
    })
    const report = await reconcileStorageRegistry({
      storage: { list },
      loadRegistry: async () => ({ registry: new Set(["org/o1/p/a.jpg"]), pendingDeletes: new Set<string>() }),
    })
    expect(list).toHaveBeenCalledWith("org/", "p2")
    expect(list).toHaveBeenCalledWith("videos/", null)
    expect(report.orphans).toEqual([{ key: "org/o1/p/b.jpg", size: 2 }])
    expect(report.missing).toEqual([])
  })
})
