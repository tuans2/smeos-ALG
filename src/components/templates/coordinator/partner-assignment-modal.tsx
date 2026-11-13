"use client"

import { Input } from "@/components/ui/input"
import React, { useEffect, useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Users } from "@/components/ui/icon-set/users"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { Star } from "@/components/ui/icon-set/star"
import { Plus } from "@/components/ui/icon-set/plus"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { StructuredAddress } from "@/modules/products/domain/product-master-index"
import {
  coordinatorApi,
  errorMessage,
  type CoordinationPartner,
} from "@/components/coordinator/coordinator-api"

/**
 * Phân công đối tác (Template T06, F05).
 *
 * Danh sách lấy từ bảng `partners` của chính tổ chức. Bản trước bày ba xưởng
 * cố định kèm "khoảng cách", "% khớp AI" tự bịa — nay không có ghép AI thì
 * không hiện điểm AI (nợ #141). Công suất ngày do máy chủ kiểm khi giao.
 */
export interface PartnerAssignmentModalProps {
  isOpen: boolean
  orderCode: string
  recipeTitle: string
  deliveryAddress: StructuredAddress | string | unknown
  deliveryTargetTime: string
  currentPartnerId?: string | null | undefined
  onClose: () => void
  /** Gọi máy chủ; lỗi ném ra để modal hiện câu máy chủ trả. */
  onAssign: (partnerId: string, notes: string, overrideCapacity: boolean) => Promise<void>
}

function addressText(addr: unknown): string {
  if (addr && typeof addr === "object") {
    const a = addr as Record<string, unknown>
    return (
      (typeof a.formattedAddress === "string" && a.formattedAddress) ||
      [a.street, a.ward, a.district, a.city].filter((v) => typeof v === "string" && v).join(", ")
    )
  }
  return typeof addr === "string" ? addr : ""
}

