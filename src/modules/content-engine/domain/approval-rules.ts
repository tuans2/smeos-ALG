/**
 * Luật duyệt bài Content Engine (P27 — rà soát sẵn sàng production 25/09/2026).
 * AIC-23 `content_generation` khai `needsApproval: true`: bài AI viết chỉ là
 * nháp (`DRAFT`) cho tới khi một người có quyền duyệt (`J5`, cùng mã với duyệt
 * gói Chặng 09) chốt nội dung từng kênh.
 *
 * Duyệt theo TỪNG KÊNH, gộp dần vào `approved_posts`: giao diện `/noi-dung`
 * duyệt từng bài một, nên lượt duyệt thứ hai (kênh khác, hoặc sửa lại chính
 * kênh đó) vẫn hợp lệ khi bản ghi đang `APPROVED`. Đã gửi lịch đăng
 * (`SCHEDULED`) thì khoá — sửa lúc đó sẽ lệch với bài đã nằm bên SocialFlow.
 *
 * Thuần — không import Prisma, không gọi mạng.
 */

export type ContentGenerationStatusValue = "DRAFT" | "APPROVED" | "SCHEDULED"

export interface ApprovedPost {
  readonly channel: string
  readonly text: string
  readonly hashtags: readonly string[]
  readonly edited: boolean
}

export interface ApprovalPostInput {
  readonly channel: string
  readonly text?: string | undefined
  readonly hashtags?: readonly string[] | undefined
}

interface GeneratedPostLike {
  readonly channel: string
  readonly text: string
  readonly hashtags?: readonly string[] | null
}

export type ApprovalDecision =
  | { readonly ok: true; readonly approvedPosts: readonly ApprovedPost[] }
  | { readonly ok: false; readonly kind: "CONFLICT" | "VALIDATION"; readonly reason: string }

function sameHashtags(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((h, i) => h === b[i])
}

/**
 * Quyết định `approved_posts` mới. `requested` rỗng/vắng = duyệt nguyên văn
 * mọi bài AI đã viết. Kênh được yêu cầu phải là kênh của chính lượt sinh này.
 */
export function decideApproval(input: {
  readonly status: string
  readonly generatedPosts: readonly GeneratedPostLike[]
  readonly existingApproved: readonly ApprovedPost[] | null
  readonly requested?: readonly ApprovalPostInput[] | undefined
}): ApprovalDecision {
  if (input.status === "SCHEDULED") {
    return { ok: false, kind: "CONFLICT", reason: "Bài đã gửi lịch đăng — không duyệt lại được." }
  }
  if (input.status !== "DRAFT" && input.status !== "APPROVED") {
    return { ok: false, kind: "CONFLICT", reason: "Lượt bài này không còn duyệt được nữa." }
  }

  const byChannel = new Map(input.generatedPosts.map((p) => [p.channel, p]))
  const requested: readonly ApprovalPostInput[] =
    input.requested && input.requested.length > 0
      ? input.requested
      : input.generatedPosts.map((p) => ({ channel: p.channel }))

  const seen = new Set<string>()
  const next = new Map<string, ApprovedPost>((input.existingApproved ?? []).map((p) => [p.channel, p]))

  for (const r of requested) {
    if (seen.has(r.channel)) {
      return { ok: false, kind: "VALIDATION", reason: `Kênh ${r.channel} lặp lại trong một lượt duyệt.` }
    }
    seen.add(r.channel)
    const generated = byChannel.get(r.channel)
    if (!generated) {
      return { ok: false, kind: "VALIDATION", reason: `Lượt sinh này không có bài cho kênh ${r.channel}.` }
    }
    const text = (r.text ?? generated.text).trim()
    if (text.length === 0) {
      return { ok: false, kind: "VALIDATION", reason: `Bài kênh ${r.channel} không được rỗng.` }
    }
    const generatedHashtags = generated.hashtags ?? []
    const hashtags = r.hashtags ?? generatedHashtags
    next.set(r.channel, {
      channel: r.channel,
      text,
      hashtags,
      edited: text !== generated.text.trim() || !sameHashtags(hashtags, generatedHashtags),
    })
  }

  // Giữ đúng thứ tự kênh của lượt sinh cho dễ đọc/so.
  const approvedPosts = input.generatedPosts
    .map((p) => next.get(p.channel))
    .filter((p): p is ApprovedPost => p !== undefined)
  return { ok: true, approvedPosts }
}
