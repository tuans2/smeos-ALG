import { prisma } from "@/core/tenancy/infra/prisma"
import { Prisma, type print_rendition_status } from "@/generated/prisma/client"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { PrintRendition, PrintRenditionStatus } from "../domain/print-rendition"
import type { PrintPresetCode, PreflightReport } from "../domain/print-preset"
import type {
  IPrintRenditionRepository,
  CreatePrintRenditionDTO,
  UpdatePrintRenditionDTO,
  PrintRenditionFilter,
} from "../domain/repositories/print-rendition-repository.interface"

function toDomain(row: {
  id: string
  organization_id: string
  asset_id: string | null
  asset_usage_id: string | null
  source_type: string
  source_id: string | null
  preset_code: string
  width_mm: Prisma.Decimal
  height_mm: Prisma.Decimal
  bleed_mm: Prisma.Decimal
  dpi: number
  storage_key: string | null
  file_url: string | null
  preflight: unknown
  status: string
  created_by: string
  created_at: Date
  updated_at: Date
}): PrintRendition {
  return {
    id: row.id,
    organizationId: row.organization_id,
    assetId: row.asset_id,
    assetUsageId: row.asset_usage_id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    presetCode: row.preset_code as PrintPresetCode,
    widthMm: Number(row.width_mm),
    heightMm: Number(row.height_mm),
    bleedMm: Number(row.bleed_mm),
    dpi: row.dpi,
    storageKey: row.storage_key,
    fileUrl: row.file_url,
    preflight: (row.preflight as PreflightReport) ?? null,
    status: row.status as PrintRenditionStatus,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class PrintRenditionRepository implements IPrintRenditionRepository {
  async create(ctx: TenantContext, data: CreatePrintRenditionDTO): Promise<PrintRendition> {
    const row = await prisma.print_renditions.create({
      data: {
        organization_id: ctx.organizationId,
        asset_id: data.assetId ?? null,
        asset_usage_id: data.assetUsageId ?? null,
        source_type: data.sourceType,
        source_id: data.sourceId ?? null,
        preset_code: data.presetCode,
        width_mm: new Prisma.Decimal(data.widthMm),
        height_mm: new Prisma.Decimal(data.heightMm),
        bleed_mm: new Prisma.Decimal(data.bleedMm),
        dpi: data.dpi,
        storage_key: data.storageKey ?? null,
        file_url: data.fileUrl ?? null,
        preflight: data.preflight ? (data.preflight as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        status: (data.status ?? "PENDING") as print_rendition_status,
        created_by: data.createdBy,
      },
    })
    return toDomain(row)
  }

  async findById(ctx: TenantContext, id: string): Promise<PrintRendition | null> {
    const row = await prisma.print_renditions.findFirst({
      where: {
        id,
        organization_id: ctx.organizationId,
      },
    })
    return row ? toDomain(row) : null
  }

  async list(
    ctx: TenantContext,
    filter?: PrintRenditionFilter
  ): Promise<{ items: PrintRendition[]; total: number }> {
    const where: Prisma.print_renditionsWhereInput = {
      organization_id: ctx.organizationId,
      ...(filter?.presetCode ? { preset_code: filter.presetCode } : {}),
      ...(filter?.status ? { status: filter.status as print_rendition_status } : {}),
      ...(filter?.sourceType ? { source_type: filter.sourceType } : {}),
    }

    const [rows, total] = await Promise.all([
      prisma.print_renditions.findMany({
        where,
        orderBy: { created_at: "desc" },
        take: filter?.limit ?? 50,
        skip: filter?.offset ?? 0,
      }),
      prisma.print_renditions.count({ where }),
    ])

    return {
      items: rows.map(toDomain),
      total,
    }
  }

  async update(
    ctx: TenantContext,
    id: string,
    data: UpdatePrintRenditionDTO
  ): Promise<PrintRendition | null> {
    const existing = await prisma.print_renditions.findFirst({
      where: { id, organization_id: ctx.organizationId },
    })
    if (!existing) return null

    const updateData: Prisma.print_renditionsUpdateInput = {
      ...(data.storageKey !== undefined ? { storage_key: data.storageKey } : {}),
      ...(data.fileUrl !== undefined ? { file_url: data.fileUrl } : {}),
      ...(data.preflight !== undefined
        ? { preflight: data.preflight ? (data.preflight as unknown as Prisma.InputJsonValue) : Prisma.DbNull }
        : {}),
      ...(data.status !== undefined ? { status: data.status as print_rendition_status } : {}),
    }

    const updated = await prisma.print_renditions.update({
      where: { id },
      data: updateData,
    })

    return toDomain(updated)
  }
}

let printRenditionRepoSingleton: IPrintRenditionRepository | null = null

export function getPrintRenditionRepository(): IPrintRenditionRepository {
  if (!printRenditionRepoSingleton) {
    printRenditionRepoSingleton = new PrintRenditionRepository()
  }
  return printRenditionRepoSingleton
}

