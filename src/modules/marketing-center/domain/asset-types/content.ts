/**
 * Danh mục Asset: 02 Tạo nội dung (content).
 *
 * SSOT: `02_DANH_MUC_ASSET.md` phần A.
 * Chia tách SRP: content-images.ts (ảnh & bài) + content-videos.ts (video).
 */

import type { AssetTypeDefinition } from "../asset-type"
import { CONTENT_IMAGE_ASSET_TYPES } from "./content-images"
import { CONTENT_VIDEO_ASSET_TYPES } from "./content-videos"

export * from "./content-images"
export * from "./content-videos"

export const CONTENT_ASSET_TYPES: readonly AssetTypeDefinition[] = [
  ...CONTENT_IMAGE_ASSET_TYPES,
  ...CONTENT_VIDEO_ASSET_TYPES,
]
