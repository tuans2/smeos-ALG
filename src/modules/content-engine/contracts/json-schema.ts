/**
 * Sinh JSON Schema (draft 2020-12) từ hợp đồng zod của Content Engine
 * (`P27`, kế hoạch project claude.ai
 * `claude/ke-hoach-content-engine-core-25-09-2026.md`). Cùng khuôn với
 * `creative-production/contracts/json-schema.ts` và
 * `coordinator/contracts/json-schema.ts` — nguồn chuẩn là zod, JSON Schema
 * sinh tự động, không sửa tay.
 *
 *   npm run gen:schemas:content-engine
 *   npm run check:schemas:content-engine
 *
 * Đợt 1 chỉ có Brief v1 (chưa có route/endpoint — Đợt 2). Thêm endpoint thì
 * thêm vào `CONTENT_ENGINE_NAMED_SCHEMAS` bên dưới, không đổi khuôn tệp.
 */

import { z } from "zod"

import { BRIEF_VERSION, contentBriefSchema } from "./brief"
import { GENERATE_CONTENT_VERSION, generateContentBodySchema } from "./generation"

export const CONTENT_ENGINE_SCHEMA_DIR = "docs/dac-ta/schemas/content-engine"
export const CONTRACTS_SOURCE_DIR = "src/modules/content-engine/contracts"

export interface GeneratedSchemaFile {
  readonly file: string
  readonly json: Record<string, unknown>
}

interface NamedSchema {
  readonly name: string
  readonly title: string
  readonly summary: string
  readonly sourceFile: string
  readonly schema: z.ZodType
  readonly example: unknown
  readonly meta?: Record<string, unknown>
}

function toJson(schema: z.ZodType): Record<string, unknown> {
  const out = z.toJSONSchema(schema, { target: "draft-2020-12", io: "output", unrepresentable: "any" }) as Record<string, unknown>
  delete out.$schema
  return out
}

function envelope(s: NamedSchema): GeneratedSchemaFile {
  const file = `${s.name}.schema.json`
  return {
    file,
    json: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: file,
      title: s.title,
      description: s.summary,
      "x-alg": {
        module: "content-engine",
        source: s.sourceFile,
        ...s.meta,
        generated: "SINH TỰ ĐỘNG — không sửa tay. Sửa zod ở tệp nguồn rồi chạy `npm run gen:schemas:content-engine`.",
      },
      ...toJson(s.schema),
      examples: [s.example],
    },
  }
}

