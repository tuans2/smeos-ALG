"use client"

import React from "react"
import { Phone } from "@/components/ui/icon-set/phone"
import { Heart } from "@/components/ui/icon-set/heart"
import { ShoppingBag } from "@/components/ui/icon-set/shopping-bag"
import { Award } from "@/components/ui/icon-set/award"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface CustomerProfileCardProps {
  name: string
  phone: string
  tier: "standard" | "silver" | "gold" | "diamond"
  totalOrders: number
  totalSpent: string
  preferredColors: string[]
  preferredFlowers: string[]
  notes?: string
  onCall?: () => void
  onNewOrder?: () => void
}

/**
 * CustomerProfileCard (Thẻ hồ sơ khách hàng & gu cắm hoa M08)
 */
export function CustomerProfileCard({
  name,
  phone,
  tier = "gold",
  totalOrders,
  totalSpent,
  preferredColors,
  preferredFlowers,
  notes,
  onCall,
  onNewOrder,
}: CustomerProfileCardProps) {
  const tierTone =
    tier === "diamond" ? "neutral" : tier === "gold" ? "warning" : "neutral"

  return (
    <Card className="rounded-2xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-title-sm">
            {name.charAt(0)}
          </div>
          <div>
            <div className="text-title font-extrabold text-text">{name}</div>
            <div className="text-caption text-text-muted flex items-center gap-1">
              <Phone size={12} />
              {phone}
            </div>
          </div>
        </div>
        <Badge tone={tierTone} className="uppercase font-bold tracking-wider">
          <Award size={12} className="mr-1" />
          VIP {tier}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-alt/50 p-3">
        <div className="flex items-center gap-2">
          <ShoppingBag size={16} className="text-text-muted" />
          <div>
            <div className="text-caption text-text-muted">Đơn hàng đã đặt</div>
            <div className="text-caption font-bold text-text">{totalOrders} đơn</div>
          </div>
        </div>
        <div>
          <div className="text-caption text-text-muted">Tổng chi tiêu</div>
          <div className="text-caption font-bold text-primary">{totalSpent}</div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-caption font-bold text-text">
          <Heart size={13} className="text-primary" />
          Gu sở thích:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {preferredColors.map((col, idx) => (
            <span key={idx} className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-caption text-primary font-medium">
              Tone {col}
            </span>
          ))}
          {preferredFlowers.map((flw, idx) => (
            <span key={idx} className="rounded-full bg-secondary/15 border border-secondary/25 px-2 py-0.5 text-caption text-secondary-text font-medium">
              {flw}
            </span>
          ))}
        </div>
      </div>

      {notes && (
        <div className="rounded-lg bg-warning-bg border border-warning/25 p-2.5 text-caption text-warning-text italic">
          Ghi chú: {notes}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        {onCall && (
          <Button variant="secondary" size="sm" onClick={onCall} className="gap-1.5">
            <Phone size={14} />
            Gọi điện
          </Button>
        )}
        {onNewOrder && (
          <Button size="sm" onClick={onNewOrder} className="gap-1.5">
            <Calendar size={14} />
            Lên đơn mới
          </Button>
        )}
      </div>
    </Card>
  )
}
