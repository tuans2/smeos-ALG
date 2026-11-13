/**
 * Phong cách landing (bộ chọn ở Công cụ 08) → phong cách + mẫu catalog dùng để hiển thị trang khách xem.
 * Trang `/c/[slug]` vẽ bằng token phong cách catalog (S01–S12); trước đây landing luôn rơi về S01 nên
 * chọn phong cách nào trang cũng giống nhau. Thuần — không Prisma, không mạng.
 */

import type { CatalogStyleId, CatalogTemplateId } from "@/modules/catalog-studio/domain/entities/catalog-studio.types"

export interface LandingVisual {
  readonly styleId: CatalogStyleId
  readonly templateId: CatalogTemplateId
}

export const LANDING_ARCHETYPE_VISUAL: Readonly<Record<string, LandingVisual>> = {
  "minimal-luxury": { styleId: "S03_QUIET_LUXURY", templateId: "T03_PREMIUM_LOOKBOOK" },
  "modern-split": { styleId: "S12_MODERN_COMMERCE", templateId: "T04_BENTO_SHOWCASE" },
  "festive-sale": { styleId: "S04_BOLD_POP", templateId: "T04_BENTO_SHOWCASE" },
  "pastel-romantic": { styleId: "S10_PLAYFUL_ILLUSTRATION", templateId: "T01_SIGNATURE_COLLECTION" },
}

const DEFAULT_VISUAL: LandingVisual = { styleId: "S03_QUIET_LUXURY", templateId: "T03_PREMIUM_LOOKBOOK" }

export function landingVisualFor(archetypeId: string | null | undefined): LandingVisual {
  return (archetypeId && LANDING_ARCHETYPE_VISUAL[archetypeId]) || DEFAULT_VISUAL
}
