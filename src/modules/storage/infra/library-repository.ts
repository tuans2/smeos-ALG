import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import type { asset_kind } from "@/generated/prisma/client"
import { AI_IMAGE_KINDS, type CreatorFilter, type LibraryType } from "../domain/library"

/** Một mục thư viện đã chuẩn hoá, trước khi gắn chi nhánh/ảnh xem trước. */
export type LibraryRow = {
  id: string
  type: LibraryType
  title: string
  createdAt: Date
  createdBy: string | null
  status: string | null
  /** Phân loại con: kind của asset, MUSIC/VOICE của âm thanh. */
  subtype: string | null
  storageKey: string | null
  mimeType: string | null
  metadata?: Record<string, unknown> | null
}

export type LibraryFilter = { creator: CreatorFilter; q: string | null; from: Date | null }
export type LibraryQuery = LibraryFilter & { cursor: string | null; take: number }

type Where = Record<string, unknown>

/**
 * Người tạo null (job cũ, job hệ thống) tính là trụ sở: lọc "một chi nhánh"
 * loại chúng, lọc "trụ sở/loại trừ" giữ chúng.
 */
function creatorWhere(field: string, filter: CreatorFilter, nullable: boolean): Where {
  if (filter.kind === "none") return {}
  if (filter.kind === "only") return { [field]: { in: filter.userIds } }
  if (!filter.userIds.length) return {}
  const notIn = { [field]: { notIn: filter.userIds } }
  return nullable ? { OR: [notIn, { [field]: null }] } : notIn
}

const since = (from: Date | null): Where => (from ? { created_at: { gte: from } } : {})
const titleLike = (field: string, q: string | null): Where => (q ? { [field]: { contains: q, mode: "insensitive" } } : {})
/** Cột người tạo nullable: chỉ `video_jobs.created_by` (job trước 29/10/2026). */
const NULLABLE_CREATOR = new Set(["video_jobs.created_by"])

const base = (f: LibraryFilter, creatorField: string, titleField?: string, table = ""): Where => ({
  ...since(f.from),
  ...(titleField ? titleLike(titleField, f.q) : {}),
  ...creatorWhere(creatorField, f.creator, NULLABLE_CREATOR.has(`${table}.${creatorField}`)),
})

const assetWhere = (type: "original" | "ai_image", f: LibraryFilter): Where => ({
  kind: { in: (type === "original" ? ["ORIGINAL"] : [...AI_IMAGE_KINDS]) as asset_kind[] },
  state: { not: "ARCHIVED" as const },
  ...base(f, "created_by"),
})

const page = (query: LibraryQuery) => ({
  take: query.take,
  orderBy: [{ created_at: "desc" as const }, { id: "desc" as const }],
  ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
})

const row = (r: Omit<LibraryRow, "status" | "subtype" | "storageKey" | "mimeType"> & Partial<LibraryRow>): LibraryRow => ({
  status: null,
  subtype: null,
  storageKey: null,
  mimeType: null,
  metadata: null,
  ...r,
})

