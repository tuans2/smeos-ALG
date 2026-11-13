/**
 * Voice Catalog — SSOT danh mục giọng đọc cho Audio Studio.
 *
 * Mỗi giọng ánh xạ sang mã giọng cụ thể của từng nhà cung cấp TTS.
 * Khi thêm provider mới (ElevenLabs, MiniMax...), chỉ cần bổ sung
 * vào `providerVoiceMap` mà không sửa logic gọi.
 *
 * Thuần TypeScript — Zero external dependencies.
 */

import type { VoiceSpec, TtsProviderKey } from "./audio-types"

// ============================================================
// SSOT VOICE CATALOG
// ============================================================

export const VOICE_CATALOG: readonly VoiceSpec[] = [
  // ── Nữ ──
  {
    voiceId: "flora-nu-truyen-cam",
    displayName: "Flora Nữ Truyền Cảm",
    gender: "female",
    style: "warm",
    defaultProvider: "openai",
    providerVoiceMap: {
      openai: "nova",
      elevenlabs: "Rachel",
      minimax: "Vietnamese_Female_Warm",
      edge_tts: "vi-VN-HoaiMyNeural",
      google_cloud: "vi-VN-Wavenet-A",
      local_fallback: "Samantha",
    },
    language: "vi-VN",
    description: "Giọng nữ truyền cảm, ấm áp, phù hợp storytelling lãng mạn và mô tả sản phẩm cao cấp",
  },
  {
    voiceId: "flora-nu-tre-trung",
    displayName: "Flora Nữ Trẻ Trung",
    gender: "female",
    style: "energetic",
    defaultProvider: "openai",
    providerVoiceMap: {
      openai: "shimmer",
      elevenlabs: "Bella",
      minimax: "Vietnamese_Female_Young",
      edge_tts: "vi-VN-HoaiMyNeural",
      google_cloud: "vi-VN-Wavenet-A",
      local_fallback: "Samantha",
    },
    language: "vi-VN",
    description: "Giọng nữ trẻ trung, năng động, phù hợp TikTok, Reels và nội dung trend",
  },
  {
    voiceId: "flora-nu-chuyen-nghiep",
    displayName: "Flora Nữ Chuyên Nghiệp",
    gender: "female",
    style: "professional",
    defaultProvider: "openai",
    providerVoiceMap: {
      openai: "alloy",
      elevenlabs: "Elli",
      minimax: "Vietnamese_Female_Pro",
      edge_tts: "vi-VN-HoaiMyNeural",
      google_cloud: "vi-VN-Wavenet-A",
      local_fallback: "Samantha",
    },
    language: "vi-VN",
    description: "Giọng nữ chuyên nghiệp, rõ ràng, phù hợp giới thiệu doanh nghiệp và quảng cáo",
  },
  // ── Nam ──
  {
    voiceId: "flora-nam-am-ap",
    displayName: "Flora Nam Ấm Áp",
    gender: "male",
    style: "warm",
    defaultProvider: "openai",
    providerVoiceMap: {
      openai: "onyx",
      elevenlabs: "Adam",
      minimax: "Vietnamese_Male_Warm",
      edge_tts: "vi-VN-NamMinhNeural",
      google_cloud: "vi-VN-Wavenet-B",
      local_fallback: "Daniel",
    },
    language: "vi-VN",
    description: "Giọng nam ấm áp, trầm ấm, phù hợp storytelling cảm xúc và quà tặng",
  },
  {
    voiceId: "flora-nam-nang-dong",
    displayName: "Flora Nam Năng Động",
    gender: "male",
    style: "energetic",
    defaultProvider: "openai",
    providerVoiceMap: {
      openai: "echo",
      elevenlabs: "Antoni",
      minimax: "Vietnamese_Male_Young",
      edge_tts: "vi-VN-NamMinhNeural",
      google_cloud: "vi-VN-Wavenet-D",
      local_fallback: "Daniel",
    },
    language: "vi-VN",
    description: "Giọng nam năng động, tự tin, phù hợp review sản phẩm và nội dung viral",
  },
  {
    voiceId: "flora-nam-ke-chuyen",
    displayName: "Flora Nam Kể Chuyện",
    gender: "male",
    style: "storytelling",
    defaultProvider: "openai",
    providerVoiceMap: {
      openai: "fable",
      elevenlabs: "Josh",
      minimax: "Vietnamese_Male_Story",
      edge_tts: "vi-VN-NamMinhNeural",
      google_cloud: "vi-VN-Wavenet-B",
      local_fallback: "Daniel",
    },
    language: "vi-VN",
    description: "Giọng nam kể chuyện, cuốn hút, phù hợp narrative video và brand story",
  },
] as const

// ============================================================
// LOOKUP UTILITIES
// ============================================================

/**
 * Tìm VoiceSpec theo voiceId.
 * Trả mặc định "flora-nu-truyen-cam" nếu không tìm thấy.
 */
export function getVoiceSpec(voiceId: string): VoiceSpec {
  return (
    VOICE_CATALOG.find((v) => v.voiceId === voiceId) ??
    VOICE_CATALOG[0]!
  )
}

/**
 * Lấy mã giọng thực tế của provider cụ thể.
 * Ưu tiên: providerVoiceMap[provider] → providerVoiceMap[defaultProvider] → "nova"
 */
export function resolveProviderVoiceCode(
  voiceId: string,
  provider: TtsProviderKey
): string {
  const spec = getVoiceSpec(voiceId)
  return (
    spec.providerVoiceMap[provider] ??
    spec.providerVoiceMap[spec.defaultProvider] ??
    "nova"
  )
}

/**
 * Lọc danh sách giọng theo giới tính.
 */
export function filterVoicesByGender(gender: "female" | "male"): readonly VoiceSpec[] {
  return VOICE_CATALOG.filter((v) => v.gender === gender)
}

/**
 * Lọc danh sách giọng theo phong cách.
 */
export function filterVoicesByStyle(style: VoiceSpec["style"]): readonly VoiceSpec[] {
  return VOICE_CATALOG.filter((v) => v.style === style)
}

/**
 * Kiểm tra provider có hỗ trợ giọng cụ thể không.
 */
export function isVoiceSupportedByProvider(
  voiceId: string,
  provider: TtsProviderKey
): boolean {
  const spec = getVoiceSpec(voiceId)
  return provider in spec.providerVoiceMap
}

/**
 * Gợi ý giọng đọc phù hợp theo ProductionMode.
 * AUTHENTIC: giọng ấm, kể chuyện, chậm rãi
 * CREATIVE: giọng năng động, trẻ trung, tiết tấu nhanh
 */
export function suggestVoiceForMode(
  mode: "AUTHENTIC" | "CREATIVE",
  preferredGender?: "female" | "male"
): VoiceSpec {
  const gender = preferredGender ?? "female"

  if (mode === "AUTHENTIC") {
    return (
      VOICE_CATALOG.find(
        (v) => v.gender === gender && (v.style === "warm" || v.style === "storytelling")
      ) ?? VOICE_CATALOG[0]!
    )
  }

  // CREATIVE
  return (
    VOICE_CATALOG.find(
      (v) => v.gender === gender && (v.style === "energetic" || v.style === "professional")
    ) ?? VOICE_CATALOG[0]!
  )
}
