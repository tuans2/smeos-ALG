import type { TenantContext } from "@/core/tenancy"
import type { TrashItem, TrashItemType } from "../trash-types"

/** `legal_hold`: asset đang được giữ theo yêu cầu pháp lý (SDAGF D-04). */
/** `in_use`: mẫu sản phẩm đã có đơn — chỉ lưu trữ, không xoá vĩnh viễn (checklist ALG 2.3). */
export type TrashDeleteResult = "deleted" | "not_found" | "legal_hold" | "in_use"

export interface ITrashRepository {
  listTrash(ctx: TenantContext): Promise<TrashItem[]>
  moveToTrash(
    ctx: TenantContext,
    input: { id: string; type: TrashItemType; userId?: string | null | undefined }
  ): Promise<boolean>
  restoreFromTrash(
    ctx: TenantContext,
    input: { id: string; type: TrashItemType }
  ): Promise<boolean>
  /** Asset ứng với mục thùng rác (ảnh gốc: chính nó; ảnh đã duyệt: ảnh của phân tích; sản phẩm: null). */
  findTargetAssetId(ctx: TenantContext, input: { id: string; type: TrashItemType }): Promise<string | null>
  permanentDelete(
    ctx: TenantContext,
    input: { id: string; type: TrashItemType }
  ): Promise<TrashDeleteResult>
}
