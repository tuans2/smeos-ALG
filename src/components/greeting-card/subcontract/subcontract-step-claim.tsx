"use client"

import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import React, { useState } from "react"
import {
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  ImageIcon,
  XCircle,
  Sparkles,
  ChevronDown,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  formatGraceCountdown,
  type SubcontractDispatchStatus,
} from "@/modules/greeting-card/domain/subcontract-order"
import type { SubcontractCardProduct } from "./subcontract-card-types"

export interface SubcontractStepClaimProps {
  product: SubcontractCardProduct
  deliveryAddress: string
  deliveryTime: string
  cardMessage?: string | null | undefined
  specialNotes?: string | null | undefined
  subcontractPriceVnd: number
  dispatchStatus: SubcontractDispatchStatus
  isMyClaim: boolean
  isClaimedByOther: boolean
  claimedBranchName?: string | null | undefined
  graceSeconds: number
  isActive: boolean
  isCompleted: boolean
  onActivate: () => void
  onClaim: () => Promise<void>
  onCancelClaim: () => Promise<void>
  onCommitEarly?: (() => Promise<void>) | undefined
}

export function SubcontractStepClaim({
  product,
  deliveryAddress,
  deliveryTime,
  cardMessage,
  specialNotes,
  subcontractPriceVnd,
  dispatchStatus,
  isMyClaim,
  isClaimedByOther,
  claimedBranchName,
  graceSeconds,
  isActive,
  isCompleted,
  onActivate,
  onClaim,
  onCancelClaim,
  onCommitEarly,
}: SubcontractStepClaimProps) {
  const [confirm, confirmDialog] = useConfirmDialog()
  const [imageError, setImageError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleClaim() {
    setLoading(true)
    setErrorMsg(null)
    try {
      await onClaim()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Không thể tiếp nhận đơn")
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (!(await confirm({ title: "Huỷ nhận đơn này?", consequence: "Đơn sẽ được nhường cho chi nhánh khác.", confirmLabel: "Huỷ nhận đơn", tone: "danger" }))) {
      return
    }
    setLoading(true)
    setErrorMsg(null)
    try {
      await onCancelClaim()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi khi hủy đơn")
    } finally {
      setLoading(false)
    }
  }

  // Chuẩn hóa đường dẫn ảnh mẫu
  let sampleSrc = product.imageUrl
  if (
    sampleSrc &&
    typeof window !== "undefined" &&
    (sampleSrc.includes("localhost:") || sampleSrc.includes("127.0.0.1:"))
  ) {
    try {
      const parsed = new URL(sampleSrc)
      sampleSrc = `${window.location.origin}${parsed.pathname}${parsed.search}`
    } catch {
      // ignore
    }
  }

  return (
    <section
      aria-label="Công đoạn 1: Tiếp nhận đơn & Chốt sản xuất"
      className={cn(
        "rounded-2xl border transition-all duration-300 overflow-hidden",
        isActive
          ? "border-primary/50 bg-surface shadow-md ring-2 ring-primary/20 opacity-100"
          : isCompleted
          ? "border-success/30 bg-surface/90 opacity-85 hover:opacity-100"
          : "border-border/60 bg-surface/70 opacity-60 hover:opacity-90"
      )}
    >
      {confirmDialog}
      {/* Header bar của Bước 1 */}
      <Button variant="ghost"
        type="button"
        onClick={onActivate}
        className="text-[length:inherit] h-auto font-[inherit] gap-0 w-full p-4 flex items-center justify-between text-left border-b border-border/60 bg-surface-muted/30 hover:bg-surface-muted/60 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-caption font-black",
              isCompleted
                ? "bg-success text-white"
                : isActive
                ? "bg-primary text-white ring-2 ring-primary/30"
                : "bg-surface-muted text-text border border-border"
            )}
          >
            {isCompleted ? <CheckCircle2 size={16} /> : "1"}
          </div>
          <div>
            <span className="text-body-sm font-extrabold text-text block">
              1. Tiếp nhận & Chốt sản xuất
            </span>
            <span className="text-caption text-text-muted">
              {isCompleted
                ? "Đã chốt nhận đơn vào sản xuất"
                : "Kiểm tra kho, mẫu sản phẩm và thù lao"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-success/20 text-success text-caption font-bold">
              <CheckCircle2 size={12} /> Đã chốt sản xuất
            </span>
          ) : dispatchStatus === "CLAIMED_GRACE" ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/20 text-warning-text text-caption font-bold">
              <Clock size={12} /> Kiểm tra kho: {formatGraceCountdown(graceSeconds)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary-dark text-caption font-bold">
              <Sparkles size={12} /> Chờ nhận đơn
            </span>
          )}
          <ChevronDown
            size={16}
            className={cn(
              "text-text-muted transition-transform duration-200",
              isActive ? "rotate-180 text-primary" : ""
            )}
          />
        </div>
      </Button>

      {/* Thân chi tiết của Bước 1 */}
      <div className={cn("p-4 sm:p-5 flex flex-col gap-4", !isActive && isCompleted && "hidden sm:flex")}>
        {errorMsg && (
          <div className="p-3 rounded-xl bg-danger-bg border border-danger/30 text-danger text-body-sm">
            {errorMsg}
          </div>
        )}

        {/* Trạng thái bị chi nhánh khác nhận */}
        {isClaimedByOther && (
          <div className="p-4 rounded-xl bg-surface-muted border border-border text-center flex flex-col items-center gap-2">
            <CheckCircle2 size={32} className="text-text-muted" />
            <h4 className="text-body font-bold text-text">Đơn hàng đã được tiếp nhận</h4>
            <p className="text-caption text-text-muted max-w-xs">
              Đơn hàng này đã được {claimedBranchName ? `Chi nhánh ${claimedBranchName}` : "chi nhánh khác"} tiếp nhận gia công. Rất cảm ơn bạn đã quan tâm!
            </p>
          </div>
        )}

        {/* Trạng thái Grace Period đếm ngược */}
        {dispatchStatus === "CLAIMED_GRACE" && isMyClaim && (
          <div className="p-4 rounded-xl bg-warning-bg border border-warning/30 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-body-sm font-bold text-warning-text flex items-center gap-1.5">
                <Clock size={16} /> Thời gian kiểm tra kho hoa & nguyên liệu:
              </span>
              <span className="font-mono text-title font-black text-warning-text">
                {formatGraceCountdown(graceSeconds)}
              </span>
            </div>
            <p className="text-caption text-text-muted">
              Vui lòng đối chiếu với kho thực tế. Nếu không đủ hoa/phụ liệu, bạn có quyền bấm hủy trong thời gian này để nhường cho chi nhánh khác.
            </p>
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                disabled={loading || graceSeconds <= 0}
                onClick={handleCancel}
                className="flex-1 text-danger hover:bg-danger-bg text-caption font-bold h-10 border-danger/40"
              >
                <XCircle size={15} className="mr-1" /> Hủy nhận (Kho thiếu hoa)
              </Button>
              {onCommitEarly && (
                <Button
                  variant="secondary"
                  disabled={loading}
                  onClick={onCommitEarly}
                  className="flex-1 text-caption font-bold h-10"
                >
                  <ShieldCheck size={15} className="mr-1" /> Xác nhận đủ & Làm ngay
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Chi tiết sản phẩm & Định mức nguyên vật liệu BOM */}
        <div className="bg-surface-muted rounded-xl p-3.5 border border-border flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {sampleSrc && !imageError ? (
              <img
                src={sampleSrc}
                alt={product.name}
                onError={() => setImageError(true)}
                className="w-16 h-16 rounded-lg object-cover border border-border shadow-xs shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-surface border border-border flex flex-col items-center justify-center text-text-muted shrink-0">
                <ImageIcon size={22} className="opacity-50" />
                <span className="text-caption mt-0.5 font-medium">Theo mẫu</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="text-caption text-text-muted block">Mẫu sản phẩm gia công</span>
              <h3 className="text-body font-bold text-text truncate">{product.name}</h3>
              <span className="text-caption font-black text-primary mt-0.5 block">
                Thù lao: {subcontractPriceVnd.toLocaleString("vi-VN")} đ
              </span>
            </div>
          </div>

          {/* Danh mục nguyên liệu BOM */}
          {product.bomItems && product.bomItems.length > 0 && (
            <div className="pt-2 border-t border-border">
              <span className="text-caption font-bold text-text flex items-center gap-1 mb-1.5">
                <Layers size={13} className="text-primary" /> Định lượng nguyên vật liệu cần có:
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-caption">
                {product.bomItems.map((item, idx) => (
                  <div key={idx} className="bg-surface p-1.5 rounded border border-border flex justify-between">
                    <span className="text-text truncate">{item.name}</span>
                    <span className="font-bold text-primary whitespace-nowrap ml-1">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Địa chỉ giao & Thời gian */}
        <div className="flex flex-col gap-2 text-body-sm">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
            <div>
              <span className="text-caption text-text-muted block">Địa chỉ giao hàng:</span>
              <span className="text-text font-semibold">{deliveryAddress}</span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar size={16} className="text-primary mt-0.5 shrink-0" />
            <div>
              <span className="text-caption text-text-muted block">Thời gian cần giao:</span>
              <span className="text-text font-semibold">{deliveryTime}</span>
            </div>
          </div>

          {cardMessage && (
            <div className="p-2.5 rounded-lg bg-surface-muted border border-border text-caption">
              <span className="font-bold text-text block mb-0.5">Lời chúc thiệp:</span>
              <span className="italic text-text-muted">&ldquo;{cardMessage}&rdquo;</span>
            </div>
          )}

          {specialNotes && (
            <div className="p-2.5 rounded-lg bg-warning-bg/50 border border-warning/20 text-caption">
              <span className="font-bold text-warning-text block mb-0.5">Ghi chú đặc biệt:</span>
              <span className="text-text">{specialNotes}</span>
            </div>
          )}
        </div>

        {/* Tác vụ Tiếp nhận khi đơn OPEN */}
        {dispatchStatus === "OPEN" && (
          <div className="pt-3 border-t border-border flex flex-col gap-2">
            <Button
              variant="primary"
              disabled={loading}
              onClick={handleClaim}
              className="w-full h-12 text-body font-extrabold flex items-center justify-center gap-2 rounded-xl shadow-md cursor-pointer"
            >
              <span>{loading ? "Đang xử lý..." : "TIẾP NHẬN ĐƠN NÀY"}</span>
              <ArrowRight size={18} />
            </Button>
            <p className="text-caption text-text-muted text-center">
              Sau khi bấm nhận, bạn sẽ có thời gian kiểm tra kho hoa trước khi đơn chốt vào sản xuất chính thức.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
