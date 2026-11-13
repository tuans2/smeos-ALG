/**
 * Use-case: Sinh nội dung cho Catalogue Số Trực Tuyến.
 * Tích hợp 3 phong cách: EDITORIAL_LOOKBOOK, MODERN_SHOWROOM, COMPACT_LIST.
 *
 * Pipeline Option B Full (Writer → Critic):
 *   1. Writer AI sinh badge, description, curatorNote, ctaText qua cổng AI (callCapability)
 *   2. Critic AI kiểm factual + completeness theo đúng phong cách Catalogue
 *   3. Kiểm duyệt từ cấm ngành hoa (flower-banned-dictionary)
 *   4. Fallback về domain template khi AI không gọi được hoặc vi phạm
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
  generateCatalogContent,
  type CatalogContentInput,
  type GeneratedCatalogContent,
} from "../domain/catalog-content-generator"
import { findBannedPhrases } from "../domain/flower-banned-dictionary"
import { findUndeclaredPromises } from "../domain/landing-copy-guard"
import {
  createCatalogWriterAdapter,
  createCatalogCriticAdapter,
} from "../adapters/landing-catalog-ai-adapter"

const CRITIC_THRESHOLD = 0.65

/** Nhật ký nguồn nội dung + phiên bản prompt đang dùng (không ghi nội dung, không ghi dữ liệu khách). */
function logSource(ctx: TenantContext, source: "ai" | "template", reason?: string): void {
  log.info("catalog_content.generated", {
    organizationId: ctx.organizationId,
    promptId: ACTIVE_PROMPTS.catalogWriter.id,
    promptVersion: ACTIVE_PROMPTS.catalogWriter.version,
    source,
    ...(reason ? { reason } : {}),
  })
}

export async function executeGenerateCatalogContent(
  input: CatalogContentInput,
  ctx?: TenantContext
): Promise<GeneratedCatalogContent> {
  const template = generateCatalogContent(input)

  if (!ctx) return template

  try {
    const llm = createContentLLM()
    const deps = aiGatewayDeps(ctx)

    const writerInput = {
      shopName: input.shopName,
      collectionName: input.collectionName,
      occasion: input.occasion,
      productCount: input.productCount,
      styleVariant: input.styleVariant,
      userDirectives: input.userDirectives,
      sellingNotes: input.sellingNotes,
    }

    // 1. Writer AI
    const writerResult = await callCapability(
      {
        capability: "content_generation",
        privacy: "SHOP",
        source: "CORE",
        jobId: null,
      },
      createCatalogWriterAdapter(llm, writerInput, ctx.organizationId),
      deps
    )

    if (writerResult.kind === "khong_chay_duoc") {
      logSource(ctx, "template", "ai_unavailable")
      return template
    }

    let aiOutput = writerResult.output

    // 2. Critic AI
    const criticResult = await callCapability(
      {
        capability: "content_qa",
        privacy: "SHOP",
        source: "CORE",
        jobId: null,
      },
      createCatalogCriticAdapter(
        llm,
        {
          shopName: input.shopName,
          collectionName: input.collectionName,
          occasion: input.occasion,
          productCount: input.productCount,
          styleVariant: input.styleVariant,
          output: aiOutput,
        },
        ctx.organizationId
      ),
      deps
    )

    if (criticResult.kind === "xong") {
      const { factual, completeness } = criticResult.output
      const avgScore = (factual + completeness) / 2

      if (avgScore < CRITIC_THRESHOLD && criticResult.output.fixInstructions) {
        const retryInput = {
          ...writerInput,
          userDirectives: [input.userDirectives, `[Yêu cầu sửa] ${criticResult.output.fixInstructions}`]
            .filter(Boolean)
            .join("\n"),
        }
        const retryResult = await callCapability(
          { capability: "content_generation", privacy: "SHOP", source: "CORE", jobId: null },
          createCatalogWriterAdapter(llm, retryInput, ctx.organizationId),
          deps
        )
        if (retryResult.kind === "xong") {
          aiOutput = retryResult.output
        }
      }
    }

    // 3. Kiểm từ cấm ngành hoa
    const combinedText = `${aiOutput.badge} ${aiOutput.description} ${aiOutput.curatorNote}`
    const banned = findBannedPhrases(combinedText)
    // Lời hứa (giờ giao, độ tươi, miễn phí, 100%…) — catalog không có nơi tiệm khai cam kết nên không được hứa
    if (banned.length > 0 || findUndeclaredPromises(combinedText).length > 0) {
      logSource(ctx, "template", "copy_guard")
      return template
    }

    logSource(ctx, "ai")
    return {
      styleVariant: input.styleVariant,
      badge: aiOutput.badge || template.badge,
      title: input.collectionName,
      description: aiOutput.description || template.description,
      curatorNote: aiOutput.curatorNote || template.curatorNote,
      ctaText: aiOutput.ctaText || template.ctaText,
    }
  } catch {
    logSource(ctx, "template", "error")
    return template
  }
}
