"use client"

import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import React, { useState } from "react"
import {
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Store,
  Clock,
  Check,
  RotateCcw,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useApi, apiSend } from "@/components/greeting-card/greeting-api"
import { ChainBranchCard, type DispatchedCandidateBranch } from "./chain-branch-card"
import { dispatchChannelLabel, dispatchFailureText } from "./dispatch-channel-label"

export interface ChainDispatchPanelProps {
  orderId: string
  orderCode: string
  suggestedCraftFee?: number | undefined // chỉ khi Điều phối sửa tay; bỏ trống → máy chủ tính theo phương án tiệm cài
  onDispatched?: () => void
}

interface ChainDispatchQueryResponse {
  data: {
    orderCode: string
    deliveryAddress: string | null
    dispatchState?: {
      status: string
      claimedBranchId: string | null
      claimedBranchName?: string | null
      claimedAt?: string | null
      graceExpiresAt?: string | null
      remindersSent?: Record<string, string>
    } | null
    topBranches: DispatchedCandidateBranch[]
    policy: {
      topN: number
      claimWindowMinutes: number
    }
  }
}

interface DispatchResultItem {
  branchId: string
  branchName: string
  sent: boolean
  channel: string
  error?: string
}

interface ChainDispatchPostResponse {
  data: {
    dispatched: boolean
    orderCode: string
    sentCount: number
    totalTargeted: number
    results: DispatchResultItem[]
    claimUrl: string
  }
}

