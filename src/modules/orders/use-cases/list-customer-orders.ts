/** `GET /crm/customers/:id/orders` — tab "Đơn đã đặt" trong chi tiết khách (checklist ALG 4.11). */

import { AppError } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { findCustomerForOrders, listOrdersOfCustomer } from "../infra/customer-orders-query"

export interface CustomerOrderView {
  id: string
  code: string
  source: string | null
  status: string
  deliveryStatus: string
  totalVnd: number
  balanceVnd: number
  createdAt: string
  deliveryDate: string | null
  summary: string
}

export async function listCustomerOrders(ctx: TenantContext, customerId: string): Promise<CustomerOrderView[]> {
  const customer = await findCustomerForOrders(ctx, customerId)
  if (!customer) throw new AppError("NOT_FOUND", "Không tìm thấy khách hàng.")
  const rows = await listOrdersOfCustomer(ctx, customer)
  return rows.map((o) => {
    const window = (o.delivery_window ?? {}) as { date?: string }
    return {
      id: o.id, code: o.code, source: o.source, status: o.status, deliveryStatus: o.delivery_status,
      totalVnd: Number(o.total_vnd), balanceVnd: Number(o.balance_vnd), createdAt: o.created_at.toISOString(),
      deliveryDate: typeof window.date === "string" ? window.date : null,
      summary: o.items.map((i) => `${i.description ?? "Mẫu"} × ${i.quantity}`).join(", "),
    }
  })
}
