"use client"

import React, { useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { ShieldAlert } from "@/components/ui/icon-set/shield-alert"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { FileText } from "@/components/ui/icon-set/file-text"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Handshake } from "@/components/ui/icon-set/handshake"
import type { PropagationTarget } from "@/modules/field-platform/domain/field-registry-v2"

interface AddPartnerStoreModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onSuccess: () => void
}

export function AddPartnerStoreModal({ isOpen, onClose, onSuccess }: AddPartnerStoreModalProps) {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [address, setAddress] = useState("")
  const [legalEntityId, setLegalEntityId] = useState("")
  const [validYears, setValidYears] = useState("1")

  // DSA Ceilings
  const [priceCeiling, setPriceCeiling] = useState<PropagationTarget>("RAW")
  const [inventoryCeiling, setInventoryCeiling] = useState<PropagationTarget>("AGGREGATED")
  const [bankCeiling, setBankCeiling] = useState<PropagationTarget>("MASKED")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim() || !legalEntityId.trim()) {
      setError("Vui lòng điền đầy đủ tên, mã cửa hàng và mã số thuế/pháp nhân của đối tác.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const fieldCeilings: Record<string, PropagationTarget> = {
        "core.catalog.price_vnd": priceCeiling,
        "core.catalog.product_name": "RAW",
        "core.org.store_name": "RAW",
        "core.finance.bank_account_number": bankCeiling,
      }

      const validUntil = new Date(
        Date.now() + parseInt(validYears, 10) * 365 * 24 * 60 * 60 * 1000
      ).toISOString()

      const res = await fetch("/api/v1/chain/partner-stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          address: address.trim() || null,
          legalEntityId: legalEntityId.trim(),
          fieldCeilings,
          validUntil,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message || "Không thể kết nối cửa hàng đối tác.")
      }

      setName("")
      setCode("")
      setAddress("")
      setLegalEntityId("")
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Kết Nối Cửa Hàng Đối Tác / Nhượng Quyền (Kèm Thỏa Thuận DSA)"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 rounded-xl bg-warning-bg border border-warning-border text-warning-text flex items-start gap-2.5">
          <Handshake size={18} className="shrink-0 mt-0.5 text-warning-text" />
          <p className="text-caption leading-relaxed">
            Áp dụng cho cửa hàng thuộc pháp nhân khác (§4.3). Dữ liệu thu thập bị giới hạn bởi <strong>Thỏa thuận chia sẻ dữ liệu (DSA)</strong> để bảo vệ bí mật kinh doanh và thông tin cá nhân của đối tác.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl border border-danger/30 bg-danger/10 text-danger text-caption font-semibold flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-caption font-bold text-text">Tên đối tác / Cửa hàng *</label>
            <Input
              type="text"
              required
              placeholder="VD: Chi nhánh Đà Lạt Franchise…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-body-sm h-9 px-3 rounded-xl border border-border bg-surface focus:outline-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-caption font-bold text-text">Mã cửa hàng *</label>
            <Input
              type="text"
              required
              placeholder="VD: FC-DL01…"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full text-body-sm font-mono h-9 px-3 rounded-xl border border-border bg-surface focus:outline-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-caption font-bold text-text">MST / Mã pháp nhân đối tác *</label>
            <Input
              type="text"
              required
              placeholder="VD: 5801234567…"
              value={legalEntityId}
              onChange={(e) => setLegalEntityId(e.target.value)}
              className="w-full text-body-sm font-mono h-9 px-3 rounded-xl border border-border bg-surface focus:outline-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-caption font-bold text-text">Thời hạn hiệu lực thỏa thuận</label>
            <NativeSelect
              value={validYears}
              onChange={(e) => setValidYears(e.target.value)}
              className="w-full text-body-sm h-9 px-3 rounded-xl border border-border bg-surface focus:outline-primary"
            >
              <option value="1">1 năm</option>
              <option value="2">2 năm</option>
              <option value="5">5 năm</option>
            </NativeSelect>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-caption font-bold text-text">Địa chỉ cơ sở đối tác</label>
          <Input
            type="text"
            placeholder="VD: Số 12 Đường Hùng Vương, Đà Lạt"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full text-body-sm h-9 px-3 rounded-xl border border-border bg-surface focus:outline-primary"
          />
        </div>

        {/* DSA Ceiling Configurations */}
        <div className="p-3.5 rounded-xl border border-border bg-surface-alt space-y-3">
          <div className="flex items-center gap-2 text-caption font-bold text-text">
            <FileText size={15} className="text-primary" />
            <span>Cam kết giới hạn chia sẻ dữ liệu (DSA Ceilings):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-caption">
            <div className="space-y-1">
              <span className="font-semibold text-text-muted">Giá bán sản phẩm:</span>
              <NativeSelect
                value={priceCeiling}
                onChange={(e) => setPriceCeiling(e.target.value as PropagationTarget)}
                className="w-full h-8 px-2 rounded-lg border border-border bg-surface font-semibold"
              >
                <option value="RAW">RAW (Giá chi tiết)</option>
                <option value="AGGREGATED">AGGREGATED (Dải giá)</option>
              </NativeSelect>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-text-muted">Tồn kho / Vật tư:</span>
              <NativeSelect
                value={inventoryCeiling}
                onChange={(e) => setInventoryCeiling(e.target.value as PropagationTarget)}
                className="w-full h-8 px-2 rounded-lg border border-border bg-surface font-semibold"
              >
                <option value="AGGREGATED">AGGREGATED (Tổng hợp)</option>
                <option value="RAW">RAW (Chi tiết từng món)</option>
              </NativeSelect>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-text-muted">Tài khoản riêng:</span>
              <NativeSelect
                value={bankCeiling}
                onChange={(e) => setBankCeiling(e.target.value as PropagationTarget)}
                className="w-full h-8 px-2 rounded-lg border border-border bg-surface font-semibold"
              >
                <option value="MASKED">MASKED (Che số đuôi)</option>
                <option value="NONE">NONE (Khóa hoàn toàn)</option>
              </NativeSelect>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button type="submit" size="sm" disabled={loading} className="font-bold bg-primary text-white">
            {loading ? "Đang xử lý…" : "Ký DSA & Kết Nối Đối Tác"}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
