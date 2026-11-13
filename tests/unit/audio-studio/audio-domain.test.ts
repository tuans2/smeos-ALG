/**
 * Unit Tests — Audio Studio Domain Layer.
 *
 * Kiểm tra:
 * - Voice catalog SSOT lookup
 * - Music catalog mood-based selection
 * - Audio pricing guard credit calculation
 * - Provider voice code resolution
 * - Mode-aware voice suggestion
 */

import { describe, test, expect } from "vitest"

// Voice catalog
import {
  VOICE_CATALOG,
  getVoiceSpec,
  resolveProviderVoiceCode,
  filterVoicesByGender,
  filterVoicesByStyle,
  isVoiceSupportedByProvider,
  suggestVoiceForMode,
} from "@/modules/audio-studio/domain/voice-catalog"

// Music catalog
import {
  MUSIC_CATALOG,
  getMusicTrack,
  filterTracksByMood,
  filterTracksForMode,
  suggestMusicTrack,
  suggestMoodForTopicAngle,
  migrateLegacyTrackName,
} from "@/modules/audio-studio/domain/music-catalog"

// Pricing guard
import {
  calculateAudioCreditCost,
  findCheapestProvider,
} from "@/modules/audio-studio/domain/audio-pricing-guard"

// ============================================================
// VOICE CATALOG TESTS
// ============================================================

