/**
 * Luật chung của bảng `organization_links` (ADR-012 D-T3) — đồ thị cha → con giữa các tổ chức.
 *
 * T-2 chép `chain_partnerships` sang (giữ id), T-3a chuyển mọi đường đọc, T-3b ghi thẳng bảng này và xoá bảng cũ.
 * Cạnh chính (`is_primary`) = liên kết chuỗi ACTIVE sớm nhất của tổ chức con; mỗi lần ghi một cạnh, gọi
 * `recomputePrimaryLink` trong CÙNG giao dịch. Trigger `organization_links_one_primary` chặn hai cạnh chính.
 */
import type { DbClient } from "./db-client"

/** Loại cạnh là quan hệ chuỗi → cửa hàng; `INDUSTRY_MEMBER`, `AFFILIATE` (tầng Ngành) không phải. */
export const CHAIN_LINK_TYPES = ["SUBCONTRACTOR", "FRANCHISE"] as const
export type ChainLinkType = (typeof CHAIN_LINK_TYPES)[number]

/** Điều kiện `where` cho cạnh chuỗi đang hiệu lực — mọi đường đọc quan hệ chuỗi–đối tác dùng chung. */
export const ACTIVE_CHAIN_LINK = { status: "ACTIVE" as const, link_type: { in: [...CHAIN_LINK_TYPES] } }

/** Loại liên kết từ đầu vào; thiếu → gia công. `BRANCH` đã bị chặn ở API (ADR-012 D-T2). */
export function toChainLinkType(value: string | undefined): ChainLinkType {
  return value === "FRANCHISE" ? "FRANCHISE" : "SUBCONTRACTOR"
}

/** Đặt lại cạnh chính của một tổ chức con = liên kết chuỗi ACTIVE sớm nhất (hoặc không có). */
export async function recomputePrimaryLink(db: DbClient, childOrgId: string): Promise<string | null> {
  const first = await db.organization_links.findFirst({
    where: { child_org_id: childOrgId, ...ACTIVE_CHAIN_LINK },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
    select: { id: true },
  })
  const primaryId = first?.id ?? null
  await db.organization_links.updateMany({
    where: { child_org_id: childOrgId, is_primary: true, ...(primaryId ? { NOT: { id: primaryId } } : {}) },
    data: { is_primary: false },
  })
  if (primaryId) await db.organization_links.update({ where: { id: primaryId }, data: { is_primary: true } })
  return primaryId
}
