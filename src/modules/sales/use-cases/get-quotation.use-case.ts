import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { isQuotationExpired, type Quotation } from "../domain/quotation"
import type { IQuotationRepository } from "../domain/repositories/quotation-repository.interface"
import { getQuotationRepository } from "../infra/quotation-repository"

export async function getQuotationUseCase(
  ctx: TenantContext,
  id: string,
  repo: IQuotationRepository = getQuotationRepository(),
): Promise<Quotation> {
  const quotation = await repo.findById(ctx, id)
  if (!quotation) {
    throw notFound()
  }

  // Quá ngày hiệu lực → hiện là hết hạn. Việc GHI trạng thái do lượt quét định kỳ làm (`expire-quotations.ts`,
  // gói UJ-11) — trước đây GET ghi dữ liệu, và chỉ báo giá có người mở mới được đánh hết hạn.
  if (isQuotationExpired(quotation) && quotation.status !== "EXPIRED") {
    return { ...quotation, status: "EXPIRED" }
  }

  return quotation
}

