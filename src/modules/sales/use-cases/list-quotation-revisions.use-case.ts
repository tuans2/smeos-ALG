/** `GET /quotations/:id/revisions` — các phiên bản trước của báo giá, mới nhất trước (checklist ALG 3.10). */

import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { IQuotationRepository } from "../domain/repositories/quotation-repository.interface"
import { getQuotationRepository } from "../infra/quotation-repository"
import { QuotationRevisionRepository, type QuotationRevisionRow } from "../infra/quotation-revision-repository"

export async function listQuotationRevisionsUseCase(
  ctx: TenantContext,
  id: string,
  repo: IQuotationRepository = getQuotationRepository(),
  revisions: Pick<QuotationRevisionRepository, "list"> = new QuotationRevisionRepository(),
): Promise<QuotationRevisionRow[]> {
  if (!(await repo.findById(ctx, id))) throw notFound()
  return revisions.list(ctx, id)
}
