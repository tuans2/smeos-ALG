"use client"

import React from "react"
import { Eye } from "@/components/ui/icon-set/eye"
import { EyeOff } from "@/components/ui/icon-set/eye-off"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { Button } from "@/components/ui/button"
import { formatAddress, maskPhoneNumber } from "./florist-job-bom"
import type { VisibleCustomField } from "@/components/coordinator/custom-fields-section"

/** Phần con của `florist-job-card.tsx` (tách khi áp nhận diện ALG, giữ file chính dưới
 * giới hạn 350 dòng): khối giao nhận (che SĐT khách — PII), lưu ý kỹ thuật, trường tự tạo. */
export function FloristJobCardRecipient({
  makerTitle,
  recipientName,
  recipientPhone,
  deliveryAddress,
  maskPhone,
  onToggleMask,
  partnerInstruction,
  customFields,
}: {
  makerTitle: string
  recipientName: string
  recipientPhone?: string | undefined
  deliveryAddress?: unknown
  maskPhone: boolean
  onToggleMask: () => void
  partnerInstruction?: string | null | undefined
  customFields: VisibleCustomField[]
}) {
  return (
    <>
      <div className="p-3 rounded-xl bg-[var(--avi-cream)] border border-[var(--avi-ink-08)] text-caption space-y-1.5">
        <div className="flex items-center justify-between font-bold text-[var(--avi-ink)]">
          <span className="flex items-center gap-1.5">
            <MapPin size={13} className="text-[var(--avi-primary)]" />
            <span>Thông tin giao nhận cho bộ phận {makerTitle}:</span>
          </span>
          <Button
            variant="ghost"
            type="button"
            onClick={onToggleMask}
            className="h-auto p-0 inline-flex items-center gap-1 text-caption text-[var(--avi-ink-muted)] hover:text-[var(--avi-ink)] font-medium"
          >
            {maskPhone ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>{maskPhone ? "Hiện số đầy đủ" : "Che số ĐT"}</span>
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[var(--avi-ink)]">
          <div>
            <span className="text-[var(--avi-ink-muted)] font-medium">Người nhận:</span>{" "}
            <strong>{recipientName}</strong>
          </div>
          <div>
            <span className="text-[var(--avi-ink-muted)] font-medium">Số điện thoại:</span>{" "}
            <strong>{maskPhone ? maskPhoneNumber(recipientPhone) : recipientPhone || "Chưa có"}</strong>
          </div>
        </div>
        <div className="text-[var(--avi-ink)]">
          <span className="text-[var(--avi-ink-muted)] font-medium">Địa chỉ:</span>{" "}
          <span>{formatAddress(deliveryAddress)}</span>
        </div>
      </div>

      {partnerInstruction && (
        <div className="p-2.5 rounded-xl bg-[var(--avi-brick-10)] border border-[var(--avi-brick-25)] text-caption">
          <span className="font-bold text-[var(--avi-brick)]">Lưu ý kỹ thuật cho thợ:</span>{" "}
          <span className="text-[var(--avi-ink)] font-medium">{partnerInstruction}</span>
        </div>
      )}

      {customFields.length > 0 && (
        <div className="p-2.5 rounded-xl bg-[var(--avi-cream)] border border-[var(--avi-ink-08)] text-caption">
          <span className="font-bold text-[var(--avi-ink-muted)] uppercase text-caption block mb-1">Thông tin bổ sung</span>
          <div className="space-y-0.5 text-[var(--avi-ink)]">
            {customFields.map((f) => (
              <div key={f.key}>
                <span className="font-semibold">{f.label}:</span> {String(f.value)}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
