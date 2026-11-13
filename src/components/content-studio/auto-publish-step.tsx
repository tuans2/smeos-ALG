"use client"

import { useState } from "react"
import { Tile, TilePill } from "@/components/brand-kit/tiles/tile"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { CalendarClock } from "@/components/ui/icon-set/calendar-clock"
import { Clock } from "@/components/ui/icon-set/clock"
import { Library } from "@/components/ui/icon-set/library"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Zap } from "@/components/ui/icon-set/zap"
import { InlineError } from "@/components/ui/inline-error"
import { Input } from "@/components/ui/input"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useSession } from "@/lib/session"
import { LibraryPickerDialog } from "./library-picker-dialog"
import type { PublishMode } from "./publish-api"
import { PublishChannelTiles } from "./publish-channel-tiles"
import { PublishQueue } from "./publish-queue"
import { useAutoPublish } from "./use-auto-publish"
import type { ContentJourney } from "./use-content-journey"

const MODES: ReadonlyArray<{ id: PublishMode; title: string; hint: string; icon: typeof Zap }> = [
  { id: "AUTO", title: "Tự lên lịch", hint: "Hệ thống chọn khung giờ khách hay xem (11:30 hoặc 20:00), giãn các bài 10 phút.", icon: Sparkles },
  { id: "NOW", title: "Đăng ngay", hint: "Bài lên trong vài phút tới.", icon: Zap },
  { id: "AT", title: "Chọn giờ", hint: "Hẹn đúng ngày giờ bạn muốn (trong 60 ngày tới).", icon: Clock },
]

/**
 * Bước 4 — Đăng tự động (PO 08/11/2026): chọn kênh đã kết nối (chưa kết nối thì kết nối ngay trong ô), chọn khi nào
 * đăng, bấm một nút; hệ thống tự đăng qua API chính thức của từng nền tảng và tự thử lại khi nền tảng tạm lỗi.
 * Đi tiếp từ Bước 3 → dùng bài vừa duyệt; vào thẳng → chọn sản phẩm có bài đã duyệt trong Kho.
 */
export function AutoPublishStep({ journey }: { journey: ContentJourney }) {
  const session = useSession()
  const p = useAutoPublish(journey)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const canPublish = session.can("J5")
  const picker = (
    <LibraryPickerDialog open={libraryOpen} require="posts" title="Chọn sản phẩm có bài để đăng" onClose={() => setLibraryOpen(false)}
      onPick={(id) => journey.setProduct(id, "AUTO_PUBLISH")} />
  )

  if (!p.source) {
    return (
      <>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <Tile title="Chọn bài có sẵn trong Kho" icon={Library} pill={<TilePill tone="muted">Dữ liệu có sẵn</TilePill>}
            preview="Sản phẩm đã có bài đăng được duyệt ở Bước 3." onOpen={() => setLibraryOpen(true)} />
          <Tile title={journey.view ? "Viết và duyệt bài ở Bước 3" : "Bắt đầu từ ảnh mới"} icon={CalendarClock} pill={<TilePill tone="muted">{journey.view ? "Bước 3" : "Bước 1"}</TilePill>}
            preview={journey.view ? "Sản phẩm đang làm chưa có bài đã duyệt." : "Tải ảnh sản phẩm để tạo nội dung từ đầu."}
            onOpen={() => journey.go(journey.view ? "CHANNEL_POSTS" : "PRODUCT_CARD")} />
        </div>
        {picker}
      </>
    )
  }

  const count = p.selected.length
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border/70 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="text-caption font-semibold text-text-muted">Bài sẽ đăng</p>
          <p className="truncate text-title-sm font-bold text-text">{journey.view?.product.name}</p>
          <p className="text-caption text-text-muted">{p.approvedChannels.length} bài đã duyệt ở Bước 3 · ảnh lấy từ Kho sản phẩm</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setLibraryOpen(true)}>Đổi sản phẩm</Button>
      </div>

      {p.error && <InlineError message={p.error} />}
      {p.notice && <p role="status" className="rounded-xl border border-success-border bg-success-bg px-4 py-3 text-body-sm text-success-text">{p.notice}</p>}

      <section aria-label="Kênh đăng" className="space-y-3">
        <p className="text-body font-semibold text-text">Đăng lên đâu?</p>
        {p.channels === null
          ? <SkeletonBlock lines={2} label="Đang tải trạng thái kênh" />
          : <PublishChannelTiles channels={p.channels} approvedChannels={p.approvedChannels} selected={p.selected} onToggle={p.toggle} onConnect={(ch) => void p.connect(ch)} busy={Boolean(p.busy)} />}
      </section>

      <section aria-label="Thời gian đăng" className="space-y-3">
        <p className="text-body font-semibold text-text">Khi nào đăng?</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {MODES.map((m) => (
            <Tile key={m.id} title={m.title} icon={m.icon} className="min-h-0" tone={p.mode === m.id ? "selected" : "default"}
              pill={<TilePill tone={p.mode === m.id ? "primary" : "muted"}>{p.mode === m.id ? "Đang chọn" : "Bấm để chọn"}</TilePill>}
              preview={m.hint} onOpen={() => p.setMode(m.id)} />
          ))}
        </div>
        {p.mode === "AT" && (
          <label className="flex max-w-xs flex-col gap-1 text-caption font-semibold text-text-muted">
            Ngày giờ đăng
            <Input type="datetime-local" value={p.at} onChange={(e) => p.setAt(e.target.value)} />
          </label>
        )}
      </section>

      <div className="flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption text-text-muted">
          {count === 0 ? "Chọn ít nhất một kênh sẵn sàng." : `${count} bài · mỗi kênh một bài, bấm hai lần cũng không đăng trùng.`}
        </p>
        <Button type="button" disabled={!canPublish || count === 0 || Boolean(p.busy)} onClick={() => void p.publish()}>
          {p.busy === "publish" ? "Đang gửi…" : count === 0 ? (p.mode === "NOW" ? "Đăng bài" : "Lên lịch đăng") : p.mode === "NOW" ? `Đăng ${count} bài` : `Lên lịch ${count} bài`}
        </Button>
      </div>
      {!canPublish && <p className="text-caption text-warning-text">Bạn chưa có quyền đăng bài — nhờ quản lý cửa hàng cấp quyền.</p>}

      <PublishQueue posts={p.queue} busy={Boolean(p.busy)} canManage={canPublish} onCancel={(id) => void p.cancel(id)} onRetry={(id) => void p.retry(id)} onReload={p.reloadQueue} />

      <Dialog open={p.pages.length > 0} onOpenChange={(open) => { if (!open) p.dismissPages() }} title="Chọn Trang Facebook để đăng bài"
        description="Tài khoản của bạn quản lý nhiều Trang. Instagram gắn với Trang sẽ được kết nối cùng.">
        <ul className="space-y-2">
          {p.pages.map((pg) => (
            <li key={pg.id}>
              <Button type="button" variant="secondary" className="w-full justify-between" disabled={Boolean(p.busy)} onClick={() => void p.choosePage(pg.id)}>
                <span>{pg.name}</span>
                {pg.has_instagram && <span className="text-caption text-text-muted">+ Instagram</span>}
              </Button>
            </li>
          ))}
        </ul>
      </Dialog>
      {picker}
    </div>
  )
}
