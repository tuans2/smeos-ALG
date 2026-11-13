import { describe, expect, it, test } from "vitest"

import {
  AUDIO_TASK_SPECS,
  SELECTABLE_TTS_PROVIDERS,
  audioCostPlan,
  audioJobCreditCost,
  audioJobRefund,
  estimateSpeechSeconds,
  isOrgTrackId,
  orgTrackUuid,
  sniffAudioExtension,
  validateAudioTask,
} from "@/modules/audio-studio/domain/audio-task-rules"
import { MUSIC_CATALOG, suggestMusicTrack } from "@/modules/audio-studio/domain/music-catalog"
import { musicGenerationCredit } from "@/modules/audio-studio/domain/audio-pricing-guard"
import { costCreditForFeature } from "@/modules/usage/domain/pricing"

// Rà soát Khu vực C 24/09/2026: bốn loại tác vụ phải KHÁC nhau thật, credit
// trừ đúng bảng ước tính (quyết định PO), nhạc không âm thầm thay bài.

const sc = (i: number, voiceScript: string, targetDurationSeconds = 5) => ({ sceneIndex: i, voiceScript, targetDurationSeconds })

describe("AUDIO_TASK_SPECS", () => {
  test("bốn loại ra bốn kiểu kết quả", () => {
    expect(AUDIO_TASK_SPECS.VOICEOVER.output).toBe("voice_only")
    expect(AUDIO_TASK_SPECS.MUSIC_SELECT.output).toBe("music_only")
    expect(AUDIO_TASK_SPECS.AUDIO_MIX.output).toBe("voice_and_music")
    expect(AUDIO_TASK_SPECS.VOICE_CLONE.needsVoice).toBe(true)
    expect(AUDIO_TASK_SPECS.MUSIC_SELECT.needsVoice).toBe(false)
  })

  test("bản thương mại không cho chọn macOS say / Google chưa có worker", () => {
    expect(SELECTABLE_TTS_PROVIDERS).not.toContain("local_fallback")
    expect(SELECTABLE_TTS_PROVIDERS).not.toContain("google_cloud")
  })
})

describe("validateAudioTask", () => {
  test("VOICEOVER cần lời thoại", () => {
    expect(validateAudioTask({ taskType: "VOICEOVER", scenes: [sc(1, "  ")] }).scenes).toBeDefined()
    expect(validateAudioTask({ taskType: "VOICEOVER", scenes: [sc(1, "Xin chào")] })).toEqual({})
  })
  test("MUSIC_SELECT và AUDIO_MIX cần bài nhạc", () => {
    expect(validateAudioTask({ taskType: "MUSIC_SELECT", scenes: [] }).musicTrackId).toBeDefined()
    expect(validateAudioTask({ taskType: "MUSIC_SELECT", scenes: [], musicTrackId: "romantic-piano-melody" })).toEqual({})
    expect(validateAudioTask({ taskType: "AUDIO_MIX", scenes: [sc(1, "a")] }).musicTrackId).toBeDefined()
  })
  test("VOICE_CLONE cần giọng nhân bản, nhạc tuỳ chọn", () => {
    expect(validateAudioTask({ taskType: "VOICE_CLONE", scenes: [sc(1, "a")] }).voiceCloneId).toBeDefined()
    expect(validateAudioTask({ taskType: "VOICE_CLONE", scenes: [sc(1, "a")], voiceCloneId: "x" })).toEqual({})
  })
  test("lời thoại quá dài bị chặn", () => {
    expect(validateAudioTask({ taskType: "VOICEOVER", scenes: [sc(1, "a".repeat(601))] }).voiceScript).toBeDefined()
  })
})

describe("audioJobCreditCost — trừ đúng bảng ước tính", () => {
  const five = [1, 2, 3, 4, 5].map((i) => sc(i, `Cảnh ${i}`))
  test("OpenAI HD 5 cảnh = 10 (trước đây bị tính 1)", () => {
    expect(audioJobCreditCost({ taskType: "AUDIO_MIX", providerKey: "openai", qualityTier: "hd", scenes: five })).toBe(10)
  })
  test("OpenAI standard 5 cảnh = 5", () => {
    expect(audioJobCreditCost({ taskType: "VOICEOVER", providerKey: "openai", qualityTier: "standard", scenes: five })).toBe(5)
  })
  test("Edge TTS = 0 (trước đây vẫn bị trừ 1)", () => {
    expect(audioJobCreditCost({ taskType: "VOICEOVER", providerKey: "edge_tts", qualityTier: "standard", scenes: five })).toBe(0)
  })
  test("MUSIC_SELECT = 0", () => {
    expect(audioJobCreditCost({ taskType: "MUSIC_SELECT", providerKey: "openai", qualityTier: "hd", scenes: five })).toBe(0)
  })
  test("VOICE_CLONE tính theo ElevenLabs dù chọn nhà cung cấp khác", () => {
    expect(audioJobCreditCost({ taskType: "VOICE_CLONE", providerKey: "edge_tts", qualityTier: "premium", scenes: five })).toBe(15)
  })
  test("chỉ đếm cảnh có lời", () => {
    expect(
      audioJobCreditCost({ taskType: "VOICEOVER", providerKey: "openai", qualityTier: "hd", scenes: [sc(1, "a"), sc(2, "")] })
    ).toBe(2)
  })
  test("bảng giá có mục cho nhân bản giọng", () => {
    expect(costCreditForFeature("audio.voice_clone")).toBe(5)
  })
})

