"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { Eye } from "@/components/ui/icon-set/eye"
import { Flower2 } from "@/components/ui/icon-set/flower2"
import { Heart } from "@/components/ui/icon-set/heart"
import { useI18n } from "@/lib/i18n"

export interface OrderItemCardProps {
  id: string
  code: string
  status: string
  productionStatus: string
  deliveryStatus: string
  totalVnd: number
  cardMessage?: string
  deliveryAddress?: { recipientName?: string; phone?: string; street?: string }
  deliveryWindow?: { date: string; timeSlot?: string }
  items?: Array<{ description: string; quantity: number }>
  createdAt: string
}

export function OrderCard({
  order,
  onSelect,
}: {
  order: OrderItemCardProps
  onSelect: () => void
}) {
  const { dict, formatCurrency, formatTime } = useI18n()

  return (
    <Button variant="outline"
      type="button"
      onClick={onSelect}
      className="justify-start font-[inherit] gap-0 w-full text-left cursor-pointer rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all hover:border-primary hover:shadow-md space-y-2 text-body-sm focus-visible:outline-2 focus-visible:outline-primary min-h-11 hover:bg-surface"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-primary">{order.code}</span>
        <span className="text-caption text-text-muted">
          {formatTime(order.createdAt)}
        </span>
      </div>

      <div>
        <div className="font-bold text-text">
          {order.deliveryAddress?.recipientName ?? dict.orders.actions.walkInCustomer}
        </div>
        <div className="text-text-muted truncate text-caption">
          {order.deliveryAddress?.street ?? dict.orders.actions.pickupAtShop}
        </div>
      </div>

      {order.items && order.items[0] && (
        <div className="flex items-center gap-1.5 text-caption text-text-muted bg-surface-alt px-2.5 py-1.5 rounded-xl">
          <Flower2 size={14} weight="duotone" className="shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">
            {order.items[0].description}
            {order.items.length > 1 ? ` (+${order.items.length - 1} món)` : ""}
          </span>
        </div>
      )}

      {order.cardMessage && (
        <div className="flex items-center gap-1.5 truncate text-caption italic text-warning-text">
          <Heart size={14} weight="duotone" className="shrink-0" aria-hidden="true" />
          <span className="truncate">{order.cardMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-2">
        <span className="font-bold text-primary">
          {formatCurrency(order.totalVnd)}
        </span>
        <span className="text-caption text-primary flex items-center gap-1 font-semibold">
          <Eye size={13} aria-hidden="true" /> {dict.orders.actions.viewDetails}
        </span>
      </div>
    </Button>
  )
}

