import { describe, expect, it } from "vitest"

import { fetchPendingApprovalCount } from "../pending-approval-count"

const reply = (ok: boolean, data?: unknown[]) => async () => ({ ok, json: async () => ({ data }) })

describe("fetchPendingApprovalCount — cùng nguồn với màn Duyệt (UJ-07)", () => {
  it("cộng phân tích ảnh và ảnh tối ưu đang chờ duyệt", async () => {
    const get = async (url: string) => (url.includes("vision") ? reply(true, [1, 2, 3])() : reply(true, [1])())
    expect(await fetchPendingApprovalCount(get)).toBe(4)
  })

  it("một nguồn bị từ chối quyền → vẫn đếm nguồn còn lại", async () => {
    const get = async (url: string) => (url.includes("vision") ? reply(false)() : reply(true, [1, 2])())
    expect(await fetchPendingApprovalCount(get)).toBe(2)
  })

  it("không đọc được nguồn nào → null (không hiện 0 sai)", async () => {
    expect(await fetchPendingApprovalCount(async () => { throw new Error("mạng") })).toBeNull()
  })
})