export async function listLibraryRows(ctx: TenantContext, type: LibraryType, query: LibraryQuery): Promise<LibraryRow[]> {
  switch (type) {
    case "original":
    case "ai_image": {
      const rows = await prisma.assets.findMany({
        where: scopedWhere(ctx, assetWhere(type, query)),
        ...page(query),
        select: { id: true, kind: true, state: true, created_at: true, created_by: true, storage_key: true, thumb_key: true, mime_type: true, metadata: true },
      })
      return rows.map((r) => {
        const meta = (r.metadata as Record<string, unknown> | null) ?? {}
        const title = typeof meta.title === "string" && meta.title.trim()
          ? meta.title.trim()
          : typeof meta.filename === "string"
          ? meta.filename
          : ""
        return row({
          id: r.id, type, title, createdAt: r.created_at, createdBy: r.created_by,
          status: r.state, subtype: r.kind, storageKey: r.thumb_key ?? r.storage_key, mimeType: r.mime_type,
          metadata: meta,
        })
      })
    }
    case "video": {
      const rows = await prisma.video_jobs.findMany({
        where: scopedWhere(ctx, { trashed_at: null, ...base(query, "created_by", "title", "video_jobs") }),
        ...page(query),
        select: { id: true, title: true, stage: true, created_at: true, created_by: true },
      })
      return rows.map((r) => row({ id: r.id, type, title: r.title, createdAt: r.created_at, createdBy: r.created_by, status: r.stage }))
    }
    case "audio": {
      const [tracks, voices] = await Promise.all([
        prisma.music_tracks.findMany({
          where: scopedWhere(ctx, { deleted_at: null, ...base(query, "attested_by", "title") }),
          orderBy: { created_at: "desc" },
          take: query.take,
          select: { id: true, title: true, created_at: true, attested_by: true },
        }),
        prisma.voice_clones.findMany({
          where: scopedWhere(ctx, { deleted_at: null, ...base(query, "consented_by", "name") }),
          orderBy: { created_at: "desc" },
          take: query.take,
          select: { id: true, name: true, status: true, created_at: true, consented_by: true },
        }),
      ])
      return [
        ...tracks.map((r) => row({ id: r.id, type, title: r.title, createdAt: r.created_at, createdBy: r.attested_by, subtype: "MUSIC" })),
        ...voices.map((r) => row({ id: r.id, type, title: r.name, createdAt: r.created_at, createdBy: r.consented_by, status: r.status, subtype: "VOICE" })),
      ]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, query.take)
    }
    case "content": {
      const rows = await prisma.content_generations.findMany({
        where: scopedWhere(ctx, { trashed_at: null, ...base(query, "created_by") }),
        ...page(query),
        select: { id: true, channels: true, status: true, created_at: true, created_by: true },
      })
      return rows.map((r) =>
        row({
          id: r.id, type, title: Array.isArray(r.channels) ? r.channels.filter((c) => typeof c === "string").join(", ") : "",
          createdAt: r.created_at, createdBy: r.created_by, status: r.status,
        })
      )
    }
    case "catalog": {
      const rows = await prisma.catalog_links.findMany({
        where: scopedWhere(ctx, { trashed_at: null, ...base(query, "created_by", "name") }),
        ...page(query),
        select: { id: true, name: true, is_revoked: true, created_at: true, created_by: true },
      })
      return rows.map((r) => row({ id: r.id, type, title: r.name, createdAt: r.created_at, createdBy: r.created_by, status: r.is_revoked ? "REVOKED" : "ACTIVE" }))
    }
    case "landing": {
      const rows = await prisma.landing_pages.findMany({
        where: scopedWhere(ctx, { trashed_at: null, ...base(query, "created_by", "title") }),
        ...page(query),
        select: { id: true, title: true, created_at: true, created_by: true },
      })
      return rows.map((r) => row({ id: r.id, type, title: r.title, createdAt: r.created_at, createdBy: r.created_by }))
    }
    case "greeting_catalog": {
      const rows = await prisma.greeting_catalogs.findMany({
        where: scopedWhere(ctx, { trashed_at: null, ...base(query, "created_by", "name") }),
        ...page(query),
        select: { id: true, name: true, type: true, created_at: true, created_by: true },
      })
      return rows.map((r) => row({ id: r.id, type, title: r.name, createdAt: r.created_at, createdBy: r.created_by, status: r.type }))
    }
  }
}

/** Số mục mỗi loại theo cùng bộ lọc phạm vi (huy hiệu tab). */
export async function countLibraryRows(ctx: TenantContext, type: LibraryType, f: LibraryFilter): Promise<number> {
  switch (type) {
    case "original":
    case "ai_image":
      return prisma.assets.count({ where: scopedWhere(ctx, assetWhere(type, f)) })
    case "video":
      return prisma.video_jobs.count({ where: scopedWhere(ctx, { trashed_at: null, ...base(f, "created_by", undefined, "video_jobs") }) })
    case "audio": {
      const [tracks, voices] = await Promise.all([
        prisma.music_tracks.count({ where: scopedWhere(ctx, { deleted_at: null, ...base(f, "attested_by") }) }),
        prisma.voice_clones.count({ where: scopedWhere(ctx, { deleted_at: null, ...base(f, "consented_by") }) }),
      ])
      return tracks + voices
    }
    case "content":
      return prisma.content_generations.count({ where: scopedWhere(ctx, { trashed_at: null, ...base(f, "created_by") }) })
    case "catalog":
      return prisma.catalog_links.count({ where: scopedWhere(ctx, { trashed_at: null, ...base(f, "created_by") }) })
    case "landing":
      return prisma.landing_pages.count({ where: scopedWhere(ctx, { trashed_at: null, ...base(f, "created_by") }) })
    case "greeting_catalog":
      return prisma.greeting_catalogs.count({ where: scopedWhere(ctx, { trashed_at: null, ...base(f, "created_by") }) })
  }
}

/** user → chi nhánh và id → tên chi nhánh của tổ chức (để phân loại và hiện nhãn). */
export async function loadBranchDirectory(ctx: TenantContext): Promise<{
  isChain: boolean
  branchOfUser: Map<string, string | null>
  branchNames: Map<string, string>
}> {
  const [org, members, branches] = await Promise.all([
    prisma.organizations.findUnique({ where: { id: ctx.organizationId }, select: { type: true } }),
    prisma.memberships.findMany({ where: scopedWhere(ctx, {}), select: { user_id: true, branch_id: true } }),
    prisma.branches.findMany({ where: scopedWhere(ctx, { is_active: true }), select: { id: true, name: true } }),
  ])
  return {
    isChain: org?.type === "CHAIN",
    branchOfUser: new Map(members.map((m) => [m.user_id, m.branch_id])),
    branchNames: new Map(branches.map((b) => [b.id, b.name])),
  }
}
