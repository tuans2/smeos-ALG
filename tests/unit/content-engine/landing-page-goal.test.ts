import { describe, expect, it } from "vitest"
import { LANDING_WRITER_PROMPT_V1, type LandingWriterInput } from "@/modules/content-engine/domain/prompts/landing/v1"
import { LANDING_TYPE_OPTIONS } from "@/modules/landing-page/domain/preset-catalog"

const base: LandingWriterInput = {
  shopName: "Tiệm A",
  shopTone: undefined,
  occasionId: "20-10",
  occasionLabel: "Ngày Phụ nữ Việt Nam",
  archetypeId: undefined,
  selectedProducts: [],
  userDirectives: undefined,
  discountPercent: undefined,
}

/** Bộ chọn "Mục đích trang" trên /landing-page phải thật sự đi tới AI (pilot MEUX, finding LP-01). */
describe("landing writer — mục đích trang", () => {
  it("đưa mục đích trang đã chọn vào prompt", () => {
    const chain = LANDING_TYPE_OPTIONS.find((o) => o.type === "CHAIN_BRAND")!
    const prompt = LANDING_WRITER_PROMPT_V1.build({ ...base, pageGoal: `${chain.title} — ${chain.subTitle}` })
    expect(prompt).toContain(`MỤC ĐÍCH TRANG: ${chain.title}`)
  })

  it("không chọn thì không thêm dòng nào", () => {
    expect(LANDING_WRITER_PROMPT_V1.build(base)).not.toContain("MỤC ĐÍCH TRANG")
  })

  it("mỗi loại trang có tiêu đề và mô tả để làm chỉ dẫn", () => {
    for (const o of LANDING_TYPE_OPTIONS) expect(o.title.length * o.subTitle.length).toBeGreaterThan(0)
  })
})
