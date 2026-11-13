import { describe, expect, it } from "vitest"

import { CHANNEL_SPECS, channelSpec, describeChannelForPrompt } from "@/modules/content-engine/domain/channel-specs"
import { CHANNEL_TEXT_LIMITS, INSTAGRAM_MAX_HASHTAGS, PACKAGE_CHANNELS } from "@/modules/creative-production/domain/campaign-package-rules"

describe("CHANNEL_SPECS", () => {
  it("có đủ bốn kênh, khớp PACKAGE_CHANNELS", () => {
    expect(Object.keys(CHANNEL_SPECS).sort()).toEqual([...PACKAGE_CHANNELS].sort())
  })

  it("trần cứng khớp CHANNEL_TEXT_LIMITS — không lệch giữa hai nơi", () => {
    for (const ch of PACKAGE_CHANNELS) {
      expect(CHANNEL_SPECS[ch].maxChars).toBe(CHANNEL_TEXT_LIMITS[ch])
    }
  })

  it("trần hashtag Instagram khớp INSTAGRAM_MAX_HASHTAGS", () => {
    expect(CHANNEL_SPECS.instagram.hashtagRange[1]).toBe(INSTAGRAM_MAX_HASHTAGS)
  })

  it("khoảng độ dài khuyến nghị nằm trong trần cứng", () => {
    for (const ch of PACKAGE_CHANNELS) {
      const s = CHANNEL_SPECS[ch]
      expect(s.targetCharsRange[0]).toBeLessThanOrEqual(s.targetCharsRange[1])
      expect(s.targetCharsRange[1]).toBeLessThanOrEqual(s.maxChars)
    }
  })

  it("channelSpec trả đúng theo kênh", () => {
    expect(channelSpec("tiktok").channel).toBe("tiktok")
  })

  it("describeChannelForPrompt: zalo không hashtag, kênh khác có khoảng hashtag", () => {
    expect(describeChannelForPrompt("zalo")).toMatch(/không dùng hashtag/)
    expect(describeChannelForPrompt("facebook")).toMatch(/hashtag/)
    expect(describeChannelForPrompt("instagram")).toMatch(/15–30 hashtag/)
  })
})
