"use client"

/**
 * coordinator-subcontract-actions-panel.tsx
 *
 * Phase 4 — Coordinator Dashboard UI cho Gate 2.
 *
 * Panel tác vụ Coordinator-Stream: cho phép Điều phối viên can thiệp trực tiếp
 * vào bất kỳ node nào trong Gate 2 mà không cần đợi cửa hàng phản hồi.
 *
 * Dual-Stream UI:
 *  - Hiện trạng thái hiện tại của từng node (Auto-Stream status)
 *  - Nút hành động cho từng node (Coordinator-Stream buttons)
 *  - First-Wins Mutex: nút tự động disable khi node đã completed
 */

import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import React, { useRef, useState } from "react"
import {
  Camera, Truck, CheckCircle2, Clock, AlertTriangle,
  Upload, UserCheck, PackageCheck, ChevronDown, ChevronUp,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { readApiError } from "@/components/greeting-card/api-error"

interface SubcontractGate2State {
  orderId: string
  orderCode: string
  productionStatus: string
  deliveryStatus: string
  orderStatus: string
  hasQcPhoto: boolean
  hasShipperInfo: boolean
  hasDeliveryProof: boolean
  shipperInfo?: {
    shipperName: string
    shipperPhone: string
    submittedAt: string
  } | null | undefined
}

interface CoordinatorSubcontractActionsPanelProps {
  gate2: SubcontractGate2State
  onActionDone: () => void
}

type ActionState = "idle" | "loading" | "success" | "error"

// ─── Node status badge ──────────────────────────────────────────────────────

function NodeBadge({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-caption font-bold px-2 py-0.5 rounded-full ${
        done
          ? "bg-success/15 text-success border border-success/30"
          : "bg-warning/15 text-warning-text border border-warning/30"
      }`}
    >
      {done ? <CheckCircle2 size={10} /> : <Clock size={10} />}
      {done ? "Hoàn thành" : label}
    </span>
  )
}

// ─── M2: Upload QC ─────────────────────────────────────────────────────────

function M2UploadQcAction({
  orderId,
  done,
  onDone,
}: {
  orderId: string
  done: boolean
  onDone: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<ActionState>("idle")
  const [msg, setMsg] = useState("")

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setState("loading")
    setMsg("")
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(
        `/api/v1/coordinator/orders/${encodeURIComponent(orderId)}/upload-qc-subcontract`,
        { method: "POST", body: fd }
      )
      if (!res.ok) throw new Error(await readApiError(res, "Lỗi upload ảnh"))
      const body = await res.json() as { data?: { message?: string } }
      setMsg(body.data?.message ?? "✅ Upload thành công")
      setState("success")
      onDone()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Lỗi không xác định")
      setState("error")
    } finally {
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  if (done) return null

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        id={`coord-qc-upload-${orderId}`}
        onChange={handleFile}
        disabled={state === "loading"}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={state === "loading"}
        onClick={() => fileRef.current?.click()}
        className="h-8 text-caption gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
      >
        {state === "loading" ? (
          <span className="animate-pulse motion-reduce:animate-none">Đang tải lên…</span>
        ) : (
          <>
            <Upload size={13} />
            Upload ảnh thành phẩm (Điều phối)
          </>
        )}
      </Button>
      {msg && (
        <p className={`text-caption ${state === "error" ? "text-danger" : "text-success"}`}>
          {msg}
        </p>
      )}
    </div>
  )
}

// ─── M2b: Approve Customer Photo ────────────────────────────────────────────

function M2bApproveAction({
  orderId,
  productionStatus,
  onDone,
}: {
  orderId: string
  productionStatus: string
  onDone: () => void
}) {
  const [state, setState] = useState<ActionState>("idle")
  const [msg, setMsg] = useState("")

  if (productionStatus !== "READY") return null

  async function approve() {
    setState("loading")
    try {
      const res = await fetch(
        `/api/v1/coordinator/orders/${encodeURIComponent(orderId)}/approve-customer-photo`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      )
      if (!res.ok) throw new Error(await readApiError(res, "Lỗi duyệt ảnh"))
      setMsg("✅ Đã duyệt ảnh thành phẩm thay khách")
      setState("success")
      onDone()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Lỗi không xác định")
      setState("error")
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={state === "loading" || state === "success"}
        onClick={approve}
        className="h-8 text-caption gap-1.5 border-info-border text-info hover:bg-info-bg"
      >
        <UserCheck size={13} />
        {state === "loading" ? "Đang duyệt…" : "Duyệt ảnh thay khách"}
      </Button>
      {msg && (
        <p className={`text-caption ${state === "error" ? "text-danger" : "text-success"}`}>
          {msg}
        </p>
      )}
    </div>
  )
}

// ─── M3: Set Shipper ────────────────────────────────────────────────────────

function M3SetShipperAction({
  orderId,
  done,
  productionStatus,
  onDone,
}: {
  orderId: string
  done: boolean
  productionStatus: string
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [note, setNote] = useState("")
  const [state, setState] = useState<ActionState>("idle")
  const [msg, setMsg] = useState("")

  if (done) return null
  if (productionStatus !== "READY") return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState("loading")
    try {
      const res = await fetch(
        `/api/v1/coordinator/orders/${encodeURIComponent(orderId)}/set-shipper`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shipperName: name, shipperPhone: phone, shipperNote: note }),
        }
      )
      if (!res.ok) throw new Error(await readApiError(res, "Lỗi nhập shipper"))
      setMsg(`✅ Đã nhập shipper: ${name} — ${phone}`)
      setState("success")
      setOpen(false)
      onDone()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Lỗi không xác định")
      setState("error")
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="h-8 text-caption gap-1.5 border-warning-border text-warning-text hover:bg-warning-bg"
      >
        <Truck size={13} />
        Nhập thông tin Shipper (Điều phối)
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </Button>

      {open && (
        <form onSubmit={submit} className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-surface-muted">
          <Input
            required
            placeholder="Tên Shipper *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 rounded-lg border border-border bg-surface px-3 text-caption focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Input
            required
            placeholder="SĐT Shipper * (vd: 0912345678)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-8 rounded-lg border border-border bg-surface px-3 text-caption focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Input
            placeholder="Ghi chú (không bắt buộc)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-8 rounded-lg border border-border bg-surface px-3 text-caption focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button type="submit" size="sm" disabled={state === "loading"} className="h-8 text-caption">
            {state === "loading" ? "Đang lưu…" : "Xác nhận Shipper"}
          </Button>
        </form>
      )}

      {msg && (
        <p className={`text-caption ${state === "error" ? "text-danger" : "text-success"}`}>
          {msg}
        </p>
      )}
    </div>
  )
}

// ─── M4: Confirm Delivery ───────────────────────────────────────────────────

function M4ConfirmDeliveryAction({
  orderId,
  done,
  onDone,
}: {
  orderId: string
  done: boolean
  onDone: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<"idle" | "photo" | "no_photo">("idle")
  const [reason, setReason] = useState("")
  const [state, setState] = useState<ActionState>("idle")
  const [msg, setMsg] = useState("")

  if (done) return null

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setState("loading")
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(
        `/api/v1/coordinator/orders/${encodeURIComponent(orderId)}/confirm-delivery`,
        { method: "POST", body: fd }
      )
      if (!res.ok) throw new Error(await readApiError(res, "Lỗi xác nhận giao hàng"))
      setMsg("✅ Đã xác nhận giao hàng thành công (có ảnh giao hàng)")
      setState("success")
      onDone()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Lỗi không xác định")
      setState("error")
    } finally {
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function confirmWithoutPhoto() {
    if (!reason.trim() || reason.trim().length < 5) {
      setMsg("Vui lòng nhập lý do (tối thiểu 5 ký tự)")
      return
    }
    setState("loading")
    try {
      const res = await fetch(
        `/api/v1/coordinator/orders/${encodeURIComponent(orderId)}/confirm-delivery`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmWithoutPhoto: true, reason }),
        }
      )
      if (!res.ok) throw new Error(await readApiError(res, "Lỗi xác nhận"))
      setMsg("✅ Đã xác nhận giao hàng thành công (không ảnh, có ghi nhận lý do)")
      setState("success")
      setMode("idle")
      onDone()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Lỗi không xác định")
      setState("error")
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        id={`coord-pod-upload-${orderId}`}
        onChange={handlePhotoUpload}
        disabled={state === "loading"}
      />

      <div className="grid grid-cols-2 gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={state === "loading"}
          onClick={() => fileRef.current?.click()}
          className="h-8 text-caption gap-1.5 border-success/40 text-success hover:bg-success/5"
        >
          <PackageCheck size={13} />
          {state === "loading" ? "Đang xử lý…" : "Tải ảnh giao hàng"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={state === "loading"}
          onClick={() => setMode(mode === "no_photo" ? "idle" : "no_photo")}
          className="h-8 text-caption gap-1.5 border-warning/40 text-warning-text hover:bg-warning/5"
        >
          <AlertTriangle size={13} />
          Xác nhận không ảnh
        </Button>
      </div>

      {mode === "no_photo" && (
        <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-warning/30 bg-warning/5">
          <p className="text-caption text-warning-text font-bold">
            ⚠️ Xác nhận giao hàng không có ảnh giao hàng. Vui lòng ghi rõ lý do:
          </p>
          <Textarea
            rows={2}
            placeholder="Lý do không có ảnh (vd: Shipper quên chụp, Khách từ chối chụp...)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-caption focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={state === "loading"}
            onClick={confirmWithoutPhoto}
            className="h-8 text-caption gap-1.5 border-warning/40 text-warning-text"
          >
            {state === "loading" ? "Đang xác nhận…" : "✓ Xác nhận không ảnh"}
          </Button>
        </div>
      )}

      {msg && (
        <p className={`text-caption ${state === "error" ? "text-danger" : "text-success"}`}>
          {msg}
        </p>
      )}
    </div>
  )
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

/**
 * Panel tác vụ Gate 2 cho Điều phối viên.
 * Chỉ hiển thị khi đơn đang trong luồng gia công chuỗi (hasSubcontractDispatch=true).
 */
export function CoordinatorSubcontractActionsPanel({
  gate2,
  onActionDone,
}: CoordinatorSubcontractActionsPanelProps) {
  const { orderId, productionStatus, deliveryStatus, orderStatus, hasQcPhoto, hasShipperInfo, hasDeliveryProof, shipperInfo } = gate2
  const isCompleted = orderStatus === "COMPLETED" || deliveryStatus === "DELIVERED"

  if (isCompleted) return null

  const m2Done = hasQcPhoto || productionStatus === "READY" || productionStatus === "DONE"
  const m3Done = hasShipperInfo || deliveryStatus === "DELIVERING" || deliveryStatus === "DELIVERED" || deliveryStatus === "DISPATCHED"
  const m4Done = hasDeliveryProof || deliveryStatus === "DELIVERED"

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-caption font-bold tracking-wider uppercase">
          <Camera size={11} />
          Điều phối can thiệp
        </span>
        <span className="text-caption text-text-muted">
          (hành động đầu tiên sẽ triệt tiêu nhắc tự động)
        </span>
      </div>

      {/* M2: Upload QC */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-caption font-bold text-text flex items-center gap-1.5">
            <Camera size={13} className="text-primary" />
            Bước 2 — Ảnh thành phẩm
          </span>
          <NodeBadge done={m2Done} label="Chờ upload" />
        </div>
        <M2UploadQcAction orderId={orderId} done={m2Done} onDone={onActionDone} />
        <M2bApproveAction orderId={orderId} productionStatus={productionStatus} onDone={onActionDone} />
      </div>

      <div className="border-t border-primary/10" />

      {/* M3: Shipper */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-caption font-bold text-text flex items-center gap-1.5">
            <Truck size={13} className="text-warning-text" />
            Bước 3 — Thông tin shipper
          </span>
          <NodeBadge done={m3Done} label="Chờ shipper" />
        </div>
        {m3Done && shipperInfo && (
          <p className="text-caption text-text-muted">
            🛵 {shipperInfo.shipperName} — {shipperInfo.shipperPhone}
          </p>
        )}
        <M3SetShipperAction
          orderId={orderId}
          done={m3Done}
          productionStatus={productionStatus}
          onDone={onActionDone}
        />
      </div>

      <div className="border-t border-primary/10" />

      {/* M4: Delivery POD */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-caption font-bold text-text flex items-center gap-1.5">
            <PackageCheck size={13} className="text-success" />
            Bước 4 — Xác nhận giao hàng
          </span>
          <NodeBadge done={m4Done} label="Chờ ảnh giao hàng" />
        </div>
        <M4ConfirmDeliveryAction orderId={orderId} done={m4Done} onDone={onActionDone} />
      </div>
    </div>
  )
}
