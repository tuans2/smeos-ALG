import { describe, expect, it } from "vitest"

import { decideApproval } from "@/modules/content-engine/domain/approval-rules"

const generated = [
  { channel: "facebook", text: "Bài Facebook", hashtags: ["#hoa"] },
  { channel: "zalo", text: "Bài Zalo", hashtags: [] },
]

describe("decideApproval", () => {
  it("không nêu kênh: duyệt nguyên văn mọi bài, edited=false", () => {
    const d = decideApproval({ status: "DRAFT", generatedPosts: generated, existingApproved: null })
    expect(d).toEqual({
      ok: true,
      approvedPosts: [
        { channel: "facebook", text: "Bài Facebook", hashtags: ["#hoa"], edited: false },
        { channel: "zalo", text: "Bài Zalo", hashtags: [], edited: false },
      ],
    })
  })

  it("duyệt một kênh kèm bản sửa: edited=true, kênh khác không bị duyệt theo", () => {
    const d = decideApproval({
      status: "DRAFT",
      generatedPosts: generated,
      existingApproved: null,
      requested: [{ channel: "zalo", text: "Bài Zalo đã sửa" }],
    })
    expect(d.ok && d.approvedPosts).toEqual([{ channel: "zalo", text: "Bài Zalo đã sửa", hashtags: [], edited: true }])
  })

  it("đang APPROVED: lượt duyệt kênh khác gộp thêm, giữ kênh đã duyệt, đúng thứ tự lượt sinh", () => {
    const d = decideApproval({
      status: "APPROVED",
      generatedPosts: generated,
      existingApproved: [{ channel: "zalo", text: "Bài Zalo", hashtags: [], edited: false }],
      requested: [{ channel: "facebook" }],
    })
    expect(d.ok && d.approvedPosts.map((p) => p.channel)).toEqual(["facebook", "zalo"])
  })

  it("đổi hashtag cũng tính là đã sửa", () => {
    const d = decideApproval({
      status: "DRAFT",
      generatedPosts: generated,
      existingApproved: null,
      requested: [{ channel: "facebook", hashtags: ["#hoatuoi"] }],
    })
    expect(d.ok && d.approvedPosts[0]?.edited).toBe(true)
  })

  it("SCHEDULED thì khoá — CONFLICT", () => {
    const d = decideApproval({ status: "SCHEDULED", generatedPosts: generated, existingApproved: null })
    expect(d).toMatchObject({ ok: false, kind: "CONFLICT" })
  })

  it("trạng thái lạ → CONFLICT, thông điệp không lộ mã trạng thái (audit User Journey R2-10)", () => {
    const d = decideApproval({ status: "ARCHIVED", generatedPosts: generated, existingApproved: null })
    expect(d).toMatchObject({ ok: false, kind: "CONFLICT" })
    expect(d.ok ? "" : d.reason).not.toMatch(/[A-Z_]{4,}/)
  })

  it("kênh không có trong lượt sinh, kênh lặp, bài rỗng — VALIDATION", () => {
    const base = { status: "DRAFT", generatedPosts: generated, existingApproved: null }
    expect(decideApproval({ ...base, requested: [{ channel: "tiktok" }] })).toMatchObject({ ok: false, kind: "VALIDATION" })
    expect(decideApproval({ ...base, requested: [{ channel: "zalo" }, { channel: "zalo" }] })).toMatchObject({ ok: false, kind: "VALIDATION" })
    expect(decideApproval({ ...base, requested: [{ channel: "zalo", text: "   " }] })).toMatchObject({ ok: false, kind: "VALIDATION" })
  })
})
