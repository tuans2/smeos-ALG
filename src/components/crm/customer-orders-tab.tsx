"use client"

import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

import { EmptyState } from "@/components/ui/empty-state"
import { OrderDetailModal } from "@/components/orders/order-detail-modal"
import { formatCurrency, formatDate } from "@/lib/i18n/formatters"

interface CustomerOrder {
  id: string
  code: string
  source: string | null
  status: string
  totalVnd: number
  balanceVnd: number
  createdAt: string
  deliveryDate: string | null
  summary: string
}

const STATUS_TEXT: Record<string, string> = {
  DRAFT: "Nháp", CONFIRMED: "Đã xác nhận", PROCESSING: "Đang làm", DELIVERED: "Đã giao", COMPLETED: "Hoàn tất", CANCELLED: "Đã huỷ",
}
const SOURCE_TEXT: Record<string, string> = { BROCHURE: "Bộ sưu tập riêng", MANUAL: "Nhập tay", CHAT: "Hội thoại", CATALOG: "Bộ sưu tập chung" }

/** Tab "Đơn đã đặt" (checklist ALG 4.11): mọi đơn của khách, bấm để mở chi tiết đơn. */
export function CustomerOrdersTab({ customerId }: { customerId: string }) {
  const [orders, setOrders] = useState<CustomerOrder[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/v1/crm/customers/${customerId}/orders`)
      .then(async (r) => (r.ok ? ((await r.json()) as { data: CustomerOrder[] }) : Promise.reject(new Error("Không tải được đơn của khách"))))
      .then((j) => setOrders(j.data))
      .catch((e: Error) => setError(e.message))
  }, [customerId])

  if (error) return <p role="alert" className="text-caption text-danger">{error}</p>
  if (orders === null) return <p className="text-caption text-text-muted">Đang tải đơn của khách…</p>
  if (orders.length === 0) return <EmptyState title="Khách chưa có đơn nào" reason="Đơn của khách ở mọi nguồn sẽ hiện ở đây." />
  return (
    <>
    <OrderDetailModal orderId={openId} onClose={() => setOpenId(null)} onUpdated={() => setOpenId(null)} />
    <ul className="divide-y divide-border rounded-xl border border-border">
      {orders.map((o) => (
        <li key={o.id}>
          <Button variant="ghost" type="button" onClick={() => setOpenId(o.id)} className="h-auto font-[inherit] flex w-full items-start justify-between gap-3 p-3 text-left text-caption hover:bg-surface-alt">
            <span>
              <span className="block font-semibold text-text">Đơn {o.code} · {STATUS_TEXT[o.status] ?? o.status}</span>
              <span className="block text-text-muted">{o.summary || "—"}</span>
              <span className="block text-text-muted">
                {SOURCE_TEXT[o.source ?? ""] ?? "Khác"} · đặt {formatDate(o.createdAt)}{o.deliveryDate ? ` · giao ${o.deliveryDate}` : ""}
              </span>
            </span>
            <span className="text-right">
              <span className="block font-bold text-text">{formatCurrency(o.totalVnd)}</span>
              {o.balanceVnd > 0 && o.status !== "CANCELLED" && <span className="block text-warning-text">còn {formatCurrency(o.balanceVnd)}</span>}
            </span>
          </Button>
        </li>
      ))}
    </ul>
    </>
  )
}
