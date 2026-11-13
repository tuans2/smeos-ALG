/**
 * Use-case: Sinh nội dung hoàn chỉnh cho Landing Page 7-Section.
 *
 * Pipeline Option B Full (Writer → Critic):
 *   1. Writer AI sinh hero/story/perks/faq/lead qua cổng AI (callCapability)
 *   2. Critic AI kiểm factual + completeness → nếu thấp → re-generate 1 lần
 *   3. Fallback về template (generateLandingPageContent) khi AI hoàn toàn không gọi được
 *   4. ProductTruthValidator (LocalBudd TR-POL-001) kiểm sau cùng
 *
 * Kế thừa cơ chế Gateway + Circuit Breaker từ LocalBudd / SocialFlow.
 */

import { callCapability } from "@/core/ai/gateway"
import { log } from "@/core/observability/log"
import { aiGatewayDeps } from "@/core/ai/wiring"
import { createContentLLM } from "@/core/ai/adapters/multi-llm-provider"
import type { TenantContext } from "@/core/tenancy"
import { ACTIVE_PROMPTS } from "../domain/prompts/active"

import {
  generateLandingPageContent,
  type LandingContentInput,
  type GeneratedLandingPackage,
} from "../domain/landing-content-generator"
import { validateProductTruth } from "../domain/product-truth-validator"
import {
  createLandingWriterAdapter,
  createLandingCriticAdapter,
} from "../adapters/landing-catalog-ai-adapter"
import type { LandingWriterOutput } from "../domain/prompts/landing/v1"
import { findCliches, findUndeclaredPromises } from "../domain/landing-copy-guard"

const CRITIC_THRESHOLD = 0.65

/** Nhật ký nguồn nội dung + phiên bản prompt đang dùng (không ghi nội dung, không ghi dữ liệu khách). */
function logSource(ctx: TenantContext, source: "ai" | "template", reason?: string): void {
  log.info("landing_content.generated", {
    organizationId: ctx.organizationId,
    promptId: ACTIVE_PROMPTS.landingWriter.id,
    promptVersion: ACTIVE_PROMPTS.landingWriter.version,
    source,
    ...(reason ? { reason } : {}),
  })
}

/** Chuyển LandingWriterOutput → GeneratedLandingPackage (merge với template fallback cho section chưa có) */
function mergeWithTemplate(
  ai: LandingWriterOutput,
  template: GeneratedLandingPackage
): GeneratedLandingPackage {
  return {
    hero: {
      badge: ai.hero.badge || template.hero.badge,
      headline: ai.hero.headline || template.hero.headline,
      subHeadline: ai.hero.subHeadline || template.hero.subHeadline,
      countdownLabel: template.hero.countdownLabel,
    },
    story: {
      title: ai.story.title || template.story.title,
      paragraphs: [
        ai.story.paragraph1 || template.story.paragraphs[0] || "",
        ai.story.paragraph2 || template.story.paragraphs[1] || "",
      ].filter(Boolean),
      quote: ai.story.quote || template.story.quote,
      floristName: template.story.floristName,
    },
    perks: ai.perks.length > 0
      ? ai.perks.map((p, i) => ({
          id: `perk-${i + 1}`,
          title: p.title,
          description: p.description,
          icon: (["camera", "clock", "shield", "gift"] as const)[i % 4]!,
        }))
      : template.perks,
    steps: template.steps,
    faq: ai.faq.length > 0
      ? ai.faq.map((f) => ({ question: f.question, answer: f.answer }))
      : template.faq,
    lead: {
      tag: template.lead.tag,
      title: ai.lead.title || template.lead.title,
      description: ai.lead.description || template.lead.description,
      discountBadge: template.lead.discountBadge,
      urgencyNotice: template.lead.urgencyNotice,
    },
  }
}

function copyGuardIssues(ai: LandingWriterOutput, declared: readonly string[]): string[] {
  const text = [
    ai.hero.badge, ai.hero.headline, ai.hero.subHeadline,
    ai.story.title, ai.story.paragraph1, ai.story.paragraph2, ai.story.quote,
    ...ai.perks.flatMap((p) => [p.title, p.description]),
    ...ai.faq.flatMap((f) => [f.question, f.answer]),
    ai.lead.title, ai.lead.description,
  ].join("\n")
  return [...findCliches(text), ...findUndeclaredPromises(text, declared)]
}

