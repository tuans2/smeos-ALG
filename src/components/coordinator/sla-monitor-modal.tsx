"use client"

import React, { useState, useEffect, useCallback } from "react"
import { ShieldAlert } from "@/components/ui/icon-set/shield-alert"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SlaMonitorPanel, type SlaMonitorOrder } from "./sla-monitor-panel"
import type { CoordinatorOrderView } from "@/modules/coordinator/use-cases/present-coordinator-order"

export interface SlaMonitorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectOrder?: ((orderId: string) => void) | undefined
}

export function SlaMonitorModal({
  isOpen,
  onClose,
  onSelectOrder,
}: SlaMonitorModalProps) {
  const [orders, setOrders] = useState<SlaMonitorOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/coordinator/orders?limit=50")
      if (!res.ok) throw new Error("Không thể tải danh sách đơn điều phối")
      const data = (await res.json()) as { orders?: CoordinatorOrderView[] }
      if (Array.isArray(data.orders)) {
        const mapped: SlaMonitorOrder[] = data.orders.map((o) => ({
          id: o.id,
          orderCode: o.orderCode,
          stage: o.stage,
          stageLabel: o.stageLabel,
          recipientName: o.recipientName,
          deliveryTargetTime: o.deliveryTargetTime,
          timeRemaining: o.timeRemaining,
          partnerName: o.partnerName,
        }))
        setOrders(mapped)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi kết nối khi tải SLA")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      void fetchOrders()
    }
  }, [isOpen, fetchOrders])

  const dialogTitle = (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-danger/10 text-danger flex items-center justify-center shrink-0">
        <ShieldAlert size={20} />
      </div>
      <div>
        <div className="text-title-sm font-extrabold text-text">
          Giám Sát SLA &amp; Cảnh Báo Trễ Đơn Mạng Lưới
        </div>
        <div className="text-caption text-text-muted">
          Theo dõi thời gian thực, đánh giá rủi ro SLA và đề xuất tái điều phối tự động
        </div>
      </div>
    </div>
  )

  const dialogFooter = (
    <div className="flex items-center justify-between w-full">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void fetchOrders()}
        disabled={loading}
        className="h-8 text-caption gap-1.5"
      >
        <RefreshCw size={12} className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
        Làm mới dữ liệu
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClose}
        className="h-8 text-caption"
      >
        Đóng
      </Button>
    </div>
  )

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={dialogTitle}
      footer={dialogFooter}
      size="lg"
      className="max-w-4xl"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl border border-danger/40 bg-danger-bg text-danger text-caption font-semibold">
            {error}
          </div>
        )}

        {loading && orders.length === 0 ? (
          <div className="py-16 text-center text-caption text-text-muted">
            Đang phân tích SLA và tải tiến độ đơn hàng...
          </div>
        ) : (
          <SlaMonitorPanel
            orders={orders}
            onSelectOrder={(id) => {
              onClose()
              if (onSelectOrder) onSelectOrder(id)
            }}
          />
        )}
      </div>
    </Dialog>
  )
}
