"use client"

import React from "react"
import { Lock, Phone, User } from "@/components/ui/icons"

interface SubcontractRecipientContactProps {
  recipientName?: string | null | undefined
  recipientPhone?: string | null | undefined
  isPhoneMasked?: boolean | undefined
}

export function SubcontractRecipientContact({
  recipientName,
  recipientPhone,
  isPhoneMasked,
}: SubcontractRecipientContactProps) {
  if (!recipientName && !recipientPhone) return null

  return (
    <div className="p-3 rounded-xl bg-surface-alt border border-border flex items-start gap-2.5">
      <User size={16} className="text-primary mt-0.5 shrink-0" />
      <div className="flex-1">
        <span className="text-caption text-text-muted block">Thông tin liên hệ người nhận:</span>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {recipientName && (
            <span className="text-text font-semibold text-body-sm">{recipientName}</span>
          )}
          {recipientPhone && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border">
              {isPhoneMasked ? (
                <>
                  <Lock size={12} className="text-warning-text" />
                  <span className="font-mono text-caption font-bold text-text tracking-wider">
                    {recipientPhone}
                  </span>
                  <span className="text-caption text-text-muted italic">
                    (Mở khóa sau khi ảnh QC được duyệt)
                  </span>
                </>
              ) : (
                <>
                  <a
                    href={`tel:${recipientPhone}`}
                    className="font-mono text-caption font-black text-primary hover:underline flex items-center gap-1"
                  >
                    <Phone size={12} /> {recipientPhone}
                  </a>
                  <span className="text-caption font-bold text-success">
                    ✓ Đã mở khóa liên hệ
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
