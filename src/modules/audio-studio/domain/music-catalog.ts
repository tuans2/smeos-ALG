/**
 * Music Catalog — SSOT danh mục nhạc nền cho Audio Studio.
 *
 * Thư viện nhạc HỆ THỐNG, phân loại theo mood. Nhạc tiệm tự tải nằm ở bảng
 * `music_tracks` (24/09/2026).
 *
 * THÊM BÀI CÓ GIẤY PHÉP (quyết định PO 24/09/2026): chép tệp vào
 * `workers/media_ai/video/assets/music/`, thêm một dòng ở đây với
 * `licenseSource` (nơi mua + mã giấy phép/đường dẫn) và `licenseVerified: true`,
 * rồi thêm `trackId → tên tệp` vào `TRACK_ID_TO_FILENAME` của
 * `workers/media_ai/audio/mixing_engine.py`. Bài `licenseVerified: false` vẫn
 * nghe thử được nhưng giao diện ghi rõ "chưa xác minh bản quyền".
 *
 * Thuần TypeScript — Zero external dependencies.
 */

import type { MusicTrackSpec, MusicMood } from "./audio-types"

// ============================================================
// SSOT MUSIC CATALOG
// ============================================================

export const MUSIC_CATALOG: readonly MusicTrackSpec[] = [
  {
    trackId: "acoustic-warm-guitar",
    displayName: "Acoustic Warm Guitar",
    mood: "warm",
    durationSeconds: 60,
    filename: "acoustic_warm_guitar.mp3",
    license: "royalty_free",
    // Tệp có từ P17; repo không có hồ sơ nguồn/giấy phép (rà soát 24/09/2026).
    licenseSource: "Chưa có hồ sơ nguồn (tệp từ P17)",
    licenseVerified: false,
    suitableFor: ["AUTHENTIC", "CREATIVE"],
  },
  {
    trackId: "upbeat-cheerful-pop",
    displayName: "Upbeat Cheerful Pop",
    mood: "upbeat",
    durationSeconds: 60,
    filename: "upbeat_cheerful_pop.mp3",
    license: "royalty_free",
    // Tệp có từ P17; repo không có hồ sơ nguồn/giấy phép (rà soát 24/09/2026).
    licenseSource: "Chưa có hồ sơ nguồn (tệp từ P17)",
    licenseVerified: false,
    suitableFor: ["CREATIVE"],
  },
  {
    trackId: "lo-fi-chill-beats",
    displayName: "Lo-Fi Chill Beats",
    mood: "chill",
    durationSeconds: 60,
    filename: "lo_fi_chill_beats.mp3",
    license: "royalty_free",
    // Tệp có từ P17; repo không có hồ sơ nguồn/giấy phép (rà soát 24/09/2026).
    licenseSource: "Chưa có hồ sơ nguồn (tệp từ P17)",
    licenseVerified: false,
    suitableFor: ["AUTHENTIC", "CREATIVE"],
  },
  {
    trackId: "romantic-piano-melody",
    displayName: "Romantic Piano Melody",
    mood: "romantic",
    durationSeconds: 60,
    filename: "romantic_piano_melody.mp3",
    license: "royalty_free",
    // Tệp có từ P17; repo không có hồ sơ nguồn/giấy phép (rà soát 24/09/2026).
    licenseSource: "Chưa có hồ sơ nguồn (tệp từ P17)",
    licenseVerified: false,
    suitableFor: ["AUTHENTIC", "CREATIVE"],
  },
] as const

// ============================================================
// LOOKUP & SELECTION UTILITIES
// ============================================================

/**
 * Tìm track theo trackId.
 */
export function getMusicTrack(trackId: string): MusicTrackSpec | undefined {
  return MUSIC_CATALOG.find((t) => t.trackId === trackId)
}

/**
 * Lọc track theo mood.
 */
export function filterTracksByMood(mood: MusicMood): readonly MusicTrackSpec[] {
  if (mood === "none") return []
  return MUSIC_CATALOG.filter((t) => t.mood === mood)
}

/**
 * Lọc track phù hợp với ProductionMode.
 */
export function filterTracksForMode(
  mode: "AUTHENTIC" | "CREATIVE"
): readonly MusicTrackSpec[] {
  return MUSIC_CATALOG.filter((t) => t.suitableFor.includes(mode))
}

/**
 * Gợi ý nhạc nền theo mood: ưu tiên bài đã xác minh giấy phép. Mood không có
 * bài nào thì trả `undefined` (24/09/2026 — trước đây âm thầm trả guitar, nên
 * chọn "Luxury" vẫn ra Acoustic Guitar).
 */
export function suggestMusicTrack(mood: MusicMood): MusicTrackSpec | undefined {
  if (mood === "none") return undefined
  const matches = filterTracksByMood(mood)
  return matches.find((t) => t.licenseVerified) ?? matches[0]
}

/**
 * Gợi ý mood nhạc nền phù hợp theo TopicAngleCategory.
 */
export function suggestMoodForTopicAngle(
  angleCategory: string
): MusicMood {
  switch (angleCategory) {
    case "EMOTIONAL":
      return "romantic"
    case "PRODUCT_SHOWCASE":
      return "warm"
    case "EDUCATIONAL":
      return "chill"
    case "PROBLEM_SOLUTION":
      return "warm"
    case "TREND":
      return "upbeat"
    case "PRICE_VALUE":
      return "upbeat"
    default:
      return "warm"
  }
}

/**
 * Ánh xạ tên track cũ (từ video_worker) sang trackId mới.
 * Dùng để backward-compatible khi refactor.
 */
export function migrateLegacyTrackName(legacyName: string): string | undefined {
  const map: Record<string, string> = {
    "Acoustic Warm Guitar": "acoustic-warm-guitar",
    "Upbeat Cheerful Pop": "upbeat-cheerful-pop",
    "Lo-Fi Chill Beats": "lo-fi-chill-beats",
    "Romantic Piano Melody": "romantic-piano-melody",
  }
  return map[legacyName]
}
