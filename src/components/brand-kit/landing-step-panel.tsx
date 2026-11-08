"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CostPreview } from "@/components/ui/cost-preview"
import { Disclosure } from "@/components/ui/disclosure"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { Globe } from "@/components/ui/icon-set/globe"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import type { BrandKitState } from "./use-brand-kit"
import { LandingOptionCard } from "./landing-option-card"
import { FirstOptionsCard } from "./first-options-card"

/** Bước 3 — Landing page chính thức: 3 phong cách dựng từ Hồ sơ + Bộ nhận diện; chọn = xuất bản (hỏi trước). */
export function LandingStepPanel({ kit }: { kit: BrandKitState }) {
  const [confirm, dialog] = useConfirmDialog()
  const view = kit.view!
  const l = view.landing
  const identity = view.identity.options.find((o) => o.selected)?.content ?? null
  const latest = l.options.filter((o) => o.is_latest_batch)
  const older = l.options.filter((o) => !o.is_latest_batch)
  const generating = kit.busy?.startsWith("landing:") && !kit.busy.includes(":select:")

  const select = async (id: string) => {
    const ok = await confirm({
      title: l.published_path ? "Đổi giao diện trang chính thức?" : "Xuất bản Landing page chính thức?",
      consequence: l.published_path
        ? "Trang giữ nguyên đường dẫn đã chia sẻ, chỉ đổi giao diện và nội dung theo phương án mới."
        : "Trang sẽ có đường dẫn công khai — ai có link hoặc mã QR đều xem được tên cửa hàng, thông tin liên hệ, sản phẩm chủ đạo và giá. Bạn có thể đổi phương án sau.",
      confirmLabel: l.published_path ? "Đổi giao diện" : "Xuất bản",
    })
    if (ok) await kit.select("landing", id)
  }

  if (l.options.length === 0) {
    return (
      <FirstOptionsCard
        icon={Globe}
        title="Tạo trang chính thức của cửa hàng"
        description="Trang giới thiệu như một website riêng, đồng bộ màu, logo và khẩu hiệu bạn đã chọn."
        busy={Boolean(kit.busy)}
        generating={Boolean(generating)}
        busyLabel="Đang dựng 3 phương án..."
        onGenerate={() => void kit.generate("landing", "initial")}
      >
        <ul className="flex flex-wrap justify-center gap-1.5 max-w-lg" aria-label="Cấu trúc trang">
          {l.sections.map((s) => <li key={s} className="rounded-full bg-surface-alt px-2.5 py-1 text-caption text-text">{s}</li>)}
        </ul>
      </FirstOptionsCard>
    )
  }

  return (
    <div className="space-y-6">
      {dialog}
      {l.published_path && (
        <section className="rounded-2xl bg-surface shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3" aria-labelledby="landing-live-title">
          <div className="min-w-0">
            <h2 id="landing-live-title" className="text-title-sm font-bold text-text">Trang chính thức đang hoạt động</h2>
            <p className="text-caption text-text-muted mt-1 truncate">Giờ mở cửa, ảnh, video và sản phẩm chủ đạo tự cập nhật theo Hồ sơ cửa hàng.</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <a href={l.published_path} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 min-h-11 px-4 rounded-lg bg-primary text-body-sm font-semibold text-surface hover:opacity-90">
              Mở trang <ExternalLink size={16} aria-hidden />
            </a>
            <Link href="/landing-page" className="inline-flex items-center min-h-11 px-4 rounded-lg text-body-sm font-semibold text-primary hover:bg-primary/10">Tạo trang chiến dịch</Link>
          </div>
        </section>
      )}

      {l.profile_changed && (
        <div role="status" className="rounded-2xl border border-warning-border bg-warning-bg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-body-sm text-warning-text">Hồ sơ hoặc Bộ nhận diện đã đổi sau lần tạo gần nhất.</p>
          {l.can_refresh && (
            <Button type="button" variant="outline" size="sm" className="gap-2 shrink-0" disabled={Boolean(kit.busy)} onClick={() => void kit.generate("landing", "refresh")}>
              <RefreshCw size={16} aria-hidden /> Tạo lại theo hồ sơ mới (miễn phí)
            </Button>
          )}
        </div>
      )}

      {kit.busy && <p role="status" className="text-body-sm text-text-muted">{generating ? "Đang dựng phương án..." : "Đang xuất bản trang..."}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {latest.map((o) => (
          <LandingOptionCard key={o.id} option={o} identity={identity} shopName={view.shop.name} busy={Boolean(kit.busy)} onSelect={(id) => void select(id)} />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2">
        <CostPreview cost={view.pricing.extra_option_credit} />
        <Button type="button" variant="outline" disabled={Boolean(kit.busy) || !l.can_add} onClick={() => void kit.generate("landing", "extra")}>
          Tạo thêm phương án
        </Button>
      </div>

      {older.length > 0 && (
        <Disclosure label={`Phương án trước (${older.length})`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-3">
            {older.map((o) => (
              <LandingOptionCard key={o.id} option={o} identity={identity} shopName={view.shop.name} busy={Boolean(kit.busy)} onSelect={(id) => void select(id)} />
            ))}
          </div>
        </Disclosure>
      )}
    </div>
  )
}
