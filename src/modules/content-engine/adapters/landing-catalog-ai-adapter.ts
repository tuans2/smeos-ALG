/**
 * Landing & Catalog AI Adapter.
 *
 * Nối Writer (landing_writer / catalog_writer) và Critic đơn giản
 * vào cổng AI (`callCapability`). Kế thừa cơ chế của LocalBudd / SocialFlow:
 *   - Gọi LLM qua LLMProvider port (không gọi SDK trực tiếp)
 *   - AdapterRun<O> trả về AdapterOutcome<O>
 *   - Critic kiểm tra factual (không bịa giá/tên ngoài input)
 *
 * Không import Prisma. CÓ gọi mạng qua LLMProvider.
 */

import type { AiModelCandidate } from "@/core/ai/domain/routing"
import type { AdapterOutcome } from "@/core/ai/gateway"
import type { LLMProvider, LLMResponse } from "@/core/ports/llm-provider"

import { ACTIVE_PROMPTS } from "../domain/prompts/active"
import type { LandingWriterInput, LandingWriterOutput } from "../domain/prompts/landing/v1"
import type { LandingWriterInputV2 } from "../domain/prompts/landing/v2"
import type { CatalogWriterOutput } from "../domain/prompts/catalog/v1"
import type { CatalogWriterInputV2 } from "../domain/prompts/catalog/v2"

// ── Helpers ──────────────────────────────────────────────────────────────────

function withUsage<T>(result: AdapterOutcome<T>, response: LLMResponse): AdapterOutcome<T> {
  if (response.costUsd !== undefined) Object.assign(result, { costUsd: response.costUsd })
  if (response.inputTokens !== undefined) Object.assign(result, { inputTokens: response.inputTokens })
  if (response.outputTokens !== undefined) Object.assign(result, { outputTokens: response.outputTokens })
  return result
}

function parseJson(text: string): unknown {
  try {
    // Tách JSON block nếu LLM bọc trong markdown code fence
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    return JSON.parse(match ? match[1]! : text)
  } catch {
    throw new Error("Mô hình trả về không phải JSON hợp lệ")
  }
}

/** Kiểm tra factual đơn giản: nội dung không được chứa số tiền bịa ngoài sản phẩm. */
function brandScore(output: string, knownPrices: number[]): number {
  // Tìm mọi số >= 10000 trong output (giá tiền VNĐ)
  const foundPrices = [...output.matchAll(/(\d[\d.,]+)/g)]
    .map((m) => Number(m[1]!.replace(/[.,]/g, "")))
    .filter((n) => n >= 10000)

  if (foundPrices.length === 0) return 1
  if (knownPrices.length === 0) return 0.8 // không có sản phẩm → không thể verify chặt

  const hasFake = foundPrices.some((found) =>
    !knownPrices.some((real) => Math.abs(found - real) / real < 0.05)
  )
  return hasFake ? 0.5 : 1
}

const LANDING_TIMEOUT_MS = 25_000
const CATALOG_TIMEOUT_MS = 15_000

// ── Landing Page Writer ───────────────────────────────────────────────────────

export function createLandingWriterAdapter(llm: LLMProvider, input: LandingWriterInputV2, organizationId: string) {
  return async (model: AiModelCandidate): Promise<AdapterOutcome<LandingWriterOutput>> => {
    const t0 = Date.now()
    try {
      const response = await llm.complete({
        organizationId,
        prompt: ACTIVE_PROMPTS.landingWriter.build(input),
        model: model.key,
        timeoutMs: LANDING_TIMEOUT_MS,
        jsonSchema: ACTIVE_PROMPTS.landingWriter.jsonSchema(),
        maxTokens: 2000,
      })
      const r = ACTIVE_PROMPTS.landingWriter.normalize(parseJson(response.text))
      if (!r.ok) throw new Error(r.reason)

      const knownPrices = input.selectedProducts
        .map((p) => p.price ?? 0)
        .filter((p) => p > 0)
      const brand = brandScore(r.output.hero.headline + r.output.story.paragraph1, knownPrices)

      return withUsage(
        { ok: true, output: r.output, scores: { factual: brand, brand }, latencyMs: Date.now() - t0 },
        response
      )
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Lỗi không xác định" }
    }
  }
}

// ── Landing Page Critic (kiểm factual và độ hoàn chỉnh) ──────────────────────

export interface LandingCriticInput {
  readonly shopName: string
  readonly occasionLabel: string
  readonly output: LandingWriterOutput
  readonly selectedProducts: LandingWriterInput["selectedProducts"]
}

export interface LandingCriticOutput {
  readonly factual: number   // 0–1
  readonly completeness: number // 0–1
  readonly issues: string[]
  readonly fixInstructions: string
}

