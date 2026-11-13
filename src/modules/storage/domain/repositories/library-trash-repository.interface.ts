import type { TenantContext } from "@/core/tenancy"
import type { AssetUsage } from "@/modules/assets/domain/asset-lifecycle"
import type { LibraryTrashType, TrashItem } from "../trash-types"
import type { TrashDeleteResult } from "./trash-repository.interface"

/** Hành động audit khi xoá vĩnh viễn (người bấm hoặc cron dọn rác). */
export type LibraryDeleteAction = "trash.permanent_delete" | "trash.auto_purge"

/** Thùng rác của 5 loại Kho dữ liệu v2 (L-4): video, nội dung, catalog, thẻ chào, landing page. */
export interface ILibraryTrashRepository {
  list(ctx: TenantContext, now: Date): Promise<TrashItem[]>
  move(ctx: TenantContext, type: LibraryTrashType, id: string): Promise<boolean>
  restore(ctx: TenantContext, type: LibraryTrashType, id: string): Promise<boolean>
  findUsages(ctx: TenantContext, type: LibraryTrashType, id: string): Promise<AssetUsage[]>
  permanentDelete(ctx: TenantContext, type: LibraryTrashType, id: string, action: LibraryDeleteAction): Promise<TrashDeleteResult>
}
