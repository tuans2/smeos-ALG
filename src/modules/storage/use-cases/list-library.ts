import { notFound, validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import {
  creatorFilterForScope,
  isLibraryType,
  LIBRARY_CAPABILITY,
  libraryOpenHref,
  LIBRARY_PAGE_SIZE,
  visibleLibraryTypes,
  type LibraryScope,
  type LibraryType,
} from "../domain/library"
import { loadLibraryCovers } from "../infra/library-covers"
import { countLibraryRows, listLibraryRows, loadBranchDirectory } from "../infra/library-repository"
import { resolveAssetDefinitionForLibraryItem } from "@/modules/marketing-center/domain/library-asset-mapping"

const THUMBNAIL_TTL_SECONDS = 3600

export type LibraryItem = {
  id: string
  type: LibraryType
  subtype: string | null
  title: string
  status: string | null
  created_at: string
  branch: { id: string; name: string } | null
  thumbnail_url: string | null
  /** Ảnh dự phòng trên Google Drive (như `ProductThumb`). */
  drive_link: string | null
  open_href: string
  asset_type?: {
    code: string
    name: string
    module: string
  } | null
}

export type LibraryDeps = {
  listRows: typeof listLibraryRows
  loadDirectory: typeof loadBranchDirectory
  loadCovers: typeof loadLibraryCovers
  signUrl: (key: string) => Promise<string>
}

function defaultDeps(): LibraryDeps {
  return {
    listRows: listLibraryRows,
    loadDirectory: loadBranchDirectory,
    loadCovers: loadLibraryCovers,
    signUrl: (key) => getStorageProvider().signedUrl(key, THUMBNAIL_TTL_SECONDS, "GET"),
  }
}

/**
 * `GET /storage/library` — Kho dữ liệu v2 (Screen Contract `kho-du-lieu.md` §12).
 * Mỗi loại kiểm đúng mã quyền ĐỌC của công cụ gốc; phạm vi chi nhánh chỉ lọc
 * trong tổ chức của phiên. Id chi nhánh không thuộc tổ chức → 404.
 */
export async function listLibrary(
  ctx: TenantContext,
  input: { type: string; scope: LibraryScope; q: string | null; from: Date | null; cursor: string | null },
  deps: LibraryDeps = defaultDeps()
): Promise<{ items: LibraryItem[]; next_cursor: string | null }> {
  if (!isLibraryType(input.type)) throw validationFailed({ type: "Loại dữ liệu không hợp lệ" })
  const type = input.type
  requireCapability(ctx, LIBRARY_CAPABILITY[type])

  const directory = await deps.loadDirectory(ctx)
  if (typeof input.scope === "object" && !directory.branchNames.has(input.scope.branchId)) throw notFound()
  const creator = creatorFilterForScope(input.scope, directory.branchOfUser, ctx.branchId)

  const rows = await deps.listRows(ctx, type, { creator, q: input.q, from: input.from, cursor: input.cursor, take: LIBRARY_PAGE_SIZE })
  // Ảnh/ảnh AI tự là ảnh; loại khác lấy ảnh bìa (sản phẩm đầu, cảnh đầu, ảnh hero…)
  const covers = type === "original" || type === "ai_image" ? new Map() : await deps.loadCovers(ctx, type, rows)
  const items = await Promise.all(
    rows.map(async (row): Promise<LibraryItem> => {
      const branchId = row.createdBy ? (directory.branchOfUser.get(row.createdBy) ?? null) : null
      const branchName = branchId ? directory.branchNames.get(branchId) : undefined
      const isImage = row.storageKey && row.mimeType?.startsWith("image/")
      const cover = covers.get(row.id)
      const coverKey = isImage ? row.storageKey! : cover?.storageKey
      const assetDef = resolveAssetDefinitionForLibraryItem(type, row.subtype, row.metadata)
      return {
        id: row.id,
        type,
        subtype: row.subtype,
        title: row.title,
        status: row.status,
        created_at: row.createdAt.toISOString(),
        branch: branchId && branchName ? { id: branchId, name: branchName } : null,
        thumbnail_url: coverKey ? await deps.signUrl(coverKey).catch(() => null) : (cover?.imageUrl ?? null),
        drive_link: cover?.driveLink ?? null,
        open_href: libraryOpenHref(type, row.id, row.subtype),
        asset_type: assetDef ? { code: assetDef.code, name: assetDef.name, module: assetDef.module } : null,
      }
    })
  )
  const pageable = type !== "audio" && rows.length === LIBRARY_PAGE_SIZE
  return { items, next_cursor: pageable ? rows[rows.length - 1]!.id : null }
}

/** `GET /storage/library/summary` — loại được xem, số mục mỗi loại theo phạm vi, chi nhánh. */
export async function getLibrarySummary(
  ctx: TenantContext,
  scope: LibraryScope = "all",
  deps: { loadDirectory: typeof loadBranchDirectory; countRows: typeof countLibraryRows } = {
    loadDirectory: loadBranchDirectory,
    countRows: countLibraryRows,
  }
): Promise<{
  types: LibraryType[]
  counts: Partial<Record<LibraryType, number>>
  is_chain: boolean
  viewer_branch_id: string | null
  branches: { id: string; name: string }[]
}> {
  const directory = await deps.loadDirectory(ctx)
  if (typeof scope === "object" && !directory.branchNames.has(scope.branchId)) throw notFound()
  const creator = creatorFilterForScope(scope, directory.branchOfUser, ctx.branchId)
  const types = visibleLibraryTypes(ctx.capabilities)
  const counts = await Promise.all(types.map((type) => deps.countRows(ctx, type, { creator, q: null, from: null })))
  return {
    types,
    counts: Object.fromEntries(types.map((type, i) => [type, counts[i]!])),
    is_chain: directory.isChain,
    viewer_branch_id: ctx.branchId,
    branches: [...directory.branchNames].map(([id, name]) => ({ id, name })),
  }
}
