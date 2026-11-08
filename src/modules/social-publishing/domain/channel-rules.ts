/**
 * Luật nội dung từng nền tảng + kiểm trước khi đăng (Bước 4, PO 08/11/2026). Kiểm TRƯỚC khi đặt lịch để user sửa ngay,
 * không đợi tới giờ đăng mới lỗi. Bước "kiểm an toàn" thu hoạch ý tưởng từ SocialFlow `agents/reviewer.py` (credential
 * safety — không để lộ mật khẩu / khoá trong bài). Thuần — không import hạ tầng.
 */
import type { SocialChannel } from "@/core/ports/publisher-provider"

export interface ChannelRule {
  readonly label: string
  readonly maxCaption: number
  readonly maxTitle: number
  readonly minImages: number
  readonly maxImages: number
  readonly maxHashtags: number
}

/** Số theo tài liệu chính thức của từng nền tảng (rà 11/2026). */
export const CHANNEL_RULES: Readonly<Record<SocialChannel, ChannelRule>> = {
  facebook: { label: "Facebook", maxCaption: 63_206, maxTitle: 120, minImages: 0, maxImages: 10, maxHashtags: 30 },
  instagram: { label: "Instagram", maxCaption: 2_200, maxTitle: 120, minImages: 1, maxImages: 10, maxHashtags: 30 },
  zalo: { label: "Zalo", maxCaption: 10_000, maxTitle: 150, minImages: 1, maxImages: 10, maxHashtags: 10 },
  tiktok: { label: "TikTok", maxCaption: 4_000, maxTitle: 90, minImages: 1, maxImages: 35, maxHashtags: 30 },
}

export function normalizeHashtags(tags: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of tags) {
    const t = raw.trim().replace(/^#+/, "").replace(/\s+/g, "")
    if (!t || seen.has(t.toLowerCase())) continue
    seen.add(t.toLowerCase())
    out.push(`#${t}`)
  }
  return out
}

/** Nội dung đăng = thân bài + hashtag (không lặp hashtag đã có sẵn trong thân bài). */
export function composeCaption(text: string, hashtags: readonly string[]): string {
  const body = text.trim()
  const lower = body.toLowerCase()
  const extra = normalizeHashtags(hashtags).filter((h) => !lower.includes(h.toLowerCase()))
  return extra.length ? `${body}\n\n${extra.join(" ")}` : body
}

/** Tiêu đề ngắn rút từ dòng đầu (Zalo bài viết, TikTok ảnh), cắt theo trần của kênh, không cắt giữa từ. */
export function titleFrom(text: string, channel: SocialChannel): string {
  const first = text.trim().split("\n").find((l) => l.trim())?.trim() ?? ""
  const max = CHANNEL_RULES[channel].maxTitle
  if (first.length <= max) return first
  const cut = first.slice(0, max - 1)
  const space = cut.lastIndexOf(" ")
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trim()}…`
}

/** Dấu hiệu khoá / mật khẩu lọt vào bài — chặn cứng, không bao giờ đăng công khai. */
const SECRET_PATTERNS: readonly RegExp[] = [
  /\bEAA[A-Za-z0-9]{20,}/, // Meta access token
  /\bsk-[A-Za-z0-9_-]{20,}/, // khoá API kiểu OpenAI/Anthropic
  /\bgh[pousr]_[A-Za-z0-9]{20,}/, // GitHub token
  /\bAKIA[0-9A-Z]{16}\b/, // AWS access key
  /(mật khẩu|mat khau|password|passwd|pwd)\s*[:=]\s*\S+/i,
  /[?&](access_token|token|api_key|apikey)=[^\s&]+/i,
]

export interface PostDraft {
  readonly channel: SocialChannel
  readonly text: string
  readonly hashtags: readonly string[]
  readonly imageCount: number
}

/** Câu lỗi tiếng Việt, rỗng = đăng được. */
export function validatePost(p: PostDraft): string[] {
  const rule = CHANNEL_RULES[p.channel]
  const issues: string[] = []
  const caption = composeCaption(p.text, p.hashtags)
  if (!p.text.trim()) issues.push(`${rule.label}: bài chưa có nội dung`)
  if (caption.length > rule.maxCaption) issues.push(`${rule.label}: bài dài ${caption.length} ký tự, tối đa ${rule.maxCaption}`)
  if (normalizeHashtags(p.hashtags).length > rule.maxHashtags) issues.push(`${rule.label}: tối đa ${rule.maxHashtags} hashtag`)
  if (p.imageCount < rule.minImages) issues.push(`${rule.label}: cần ít nhất ${rule.minImages} ảnh sản phẩm`)
  if (p.imageCount > rule.maxImages) issues.push(`${rule.label}: tối đa ${rule.maxImages} ảnh mỗi bài`)
  if (SECRET_PATTERNS.some((re) => re.test(caption))) issues.push(`${rule.label}: bài có vẻ chứa mật khẩu hoặc khoá truy cập — xoá trước khi đăng`)
  return issues
}
