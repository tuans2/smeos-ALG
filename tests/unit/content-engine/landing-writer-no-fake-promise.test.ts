import { describe, expect, it } from "vitest"
import { LANDING_WRITER_PROMPT_V1 } from "@/modules/content-engine/domain/prompts/landing/v1"

/** Nội dung dự phòng không được tự hứa thời gian giao mà tiệm chưa khai báo. */
describe("landing writer — nội dung dự phòng không bịa cam kết", () => {
  it("FAQ dự phòng không hứa giao trong N giờ", () => {
    const r = LANDING_WRITER_PROMPT_V1.normalize({
      hero: { headline: "Hoa tươi mỗi ngày" },
      story: { paragraph1: "Câu chuyện của tiệm hoa nhỏ." },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const text = r.output.faq.map((f) => f.answer).join(" ")
    expect(text).not.toMatch(/\d+\s*giờ/)
  })
})
