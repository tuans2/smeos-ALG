"use client"

import React, { useRef, useState } from "react"
import { Truck } from "@/components/ui/icon-set/truck"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Upload } from "@/components/ui/icon-set/upload"
import { PackageCheck } from "@/components/ui/icon-set/package-check"
import { Navigation } from "@/components/ui/icon-set/navigation"
import { AlertOctagon } from "@/components/ui/icon-set/alert-octagon"
import { Button } from "@/components/ui/button"
import { safeImageSrc } from "@/lib/safe-image-src"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  errorMessage,
  uploadCoordinatorPhoto,
  type CoordinationOrder,
} from "@/components/coordinator/coordinator-api"

/**
 * P6 — Giao hàng & POD (Template T18–T21, F11/F12).
 *
 * Mỗi nút là một sự kiện giao gửi thẳng lên máy chủ: lấy hàng → đang giao →
 * giao thành công (bắt buộc ảnh POD hoặc tên người ký) / giao thất bại (mở
 * sự cố). Bản trước điền sẵn tên shipper giả, lấy ảnh mẫu làm ảnh POD, và chỉ
 * có một nút "giao xong".
 */
export type DeliveryEventInput = {
  event: "PICKED_UP" | "ON_THE_WAY" | "DELIVERED_SUCCESS" | "DELIVERY_FAILED"
  carrier?: string
  shipperName: string
  shipperPhone?: string
  podAssetId?: string
  recipientSignedName?: string
  failureReason?: string
}

export interface DeliveryDispatchModalProps {
  isOpen: boolean
  order: CoordinationOrder | null
  onClose: () => void
  onSubmit: (input: DeliveryEventInput) => Promise<void>
}

const STATE_LABEL: Record<string, string> = {
  PICKED_UP: "Shipper đã lấy hàng",
  ON_THE_WAY: "Đang trên đường giao",
  DELIVERED_SUCCESS: "Đã giao thành công",
  DELIVERY_FAILED: "Giao thất bại",
}

function addressText(addr: unknown): string {
  if (addr && typeof addr === "object") {
    const a = addr as Record<string, unknown>
    return (
      (typeof a.formattedAddress === "string" && a.formattedAddress) ||
      [a.street, a.ward, a.district, a.city].filter((v) => typeof v === "string" && v).join(", ")
    )
  }
  return typeof addr === "string" ? addr : ""
}

