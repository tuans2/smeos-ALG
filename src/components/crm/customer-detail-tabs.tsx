"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { Receipt } from "@/components/ui/icon-set/receipt"
import { Shield } from "@/components/ui/icon-set/shield"

export type CustomerDetailTab = "profile" | "orders" | "occasions" | "privacy"

const BASE = "pb-2.5 px-2 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"

/** Thanh tab của chi tiết khách: hồ sơ, đơn đã đặt (checklist ALG 4.11), dịp kỷ niệm, quyền riêng tư. */
export function CustomerDetailTabs({ active, onChange, occasionCount, showOrders }: {
  active: CustomerDetailTab
  onChange: (tab: CustomerDetailTab) => void
  occasionCount: number
  showOrders: boolean
}) {
  const tabs: { id: CustomerDetailTab; label: string; icon?: typeof Calendar }[] = [
    { id: "profile", label: "Hồ sơ Master & RFM" },
    ...(showOrders ? [{ id: "orders" as const, label: "Đơn đã đặt", icon: Receipt }] : []),
    { id: "occasions", label: `Dịp kỷ niệm (${occasionCount})`, icon: Calendar },
    { id: "privacy", label: "Quyền riêng tư (Consent)", icon: Shield },
  ]
  return (
    <div className="flex border-b border-border bg-surface-alt/30 px-5 sm:px-6 gap-3 pt-2 text-caption font-semibold" role="tablist">
      {tabs.map(({ id, label, icon: Icon }) => (
        <Button variant="ghost"
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          onClick={() => onChange(id)}
          className={`text-[length:inherit] h-auto p-0 gap-0 ${BASE} ${active === id ? "border-primary text-primary font-bold" : "border-transparent text-text-muted hover:text-text"}`}
        >
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </Button>
      ))}
    </div>
  )
}
