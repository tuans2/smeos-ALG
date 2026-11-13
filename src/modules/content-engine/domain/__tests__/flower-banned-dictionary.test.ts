import { describe, it, expect } from "vitest"
import {
  FLOWER_BANNED_PHRASES,
  findBannedPhrases,
  sanitizeFlowerText,
} from "../flower-banned-dictionary"

describe("Flower Banned Dictionary (SocialFlow M07)", () => {
  it("should contain essential prohibited flower phrases", () => {
    expect(FLOWER_BANNED_PHRASES).toContain("hoa vĩnh cửu")
    expect(FLOWER_BANNED_PHRASES).toContain("tóm lại")
    expect(FLOWER_BANNED_PHRASES).toContain("xả kho lỗ vốn")
  })

  it("should detect banned phrases in content", () => {
    const text = "Mẫu hoa tươi tuyệt đẹp, cam kết hoa vĩnh cửu không bao giờ tàn và xả kho lỗ vốn hôm nay!"
    const banned = findBannedPhrases(text)
    expect(banned).toContain("hoa vĩnh cửu")
    expect(banned).toContain("không bao giờ tàn")
    expect(banned).toContain("xả kho lỗ vốn")
  })

  it("should sanitize and remove banned phrases from content", () => {
    const text = "Hoa hồng Ecuador xả kho lỗ vốn cho dịp sinh nhật"
    const cleaned = sanitizeFlowerText(text)
    expect(cleaned).not.toContain("xả kho lỗ vốn")
    expect(cleaned).toContain("Hoa hồng Ecuador")
    expect(cleaned).toContain("sinh nhật")
  })
})
