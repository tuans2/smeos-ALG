/**
 * Domain entity cho Nơi dùng tư liệu (Asset Usage).
 *
 * SSOT: `03_KE_HOACH_TRIEN_KHAI.md` mục PR-2 (2.4).
 * Kết nối một tư liệu trong Thư viện (LibraryItem) với đích đến thực tế
 * (Quảng bá, Bán hàng, Chăm sóc, In ấn), CTA và đường dẫn theo dõi.
 */

import type { UsageDestination } from "./asset-type"
import type { CtaCode } from "./cta-registry"

export type AssetUsageStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED"

export interface AssetUsage {
  readonly id: string
  readonly organizationId: string
  readonly sourceType: string
  readonly sourceId: string
  readonly assetTypeCode: string
  readonly destination: UsageDestination
  readonly ctaCode: CtaCode
  readonly title: string
  readonly shortLinkId: string | null
  readonly campaignId: string | null
  readonly config: Record<string, unknown>
  readonly status: AssetUsageStatus
  readonly createdBy: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