export function ChainDispatchPanel({
  orderId,
  orderCode,
  suggestedCraftFee,
  onDispatched,
}: ChainDispatchPanelProps) {
  const [confirm, confirmDialog] = useConfirmDialog()
  const { data, isLoading, mutate } = useApi<ChainDispatchQueryResponse>(
    orderId ? `/api/v1/greeting-card/orders/${orderId}/chain-dispatch` : null
  )

  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dispatchResult, setDispatchResult] = useState<ChainDispatchPostResponse["data"] | null>(null)
  const [dispatchError, setDispatchError] = useState<string | null>(null)

  // Khởi tạo chọn mặc định khi load xong
  const topBranches = data?.data?.topBranches ?? []
  const policy = data?.data?.policy

  React.useEffect(() => {
    if (topBranches.length > 0 && selectedBranchIds.length === 0 && !dispatchResult) {
      // Mặc định chọn top N theo policy
      const defaultSelected = topBranches
        .slice(0, policy?.topN || 3)
        .map((b) => b.branchId)
      setSelectedBranchIds(defaultSelected)
    }
  }, [topBranches, policy, selectedBranchIds.length, dispatchResult])

  function toggleBranch(branchId: string) {
    if (dispatchResult) return
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    )
  }

  async function handleSendDispatch() {
    if (selectedBranchIds.length === 0) return
    setIsSubmitting(true)
    setDispatchError(null)

    try {
      const res = await apiSend<ChainDispatchPostResponse>(
        `/api/v1/greeting-card/orders/${orderId}/chain-dispatch`,
        "POST",
        {
          approved_branch_ids: selectedBranchIds,
          subcontract_price_vnd: suggestedCraftFee,
        },
        "Không thể phát lệnh điều phối chuỗi"
      )

      setDispatchResult(res.data)
      onDispatched?.()
    } catch (err) {
      setDispatchError(err instanceof Error ? err.message : "Lỗi khi phát lệnh")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-5 rounded-2xl border border-border bg-surface flex items-center justify-center gap-2 text-text-muted text-caption">
        <Loader2 size={16} className="animate-spin motion-reduce:animate-none text-primary" />
        <span>Hệ thống đang quét và chấm điểm chi nhánh tối ưu...</span>
      </div>
    )
  }

  if (!data || topBranches.length === 0) {
    return (
      <div className="p-4 rounded-2xl border border-dashed border-border bg-surface-alt/40 flex flex-col items-center justify-center gap-2 text-center text-text-muted text-caption">
        <Store size={24} className="text-text-muted/60" />
        <span>Chưa có dữ liệu danh sách cửa hàng chuỗi để sàng lọc tự động.</span>
        <span className="text-caption text-text-muted/80">
          Vui lòng nhập danh sách cửa hàng trong tab <strong>Nhập từ Excel & Ảnh</strong>.
        </span>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-2xl border-2 border-primary/30 bg-primary/5 flex flex-col gap-3.5">
      {confirmDialog}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-primary/15 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Sparkles size={16} />
          </span>
          <div>
            <h4 className="text-body-sm font-extrabold text-text flex items-center gap-1.5">
              <span>Điều phối chuỗi tự động</span>
              <span className="text-caption font-bold px-1.5 py-0.5 rounded-md bg-primary/20 text-primary-dark uppercase">
                Gate 2
              </span>
            </h4>
            <p className="text-caption text-text-muted">
              Đã lọc tự động theo khoảng cách địa lý, chất lượng & tải đơn. Gửi tin nhắn riêng 1:1 cho từng chi nhánh.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-caption font-medium text-text-muted shrink-0">
          <Clock size={12} className="text-primary" />
          <span>Thời hạn nhận: <strong>{policy?.claimWindowMinutes ?? 10} phút</strong></span>
        </div>
      </div>

      {/* Trạng thái đơn ĐÃ CHỐT CHO CHI NHÁNH (KHÓA ĐIỀU PHỐI) */}
      {data?.data?.dispatchState && (data.data.dispatchState.status === "COMMITTED" || data.data.dispatchState.status === "CLAIMED_GRACE") && (
        <div className="p-4 rounded-xl bg-success/15 border-2 border-success/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-success/20 text-success">
              <CheckCircle2 size={24} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-body font-black text-text">
                  ĐÃ GIAO CHO: {data.data.dispatchState.claimedBranchName || data.data.dispatchState.claimedBranchId}
                </span>
                <span className={`text-caption font-extrabold px-2 py-0.5 rounded-full uppercase ${
                  data.data.dispatchState.status === "COMMITTED"
                    ? "bg-success text-white"
                    : "bg-warning-bg text-warning-text border border-warning/30"
                }`}>
                  {data.data.dispatchState.status === "COMMITTED" ? "Đã chốt sản xuất" : "Đang kiểm tra kho"}
                </span>
              </div>
              <p className="text-caption text-text-muted mt-0.5">
                Đơn hàng đã được chi nhánh tiếp nhận chính thức. Tiến độ và các lời nhắc việc (Bắt đầu chế tác, Ảnh QC, Shipper) sẽ tự động gửi tới chi nhánh này.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                if (await confirm({ title: "Mở khoá để phát lệnh lại?", consequence: "Lệnh sẽ được gửi lại cho các chi nhánh khác.", confirmLabel: "Mở khoá và phát lại" })) {
                  setDispatchResult(null)
                  mutate()
                }
              }}
              className="text-caption h-8 font-bold border-border hover:bg-surface-alt"
            >
              <RotateCcw size={12} className="mr-1" /> Mở khóa phát lại
            </Button>
          </div>
        </div>
      )}

      {/* Trạng thái ĐÃ PHÁT LỆNH nhưng chưa chi nhánh nào nhận (DISPATCHED/PENDING) */}
      {data?.data?.dispatchState && data.data.dispatchState.status !== "COMMITTED" && data.data.dispatchState.status !== "CLAIMED_GRACE" && !dispatchResult && (
        <div className="p-3.5 rounded-xl bg-warning-bg/60 border border-warning/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-warning/20 text-warning-text">
              <Clock size={16} />
            </span>
            <div>
              <p className="text-caption font-bold text-text">
                Đã phát lệnh — đang chờ chi nhánh nhận
              </p>
              <p className="text-caption text-text-muted">
                Trạng thái: <strong>{data.data.dispatchState.status}</strong>. Nếu chưa nhận được tin nhắn Telegram, bấm &ldquo;Gửi lại thông báo&rdquo;.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                setIsSubmitting(true)
                setDispatchError(null)
                try {
                  const res = await apiSend<ChainDispatchPostResponse>(
                    `/api/v1/greeting-card/orders/${orderId}/chain-dispatch`,
                    "POST",
                    {
                      approved_branch_ids: selectedBranchIds.length > 0
                        ? selectedBranchIds
                        : topBranches.slice(0, policy?.topN || 3).map((b) => b.branchId),
                      subcontract_price_vnd: suggestedCraftFee,
                    },
                    "Không thể gửi lại thông báo"
                  )
                  setDispatchResult(res.data)
                  onDispatched?.()
                } catch (err) {
                  setDispatchError(err instanceof Error ? err.message : "Lỗi khi gửi lại")
                } finally {
                  setIsSubmitting(false)
                }
              }}
              disabled={isSubmitting}
              className="text-caption h-8 font-bold border-warning/50 text-warning-text hover:bg-warning/10"
            >
              {isSubmitting ? <Loader2 size={12} className="animate-spin motion-reduce:animate-none mr-1" /> : <Send size={12} className="mr-1" />}
              Gửi lại thông báo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (await confirm({ title: "Huỷ lệnh hiện tại?", consequence: "Lệnh đang gửi sẽ bị huỷ để bạn chọn lại chi nhánh.", confirmLabel: "Huỷ lệnh", tone: "danger" })) {
                  setDispatchResult(null)
                  mutate()
                }
              }}
              className="text-caption h-8 font-bold text-text-muted hover:bg-surface-alt"
            >
              <RotateCcw size={12} className="mr-1" /> Hủy & Phát lại
            </Button>
          </div>
        </div>
      )}

      {/* Kết quả phát lệnh nếu đã gửi thành công */}
      {dispatchResult && (
        <div className="p-3 rounded-xl bg-success/10 border border-success/30 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-caption font-bold text-success">
              <CheckCircle2 size={16} />
              <span>Đã phát lệnh thành công tới {dispatchResult.sentCount}/{dispatchResult.totalTargeted} chi nhánh!</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDispatchResult(null)
                mutate()
              }}
              className="text-caption h-7 gap-1 text-text-muted hover:text-text"
            >
              <RotateCcw size={12} />
              <span>Phát lại</span>
            </Button>
          </div>

          <div className="space-y-1">
            {dispatchResult.results.map((res) => (
              <div
                key={res.branchId}
                className="flex items-center justify-between text-caption py-1 px-2 rounded-lg bg-surface/80 border border-border/50"
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-text">{res.branchName}</span>
                  <span className="text-caption px-1.5 py-0.5 rounded bg-primary/10 text-primary-dark font-bold">
                    {dispatchChannelLabel(res.channel)}
                  </span>
                </div>
                {res.sent ? (
                  <span className="text-success font-bold flex items-center gap-1">
                    <Check size={12} /> Đã gửi riêng
                  </span>
                ) : (
                  <span className="text-danger font-medium">{dispatchFailureText(res.channel, res.error)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danh sách các chi nhánh được sàng lọc (chỉ hiện khi chưa chốt) */}
      {!dispatchResult && !data?.data?.dispatchState?.status && (
        <>
          <div className="flex items-center justify-between text-caption">
            <span className="font-bold text-text">
              Chọn chi nhánh bạn muốn phát lệnh ({selectedBranchIds.length}/{topBranches.length}):
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost"
                type="button"
                onClick={() => setSelectedBranchIds(topBranches.map((b) => b.branchId))}
                className="h-auto p-0 gap-0 text-caption text-primary hover:underline font-semibold"
              >
                Chọn tất cả
              </Button>
              <span className="text-text-muted/40">·</span>
              <Button variant="ghost"
                type="button"
                onClick={() => setSelectedBranchIds([])}
                className="h-auto p-0 gap-0 text-caption text-text-muted hover:underline font-semibold"
              >
                Bỏ chọn
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {topBranches.map((b) => (
              <ChainBranchCard
                key={b.branchId}
                branch={b}
                isSelected={selectedBranchIds.includes(b.branchId)}
                onToggle={toggleBranch}
              />
            ))}
          </div>

          {dispatchError && (
            <div className="p-2.5 rounded-xl bg-danger-bg/70 border border-danger/30 text-danger text-caption flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{dispatchError}</span>
            </div>
          )}

          {/* Nút Điều hành duyệt & Phát lệnh */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-caption text-text-muted">
              Đơn <strong>#{orderCode}</strong> · Bấm nút dưới để gửi thẻ tới {selectedBranchIds.length} chi nhánh đã duyệt.
            </span>
            <Button
              type="button"
              disabled={selectedBranchIds.length === 0 || isSubmitting}
              onClick={handleSendDispatch}
              className="bg-primary hover:bg-primary/90 text-white font-bold text-caption h-8 px-4 gap-1.5 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin motion-reduce:animate-none" />
                  <span>Đang gửi tin nhắn...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>Duyệt & Phát Lệnh ({selectedBranchIds.length} shop)</span>
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
