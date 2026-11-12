/**
 * ALG Platform Admin — Get All Organizations Data (Platform-Level Hub)
 *
 * Tương tự get-chain-stores-data.ts nhưng ở tầng Platform:
 * - Không có organization_id context — xuyên tổ chức
 * - Chỉ gọi qua PlatformContext (N1 capability required)
 * - Dữ liệu thu thập: profile, products, branches, usage, members
 */

import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { PlatformDataRepository, getPlatformDataRepository } from "../infra/platform-data-repository"
import { industryKeyOf } from "@/modules/organization/domain/industry-key"

export interface PlatformOrgDataSummary {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly type: string
  readonly industryKey: string | null
  readonly creditBalance: number
  readonly createdAt: string
  readonly memberCount: number
  readonly branchCount: number
  readonly productCount: number
  readonly orderCount: number
  readonly generationJobCount: number
  readonly spreadsheetCount: number
  readonly hasBusinessProfile: boolean
  readonly hasBrandProfile: boolean
  readonly readinessScore: number
  readonly lastActivityAt: string | null
}

export interface GetPlatformOrgsDataResult {
  readonly total: number
  readonly orgs: readonly PlatformOrgDataSummary[]
}

export async function getPlatformOrgsData(
  pctx: PlatformContext,
  repo: PlatformDataRepository = getPlatformDataRepository()
): Promise<GetPlatformOrgsDataResult> {
  requirePlatformCapability(pctx, "N1")

  const {
    orgs,
    productCountMap,
    orderCountMap,
    jobCountMap,
    sheetCountMap,
    lastActivityMap,
  } = await repo.getOrganizationsDataWithCounts()

  const result: PlatformOrgDataSummary[] = orgs.map((org) => {
    const hasBusinessProfile = !!org.business_profile
    const hasBrandProfile = !!org.brand_profile

    // Readiness score: based on profile completeness
    let score = 20 // Base for existing
    if (hasBusinessProfile) score += 25
    if (hasBrandProfile) score += 20
    if ((productCountMap.get(org.id) ?? 0) > 0) score += 20
    if ((org._count.branches ?? 0) > 0) score += 15

    const industryKey = industryKeyOf(org) // cột organizations.industry_key (ADR-012 T-6c-1)

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      type: org.type,
      industryKey,
      creditBalance: org.credit_balance,
      createdAt: org.created_at.toISOString(),
      memberCount: org._count.memberships,
      branchCount: org._count.branches,
      productCount: productCountMap.get(org.id) ?? 0,
      orderCount: orderCountMap.get(org.id) ?? 0,
      generationJobCount: jobCountMap.get(org.id) ?? 0,
      spreadsheetCount: sheetCountMap.get(org.id) ?? 0,
      hasBusinessProfile,
      hasBrandProfile,
      readinessScore: score,
      lastActivityAt: lastActivityMap.get(org.id)?.toISOString() ?? null,
    }
  })

  return {
    total: result.length,
    orgs: result,
  }
}