const BRIEF_EXAMPLE = {
  briefVersion: BRIEF_VERSION,
  organizationId: "org_avigift",
  assetId: "asset_001",
  product: {
    productId: "prod_001",
    name: "Sản phẩm hồng đỏ 20 cành",
    style: "cổ điển, sang trọng",
    components: [{ flowerType: "Hồng đỏ Ecuador", quantityEstimate: 20, unit: "cành", role: "dominant", color: "đỏ" }],
    packaging: { wrappingMaterial: "giấy kraft", wrappingColor: "nâu", ribbon: "lụa đỏ", accessories: ["thiệp"], cardText: "Chúc mừng sinh nhật!" },
    price: { exact: 650000, rangeLabel: null },
  },
  passport: {
    sellingPoints: ["Hoa nhập khẩu tuyển chọn", "Cắm trong ngày"],
    flowerMeaningStory: "Hoa hồng đỏ tượng trưng cho tình yêu nồng nàn.",
    recipient: "người yêu, vợ/chồng",
    buyerPersona: "nam giới 25-40 tuổi",
    occasions: ["sinh nhật", "kỷ niệm"],
    careInstructions: ["Thay nước mỗi 2 ngày", "Cắt vát cành mỗi lần thay nước"],
    cardMessageSuggestions: { romantic: "Anh yêu em!", subtle: null, congratulatory: null },
  },
  topic: {
    topicId: "topic_001",
    title: "Sản phẩm sinh nhật tone đỏ",
    angleCategory: "EMOTIONAL",
    hook: "Món quà nào nói hộ lời yêu thương?",
    cta: "Nhắn tin đặt hoa ngay hôm nay",
    format: "REELS_TIKTOK_9_16",
    evidenceNote: null,
  },
  story: {
    scenePlanId: "scene_001",
    mode: "AUTHENTIC",
    logline: "Một buổi sáng chuẩn bị sản phẩm cho ngày sinh nhật đặc biệt.",
    emotionalTone: "ấm áp",
    hook: "Món quà nào nói hộ lời yêu thương?",
    cta: "Nhắn tin đặt hoa ngay hôm nay",
    sceneLines: ["Xưởng hoa sáng sớm, từng cành hồng được chọn lọc kỹ càng."],
  },
  shop: {
    displayName: "SiiN Store",
    toneOfVoice: "thân thiện, tinh tế",
    hashtags: ["#hoatuoi", "#siinstore"],
    ctaPhrase: "Nhắn tin tiệm để được tư vấn nhé!",
    defaultOffers: { freeGifts: ["Thiệp thiết kế riêng"], guarantees: [] },
    forbiddenStyles: ["chợ búa", "giật gân"],
    phone: "0909xxxxxx",
    address: "123 Đường ABC, Q.1, TP.HCM",
    website: "https://siinstore.vn",
    operatingHours: "8:00 - 20:00",
  },
  channels: [
    {
      channel: "facebook",
      maxChars: 63206,
      targetCharsRange: [400, 900],
      hashtagRange: [4, 6],
      tone: "Kể chuyện (storytelling), lôi cuốn, 3–4 đoạn ngắn dễ đọc",
      structureNote: "Câu mở gợi cảm xúc (hook) → mô tả nét đẹp sản phẩm → CTA",
      ctaStyle: "Mời nhắn tin Inbox hoặc Zalo để được tư vấn thiết kế riêng",
    },
  ],
  facts: [
    { factId: "F1", category: "product", text: "Sản phẩm: Sản phẩm hồng đỏ 20 cành — phong cách cổ điển, sang trọng" },
    { factId: "F2", category: "offer", text: "Quà tặng kèm: Thiệp thiết kế riêng" },
  ],
  rules: {
    bannedPhraseCount: 24,
    forbiddenStyles: ["chợ búa", "giật gân"],
    factsOnlyNotice: "Chỉ được nói những gì có trong facts[]. Không tự thêm khuyến mãi, freeship, quà tặng, cam kết hay giá không có ở đây.",
  },
}

const GENERATE_CONTENT_BODY_EXAMPLE = {
  asset_id: "asset_001",
  product_id: null,
  analysis_run_id: null,
  topic_id: "topic_001",
  scene_plan_id: "scene_001",
  channels: ["facebook", "instagram"],
}

const CONTENT_ENGINE_NAMED_SCHEMAS: readonly NamedSchema[] = [
  {
    name: "brief.v1",
    title: "Content Engine — Content Brief v1",
    summary: "Hợp đồng duy nhất mà chuỗi agent Strategist→Writer→Critic→Rewriter đọc để viết bài; nơi duy nhất thêm thông tin cho engine.",
    sourceFile: `${CONTRACTS_SOURCE_DIR}/brief.ts`,
    schema: contentBriefSchema,
    example: BRIEF_EXAMPLE,
    meta: { briefVersion: BRIEF_VERSION },
  },
  {
    name: "generate-content-request.v1",
    title: "Content Engine — POST /generations request body",
    summary: "Thân yêu cầu tạo lượt sinh bài đa kênh (Đợt 2) — cần asset_id hoặc product_id để dựng Brief.",
    sourceFile: `${CONTRACTS_SOURCE_DIR}/generation.ts`,
    schema: generateContentBodySchema,
    example: GENERATE_CONTENT_BODY_EXAMPLE,
    meta: { generateContentVersion: GENERATE_CONTENT_VERSION },
  },
]

export function serializeSchemaFile(f: GeneratedSchemaFile): string {
  return JSON.stringify(f.json, null, 2) + "\n"
}

export function buildContentEngineSchemaFiles(): GeneratedSchemaFile[] {
  const named = CONTENT_ENGINE_NAMED_SCHEMAS.map((s) => envelope(s))
  const index: GeneratedSchemaFile = {
    file: "index.json",
    json: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "index.json",
      title: "ALG Content Engine — hợp đồng dữ liệu",
      description: "Danh sách tệp JSON Schema của Content Engine (P27).",
      "x-alg": {
        module: "content-engine",
        source: CONTRACTS_SOURCE_DIR,
        generated: "SINH TỰ ĐỘNG — không sửa tay.",
      },
      schemas: CONTENT_ENGINE_NAMED_SCHEMAS.map((s, i) => ({
        name: s.name,
        title: s.title,
        source: s.sourceFile,
        file: named[i]!.file,
      })),
    },
  }
  return [index, ...named]
}
