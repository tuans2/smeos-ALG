import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { PrintRendition, PrintRenditionStatus } from "../print-rendition"
import type { PrintPresetCode, PreflightReport } from "../print-preset"

export interface CreatePrintRenditionDTO {
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
  status?: PrintRenditionStatus | undefined
  createdBy: string
}

export interface UpdatePrintRenditionDTO {
  storageKey?: string | null | undefined
  fileUrl?: string | null | undefined
  preflight?: PreflightReport | null | undefined
  status?: PrintRenditionStatus | undefined
}

export interface PrintRenditionFilter {
  presetCode?: PrintPresetCode | undefined
  status?: PrintRenditionStatus | undefined
  sourceType?: string | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export interface IPrintRenditionRepository {
  create(ctx: TenantContext, data: CreatePrintRenditionDTO): Promise<PrintRendition>
  findById(ctx: TenantContext, id: string): Promise<PrintRendition | null>
  list(ctx: TenantContext, filter?: PrintRenditionFilter): Promise<{ items: PrintRendition[]; total: number }>
  update(ctx: TenantContext, id: string, data: UpdatePrintRenditionDTO): Promise<PrintRendition | null>
}

