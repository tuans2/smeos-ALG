import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import type { AssetUsage } from "@/modules/assets/domain/asset-lifecycle"

/**
 * Các nơi trỏ tới asset BẰNG ID (khác `countPayloadReferences` — trỏ bằng khoá
 * kho). Thêm bảng mới trỏ tới `assets.id` thì thêm dòng ở đây; test kiến trúc
 * `asset-usage-guard.test.ts` đối chiếu với `prisma/schema.prisma`.
 */
export const ASSET_ID_REFERENCES = [
  "order_payments.evidence_asset_id",
  "greeting_sessions.payment_proof_asset_id",
  "greeting_sessions.payment_proof_balance_asset_id",
  "order_coordinations.sample_asset_id",
  "order_coordinations.pod_asset_id",
  "product_images.asset_id",
  "brand_profiles.logo_asset_id",
  "brand_library_versions.asset_id",
  "video_jobs.final_asset_id",
  "video_scenes.image_asset_id",
  "print_renditions.asset_id",
  "campaign_packages.master_asset_id",
  "campaign_packages.variant_asset_ids",
  "content_generations.asset_id",
  "content_drafts.asset_id",
  "asset_usages.source_id",
] as const

/** Không tính là "đang dùng": kết quả phân tích của chính ảnh, xoá theo luồng thùng rác "ảnh đã duyệt". */
export const ASSET_ID_REFERENCES_IGNORED = ["product_analyses.asset_id", "product_analysis_runs.asset_id"] as const

export async function findAssetUsages(ctx: TenantContext, assetId: string): Promise<AssetUsage[]> {
  const w = <T extends Record<string, unknown>>(where: T) => scopedWhere(ctx, where)
  const checks: [AssetUsage, Promise<number>][] = [
    ["payment_proof", prisma.order_payments.count({ where: w({ evidence_asset_id: assetId }) })],
    [
      "payment_proof",
      prisma.greeting_sessions.count({
        where: w({ OR: [{ payment_proof_asset_id: assetId }, { payment_proof_balance_asset_id: assetId }] }),
      }),
    ],
    ["order_photo", prisma.order_coordinations.count({ where: w({ OR: [{ sample_asset_id: assetId }, { pod_asset_id: assetId }] }) })],
    ["product_image", prisma.product_images.count({ where: w({ asset_id: assetId }) })],
    ["brand", prisma.brand_profiles.count({ where: w({ logo_asset_id: assetId }) })],
    ["brand", prisma.brand_library_versions.count({ where: w({ asset_id: assetId }) })],
    ["video", prisma.video_jobs.count({ where: w({ final_asset_id: assetId }) })],
    ["video", prisma.video_scenes.count({ where: { image_asset_id: assetId, job: w({}) } })],
    ["print", prisma.print_renditions.count({ where: w({ asset_id: assetId }) })],
    [
      "campaign",
      prisma.campaign_packages.count({ where: w({ OR: [{ master_asset_id: assetId }, { variant_asset_ids: { has: assetId } }] }) }),
    ],
    ["content", prisma.content_generations.count({ where: w({ asset_id: assetId }) })],
    ["content", prisma.content_drafts.count({ where: w({ asset_id: assetId }) })],
    [
      "channel_usage",
      prisma.asset_usages.count({
        where: w({ source_type: { in: ["original", "ai_image"] }, source_id: assetId, status: { not: "ARCHIVED" as const } }),
      }),
    ],
  ]
  const counts = await Promise.all(checks.map(([, count]) => count))
  return [...new Set(checks.filter((_, i) => counts[i]! > 0).map(([usage]) => usage))]
}
