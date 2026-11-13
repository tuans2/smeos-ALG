/**
 * Print Rendition Domain Model & Zod Schemas.
 * Thuần túy TypeScript, zero ORM.
 */

import { z } from "zod"
import type { PrintPresetCode, PreflightReport } from "./print-preset"

export type PrintRenditionStatus = "PENDING" | "READY" | "FAILED"

export const printPresetCodes = [
  "A4",
  "A5",
  "A6",
  "CARD_90X54",
  "STANDEE_60X160",
  "TABLE_TENT_100X150",
  "HANG_TAG_50X90",
  "STICKER_50X50",
] as const

export const createPrintRenditionSchema = z.object({
  assetId: z.string().uuid().optional().nullable(),
  assetUsageId: z.string().uuid().optional().nullable(),
  sourceType: z.string().trim().min(1, "sourceType không được để trống"),
  sourceId: z.string().trim().optional().nullable(),
  presetCode: z.enum(printPresetCodes),
  customWidthMm: z.number().positive().optional(),
  customHeightMm: z.number().positive().optional(),
  customBleedMm: z.number().nonnegative().optional(),
  dpi: z.number().int().min(72).max(1200).default(300),
  imageWidthPx: z.number().int().positive().optional(),
  imageHeightPx: z.number().int().positive().optional(),
  colorMode: z.enum(["RGB", "CMYK"]).optional(),
  hasQrCode: z.boolean().optional(),
  qrSizeMm: z.number().positive().optional(),
  hasContentOutsideSafeZone: z.boolean().optional(),
})

export type CreatePrintRenditionInput = z.input<typeof createPrintRenditionSchema>

export interface PrintRendition {
  id: string
  organizationId: string
  assetId?: string | null | undefined
  assetUsageId?: string | null | undefined
  sourceType: string
  sourceId?: string | null | undefined
  presetCode: PrintPresetCode
  widthMm: number
  heightMm: number
  bleedMm: number
  dpi: number
  storageKey?: string | null | undefined
  fileUrl?: string | null | undefined
  preflight?: PreflightReport | null | undefined
  status: PrintRenditionStatus
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

