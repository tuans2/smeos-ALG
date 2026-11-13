/**
 * Content Brief v1 — hợp đồng zod duy nhất mà Content Engine (`P27`, quyết
 * định PO 25/09/2026) đọc để viết bài. Đây là "nơi duy nhất thêm thông tin
 * cho engine" (kế hoạch project claude.ai
 * `claude/ke-hoach-content-engine-core-25-09-2026.md` mục 3): thêm trường
 * thì tăng `BRIEF_VERSION`, sửa schema ở đây, có test — không sửa chỗ khác.
 *
 * Nguồn sự thật là zod; JSON Schema sinh tự động qua `json-schema.ts` +
 * `npm run gen:schemas:content-engine` (không sửa tay tệp `.json`).
 *
 * Thuần — không import Prisma, không gọi mạng. `brief-builder.ts` (domain)
 * lắp Brief từ dữ liệu đã đọc ở `infra/`.
 */

import { z } from "zod"

import { PACKAGE_CHANNELS } from "../../creative-production/domain/campaign-package-rules"

export const BRIEF_VERSION = 1 as const

export const briefChannelSchema = z.enum(PACKAGE_CHANNELS).describe("Kênh bài đăng: facebook | instagram | tiktok | zalo")

/**
 * Danh mục một "sự thật" — mọi câu chữ Writer viết ra phải bám vào ít nhất
 * một `fact_id`. Không có mục nào ở đây thì Writer KHÔNG được nhắc tới việc
 * đó (mục 1 tiêu chí #2 của kế hoạch: không bịa khuyến mãi/giá/cam kết).
 */
export const briefFactCategorySchema = z.enum([
  "product", // tên, dáng, phong cách bó hoa
  "component", // một loài hoa/phụ kiện cụ thể (loài, số cành, màu, vai trò)
  "packaging", // giấy gói, nơ, chữ trên thiệp
  "price", // giá thật hoặc khoảng giá
  "passport", // ý nghĩa loài hoa, điểm bán, hướng dẫn chăm, dịp
  "topic", // góc chủ đề, hook, CTA của chủ đề
  "story", // logline/cảm xúc/CTA của kịch bản Chặng 05
  "shop", // giọng tiệm, hashtag, CTA mặc định
  "offer", // ưu đãi THẬT do tiệm khai (default_offers) — không có mục này thì không được nói khuyến mãi
  "contact", // hotline, địa chỉ, giờ mở cửa, mạng xã hội
])

export type BriefFactCategory = z.infer<typeof briefFactCategorySchema>

export const briefFactSchema = z.object({
  factId: z.string().min(1),
  category: briefFactCategorySchema,
  text: z.string().min(1),
})
export type BriefFact = z.infer<typeof briefFactSchema>

export const briefComponentSchema = z.object({
  flowerType: z.string().min(1),
  quantityEstimate: z.number().nonnegative().nullish(),
  unit: z.string().nullish(),
  role: z.enum(["dominant", "supporting", "foliage"]).nullish(),
  color: z.string().nullish(),
})

export const briefProductSchema = z.object({
  productId: z.string().nullish(),
  name: z.string().min(1),
  style: z.string().nullish(),
  components: z.array(briefComponentSchema),
  packaging: z.object({
    wrappingMaterial: z.string().nullish(),
    wrappingColor: z.string().nullish(),
    ribbon: z.string().nullish(),
    accessories: z.array(z.string()),
    cardText: z.string().nullish().describe("Chữ trên thiệp — đọc qua OCR (`report.packaging.card.printedText`)"),
  }),
  price: z.object({
    exact: z.number().nonnegative().nullish(),
    rangeLabel: z.string().nullish().describe("Khoảng giá dạng câu, vd '450.000đ – 650.000đ'"),
  }),
})

export const briefPassportSchema = z.object({
  sellingPoints: z.array(z.string()),
  flowerMeaningStory: z.string().nullish(),
  recipient: z.string().nullish(),
  buyerPersona: z.string().nullish(),
  occasions: z.array(z.string()),
  careInstructions: z.array(z.string()),
  cardMessageSuggestions: z
    .object({
      romantic: z.string().nullish(),
      subtle: z.string().nullish(),
      congratulatory: z.string().nullish(),
    })
    .nullish(),
})

export const briefTopicSchema = z.object({
  topicId: z.string().nullish(),
  title: z.string().min(1),
  angleCategory: z.string().nullish(),
  hook: z.string().nullish(),
  cta: z.string().nullish(),
  format: z.string().nullish(),
  evidenceNote: z.string().nullish(),
})

export const briefStorySchema = z
  .object({
    scenePlanId: z.string().nullish(),
    mode: z.enum(["AUTHENTIC", "CREATIVE"]).nullish(),
    logline: z.string().nullish(),
    emotionalTone: z.string().nullish(),
    hook: z.string().nullish(),
    cta: z.string().nullish(),
    sceneLines: z.array(z.string()).describe("`voiceScript` từng cảnh, theo đúng thứ tự — Writer kể cùng câu chuyện"),
  })
  .nullish()
  .describe("Vắng khi chưa có kịch bản Chặng 05 (vd. gọi rời từ `/noi-dung`)")

export const briefDefaultOffersSchema = z.object({
  freeGifts: z.array(z.string()),
  guarantees: z.array(z.string()),
})

export const briefShopSchema = z.object({
  displayName: z.string().min(1),
  toneOfVoice: z.string().nullish(),
  hashtags: z.array(z.string()),
  ctaPhrase: z.string().nullish(),
  defaultOffers: briefDefaultOffersSchema,
  forbiddenStyles: z.array(z.string()),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  website: z.string().nullish(),
  operatingHours: z.string().nullish(),
  brandMessage: z.string().nullish(),
  targetCustomers: z.array(z.string()).optional(),
})

export const briefChannelRuleSchema = z.object({
  channel: briefChannelSchema,
  maxChars: z.number().int().positive(),
  targetCharsRange: z.tuple([z.number().int().positive(), z.number().int().positive()]),
  hashtagRange: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]),
  tone: z.string(),
  structureNote: z.string(),
  ctaStyle: z.string(),
})

export const briefRulesSchema = z.object({
  bannedPhraseCount: z.number().int().nonnegative().describe("Số mục trong từ điển từ cấm đầy đủ (không liệt kê hết vào brief, Writer nhận qua system prompt)"),
  forbiddenStyles: z.array(z.string()).describe("Trùng `shop.forbiddenStyles` — tách riêng để Rewriter đọc thẳng"),
  factsOnlyNotice: z.literal(
    "Chỉ được nói những gì có trong facts[]. Không tự thêm khuyến mãi, freeship, quà tặng, cam kết hay giá không có ở đây."
  ),
})

export const contentBriefSchema = z.object({
  briefVersion: z.literal(BRIEF_VERSION),
  organizationId: z.string().min(1),
  assetId: z.string().nullish(),
  product: briefProductSchema,
  passport: briefPassportSchema.nullish(),
  topic: briefTopicSchema,
  story: briefStorySchema,
  shop: briefShopSchema,
  channels: z.array(briefChannelRuleSchema).min(1),
  facts: z.array(briefFactSchema).min(1),
  rules: briefRulesSchema,
})

export type ContentBrief = z.infer<typeof contentBriefSchema>
export type BriefChannelRule = z.infer<typeof briefChannelRuleSchema>
