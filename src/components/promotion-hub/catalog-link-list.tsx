"use client"

import { useState } from "react"
import type { CatalogLinkItem } from "@/components/catalog/catalog-link-widgets"
import { apiSend } from "@/components/greeting-card/greeting-api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Check } from "@/components/ui/icon-set/check"
import { Copy } from "@/components/ui/icon-set/copy"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { QrCode } from "@/components/ui/icon-set/qr-code"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { generateQRCodeDataUrl, triggerDownload } from "@/core/media/qr-engine"
import { formatDate } from "@/lib/i18n/formatters"

interface CatalogLinkListProps {
  title: string
  emptyText: string
  links: readonly CatalogLinkItem[]
  loading: boolean
  error: string | null
  canRevoke: boolean
  onRetry: () => void
  onChanged: () => void
}

const isRevoked = (l: CatalogLinkItem) => Boolean(l.is_revoked || l.revoked_at)
const publicUrl = (slug: string) => `${window.location.origin}/c/${slug}`

/**
 * Danh sách link `/c/[slug]` của một ô Quảng bá: tên, ngày tạo, trạng thái; xem, chép link, tải QR và ngừng chia sẻ
 * (gọi `POST /catalog-links/:slug/revoke` có sẵn — máy chủ kiểm quyền). Link đã ngừng xếp cuối.
 */
export function CatalogLinkList({ title, emptyText, links, loading, error, canRevoke, onRetry, onChanged }: CatalogLinkListProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [qrBusy, setQrBusy] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<CatalogLinkItem | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const sorted = [...links].sort((a, b) => Number(isRevoked(a)) - Number(isRevoked(b)) || b.created_at.localeCompare(a.created_at))

  async function copy(slug: string) {
    try {
      await navigator.clipboard.writeText(publicUrl(slug))
      setCopied(slug)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setActionError(`Trình duyệt chưa cho chép. Link: ${publicUrl(slug)}`)
    }
  }

  async function downloadQr(slug: string) {
    setQrBusy(slug)
    try {
      triggerDownload(await generateQRCodeDataUrl(publicUrl(slug), { width: 500, margin: 3 }), `QR-${slug}.png`)
    } catch {
      setActionError("Chưa tạo được mã QR, thử lại sau")
    } finally {
      setQrBusy(null)
    }
  }

  async function revoke(link: CatalogLinkItem) {
    try {
      await apiSend(`/api/v1/catalog-links/${encodeURIComponent(link.slug)}/revoke`, "POST", {}, "Chưa ngừng chia sẻ được")
      setActionError(null)
      onChanged()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Chưa ngừng chia sẻ được")
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="text-body-sm font-bold text-text">{title}{!loading && !error ? ` (${links.length})` : ""}</h4>
      {loading && <SkeletonBlock lines={3} label={title} />}
      {error && <InlineError message={error} onRetry={onRetry} />}
      {actionError && <InlineError message={actionError} onRetry={() => setActionError(null)} retryLabel="Đóng" />}
      {!loading && !error && sorted.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-body-sm text-text-muted">{emptyText}</p>
      )}
      {!loading && !error && sorted.length > 0 && (
        <ul className="space-y-2">
          {sorted.map((link) => {
            const revoked = isRevoked(link)
            return (
              <li key={link.slug} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-body-sm font-bold text-text">{link.name}</span>
                    {revoked ? <Badge tone="neutral">Đã ngừng chia sẻ</Badge> : <Badge tone="success">Đang chạy</Badge>}
                  </div>
                  <p className="mt-1 text-caption text-text-muted">Tạo ngày {formatDate(link.created_at)}</p>
                </div>
                {!revoked && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => window.open(`/c/${link.slug}`, "_blank", "noopener")}>
                      <ExternalLink size={14} aria-hidden /> Xem
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void copy(link.slug)}>
                      {copied === link.slug ? <><Check size={14} aria-hidden /> Đã chép</> : <><Copy size={14} aria-hidden /> Chép link</>}
                    </Button>
                    <Button variant="ghost" size="sm" disabled={qrBusy === link.slug} onClick={() => void downloadQr(link.slug)}>
                      <QrCode size={14} aria-hidden /> {qrBusy === link.slug ? "Đang tạo…" : "Tải QR"}
                    </Button>
                    {canRevoke && (
                      <Button variant="ghost" size="sm" className="text-danger-text" onClick={() => setRevoking(link)}>Ngừng chia sẻ</Button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(o) => !o && setRevoking(null)}
        title={`Ngừng chia sẻ "${revoking?.name ?? ""}"?`}
        consequence="Khách mở link hoặc quét mã QR cũ sẽ thấy trang đã ngừng. Không mở lại được link này; muốn chia sẻ tiếp thì tạo trang mới."
        confirmLabel="Ngừng chia sẻ"
        tone="danger"
        onConfirm={async () => { if (revoking) await revoke(revoking); setRevoking(null) }}
      />
    </div>
  )
}