describe("Voice Catalog — SSOT", () => {
  test("có ít nhất 6 giọng đọc trong catalog", () => {
    expect(VOICE_CATALOG.length).toBeGreaterThanOrEqual(6)
  })

  test("mỗi giọng có voiceId duy nhất", () => {
    const ids = VOICE_CATALOG.map((v) => v.voiceId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("mỗi giọng có providerVoiceMap với ít nhất 2 provider", () => {
    for (const voice of VOICE_CATALOG) {
      const providerCount = Object.keys(voice.providerVoiceMap).length
      expect(providerCount).toBeGreaterThanOrEqual(2)
    }
  })

  test("getVoiceSpec trả đúng giọng theo voiceId", () => {
    const spec = getVoiceSpec("flora-nu-truyen-cam")
    expect(spec.displayName).toBe("Flora Nữ Truyền Cảm")
    expect(spec.gender).toBe("female")
    expect(spec.style).toBe("warm")
  })

  test("getVoiceSpec trả mặc định khi voiceId không tồn tại", () => {
    const spec = getVoiceSpec("khong-ton-tai")
    expect(spec.voiceId).toBe("flora-nu-truyen-cam")
  })

  test("resolveProviderVoiceCode trả mã giọng đúng provider", () => {
    expect(resolveProviderVoiceCode("flora-nu-truyen-cam", "openai")).toBe("nova")
    expect(resolveProviderVoiceCode("flora-nam-am-ap", "openai")).toBe("onyx")
    expect(resolveProviderVoiceCode("flora-nu-tre-trung", "elevenlabs")).toBe("Bella")
  })

  test("filterVoicesByGender lọc đúng giới tính", () => {
    const females = filterVoicesByGender("female")
    const males = filterVoicesByGender("male")
    expect(females.length).toBeGreaterThanOrEqual(3)
    expect(males.length).toBeGreaterThanOrEqual(3)
    expect(females.every((v) => v.gender === "female")).toBe(true)
    expect(males.every((v) => v.gender === "male")).toBe(true)
  })

  test("filterVoicesByStyle lọc đúng phong cách", () => {
    const warm = filterVoicesByStyle("warm")
    expect(warm.length).toBeGreaterThanOrEqual(2)
    expect(warm.every((v) => v.style === "warm")).toBe(true)
  })

  test("isVoiceSupportedByProvider kiểm tra đúng", () => {
    expect(isVoiceSupportedByProvider("flora-nu-truyen-cam", "openai")).toBe(true)
    expect(isVoiceSupportedByProvider("flora-nu-truyen-cam", "elevenlabs")).toBe(true)
  })

  test("suggestVoiceForMode AUTHENTIC → giọng ấm", () => {
    const voice = suggestVoiceForMode("AUTHENTIC", "female")
    expect(["warm", "storytelling"]).toContain(voice.style)
  })

  test("suggestVoiceForMode CREATIVE → giọng năng động", () => {
    const voice = suggestVoiceForMode("CREATIVE", "female")
    expect(["energetic", "professional"]).toContain(voice.style)
  })
})

// ============================================================
// MUSIC CATALOG TESTS
// ============================================================

describe("Music Catalog — SSOT", () => {
  test("có ít nhất 4 track nhạc nền", () => {
    expect(MUSIC_CATALOG.length).toBeGreaterThanOrEqual(4)
  })

  test("mỗi track có trackId duy nhất", () => {
    const ids = MUSIC_CATALOG.map((t) => t.trackId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("getMusicTrack tìm đúng track", () => {
    const track = getMusicTrack("acoustic-warm-guitar")
    expect(track).toBeDefined()
    expect(track!.displayName).toBe("Acoustic Warm Guitar")
    expect(track!.mood).toBe("warm")
  })

  test("getMusicTrack trả undefined khi không tìm thấy", () => {
    expect(getMusicTrack("khong-ton-tai")).toBeUndefined()
  })

  test("filterTracksByMood lọc đúng mood", () => {
    const warm = filterTracksByMood("warm")
    expect(warm.length).toBeGreaterThanOrEqual(1)
    expect(warm.every((t) => t.mood === "warm")).toBe(true)
  })

  test("filterTracksByMood('none') trả mảng rỗng", () => {
    expect(filterTracksByMood("none")).toHaveLength(0)
  })

  test("filterTracksForMode AUTHENTIC bao gồm acoustic guitar", () => {
    const tracks = filterTracksForMode("AUTHENTIC")
    expect(tracks.some((t) => t.trackId === "acoustic-warm-guitar")).toBe(true)
  })

  test("filterTracksForMode CREATIVE bao gồm upbeat pop", () => {
    const tracks = filterTracksForMode("CREATIVE")
    expect(tracks.some((t) => t.trackId === "upbeat-cheerful-pop")).toBe(true)
  })

  test("suggestMusicTrack trả track phù hợp mood", () => {
    const romantic = suggestMusicTrack("romantic")
    expect(romantic).toBeDefined()
    expect(romantic!.mood).toBe("romantic")
  })

  test("suggestMoodForTopicAngle ánh xạ đúng", () => {
    expect(suggestMoodForTopicAngle("EMOTIONAL")).toBe("romantic")
    expect(suggestMoodForTopicAngle("TREND")).toBe("upbeat")
    expect(suggestMoodForTopicAngle("PRODUCT_SHOWCASE")).toBe("warm")
    expect(suggestMoodForTopicAngle("EDUCATIONAL")).toBe("chill")
  })

  test("migrateLegacyTrackName ánh xạ tên cũ → trackId mới", () => {
    expect(migrateLegacyTrackName("Acoustic Warm Guitar")).toBe("acoustic-warm-guitar")
    expect(migrateLegacyTrackName("Upbeat Cheerful Pop")).toBe("upbeat-cheerful-pop")
    expect(migrateLegacyTrackName("Không tồn tại")).toBeUndefined()
  })
})

// ============================================================
// PRICING GUARD TESTS
// ============================================================

describe("Audio Pricing Guard", () => {
  test("OpenAI standard: 1 credit/scene", () => {
    const est = calculateAudioCreditCost({
      taskType: "VOICEOVER",
      provider: "openai",
      qualityTier: "standard",
      sceneCount: 5,
    })
    expect(est.totalCredits).toBe(5)
    expect(est.voiceCredits).toBe(5)
    expect(est.musicCredits).toBe(0)
    expect(est.appliedRule.creditPerScene).toBe(1)
  })

  test("OpenAI HD: 2 credits/scene", () => {
    const est = calculateAudioCreditCost({
      taskType: "VOICEOVER",
      provider: "openai",
      qualityTier: "hd",
      sceneCount: 5,
    })
    expect(est.totalCredits).toBe(10)
  })

  test("ElevenLabs premium: 3 credits/scene, cap 30", () => {
    const est = calculateAudioCreditCost({
      taskType: "VOICEOVER",
      provider: "elevenlabs",
      qualityTier: "premium",
      sceneCount: 15,
    })
    expect(est.totalCredits).toBe(30) // capped
  })

  test("Edge TTS: 0 credit (miễn phí)", () => {
    const est = calculateAudioCreditCost({
      taskType: "VOICEOVER",
      provider: "edge_tts",
      qualityTier: "standard",
      sceneCount: 10,
    })
    expect(est.totalCredits).toBe(0)
  })

  test("Local fallback: 0 credit", () => {
    const est = calculateAudioCreditCost({
      taskType: "VOICEOVER",
      provider: "local_fallback",
      qualityTier: "standard",
      sceneCount: 5,
    })
    expect(est.totalCredits).toBe(0)
  })

  test("MUSIC_SELECT luôn 0 credit", () => {
    const est = calculateAudioCreditCost({
      taskType: "MUSIC_SELECT",
      provider: "openai",
      qualityTier: "hd",
      sceneCount: 10,
    })
    expect(est.totalCredits).toBe(0)
  })

  test("findCheapestProvider chọn local_fallback hoặc edge_tts", () => {
    const cheapest = findCheapestProvider(5)
    expect(cheapest.totalCredits).toBe(0)
    expect(["local_fallback", "edge_tts"]).toContain(cheapest.provider)
  })
})
