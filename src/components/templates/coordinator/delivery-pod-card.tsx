"use client"

import React from "react"
import { Truck } from "@/components/ui/icon-set/truck"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { Phone } from "@/components/ui/icon-set/phone"
import { User } from "@/components/ui/icon-set/user"
import { Image as ImageIcon } from "@/components/ui/icon-set/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { StructuredAddress } from "@/modules/products/domain/product-master-index"
import { useI18n } from "@/lib/i18n"

export interface DeliveryPODCardProps {
  orderCode: string
  shipperName: string
  shipperPhone: string
  deliveryAddress: StructuredAddress | string
  recipientName: string
  recipientPhone: string
  isDelivered: boolean
  deliveredAt?: string | null | undefined
  podImageUrl?: string | null | undefined
  recipientSignatureName?: string | null | undefined
  onConfirmComplete?: () => void
}

export function DeliveryPODCard({
  orderCode,
  shipperName,
  shipperPhone,
  deliveryAddress,
  recipientName,
  recipientPhone,
  isDelivered,
  deliveredAt,
  podImageUrl,
  recipientSignatureName,
  onConfirmComplete,
}: DeliveryPODCardProps) {
  const { ti } = useI18n()
  return (
    <Card className="rounded-2xl border border-border bg-surface p-6 shadow-sm flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-dashed border-border pb-4">
        <div>
          <div className="text-caption font-bold uppercase tracking-wider text-text-muted">
            Giao Vận & Bằng Chứng Trao Hoa (T21 POD)
          </div>
          <h3 className="text-title-sm font-extrabold text-text">
            Chứng từ Giao nhận Đơn #{orderCode}
          </h3>
        </div>
        <Badge tone={isDelivered ? "success" : "warning"} className="font-bold px-3 py-1 text-caption">
          {isDelivered ? "ĐÃ GIAO THÀNH CÔNG" : "ĐANG TRÊN ĐƯỜNG GIAO"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-caption">
        <div className="p-3.5 rounded-xl bg-surface-alt border border-border flex flex-col gap-2">
          <div className="font-bold text-text flex items-center gap-1.5">
            <Truck size={14} className="text-primary" />
            <span>Thông tin Shipper / Tài xế:</span>
          </div>
          <div className="text-text font-semibold">{shipperName}</div>
          <div className="text-text-muted flex items-center gap-1">
            <Phone size={12} />
            <span>{shipperPhone}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-alt border border-border flex flex-col gap-2">
          <div className="font-bold text-text flex items-center gap-1.5">
            <User size={14} className="text-primary" />
            <span>Người nhận hàng:</span>
          </div>
          <div className="text-text font-semibold">{recipientName} ({recipientPhone})</div>
          <div className="text-text-muted flex items-start gap-1">
            <MapPin size={13} className="text-danger-text shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-text font-medium">
                {typeof deliveryAddress === "object" && deliveryAddress !== null
                  ? deliveryAddress.street
                  : deliveryAddress}
              </span>
              {typeof deliveryAddress === "object" && deliveryAddress !== null && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="px-1.5 py-0.2 rounded bg-danger-bg text-danger-text text-caption font-bold">
                    {deliveryAddress.ward}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-info-bg text-info-text text-caption font-bold">
                    {deliveryAddress.district}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-accent-bg text-accent-text text-caption font-bold">
                    {deliveryAddress.city}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {podImageUrl ? (
        <div className="flex flex-col gap-2">
          <span className="text-caption font-bold text-text-muted flex items-center gap-1">
            <ImageIcon size={13} />
            <span>ẢNH CHỤP BẰNG CHỨNG GIAO HÀNG TẬN TAY (POD):</span>
          </span>
          <div className="relative aspect-video w-full max-w-md rounded-xl overflow-hidden border border-border bg-surface-alt">
            <img src={podImageUrl} alt="Bằng chứng giao hàng POD" className="h-full w-full object-cover" />
          </div>
          {deliveredAt && (
            <div className="text-caption text-success-text font-semibold mt-1">
              Đã giao hàng lúc: {deliveredAt} {recipientSignatureName ? `(Ký nhận: ${recipientSignatureName})` : ""}
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-dashed border-border text-center text-caption text-text-muted">
          Shipper chưa tải lên ảnh chụp bằng chứng giao hoa
        </div>
      )}

      {isDelivered && onConfirmComplete && (
        <div className="flex items-center justify-end pt-3 border-t border-dashed border-border">
          <Button onClick={onConfirmComplete} className="bg-success hover:bg-success-text text-white gap-1.5 font-bold">
            <CheckCircle2 size={15} />
            <span>Nghiệm Thu Hoàn Tất & Đóng Đơn Hàng</span>
          </Button>
        </div>
      )}
    </Card>
  )
}
