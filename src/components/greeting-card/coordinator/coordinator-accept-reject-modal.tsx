"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import React, { useState } from "react"
import { CheckCircle2, ShieldCheck, XCircle } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"

interface CoordinatorAcceptRejectModalProps {
  mode: "accept" | "reject"
  orderId: string
  orderCode: string
  defaultBranchName?: string | null | undefined
  onClose: () => void
  onDone: () => void
}

const COMMON_REJECT_REASONS = [
  "Hết nguyên phụ liệu theo yêu cầu của khách",
  "Xưởng quá tải khung giờ, không kịp gia công hoàn thiện",
  "Địa chỉ giao nằm ngoài khu vực hỗ trợ",
]

/**
 * Hộp thoại Điều phối xác nhận đã nhận tiền hoặc từ chối đơn hàng (tổ chức Chuỗi).
 * - Xác nhận đã nhận tiền: ghi nhận thanh toán rồi chọn cửa hàng theo cài đặt (tự động / thủ công).
 *   Khách chỉ nhận tin "đã nhận đơn" khi cửa hàng chốt làm.
 * - Từ chối: gửi đề xuất huỷ & hoàn tiền lên Điều hành; quá thời gian chờ duyệt thì tự huỷ theo đề xuất.
 */
export function CoordinatorAcceptRejectModal({
  mode,
  orderId,
  orderCode,
  defaultBranchName,
  onClose,
  onDone,
}: CoordinatorAcceptRejectModalProps) {
  const isAccept = mode === "accept"
  const org = useApi<{ settings?: Record<string, unknown> | null }>(isAccept ? "/api/v1/organizations/current" : null)
  const policy = org.data?.settings?.chain_dispatch_policy as { enabled?: unknown } | undefined
  const autoMode = org.data ? policy?.enabled !== false : false
  const [manualDispatch, setManualDispatch] = useState(false)
  const defaultNote = defaultBranchName ? `Cửa hàng đã nhận: ${defaultBranchName}` : ""
  const [note, setNote] = useState(defaultNote)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setBusy(true)
    setError(null)
    try {
      if (isAccept) {
        await apiSend(
          `/api/v1/greeting-card/orders/${orderId}/accept`,
          "POST",
          { note: note.trim() || undefined, ...(autoMode && manualDispatch ? { manualDispatch: true } : {}) },
          "Không thể xác nhận đã nhận tiền"
        )
      } else {
        if (!reason.trim()) {
          setError("Vui lòng nhập lý do từ chối nhận đơn")
          setBusy(false)
          return
        }
        await apiSend(
          `/api/v1/greeting-card/orders/${orderId}/reject`,
          "POST",
          { reason: reason.trim() },
          "Không thể từ chối nhận đơn"
        )
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tác không thành công")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose() }} size="sm"
      title={<span className="flex items-center gap-2">
          {isAccept ? (
            <>
              <ShieldCheck size={20} className="text-success" aria-hidden="true" />
              Xác nhận đã nhận tiền — #{orderCode}
            </>
          ) : (
            <>
              <XCircle size={20} className="text-danger" aria-hidden="true" />
              Từ chối Nhận đơn — #{orderCode}
            </>
          )}
        </span>}>
      <div className="flex flex-col gap-4">

        <p className="text-body-sm text-text-muted leading-relaxed">
          {isAccept
            ? autoMode && !manualDispatch
              ? "Xác nhận đã nhận đủ tiền theo ảnh chuyển khoản. Hệ thống sẽ tự chọn cửa hàng phù hợp và gửi lời mời gia công. Khách chỉ nhận tin \"đã nhận đơn\" khi cửa hàng chốt làm."
              : "Xác nhận đã nhận đủ tiền theo ảnh chuyển khoản. Sau đó bạn chọn cửa hàng trong mục Thẻ gia công. Khách chỉ nhận tin \"đã nhận đơn\" khi cửa hàng chốt làm."
            : "Đề xuất không nhận đơn sẽ được gửi lên Điều hành phê duyệt hủy & hoàn tiền cho khách. Nếu Điều hành không duyệt trong thời gian chờ tiệm đã cài (mặc định 15 phút), đơn sẽ tự động hủy theo đề xuất."}
        </p>

        {isAccept ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="coordinator-accept-note" className="text-body-sm font-semibold text-text">
                Ghi chú nội bộ (tùy chọn)
              </label>
              {defaultBranchName && (
                <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-success/15 text-success">
                  🏪 {defaultBranchName}
                </span>
              )}
            </div>
            <Textarea
              id="coordinator-accept-note"
              rows={3}
              maxLength={500}
              placeholder={defaultBranchName ? `Vd: Đã xác nhận với ${defaultBranchName}, xưởng đủ điều kiện thực hiện...` : "Vd: Đã kiểm tra kho nguyên liệu, đủ điều kiện thực hiện đơn..."}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-alt p-3 text-body-sm text-text resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {autoMode && (
              <label className="flex items-center gap-2 text-body-sm text-text">
                <Checkbox checked={manualDispatch} onCheckedChange={(checked) => setManualDispatch((checked === true))} />
                Tự chọn cửa hàng cho đơn này
              </label>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor="coordinator-reject-reason" className="text-body-sm font-semibold text-text">
              Lý do từ chối <span className="text-danger">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1">
              {COMMON_REJECT_REASONS.map((r) => (
                <Button variant="outline"
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`h-auto justify-start gap-0 text-caption px-2.5 py-1 rounded-lg border text-left transition-colors ${
                    reason === r
                      ? "border-danger bg-danger-bg text-danger font-semibold hover:bg-danger-bg"
                      : "border-border bg-surface text-text-muted hover:border-border-strong hover:text-text hover:bg-surface"
                  }`}
                >
                  {r}
                </Button>
              ))}
            </div>
            <Textarea
              id="coordinator-reject-reason"
              rows={3}
              maxLength={500}
              placeholder="Nhập hoặc chỉnh sửa lý do từ chối (bắt buộc)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-alt p-3 text-body-sm text-text resize-none focus:outline-none focus:ring-2 focus:ring-danger/40"
            />
          </div>
        )}

        {error && (
          <p role="alert" className="text-danger text-caption font-medium">
            {error}
          </p>
        )}

        <div className="flex gap-2 justify-end pt-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy} className="h-9 text-caption">
            Huỷ
          </Button>
          {isAccept ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={() => void handleSubmit()}
              className="h-9 text-caption font-extrabold gap-1.5 bg-success hover:bg-success/90 text-white"
            >
              <CheckCircle2 size={15} />
              {busy ? "Đang xử lý..." : "Xác nhận đã nhận tiền"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || !reason.trim()}
              onClick={() => void handleSubmit()}
              className="h-9 text-caption font-bold gap-1.5 border-danger/40 bg-danger text-white hover:bg-danger/90"
            >
              <XCircle size={15} />
              {busy ? "Đang xử lý..." : "Gửi đề xuất Từ chối đơn"}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  )
}
