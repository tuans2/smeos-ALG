/**
 * Universal Catalog Studio 2026 — 12 Style Definitions (S01–S12).
 * Aggregates partial shards S01-S06 and S07-S12 to strictly honor SRP <= 350 lines limit.
 * Pure Domain — Zero ORM, Pure Design Tokens & Rules.
 */

import type { CatalogStyleId, StyleDefinition } from "../entities/catalog-studio.types"
import { CATALOG_STYLES_S01_S06 } from "./style-registry-s01-s06"
import { CATALOG_STYLES_S07_S12 } from "./style-registry-s07-s12"

export const CATALOG_STYLES: Record<CatalogStyleId, StyleDefinition> = {
  ...CATALOG_STYLES_S01_S06,
  ...CATALOG_STYLES_S07_S12,
} as Record<CatalogStyleId, StyleDefinition>
