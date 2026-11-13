/**
 * Luật viết theo từng kênh cho Content Engine (Brief v1, mục `channels`).
 *
 * Thu hoạch (EXTEND, kế hoạch project claude.ai
 * `claude/ke-hoach-content-engine-core-25-09-2026.md` mục 8 Đợt 1) từ
 * `SocialFlow/backend/m07/adapters/flower_prompts.py#channel_rules` — giữ
 * lại cấu trúc/tông giọng/độ dài mỗi kênh, KHÔNG giữ nội dung mẫu (những bài
 * mẫu gốc tự bịa khuyến mãi/cam kết, đúng lỗi mà Brief.facts được sinh ra để
 * chặn).
 *
 * Trần cứng ký tự/hashtag lấy từ `campaign-package-rules.ts`
 * (`CHANNEL_TEXT_LIMITS`, `INSTAGRAM_MAX_HASHTAGS`) — hai nơi này không được
 * lệch nhau, khoá bằng test.
 *
 * Thuần — không import Prisma, không gọi mạng.
 */

import { CHANNEL_TEXT_LIMITS, INSTAGRAM_MAX_HASHTAGS } from "../../creative-production/domain/campaign-package-rules"
import type { PackageChannel } from "../../creative-production/domain/campaign-package-rules"

export interface ChannelSpec {
  readonly channel: PackageChannel
  /** Trần cứng nền tảng — vượt thì `deterministic-checks.ts` từ chối. */
  readonly maxChars: number
  /** Khoảng độ dài khuyến nghị (mềm) — không đạt thì Critic hạ điểm `platform`, không tự động trượt. */
  readonly targetCharsRange: readonly [number, number]
  /** Khoảng số hashtag khuyến nghị (mềm). */
  readonly hashtagRange: readonly [number, number]
  readonly tone: string
  readonly structureNote: string
  readonly ctaStyle: string
}

export const CHANNEL_SPECS: Readonly<Record<PackageChannel, ChannelSpec>> = {
  facebook: {
    channel: "facebook",
    maxChars: CHANNEL_TEXT_LIMITS.facebook,
    targetCharsRange: [400, 900],
    hashtagRange: [4, 6],
    tone: "Kể chuyện (storytelling), lôi cuốn, 3–4 đoạn ngắn dễ đọc",
    structureNote:
      "Câu mở gợi cảm xúc (hook) → mô tả nét đẹp và công năng sản phẩm → cam kết THẬT của tiệm (chỉ nếu có trong facts) → CTA nhắn tin Inbox/Zalo",
    ctaStyle: "Mời nhắn tin Inbox hoặc Zalo để được tư vấn thiết kế riêng",
  },
  instagram: {
    channel: "instagram",
    maxChars: CHANNEL_TEXT_LIMITS.instagram,
    targetCharsRange: [150, 400],
    hashtagRange: [15, INSTAGRAM_MAX_HASHTAGS],
    tone: "Aesthetic, thời thượng, câu chữ cô đọng, tinh tế",
    structureNote: "Caption ngắn 1–2 câu đầy chất thơ → điểm nhấn phối màu/thông điệp ngắn → CTA",
    ctaStyle: "Mời để lại bình luận hoặc nhắn tin trực tiếp (Direct)",
  },
  tiktok: {
    channel: "tiktok",
    maxChars: CHANNEL_TEXT_LIMITS.tiktok,
    targetCharsRange: [80, 300],
    hashtagRange: [4, 6],
    tone: "Năng động, thu hút trong 3 giây đầu, hook-body-cta",
    structureNote:
      "Với kịch bản quay: hook 0–3s → thân bài cận cảnh hoa 4–25s → thành phẩm + CTA 26–35s. Với caption đăng bài: 1–2 câu bắt trend + hashtag",
    ctaStyle: "Mời bình luận hoặc nhắn tin đặt hoa, nhấn mạnh giao nhanh",
  },
  zalo: {
    channel: "zalo",
    maxChars: CHANNEL_TEXT_LIMITS.zalo,
    targetCharsRange: [200, 500],
    hashtagRange: [0, 0],
    tone: "Trang trọng, ân cần, riêng tư, tập trung dịch vụ khách hàng",
    structureNote: "Lời chào → giới thiệu sản phẩm → chi tiết chất liệu/màu/giá → CTA phản hồi tin nhắn",
    ctaStyle: "Mời phản hồi tin nhắn để tiệm giữ hoa/chuẩn bị",
  },
}

export function channelSpec(channel: PackageChannel): ChannelSpec {
  return CHANNEL_SPECS[channel]
}

/** Mô tả kênh cho prompt Strategist/Writer — không lộ số liệu trần cứng cho mô hình để tránh nó "vừa khít" giả tạo. */
export function describeChannelForPrompt(channel: PackageChannel): string {
  const s = CHANNEL_SPECS[channel]
  const hashtagNote = s.hashtagRange[1] === 0 ? "không dùng hashtag" : `khoảng ${s.hashtagRange[0]}–${s.hashtagRange[1]} hashtag`
  return `Kênh ${channel}: ${s.tone}. ${s.structureNote}. ${s.ctaStyle}. Độ dài tự nhiên khoảng ${s.targetCharsRange[0]}–${s.targetCharsRange[1]} ký tự, ${hashtagNote}.`
}