export function DeliveryDispatchModal({ isOpen, order, onClose, onSubmit }: DeliveryDispatchModalProps) {
  // Giá trị đầu lấy từ đơn; dashboard dựng lại modal (`key`) mỗi lần mở.
  const [carrier, setCarrier] = useState(order?.delivery.carrier ?? "")
  const [shipperName, setShipperName] = useState(order?.delivery.shipperName ?? "")
  const [shipperPhone, setShipperPhone] = useState(order?.delivery.shipperPhone ?? "")
  const [podAssetId, setPodAssetId] = useState<string | null>(null)
  const [podPreview, setPodPreview] = useState<string | null>(null)
  const [recipientSignedName, setRecipientSignedName] = useState("")
  const [failureReason, setFailureReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!isOpen || !order) return null

  const state = order.delivery.state

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const { assetId, previewUrl } = await uploadCoordinatorPhoto(file)
      setPodAssetId(assetId)
      setPodPreview(previewUrl)
    } catch (err) {
      setError(`Không tải được ảnh POD: ${errorMessage(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const send = async (event: DeliveryEventInput["event"]) => {
    if (!shipperName.trim()) {
      setError("Nhập tên shipper trước.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        event,
        shipperName: shipperName.trim(),
        ...(carrier.trim() ? { carrier: carrier.trim() } : {}),
        ...(shipperPhone.trim() ? { shipperPhone: shipperPhone.trim() } : {}),
        ...(event === "DELIVERED_SUCCESS" && podAssetId ? { podAssetId } : {}),
        ...(event === "DELIVERED_SUCCESS" && recipientSignedName.trim() ? { recipientSignedName: recipientSignedName.trim() } : {}),
        ...(event === "DELIVERY_FAILED" ? { failureReason: failureReason.trim() } : {}),
      })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const input = "w-full px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger"

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-danger-bg text-danger-text flex items-center justify-center">
            <Truck size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-surface-alt text-text text-caption font-black uppercase border border-border">
                BƯỚC 6 • GIAO HÀNG
              </span>
              <h3 className="text-body font-extrabold text-text">Giao Hàng & Bằng Chứng Giao</h3>
            </div>
          </div>
        </div>
      }
      description={
        <span>
          Đơn #{order.orderCode} • Hẹn giao {order.deliveryTargetTime}
          {state ? ` • Hiện tại: ${STATE_LABEL[state] ?? state}` : " • Chưa bàn giao shipper"}
        </span>
      }
      footer={
        <div className="flex items-center justify-end w-full">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      <div className="p-1 flex flex-col gap-4 text-caption">
        <div className="p-3 rounded-xl bg-surface-alt border border-border">
          <div className="font-bold text-text">
            Người nhận: {order.recipientName} · {order.recipientPhone}
          </div>
          <div className="text-text-muted mt-0.5">{addressText(order.deliveryAddress)}</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-bold text-text block mb-1">Đơn vị vận chuyển</label>
            <Input list="carriers" className={input} value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="AhaMove, Grab…" />
            <datalist id="carriers">
              <option value="GrabExpress" />
              <option value="AhaMove" />
              <option value="Lalamove" />
              <option value="Shipper nội bộ" />
            </datalist>
          </div>
          <div>
            <label className="font-bold text-text block mb-1">Tên shipper *</label>
            <Input className={input} value={shipperName} onChange={(e) => setShipperName(e.target.value)} />
          </div>
          <div>
            <label className="font-bold text-text block mb-1">SĐT shipper</label>
            <Input className={input} value={shipperPhone} onChange={(e) => setShipperPhone(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy || Boolean(state)} onClick={() => send("PICKED_UP")} className="gap-1.5">
            <PackageCheck size={14} /> Shipper đã lấy hàng
          </Button>
          <Button size="sm" variant="outline" disabled={busy || state === "ON_THE_WAY"} onClick={() => send("ON_THE_WAY")} className="gap-1.5">
            <Navigation size={14} /> Đang trên đường giao
          </Button>
        </div>

        <div className="p-3 rounded-xl border border-success-border bg-success-bg/40 flex flex-col gap-2">
          <span className="font-bold text-success-text">Giao thành công — cần ảnh POD hoặc tên người ký nhận</span>
          <div className="flex items-center gap-3">
            <div className="w-24 h-24 rounded-lg border border-border bg-surface overflow-hidden flex items-center justify-center shrink-0">
              {podPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={safeImageSrc(podPreview)} alt="Ảnh POD" className="w-full h-full object-cover" />
              ) : (
                <span className="text-caption text-text-muted text-center p-1">Chưa có ảnh POD</span>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleUpload} />
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()} className="gap-1.5 w-fit">
                <Upload size={13} /> Tải ảnh trao hàng
              </Button>
              <Input
                className={input}
                placeholder="Tên người ký nhận thực tế"
                value={recipientSignedName}
                onChange={(e) => setRecipientSignedName(e.target.value)}
              />
            </div>
          </div>
          <Button
            size="sm"
            disabled={busy || (!podAssetId && !recipientSignedName.trim())}
            onClick={() => send("DELIVERED_SUCCESS")}
            className="bg-success hover:bg-success-text text-white font-bold gap-1.5 w-fit"
          >
            <CheckCircle2 size={14} /> Xác nhận giao thành công
          </Button>
        </div>

        <div className="p-3 rounded-xl border border-danger-border bg-danger-bg/40 flex flex-col gap-2">
          <span className="font-bold text-danger-text">Giao thất bại — mở sự cố</span>
          <Input
            className={input}
            placeholder="Lý do (người nhận không nghe máy, sai địa chỉ…)"
            value={failureReason}
            onChange={(e) => setFailureReason(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !failureReason.trim()}
            onClick={() => send("DELIVERY_FAILED")}
            className="gap-1.5 text-danger-text border-danger-border w-fit"
          >
            <AlertOctagon size={14} /> Báo giao thất bại
          </Button>
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-xl border border-danger-border bg-danger-bg text-danger-text font-semibold">
            {error}
          </div>
        )}
      </div>
    </Dialog>
  )
}
