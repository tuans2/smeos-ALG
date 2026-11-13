"use client"

/**
 * /van-hanh/phe-duyet — Màn hình tổng hợp tất cả yêu cầu chờ Admin SaaS phê duyệt.
 * Bao gồm: mở khóa ngôn ngữ quốc tế, chuyển đổi mô hình cửa hàng, nâng hạn mức chat AI công khai.
 */

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { XCircle } from "@/components/ui/icon-set/x-circle"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { InboxIcon } from "@/components/ui/icon-set/inbox-icon"
import {
  ApprovalCard,
  TYPE_META,
  approvalRequestBody,
  type ApproveResult,
  type PendingApprovalItem,
} from "@/components/platform/approval-card"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { PageHeader } from "@/components/ui/page-header"

export default function PheQuyetPage() {
  const [items, setItems] = useState<PendingApprovalItem[] | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [toast, setToast] = useState<ApproveResult | null>(null)
  const [filter, setFilter] = useState<"ALL" | PendingApprovalItem["type"]>("ALL")
  const [confirm, confirmDialog] = useConfirmDialog()

  const tai = useCallback(async () => {
    setLoi(null)
    try {
      const res = await fetch("/api/v1/platform/pending-approvals")
      const json = (await res.json()) as { data: PendingApprovalItem[]; total: number }
      if (!res.ok) throw new Error("Không tải được danh sách yêu cầu")
      setItems(json.data)
    } catch {
      setLoi("Không tải được danh sách yêu cầu phê duyệt.")
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => tai())
  }, [tai])

  const showToast = (result: ApproveResult) => {
    setToast(result)
    setTimeout(() => setToast(null), 4000)
  }

  const handleApprove = async (item: PendingApprovalItem) => {
    setProcessing(item.id)
    try {
      const body = approvalRequestBody(item, "approve")

      const res = await fetch(`/api/v1/platform/organizations/${item.organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error("Phê duyệt thất bại")

      showToast({ success: true, message: `✅ Đã phê duyệt yêu cầu từ "${item.organizationName}" thành công!` })
      await tai()
    } catch (err) {
      showToast({
        success: false,
        message: err instanceof Error ? err.message : "Phê duyệt thất bại",
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (item: PendingApprovalItem) => {
    if (
      !(await confirm({
        title: "Xác nhận từ chối yêu cầu?",
        consequence: `Từ chối yêu cầu "${TYPE_META[item.type].label}" từ cửa hàng "${item.organizationName}".`,
        confirmLabel: "Từ chối",
        tone: "danger",
      }))
    ) {
      return
    }

    setProcessing(item.id)
    try {
      // Từ chối = xóa yêu cầu chờ duyệt khỏi settings
      const res = await fetch(`/api/v1/platform/organizations/${item.organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approvalRequestBody(item, "reject")),
      })

      if (!res.ok) throw new Error("Từ chối thất bại")

      showToast({
        success: true,
        message: `🚫 Đã từ chối yêu cầu từ "${item.organizationName}".`,
      })
      await tai()
    } catch (err) {
      showToast({
        success: false,
        message: err instanceof Error ? err.message : "Từ chối thất bại",
      })
    } finally {
      setProcessing(null)
    }
  }

  const filtered = (items ?? []).filter(
    (i) => filter === "ALL" || i.type === filter
  )

  const countOf = (t: "ALL" | PendingApprovalItem["type"]) =>
    (items ?? []).filter((i) => t === "ALL" || i.type === t).length

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <PageHeader
        title="Yêu cầu phê duyệt"
        tip="Tổng hợp các yêu cầu đang chờ Admin xem xét: mở khoá quốc tế, đổi mô hình cửa hàng, nâng hạn mức AI."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            id="refresh-pending-approvals"
            onClick={() => void tai()}
            className="h-auto py-1.5 px-3 text-caption font-semibold"
          >
            <RefreshCw size={13} aria-hidden />
            Tải lại
          </Button>
        }
      />

      {/* Toast notification */}
      {toast && (
        <div
          role="status"
          className={`p-3 rounded-xl border text-body-sm font-semibold flex items-center gap-2 ${
            toast.success
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-danger/10 border-danger/30 text-danger"
          }`}
        >
          {toast.success ? <CheckCircle2 size={16} aria-hidden /> : <XCircle size={16} aria-hidden />}
          {toast.message}
        </div>
      )}

      {/* Lỗi */}
      {loi && (
        <div role="alert" className="p-3 bg-danger/10 border border-danger/30 rounded-xl text-body-sm text-danger">
          {loi}
        </div>
      )}

      {/* Skeleton */}
      {!items && !loi && <SkeletonBlock lines={6} />}

      {/* Filter tabs */}
      {items && (
        <>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["ALL", ...(Object.keys(TYPE_META) as PendingApprovalItem["type"][])] as const).map((t) => (
              <Button
                key={t}
                type="button"
                variant={filter === t ? "primary" : "outline"}
                size="xs"
                id={`filter-${t.toLowerCase()}`}
                onClick={() => setFilter(t)}
                className="rounded-full px-3 py-1.5 h-auto text-caption font-semibold"
              >
                {t === "ALL" ? "Tất cả" : (
                  <>
                    {TYPE_META[t].icon} {TYPE_META[t].tabLabel}
                  </>
                )}
                <span
                  className={`ml-0.5 px-1.5 py-0.5 rounded-full text-caption font-bold ${
                    filter === t ? "bg-white/20" : "bg-surface-alt text-text"
                  }`}
                >
                  {countOf(t)}
                </span>
              </Button>
            ))}
          </div>

          {/* Danh sách */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-surface-alt flex items-center justify-center">
                <InboxIcon size={24} className="text-text-muted" aria-hidden />
              </div>
              <div>
                <p className="text-body-sm font-semibold text-text">Không có yêu cầu nào</p>
                <p className="text-caption text-text-muted mt-0.5">
                  {filter === "ALL"
                    ? "Hiện tại không có yêu cầu nào chờ phê duyệt."
                    : "Không có yêu cầu nào trong danh mục này."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => (
                <ApprovalCard
                  key={item.id}
                  item={item}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  processing={processing === item.id}
                />
              ))}
            </div>
          )}
        </>
      )}
      {confirmDialog}
    </div>
  )
}
