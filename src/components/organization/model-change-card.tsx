"use client"

import { useState } from "react"
import { Store } from "@/components/ui/icon-set/store"
import { Building2 } from "@/components/ui/icon-set/building2"
import { Clock } from "@/components/ui/icon-set/clock"
import { Send } from "@/components/ui/icon-set/send"
import { ShieldAlert } from "@/components/ui/icon-set/shield-alert"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { useSession } from "@/lib/session"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export function ModelChangeCard() {
  const { organizationType, pendingModelChange, can } = useSession()
  const canRequest = can("F2") || can("H4") // Điều hành / chủ cửa hàng

  const isChain = organizationType === "CHAIN"
  const targetType = isChain ? "SINGLE" : "CHAIN"
  const targetLabel = isChain ? "1 Cửa hàng độc lập" : "Chuỗi nhiều chi nhánh"

  const [openModal, setOpenModal] = useState(false)
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/v1/organizations/current/upgrade-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requested_type: targetType,
          note: note.trim() || null,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error?.message || "Không thể gửi yêu cầu chuyển đổi mô hình")
      }

      setSuccess(true)
      setTimeout(() => {
        window.location.reload()
      }, 1200)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="p-5 border border-border bg-surface rounded-2xl shadow-xs space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            {isChain ? <Building2 size={20} /> : <Store size={20} />}
          </div>
          <div>
            <div className="text-body-sm font-bold text-text">Mô hình vận hành doanh nghiệp</div>
            <div className="text-caption text-text-muted mt-0.5">
              Phân định cơ chế tiếp nhận và quy trình duyệt đơn giữa 1 Cửa hàng và Chuỗi
            </div>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-caption font-bold border ${
            isChain
              ? "bg-accent/10 text-accent-text border-accent/20"
              : "bg-primary/10 text-primary border-primary/20"
          }`}
        >
          {isChain ? "🏢 Chuỗi nhiều chi nhánh" : "🏪 1 Cửa hàng độc lập"}
        </span>
      </div>

      <div className="rounded-xl bg-surface-alt/60 p-3.5 border border-border text-body-sm text-text-muted leading-relaxed">
        {isChain ? (
          <div>
            <strong>Cơ chế duyệt đơn Chuỗi (Gate 2):</strong> Khi khách hoàn thành thanh toán, đơn dừng ở trạng thái chờ{" "}
            <strong>Điều phối liên hệ xác nhận chi nhánh</strong> xem có khả năng nhận đơn không trước khi chuyển vào sản xuất.
          </div>
        ) : (
          <div>
            <strong>Cơ chế duyệt đơn 1 Cửa hàng:</strong> Tối ưu tinh gọn — khi khách hoàn thành thanh toán, Điều hành xác nhận thanh toán là đồng thời{" "}
            <strong>tự động chuyển tiếp nhận sản xuất ngay</strong>, không cần bước thẩm định chuỗi riêng biệt.
          </div>
        )}
      </div>

      {/* Hiển thị nếu đang có yêu cầu chờ duyệt */}
      {pendingModelChange ? (
        <div className="rounded-xl border border-warning/30 bg-warning-bg p-3.5 flex items-start gap-3">
          <Clock className="text-warning-text shrink-0 mt-0.5" size={18} />
          <div className="text-body-sm space-y-1">
            <div className="font-bold text-text">
              Đang có yêu cầu chuyển sang {pendingModelChange.requested_type === "CHAIN" ? "Chuỗi cửa hàng" : "1 Cửa hàng độc lập"}
            </div>
            <div className="text-caption text-text-muted leading-relaxed">
              Yêu cầu được gửi lúc {new Date(pendingModelChange.requested_at).toLocaleString("vi-VN")}. Đang chờ{" "}
              <strong className="text-text">Quản trị viên SaaS thẩm định và phê duyệt</strong>.
            </div>
            {pendingModelChange.note && (
              <div className="text-caption text-text-muted italic">Ghi chú: &ldquo;{pendingModelChange.note}&rdquo;</div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-border">
          <div className="text-caption text-text-muted flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-text-muted shrink-0" />
            <span>Chuyển đổi mô hình cần được Quản trị viên SaaS thẩm định và phê duyệt</span>
          </div>

          {canRequest && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpenModal(true)}
              className="gap-1.5 font-semibold text-caption"
            >
              {isChain ? <Store size={14} /> : <Building2 size={14} />}
              <span>Yêu cầu chuyển sang {targetLabel}</span>
            </Button>
          )}
        </div>
      )}

      {/* Modal gửi yêu cầu chuyển đổi mô hình */}
      <Dialog
        open={openModal}
        onOpenChange={(open) => {
          if (!open) setOpenModal(false)
        }}
        title={`Xin chuyển sang ${targetLabel}`}
        description="Gửi yêu cầu tới Ban Quản Trị SaaS để phê duyệt thay đổi quy trình"
        size="sm"
      >
        <div className="space-y-4 p-1">
          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-2.5 text-caption font-medium text-danger-text">
              {error}
            </div>
          )}

          {success ? (
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-center space-y-1">
              <CheckCircle2 size={28} className="mx-auto text-primary" />
              <div className="text-body-sm font-bold text-primary">Đã gửi yêu cầu thành công!</div>
              <div className="text-caption text-text-muted">Đang cập nhật trạng thái hồ sơ…</div>
            </div>
          ) : (
            <form onSubmit={handleSendRequest} className="space-y-3.5">
              <div>
                <div className="mb-1 text-caption font-semibold text-text">
                  Lý do / Kế hoạch điều chỉnh quy mô <span className="text-danger">*</span>
                </div>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    isChain
                      ? "Ví dụ: Chúng tôi tinh gọn lại hoạt động tại 1 cơ sở chính…"
                      : "Ví dụ: Chúng tôi chuẩn bị khai trương thêm 2 chi nhánh mới tại Quận 1…"
                  }
                  rows={3}
                  required
                  className="w-full text-body-sm resize-none"
                />
              </div>

              <div className="rounded-xl bg-surface-alt/60 p-2.5 border border-border text-caption text-text-muted">
                ⚠️ Lưu ý: Sau khi được quản trị viên ALG duyệt, toàn bộ cơ chế phân phối đơn hàng và quyền điều phối sẽ tự động chuyển sang mô hình mới.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpenModal(false)}
                  disabled={submitting}
                >
                  Hủy bỏ
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="gap-1.5 font-bold">
                  <Send size={14} />
                  <span>{submitting ? "Đang gửi…" : "Gửi yêu cầu phê duyệt"}</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </Dialog>
    </Card>
  )
}
