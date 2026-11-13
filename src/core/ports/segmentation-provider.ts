/**
 * Cổng tách thực thể — `AIC-07`, `AIC-11` (đặc tả 10 mục 6).
 *
 * Mã thật của SAM2 hiện nằm TRONG adapter `local_cv` của worker Vision; nó
 * chuyển ra sau cổng này ở AI-1, để M04b dùng lại được mà không phải import
 * một adapter của module khác.
 */
import type { AssetRef, Box, MaskData, Point } from "./shared-media"

export interface SegmentationInput {
  readonly imageRef: AssetRef
  readonly hints?: {
    readonly boxes?: readonly Box[]
    readonly points?: readonly Point[]
  }
}

export interface SegmentationOutput {
  readonly masks: readonly MaskData[]
  readonly modelVersion: string
}

export interface SegmentationProvider {
  readonly name: string
  segment(input: SegmentationInput): Promise<SegmentationOutput>
}
