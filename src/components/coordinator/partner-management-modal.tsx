"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Users } from "@/components/ui/icon-set/users"
import { Search } from "@/components/ui/icon-set/search"
import { Plus } from "@/components/ui/icon-set/plus"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { X } from "@/components/ui/icon-set/x"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import type { PartnerView } from "@/modules/coordinator/use-cases/manage-partners"
import { PartnerCard } from "./partner-card"
import { PartnerCreateForm } from "./partner-create-form"

export interface PartnerManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onPartnersUpdated?: () => void
}

export function PartnerManagementModal({
  isOpen,
  onClose,
  onPartnersUpdated,
}: PartnerManagementModalProps) {
  const [partners, setPartners] = useState<PartnerView[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [tierFilter, setTierFilter] = useState<string>("ALL")
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const fetchPartners = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch("/api/v1/coordinator/partners")
      if (!res.ok) throw new Error("Không thể tải danh bạ đối tác")
      const data = await res.json()
      if (Array.isArray(data.data)) {
        setPartners(data.data)
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi kết nối")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchPartners()
      setIsAddingNew(false)
      setErrorMsg(null)
      setSuccessMsg(null)
    }
  }, [isOpen, fetchPartners])

  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const matchTier = tierFilter === "ALL" || p.tier === tierFilter
      if (!matchTier) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        (p.district && p.district.toLowerCase().includes(q)) ||
        (p.province && p.province.toLowerCase().includes(q))
      )
    })
  }, [partners, tierFilter, search])

  async function handleToggleStatus(partner: PartnerView) {
    try {
      const res = await fetch(`/api/v1/coordinator/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !partner.isActive }),
      })
      if (!res.ok) throw new Error("Không thể cập nhật trạng thái đối tác")
      await fetchPartners()
      onPartnersUpdated?.()
      setSuccessMsg(
        partner.isActive
          ? `Đã tạm ngưng đối tác ${partner.name}`
          : `Đã kích hoạt lại đối tác ${partner.name}`
      )
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Cập nhật thất bại")
    }
  }

  function handleCreateSuccess() {
    setSuccessMsg("Đã tạo xưởng đối tác mạng lưới mới thành công!")
    setIsAddingNew(false)
    fetchPartners()
    onPartnersUpdated?.()
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const dialogTitle = (
    <div className="flex items-center gap-2.5">
      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Users size={18} />
      </div>
      <div>
        <div className="text-title-sm font-bold text-text">Mạng Lưới Đối Tác &amp; Xưởng Hoa</div>
        <div className="text-caption text-text-muted">
          Điều phối theo khu vực, cấp bậc và định mức đơn mỗi ngày
        </div>
      </div>
    </div>
  )

  const dialogFooter = (
    <div className="flex items-center justify-between w-full">
      <div className="text-caption text-text-muted">
        Tổng số: <strong className="text-text">{partners.length}</strong> xưởng trong mạng lưới
      </div>
      <Button variant="outline" size="sm" onClick={onClose} className="text-caption">
        Đóng
      </Button>
    </div>
  )

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose() }}
      title={dialogTitle}
      size="lg"
      footer={dialogFooter}
    >
      <div className="flex flex-col gap-4 text-body-sm">
        {/* Thông báo kết quả */}
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-bg p-3 text-caption text-danger">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-bg p-3 text-caption text-success">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Nút toggle Thêm xưởng mới & Bộ lọc cấp bậc */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isAddingNew ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="text-caption gap-1.5"
            >
              {isAddingNew ? <X size={14} /> : <Plus size={14} />}
              {isAddingNew ? "Thu gọn form" : "Thêm xưởng đối tác"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchPartners}
              disabled={loading}
              className="text-caption gap-1 text-text-muted hover:text-text"
            >
              <RefreshCw size={13} className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
              Làm mới
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <NativeSelect
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="h-8 text-caption font-semibold"
            >
              <option value="ALL">Mọi cấp bậc</option>
              <option value="STANDARD">Tiêu chuẩn</option>
              <option value="PREFERRED">Ưu tiên</option>
              <option value="VIP">VIP Đặc biệt</option>
            </NativeSelect>
          </div>
        </div>

        {/* Khối Thêm Đối Tác Mới */}
        {isAddingNew && (
          <PartnerCreateForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setIsAddingNew(false)}
            onError={(msg) => setErrorMsg(msg)}
          />
        )}

        {/* Thanh tìm kiếm */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-text-muted" />
          <Input
            placeholder="Tìm theo tên xưởng, mã đối tác, quận/huyện hoặc số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-caption"
          />
        </div>

        {/* Danh sách Đối tác */}
        <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1">
          {loading && partners.length === 0 ? (
            <div className="py-8 text-center text-text-muted text-caption">Đang tải danh bạ đối tác...</div>
          ) : filteredPartners.length === 0 ? (
            <div className="py-8 text-center text-text-muted text-caption border border-dashed border-border rounded-xl">
              Không tìm thấy đối tác nào phù hợp tiêu chí
            </div>
          ) : (
            filteredPartners.map((p) => (
              <PartnerCard
                key={p.id}
                partner={p}
                onToggleStatus={handleToggleStatus}
              />
            ))
          )}
        </div>
      </div>
    </Dialog>
  )
}
