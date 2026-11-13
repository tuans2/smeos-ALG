"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"

import { snakeKeys } from "@/lib/case-keys"
export interface ManualBlockModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  products: Array<{ id: string; name: string; code: string }>
  preselectedProductId?: string | undefined
  preselectedDate?: string | undefined
}

export function ManualBlockModal({
  isOpen,
  onClose,
  onSuccess,
  products,
  preselectedProductId,
  preselectedDate,
}: ManualBlockModalProps) {
  const [productId, setProductId] = useState(preselectedProductId ?? products[0]?.id ?? "")
  const [checkInDate, setCheckInDate] = useState(preselectedDate ?? new Date().toISOString().slice(0, 10))
  const [checkOutDate, setCheckOutDate] = useState(
    preselectedDate
      ? new Date(new Date(preselectedDate).getTime() + 86400000).toISOString().slice(0, 10)
      : new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  )
  const [note, setNote] = useState("Bảo trì / Sửa chữa")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!productId) {
      setError("Vui lòng chọn phòng / sản phẩm")
      return
    }
    if (!checkInDate || !checkOutDate) {
      setError("Vui lòng nhập ngày bắt đầu và kết thúc")
      return
    }
    if (checkOutDate <= checkInDate) {
      setError("Ngày kết thúc phải sau ngày bắt đầu")
      return
    }

    try {
      setLoading(true)
      const res = await fetch("/api/v1/availability/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snakeKeys({
          productId,
          checkInDate,
          checkOutDate,
          note: note.trim() || undefined,
        })),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || "Không thể tạo khối chặn")
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calendar size={18} />
          </div>
          <span>Khóa ngày / Chặn bảo trì</span>
        </div>
      }
    >
      <div className="w-full max-w-md p-1">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-caption font-medium text-danger">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="block-product" className="block text-caption font-semibold text-text mb-1">
              Phòng / Sản phẩm
            </label>
            <NativeSelect
              id="block-product"
              value={productId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setProductId(e.target.value)}
              className="w-full text-body-sm"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="block-checkin" className="block text-caption font-semibold text-text mb-1">
                Từ ngày (Check-in)
              </label>
              <Input
                id="block-checkin"
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full text-body-sm"
              />
            </div>
            <div>
              <label htmlFor="block-checkout" className="block text-caption font-semibold text-text mb-1">
                Đến ngày (Check-out)
              </label>
              <Input
                id="block-checkout"
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full text-body-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="block-note" className="block text-caption font-semibold text-text mb-1">
              Lý do / Ghi chú
            </label>
            <Input
              id="block-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Khách quen đặt trực tiếp, Sơn sửa, Bảo dưỡng..."
              className="w-full text-body-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="gap-1.5"
            >
              {loading && <Loader2 size={15} className="animate-spin motion-reduce:animate-none" />}
              <span>Xác nhận khóa</span>
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  )
}