export function PartnerAssignmentModal({
  isOpen,
  orderCode,
  recipeTitle,
  deliveryAddress,
  deliveryTargetTime,
  currentPartnerId,
  onClose,
  onAssign,
}: PartnerAssignmentModalProps) {
  const [partners, setPartners] = useState<CoordinationPartner[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(currentPartnerId ?? null)
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [needsOverride, setNeedsOverride] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState({ code: "", name: "", phone: "", district: "", province: "", capacityDaily: 10 })

  // Dashboard dựng lại modal (`key`) mỗi lần mở, nên chỉ cần nạp một lần.
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    coordinatorApi
      .listPartners(true)
      .then((list) => {
        if (cancelled) return
        setPartners(list)
        setShowAdd(list.length === 0)
      })
      .catch((e: unknown) => !cancelled && setError(`Không tải được danh sách đối tác: ${errorMessage(e)}`))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleConfirm = async (override = false) => {
    if (!selectedPartnerId) return
    setSubmitting(true)
    setError(null)
    try {
      await onAssign(selectedPartnerId, notes, override)
      setNotes("")
      setNeedsOverride(false)
    } catch (e) {
      const msg = errorMessage(e)
      setError(msg)
      setNeedsOverride(msg.includes("đơn đang chạy"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreatePartner = async () => {
    setError(null)
    try {
      const partner = await coordinatorApi.createPartner({
        code: draft.code.trim(),
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        ...(draft.district.trim() ? { district: draft.district.trim() } : {}),
        ...(draft.province.trim() ? { province: draft.province.trim() } : {}),
        capacityDaily: Number(draft.capacityDaily) || 10,
      })
      setPartners((prev) => [partner, ...prev])
      setSelectedPartnerId(partner.id)
      setShowAdd(false)
      setDraft({ code: "", name: "", phone: "", district: "", province: "", capacityDaily: 10 })
    } catch (e) {
      setError(`Không thêm được đối tác: ${errorMessage(e)}`)
    }
  }

  const input = "px-3 py-2 rounded-xl border border-border bg-surface text-text focus:outline-none focus:border-danger"

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <Users size={18} className="text-danger-text" />
          Phân Công Đối Tác / Thợ Chế Tác
        </span>
      }
      description={`Đơn #${orderCode}: ${recipeTitle} · Hẹn giao: ${deliveryTargetTime}`}
      footer={
        <div className="flex items-center justify-end gap-3">
            <Button variant="outline" size="sm" onClick={onClose}>
              Hủy bỏ
            </Button>
            {needsOverride && (
              <Button size="sm" variant="outline" disabled={submitting} onClick={() => handleConfirm(true)}>
                Vẫn giao (vượt công suất)
              </Button>
            )}
            <Button
              size="sm"
              disabled={!selectedPartnerId || submitting}
              onClick={() => handleConfirm(false)}
              className="bg-danger hover:bg-danger-text text-white font-bold gap-1.5"
            >
              <CheckCircle2 size={15} />
              <span>{submitting ? "Đang giao việc…" : "Xác Nhận Giao Việc & Phát Hành Phiếu Giao Việc"}</span>
            </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 text-caption">
          <div className="p-3.5 rounded-xl bg-surface-alt border border-border flex items-start gap-2.5">
            <MapPin size={15} className="text-danger-text shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-text block">Địa chỉ giao:</span>
              <span className="text-text font-semibold">{addressText(deliveryAddress) || "—"}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-bold text-text text-caption">Đối tác đang nhận đơn của tiệm:</span>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowAdd((v) => !v)} className="gap-1">
              <Plus size={13} /> Thêm đối tác
            </Button>
          </div>

          {showAdd && (
            <div className="p-3 rounded-xl border border-dashed border-danger-border bg-danger-bg/40 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input className={input} placeholder="Mã (vd XUONG-BD)" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
              <Input className={input} placeholder="Tên xưởng / thợ" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <Input className={input} placeholder="Số điện thoại" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              <Input className={input} placeholder="Quận/Huyện" value={draft.district} onChange={(e) => setDraft({ ...draft, district: e.target.value })} />
              <Input className={input} placeholder="Tỉnh/Thành phố" value={draft.province} onChange={(e) => setDraft({ ...draft, province: e.target.value })} />
              <Input
                className={input}
                type="number"
                min={1}
                placeholder="Công suất đơn/ngày"
                value={draft.capacityDaily}
                onChange={(e) => setDraft({ ...draft, capacityDaily: Number(e.target.value) })}
              />
              <div className="sm:col-span-2 flex justify-end">
                <Button type="button" variant="secondary" size="sm" onClick={handleCreatePartner} className="bg-danger hover:bg-danger-text text-white">
                  Lưu đối tác
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-text-muted">Đang tải danh sách đối tác…</div>
          ) : partners.length === 0 ? (
            <div className="text-text-muted">Tiệm chưa có đối tác nào đang nhận đơn — thêm đối tác ở trên.</div>
          ) : (
            <RadioGroup aria-label="Chọn đối tác" value={selectedPartnerId ?? ""} onValueChange={(v) => setSelectedPartnerId(String(v))} className="space-y-2.5">
              {partners.map((p) => {
                const isSelected = p.id === selectedPartnerId
                return (
                  <label
                    key={p.id}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected ? "border-danger bg-danger-bg/40 ring-2 ring-danger/20" : "border-border bg-surface hover:border-danger-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value={p.id} />
                      <span className="font-extrabold text-text text-body-sm">{p.name}</span>
                      <Badge tone={p.tier === "STANDARD" ? "neutral" : "warning"} className="text-caption">
                        {p.tier}
                      </Badge>
                      {p.id === currentPartnerId && <Badge tone="success" className="text-caption">Đang giữ đơn</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-text-muted text-caption pl-6">
                      <span>{p.code}</span>
                      <span>{p.phone}</span>
                      {(p.district || p.province) && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {[p.district, p.province].filter(Boolean).join(", ")}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Star size={12} className="text-warning-text fill-warning" />
                        {p.rating.toFixed(1)}/5
                      </span>
                      <span>Công suất {p.capacityDaily} đơn/ngày</span>
                    </div>
                  </label>
                )
              })}
            </RadioGroup>
          )}

          <div>
            <label className="font-bold text-text block mb-1">Lời nhắn giao việc cho đối tác:</label>
            <Input
              type="text"
              placeholder="Ví dụ: kiểm tra kỹ chất lượng nguyên vật liệu, gửi ảnh thành phẩm trước 16:15"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`w-full ${input}`}
            />
          </div>

          {error && (
            <div role="alert" className="p-3 rounded-xl border border-danger-border bg-danger-bg text-danger-text font-semibold flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

    </Dialog>
  )
}
