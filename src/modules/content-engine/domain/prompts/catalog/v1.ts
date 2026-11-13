/**
 * Catalog Writer v1 (AIC-23 content_generation — variant: catalog_page).
 *
 * Sinh lời chào, mô tả bộ sưu tập và ghi chú curator cho Catalog Số Trực Tuyến.
 * Kế thừa triết lý prompt LocalBudd / SocialFlow:
 *   export { id, version, build, jsonSchema, normalize }
 *
 * Pure domain — không import Prisma, không gọi mạng.
 */

import type { CatalogStyleVariant } from "../../catalog-content-generator"

export interface CatalogWriterInput {
  readonly shopName: string
  readonly collectionName: string
  readonly occasion: string | undefined
  readonly productCount: number
  readonly styleVariant: CatalogStyleVariant
  readonly userDirectives: string | undefined
}

export interface CatalogWriterOutput {
  readonly badge: string
  readonly description: string
  readonly curatorNote: string
  readonly ctaText: string
}

const STYLE_CONTEXT: Record<CatalogStyleVariant, string> = {
  EDITORIAL_LOOKBOOK: "Tạp chí nghệ thuật — nhấn mạnh cảm xúc, thẩm mỹ, câu chuyện. Giọng văn bay bổng, sâu sắc.",
  MODERN_SHOWROOM: "Showroom hiện đại — rõ ràng, thực tế, thân thiện. Giọng văn tươi sáng, dễ gần.",
  COMPACT_LIST: "Danh mục B2B sự kiện — cô đọng, chuyên nghiệp. Giọng văn ngắn gọn, nhấn mạnh số lượng và VAT.",
}

function buildPrompt(input: CatalogWriterInput): string {
  const occasion = input.occasion ? `Dịp: ${input.occasion}` : "Dùng cho mọi dịp"
  const directive = input.userDirectives ? `\nYÊU CẦU ĐẶC BIỆT TỪ CHỦ TIỆM:\n${input.userDirectives}` : ""

  return `Bạn là người viết nội dung cho tiệm hoa Việt Nam. Viết mô tả giới thiệu cho bộ sưu tập catalog số trực tuyến.

TIỆM HOA: ${input.shopName}
TÊN BỘ SƯU TẬP: ${input.collectionName}
${occasion}
SỐ LƯỢNG MẪU HOA: ${input.productCount}
PHONG CÁCH HIỂN THỊ: ${input.styleVariant} — ${STYLE_CONTEXT[input.styleVariant]}${directive}

YÊU CẦU:
1. badge: Nhãn định danh ngắn (≤ 60 ký tự) phù hợp phong cách ${input.styleVariant}
2. description: Mô tả bộ sưu tập (≤ 200 ký tự) — hấp dẫn, đúng phong cách, đề cập số lượng mẫu
3. curatorNote: Ghi chú của nghệ nhân (≤ 150 ký tự) — cam kết chất lượng hoặc điểm đặc sắc
4. ctaText: Nút kêu gọi hành động (≤ 30 ký tự) phù hợp phong cách

LUẬT: Tất cả tiếng Việt, không bịa số lượng khác ${input.productCount} mẫu.

Trả về JSON (không thêm lời dẫn):
{ "badge": string, "description": string, "curatorNote": string, "ctaText": string }`
}

function jsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      badge: { type: "string" },
      description: { type: "string" },
      curatorNote: { type: "string" },
      ctaText: { type: "string" },
    },
    required: ["badge", "description", "curatorNote", "ctaText"],
  }
}

export type CatalogWriterResult = { ok: true; output: CatalogWriterOutput } | { ok: false; reason: string }

function s(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : ""
}

function normalize(raw: unknown): CatalogWriterResult {
  const o = raw as Record<string, unknown> | null
  if (!o || typeof o !== "object") return { ok: false, reason: "Đầu ra không phải object" }

  const description = s(o.description, 200)
  if (description.length < 10) return { ok: false, reason: "Description quá ngắn hoặc trống" }

  return {
    ok: true,
    output: {
      badge: s(o.badge, 60),
      description,
      curatorNote: s(o.curatorNote, 150),
      ctaText: s(o.ctaText, 30) || "Xem bộ sưu tập",
    },
  }
}

export const CATALOG_WRITER_PROMPT_V1 = {
  id: "catalog_writer",
  version: "v1",
  build: buildPrompt,
  jsonSchema,
  normalize,
} as const
