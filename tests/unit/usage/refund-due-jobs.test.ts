import { describe, expect, it, vi } from "vitest"

import { aiFailureMessage } from "@/modules/usage/domain/ai-failure-message"
import { refundDueJobs, REFUND_SWEEP_BATCH } from "@/modules/usage/use-cases/refund-due-jobs"

/** Audit BL-32, BL-33 (11/11/2026). */
const job = (id: string) => ({ id, organization_id: "org-1", workspace_id: "ws-1", user_id: "u-1", branch_id: null }) as never

describe("bộ quét hoàn credit", () => {
  it("hoàn từng job, đếm credit; lỗi một job không chặn job khác; ngữ cảnh lấy từ dòng job", async () => {
    const list = vi.fn(async () => [job("j1"), job("j2"), job("j3")])
    const refund = vi.fn(async (ctx: { organizationId: string }, id: string) => {
      expect(ctx.organizationId).toBe("org-1")
      if (id === "j2") throw new Error("khoá")
      return id === "j1" ? { refunded: true as const, creditHoanLai: 3, lyDo: "loi-ky-thuat" as const } : { refunded: false as const, reason: "da-hoan-truoc-do" as const }
    })
    expect(await refundDueJobs({ list, refund })).toEqual({ refunded: 1, credit: 3, failed: 1 })
    expect(list).toHaveBeenCalledWith(REFUND_SWEEP_BATCH)
  })
})

describe("câu báo lỗi AI", () => {
  it("chỉ nói đã hoàn khi hoàn thật; không chứa lỗi thô hay tên kỹ thuật", () => {
    expect(aiFailureMessage("AI chưa viết được bài", true)).toBe("AI chưa viết được bài — đã hoàn credit, vui lòng thử lại.")
    expect(aiFailureMessage("AI chưa viết được bài", false)).toBe("AI chưa viết được bài — credit sẽ được hoàn tự động trong ít phút, vui lòng thử lại.")
  })
})
