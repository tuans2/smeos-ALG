/**
 * Domain Types: Audio Studio — Xưởng Sản xuất Âm thanh Độc lập.
 *
 * Tách riêng khỏi Video Studio để:
 * - Gọi voice cho ảnh, bài post, video, hoặc bất kỳ mục đích nào
 * - Nâng cấp TTS provider (OpenAI, ElevenLabs, MiniMax, Edge TTS) độc lập
 * - Phối nhạc nền + voice + ducking cho mọi loại media
 *
 * Thuần TypeScript — Zero external dependencies.
 */

// ============================================================
// 1. ENUMS & CONSTANTS
// ============================================================

/** Loại công việc âm thanh */
export type AudioTaskType =
  | "VOICEOVER"          // Sinh giọng đọc (TTS) từ script
  | "MUSIC_SELECT"       // Chọn nhạc nền theo mood
  | "AUDIO_MIX"          // Phối trộn voice + BGM + ducking
  | "VOICE_CLONE"        // Đọc bằng giọng nhân bản của chủ tiệm (ElevenLabs IVC, 24/09/2026)

/** Nhà cung cấp TTS */
export type TtsProviderKey =
  | "openai"             // OpenAI TTS (tts-1 / tts-1-hd)
  | "elevenlabs"         // ElevenLabs (multilingual_v2)
  | "minimax"            // MiniMax TTS
  | "edge_tts"           // Microsoft Edge TTS (miễn phí)
  | "google_cloud"       // Google Cloud Text-to-Speech
  | "local_fallback"     // macOS `say` — CHỈ thử nghiệm, không nằm trong chuỗi lùi tự động (24/09/2026)

/** Trạng thái job âm thanh */
export type AudioJobStage =
  | "DRAFT"
  | "GENERATING"
  | "COMPLETED"
  | "FAILED"

/** Chất lượng âm thanh */
export type AudioQualityTier =
  | "standard"           // tts-1 (nhanh, đủ dùng)
  | "hd"                 // tts-1-hd (chất lượng cao)
  | "premium"            // ElevenLabs / MiniMax (studio-grade)

/** Mood nhạc nền */
export type MusicMood =
  | "romantic"           // Piano nhẹ nhàng, lãng mạn
  | "upbeat"             // Pop, năng động, vui tươi
  | "chill"              // Lo-Fi, thư giãn
  | "warm"               // Acoustic Guitar, ấm áp
  | "luxury"             // Orchestral, sang trọng
  | "none"               // Không nhạc nền

// ============================================================
// 2. VOICE SPEC — Đặc tả giọng đọc
// ============================================================

export interface VoiceSpec {
  /** Mã giọng nội bộ (SSOT key) */
  readonly voiceId: string
  /** Tên hiển thị tiếng Việt */
  readonly displayName: string
  /** Giới tính */
  readonly gender: "female" | "male"
  /** Phong cách */
  readonly style: "warm" | "energetic" | "calm" | "professional" | "storytelling"
  /** Nhà cung cấp mặc định */
  readonly defaultProvider: TtsProviderKey
  /** Mã giọng từng provider */
  readonly providerVoiceMap: Partial<Record<TtsProviderKey, string>>
  /** Ngôn ngữ */
  readonly language: "vi-VN" | "en-US"
  /** Mô tả ngắn */
  readonly description: string
}

// ============================================================
// 3. MUSIC SPEC — Đặc tả nhạc nền
// ============================================================

export interface MusicTrackSpec {
  /** Mã track nội bộ */
  readonly trackId: string
  /** Tên hiển thị */
  readonly displayName: string
  /** Mood */
  readonly mood: MusicMood
  /** Thời lượng (giây) */
  readonly durationSeconds: number
  /** Tên file trong assets/music/ */
  readonly filename: string
  /** Bản quyền */
  readonly license: "royalty_free" | "creative_commons" | "original" | "licensed"
  /** Nguồn / nơi mua / đường dẫn giấy phép (24/09/2026). Bản thương mại chỉ
   *  phát bài có hồ sơ nguồn; thiếu thì `licenseVerified = false`. */
  readonly licenseSource: string
  /** Đã có giấy phép thương mại được kiểm tra (người vận hành xác nhận). */
  readonly licenseVerified: boolean
  /** Phù hợp với ProductionMode */
  readonly suitableFor: ("AUTHENTIC" | "CREATIVE")[]
}

