"use client"

import { Textarea } from "@/components/ui/textarea"
import React, { useState } from "react"
import { CheckCircle2, ClipboardCheck, XCircle, AlertTriangle } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { apiSend } from "@/components/greeting-card/greeting-api"

interface AdminConfirmOrderModalProps {
  mode: "confirm" | "reject"
  orderId: string
  orderCode: string
  defaultBranchName?: string | null | undefined
  onClose: () => void
  onDone: () => void
}

const COMMON_REJECT_REASONS = [
  "Hết nguyên vật liệu theo yêu cầu của khách",
  "Xưởng quá tải khung giờ, không kịp hoàn thiện",
  "Địa chỉ giao nằm ngoài khu vực hỗ trợ",
  "Ngày giao không khả dụng (lễ / nghỉ)",
]

/**
 * Hộp thoại Điều hành xác nhận đơn (Gate 1b) — mô hình 1 Cửa hàng hoặc Điều phối xác nhận đơn.
 *
 * - Xác nhận đơn: chuyển productionStatus WAITING → ASSIGNED, ⏱️ SLA bắt đầu chạy,
 *   thông báo khách "Đang chuẩn bị sản phẩm".
 * - Từ chối đơn: tạo đề xuất huỷ (kèm hoàn tiền nếu có cọc); đơn huỷ và khách nhận tin khi đề xuất được duyệt.
 *
 * @see POST /api/v1/greeting-card/orders/[id]/confirm-order
 * @see DELETE /api/v1/greeting-card/orders/[id]/confirm-order
 */
export function AdminConfirmOrderModal({
  mode,
  orderId,
  orderCode,
  defaultBranchName,
  onClose,
  onDone,
}: AdminConfirmOrderModalProps) {
  const isConfirm = mode === "confirm"
  const defaultNote = defaultBranchName ? `Cửa hàng đã nhận: ${defaultBranchName}` : ""
  const [note, setNote] = useState(defaultNote)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!isConfirm && !reason.trim()) {
      setError("Vui lòng nhập lý do từ chối đơn")
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (isConfirm) {
        await apiSend(
          `/api/v1/greeting-card/orders/${orderId}/confirm-order`,
          "POST",
          { note: note.trim() || undefined },
          "Không thể xác nhận đơn"
        )
      } else {
        await apiSend(
          `/api/v1/greeting-card/orders/${orderId}/confirm-order`,
          "DELETE",
          { reason: reason.trim() },
          "Không thể từ chối đơn"
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
          {isConfirm ? (
            <>
              <ClipboardCheck size={20} className="text-success" aria-hidden="true" />
              Xác nhận Đơn hàng — #{orderCode}
            </>
          ) : (
            <>
              <XCircle size={20} className="text-danger" aria-hidden="true" />
              Từ chối Đơn hàng — #{orderCode}
            </>
          )}
        </span>}>
      <div className="flex flex-col gap-4">

        {/* Context info */}
        <div
          className={`rounded-xl px-3 py-2.5 text-body-sm leading-relaxed ${
            isConfirm
              ? "bg-success-bg/40 border border-success/20 text-success"
              : "bg-danger-bg/40 border border-danger/20 text-danger"
          }`}
        >
          {isConfirm ? (
            <p>
              Xác nhận cửa hàng có đủ nguyên vật liệu và nhân lực để hoàn thành đơn.
              Đơn sẽ vào hàng đợi sản xuất ngay lập tức và khách nhận thông báo{" "}
              <span className="font-bold">&ldquo;Đang chuẩn bị sản phẩm 🌸&rdquo;</span>.
            </p>
          ) : (
            <p className="flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>
                Từ chối sẽ tạo <span className="font-bold">đề xuất hủy đơn</span> (kèm hoàn tiền nếu khách đã
                cọc). Đơn chỉ hủy và khách chỉ nhận tin khi đề xuất được duyệt trong mục Yêu cầu hủy.
              </span>
            </p>
          )}
        </div>

        {/* Input */}
        {isConfirm ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="admin-confirm-order-note" className="text-body-sm font-semibold text-text">
                Ghi chú nội bộ (tùy chọn)
              </label>
              {defaultBranchName && (
                <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-success/15 text-success">
                  🏪 {defaultBranchName}
                </span>
              )}
            </div>
            <Textarea
              id="admin-confirm-order-note"
              rows={3}
              maxLength={500}
              placeholder={
                defaultBranchName
                  ? `Vd: Đã xác nhận với ${defaultBranchName}, cửa hàng đủ điều kiện thực hiện...`
                  : "Vd: Đã kiểm tra kho nguyên liệu, đủ điều kiện thực hiện đơn..."
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-alt p-3 text-body-sm text-text resize-none focus:outline-none focus:ring-2 focus:ring-success/40"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor="admin-reject-order-reason" className="text-body-sm font-semibold text-text">
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
              id="admin-reject-order-reason"
              rows={3}
              maxLength={500}
              placeholder="Nhập hoặc chỉnh sửa lý do từ chối đơn (bắt buộc)..."
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

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-2 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy} className="h-9 text-caption">
            Huỷ
          </Button>
          {isConfirm ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={() => void handleSubmit()}
              className="h-9 text-caption font-extrabold gap-1.5 bg-success hover:bg-success/90 text-white"
            >
              <CheckCircle2 size={15} />
              {busy ? "Đang xử lý..." : "Xác nhận Đơn hàng ✓"}
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
              {busy ? "Đang xử lý..." : "Từ chối & Hoàn tiền"}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  )
}
