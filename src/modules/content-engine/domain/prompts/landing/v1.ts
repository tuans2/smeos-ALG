/**
 * Landing Page Writer v1 (AIC-23 content_generation — variant: landing_page).
 *
 * Kế thừa triết lý prompt của LocalBudd / SocialFlow:
 *   export { id, version, build, jsonSchema, normalize }
 *
 * Pure domain — không import Prisma, không gọi mạng.
 */

import { formatCurrency } from "@/lib/i18n/formatters"

export interface LandingWriterInput {
  readonly shopName: string
  readonly shopTone: string | undefined
  readonly occasionId: string
  readonly occasionLabel: string
  readonly archetypeId: string | undefined
  readonly selectedProducts: ReadonlyArray<{
    readonly name: string
    readonly code?: string | undefined
    readonly price?: number | null | undefined
    readonly category?: string | null | undefined
  }>
  readonly userDirectives: string | undefined
  readonly discountPercent: number | undefined
  /** Mục đích trang người dùng chọn (vd. "Trang giới thiệu cửa hàng chính thức — …"); không có thì để AI theo dịp lễ. */
  readonly pageGoal?: string | undefined
}

export interface LandingWriterOutput {
  readonly hero: { readonly badge: string; readonly headline: string; readonly subHeadline: string }
  readonly story: { readonly title: string; readonly paragraph1: string; readonly paragraph2: string; readonly quote: string }
  readonly perks: ReadonlyArray<{ readonly title: string; readonly description: string }>
  readonly faq: ReadonlyArray<{ readonly question: string; readonly answer: string }>
  readonly lead: { readonly title: string; readonly description: string }
}

function buildPrompt(input: LandingWriterInput): string {
  const products = input.selectedProducts
    .slice(0, 6)
    .map((p) => {
      const parts: string[] = [`- ${p.name}`]
      if (p.code) parts.push(`(mã: ${p.code})`)
      if (p.price) parts.push(`— ${formatCurrency(p.price)}`)
      if (p.category) parts.push(`[${p.category}]`)
      return parts.join(" ")
    })
    .join("\n")

  const toneGuide = input.shopTone
    ? `Giọng văn bắt buộc: ${input.shopTone}.`
    : "Giọng văn: ấm áp, chuyên nghiệp, gần gũi — phong cách thương hiệu Việt Nam cao cấp."

  const discount = input.discountPercent
  const directive = input.userDirectives ? `\nCHỈ ĐẠO NGỮ CẢNH TỪ CHỦ TIỆM:\n${input.userDirectives}` : ""

  return `Bạn là chuyên gia viết nội dung marketing cho tiệm hoa cao cấp Việt Nam.
Viết nội dung đầy đủ cho Landing Page chiến dịch dưới đây. Tất cả nội dung bằng tiếng Việt, chân thực, không bịa thông tin ngoài danh sách sản phẩm đã cho.

TIỆM HOA: ${input.shopName}
${toneGuide}
${input.pageGoal ? `MỤC ĐÍCH TRANG: ${input.pageGoal}\n` : ""}DỊP LỄ: ${input.occasionLabel} (mã: ${input.occasionId})
PHONG CÁCH: ${input.archetypeId ?? "minimal-luxury"}
${discount ? `ƯU ĐÃI (từ Hồ sơ tiệm): Giảm ${discount}% — chỉ dùng đúng ưu đãi này` : "ƯU ĐÃI: Tiệm chưa bật ưu đãi nào — tuyệt đối không nhắc giảm giá, quà tặng, freeship hay mã ưu đãi"}${directive}

SẢN PHẨM THẬT (chỉ dùng tên/giá từ đây, không tự bịa sản phẩm khác):
${products || "(Chưa có sản phẩm cụ thể — viết theo dịp lễ và tên tiệm)"}

LUẬT BẮT BUỘC:
- Không bịa giá, số lượng, cam kết giao hàng ngoài sản phẩm đã liệt kê
- Không dùng tiếng Anh trừ tên riêng (Zalo, Instagram)
- headline ≤ 80 ký tự | subHeadline ≤ 150 ký tự | mỗi paragraph ≤ 250 ký tự | perk description ≤ 120 ký tự

Trả về JSON (không thêm lời dẫn):
{
  "hero": { "badge": string, "headline": string, "subHeadline": string },
  "story": { "title": string, "paragraph1": string, "paragraph2": string, "quote": string },
  "perks": [ { "title": string, "description": string } ],
  "faq": [ { "question": string, "answer": string } ],
  "lead": { "title": string, "description": string }
}`
}

function jsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      hero: {
        type: "object",
        properties: { badge: { type: "string" }, headline: { type: "string" }, subHeadline: { type: "string" } },
        required: ["badge", "headline", "subHeadline"],
      },
      story: {
        type: "object",
        properties: { title: { type: "string" }, paragraph1: { type: "string" }, paragraph2: { type: "string" }, quote: { type: "string" } },
        required: ["title", "paragraph1", "paragraph2", "quote"],
      },
      perks: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } }, required: ["title", "description"] } },
      faq: { type: "array", items: { type: "object", properties: { question: { type: "string" }, answer: { type: "string" } }, required: ["question", "answer"] } },
      lead: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } }, required: ["title", "description"] },
    },
    required: ["hero", "story", "perks", "faq", "lead"],
  }
}

export type LandingWriterResult = { ok: true; output: LandingWriterOutput } | { ok: false; reason: string }

function s(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : ""
}

function normalize(raw: unknown): LandingWriterResult {
  const o = raw as Record<string, unknown> | null
  if (!o || typeof o !== "object") return { ok: false, reason: "Đầu ra không phải object" }

  const hero = o.hero as Record<string, unknown> | undefined
  const story = o.story as Record<string, unknown> | undefined
  const lead = o.lead as Record<string, unknown> | undefined

  const headline = s(hero?.headline, 80)
  if (headline.length < 5) return { ok: false, reason: "Headline quá ngắn hoặc trống" }
  const p1 = s(story?.paragraph1, 250)
  if (p1.length < 10) return { ok: false, reason: "Story paragraph1 quá ngắn" }

  const perks = (Array.isArray(o.perks) ? o.perks : [])
    .map((p: unknown) => ({ title: s((p as Record<string, unknown>).title, 50), description: s((p as Record<string, unknown>).description, 120) }))
    .filter((p) => p.title.length > 2)
    .slice(0, 4)

  const faq = (Array.isArray(o.faq) ? o.faq : [])
    .map((q: unknown) => ({ question: s((q as Record<string, unknown>).question, 150), answer: s((q as Record<string, unknown>).answer, 300) }))
    .filter((q) => q.question.length > 2)
    .slice(0, 4)

  return {
    ok: true,
    output: {
      hero: { badge: s(hero?.badge, 60), headline, subHeadline: s(hero?.subHeadline, 150) },
      story: { title: s(story?.title, 70), paragraph1: p1, paragraph2: s(story?.paragraph2, 250), quote: s(story?.quote, 150) },
      perks: perks.length > 0 ? perks : [{ title: "Chụp ảnh duyệt trước khi giao", description: "Đảm bảo hoa đúng mẫu 100% trước khi xuất xưởng." }],
      faq: faq.length > 0 ? faq : [{ question: "Hoa giao trong bao lâu?", answer: "Vui lòng nhắn tin cho tiệm để được báo thời gian giao phù hợp với địa chỉ của bạn." }],
      lead: { title: s(lead?.title, 80), description: s(lead?.description, 150) },
    },
  }
}

export const LANDING_WRITER_PROMPT_V1 = {
  id: "landing_writer",
  version: "v1",
  build: buildPrompt,
  jsonSchema,
  normalize,
} as const
