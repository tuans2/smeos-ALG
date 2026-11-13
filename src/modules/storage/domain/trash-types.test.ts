import { describe, expect, it } from "vitest"

import { TRASH_RETENTION_DAYS, createTrashMeta, trashExpiresAt } from "./trash-types"

const DAY_MS = 24 * 60 * 60 * 1000

describe("thời hạn thùng rác", () => {
  it("giữ 30 ngày", () => {
    expect(TRASH_RETENTION_DAYS).toBe(30)
  })

  it("hạn dọn = lúc bỏ vào thùng rác + TRASH_RETENTION_DAYS", () => {
    const trashedAt = new Date("2026-10-01T00:00:00.000Z")
    expect(trashExpiresAt(trashedAt).getTime() - trashedAt.getTime()).toBe(TRASH_RETENTION_DAYS * DAY_MS)
  })

  it("createTrashMeta dùng cùng thời hạn", () => {
    const meta = createTrashMeta("u1")
    const span = new Date(meta.expires_at).getTime() - new Date(meta.trashed_at).getTime()
    expect(span).toBe(TRASH_RETENTION_DAYS * DAY_MS)
    expect(meta.trashed_by).toBe("u1")
  })
})
