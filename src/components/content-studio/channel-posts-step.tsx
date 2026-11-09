"use client"

import { useState } from "react"
import { Tile, TilePill } from "@/components/brand-kit/tiles/tile"
import { MultichannelPostCard, type MultichannelPostItem } from "@/components/templates/content-engine"
import { Button } from "@/components/ui/button"
import { CostPreview } from "@/components/ui/cost-preview"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { Library } from "@/components/ui/icon-set/library"
import { Package } from "@/components/ui/icon-set/package"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useTenantProfile } from "@/lib/hooks/use-tenant-profile"
import { safeImageSrc } from "@/lib/safe-image-src"
import { useSession } from "@/lib/session"
import { costCreditForFeature } from "@/modules/usage/domain/pricing"
import { LibraryPickerDialog } from "./library-picker-dialog"
import type { ContentJourney } from "./use-content-journey"
import { POST_CHANNELS, channelLabel, useChannelPosts } from "./use-channel-posts"

/**
 * Bước 3 — Bài đăng đa kênh: viết từ Thẻ sản phẩm + Bài giới thiệu + Thẻ chào đã duyệt (Content Engine), xem trước
 * theo từng nền tảng (thẻ chuẩn `MultichannelPostCard`), sửa rồi duyệt một lần. Bài đã duyệt nằm trong Kho, dùng ở Bước 4.
 */
export function ChannelPostsStep({ journey }: { journey: ContentJourney }) {
  const session = useSession()
  const { business } = useTenantProfile()
  const c = useChannelPosts(journey)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const view = journey.view
  const picker = (
    <LibraryPickerDialog open={libraryOpen} require="pitch" title="Chọn sản phẩm để viết bài" onClose={() => setLibraryOpen(false)}
      onPick={(id) => journey.setProduct(id, "CHANNEL_POSTS")} />
  )

  if (!view) {
    return (
      <>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <Tile title="Chọn sản phẩm từ Kho" icon={Library} pill={<TilePill tone="muted">Dữ liệu có sẵn</TilePill>}
            preview="Dùng sản phẩm đã có Thẻ sản phẩm, Bài giới thiệu và Thẻ chào được duyệt." onOpen={() => setLibraryOpen(true)} />
          <Tile title="Bắt đầu từ ảnh mới" icon={Package} pill={<TilePill tone="muted">Bước 1</TilePill>}
            preview="Tải ảnh sản phẩm để tạo Thẻ sản phẩm trước." onOpen={() => journey.go("PRODUCT_CARD")} />
        </div>
        {picker}
      </>
    )
  }

  const canWrite = session.can("I1")
  const canApprove = session.can("J5")
  const isDraft = c.latest?.status === "DRAFT"
  const items: MultichannelPostItem[] = c.posts.map((p) => ({
    channel: p.channel as MultichannelPostItem["channel"],
    channelLabel: channelLabel(p.channel),
    headline: view.product.name,
    bodyText: p.text,
    hashtags: [...p.hashtags],
  }))

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border/70 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="text-caption font-semibold text-text-muted">Sản phẩm đang làm</p>
          <p className="truncate text-title-sm font-bold text-text">{view.product.name}</p>
          <p className="text-caption text-text-muted">Bài viết dựa trên Thẻ sản phẩm, Bài giới thiệu và Thẻ chào đã duyệt.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setLibraryOpen(true)}>Đổi sản phẩm</Button>
      </div>

      <section aria-label="Chọn nền tảng" className="space-y-3">
        <p className="text-body font-semibold text-text">Viết cho nền tảng nào?</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {POST_CHANNELS.map((ch) => {
            const on = c.channels.includes(ch.id)
            return (
              <Tile key={ch.id} title={ch.label} tone={on ? "selected" : "default"} className="min-h-0"
                pill={<TilePill tone={on ? "primary" : "muted"}>{on ? "Đã chọn" : "Bấm để chọn"}</TilePill>}
                preview={ch.hint} onOpen={() => c.toggle(ch.id)} />
            )
          })}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CostPreview cost={costCreditForFeature("content.generate")} />
          <Button type="button" variant={c.latest ? "secondary" : "primary"} disabled={!canWrite || c.channels.length === 0 || Boolean(c.busy)} onClick={() => void c.write()}>
            {c.latest ? `Viết lượt mới cho ${c.channels.length} nền tảng` : `Viết bài cho ${c.channels.length} nền tảng`}
          </Button>
        </div>
        {!canWrite && <p className="text-caption text-warning-text">Bạn chưa có quyền viết bài — nhờ quản lý cửa hàng cấp quyền.</p>}
      </section>

      {c.error && <InlineError message={c.error} />}
      {c.notice && <p role="status" className="rounded-xl border border-success-border bg-success-bg px-4 py-3 text-body-sm text-success-text">{c.notice}</p>}
      {c.busy === "writing" && (
        <div aria-live="polite" className="space-y-2">
          <p className="text-body-sm font-semibold text-text">Đang lên ý tưởng, viết và tự chấm bài cho từng nền tảng — thường mất 20–60 giây…</p>
          <SkeletonBlock lines={6} label="Đang viết bài đăng" />
        </div>
      )}

      {c.latest && c.busy !== "writing" && items.length > 0 && (
        <section aria-label="Bài đăng vừa viết" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-body font-semibold text-text">
              {isDraft ? "Xem trước và sửa từng bài, rồi duyệt" : "Bài đã duyệt — lưu trong Kho"}
              {typeof c.latest.overall_score === "number" && <span className="ml-2 text-caption text-text-muted">Điểm tự chấm {Math.round(c.latest.overall_score)}/100</span>}
            </p>
            {/* Một nút chính: chờ duyệt → "Duyệt N bài"; đã duyệt → sang Bước 4 */}
            <Button
              type="button"
              disabled={isDraft && (!canApprove || Boolean(c.busy))}
              onClick={() => (isDraft ? void c.approve() : journey.go("AUTO_PUBLISH"))}
            >
              {isDraft ? (c.busy === "approving" ? "Đang duyệt…" : `Duyệt ${items.length} bài`) : <>Sang Bước 4 <ArrowRight size={14} aria-hidden /></>}
            </Button>
          </div>
          {isDraft && !canApprove && <p className="text-caption text-warning-text">Bạn chưa có quyền duyệt bài — nhờ quản lý cửa hàng duyệt giúp.</p>}
          <MultichannelPostCard
            key={c.latest.generation_id}
            posts={items}
            productName={view.product.name}
            productImageUrl={safeImageSrc(view.analysis?.image_url ?? null) ?? undefined}
            shopName={business?.display_name ?? undefined}
            {...(isDraft ? { onUpdatePost: (channel: string, u: Partial<MultichannelPostItem>) => c.edit(channel, {
              ...(u.bodyText !== undefined ? { text: u.bodyText } : {}),
              ...(u.hashtags !== undefined ? { hashtags: u.hashtags } : {}),
            }) } : {})}
          />
        </section>
      )}
      {picker}
    </div>
  )
}
