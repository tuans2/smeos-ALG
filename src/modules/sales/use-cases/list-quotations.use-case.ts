import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { Quotation, QuotationStatus } from "../domain/quotation"
import type {
  IQuotationRepository,
  QuotationFilter,
} from "../domain/repositories/quotation-repository.interface"
import { getQuotationRepository } from "../infra/quotation-repository"

export interface ListQuotationsOutput {
  items: Quotation[]
  total: number
  nextCursor?: string | undefined
  counts: Record<QuotationStatus, number>
}

export async function listQuotationsUseCase(
  ctx: TenantContext,
  filter?: QuotationFilter,
  repo: IQuotationRepository = getQuotationRepository(),
): Promise<ListQuotationsOutput> {
  const [listRes, counts] = await Promise.all([
    repo.list(ctx, filter),
    repo.countByStatus(ctx),
  ])

  return {
    items: listRes.items,
    total: listRes.total,
    nextCursor: listRes.nextCursor,
    counts,
  }
}

