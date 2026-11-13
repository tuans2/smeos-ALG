/**
 * Audio Pricing Guard — Tính chi phí credit cho công việc âm thanh.
 *
 * Thuần TypeScript — Zero external dependencies.
 */

import type {
  AudioTaskType,
  TtsProviderKey,
  AudioQualityTier,
} from "./audio-types"

// ============================================================
// PRICING TABLE
// ============================================================

interface AudioPricingRule {
  readonly provider: TtsProviderKey
  readonly qualityTier: AudioQualityTier
  /** Credit cơ bản cho mỗi lần gọi TTS (1 scene) */
  readonly creditPerScene: number
  /** Credit tối đa cho 1 job (cap) */
  readonly maxCreditPerJob: number
}

const PRICING_RULES: readonly AudioPricingRule[] = [
  // OpenAI TTS
  { provider: "openai", qualityTier: "standard", creditPerScene: 1, maxCreditPerJob: 10 },
  { provider: "openai", qualityTier: "hd", creditPerScene: 2, maxCreditPerJob: 20 },

  // ElevenLabs
  { provider: "elevenlabs", qualityTier: "standard", creditPerScene: 2, maxCreditPerJob: 20 },
  { provider: "elevenlabs", qualityTier: "premium", creditPerScene: 3, maxCreditPerJob: 30 },

  // MiniMax
  { provider: "minimax", qualityTier: "standard", creditPerScene: 1, maxCreditPerJob: 10 },
  { provider: "minimax", qualityTier: "premium", creditPerScene: 2, maxCreditPerJob: 20 },

  // Edge TTS (miễn phí)
  { provider: "edge_tts", qualityTier: "standard", creditPerScene: 0, maxCreditPerJob: 0 },

  // Google Cloud
  { provider: "google_cloud", qualityTier: "standard", creditPerScene: 1, maxCreditPerJob: 10 },
  { provider: "google_cloud", qualityTier: "hd", creditPerScene: 2, maxCreditPerJob: 20 },

  // Local fallback (miễn phí)
  { provider: "local_fallback", qualityTier: "standard", creditPerScene: 0, maxCreditPerJob: 0 },
]

// ============================================================
// PRICING CALCULATION
// ============================================================

export interface AudioCreditEstimate {
  /** Tổng credit cho job */
  readonly totalCredits: number
  /** Credit cho voice */
  readonly voiceCredits: number
  /** Credit cho music (luôn 0 — nhạc bản quyền miễn phí) */
  readonly musicCredits: number
  /** Credit cho mixing (luôn 0) */
  readonly mixingCredits: number
  /** Chi tiết bảng giá đã áp dụng */
  readonly appliedRule: {
    readonly provider: TtsProviderKey
    readonly qualityTier: AudioQualityTier
    readonly creditPerScene: number
  }
}

export function calculateAudioCreditCost(params: {
  taskType: AudioTaskType
  provider: TtsProviderKey
  qualityTier: AudioQualityTier
  sceneCount: number
}): AudioCreditEstimate {
  // Music selection & mixing luôn miễn phí
  if (params.taskType === "MUSIC_SELECT") {
    return {
      totalCredits: 0,
      voiceCredits: 0,
      musicCredits: 0,
      mixingCredits: 0,
      appliedRule: {
        provider: params.provider,
        qualityTier: params.qualityTier,
        creditPerScene: 0,
      },
    }
  }

  const rule = PRICING_RULES.find(
    (r) =>
      r.provider === params.provider &&
      r.qualityTier === params.qualityTier
  )

  // Fallback: nếu không tìm thấy rule cụ thể, dùng standard của provider
  const fallbackRule = PRICING_RULES.find(
    (r) => r.provider === params.provider && r.qualityTier === "standard"
  )

  const appliedRule = rule ?? fallbackRule ?? {
    provider: params.provider,
    qualityTier: params.qualityTier,
    creditPerScene: 1,
    maxCreditPerJob: 10,
  }

  const voiceCredits = Math.min(
    params.sceneCount * appliedRule.creditPerScene,
    appliedRule.maxCreditPerJob
  )

  return {
    totalCredits: voiceCredits,
    voiceCredits,
    musicCredits: 0,
    mixingCredits: 0,
    appliedRule: {
      provider: appliedRule.provider,
      qualityTier: appliedRule.qualityTier,
      creditPerScene: appliedRule.creditPerScene,
    },
  }
}

/**
 * Kiểm tra provider nào có chi phí thấp nhất cho cùng 1 job.
 * Dùng để auto-select provider khi user không chỉ định.
 */
export function findCheapestProvider(
  sceneCount: number,
  qualityTier: AudioQualityTier = "standard"
): { provider: TtsProviderKey; totalCredits: number } {
  const providers: TtsProviderKey[] = [
    "local_fallback",
    "edge_tts",
    "openai",
    "minimax",
    "google_cloud",
    "elevenlabs",
  ]

  let cheapest = { provider: "openai" as TtsProviderKey, totalCredits: Infinity }

  for (const provider of providers) {
    const estimate = calculateAudioCreditCost({
      taskType: "VOICEOVER",
      provider,
      qualityTier,
      sceneCount,
    })
    if (estimate.totalCredits < cheapest.totalCredits) {
      cheapest = { provider, totalCredits: estimate.totalCredits }
    }
  }

  return cheapest
}

// ============================================================
// NHẠC NỀN DO NHÀ CUNG CẤP SINH (PO 25/09/2026)
// ============================================================

/**
 * Credit sinh nhạc nền theo mỗi 30 giây (làm tròn lên), theo TỶ LỆ giá công
 * bố của nhà cung cấp — bảng giá v1, chưa đối chiếu hoá đơn (nợ #161). Bài
 * thư viện / bài tiệm tự tải vẫn 0 credit.
 */
export const MUSIC_GENERATION_CREDIT_PER_30S: Readonly<Record<string, number>> = {
  elevenlabs_music: 2,
}

export function musicGenerationCredit(provider: string | null | undefined, seconds: number): number {
  if (!provider) return 0
  const per = MUSIC_GENERATION_CREDIT_PER_30S[provider] ?? 0
  return per * Math.max(1, Math.ceil(Math.max(0, seconds) / 30))
}
