"use client"

import React, { useState } from "react"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import type { CoordinationPartner } from "@/components/coordinator/coordinator-api"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"

export interface ConfirmCraftAcceptanceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderCode: string
  recipeTitle: string
  unitPriceVnd: number
  suggestedCraftFeeVnd: number
  partners: CoordinationPartner[]
  currentPartnerId?: string | null | undefined
  onConfirm: (data: { partnerId: string; agreedCraftFeeVnd: number; notes?: string | undefined }) => Promise<void>
}

export function ConfirmCraftAcceptanceModal({
  open,
  onOpenChange,
  orderCode,
  recipeTitle,
  unitPriceVnd,
  suggestedCraftFeeVnd,
  partners,
  currentPartnerId,
  onConfirm,
}: ConfirmCraftAcceptanceModalProps) {
  const [partnerId, setPartnerId] = useState<string>(currentPartnerId || (partners[0]?.id ?? ""))
  const [agreedFee, setAgreedFee] = useState<number>(suggestedCraftFeeVnd)
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { organization } = useSession()
  const ti = getIndustryTerminology(organization?.industry)

  const activePartners = partners.filter((p) => p.isActive)
  const feeRatio = unitPriceVnd > 0 ? (agreedFee / unitPriceVnd) * 100 : 0
  const isHighCost = feeRatio > 60

  const handleConfirm = async () => {
    if (!partnerId) {
      setError(`Vui lòng chọn bộ phận hoặc đối tác ${ti.makerTitle}.`)
      return
    }
    if (agreedFee < 0) {
      setError("Mức giá gia công không hợp lệ.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm({
        partnerId,
        agreedCraftFeeVnd: agreedFee,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      })
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể xác nhận đơn.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-primary" />
          <span>Xác Nhận Nhận Đơn & Chốt Giá Gia Công</span>
        </div>
      }
      description={`Đơn #${orderCode} • ${recipeTitle}`}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
            Đóng
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={submitting}
            className="bg-primary hover:bg-primary-dark text-white font-bold"
          >
            {submitting ? "Đang ghi nhận..." : "Xác nhận nhận đơn"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-1 text-caption">
        {error && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger font-medium">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="font-bold text-text block">
            Bộ phận / {ti.makerTitle} phụ trách <span className="text-danger">*</span>
          </label>
          <Select
            value={partnerId || undefined}
            onValueChange={(val) => setPartnerId(val)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`-- Chọn xưởng / ${ti.makerTitle} --`} />
            </SelectTrigger>
            <SelectContent>
              {activePartners.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} {p.district ? `(${p.district}, ${p.province})` : ""} - Công suất: {p.capacityDaily} đơn/ngày
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-bold text-text block">
              Mức giá gia công chốt cuối cùng (VNĐ) <span className="text-danger">*</span>
            </label>
            <span className="text-caption text-text-muted">
              Giá bán: <strong>{unitPriceVnd.toLocaleString("vi-VN")}đ</strong>
            </span>
          </div>
          <div className="relative">
            <Input
              type="number"
              step={10000}
              min={0}
              value={agreedFee || ""}
              onChange={(e) => setAgreedFee(Number(e.target.value))}
              placeholder="Nhập mức giá gia công đã thỏa thuận"
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text font-bold text-body focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="absolute right-3 top-2.5 text-caption font-bold text-text-muted">VNĐ</span>
          </div>
          <div className="flex items-center justify-between text-caption pt-0.5">
            <span className="text-text-muted">
              Tỷ lệ chi phí: <strong className={isHighCost ? "text-warning-text" : "text-text"}>{feeRatio.toFixed(1)}%</strong> giá bán
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline"
                type="button"
                onClick={() => setAgreedFee(suggestedCraftFeeVnd)}
                className="h-auto gap-0 px-2 py-0.5 rounded bg-surface-alt border border-border text-text hover:bg-surface text-caption font-semibold cursor-pointer"
              >
                Mức gợi ý ({suggestedCraftFeeVnd.toLocaleString("vi-VN")}đ)
              </Button>
              <Button variant="outline"
                type="button"
                onClick={() => setAgreedFee((prev) => Math.max(0, prev - 20000))}
                className="h-auto font-[inherit] gap-0 px-1.5 py-0.5 rounded bg-surface-alt border border-border text-text hover:bg-surface text-caption cursor-pointer"
              >
                -20k
              </Button>
              <Button variant="outline"
                type="button"
                onClick={() => setAgreedFee((prev) => prev + 20000)}
                className="h-auto font-[inherit] gap-0 px-1.5 py-0.5 rounded bg-surface-alt border border-border text-text hover:bg-surface text-caption cursor-pointer"
              >
                +20k
              </Button>
            </div>
          </div>
        </div>

        {isHighCost && (
          <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-warning-text flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-warning-text" />
            <div className="text-caption leading-relaxed">
              <strong>Cảnh báo biên lợi nhuận:</strong> Giá gia công chiếm {feeRatio.toFixed(1)}% giá bán (vượt ngưỡng thông thường 60%). Vui lòng kiểm tra kỹ chi phí phụ cấp hoặc nguyên vật liệu phát sinh.
            </div>
          </div>
        )}

        <div className="p-3 rounded-xl bg-surface-alt/60 border border-border text-caption flex items-start gap-2 text-text-muted">
          <ShieldCheck size={14} className="shrink-0 mt-0.5 text-primary" />
          <span>
            Số tiền này sẽ được tự động ghi nhận vào sổ đối soát tài chính và giá vốn sản xuất của đơn hàng để thanh toán cho {ti.makerTitle}.
          </span>
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-text block">Ghi chú bổ sung cho {ti.makerTitle} (nếu có)</label>
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ví dụ: Đã chốt phụ thu nguyên liệu cao cấp 50k, bàn giao đúng 15h..."
            className="w-full px-3 py-1.5 rounded-xl border border-border bg-surface text-text text-caption focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
    </Dialog>
  )
}
