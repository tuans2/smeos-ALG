import { describe, expect, test } from "vitest"

import { evaluateCampaignQa, type QaInput } from "@/modules/creative-production/domain/campaign-package-rules"

// Đợt 5 (24/09/2026): QA trục "đồng nhất kịch bản sản xuất" — mọi tài sản trong
// gói sinh từ CÙNG kịch bản Chặng 05, đúng phiên bản hiện hành.

const base: QaInput = {
  posts: [{ channel: "tiktok", text: "Giỏ hoa sinh nhật tone vàng", hashtags: [] }],
  variants: [
    { assetId: "aaaaaaaa-1", approvalState: "APPROVED", identityScore: 1, aspectRatio: "9:16", watermark: true, scenePlanId: "P", scenePlanRevision: 2 },
  ],
  video: { stage: "APPROVED", approval: "APPROVED", aspectRatio: "9:16", scenePlanId: "P", scenePlanRevision: 2, usesPlanAudio: true },
  audio: { stage: "COMPLETED", scenePlanId: "P", scenePlanRevision: 2 },
  brand: { hasLogo: true, forbiddenStyles: null },
  now: new Date("2026-09-24T12:00:00Z"),
  plan: { scenePlanId: "P", revision: 2 },
}
const axis = (i: QaInput) => evaluateCampaignQa(i).checks.find((c) => c.id === "plan_consistency")

describe("QA — đồng nhất kịch bản", () => {
  test("mọi tài sản cùng kịch bản, đúng phiên bản → đạt", () => {
    expect(axis(base)?.verdict).toBe("PASS")
  })
  test("gói cũ không gắn kịch bản → không có trục này", () => {
    expect(axis({ ...base, plan: null })).toBeUndefined()
  })
  test("ảnh của phiên bản cũ → cần xem lại", () => {
    const r = axis({ ...base, variants: [{ ...base.variants[0]!, scenePlanRevision: 1 }] })
    expect(r?.verdict).toBe("NEEDS_REVIEW")
    expect(r?.reasons[0]).toContain("phiên bản 1")
  })
  test("video tự đọc lại lời thoại (không dùng bản phối C) → cần xem lại", () => {
    const r = axis({ ...base, video: { ...base.video!, usesPlanAudio: false } })
    expect(r?.verdict).toBe("NEEDS_REVIEW")
  })
  test("âm thanh thuộc kịch bản khác → cần xem lại", () => {
    expect(axis({ ...base, audio: { stage: "COMPLETED", scenePlanId: "Q", scenePlanRevision: 1 } })?.verdict).toBe("NEEDS_REVIEW")
  })
})
