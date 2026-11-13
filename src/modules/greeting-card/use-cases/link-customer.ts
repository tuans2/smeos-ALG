import type { TenantContext } from "@/core/tenancy"
import { conflict, notFound, validationFailed } from "@/core/http/errors"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { isValidVnPhone, normalizePhone } from "../domain/greeting-card-rules"
import { LinkCustomerRepository, getLinkCustomerRepository } from "../infra/link-customer-repository"
import { resolveSaleScope } from "./order-scope"

/**
 * Sale ghi tên (và SĐT) khách lên link đã gửi mà chưa có đơn — thẻ hiện tên thật thay cho
 * "Khách đang xem mẫu" (PO 16/10/2026). Sale "chỉ khách của mình" không sửa link của sale khác (404).
 */
export async function updateLinkCustomer(
  ctx: TenantContext,
  sessionId: string,
  input: { customerName: string; customerPhone?: string | null | undefined },
  repo = getLinkCustomerRepository(),
) {
  const customerName = input.customerName.trim()
  const customerPhone = input.customerPhone ? normalizePhone(input.customerPhone) : null
  if (!customerName) throw validationFailed({ customerName: "Vui lòng nhập tên khách" })
  if (customerPhone && !isValidVnPhone(customerPhone)) throw validationFailed({ customerPhone: "Số điện thoại không hợp lệ" })

  const link = await repo.find(ctx, sessionId, await resolveSaleScope(ctx))
  if (!link) throw notFound()
  if (link.order_id || !(await repo.update(ctx, sessionId, { customerName, customerPhone }))) {
    throw conflict("Link đã có đơn hàng — thông tin khách lấy theo đơn")
  }

  await recordAuditLog(ctx, {
    action: "greeting_card.link.customer_update",
    entityType: "greeting_session",
    entityId: sessionId,
    before: { customerName: link.customer_name, hasPhone: Boolean(link.customer_phone) },
    after: { customerName, hasPhone: Boolean(customerPhone) },
  })
  return { customerName, customerPhone }
}
