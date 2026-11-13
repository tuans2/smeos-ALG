import { notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { updateLead } from "@/modules/acquisition/use-cases/manage-leads"
import {
  canTransitionQuotationStatus,
  QUOTATION_STATUS_LABELS,
  type Quotation,
} from "../domain/quotation"
import type { IQuotationRepository } from "../domain/repositories/quotation-repository.interface"
import { getQuotationRepository } from "../infra/quotation-repository"

export interface SendQuotationDeps {
  repo?: IQuotationRepository
  updateLeadFn?: (ctx: TenantContext, leadId: string, status: string) => Promise<unknown>
}

export async function sendQuotationUseCase(
  ctx: TenantContext,
  id: string,
  deps: SendQuotationDeps = {},
): Promise<Quotation> {
  const repo = deps.repo ?? getQuotationRepository()
  const quotation = await repo.findById(ctx, id)
  if (!quotation) {
    throw notFound()
  }

  if (!canTransitionQuotationStatus(quotation.status, "SENT")) {
    throw validationFailed({
      status: `Báo giá đang ở trạng thái "${QUOTATION_STATUS_LABELS[quotation.status]}" nên không gửi được.`,
    })
  }

  const updated = await repo.update(ctx, id, { status: "SENT" })

  // Nếu báo giá gắn với Lead, tự động cập nhật trạng thái Lead sang "QUOTATION_SENT"
  if (quotation.leadId) {
    const updateFn =
      deps.updateLeadFn ??
      (async (c, leadId, status) => {
        try {
          await updateLead(c, leadId, { status })
        } catch {
          // Bỏ qua nếu lead đã ở trạng thái kết thúc hoặc không chuyển được
        }
      })
    await updateFn(ctx, quotation.leadId, "QUOTATION_SENT")
  }

  return updated
}

