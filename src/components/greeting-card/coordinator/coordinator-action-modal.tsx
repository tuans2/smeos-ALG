"use client"

import { Textarea } from "@/components/ui/textarea"
import React, { useState } from "react"
import { Camera, Image as ImageIcon, Truck, UserCheck } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import { CoordinatorImageUpload } from "./coordinator-image-upload"
import { CancellationProposalModal } from "@/components/greeting-card/inbox/cancellation-proposal-modal"
import type { ModalState } from "./coordinator-order-card"
import { DeliveryFailedModal } from "./delivery-failed-modal"
import { SubstituteProposalModal } from "./substitute-proposal-modal"
import { CoordinatorAcceptRejectModal } from "./coordinator-accept-reject-modal"
import { AdminConfirmOrderModal } from "./admin-confirm-order-modal"
import { CoordinatorConfirmBalanceModal } from "./coordinator-confirm-balance-modal"
import { CoordinatorConfirmDepositModal } from "./coordinator-confirm-deposit-modal"
import { useSession } from "@/lib/session"
import { getIndustryTerminology, getIndustryOrderTerms } from "@/modules/organization/domain/industry-profile"

type ActiveModal = Exclude<ModalState, { type: "none" | "detail" }>


/** Hộp thoại một tác vụ xưởng: ghi chú (florist, ship), tải ảnh (thành phẩm, người nhận), hoặc đề xuất hủy đơn. */
export function CoordinatorActionModal({ modal, onClose, onDone, allowSkipPhoto }: {
  modal: ActiveModal
  onClose: () => void
  onDone: () => void
  /** Gói Nghiêm ngặt bắt buộc ảnh → ẩn "Bỏ qua ảnh" (máy chủ cũng chặn) */
  allowSkipPhoto?: Record<"product-photo" | "recipient-photo", boolean> | undefined
}) {
  // Lấy tên chi nhánh đã nhận đơn (chain-dispatch) để hiển thị trong ghi chú nội bộ
  const isAcceptReject = modal.type === "accept-order" || modal.type === "reject-order"
  const { data: dispatchData } = useApi<{ data: { dispatchState?: { claimedBranchName?: string | null; claimedBranchId?: string | null } } }>(
    isAcceptReject ? `/api/v1/greeting-card/orders/${modal.orderId}/chain-dispatch` : null
  )
  const resolvedBranchName = (isAcceptReject ? modal.branchName : null)
    ?? dispatchData?.data.dispatchState?.claimedBranchName
    ?? dispatchData?.data.dispatchState?.claimedBranchId
    ?? null

  if (modal.type === "cancel-proposal") {
    return (
      <CancellationProposalModal
        orderId={modal.orderId}
        orderCode={modal.orderCode}
        totalVnd={modal.totalVnd}
        paidVnd={modal.paidVnd}
        deliveryStatus={modal.deliveryStatus}
        onClose={onClose}
        onSuccess={onDone}
      />
    )
  }
  if (modal.type === "delivery-failed") {
    return <DeliveryFailedModal orderId={modal.orderId} orderCode={modal.orderCode} onClose={onClose} onDone={onDone} />
  }
  if (modal.type === "substitute") {
    return <SubstituteProposalModal orderId={modal.orderId} orderCode={modal.orderCode} onClose={onClose} onDone={onDone} />
  }
  if (modal.type === "accept-order" || modal.type === "reject-order") {
    // Theo nút đã bấm (cùng cài đặt quy trình của thẻ), không theo loại tổ chức — tiệm Chuỗi có thể chọn gói Tiêu chuẩn
    if (modal.flow === "coordinator") {
      return (
        <CoordinatorAcceptRejectModal
          mode={modal.type === "accept-order" ? "accept" : "reject"}
          orderId={modal.orderId}
          orderCode={modal.orderCode}
          defaultBranchName={resolvedBranchName}
          onClose={onClose}
          onDone={onDone}
        />
      )
    }
    return (
      <AdminConfirmOrderModal
        mode={modal.type === "accept-order" ? "confirm" : "reject"}
        orderId={modal.orderId}
        orderCode={modal.orderCode}
        defaultBranchName={resolvedBranchName}
        onClose={onClose}
        onDone={onDone}
      />
    )
  }
  if (modal.type === "confirm-balance") {
    return (
      <CoordinatorConfirmBalanceModal
        orderId={modal.orderId}
        orderCode={modal.orderCode}
        balanceVnd={modal.balanceVnd}
        proofUrl={modal.proofUrl}
        onClose={onClose}
        onDone={() => onDone()}
      />
    )
  }
  if (modal.type === "confirm-deposit") {
    return (
      <CoordinatorConfirmDepositModal
        orderId={modal.orderId}
        orderCode={modal.orderCode}
        depositVnd={modal.depositVnd}
        proofUrl={modal.proofUrl}
        onClose={onClose}
        onDone={() => onDone()}
      />
    )
  }
  return <CoordinatorTaskModal modal={modal} onClose={onClose} onDone={onDone} allowSkipPhoto={allowSkipPhoto} />
}

