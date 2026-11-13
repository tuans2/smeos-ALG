/**
 * `buildContentBrief` — lắp Brief v1 (`contracts/brief.ts`) từ dữ liệu ĐÃ ĐỌC
 * (kế hoạch project claude.ai `claude/ke-hoach-content-engine-core-25-09-2026.md`
 * mục 3 và 8 Đợt 1). Hàm này THUẦN: nhận vào các đối tượng phẳng do `infra/`
 * đọc từ DB rồi lắp lại — không tự đọc DB, không gọi mạng, để test được mà
 * không cần Prisma (AGENTS.md: domain/ phải thuần).
 *
 * Nguyên tắc "chỉ nói những gì có trong facts": builder tự sinh `facts[]` từ
 * đúng những trường có giá trị ở các khối vào — thiếu trường nào thì KHÔNG có
 * fact tương ứng, không suy đoán, không điền mặc định giả.
 */

import { CHANNEL_SPECS } from "./channel-specs"
import {
  BRIEF_VERSION,
  type BriefFact,
  type BriefFactCategory,
  type ContentBrief,
} from "../contracts/brief"
import type { PackageChannel } from "../../creative-production/domain/campaign-package-rules"
import { getDefaultFlowerRules } from "@/core/ai/domain/flower-content-guard"

// ============================================================
// KIỂU DỮ LIỆU VÀO (đã đọc từ infra/, phẳng, không phụ thuộc Prisma)
// ============================================================

export interface RawProductComponent {
  readonly flowerType: string
  readonly quantityEstimate?: number | null | undefined
  readonly unit?: string | null | undefined
  readonly role?: "dominant" | "supporting" | "foliage" | null | undefined
  readonly color?: string | null | undefined
}

export interface RawProductInput {
  readonly productId?: string | null | undefined
  readonly name: string
  readonly style?: string | null | undefined
  readonly components: readonly RawProductComponent[]
  readonly packaging: {
    readonly wrappingMaterial?: string | null | undefined
    readonly wrappingColor?: string | null | undefined
    readonly ribbon?: string | null | undefined
    readonly accessories: readonly string[]
    readonly cardText?: string | null | undefined
  }
  readonly price: {
    readonly exact?: number | null | undefined
    readonly rangeLabel?: string | null | undefined
  }
}

export interface RawPassportInput {
  readonly sellingPoints?: readonly string[] | undefined
  readonly flowerMeaningStory?: string | null | undefined
  readonly recipient?: string | null | undefined
  readonly buyerPersona?: string | null | undefined
  readonly occasions?: readonly string[] | undefined
  readonly careInstructions?: readonly string[] | undefined
  readonly cardMessageSuggestions?:
    | { readonly romantic?: string | null; readonly subtle?: string | null; readonly congratulatory?: string | null }
    | null
    | undefined
}

export interface RawTopicInput {
  readonly topicId?: string | null | undefined
  readonly title: string
  readonly angleCategory?: string | null | undefined
  readonly hook?: string | null | undefined
  readonly cta?: string | null | undefined
  readonly format?: string | null | undefined
  readonly evidenceNote?: string | null | undefined
}

export interface RawStoryInput {
  readonly scenePlanId?: string | null | undefined
  readonly mode?: "AUTHENTIC" | "CREATIVE" | null | undefined
  readonly logline?: string | null | undefined
  readonly emotionalTone?: string | null | undefined
  readonly hook?: string | null | undefined
  readonly cta?: string | null | undefined
  readonly sceneLines?: readonly string[] | undefined
}

export interface RawShopInput {
  readonly displayName: string
  readonly toneOfVoice?: string | null | undefined
  readonly hashtags?: readonly string[] | null | undefined
  readonly ctaPhrase?: string | null | undefined
  readonly defaultOffers?: { readonly freeGifts?: readonly string[]; readonly guarantees?: readonly string[] } | null | undefined
  readonly forbiddenStyles?: readonly string[] | null | undefined
  readonly phone?: string | null | undefined
  readonly address?: string | null | undefined
  readonly website?: string | null | undefined
  readonly operatingHours?: string | null | undefined
  /** Thông điệp thương hiệu và khách mục tiêu (checklist ALG 9.3) */
  readonly brandMessage?: string | null | undefined
  readonly targetCustomers?: readonly string[] | null | undefined
}

