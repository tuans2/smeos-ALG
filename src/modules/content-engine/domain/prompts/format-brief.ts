/**
 * Định dạng chung để nhét Content Brief v1 vào prompt của cả bốn agent —
 * MỘT nơi duy nhất render brief thành văn bản, để không có agent nào tự ý
 * thêm/bớt trường khi đọc brief (nguyên tắc mục 3 kế hoạch: Brief là nơi
 * duy nhất thêm thông tin cho engine).
 *
 * Chỉ liệt kê `facts[]` kèm `fact_id` — KHÔNG liệt kê lại `product`/`passport`
 * thô, để agent buộc phải trích dẫn `fact_id` thay vì tự diễn giải lại dữ
 * liệu gốc (giữ được dấu vết facts→text cho Writer/Rewriter phải trả `fact_ids`).
 *
 * Thuần — không import Prisma, không gọi mạng.
 */

import type { ContentBrief } from "../../contracts/brief"

export function formatFactsForPrompt(brief: ContentBrief): string {
  return brief.facts.map((f) => `  - [${f.factId}] (${f.category}) ${f.text}`).join("\n")
}

export function formatShopForPrompt(brief: ContentBrief): string {
  const shop = brief.shop
  const lines = [
    `Tên tiệm: ${shop.displayName}`,
    shop.toneOfVoice ? `Giọng văn: ${shop.toneOfVoice}` : null,
    shop.hashtags.length ? `Hashtag thường dùng: ${shop.hashtags.join(" ")}` : null,
    shop.ctaPhrase ? `CTA mặc định: ${shop.ctaPhrase}` : null,
  ].filter((l): l is string => l !== null)
  return lines.join("\n")
}

export function formatStoryForPrompt(brief: ContentBrief): string | null {
  const s = brief.story
  if (!s) return null
  const lines = [
    s.logline ? `Câu chuyện: ${s.logline}` : null,
    s.emotionalTone ? `Cảm xúc: ${s.emotionalTone}` : null,
    s.hook ? `Mở đầu: ${s.hook}` : null,
    s.cta ? `CTA của kịch bản: ${s.cta}` : null,
    s.sceneLines.length ? `Lời thoại từng cảnh:\n${s.sceneLines.map((l, i) => `    ${i + 1}. ${l}`).join("\n")}` : null,
  ].filter((l): l is string => l !== null)
  return lines.length ? lines.join("\n") : null
}

export function formatBannedNotice(brief: ContentBrief): string {
  return `${brief.rules.factsOnlyNotice} Phong cách cấm của tiệm: ${
    brief.rules.forbiddenStyles.length ? brief.rules.forbiddenStyles.join(", ") : "(không có)"
  }.`
}
