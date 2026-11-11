import React, { useState } from "react"
import { AlertTriangle, Banknote, CheckCircle2, ExternalLink, MessageSquare, ShieldCheck, XCircle } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/session"
import { useSWRConfig } from "swr"
import { CancellationProposalModal } from "@/components/greeting-card/inbox/cancellation-proposal-modal"
import { canProposeCancellation } from "@/modules/greeting-card/domain/cancellation-request"
import { coordinatorAcceptanceBlocker } from "@/modules/greeting-card/domain/brochure-commerce-rules"
import { CoordinatorAcceptRejectModal } from "./coordinator/coordinator-accept-reject-modal"
import { CoordinatorConfirmBalanceModal } from "./coordinator/coordinator-confirm-balance-modal"
import { CoordinatorConfirmDepositModal } from "./coordinator/coordinator-confirm-deposit-modal"
import type { OrderDetailModalTarget, BrochureOrderDetailModalProps } from "./brochure-order-detail-modal"
import { useApi } from "./greeting-api"

/** Footer action bar + cancellation proposal modal — tách riêng khỏi BrochureOrderDetailModal để tuân thủ giới hạn SRP 350 dòng. */
export function OrderDetailFooter({
  target,
  onClose,
  onOpenNotes,
  onCancellationProposed,
}: Omit<BrochureOrderDetailModalProps, "target"> & { target: OrderDetailModalTarget }) {
  const { can } = useSession()
  const { mutate } = useSWRConfig()
  const { data: dispatchData } = useApi<{ data: { dispatchState?: { claimedBranchName?: string | null; claimedBranchId?: string | null } } }>(
    target.orderId ? `/api/v1/greeting-card/orders/${target.orderId}/chain-dispatch` : null
  )
  const claimedBranchName = dispatchData?.data.dispatchState?.claimedBranchName || dispatchData?.data.dispatchState?.claimedBranchId || null
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showAcceptRejectModal, setShowAcceptRejectModal] = useState<"accept" | "reject" | null>(null)
  const [showConfirmBalanceModal, setShowConfirmBalanceModal] = useState(false)
  const [showConfirmDepositModal, setShowConfirmDepositModal] = useState(false)

  const acceptBlocker = target.orderId
    ? coordinatorAcceptanceBlocker(
        {
          status: target.status ?? "DRAFT",
          productionStatus: target.productionStatus ?? "WAITING",
          deliveryStatus: target.deliveryStatus ?? "PENDING",
        },
        {
          paidVnd: target.paidVnd ?? 0,
          paymentProofUrl: target.paymentProofUrl,
        }
      )
    : "Chưa có đơn hàng"
  const needsAcceptance = acceptBlocker === null

  const cancellationCheck = target.orderId
    ? canProposeCancellation({
        status: target.status ?? "DRAFT",
        productionStatus: target.productionStatus,
        deliveryStatus: target.deliveryStatus,
      })
    : { allowed: false, reason: "Chưa có đơn hàng để hủy" }

  const totalVnd = target.totalVnd ?? 0
  const paidVnd = target.paidVnd ?? 0
  const isDepositOrder = paidVnd > 0 && paidVnd < totalVnd
  const balanceVnd = Math.max(0, totalVnd - paidVnd)
  const hasBalanceProofOrReport = Boolean(target.paymentProofBalanceUrl || target.customerReportedPaid)
  const hasDepositProofOrReport = Boolean(target.paymentProofUrl || target.customerReportedPaid)
  // Khớp server: modal gọi confirm-deposit/confirm-balance — cả hai gác R4 (Điều phối)
  const canConfirmBalance = can("R4")
  const needsBalanceConfirmation = target.orderId && isDepositOrder && hasBalanceProofOrReport && canConfirmBalance
  const needsDepositConfirmation =
    Boolean(target.orderId) &&
    paidVnd === 0 &&
    totalVnd > 0 &&
    hasDepositProofOrReport &&
    canConfirmBalance &&
    !needsAcceptance

  return (
    <>
      <footer className="flex flex-col gap-2 border-t border-border bg-surface-alt p-4">
        {needsDepositConfirmation && (
          <div className="flex flex-col gap-2 p-3 rounded-xl border-2 border-dashed border-success/50 bg-success-bg/40 mb-1">
            <p className="text-body-sm font-bold text-success text-center flex items-center justify-center gap-1.5">
              <Banknote size={16} />
              Khách đã gửi bill tiền cọc (Đợt 1) — Chờ Điều phối xác nhận
            </p>
            <p className="text-caption text-text-muted text-center">
              {target.paymentProofUrl && (
                <a
                  href={target.paymentProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline font-bold"
                >
                  Xem ảnh bill cọc
                </a>
              )}
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setShowConfirmDepositModal(true)}
              className="h-9 text-body-sm font-extrabold gap-1.5 bg-success hover:bg-success/90 text-white w-full"
            >
              <CheckCircle2 size={15} />
              Xác nhận Tiền Cọc Đợt 1
            </Button>
          </div>
        )}

        {needsBalanceConfirmation && (
          <div className="flex flex-col gap-2 p-3 rounded-xl border-2 border-dashed border-warning/50 bg-warning-bg/40 mb-1">
            <p className="text-body-sm font-bold text-warning-text text-center flex items-center justify-center gap-1.5">
              <Banknote size={16} />
              Khách đã chuyển khoản Lần 2 — Chờ Xác nhận để mở Giao Ship
            </p>
            <p className="text-caption text-text-muted text-center">
              Số tiền còn lại:{" "}
              <span className="font-extrabold text-text">{balanceVnd.toLocaleString("vi-VN")} đ</span>
              {target.paymentProofBalanceUrl && (
                <>
                  {" · "}
                  <a
                    href={target.paymentProofBalanceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline font-bold"
                  >
                    Xem ảnh bill lần 2
                  </a>
                </>
              )}
            </p>
            <Button
              type="button"
              variant="warning"
              size="sm"
              onClick={() => setShowConfirmBalanceModal(true)}
              className="h-9 text-body-sm font-extrabold gap-1.5 bg-warning hover:bg-warning/90 text-white w-full"
            >
              <CheckCircle2 size={15} />
              Xác nhận Đã Nhận Đủ Tiền (Lần 2)
            </Button>
          </div>
        )}

        {needsAcceptance && target.orderId && (
          <div className="flex flex-col gap-2 p-3 rounded-xl border-2 border-dashed border-success/40 bg-success-bg/30 mb-1">
            <p className="text-body-sm font-bold text-success text-center flex items-center justify-center gap-1.5">
              <ShieldCheck size={16} />
              Đơn hàng chờ Điều phối xác nhận nhận đơn
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setShowAcceptRejectModal("accept")}
                className="h-9 text-body-sm font-extrabold gap-1.5 bg-success hover:bg-success/90 text-white"
              >
                <CheckCircle2 size={15} />
                Xác nhận đã nhận tiền
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAcceptRejectModal("reject")}
                className="h-9 text-body-sm font-bold gap-1.5 border-danger/40 text-danger hover:bg-danger-bg"
              >
                <XCircle size={15} />
                Từ chối (Hoàn tiền)
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {target.sendCode && (
              <a
                href={`/b/${target.sendCode}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-border px-3 text-caption font-bold text-text hover:bg-surface"
              >
                <ExternalLink size={14} /> Mở link khách
              </a>
            )}
            {onOpenNotes && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { onClose(); onOpenNotes(target) }}
                className="h-9 gap-1 text-caption font-bold"
              >
                <MessageSquare size={14} /> Nhắn tin / Ghi chú
              </Button>
            )}
          </div>
          <Button type="button" variant="outline" onClick={onClose} className="h-9 px-4 text-caption font-bold">
            Đóng
          </Button>
        </div>

        {target.orderId ? (
          <div className="border-t border-border/60 pt-2">
            <Button variant="outline"
              type="button"
              disabled={!cancellationCheck.allowed}
              title={
                cancellationCheck.allowed
                  ? "Gửi đề xuất hủy hoặc hoàn tiền cho Điều hành xét duyệt"
                  : cancellationCheck.reason
              }
              onClick={() => setShowCancelModal(true)}
              className="h-auto inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-danger/30 px-3 py-1.5 text-caption font-bold text-danger transition-colors hover:bg-danger-bg disabled:cursor-not-allowed disabled:opacity-40"
            >
              <AlertTriangle size={13} />
              {cancellationCheck.allowed
                ? "Đề xuất Hủy / Hoàn tiền đơn này"
                : `Không thể đề xuất — ${cancellationCheck.reason}`}
            </Button>
          </div>
        ) : (
          <div className="border-t border-border/60 pt-2">
            <div className="rounded-xl border border-border/60 bg-surface-muted/50 px-3 py-1.5 text-center text-caption text-text-muted">
              Link đang xem mẫu (chưa đặt đơn) · Đề xuất hủy/hoàn áp dụng khi khách đã gửi đơn hàng
            </div>
          </div>
        )}
      </footer>

      {showCancelModal && target.orderId && (
        <CancellationProposalModal
          orderId={target.orderId}
          orderCode={target.orderCode ?? "---"}
          totalVnd={target.totalVnd ?? 0}
          paidVnd={target.paidVnd ?? 0}
          deliveryStatus={target.deliveryStatus}
          onClose={() => setShowCancelModal(false)}
          onSuccess={() => {
            setShowCancelModal(false)
            onCancellationProposed?.()
            onClose()
          }}
        />
      )}

      {showAcceptRejectModal && target.orderId && (
        <CoordinatorAcceptRejectModal
          mode={showAcceptRejectModal}
          orderId={target.orderId}
          orderCode={target.orderCode ?? "---"}
          defaultBranchName={claimedBranchName}
          onClose={() => setShowAcceptRejectModal(null)}
          onDone={() => {
            setShowAcceptRejectModal(null)
            onCancellationProposed?.()
            onClose()
          }}
        />
      )}

      {showConfirmBalanceModal && target.orderId && (
        <CoordinatorConfirmBalanceModal
          orderId={target.orderId}
          orderCode={target.orderCode ?? "---"}
          balanceVnd={balanceVnd}
          proofUrl={target.paymentProofBalanceUrl ?? null}
          onClose={() => setShowConfirmBalanceModal(false)}
          onDone={() => {
            setShowConfirmBalanceModal(false)
            void mutate((key) => typeof key === "string" && (key.includes("tracking") || key.includes("coordinator") || key.includes("orders")))
            onCancellationProposed?.()
            onClose()
          }}
        />
      )}

      {showConfirmDepositModal && target.orderId && (
        <CoordinatorConfirmDepositModal
          orderId={target.orderId}
          orderCode={target.orderCode ?? "---"}
          depositVnd={null}
          proofUrl={target.paymentProofUrl ?? null}
          onClose={() => setShowConfirmDepositModal(false)}
          onDone={() => {
            setShowConfirmDepositModal(false)
            void mutate((key) => typeof key === "string" && (key.includes("tracking") || key.includes("coordinator") || key.includes("orders")))
            onCancellationProposed?.()
            onClose()
          }}
        />
      )}
    </>
  )
}
