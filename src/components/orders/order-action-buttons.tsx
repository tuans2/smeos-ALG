"use client"

import Link from "next/link"
import { Printer } from "@/components/ui/icon-set/printer"
import { Ban } from "@/components/ui/icon-set/ban"
import { Truck } from "@/components/ui/icon-set/truck"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"
import { isHrefOpen } from "@/lib/feature-lock"
import { orderBookActions } from "@/modules/orders/domain/order-book-actions"
import type { DeliveryStatus, OrderStatus } from "@/modules/orders/domain/order-types"

interface OrderActionButtonsProps {
  orderStatus: OrderStatus
  deliveryStatus: DeliveryStatus
  onPrint: () => void
  onCancelRequest: () => void
}

/**
 * Thanh nút chi tiết đơn (K2: 1 nút chính + phụ). Không đổi tiến độ ở đây (PO 07/11/2026, Q8; nợ #150): đơn đã xác nhận
 * nằm ở Điều phối — nơi đòi bằng chứng (phân công, QC, POD) và giữ bước điều phối khớp ba trục của đơn.
 */
export function OrderActionButtons({ orderStatus, deliveryStatus, onPrint, onCancelRequest }: OrderActionButtonsProps) {
  const { dict } = useI18n()
  const actions = orderBookActions({ status: orderStatus, deliveryStatus })

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onPrint}>
          <Printer className="mr-1.5 h-4 w-4" /> {dict.orders.actions.printA6}
        </Button>
        {actions.canCancel && (
          <Button variant="outline" size="sm"
            className="text-danger hover:bg-danger-bg border-danger/30"
            onClick={onCancelRequest}>
            <Ban className="mr-1.5 h-4 w-4" /> {dict.orders.actions.cancelOrder}
          </Button>
        )}
      </div>
      {actions.followInCoordinator && isHrefOpen("/dieu-phoi") && (
        <Link href="/dieu-phoi" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-body-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Truck className="h-4 w-4" /> {dict.orders.actions.followInCoordinator}
        </Link>
      )}
    </div>
  )
}
