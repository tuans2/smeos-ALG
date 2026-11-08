/**
 * Đọc cây tổ chức — MỘT nơi duy nhất (ADR-012 D-T4, bước T-1).
 *
 * Trước đây 4 bản tự truy vấn `chain_partnerships` để tìm chuỗi cha của một cửa hàng đối tác
 * (ma trận quản trị ×2, Integration Hub, thư viện thương hiệu). Luật chọn chuỗi cha đặt ở đây:
 * cạnh `is_primary` của `organization_links` (= liên kết chuỗi ACTIVE sớm nhất, giữ bởi `recomputePrimaryLink`
 * và trigger tối đa một cạnh chính — T-2), nơi gọi không phải sửa.
 */
import { prisma } from "@/core/tenancy/infra/prisma"
import { organizationTierOf } from "@/core/governance/tier-of"

import type { DbClient } from "./db-client"
import { ACTIVE_CHAIN_LINK } from "./organization-links"
import { ORG_SETTINGS_SELECT } from "./organization-industry"
import { withIndustryKey } from "../domain/industry-key"

/** Chuỗi cha chính của một tổ chức đối tác, kèm cấu hình của chuỗi (ma trận quản trị đọc từ đây). */
export interface PrimaryChainLink {
  readonly chainOrgId: string
  readonly chainName: string
  readonly chainSettings: unknown
}

export interface TierChain {
  readonly organizationId: string
  /** Tầng dữ liệu của tổ chức — Mẹ và Ngành không phải tổ chức tenant (`organizationTierOf`). */
  readonly tier: "CHAIN" | "STORE"
  /** Khoá plugin ngành — `organizations.industry_key` (ADR-012 T-6a; nguồn duy nhất từ T-6c-2). */
  readonly industryKey: string | null
  readonly primaryChain: { readonly organizationId: string; readonly name: string } | null
}

export async function findPrimaryChainLink(organizationId: string, db: DbClient = prisma): Promise<PrimaryChainLink | null> {
  const link = await db.organization_links.findFirst({
    where: { child_org_id: organizationId, is_primary: true, ...ACTIVE_CHAIN_LINK },
    select: { parent_org_id: true, parent_organization: { select: { name: true, ...ORG_SETTINGS_SELECT } } },
  })
  if (!link) return null
  return { chainOrgId: link.parent_org_id, chainName: link.parent_organization.name, chainSettings: withIndustryKey(link.parent_organization).settings }
}

/** `null` khi tổ chức không tồn tại. */
export async function resolveTierChain(organizationId: string, db: DbClient = prisma): Promise<TierChain | null> {
  const [org, link] = await Promise.all([
    db.organizations.findUnique({ where: { id: organizationId }, select: { type: true, industry_key: true } }),
    findPrimaryChainLink(organizationId, db),
  ])
  if (!org) return null
  return {
    organizationId,
    tier: organizationTierOf(org.type),
    // ADR-012 T-6c-2: cột `industry_key` là nguồn duy nhất (không còn dự phòng `settings.industry`)
    industryKey: org.industry_key,
    primaryChain: link ? { organizationId: link.chainOrgId, name: link.chainName } : null,
  }
}
