"use client"

/**
 * Chọn PHẠM VI SẢN XUẤT (PO 24/09/2026) — cuối Chặng 04 và đầu Chặng 05.
 *
 * - Nền tảng đăng: mặc định TikTok + Reels (9:16) mỗi lần mở; "Tất cả" = mọi nền tảng.
 * - Loại kết quả: content / audio / hình ảnh / video; mặc định cả 4.
 * - Mỗi khung hình khác nhau sinh một bộ ảnh + một video riêng (credit × số khung).
 * - Chọn video tự kéo theo hình ảnh + âm thanh (video cần chúng).
 * - Luôn ít nhất một mục ở mỗi nhóm.
 */

import React from "react"
import { Button } from "@/components/ui/button"
import {
  ALL,
  DEFAULT_PLATFORMS,
  PLATFORM_SPECS,
  PRODUCTION_OUTPUTS,
  PUBLISH_PLATFORMS,
  resolvePublishing,
  type ProductionOutput,
  type PublishPlatform,
} from "@/modules/creative-production/domain/publishing-rules"

export interface ProductionScope {
  platforms: PublishPlatform[] | typeof ALL
  outputs: ProductionOutput[] | typeof ALL
}

export const DEFAULT_PRODUCTION_SCOPE: ProductionScope = {
  platforms: [...DEFAULT_PLATFORMS],
  outputs: ALL,
}

export const OUTPUT_LABELS: Record<ProductionOutput, string> = {
  content: "Nội dung bài đăng",
  audio: "Âm thanh",
  image: "Hình ảnh",
  video: "Video",
}

function toggle<T extends string>(current: T[] | typeof ALL, all: readonly T[], item: T): T[] | typeof ALL {
  const list = current === ALL ? [...all] : current
  const next = list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
  if (next.length === 0) return list // luôn giữ ít nhất một mục
  return next.length === all.length ? ALL : next
}

export function ProductionScopePicker({
  value,
  onChange,
  compact = false,
}: {
  value: ProductionScope
  onChange: (next: ProductionScope) => void
  compact?: boolean
}) {
  const pub = resolvePublishing(value.platforms, value.outputs)
  const chip = (on: boolean, derived = false) =>
    `rounded-full border px-2.5 py-1 text-caption font-semibold transition ${
      on
        ? "border-primary bg-primary/10 text-primary"
        : derived
          ? "border-dashed border-warning/30 bg-warning/10 text-warning-text"
          : "border-border bg-surface text-text-muted hover:bg-surface-alt"
    }`

  return (
    <div className={compact ? "space-y-2.5" : "space-y-3 rounded-xl border border-border bg-surface p-4"}>
      {!compact && (
        <div>
          <p className="text-meta font-bold text-text">Phạm vi sản xuất</p>
          <p className="text-caption text-text-muted">
            Hệ thống chỉ sinh đúng những gì bạn chọn. Chọn &ldquo;Tất cả&rdquo; để sản xuất cho mọi nền tảng.
          </p>
        </div>
      )}

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-caption font-bold uppercase tracking-wider text-text">Nền tảng sẽ đăng</span>
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => onChange({ ...value, platforms: [...DEFAULT_PLATFORMS] })}
              className="text-caption font-semibold text-text-muted hover:text-primary"
            >
              Mặc định
            </Button>
            <Button
              type="button"
              size="xs"
              variant={value.platforms === ALL ? "primary" : "outline"}
              onClick={() => onChange({ ...value, platforms: ALL })}
              className="rounded-full"
            >
              Tất cả
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PUBLISH_PLATFORMS.map((p) => (
            <Button
              key={p}
              type="button"
              size="xs"
              variant={pub.platforms.includes(p) ? "primary" : "outline"}
              aria-pressed={pub.platforms.includes(p)}
              onClick={() => onChange({ ...value, platforms: toggle(value.platforms, PUBLISH_PLATFORMS, p) })}
              className="rounded-full"
            >
              {PLATFORM_SPECS[p].label} · {PLATFORM_SPECS[p].ratio}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-caption font-bold uppercase tracking-wider text-text">Loại kết quả</span>
          <Button
            type="button"
            size="xs"
            variant={value.outputs === ALL ? "primary" : "outline"}
            onClick={() => onChange({ ...value, outputs: ALL })}
            className="rounded-full"
          >
            Tất cả
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRODUCTION_OUTPUTS.map((o) => {
            const chosen = pub.outputs.includes(o)
            const derived = !chosen && pub.derivedOutputs.includes(o)
            return (
              <Button
                key={o}
                type="button"
                size="xs"
                variant={chosen ? "primary" : derived ? "warning" : "outline"}
                aria-pressed={chosen}
                title={derived ? "Tự thêm vì video cần" : undefined}
                onClick={() => onChange({ ...value, outputs: toggle(value.outputs, PRODUCTION_OUTPUTS, o) })}
                className="rounded-full"
              >
                {OUTPUT_LABELS[o]}
                {derived ? " · cần cho video" : ""}
              </Button>
            )
          })}
        </div>
      </div>

      <p className="text-caption leading-relaxed text-text-muted">
        Sẽ sản xuất: <b>{pub.produce.map((o) => OUTPUT_LABELS[o]).join(", ")}</b>
        {pub.produce.includes("image") || pub.produce.includes("video") ? (
          <>
            {" "}· khung <b>{pub.ratios.join(", ")}</b>
            {pub.ratios.length > 1 && ` (mỗi khung một bộ ảnh${pub.produce.includes("video") ? " + một video" : ""} — credit ảnh/video × ${pub.ratios.length})`}
          </>
        ) : null}
        {pub.produce.includes("video") && (
          <>
            {" "}· {pub.videoVariants.length} video (
            {pub.videoVariants.map((v) => `${v.ratio} ~${v.targetSeconds}s`).join(", ")})
          </>
        )}
        {pub.produce.includes("content") && pub.postChannels.length > 0 && <> · bài đăng cho {pub.postChannels.join(", ")}</>}
        .
      </p>
    </div>
  )
}