describe("nhạc & tệp", () => {
  test("mood không có bài thì không âm thầm trả guitar", () => {
    expect(suggestMusicTrack("luxury")).toBeUndefined()
  })
  test("mỗi bài hệ thống khai nguồn giấy phép", () => {
    for (const t of MUSIC_CATALOG) {
      expect(t.licenseSource.length).toBeGreaterThan(0)
      expect(typeof t.licenseVerified).toBe("boolean")
    }
  })
  test("mã bài tiệm tải", () => {
    expect(isOrgTrackId("org:abc")).toBe(true)
    expect(isOrgTrackId("romantic-piano-melody")).toBe(false)
    expect(orgTrackUuid("org:abc")).toBe("abc")
  })
  test("nhận diện tệp âm thanh bằng byte đầu", () => {
    const b = (s: string, pad = 12) => new Uint8Array([...s].map((c) => c.charCodeAt(0)).concat(Array(pad).fill(0)))
    expect(sniffAudioExtension(b("ID3"))).toBe("mp3")
    expect(sniffAudioExtension(new Uint8Array([0xff, 0xfb, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("mp3")
    expect(sniffAudioExtension(b("RIFF\0\0\0\0WAVE"))).toBe("wav")
    expect(sniffAudioExtension(b("\0\0\0\x20ftypM4A "))).toBe("m4a")
    expect(sniffAudioExtension(b("<html>"))).toBeNull()
  })
  test("ước lượng thời lượng đọc", () => {
    expect(estimateSpeechSeconds("")).toBe(0)
    expect(estimateSpeechSeconds("a".repeat(140))).toBeGreaterThan(9)
  })
})

describe("nhà cung cấp trước — nhạc AI + hoàn chênh (PO 25/09/2026)", () => {
  const scenes = [
    { sceneIndex: 1, voiceScript: "Xin chào", targetDurationSeconds: 4 },
    { sceneIndex: 2, voiceScript: "Đặt hoa", targetDurationSeconds: 4 },
  ]

  it("nhạc AI cộng credit theo mỗi 30 giây; bài thư viện 0", () => {
    expect(musicGenerationCredit("elevenlabs_music", 20)).toBe(2)
    expect(musicGenerationCredit("elevenlabs_music", 61)).toBe(6)
    expect(musicGenerationCredit(null, 60)).toBe(0)
    const base = audioJobCreditCost({ taskType: "AUDIO_MIX", providerKey: "openai", qualityTier: "standard", scenes })
    expect(
      audioJobCreditCost({ taskType: "AUDIO_MIX", providerKey: "openai", qualityTier: "standard", scenes, musicProvider: "elevenlabs_music", musicSeconds: 8 })
    ).toBe(base + 2)
    expect(audioJobCreditCost({ taskType: "VOICEOVER", providerKey: "openai", qualityTier: "standard", scenes, musicProvider: "elevenlabs_music" })).toBe(base)
    expect(audioJobCreditCost({ taskType: "MUSIC_SELECT", providerKey: "openai", qualityTier: "standard", scenes: [] })).toBe(0)
  })

  it("nhạc lùi thư viện → hoàn phần nhạc; giọng lùi bên rẻ hơn → hoàn chênh; không thu thêm", () => {
    const plan = audioCostPlan({
      taskType: "AUDIO_MIX",
      providerKey: "elevenlabs",
      qualityTier: "standard",
      scenes,
      musicProvider: "elevenlabs_music",
      musicSeconds: 8,
    })
    expect(plan.voiceCredit).toBe(4)
    expect(plan.musicCredit).toBe(2)
    expect(audioJobRefund(plan, { provider_used: "elevenlabs", music_provider_used: "elevenlabs_music", music_fallback: false })).toBe(0)
    expect(audioJobRefund(plan, { provider_used: "elevenlabs", music_provider_used: null, music_fallback: true })).toBe(2)
    expect(audioJobRefund(plan, { provider_used: "openai", music_provider_used: "elevenlabs_music" })).toBe(2)
    expect(audioJobRefund(plan, { provider_used: "edge_tts,openai", music_fallback: true })).toBe(2 + 2)
    const re = audioCostPlan({ taskType: "AUDIO_MIX", providerKey: "openai", qualityTier: "standard", scenes, musicProvider: null, musicSeconds: 8 })
    expect(audioJobRefund(re, { provider_used: "elevenlabs" })).toBe(0)
  })
})