/** Sau lần viết lại vẫn còn lời hứa chưa khai → bỏ mục đó (perk/FAQ) hoặc trả phần đó về bản mẫu (hero/story). */
function dropUndeclaredPromises(
  pkg: GeneratedLandingPackage,
  template: GeneratedLandingPackage,
  declared: readonly string[]
): GeneratedLandingPackage {
  const has = (t: string) => findUndeclaredPromises(t, declared).length > 0
  return {
    ...pkg,
    hero: has(`${pkg.hero.headline} ${pkg.hero.subHeadline} ${pkg.hero.badge}`) ? template.hero : pkg.hero,
    story: has([pkg.story.title, ...pkg.story.paragraphs, pkg.story.quote].join(" ")) ? template.story : pkg.story,
    perks: pkg.perks.filter((p) => !has(`${p.title} ${p.description}`)),
    faq: pkg.faq.filter((f) => !has(`${f.question} ${f.answer}`)),
  }
}

export async function executeGenerateLandingContent(
  input: LandingContentInput,
  ctx?: TenantContext
): Promise<GeneratedLandingPackage> {
  // Template luôn được tính sẵn làm fallback
  const template = generateLandingPageContent(input)

  // Nếu không có TenantContext (gọi từ test hay client-side) → dùng template
  if (!ctx) return template

  try {
    const llm = createContentLLM()
    const deps = aiGatewayDeps(ctx)

    const writerInput = {
      shopName: input.shopName,
      shopTone: input.shopTone as string | undefined,
      occasionId: input.occasionId,
      occasionLabel: input.occasionLabel,
      archetypeId: input.archetypeId,
      selectedProducts: input.selectedProducts,
      userDirectives: input.userDirectives,
      discountPercent: input.discountPercent,
      pageGoal: input.pageGoal,
      usps: input.usps,
      guarantees: input.guarantees,
      targetAudience: input.targetAudience,
    }
    // Lời hứa chỉ hợp lệ khi tiệm đã tự khai trong điểm mạnh / cam kết
    const declared = [...(input.usps ?? []), ...(input.guarantees ?? [])]

    // 1. Writer AI
    const writerResult = await callCapability(
      {
        capability: "content_generation",
        privacy: "SHOP",
        source: "CORE",
        jobId: null,
      },
      createLandingWriterAdapter(llm, writerInput, ctx.organizationId),
      deps
    )

    if (writerResult.kind === "khong_chay_duoc") {
      // AI không chạy được → fallback template
      logSource(ctx, "template", "ai_unavailable")
      return template
    }

    let aiOutput = writerResult.output

    // 2. Critic AI — kiểm factual + completeness
    const criticResult = await callCapability(
      {
        capability: "content_qa",
        privacy: "SHOP",
        source: "CORE",
        jobId: null,
      },
      createLandingCriticAdapter(
        llm,
        {
          shopName: input.shopName,
          occasionLabel: input.occasionLabel,
          output: aiOutput,
          selectedProducts: input.selectedProducts,
        },
        ctx.organizationId
      ),
      deps
    )

    // Kiểm chữ tất định: cụm sáo rỗng + lời hứa chưa khai → yêu cầu viết lại (tối đa 1 lần, gộp với Critic)
    const guardIssues = copyGuardIssues(aiOutput, declared)
    const criticLow =
      criticResult.kind === "xong" &&
      (criticResult.output.factual + criticResult.output.completeness) / 2 < CRITIC_THRESHOLD &&
      !!criticResult.output.fixInstructions
    if (criticLow || guardIssues.length > 0) {
      const fixes = [
        criticLow && criticResult.kind === "xong" ? criticResult.output.fixInstructions : "",
        guardIssues.length > 0 ? `Bỏ hoặc viết lại các cụm: ${guardIssues.join("; ")}` : "",
      ].filter(Boolean)
      const retryInput = {
        ...writerInput,
        userDirectives: [input.userDirectives, `[Sửa lỗi] ${fixes.join(" | ")}`].filter(Boolean).join("\n"),
      }
      const retryResult = await callCapability(
        { capability: "content_generation", privacy: "SHOP", source: "CORE", jobId: null },
        createLandingWriterAdapter(llm, retryInput, ctx.organizationId),
        deps
      )
      if (retryResult.kind === "xong") {
        aiOutput = retryResult.output
      }
    }

    // 3. Merge AI output với template (giữ các section AI không sinh được)
    const merged = mergeWithTemplate(aiOutput, template)

    // 4. ProductTruthValidator (TR-POL-001 từ LocalBudd)
    const validation = validateProductTruth(
      input.selectedProducts.map((p) => ({ name: p.name, code: p.code, price: p.price })),
      { headline: merged.hero.headline, subHeadline: merged.hero.subHeadline, paragraphs: merged.story.paragraphs }
    )
    if (!validation.isValid) {
      // Hallucination phát hiện → khôi phục hero về template (an toàn)
      merged.hero.headline = template.hero.headline
      merged.hero.subHeadline = template.hero.subHeadline
    }

    logSource(ctx, "ai")
    return dropUndeclaredPromises(merged, template, declared)
  } catch {
    logSource(ctx, "template", "error")
    // Mọi lỗi network / timeout → fallback template, không để job FAILED
    return template
  }
}