export function createLandingCriticAdapter(llm: LLMProvider, input: LandingCriticInput, organizationId: string) {
  return async (model: AiModelCandidate): Promise<AdapterOutcome<LandingCriticOutput>> => {
    const t0 = Date.now()
    const prompt = `Bạn là biên tập viên kiểm duyệt nội dung Landing Page tiệm hoa. Đánh giá bản nháp dưới đây.

TIỆM: ${input.shopName}
DỊP: ${input.occasionLabel}
SẢN PHẨM THẬT: ${input.selectedProducts.map((p) => p.name).join(", ") || "(không có)"}

BẢN NHÁP:
Headline: ${input.output.hero.headline}
SubHeadline: ${input.output.hero.subHeadline}
Story: ${input.output.story.paragraph1}
Perks: ${input.output.perks.map((p) => p.title).join(" | ")}
FAQ: ${input.output.faq.map((q) => q.question).slice(0, 2).join(" | ")}

TIÊU CHÍ:
- factual (0–1): Có bịa giá, tên sản phẩm, cam kết ngoài sự thật không?
- completeness (0–1): Headline CỤ THỂ (loài hoa/màu/người nhận/dịp, không câu chung chung dùng được cho mọi tiệm), story có hình ảnh cụ thể, không cụm sáo rỗng, không hứa giờ giao/độ tươi/miễn phí/100% khi tiệm chưa khai?

Trả về JSON: { "factual": number, "completeness": number, "issues": string[], "fix_instructions": string }. Không thêm lời dẫn.`

    try {
      const response = await llm.complete({
        organizationId,
        prompt,
        model: model.key,
        timeoutMs: CATALOG_TIMEOUT_MS,
        maxTokens: 600,
      })
      const raw = parseJson(response.text) as Record<string, unknown>
      const factual = typeof raw.factual === "number" ? Math.min(1, Math.max(0, raw.factual)) : 0.8
      const completeness = typeof raw.completeness === "number" ? Math.min(1, Math.max(0, raw.completeness)) : 0.8
      const issues = Array.isArray(raw.issues) ? raw.issues.map((i) => String(i)).slice(0, 10) : []
      const fixInstructions = typeof raw.fix_instructions === "string" ? raw.fix_instructions.slice(0, 500) : ""

      return withUsage(
        { ok: true, output: { factual, completeness, issues, fixInstructions }, scores: { factual, brand: completeness }, latencyMs: Date.now() - t0 },
        response
      )
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Lỗi không xác định" }
    }
  }
}

// ── Catalog Writer ────────────────────────────────────────────────────────────

export function createCatalogWriterAdapter(llm: LLMProvider, input: CatalogWriterInputV2, organizationId: string) {
  return async (model: AiModelCandidate): Promise<AdapterOutcome<CatalogWriterOutput>> => {
    const t0 = Date.now()
    try {
      const response = await llm.complete({
        organizationId,
        prompt: ACTIVE_PROMPTS.catalogWriter.build(input),
        model: model.key,
        timeoutMs: CATALOG_TIMEOUT_MS,
        jsonSchema: ACTIVE_PROMPTS.catalogWriter.jsonSchema(),
        maxTokens: 600,
      })
      const r = ACTIVE_PROMPTS.catalogWriter.normalize(parseJson(response.text))
      if (!r.ok) throw new Error(r.reason)

      return withUsage(
        { ok: true, output: r.output, scores: { factual: 1, brand: 1 }, latencyMs: Date.now() - t0 },
        response
      )
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Lỗi không xác định" }
    }
  }
}

// ── Catalog Critic (kiểm tra tính chính xác và phù hợp phong cách) ──────────────

export interface CatalogCriticInput {
  readonly shopName: string
  readonly collectionName: string
  readonly occasion: string | undefined
  readonly productCount: number
  readonly styleVariant: string
  readonly output: CatalogWriterOutput
}

export interface CatalogCriticOutput {
  readonly factual: number      // 0–1
  readonly completeness: number // 0–1
  readonly issues: string[]
  readonly fixInstructions: string
}

export function createCatalogCriticAdapter(llm: LLMProvider, input: CatalogCriticInput, organizationId: string) {
  return async (model: AiModelCandidate): Promise<AdapterOutcome<CatalogCriticOutput>> => {
    const t0 = Date.now()
    const prompt = `Bạn là biên tập viên kiểm duyệt nội dung Catalogue tiệm hoa. Đánh giá bản nháp sau:

TIỆM: ${input.shopName}
BỘ SƯU TẬP: ${input.collectionName}
DỊP: ${input.occasion || "Đa dụng"}
SỐ LƯỢNG MẪU THẬT: ${input.productCount} mẫu
PHONG CÁCH: ${input.styleVariant}

BẢN NHÁP:
- Badge: ${input.output.badge}
- Description: ${input.output.description}
- Curator Note: ${input.output.curatorNote}
- CTA: ${input.output.ctaText}

TIÊU CHÍ:
1. factual (0–1): Có bịa sai số lượng (${input.productCount} mẫu), tên tiệm, hoặc cam kết sai sự thật không?
2. completeness (0–1): Có đúng phong cách ${input.styleVariant}, văn phong tiệm hoa Việt Nam, hấp dẫn không?

Trả về JSON (không thêm lời dẫn):
{ "factual": number, "completeness": number, "issues": string[], "fix_instructions": string }`

    try {
      const response = await llm.complete({
        organizationId,
        prompt,
        model: model.key,
        timeoutMs: CATALOG_TIMEOUT_MS,
        maxTokens: 500,
      })
      const raw = parseJson(response.text) as Record<string, unknown>
      const factual = typeof raw.factual === "number" ? Math.min(1, Math.max(0, raw.factual)) : 0.8
      const completeness = typeof raw.completeness === "number" ? Math.min(1, Math.max(0, raw.completeness)) : 0.8
      const issues = Array.isArray(raw.issues) ? raw.issues.map((i) => String(i)).slice(0, 10) : []
      const fixInstructions = typeof raw.fix_instructions === "string" ? raw.fix_instructions.slice(0, 500) : ""

      return withUsage(
        { ok: true, output: { factual, completeness, issues, fixInstructions }, scores: { factual, brand: completeness }, latencyMs: Date.now() - t0 },
        response
      )
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Lỗi không xác định" }
    }
  }
}

