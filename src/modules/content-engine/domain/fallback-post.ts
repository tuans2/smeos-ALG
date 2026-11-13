/**
 * Khuôn tất định tối thiểu (mục 4 kế hoạch: "Cả chuỗi hỏng → dùng khuôn tất
 * định tối thiểu... để job không treo, đánh dấu needs_review"). KHÔNG gọi
 * AI, ghép trực tiếp từ `facts[]`/`story` — không suy đoán, không thêm câu
 * quảng cáo không có trong facts.
 *
 * Cố ý KHÔNG dùng `social-post-generator.ts` (đường cũ của Chặng 05/Khu vực
 * B): khuôn đó chèn sẵn các câu ưu đãi cố định ("miễn phí thiệp thiết kế
 * riêng", "tặng kèm gói dưỡng hoa"...) bất kể tiệm có khai `default_offers`
 * hay không — vi phạm thẳng tiêu chí #2 (mục 1 kế hoạch: không bịa khuyến
 * mãi ngoài facts). Khuôn dự phòng của Content Engine phải tự nó cũng theo
 * đúng nguyên tắc "chỉ nói facts" như Writer/Critic, nên viết mới.
 *
 * Thuần — không import Prisma, không gọi mạng.
 */

import type { ContentBrief } from "../contracts/brief"
import type { PackageChannel } from "../../creative-production/domain/campaign-package-rules"

export interface FallbackPost {
  readonly channel: PackageChannel
  readonly text: string
  readonly hashtags: readonly string[]
  readonly factIds: readonly string[]
}

/**
 * Ghép các câu factual thành một đoạn ngắn, thêm CTA của tiệm nếu có, gắn
 * hashtag của tiệm. Không phân biệt giọng theo kênh (đó là việc của Writer)
 * — khuôn này chỉ cần đúng sự thật và không treo job.
 */
export function buildFallbackPost(brief: ContentBrief, channel: PackageChannel): FallbackPost {
  const lines: string[] = []
  const usedFactIds: string[] = []

  const productFact = brief.facts.find((f) => f.category === "product")
  if (productFact) {
    lines.push(productFact.text)
    usedFactIds.push(productFact.factId)
  } else {
    lines.push(`Sản phẩm: ${brief.product.name}`)
  }

  for (const f of brief.facts.filter((f) => f.category === "component")) {
    lines.push(f.text)
    usedFactIds.push(f.factId)
  }

  const passportFact = brief.facts.find((f) => f.category === "passport")
  if (passportFact) {
    lines.push(passportFact.text)
    usedFactIds.push(passportFact.factId)
  }

  const priceFact = brief.facts.find((f) => f.category === "price")
  if (priceFact) {
    lines.push(priceFact.text)
    usedFactIds.push(priceFact.factId)
  }

  // Không suy đoán một lời chào hàng mới: chỉ dùng CTA đã có trong brief
  // (topic hoặc mặc định của tiệm), hoặc câu mời liên hệ trung tính không
  // hứa hẹn gì (không phải một "fact" nhưng cũng không phải một tuyên bố).
  const cta = brief.topic.cta || brief.shop.ctaPhrase || "Nhắn tin cho tiệm để được tư vấn."
  lines.push(cta)

  const text = lines.filter((l) => l.trim().length > 0).join("\n")
  const hashtags = [...brief.shop.hashtags].slice(0, channel === "instagram" ? 15 : 5)

  return { channel, text, hashtags, factIds: [...new Set(usedFactIds)] }
}
