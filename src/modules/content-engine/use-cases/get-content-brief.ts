/**
 * `getContentBrief` — Đợt 1 use-case duy nhất lắp một Brief v1 hoàn chỉnh:
 * gọi 3 đầu đọc hạ tầng (`read-product-context`, `read-shop-context`,
 * `read-story-context`) song song rồi giao cho `buildContentBrief` (domain,
 * thuần) lắp lại. Đây là điểm vào mà Đợt 2 (chuỗi agent Strategist/Writer/
 * Critic/Rewriter) và API `/api/v1/content-engine/generations` sẽ gọi để
 * lấy Brief trước khi viết bài.
 *
 * Không tự suy đoán chủ đề: thiếu topic từ báo cáo Market Intelligence thì
 * dùng tiêu đề sản phẩm làm chủ đề tối thiểu (không bịa hook/CTA — để trống).
 */

import type { TenantContext } from "@/core/tenancy"
import type { PackageChannel } from "../../creative-production/domain/campaign-package-rules"
import type { ContentBrief } from "../contracts/brief"
import { buildContentBrief, type RawTopicInput } from "../domain/brief-builder"
import { readProductContext, projectTopicFromReport } from "../infra/read-product-context"
import { readShopContext } from "../infra/read-shop-context"
import { readStoryContext } from "../infra/read-story-context"

export interface GetContentBriefInput {
  readonly assetId?: string | null | undefined
  readonly productId?: string | null | undefined
  readonly analysisRunId?: string | null | undefined
  readonly topicId?: string | null | undefined
  readonly scenePlanId?: string | null | undefined
  readonly channels: readonly PackageChannel[]
}

export async function getContentBrief(ctx: TenantContext, input: GetContentBriefInput): Promise<ContentBrief> {
  const [productCtx, shop, story] = await Promise.all([
    readProductContext(ctx, { productId: input.productId ?? null, analysisRunId: input.analysisRunId ?? null }),
    readShopContext(ctx),
    readStoryContext(ctx, input.scenePlanId ?? null),
  ])

  const topic: RawTopicInput =
    projectTopicFromReport(productCtx.report, input.topicId) ??
    ({
      topicId: null,
      title: `Giới thiệu ${productCtx.product.name}`,
      angleCategory: null,
      hook: null,
      cta: null,
      format: null,
      evidenceNote: null,
    } satisfies RawTopicInput)

  return buildContentBrief({
    organizationId: ctx.organizationId,
    assetId: input.assetId ?? null,
    product: productCtx.product,
    passport: productCtx.passport,
    topic,
    story,
    shop,
    channels: input.channels,
  })
}