// ============================================================
// 4. AUDIO JOB — Thực thể công việc
// ============================================================

export interface AudioSceneInput {
  /** Chỉ số cảnh (1-indexed) */
  readonly sceneIndex: number
  /** Script giọng đọc cho cảnh này */
  readonly voiceScript: string
  /** Thời lượng mục tiêu (giây) */
  readonly targetDurationSeconds: number
}

export interface AudioJobInput {
  /** ID tổ chức (tenant isolation) */
  readonly organizationId: string
  /** Loại công việc */
  readonly taskType: AudioTaskType
  /** Danh sách cảnh cần sinh voice */
  readonly scenes: readonly AudioSceneInput[]
  /** Tổng thời lượng mục tiêu */
  readonly totalDurationSeconds: number
  /** Giọng đọc đã chọn */
  readonly voiceId: string
  /** Nhà cung cấp TTS (hoặc để auto-select) */
  readonly providerKey?: TtsProviderKey | undefined
  /** Chất lượng */
  readonly qualityTier?: AudioQualityTier | undefined
  /** Nhạc nền */
  readonly musicTrackId?: string | undefined
  /** Mood nhạc nền (nếu không chọn track cụ thể, sẽ auto-select) */
  readonly musicMood?: MusicMood | undefined
  /** Tỷ lệ âm lượng voice (0.0 - 1.0, mặc định 1.0) */
  readonly voiceVolume?: number | undefined
  /** Tỷ lệ âm lượng BGM khi có voice (ducking, mặc định 0.22) */
  readonly bgmDuckingVolume?: number | undefined
  /** Tỷ lệ âm lượng BGM khi không có voice (mặc định 0.65) */
  readonly bgmNormalVolume?: number | undefined
}

export interface AudioSceneOutput {
  /** Chỉ số cảnh */
  readonly sceneIndex: number
  /** URL file voice riêng lẻ (.mp3) */
  readonly voiceUrl: string | null
  /** Storage key */
  readonly voiceStorageKey: string | null
  /** Thời lượng thực tế voice (giây) */
  readonly actualDurationSeconds: number
}

export interface AudioJobOutput {
  /** ID job */
  readonly jobId: string
  /** Trạng thái */
  readonly status: "COMPLETED" | "FAILED"
  /** URL file âm thanh hoàn chỉnh (voice + BGM đã phối) */
  readonly mixedAudioUrl: string | null
  /** Storage key file hoàn chỉnh */
  readonly mixedAudioStorageKey: string | null
  /** URL file voice thuần (không BGM) */
  readonly voiceOnlyUrl: string | null
  /** URL file BGM thuần */
  readonly bgmOnlyUrl: string | null
  /** Chi tiết từng cảnh */
  readonly scenes: readonly AudioSceneOutput[]
  /** Provider đã dùng */
  readonly providerUsed: TtsProviderKey
  /** Model version */
  readonly modelVersion: string
  /** Thời lượng tổng (giây) */
  readonly totalDurationSeconds: number
  /** Credit đã trừ */
  readonly creditsDeducted: number
  /** Lỗi nếu có */
  readonly error?: string | undefined
}

export interface AudioJobEntity {
  readonly id: string
  readonly organizationId: string
  readonly taskType: AudioTaskType
  readonly stage: AudioJobStage
  readonly voiceId: string
  readonly providerKey: TtsProviderKey
  readonly qualityTier: AudioQualityTier
  readonly musicTrackId: string | null
  readonly musicMood: MusicMood
  readonly totalDurationSeconds: number
  readonly mixedAudioUrl: string | null
  readonly mixedAudioStorageKey: string | null
  readonly voiceOnlyUrl: string | null
  readonly bgmOnlyUrl: string | null
  readonly costCredits: number
  readonly errorMessage: string | null
  readonly scenes: readonly AudioSceneInput[]
  readonly createdAt: Date
  readonly updatedAt: Date
}
