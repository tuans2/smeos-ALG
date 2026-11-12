"use client"

import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import Image from "next/image"
import { CheckCircle2, Banknote } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { apiSend } from "@/components/greeting-card/greeting-api"

interface CoordinatorConfirmDepositModalProps {
  orderId: string
  orderCode: string
  /** Khoản Lần 1 tính sẵn theo kế hoạch thanh toán của đơn; `null` = chưa biết (máy chủ tự tính). */
  depositVnd: number | null
  proofUrl: string | null
  onClose: () => void
  onDone: (msg?: string) => void
}

/**
 * Hộp thoại Điều phối xác nhận tiền đặt cọc (hoặc 100% nếu đơn không cọc) qua ảnh bill của khách.
 * Sau khi xác nhận:
 * - paid_vnd tăng lên đúng khoản cọc.
 * - Khách được mở màn hình Lần 2 (khi hoa cắm xong).
 * - Thanh đơn hàng Điều hành hiển thị rõ nhãn "Điều phối đã Xác nhận".
 */
export function CoordinatorConfirmDepositModal({
  orderId,
  orderCode,
  depositVnd,
  proofUrl,
  onClose,
  onDone,
}: CoordinatorConfirmDepositModalProps) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await apiSend<{ data?: { paidVnd?: number } }>(
        `/api/v1/greeting-card/orders/${orderId}/confirm-deposit`,
        "POST",
        { note: note.trim() || undefined },
        "Không xác nhận được tiền cọc",
      )
      // Báo đúng số tiền máy chủ đã ghi sổ (không dùng số ước tính trên giao diện)
      const recorded = res.data?.paidVnd ?? depositVnd
      onDone(recorded != null ? `Đã xác nhận ${recorded.toLocaleString("vi-VN")}đ cho đơn #${orderCode}.` : `Đã xác nhận tiền cọc cho đơn #${orderCode}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tác không thành công")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose() }} size="sm"
      title={<span className="flex items-center gap-2"><Banknote size={20} className="text-success shrink-0" /> Xác nhận Tiền Cọc Đợt 1 — #{orderCode}</span>}>
      <form onSubmit={handleConfirm} className="flex flex-col gap-4">

        <p className="text-body-sm text-text-muted">
          Số tiền cọc cần thu:{" "}
          <span className="font-extrabold text-text">
            {depositVnd != null ? `${depositVnd.toLocaleString("vi-VN")}đ` : "theo kế hoạch thanh toán của đơn"}
          </span>
        </p>

        {proofUrl && (
          <div className="flex flex-col gap-1.5">
            <span className="text-caption font-bold text-text-muted">Ảnh chuyển khoản của khách:</span>
            <a href={proofUrl} target="_blank" rel="noopener noreferrer">
              <Image
                src={proofUrl}
                alt="Ảnh chuyển khoản cọc"
                width={320}
                height={200}
                unoptimized
                className="w-full max-h-48 object-contain rounded-xl border border-border bg-surface-alt"
              />
            </a>
            <p className="text-caption text-text-muted">Nhấp ảnh để xem kích thước đầy đủ.</p>
          </div>
        )}

        {!proofUrl && (
          <div className="p-3 rounded-xl bg-warning-bg border border-warning/30 text-caption text-warning-text">
            Khách chưa tải ảnh bill. Hãy đối soát tài khoản ngân hàng trực tiếp trước khi xác nhận.
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-caption font-bold">Ghi chú (không bắt buộc)</span>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="VD: Khớp bill chuyển khoản tiền cọc"
            className="w-full h-10 px-3 rounded-lg border border-border bg-bg text-body text-text"
          />
        </label>

        {error && (
          <p role="alert" className="p-3 rounded-xl bg-danger-bg text-danger text-body-sm">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Huỷ
          </Button>
          <Button
            type="submit"
            disabled={busy}
            className="bg-success hover:bg-success/90 text-white font-bold gap-1.5"
          >
            <CheckCircle2 size={16} />
            {busy ? "Đang xử lý..." : "Xác nhận Đã Nhận Tiền Cọc"}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
