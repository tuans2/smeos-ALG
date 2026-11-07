import { notFound, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { IngestOrderInput, OrderItemInput, OrderRecord } from "@/modules/orders/domain/order-types"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"
import {
  canTransitionQuotationStatus,
  isQuotationExpired,
  QUOTATION_STATUS_LABELS,
  type Quotation,
} from "../domain/quotation"
import type { IQuotationRepository } from "../domain/repositories/quotation-repository.interface"
import { getQuotationRepository } from "../infra/quotation-repository"

export interface ConvertQuotationDeps {
  repo?: IQuotationRepository
  ingestOrderFn?: (ctx: TenantContext, input: IngestOrderInput) => Promise<OrderRecord>
}

export interface ConvertQuotationResult {
  quotation: Quotation
  order: OrderRecord
}

export async function convertQuotationToOrderUseCase(
  ctx: TenantContext,
  id: string,
  deps: ConvertQuotationDeps = {},
): Promise<ConvertQuotationResult> {
  const repo = deps.repo ?? getQuotationRepository()
  const quotation = await repo.findById(ctx, id)
  if (!quotation) {
    throw notFound()
  }

  if (quotation.status === "CONVERTED") {
    throw validationFailed({
      status: `Báo giá ${quotation.code} đã được chuyển đổi thành đơn hàng trước đó.`,
    })
  }

  if (!canTransitionQuotationStatus(quotation.status, "CONVERTED")) {
    throw validationFailed({
      status: `Báo giá đang ở trạng thái "${QUOTATION_STATUS_LABELS[quotation.status]}" nên chưa tạo đơn được.`,
    })
  }

  // Hết hạn chỉ được ghi khi có người mở chi tiết — báo giá đã gửi, quá hạn mà chưa ai mở vẫn ở `SENT`.
  // Không tạo đơn với giá đã hết hiệu lực (audit hành trình Q2, gói UJ-04).
  if (isQuotationExpired(quotation)) {
    throw validationFailed({
      status: `Báo giá ${quotation.code} đã hết hiệu lực — gia hạn ngày hiệu lực rồi mới tạo đơn.`,
    })
  }

  const orderItems: OrderItemInput[] = quotation.items.map((it) => ({
    productId: it.productId ?? undefined,
    description: it.name,
    quantity: it.qty,
    unitPriceVnd: it.unitPrice,
    metadata: it.note ? { note: it.note } : null,
  }))

  // Chiếm quyền chuyển bằng cập nhật có điều kiện trước khi tạo đơn: hai yêu cầu
  // song song (bấm hai lần, hai nhân viên) chỉ một yêu cầu thắng, không sinh đơn trùng.
  const claimed = await repo.claimConversion(ctx, id, quotation.status)
  if (!claimed) {
    throw validationFailed({
      status: `Báo giá ${quotation.code} vừa được chuyển đổi hoặc thay đổi trạng thái. Tải lại để xem trạng thái mới.`,
    })
  }

  const ingestFn = deps.ingestOrderFn ?? ingestOrder
  let order: OrderRecord
  try {
    order = await ingestFn(ctx, {
      source: "QUOTATION",
      customerId: quotation.customerId ?? undefined,
      leadId: quotation.leadId ?? undefined,
      items: orderItems,
      internalNote: `Tạo từ báo giá ${quotation.code}`,
    })
  } catch (err) {
    await repo.releaseConversion(ctx, id, quotation.status)
    throw err
  }

  const updatedQuotation = await repo.update(ctx, id, {
    status: "CONVERTED",
    convertedOrderId: order.id,
  })

  return {
    quotation: updatedQuotation,
    order,
  }
}

