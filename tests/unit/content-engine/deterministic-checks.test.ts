import { describe, expect, it } from "vitest"

import {
  checkBannedWords,
  checkClaimsOutsideFacts,
  checkHashtags,
  checkLength,
  runDeterministicChecks,
} from "@/modules/content-engine/domain/deterministic-checks"
import type { BriefFact, ContentBrief } from "@/modules/content-engine/contracts/brief"

const facts: BriefFact[] = [{ factId: "F1", category: "product", text: "Bó hoa hồng đỏ 20 cành" }]
const briefNoOffer: Pick<ContentBrief, "facts" | "rules"> = {
  facts,
  rules: { bannedPhraseCount: 24, forbiddenStyles: ["chợ búa"], factsOnlyNotice: "Chỉ được nói những gì có trong facts[]. Không tự thêm khuyến mãi, freeship, quà tặng, cam kết hay giá không có ở đây." },
}
const briefWithOffer: Pick<ContentBrief, "facts" | "rules"> = {
  facts: [...facts, { factId: "F2", category: "offer", text: "Tặng kèm thiệp" }],
  rules: briefNoOffer.rules,
}

describe("checkLength", () => {
  it("trong khoảng khuyến nghị: không lỗi", () => {
    expect(checkLength("a".repeat(500), "facebook")).toEqual([])
  })
  it("vượt trần cứng: REJECTED", () => {
    const issues = checkLength("a".repeat(70000), "facebook")
    expect(issues[0]?.severity).toBe("REJECTED")
    expect(issues[0]?.code).toBe("LENGTH_OVER_HARD_CAP")
  })
  it("ngắn hơn khoảng khuyến nghị: NEEDS_REVIEW", () => {
    const issues = checkLength("ngắn quá", "facebook")
    expect(issues[0]?.severity).toBe("NEEDS_REVIEW")
    expect(issues[0]?.code).toBe("LENGTH_OUTSIDE_TARGET")
  })
})

describe("checkHashtags", () => {
  it("instagram vượt 30 hashtag: REJECTED", () => {
    const tags = Array.from({ length: 31 }, (_, i) => `#tag${i}`)
    const issues = checkHashtags(tags, "instagram")
    expect(issues.some((i) => i.code === "HASHTAG_OVER_HARD_CAP" && i.severity === "REJECTED")).toBe(true)
  })
  it("zalo có hashtag: NEEDS_REVIEW (khoảng khuyến nghị là 0)", () => {
    const issues = checkHashtags(["#hoatuoi"], "zalo")
    expect(issues.some((i) => i.code === "HASHTAG_OUTSIDE_TARGET")).toBe(true)
  })
  it("facebook trong khoảng 4-6: không lỗi", () => {
    expect(checkHashtags(["#a", "#b", "#c", "#d"], "facebook")).toEqual([])
  })
})

describe("checkBannedWords", () => {
  it("bắt từ cấm ngành hoa cứng (hoa vĩnh cửu)", () => {
    const issues = checkBannedWords("Bó hoa vĩnh cửu không bao giờ tàn", [])
    expect(issues.some((i) => i.severity === "REJECTED")).toBe(true)
  })
  it("bắt phong cách cấm riêng của tiệm", () => {
    const issues = checkBannedWords("Xả kho lỗ vốn", ["xả kho lỗ vốn"])
    expect(issues.some((i) => i.severity === "REJECTED")).toBe(true)
  })
  it("văn bản sạch: không lỗi", () => {
    expect(checkBannedWords("Bó hoa hồng đỏ tươi thắm cho ngày đặc biệt", [])).toEqual([])
  })
})

describe("checkClaimsOutsideFacts", () => {
  it("nhắc freeship mà facts không có mục offer: REJECTED", () => {
    const issues = checkClaimsOutsideFacts("Đặt ngay freeship toàn quốc", facts)
    expect(issues[0]?.severity).toBe("REJECTED")
    expect(issues[0]?.code).toBe("CLAIM_OUTSIDE_FACTS")
  })
  it("nhắc khuyến mãi mà facts CÓ mục offer: không lỗi", () => {
    expect(checkClaimsOutsideFacts("Tặng kèm thiệp thiết kế riêng", briefWithOffer.facts)).toEqual([])
  })
  it("không nhắc gì tới ưu đãi: không lỗi dù không có fact offer", () => {
    expect(checkClaimsOutsideFacts("Bó hoa hồng đỏ dành tặng người thương", facts)).toEqual([])
  })
})

describe("runDeterministicChecks", () => {
  it("tổng hợp: bịa freeship mà không có fact offer → ok=false", () => {
    const result = runDeterministicChecks({
      text: "Đặt ngay freeship toàn quốc, mua hoa hồng đỏ ngay hôm nay",
      hashtags: ["#a", "#b", "#c", "#d"],
      channel: "facebook",
      brief: briefNoOffer,
    })
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.code === "CLAIM_OUTSIDE_FACTS")).toBe(true)
  })

  it("tổng hợp: bài sạch, có fact offer đúng chỗ → ok=true", () => {
    const result = runDeterministicChecks({
      text: "Tặng kèm thiệp thiết kế riêng khi đặt bó hoa hồng đỏ hôm nay, chọn ngay mẫu yêu thích.",
      hashtags: ["#a", "#b", "#c", "#d"],
      channel: "facebook",
      brief: briefWithOffer,
    })
    expect(result.ok).toBe(true)
  })
})