export interface BuildContentBriefInput {
  readonly organizationId: string
  readonly assetId?: string | null | undefined
  readonly product: RawProductInput
  readonly passport?: RawPassportInput | null | undefined
  readonly topic: RawTopicInput
  readonly story?: RawStoryInput | null | undefined
  readonly shop: RawShopInput
  readonly channels: readonly PackageChannel[]
}

// ============================================================
// BUILDER
// ============================================================

let factSeq = 0
function fact(category: BriefFactCategory, text: string | null | undefined): BriefFact | null {
  if (!text || !text.trim()) return null
  factSeq += 1
  return { factId: `F${factSeq}`, category, text: text.trim() }
}

export function buildContentBrief(input: BuildContentBriefInput): ContentBrief {
  factSeq = 0 // một Brief một lượt đếm — factId ổn định trong phạm vi một lần build

  const product = input.product
  const passport = input.passport ?? null
  const shop = input.shop
  const story = input.story ?? null

  const facts: (BriefFact | null)[] = []

  facts.push(fact("product", `Sản phẩm: ${product.name}${product.style ? ` — phong cách ${product.style}` : ""}`))
  for (const c of product.components) {
    const qty = c.quantityEstimate != null ? `${c.quantityEstimate}${c.unit ? ` ${c.unit}` : ""} ` : ""
    facts.push(fact("component", `${qty}${c.flowerType}${c.color ? `, màu ${c.color}` : ""}${c.role ? ` (${c.role})` : ""}`))
  }
  if (product.packaging.wrappingMaterial || product.packaging.ribbon) {
    facts.push(
      fact(
        "packaging",
        `Gói: ${[product.packaging.wrappingMaterial, product.packaging.wrappingColor].filter(Boolean).join(" ")}${
          product.packaging.ribbon ? `, nơ ${product.packaging.ribbon}` : ""
        }`
      )
    )
  }
  for (const acc of product.packaging.accessories) facts.push(fact("packaging", `Phụ kiện: ${acc}`))
  if (product.packaging.cardText) facts.push(fact("packaging", `Chữ trên thiệp: "${product.packaging.cardText}"`))
  if (product.price.exact != null) facts.push(fact("price", `Giá: ${product.price.exact.toLocaleString("vi-VN")}đ`))
  else if (product.price.rangeLabel) facts.push(fact("price", `Khoảng giá: ${product.price.rangeLabel}`))

  if (passport) {
    for (const sp of passport.sellingPoints ?? []) facts.push(fact("passport", sp))
    if (passport.flowerMeaningStory) facts.push(fact("passport", passport.flowerMeaningStory))
    for (const o of passport.occasions ?? []) facts.push(fact("passport", `Dịp phù hợp: ${o}`))
  }

  facts.push(fact("topic", `Chủ đề: ${input.topic.title}`))
  if (input.topic.hook) facts.push(fact("topic", `Hook gợi ý: ${input.topic.hook}`))
  if (input.topic.cta) facts.push(fact("topic", `CTA gợi ý: ${input.topic.cta}`))

  if (story) {
    if (story.logline) facts.push(fact("story", `Câu chuyện: ${story.logline}`))
    if (story.hook) facts.push(fact("story", `Mở đầu: ${story.hook}`))
    if (story.cta) facts.push(fact("story", `Kêu gọi hành động: ${story.cta}`))
  }

  facts.push(fact("shop", `Tiệm: ${shop.displayName}`))
  if (shop.toneOfVoice) facts.push(fact("shop", `Giọng văn: ${shop.toneOfVoice}`))
  if (shop.ctaPhrase) facts.push(fact("shop", `CTA mặc định của tiệm: ${shop.ctaPhrase}`))
  if (shop.brandMessage) facts.push(fact("shop", `Thông điệp thương hiệu: ${shop.brandMessage}`))
  if (shop.targetCustomers?.length) facts.push(fact("shop", `Khách mục tiêu: ${shop.targetCustomers.join(", ")}`))

  const freeGifts = shop.defaultOffers?.freeGifts ?? []
  const guarantees = shop.defaultOffers?.guarantees ?? []
  for (const g of freeGifts) facts.push(fact("offer", `Quà tặng kèm: ${g}`))
  for (const g of guarantees) facts.push(fact("offer", `Cam kết: ${g}`))

  if (shop.phone) facts.push(fact("contact", `Hotline: ${shop.phone}`))
  if (shop.address) facts.push(fact("contact", `Địa chỉ: ${shop.address}`))
  if (shop.operatingHours) facts.push(fact("contact", `Giờ mở cửa: ${shop.operatingHours}`))

  const cleanFacts = facts.filter((f): f is BriefFact => f !== null)

  const forbiddenStyles = (shop.forbiddenStyles ?? []).filter((s) => s.trim().length > 0)

  const brief: ContentBrief = {
    briefVersion: BRIEF_VERSION,
    organizationId: input.organizationId,
    assetId: input.assetId ?? null,
    product: {
      productId: product.productId ?? null,
      name: product.name,
      style: product.style ?? null,
      components: product.components.map((c) => ({
        flowerType: c.flowerType,
        quantityEstimate: c.quantityEstimate ?? null,
        unit: c.unit ?? null,
        role: c.role ?? null,
        color: c.color ?? null,
      })),
      packaging: {
        wrappingMaterial: product.packaging.wrappingMaterial ?? null,
        wrappingColor: product.packaging.wrappingColor ?? null,
        ribbon: product.packaging.ribbon ?? null,
        accessories: [...product.packaging.accessories],
        cardText: product.packaging.cardText ?? null,
      },
      price: {
        exact: product.price.exact ?? null,
        rangeLabel: product.price.rangeLabel ?? null,
      },
    },
    passport: passport
      ? {
          sellingPoints: [...(passport.sellingPoints ?? [])],
          flowerMeaningStory: passport.flowerMeaningStory ?? null,
          recipient: passport.recipient ?? null,
          buyerPersona: passport.buyerPersona ?? null,
          occasions: [...(passport.occasions ?? [])],
          careInstructions: [...(passport.careInstructions ?? [])],
          cardMessageSuggestions: passport.cardMessageSuggestions
            ? {
                romantic: passport.cardMessageSuggestions.romantic ?? null,
                subtle: passport.cardMessageSuggestions.subtle ?? null,
                congratulatory: passport.cardMessageSuggestions.congratulatory ?? null,
              }
            : null,
        }
      : null,
    topic: {
      topicId: input.topic.topicId ?? null,
      title: input.topic.title,
      angleCategory: input.topic.angleCategory ?? null,
      hook: input.topic.hook ?? null,
      cta: input.topic.cta ?? null,
      format: input.topic.format ?? null,
      evidenceNote: input.topic.evidenceNote ?? null,
    },
    story: story
      ? {
          scenePlanId: story.scenePlanId ?? null,
          mode: story.mode ?? null,
          logline: story.logline ?? null,
          emotionalTone: story.emotionalTone ?? null,
          hook: story.hook ?? null,
          cta: story.cta ?? null,
          sceneLines: [...(story.sceneLines ?? [])],
        }
      : null,
    shop: {
      displayName: shop.displayName,
      toneOfVoice: shop.toneOfVoice ?? null,
      hashtags: [...(shop.hashtags ?? [])],
      ctaPhrase: shop.ctaPhrase ?? null,
      defaultOffers: { freeGifts: [...freeGifts], guarantees: [...guarantees] },
      forbiddenStyles: [...forbiddenStyles],
      phone: shop.phone ?? null,
      address: shop.address ?? null,
      website: shop.website ?? null,
      operatingHours: shop.operatingHours ?? null,
      brandMessage: shop.brandMessage ?? null,
      targetCustomers: [...(shop.targetCustomers ?? [])],
    },
    channels: input.channels.map((ch) => {
      const spec = CHANNEL_SPECS[ch]
      return {
        channel: ch,
        maxChars: spec.maxChars,
        targetCharsRange: [spec.targetCharsRange[0], spec.targetCharsRange[1]] as [number, number],
        hashtagRange: [spec.hashtagRange[0], spec.hashtagRange[1]] as [number, number],
        tone: spec.tone,
        structureNote: spec.structureNote,
        ctaStyle: spec.ctaStyle,
      }
    }),
    facts: cleanFacts,
    rules: {
      bannedPhraseCount: getDefaultFlowerRules().length,
      forbiddenStyles: [...forbiddenStyles],
      factsOnlyNotice:
        "Chỉ được nói những gì có trong facts[]. Không tự thêm khuyến mãi, freeship, quà tặng, cam kết hay giá không có ở đây.",
    },
  }

  return brief
}
