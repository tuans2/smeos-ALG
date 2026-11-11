import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"

/**
 * Số bản ghi còn trỏ tới một khoá kho trong tổ chức. Danh sách nguồn phải
 * khớp `STORAGE_REFERENCE_SOURCES` (`storage-registry-keys.ts`) — đếm sót
 * một nguồn là xoá mất tệp còn dùng. Payload dùng chung là có thật:
 * Master trỏ lại tệp gốc (`promote-to-master.ts`), ảnh QC vừa có dòng
 * `assets` vừa nằm trong `order_coordinations.metadata.qc_photos`.
 */
export async function countPayloadReferences(ctx: TenantContext, key: string): Promise<number> {
  const counts = await Promise.all([
    prisma.assets.count({ where: scopedWhere(ctx, { OR: [{ storage_key: key }, { thumb_key: key }] }) }),
    prisma.music_tracks.count({ where: scopedWhere(ctx, { storage_key: key }) }),
    prisma.voice_clones.count({ where: scopedWhere(ctx, { sample_storage_key: key }) }),
    prisma.video_jobs.count({
      where: scopedWhere(ctx, { OR: [{ audio_storage_key: key }, { final_video_url: { contains: key } }] }),
    }),
    prisma.generation_jobs.count({
      where: scopedWhere(ctx, {
        OR: [
          { output: { path: ["audio_storage_key"], equals: key } },
          { output: { path: ["voice_only_storage_key"], equals: key } },
        ],
      }),
    }),
    prisma.order_coordinations.count({
      where: scopedWhere(ctx, {
        OR: [
          { metadata: { path: ["qc_photos"], array_contains: [key] } },
          { metadata: { path: ["pod_photos"], array_contains: [key] } },
        ],
      }),
    }),
    // Ảnh chợ đối tác: bảng cấp nền tảng, khoá `platform/…` — không trùng khoá `org/…`
    prisma.partner_marketplace_stores.count({ where: { photo_keys: { has: key } } }),
    // Ảnh trong tin nhắn trao đổi nội bộ: khoá nằm dưới tổ chức chủ phòng
    prisma.internal_chat_messages.count({ where: scopedWhere(ctx, { attachments: { has: key } }) }),
  ])
  return counts.reduce((sum, n) => sum + n, 0)
}
