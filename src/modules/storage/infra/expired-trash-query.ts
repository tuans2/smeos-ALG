import { prisma } from "@/core/tenancy/infra/prisma"
import type { LibraryTrashType } from "../domain/trash-types"

export type ExpiredTrashedAsset = {
  id: string
  organization_id: string
  storage_key: string
  thumb_key: string | null
}

/**
 * Asset trong thùng rác đã quá `purge_after`, không còn legal hold (của asset lẫn của tổ chức) — của MỌI
 * tổ chức. Chỉ cron hệ thống gọi (`sweep-expired-trash.ts`); mỗi dòng mang
 * `organization_id` của chính nó để xoá dưới ngữ cảnh đúng tổ chức.
 */
export function findExpiredTrashedAssets(now: Date, limit: number): Promise<ExpiredTrashedAsset[]> {
  return prisma.assets.findMany({
    where: {
      state: "ARCHIVED",
      purge_after: { lte: now },
      OR: [{ legal_hold_until: null }, { legal_hold_until: { lte: now } }],
      organization: { OR: [{ legal_hold_until: null }, { legal_hold_until: { lte: now } }] },
    },
    orderBy: { purge_after: "asc" },
    take: limit,
    select: { id: true, organization_id: true, storage_key: true, thumb_key: true },
  })
}

export type ExpiredLibraryItem = { type: LibraryTrashType; id: string; organization_id: string }

/**
 * Mục Kho dữ liệu (video, nội dung, catalog, thẻ chào, landing page) quá hạn
 * thùng rác, tổ chức không legal hold — của MỌI tổ chức, chỉ cron gọi. Mỗi
 * loại tối đa `perType` mục một lượt.
 */
export async function findExpiredLibraryTrash(now: Date, perType: number): Promise<ExpiredLibraryItem[]> {
  const where = {
    purge_after: { lte: now },
    organization: { OR: [{ legal_hold_until: null }, { legal_hold_until: { lte: now } }] },
  }
  const args = { where, orderBy: { purge_after: "asc" as const }, take: perType, select: { id: true, organization_id: true } }
  const [videos, contents, catalogs, greetings, landings] = await Promise.all([
    prisma.video_jobs.findMany(args),
    prisma.content_generations.findMany(args),
    prisma.catalog_links.findMany(args),
    prisma.greeting_catalogs.findMany(args),
    prisma.landing_pages.findMany(args),
  ])
  const tag = (type: LibraryTrashType) => (r: { id: string; organization_id: string }) => ({ type, ...r })
  return [
    ...videos.map(tag("VIDEO")),
    ...contents.map(tag("CONTENT")),
    ...catalogs.map(tag("CATALOG")),
    ...greetings.map(tag("GREETING_CATALOG")),
    ...landings.map(tag("LANDING")),
  ]
}
