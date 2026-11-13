/**
 * Đọc `product`/`passport`/`topic` của Brief v1 từ `product_analysis_runs`
 * (báo cáo Market Intelligence, `ProductIntelligenceReport`) — nguồn giàu
 * nhất đã có (thành phần hoa, bao bì, commercial passport, chủ đề cụ thể).
 * Không có lượt phân tích → lùi về dữ liệu ĐÃ DUYỆT của sản phẩm (Thẻ sản
 * phẩm, Bài giới thiệu, Thẻ chào — hành trình Tạo nội dung, PO 08/11/2026);
 * chưa duyệt gì → chỉ tên sản phẩm. KHÔNG suy đoán (nguyên tắc Brief mục 3).
 *
 * Hạ tầng — được phép import Prisma/repository (khác `domain/`).
 */

import type { TenantContext } from "@/core/tenancy"
import { prisma } from "@/core/tenancy/infra/prisma"
import { getMarketIntelligenceRepository } from "@/modules/market-intelligence/infra/market-intelligence-repository"
import type {
  ConcreteTopic,
  ProductIntelligenceReport,
} from "@/modules/market-intelligence/domain/product-intelligence-types"

import { readSalesPitch } from "@/modules/products/domain/sales-pitch-record"

import { projectApprovedProduct, type ApprovedProductSources } from "../domain/approved-product-context"
import type { RawPassportInput, RawProductInput, RawTopicInput } from "../domain/brief-builder"

export interface ProductBriefContext {
  readonly product: RawProductInput
  readonly passport: RawPassportInput | null
  readonly report: ProductIntelligenceReport | null
}

function projectProduct(productId: string | null, name: string, report: ProductIntelligenceReport | null): RawProductInput {
  if (!report) {
    return {
      productId,
      name,
      style: null,
      components: [],
      packaging: { wrappingMaterial: null, wrappingColor: null, ribbon: null, accessories: [], cardText: null },
      price: { exact: null, rangeLabel: null },
    }
  }
  return {
    productId,
    name: report.productName || name,
    style: report.attributes?.style ?? null,
    components: report.components.map((c) => ({
      flowerType: c.flowerType,
      quantityEstimate: c.quantityEstimate ?? null,
      unit: c.unit ?? null,
      role: c.role ?? null,
      color: c.color ?? null,
    })),
    packaging: {
      wrappingMaterial: report.packaging.wrappingMaterial || null,
      wrappingColor: report.packaging.wrappingColor || null,
      ribbon: report.packaging.ribbon || null,
      accessories: report.packaging.accessories ?? [],
      cardText: report.packaging.card?.printedText ?? null,
    },
    price: {
      exact: report.context?.suggestedPrice ?? null,
      rangeLabel: null,
    },
  }
}

function projectPassport(report: ProductIntelligenceReport | null): RawPassportInput | null {
  const p = report?.commercialPassport
  if (!p) return null
  return {
    sellingPoints: p.keySellingPoints ?? [],
    flowerMeaningStory: p.flowerMeaningStory ?? null,
    recipient: p.targetAudience?.recipient ?? null,
    buyerPersona: p.targetAudience?.buyerPersona ?? null,
    occasions: p.occasions ?? [],
    careInstructions: p.careInstructions ?? [],
    cardMessageSuggestions: p.cardMessageSuggestions ?? null,
  }
}

export function projectTopicFromReport(report: ProductIntelligenceReport | null, topicId?: string | null): RawTopicInput | null {
  if (!report || report.topics.length === 0) return null
  const found: ConcreteTopic | undefined = topicId ? report.topics.find((t) => t.id === topicId) : report.topics[0]
  if (!found) return null
  return {
    topicId: found.id,
    title: found.title,
    angleCategory: found.angleCategory ?? null,
    hook: found.hook ?? null,
    cta: found.cta ?? null,
    format: found.format ?? null,
    evidenceNote: found.evidenceNote ?? null,
  }
}

type Json = Record<string, unknown>

/** Bản quét / Bài giới thiệu ĐÃ DUYỆT mới nhất + Thẻ chào đã chốt; chưa có gì đã duyệt → `null` (giữ hành vi cũ). */
async function readApprovedSources(ctx: TenantContext, productId: string, productName: string, attributes: unknown): Promise<ApprovedProductSources | null> {
  const where = { organization_id: ctx.organizationId, product_id: productId, approval_state: "APPROVED" as const }
  const [analysis, copy] = await Promise.all([
    prisma.product_analyses.findFirst({ where, orderBy: [{ approved_at: "desc" }, { created_at: "desc" }] }),
    prisma.product_copies.findFirst({ where, orderBy: [{ approved_at: "desc" }, { created_at: "desc" }] }),
  ])
  const pitch = readSalesPitch(attributes)
  if (!analysis && !copy && !pitch) return null
  return {
    productId,
    productName,
    analysis: analysis ? ((analysis.edited as Json | null) ?? (analysis.raw as Json | null)) : null,
    copy: copy ? { ...((copy.raw as Json | null) ?? {}), ...((copy.edited as Json | null) ?? {}) } : null,
    pitch: pitch?.data ?? null,
  }
}

export async function readProductContext(
  ctx: TenantContext,
  input: { readonly productId?: string | null; readonly analysisRunId?: string | null }
): Promise<ProductBriefContext> {
  const run = input.analysisRunId
    ? await getMarketIntelligenceRepository().getProductAnalysisRun(ctx.organizationId, input.analysisRunId)
    : null
  const report = (run?.report as unknown as ProductIntelligenceReport | undefined) ?? null

  let fallbackName = "Sản phẩm"
  if (!report && input.productId) {
    const product = await prisma.products.findFirst({
      where: { organization_id: ctx.organizationId, id: input.productId },
    })
    if (product) {
      fallbackName = product.name
      // Không có báo cáo thị trường → dùng dữ liệu ĐÃ DUYỆT của sản phẩm (Thẻ sản phẩm, Bài giới thiệu, Thẻ chào)
      const approved = await readApprovedSources(ctx, product.id, product.name, product.attributes)
      if (approved) return { ...projectApprovedProduct(approved), report: null }
    }
  }

  return {
    product: projectProduct(input.productId ?? null, fallbackName, report),
    passport: projectPassport(report),
    report,
  }
}