function CoordinatorTaskModal({
  modal,
  onClose,
  onDone,
  allowSkipPhoto,
}: {
  modal: Exclude<ActiveModal, { type: "cancel-proposal" } | { type: "delivery-failed" } | { type: "substitute" } | { type: "accept-order" } | { type: "reject-order" } | { type: "confirm-balance" } | { type: "confirm-deposit" }>
  onClose: () => void
  onDone: () => void
  allowSkipPhoto?: Record<"product-photo" | "recipient-photo", boolean> | undefined
}) {
  const { organization } = useSession()
  const terms = getIndustryTerminology(organization?.industry)
  const orderTerms = getIndustryOrderTerms(organization?.industry)
  const isStay = orderTerms.fulfillmentFlow === "CALENDAR_STAY"
  const makerTitleShort = terms.makerTitle.split("/")[0]?.trim() || "Florist"

  const getDynamicConfig = () => {
    if (modal.type === "florist") {
      return {
        icon: UserCheck,
        title: `Giao ${makerTitleShort}`,
        description: <>Ghi chú phân công {terms.makerTitle.toLowerCase()} (tên nhân sự, yêu cầu). Trạng thái sẽ chuyển sang <strong>Đang {terms.makerAction.toLowerCase()}</strong>.</>,
        note: {
          path: "assign-florist",
          field: "floristNote",
          placeholder: `Vd: Phân công ${makerTitleShort} phụ trách — lưu ý yêu cầu đặc biệt của khách`,
          confirm: `Xác nhận Giao ${makerTitleShort}`,
        },
      }
    }
    if (modal.type === "product-photo") {
      return {
        icon: Camera,
        title: terms.completedProductPhoto,
        description: null,
        photo: { endpoint: "product-photo" as const, label: terms.completedProductPhoto },
      }
    }
    if (modal.type === "dispatch") {
      return {
        icon: Truck,
        title: isStay ? "Đón tiếp & Bàn giao" : "Giao Ship",
        description: isStay
          ? <>Nhập thông tin nhân sự đón tiếp hoặc lưu ý nhận phòng. Trạng thái sẽ chuyển sang <strong>Đang lưu trú</strong>.</>
          : <>Nhập thông tin shipper / mã vận đơn. Trạng thái sẽ chuyển sang <strong>Đang giao hàng</strong>.</>,
        note: {
          path: "dispatch-shipping",
          field: "trackingNote",
          placeholder: isStay ? "Vd: Quản gia Tuấn đón tiếp · SĐT: 0912345678 · Phòng 201" : "Vd: Anh Hùng GHN · 0912345678 · Mã VĐ: GHNXXX",
          confirm: isStay ? "Xác nhận Đón tiếp" : "Xác nhận Giao Ship",
        },
      }
    }
    return {
      icon: ImageIcon,
      title: isStay ? "Ảnh Khách Check-in / Đón tiếp" : "Ảnh Người Nhận",
      description: isStay
        ? <>Upload ảnh đón tiếp khách hoặc nhận phòng. Đơn sẽ chuyển sang <strong>Hoàn tất</strong>.</>
        : <>Upload ảnh chụp trao hàng. Đơn sẽ chuyển sang <strong>Giao thành công · Hoàn tất</strong>.</>,
      photo: { endpoint: "recipient-photo" as const, label: isStay ? "Ảnh đón tiếp / check-in" : "Ảnh giao hàng thành công" },
    }
  }

  const cfg = getDynamicConfig()
  const Icon = cfg.icon
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitNote() {
    if (!("note" in cfg)) return
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/v1/greeting-card/orders/${modal.orderId}/${cfg.note.path}`, "POST", { [cfg.note.field]: note.trim() }, "Lỗi thực hiện tác vụ")
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose() }} size="sm"
      title={<span className="flex items-center gap-2">
          <Icon size={18} className="text-primary" />
          {cfg.title} — #{modal.orderCode}
        </span>}>
      <div className="flex flex-col gap-4">
        {cfg.description && <p className="text-body-sm text-text-muted">{cfg.description}</p>}

        {"note" in cfg ? (
          <>
            <Textarea
              rows={3}
              autoFocus
              maxLength={500}
              aria-label={cfg.title}
              placeholder={cfg.note.placeholder}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-alt p-3 text-body-sm text-text resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {error && <p role="alert" className="text-danger text-caption">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9 text-caption">Huỷ</Button>
              <Button type="button" size="sm" disabled={!note.trim() || busy} onClick={() => void submitNote()} className="h-9 text-caption">
                {busy ? "Đang lưu..." : cfg.note.confirm}
              </Button>
            </div>
          </>
        ) : (
          <CoordinatorImageUpload
            orderId={modal.orderId}
            endpoint={cfg.photo.endpoint}
            label={cfg.photo.label}
            allowSkip={allowSkipPhoto?.[cfg.photo.endpoint] ?? true}
            onSuccess={onDone}
            onCancel={onClose}
          />
        )}
      </div>
    </Dialog>
  )
}
