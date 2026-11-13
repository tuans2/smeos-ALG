"use client"

import React, { useState } from "react"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { Copy } from "@/components/ui/icon-set/copy"
import { Check } from "@/components/ui/icon-set/check"
import { Phone } from "@/components/ui/icon-set/phone"
import { X } from "@/components/ui/icon-set/x"
import { Gift } from "@/components/ui/icon-set/gift"
import { ChevronDown } from "@/components/ui/icon-set/chevron-down"
import { ChevronUp } from "@/components/ui/icon-set/chevron-up"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { OccasionReminder } from "@/modules/crm/domain/customer-master-index"
import type { CustomerTier } from "@/modules/crm/domain/customer-master-index"
import {
  classifyReminderUrgency,
  generateOccasionCareScript,
  suggestFlowerForOccasion,
  URGENCY_CONFIG,
} from "@/modules/crm/domain/crm-care-scripts"

export interface OccasionCareCardProps {
  reminder: OccasionReminder
  customerTier: CustomerTier
  shopName: string
  hotline?: string | undefined
  onViewCustomer?: ((customerId: string) => void) | undefined
}

export function OccasionCareCard({
  reminder,
  customerTier,
  shopName,
  hotline,
  onViewCustomer,
}: OccasionCareCardProps) {
  const [copied, setCopied] = useState(false)
  const [showScript, setShowScript] = useState(false)

  const urgency = classifyReminderUrgency(reminder.daysLeft)
  const config = URGENCY_CONFIG[urgency]
  const suggestedFlower = suggestFlowerForOccasion(reminder.occasionName, reminder.suggestedFlower)
  const script = generateOccasionCareScript(
    { reminder, shopName, hotline },
    customerTier
  )

  function handleCopyScript() {
    void navigator.clipboard.writeText(script).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <Card className={`p-3.5 border-2 ${config.colorClass} transition-shadow hover:shadow-sm`}>
      {/* Header: tên khách + badge khẩn cấp */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-body-sm text-text">{reminder.customerName}</span>
            <span className={`px-2 py-0.5 rounded-full text-caption font-bold ${config.badgeClass}`}>
              {reminder.daysLeft === 0 ? "Hôm nay!" : `${reminder.daysLeft} ngày`}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-caption text-text-muted">
            <Calendar size={12} className="shrink-0" />
            <span className="font-semibold text-text">{reminder.occasionName}</span>
            {reminder.recipientName !== reminder.customerName && (
              <span>— tặng <strong>{reminder.recipientName}</strong></span>
            )}
          </div>
        </div>

        {onViewCustomer && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onViewCustomer(reminder.customerId)}
            className="text-caption text-primary hover:underline font-semibold shrink-0 h-auto p-0 hover:bg-transparent"
          >
            Hồ sơ →
          </Button>
        )}
      </div>

      {/* Gợi ý hoa & phân tầng */}
      <div className="flex items-center gap-2 mb-3">
        <Gift size={13} className="text-primary shrink-0" />
        <span className="text-caption text-text-muted">
          Gợi ý tặng: <strong className="text-primary">{suggestedFlower}</strong>
        </span>
        {reminder.isZaloAllowed && (
          <span className="ml-auto text-caption font-bold text-success bg-success-bg px-2 py-0.5 rounded-full">
            Zalo ✓
          </span>
        )}
      </div>

      {/* Kịch bản Zalo chăm sóc */}
      <div className="border-t border-border/50 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowScript(!showScript)}
            className="flex items-center gap-1 text-caption font-semibold text-primary hover:text-primary-dark h-auto p-0 hover:bg-transparent"
          >
            {showScript ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Kịch bản Zalo chăm sóc
          </Button>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyScript}
              className="h-7 px-2 text-caption gap-1 font-semibold"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Đã copy!" : "Copy Zalo"}
            </Button>
            {hotline && (
              <a
                href={`tel:${hotline}`}
                className="h-7 px-2 inline-flex items-center gap-1 text-caption font-semibold rounded border border-border hover:border-primary/40 hover:text-primary transition-colors"
              >
                <Phone size={12} />
                Gọi
              </a>
            )}
          </div>
        </div>

        {showScript && (
          <pre className="rounded-lg bg-surface border border-border p-3 text-caption text-text font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
            {script}
          </pre>
        )}
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL DANH SÁCH NHẮC HẸNCHĂM SÓC NGÀY KỶ NIỆM (CRM-08..12)
// ─────────────────────────────────────────────────────────────────────────────
export interface OccasionCarePanelProps {
  reminders: OccasionReminder[]
  shopName: string
  hotline?: string | undefined
  onClose: () => void
  onViewCustomer?: ((customerId: string) => void) | undefined
}

const TIER_MAP: Record<string, CustomerTier> = {
  VIP: "VIP",
  GOLD: "GOLD",
  SILVER: "SILVER",
  BRONZE: "BRONZE",
  NEW: "NEW",
}

export function OccasionCarePanel({
  reminders,
  shopName,
  hotline,
  onClose,
  onViewCustomer,
}: OccasionCarePanelProps) {
  const todayCount = reminders.filter((r) => r.daysLeft === 0).length
  const urgentCount = reminders.filter((r) => r.daysLeft > 0 && r.daysLeft <= 3).length

  return (
    <div className="rounded-xl border border-primary/30 bg-surface p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-bold text-body-sm text-text">
            <Gift size={16} className="text-primary" />
            <span>Lịch Chăm Sóc Ngày Kỷ Niệm Khách Hàng</span>
          </div>
          <div className="text-caption text-text-muted mt-0.5">
            {reminders.length} dịp trong 14 ngày tới
            {todayCount > 0 && (
              <span className="ml-2 font-bold text-danger">
                · {todayCount} dịp HÔM NAY
              </span>
            )}
            {urgentCount > 0 && (
              <span className="ml-2 font-bold text-warning-text">
                · {urgentCount} dịp trong 3 ngày tới
              </span>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0 text-text-muted hover:text-text hover:bg-surface-alt"
          aria-label="Đóng"
        >
          <X size={16} />
        </Button>
      </div>

      {/* Grid thẻ chăm sóc */}
      {reminders.length === 0 ? (
        <div className="py-8 text-center text-text-muted text-caption border border-dashed border-border rounded-xl">
          Không có dịp kỷ niệm nào trong 14 ngày tới
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
          {reminders.map((r, idx) => (
            <OccasionCareCard
              key={`${r.customerId}-${r.occasionName}-${idx}`}
              reminder={r}
              customerTier={TIER_MAP["BRONZE"] ?? "BRONZE"}
              shopName={shopName}
              hotline={hotline}
              onViewCustomer={onViewCustomer}
            />
          ))}
        </div>
      )}
    </div>
  )
}
