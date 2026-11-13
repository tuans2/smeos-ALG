import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { IAssetUsageRepository } from "@/modules/marketing-center/domain/repositories/asset-usage-repository.interface"
import { getAssetUsageRepository } from "@/modules/marketing-center/infra/asset-usage-repository"
import {
  type CreatePrintRenditionInput,
  type PrintRendition,
  createPrintRenditionSchema,
} from "../domain/print-rendition"
import { getPrintPreset, runPreflightCheck } from "../domain/print-preset"
import type { IPrintRenditionRepository } from "../domain/repositories/print-rendition-repository.interface"
import { getPrintRenditionRepository } from "../infra/print-rendition-repository"

export async function createPrintRenditionUseCase(
  ctx: TenantContext,
  rawInput: CreatePrintRenditionInput,
  repo: IPrintRenditionRepository = getPrintRenditionRepository(),
  usages: Pick<IAssetUsageRepository, "findById"> = getAssetUsageRepository()
): Promise<PrintRendition> {
  const input = createPrintRenditionSchema.parse(rawInput)

  // Nơi dùng tư liệu nhận từ body phải thuộc tổ chức đang thao tác — không thì 404.
  if (input.assetUsageId && !(await usages.findById(ctx, input.assetUsageId))) {
    throw notFound()
  }
  const preset = getPrintPreset(input.presetCode)

  const preflight = runPreflightCheck(
    {
      imageWidthPx: input.imageWidthPx,
      imageHeightPx: input.imageHeightPx,
      colorMode: input.colorMode,
      hasQrCode: input.hasQrCode,
      qrSizeMm: input.qrSizeMm,
      hasContentOutsideSafeZone: input.hasContentOutsideSafeZone,
    },
    preset
  )

  const widthMm = input.customWidthMm ?? preset.widthMm
  const heightMm = input.customHeightMm ?? preset.heightMm
  const bleedMm = input.customBleedMm ?? preset.bleedMm

  return repo.create(ctx, {
    assetId: input.assetId ?? null,
    assetUsageId: input.assetUsageId ?? null,
    sourceType: input.sourceType,
    sourceId: input.sourceId ?? null,
    presetCode: input.presetCode,
    widthMm,
    heightMm,
    bleedMm,
    dpi: input.dpi,
    preflight,
    status: preflight.passed ? "READY" : "FAILED",
    createdBy: ctx.userId ?? "system",
  })
}

