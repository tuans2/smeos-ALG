import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { PrintRendition } from "../domain/print-rendition"
import type {
  IPrintRenditionRepository,
  PrintRenditionFilter,
} from "../domain/repositories/print-rendition-repository.interface"
import { getPrintRenditionRepository } from "../infra/print-rendition-repository"

export async function listPrintRenditionsUseCase(
  ctx: TenantContext,
  filter?: PrintRenditionFilter,
  repo: IPrintRenditionRepository = getPrintRenditionRepository()
): Promise<{ items: PrintRendition[]; total: number }> {
  return repo.list(ctx, filter)
}

