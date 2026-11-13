/**
 * Kiểm tất định của Content Engine (mục 4 kế hoạch: bước "Kiểm tất định" giữa
 * Writer và Critic, và Guard cuối). Mã thuần, không gọi AI — chạy trước Critic
 * để không tốn lượt mô hình cho lỗi máy bắt được.
 *
 * Bốn nhóm: độ dài, hashtag, từ cấm (đọc `FlowerContentGuard` đã có),
 * claim ngoài `facts` (mới — chặn bịa khuyến mãi/giá/cam kết).
 *
 * Thuần — không import Prisma, không gọi mạng.
 */

import { checkFlowerContent, type FlowerContentCheckResult } from "@/core/ai/domain/flower-content-guard"

import type { PackageChannel } from "../../creative-production/domain/campaign-package-rules"
import type { BriefFact, ContentBrief } from "../contracts/brief"
import { CHANNEL_SPECS } from "./channel-specs"

export type DeterministicCheckSeverity = "REJECTED" | "NEEDS_REVIEW"

export interface DeterministicCheckIssue {
  readonly severity: DeterministicCheckSeverity
  readonly code:
    | "LENGTH_OVER_HARD_CAP"
    | "LENGTH_OUTSIDE_TARGET"
    | "HASHTAG_OVER_HARD_CAP"
    | "HASHTAG_OUTSIDE_TARGET"
    | "BANNED_PHRASE"
    | "CLAIM_OUTSIDE_FACTS"
  readonly message: string
}

export interface DeterministicCheckResult {
  readonly ok: boolean // false nếu có ít nhất một REJECTED
  readonly issues: readonly DeterministicCheckIssue[]
}

export function checkLength(text: string, channel: PackageChannel): DeterministicCheckIssue[] {
  const spec = CHANNEL_SPECS[channel]
  const issues: DeterministicCheckIssue[] = []
  const len = text.length
  if (len > spec.maxChars) {
    issues.push({
      severity: "REJECTED",
      code: "LENGTH_OVER_HARD_CAP",
      message: `${channel}: ${len} ký tự, vượt trần ${spec.maxChars} của nền tảng.`,
    })
  } else if (len < spec.targetCharsRange[0] || len > spec.targetCharsRange[1]) {
    issues.push({
      severity: "NEEDS_REVIEW",
      code: "LENGTH_OUTSIDE_TARGET",
      message: `${channel}: ${len} ký tự, ngoài khoảng khuyến nghị ${spec.targetCharsRange[0]}–${spec.targetCharsRange[1]}.`,
    })
  }
  return issues
}

export function checkHashtags(hashtags: readonly string[], channel: PackageChannel): DeterministicCheckIssue[] {
  const spec = CHANNEL_SPECS[channel]
  const issues: DeterministicCheckIssue[] = []
  const n = hashtags.length
  // Trần cứng chỉ có ý nghĩa khi hashtagRange trên có chặn thật (Instagram);
  // các kênh khác coi khoảng khuyến nghị trên cũng là trần mềm.
  const hardCap = channel === "instagram" ? spec.hashtagRange[1] : null
  if (hardCap !== null && n > hardCap) {
    issues.push({
      severity: "REJECTED",
      code: "HASHTAG_OVER_HARD_CAP",
      message: `${channel}: ${n} hashtag, vượt trần ${hardCap} của nền tảng.`,
    })
  } else if (n < spec.hashtagRange[0] || n > spec.hashtagRange[1]) {
    issues.push({
      severity: "NEEDS_REVIEW",
      code: "HASHTAG_OUTSIDE_TARGET",
      message: `${channel}: ${n} hashtag, ngoài khoảng khuyến nghị ${spec.hashtagRange[0]}–${spec.hashtagRange[1]}.`,
    })
  }
  return issues
}

export function checkBannedWords(text: string, forbiddenStyles: readonly string[]): DeterministicCheckIssue[] {
  const result: FlowerContentCheckResult = checkFlowerContent(text, { brandForbiddenStyles: forbiddenStyles.join(", ") })
  const issues: DeterministicCheckIssue[] = []
  for (const m of result.hardBlocks) {
    issues.push({ severity: "REJECTED", code: "BANNED_PHRASE", message: `Từ cấm "${m.phrase}": ${m.reason}` })
  }
  for (const m of result.warnings) {
    issues.push({ severity: "NEEDS_REVIEW", code: "BANNED_PHRASE", message: `Cần soát "${m.phrase}": ${m.reason}` })
  }
  return issues
}

/**
 * Cụm từ báo hiệu một CAM KẾT/ƯU ĐÃI — nếu bài có cụm này mà `facts` không có
 * mục `offer` nào, coi là bịa (tiêu chí #2 mục 1 kế hoạch). Đây là lưới an
 * toàn tất định, THÔ hơn Critic (AIC-24) — bắt được chắc tay các mẫu câu phổ
 * biến nhất, không thay thế Critic đọc hiểu ngữ nghĩa.
 */
const OFFER_TRIGGER_PATTERNS: readonly RegExp[] = [
  /miễn phí/i,
  /freeship/i,
  /free\s*ship/i,
  /tặng kèm/i,
  /tặng thêm/i,
  /quà tặng/i,
  /giảm giá/i,
  /giảm \d/i,
  /\d+%/,
  /bảo hành/i,
  /cam kết (nở|tươi|bền)/i,
  /hoàn tiền/i,
  /đổi trả/i,
]

export function checkClaimsOutsideFacts(text: string, facts: readonly BriefFact[]): DeterministicCheckIssue[] {
  const hasOfferFact = facts.some((f) => f.category === "offer")
  if (hasOfferFact) return []
  const triggered = OFFER_TRIGGER_PATTERNS.find((re) => re.test(text))
  if (!triggered) return []
  return [
    {
      severity: "REJECTED",
      code: "CLAIM_OUTSIDE_FACTS",
      message: `Bài nhắc tới ưu đãi/cam kết (khớp mẫu "${triggered.source}") nhưng brief không có sự thật nào ở nhóm "offer" — tiệm chưa khai ưu đãi này.`,
    },
  ]
}

/** Chạy đủ bốn nhóm kiểm cho một bài đăng của một kênh. */
export function runDeterministicChecks(input: {
  readonly text: string
  readonly hashtags: readonly string[]
  readonly channel: PackageChannel
  readonly brief: Pick<ContentBrief, "facts" | "rules">
}): DeterministicCheckResult {
  const issues = [
    ...checkLength(input.text, input.channel),
    ...checkHashtags(input.hashtags, input.channel),
    ...checkBannedWords(input.text, input.brief.rules.forbiddenStyles),
    ...checkClaimsOutsideFacts(input.text, input.brief.facts),
  ]
  return { ok: !issues.some((i) => i.severity === "REJECTED"), issues }
}
