"use client"

import React from "react"
import { CheckCircle2, ImageIcon } from "@/components/ui/icons"
import type { DeliveryProofInfo } from "./subcontract-card-types"

export interface SubcontractPodSuccessProps {
  existingDeliveryProof?: DeliveryProofInfo | null | undefined
  subcontractPriceVnd: number
}

export function SubcontractPodSuccess({
  existingDeliveryProof,
  subcontractPriceVnd,
}: SubcontractPodSuccessProps) {
  return (
    <div className="p-4 rounded-xl bg-success/10 border border-success/30 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-full bg-success/20">
          <CheckCircle2 size={20} className="text-success" />
        </div>
        <div>
          <span className="text-body-sm font-extrabold text-success block">
            Đơn hàng đã giao thành công & Nghiệm thu hoàn tất
          </span>
          <span className="text-caption text-text-muted">
            Thù lao gia công {subcontractPriceVnd.toLocaleString("vi-VN")} đ đã được ghi nhận vào tài khoản của chi nhánh.
          </span>
        </div>
      </div>

      {existingDeliveryProof?.photoUrls && existingDeliveryProof.photoUrls.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-success/20">
          <span className="text-caption font-bold text-text-muted flex items-center gap-1">
            <ImageIcon size={13} /> Ảnh bằng chứng giao hàng:
          </span>
          <div className="grid grid-cols-3 gap-2">
            {existingDeliveryProof.photoUrls.map((url, idx) => (
              <div key={idx} className="relative h-24 rounded-lg overflow-hidden border border-border shadow-xs">
                <img
                  src={url.startsWith("http") || url.startsWith("/api/v1/storage/") ? url : `/api/v1/storage/${url}`}
                  alt={`Ảnh giao hàng #${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
