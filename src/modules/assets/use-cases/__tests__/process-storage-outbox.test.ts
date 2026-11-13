import { describe, expect, it, vi } from "vitest"

import type { OutboxItem } from "../../infra/payload-outbox"
import { processStorageOutbox, type OutboxDeps } from "../process-storage-outbox"

const now = new Date("2026-10-29T00:00:00Z")
const item = (id: string, key: string): OutboxItem => ({ id, organization_id: "org-a", storage_key: key, attempts: 0 })

function deps(items: OutboxItem[], refs: Record<string, number> = {}, failKeys: string[] = []) {
  const deleted: string[] = []
  const d: OutboxDeps = {
    storage: {
      delete: vi.fn(async (key: string) => {
        if (failKeys.includes(key)) throw new Error("kho lỗi")
        deleted.push(key)
      }),
    },
    countReferences: vi.fn(async (_ctx, key: string) => refs[key] ?? 0),
    listPending: vi.fn(async () => items),
    markDone: vi.fn(async () => undefined),
    markFailed: vi.fn(async () => undefined),
  }
  return { d, deleted }
}

describe("processStorageOutbox", () => {
  it("cờ tắt (deps null) thì không làm gì", async () => {
    expect(await processStorageOutbox(now, null)).toBeNull()
  })

  it("xoá tệp không còn ai trỏ tới và đóng việc", async () => {
    const { d, deleted } = deps([item("1", "org/org-a/p/a.jpg")])
    expect(await processStorageOutbox(now, d)).toEqual({ deleted: 1, keptReferenced: 0, failed: 0 })
    expect(deleted).toEqual(["org/org-a/p/a.jpg"])
    expect(d.markDone).toHaveBeenCalledWith("1", null, now)
  })

  it("giữ tệp còn bản ghi khác trỏ tới (Master dùng chung tệp gốc)", async () => {
    const { d, deleted } = deps([item("1", "org/org-a/p/a.jpg")], { "org/org-a/p/a.jpg": 1 })
    expect(await processStorageOutbox(now, d)).toEqual({ deleted: 0, keptReferenced: 1, failed: 0 })
    expect(deleted).toEqual([])
    expect(d.markDone).toHaveBeenCalledWith("1", "still_referenced", now)
  })

  it("lỗi kho: tăng số lần thử, các việc khác vẫn chạy", async () => {
    const { d, deleted } = deps([item("1", "org/org-a/p/x.jpg"), item("2", "org/org-a/p/y.jpg")], {}, ["org/org-a/p/x.jpg"])
    expect(await processStorageOutbox(now, d)).toEqual({ deleted: 1, keptReferenced: 0, failed: 1 })
    expect(d.markFailed).toHaveBeenCalledWith("1", "kho lỗi")
    expect(deleted).toEqual(["org/org-a/p/y.jpg"])
  })
})
