"use client"

/**
 * Công cụ 11 — tạo, sao chép và ngừng link hồ sơ cửa hàng công khai.
 * Xuất bản và ngừng chia sẻ là hành động R3 → luôn qua hộp xác nhận.
 */
import { useState } from "react"
import { Share2 } from "@/components/ui/icon-set/share2"
import { Copy } from "@/components/ui/icon-set/copy"
import { Check } from "@/components/ui/icon-set/check"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { Eye } from "@/components/ui/icon-set/eye"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useApi, apiSend } from "@/components/greeting-card/greeting-api"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { formatNumber } from "@/lib/i18n/formatters"
import type { StoreShareLinkView } from "@/modules/profiles/domain/store-share-page"

export function StoreShareLinkCard({ readyToShare, missingEssentials }: { readyToShare: boolean; missingEssentials: readonly string[] }) {
  const link = useApi<{ data: StoreShareLinkView | null }>("/api/v1/store-share-link")
  const [confirm, confirmDialog] = useConfirmDialog()
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const current = link.data?.data ?? null
  const fullUrl = current && typeof window !== "undefined" ? `${window.location.origin}${current.path}` : current?.path ?? ""

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setActionError(null)
    try {
      await fn()
      await link.mutate()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Thao tác không thành công")
    } finally {
      setBusy(false)
    }
  }

  async function publish() {
    const ok = await confirm({
      title: "Tạo trang chia sẻ cửa hàng?",
      consequence: "Bất kỳ ai có link đều xem được tên, logo, số điện thoại, địa chỉ, giờ mở cửa và mạng xã hội trong hồ sơ. Bạn có thể ngừng chia sẻ bất cứ lúc nào.",
      confirmLabel: "Tạo link",
    })
    if (ok) await run(() => apiSend("/api/v1/store-share-link", "POST", undefined, "Không tạo được link"))
  }

  async function revoke() {
    const ok = await confirm({
      title: "Ngừng chia sẻ trang cửa hàng?",
      consequence: "Link hiện tại sẽ không mở được nữa, kể cả với người đã nhận. Nếu tạo lại, bạn sẽ có một link mới.",
      confirmLabel: "Ngừng chia sẻ",
      tone: "danger",
    })
    if (ok) await run(() => apiSend("/api/v1/store-share-link/revoke", "POST", undefined, "Không ngừng được link"))
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setActionError("Không sao chép được, hãy chọn và sao chép link thủ công")
    }
  }

  return (
    <section aria-labelledby="trang-chia-se" className="p-5 rounded-2xl border border-border bg-surface">
      <h2 id="trang-chia-se" className="text-title-sm font-bold text-text flex items-center gap-2">
        <Share2 size={18} aria-hidden className="text-primary" /> Trang chia sẻ cửa hàng
      </h2>
      <p className="mt-1 text-caption text-text-muted">
        Một trang gọn có nút gọi, nhắn Zalo và chỉ đường — gửi cho khách qua tin nhắn hoặc gắn vào trang mạng xã hội.
      </p>

      <div className="mt-4">
        {link.isLoading ? (
          <SkeletonBlock lines={2} label="Đang tải link chia sẻ..." />
        ) : link.error ? (
          <InlineError message="Không tải được link chia sẻ" onRetry={() => void link.mutate()} />
        ) : current ? (
          <div className="flex flex-col gap-3">
            <label htmlFor="link-chia-se" className="text-caption font-semibold text-text">Link của cửa hàng</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input id="link-chia-se" readOnly value={fullUrl} onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 min-h-10 px-3 rounded-lg border border-border bg-surface-alt text-body-sm text-text" />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => void copy()} className="inline-flex items-center gap-1 min-h-10 px-3 rounded-lg text-body-sm font-semibold">
                  {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} {copied ? "Đã chép" : "Sao chép"}
                </Button>
                <a href={current.path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 min-h-10 px-3 rounded-lg border border-border text-body-sm font-semibold text-text">
                  <ExternalLink size={16} aria-hidden /> Xem trang
                </a>
              </div>
            </div>
            <p className="flex items-center gap-1 text-caption text-text-muted">
              <Eye size={14} aria-hidden /> {formatNumber(current.view_count)} lượt xem
            </p>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void revoke()} className="self-start min-h-8 px-2 rounded-lg text-caption font-semibold text-danger-text hover:bg-danger/10 disabled:opacity-50 h-auto">
              Ngừng chia sẻ
            </Button>
          </div>
        ) : readyToShare ? (
          <Button type="button" disabled={busy} onClick={() => void publish()} className="inline-flex items-center gap-2 min-h-10 px-4 rounded-lg bg-primary text-primary-foreground text-body-sm font-semibold disabled:opacity-50">
            <Share2 size={16} aria-hidden /> {busy ? "Đang tạo..." : "Tạo link chia sẻ"}
          </Button>
        ) : (
          <p role="status" className="text-body-sm text-warning-text">
            Cần điền {missingEssentials.join(", ").toLowerCase()} trước khi tạo trang chia sẻ.
          </p>
        )}
        {actionError && <InlineError className="mt-3" message={actionError} />}
      </div>
      {confirmDialog}
    </section>
  )
}
