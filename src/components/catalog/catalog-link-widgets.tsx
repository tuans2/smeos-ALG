"use client"

import { Textarea } from "@/components/ui/textarea"
import React, { useState } from "react"
import {
  ExternalLink,
  Copy,
  Check,
  Share2,
  Wand2,
  BookOpen,
  LayoutGrid,
  List,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog } from "@/components/ui/dialog"
import { generateQRCodeDataUrl, triggerDownload } from "@/core/media/qr-engine"
import { ShareCatalogModal } from "./share-catalog-modal"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"
import {
  CATALOG_STYLE_OPTIONS,
  type CatalogStyleVariant,
} from "@/modules/content-engine/domain/catalog-content-generator"
import { formatDate } from "@/lib/i18n/formatters"

export interface CatalogLinkItem {
  slug: string
  name: string
  description: string | null
  filters: Record<string, unknown> | null
  is_revoked?: boolean
  revoked_at: string | null
  created_at: string
}

interface PublishedCatalogLinksProps {
  catalogLinks: CatalogLinkItem[]
  onRefresh: () => void
}

export function PublishedCatalogLinks({ catalogLinks, onRefresh }: PublishedCatalogLinksProps) {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [downloadingQR, setDownloadingQR] = useState<string | null>(null)
  const [sharingLink, setSharingLink] = useState<CatalogLinkItem | null>(null)

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/c/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  const handleDownloadQR = async (slug: string) => {
    setDownloadingQR(slug)
    try {
      const url = `${window.location.origin}/c/${slug}`
      const dataUrl = await generateQRCodeDataUrl(url, { width: 500, margin: 3 })
      triggerDownload(dataUrl, `QR-Catalog-${slug}.png`)
    } catch (err) {
      console.error("Lỗi sinh QR:", err)
    } finally {
      setDownloadingQR(null)
    }
  }

  return (
    <div className="border-t border-border pt-6">
      <h3 className="text-body-sm font-bold text-text mb-3">
        Danh sách Catalog đã xuất bản ({catalogLinks.length})
      </h3>
      {catalogLinks.length === 0 ? (
        <div className="p-8 text-center bg-surface rounded-2xl border border-dashed text-text-muted text-caption">
          Chưa có catalog nào được xuất bản. Hãy chọn sản phẩm và bấm &quot;Xuất bản Catalog mới&quot; ở trên.
        </div>
      ) : (
        <div className="space-y-2.5">
          {catalogLinks.map((link) => {
            const isRevoked = Boolean(link.is_revoked || link.revoked_at)
            const style = (link.filters?.styleVariant as string) || "MODERN_SHOWROOM"
            return (
              <div
                key={link.slug}
                className="p-4 rounded-2xl bg-white border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm font-bold text-text truncate">{link.name}</span>
                    {isRevoked ? (
                      <Badge tone="danger">Đã thu hồi</Badge>
                    ) : (
                      <Badge tone="success">Đang mở</Badge>
                    )}
                    <span className="text-caption px-2 py-0.5 rounded-full bg-surface-alt border text-text-muted font-mono">
                      {style === "EDITORIAL_LOOKBOOK" ? "Tạp chí ảnh" : style === "COMPACT_LIST" ? "Danh sách đặt nhanh" : "Trưng bày"}
                    </span>
                  </div>
                  <div className="text-caption text-text-muted mt-1 flex flex-wrap items-center gap-2">
                    <span>Đường dẫn: <code>/c/{link.slug}</code></span>
                    <span>· Tạo: {formatDate(link.created_at)}</span>
                    {link.description && <span>· {link.description}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isRevoked && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => window.open(`/c/${link.slug}`, "_blank")} className="h-8 gap-1 text-caption">
                        <ExternalLink size={13} /> Xem trước
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSharingLink(link)} className="h-8 gap-1 text-caption text-primary font-bold hover:bg-primary/10">
                        <Share2 size={13} /> Chia sẻ
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleCopyLink(link.slug)} className="h-8 gap-1 text-caption">
                        {copiedSlug === link.slug ? (
                          <><Check size={13} className="text-success" /><span className="text-success">Đã chép</span></>
                        ) : (
                          <><Copy size={13} /> Copy link</>
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDownloadQR(link.slug)} disabled={downloadingQR === link.slug} className="h-8 gap-1 text-caption text-primary">
                        {downloadingQR === link.slug ? "Đang tạo..." : "Tải QR"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {sharingLink && (
        <ShareCatalogModal
          slug={sharingLink.slug}
          name={sharingLink.name}
          description={sharingLink.description}
          onClose={() => setSharingLink(null)}
        />
      )}
    </div>
  )
}

/* ── Modal Xuất bản Catalog mới với 3 Styles & AI Content Engine ────────────────────────────────────── */

interface CreateCatalogModalProps {
  selectedIds: string[]
  onClose: () => void
  onCreated: () => void
}

export function CreateCatalogModal({ selectedIds, onClose, onCreated }: CreateCatalogModalProps) {
  const { organization } = useSession()
  const ti = getIndustryTerminology(organization?.industry)
  const toast = useToast()
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [styleVariant, setStyleVariant] = useState<CatalogStyleVariant>("MODERN_SHOWROOM")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAiGenerating, setIsAiGenerating] = useState(false)

  const handleAiWriteIntro = async () => {
    if (!name.trim()) return
    setIsAiGenerating(true)
    try {
      const res = await fetch("/api/v1/content-engine/catalog-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionName: name.trim(),
          productCount: selectedIds.length,
          productIds: selectedIds,
          styleVariant,
        }),
      })
      if (!res.ok) throw new Error("Không thể sinh nội dung")
      const json = await res.json()
      if (json.data?.description) {
        setDesc(json.data.description)
      }
    } catch (err) {
      console.error("AI error:", err)
    } finally {
      setIsAiGenerating(false)
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    setIsSubmitting(true)
    try {
      const slug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") + `-${Math.random().toString(36).substring(2, 6)}`

      const res = await fetch("/api/v1/catalog-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: name.trim(),
          description: desc.trim() || null,
          filters: {
            product_ids: selectedIds,
            styleVariant,
          },
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || "Tạo catalog thất bại")
      }
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi tạo catalog")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Xuất bản Catalog số mới"
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>Hủy bỏ</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()} variant="primary">
            {isSubmitting ? "Đang tạo…" : "Xác nhận xuất bản"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Style Variant Selector */}
        <div>
          <label className="block text-caption font-bold text-text mb-1.5">Phong cách trưng bày</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {CATALOG_STYLE_OPTIONS.map((st) => (
              <Button variant="outline"
                key={st.id}
                type="button"
                onClick={() => setStyleVariant(st.id)}
                className={`h-auto text-[length:inherit] gap-0 p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  styleVariant === st.id
                    ? "border-primary bg-primary-bg/25 text-primary font-bold shadow-xs hover:bg-primary-bg/25"
                    : "border-border bg-surface text-text hover:border-border-hover hover:bg-surface"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {st.id === "MODERN_SHOWROOM" && <LayoutGrid size={14} />}
                  {st.id === "EDITORIAL_LOOKBOOK" && <BookOpen size={14} />}
                  {st.id === "COMPACT_LIST" && <List size={14} />}
                  <span className="text-caption">{st.name}</span>
                </div>
                <div className="text-caption text-text-muted mt-1 font-normal line-clamp-2">{st.desc}</div>
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-caption font-semibold text-text mb-1.5">Tên Catalog / Bộ sưu tập *</label>
          <Input required placeholder={`VD: ${ti.sampleProduct} Tuyển Chọn 2026`} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-caption font-semibold text-text">Mô tả / Lời tựa giới thiệu</label>
            <Button variant="ghost"
              type="button"
              onClick={handleAiWriteIntro}
              disabled={isAiGenerating || !name.trim()}
              className="h-auto px-0 py-0 text-caption text-primary font-bold hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              <Wand2 size={12} />
              <span>{isAiGenerating ? "Đang viết..." : "✨ AI viết tự động"}</span>
            </Button>
          </div>
          <Textarea
            rows={3}
            placeholder={`Lời tựa mở đầu cho bộ sưu tập ${ti.sampleProduct}...`}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full rounded-xl border border-border p-3 text-caption focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="p-3 rounded-xl bg-surface border text-caption text-text-muted">
          {selectedIds.length > 0
            ? <span>Đang chọn <strong>{selectedIds.length}</strong> {ti.sampleProduct} cho catalog này.</span>
            : <span>Tất cả {ti.sampleProduct} đang hoạt động sẽ tự động hiển thị.</span>}
        </div>
      </div>
    </Dialog>
  )
}
