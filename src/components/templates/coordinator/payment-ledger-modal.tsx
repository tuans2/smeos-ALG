"use client"

import React, { useEffect, useState } from "react"
import { Wallet } from "@/components/ui/icon-set/wallet"
import { PlusCircle } from "@/components/ui/icon-set/plus-circle"
import { Undo2 } from "@/components/ui/icon-set/undo2"
import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/session"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { SkeletonBlock } from "@/components/ui/skeleton"
import {
  coordinatorApi,
  errorMessage,
  type CoordinationOrder,
  type OrderPaymentView,
  type RecordPaymentBody,
} from "@/components/coordinator/coordinator-api"

/**
 * ĐP-4a.4 (26/09/2026) — Sổ thu của một đơn (§2.14 dac-ta-truong-du-lieu-dieu-phoi-v2).
 *
 * Hiển thị Tổng/Đã thu/Còn phải thu + lịch sử `order_payments`, và cho ghi
 * thêm một dòng (cọc/thu nốt/hoàn tiền). `paidVnd`/`balanceVnd` do MÁY CHỦ
 * tính lại mỗi lần — modal chỉ gọi API rồi hiển thị đúng đơn máy chủ trả về,
 * không tự cộng trừ ở client.
 */
export interface PaymentLedgerModalProps {
  isOpen: boolean
  order: CoordinationOrder | null
  onClose: () => void
  /** Đơn đã cập nhật (paidVnd/balanceVnd/paymentStatus mới) sau khi ghi một dòng sổ thu. */
  onRecorded: (order: CoordinationOrder) => void
}

const KIND_LABEL: Record<RecordPaymentBody["kind"], string> = {
  DEPOSIT: "Đặt cọc",
  BALANCE: "Thu nốt",
  REFUND: "Hoàn tiền",
}

const STATUS_LABEL: Record<CoordinationOrder["paymentStatus"], { label: string; className: string }> = {
  UNPAID: { label: "Chưa thu", className: "bg-surface-alt text-text border-border" },
  PARTIALLY_PAID: { label: "Thu một phần", className: "bg-warning-bg text-warning-text border-warning-border" },
  PAID: { label: "Đã thu đủ", className: "bg-success-bg text-success-text border-success-border" },
  REFUNDED: { label: "Đã hoàn tiền", className: "bg-danger-bg text-danger-text border-danger-border" },
}

const fmtVnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`

export function PaymentLedgerModal({ isOpen, order, onClose, onRecorded }: PaymentLedgerModalProps) {
  // Khoản Sale/Điều phối ghi chờ Điều hành (R11) xác nhận mới vào sổ thu (checklist ALG 1.16)
  const canConfirm = useSession().can("R11")
  const [payments, setPayments] = useState<OrderPaymentView[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const [kind, setKind] = useState<RecordPaymentBody["kind"]>("DEPOSIT")
  const [amountVnd, setAmountVnd] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [reference, setReference] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !order) return
    let cancelled = false
    void (async () => {
      setLoadingList(true)
      setListError(null)
      try {
        const rows = await coordinatorApi.listPayments(order.id)
        if (!cancelled) setPayments(rows)
      } catch (e) {
        if (!cancelled) setListError(errorMessage(e))
      } finally {
        if (!cancelled) setLoadingList(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order?.id])

  if (!isOpen || !order) return null

  const statusTag = STATUS_LABEL[order.paymentStatus]

  const handleSubmit = async () => {
    const amount = Number(amountVnd)
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Số tiền phải lớn hơn 0.")
      return
    }
    setBusy(true)
    setFormError(null)
    try {
      const body: RecordPaymentBody = {
        kind,
        amountVnd: amount,
        ...(paymentMethod.trim() ? { paymentMethod: paymentMethod.trim() } : {}),
        ...(reference.trim() ? { reference: reference.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      }
      const updated = await coordinatorApi.recordPayment(order.id, body)
      if (!canConfirm) setFormError("Đã ghi — khoản này chờ Điều hành xác nhận mới vào sổ thu.")
      onRecorded(updated)
      const rows = await coordinatorApi.listPayments(order.id)
      setPayments(rows)
      setAmountVnd("")
      setPaymentMethod("")
      setReference("")
      setNote("")
    } catch (e) {
      setFormError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const decide = async (paymentId: string, approve: boolean) => {
    if (!order) return
    setBusy(true)
    setFormError(null)
    try {
      const updated = await coordinatorApi.decidePayment(order.id, paymentId, approve, approve ? undefined : "Không khớp số tiền thực nhận")
      onRecorded(updated)
      setPayments(await coordinatorApi.listPayments(order.id))
    } catch (e) {
      setFormError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      size="md"
      className="max-w-lg"
      title={
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-success-bg text-success-text flex items-center justify-center">
            <Wallet size={18} />
          </div>
          <div>
            <h3 className="text-body font-extrabold text-text">Sổ Thu — Đơn #{order.orderCode}</h3>
          </div>
        </div>
      }
      description="Đặt cọc, thu nốt, hoàn tiền (§2.14)"
      footer={
        <div className="flex items-center justify-end w-full">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      <div className="p-1 flex flex-col gap-4 text-caption">
        <div className="grid grid-cols-3 gap-2 p-3.5 rounded-xl border border-border bg-surface-alt">
          <div>
            <span className="text-text-muted block">Tổng</span>
            <strong className="text-text text-body-sm">{fmtVnd(order.unitPriceVnd)}</strong>
          </div>
          <div>
            <span className="text-text-muted block">Đã thu</span>
            <strong className="text-success-text text-body-sm">{fmtVnd(order.paidVnd)}</strong>
          </div>
          <div>
            <span className="text-text-muted block">Còn phải thu</span>
            <strong className={`text-body-sm ${order.balanceVnd > 0 ? "text-danger-text" : "text-success-text"}`}>{fmtVnd(order.balanceVnd)}</strong>
          </div>
          <div className="col-span-3">
            <span className={`inline-block px-2 py-0.5 rounded border text-caption font-bold ${statusTag.className}`}>{statusTag.label}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-bold text-text">Lịch sử thu:</span>
          {loadingList && <SkeletonBlock lines={2} />}
          {listError && (
            <p role="alert" className="text-danger font-semibold">
              {listError}
            </p>
          )}
          {!loadingList && !listError && payments.length === 0 && <p className="text-text-muted">Chưa có dòng sổ thu nào.</p>}
          {payments.length > 0 && (
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface">
                  <div className="flex flex-col">
                    <span className="font-semibold text-text">
                      {KIND_LABEL[p.kind]} {p.paymentMethod ? `· ${p.paymentMethod}` : ""}
                    </span>
                    <span className="text-text-muted text-caption">
                      {new Date(p.collectedAt).toLocaleString("vi-VN")}
                      {p.note ? ` · ${p.note}` : ""}
                    </span>
                    {p.status === "PENDING" && (
                      <span className="flex flex-wrap items-center gap-2 text-caption text-warning-text">
                        Chờ Điều hành xác nhận
                        {canConfirm && (
                          <>
                            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void decide(p.id, true)}>Xác nhận</Button>
                            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void decide(p.id, false)}>Từ chối</Button>
                          </>
                        )}
                      </span>
                    )}
                    {p.status === "REJECTED" && <span className="text-caption text-danger">Đã từ chối — không vào sổ thu</span>}
                  </div>
                  <strong className={p.kind === "REFUND" ? "text-danger-text" : "text-success-text"}>
                    {p.kind === "REFUND" ? "−" : "+"}
                    {fmtVnd(p.amountVnd)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-surface flex flex-col gap-2.5">
          <span className="font-bold text-text flex items-center gap-1.5">
            <PlusCircle size={14} className="text-danger-text" /> Ghi dòng mới:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-text-muted block mb-1">Loại</label>
              <Select
                value={kind}
                onValueChange={(val) => setKind(val as RecordPaymentBody["kind"])}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEPOSIT">Đặt cọc</SelectItem>
                  <SelectItem value="BALANCE">Thu nốt</SelectItem>
                  <SelectItem value="REFUND">Hoàn tiền</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-text-muted block mb-1">Số tiền (VNĐ) *</label>
              <Input
                type="number"
                min={1}
                value={amountVnd}
                onChange={(e) => setAmountVnd(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text"
              />
            </div>
            <div>
              <label className="text-text-muted block mb-1">Phương thức</label>
              <Input
                type="text"
                placeholder="Tiền mặt / Chuyển khoản…"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text"
              />
            </div>
            <div>
              <label className="text-text-muted block mb-1">Mã tham chiếu</label>
              <Input
                type="text"
                placeholder="Mã GD / biên nhận…"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text"
              />
            </div>
            <div className="col-span-2">
              <label className="text-text-muted block mb-1">Ghi chú</label>
              <Input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-text"
              />
            </div>
          </div>
          {kind === "REFUND" && (
            <p className="text-caption text-warning-text font-semibold">
              Hoàn tiền chỉ dành cho Điều hành (R10) — máy chủ sẽ từ chối nếu tài khoản không đủ quyền.
            </p>
          )}
          {formError && (
            <p role="alert" className="text-danger-text font-semibold">
              {formError}
            </p>
          )}
          <Button onClick={handleSubmit} disabled={busy} className="w-full font-bold gap-1.5">
            {kind === "REFUND" ? <Undo2 size={14} /> : <PlusCircle size={14} />}
            {busy ? "Đang ghi…" : `Ghi ${KIND_LABEL[kind].toLowerCase()}`}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
