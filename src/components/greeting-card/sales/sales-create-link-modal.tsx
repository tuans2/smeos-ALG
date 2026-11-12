"use client"

import { NativeSelect } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { markPersonalLinkCopied } from "@/components/greeting-card/share/tracked-copy"
import { Check, Copy } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { apiSend } from "@/components/greeting-card/greeting-api"
import { LINK_LIFETIME_HINT, linkExpiryLabel, type CatalogOption } from "./sales-types"
import { useI18n } from "@/lib/i18n"

interface Props {
  catalogs: CatalogOption[]
  onClose: () => void
  onCreated: () => void
  onNavigateToCatalog?: (() => void) | undefined
}

const INPUT = "w-full h-10 px-3 rounded-lg border border-border bg-bg text-body text-text"

/** Hộp thoại tạo link Thẻ chào gửi khách (chọn bộ sưu tập, khách, hạn dùng). */
export function SalesCreateLinkModal({ catalogs, onClose, onCreated, onNavigateToCatalog }: Props) {
  const { ti } = useI18n()
  const rawCatalogTitle = ti("catalogTitle") || "Bộ sưu tập"
  const isHomestay = rawCatalogTitle.toLowerCase().includes("phòng")
  const catalogHeading = isHomestay ? "danh sách phòng" : rawCatalogTitle.toLowerCase()
  const catalogTitleCap = isHomestay ? "Danh Sách Phòng" : "Bộ Sưu Tập"
  const [catalogId, setCatalogId] = useState(catalogs[0]?.id ?? "")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const res = await apiSend<{ data: { shareUrl: string; expiresAt: string | null } }>(
        "/api/v1/greeting-card/send-links",
        "POST",
        {
          catalogId: catalogId || undefined,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
        },
        "Không tạo được link chào khách"
      )
      setCreatedLink(`${window.location.origin}${res.data.shareUrl}`)
      setExpiresAt(res.data.expiresAt)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được link chào khách")
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !creating) onClose() }} size="sm"
      title="Tạo link riêng gửi khách">
      <div className="flex flex-col gap-4">
        {createdLink ? (
          <div className="flex flex-col gap-3 py-2">
            <div className="p-3 bg-success-bg border border-success/30 rounded-xl text-success text-body-sm font-bold flex items-center gap-2">
              <Check size={18} />
              <span>Đã tạo link riêng thành công!</span>
            </div>
            <div className="p-3 bg-surface-alt rounded-xl border border-border text-body-sm font-mono break-all">{createdLink}</div>
            {linkExpiryLabel(expiresAt) && <p className="text-caption text-text-muted">{linkExpiryLabel(expiresAt)}</p>}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(createdLink)
                markPersonalLinkCopied(createdLink.split("/b/")[1] ?? "")
                setCopied(true)
              }}
              className="w-full hover:bg-primary/10 font-bold h-11 gap-1.5"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? "Đã copy vào bộ nhớ tạm" : "Copy link gửi khách"}</span>
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="w-full h-10">Đóng</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {error && <p role="alert" className="p-3 rounded-xl bg-danger-bg text-danger text-body-sm">{error}</p>}
            <label className="flex flex-col gap-1">
              <span className="text-caption font-bold text-text">Chọn {catalogTitleCap} *</span>
              {catalogs.length === 0 ? (
                <span className="p-3 bg-warning-bg/50 border border-warning/30 rounded-xl text-body-sm text-text flex flex-col gap-2">
                  Chưa có {catalogHeading} nào. Cần tạo {catalogHeading} trước!
                  {onNavigateToCatalog && (
                    <Button variant="ghost" type="button" onClick={() => { onClose(); onNavigateToCatalog() }} className="text-[length:inherit] h-auto p-0 justify-start gap-0 text-primary font-bold underline text-left">
                      → Đến trang tạo {catalogTitleCap} ngay
                    </Button>
                  )}
                </span>
              ) : (
                <NativeSelect value={catalogId} onChange={(e) => setCatalogId(e.target.value)} className={INPUT}>
                  {catalogs.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </NativeSelect>
              )}
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-caption font-bold text-text">Tên khách hàng (không bắt buộc)</span>
              <Input type="text" maxLength={100} placeholder="VD: Anh Minh" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-caption font-bold text-text">Số điện thoại khách (không bắt buộc)</span>
              <Input type="tel" maxLength={15} placeholder="VD: 0901234567" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={INPUT} />
            </label>
            <p className="text-caption text-text-muted">{LINK_LIFETIME_HINT}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="h-10">Hủy</Button>
              <Button type="submit" disabled={creating || catalogs.length === 0} className="bg-primary hover:bg-primary-dark text-white font-bold h-10 px-4">
                {creating ? "Đang tạo..." : "Tạo Link Ngay"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  )
}
