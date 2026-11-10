"use client"

import React from "react"

/** Phần con của `florist-job-card.tsx` (giữ file chính dưới giới hạn 350 dòng): khung ảnh
 * mẫu có chú thích kích thước, và bảng các bước cắm tham khảo — cả hai chỉ hiện khi có
 * dữ liệu thật (`dimensions`/`assemblySteps` từ Product Master Index), không bịa số/quy trình. */

export function DimensionPhotoFrame({
  sampleImageUrl,
  alt,
  dimensions,
}: {
  sampleImageUrl?: string | null | undefined
  alt: string
  dimensions?: { heightCm: number; widthCm: number } | undefined
}) {
  return (
    <div className={dimensions ? "pr-3 pb-6" : undefined} style={{ position: "relative" }}>
      <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-[var(--avi-ink-08)] bg-[var(--avi-cream)]">
        {sampleImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sampleImageUrl} alt={alt} crossOrigin="anonymous" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[var(--avi-ink-muted)] text-caption">
            Chưa có ảnh mẫu
          </div>
        )}
      </div>
      {dimensions && (
        <>
          <div
            className="absolute flex flex-col items-center justify-center gap-1.5"
            style={{ right: 0, top: "14%", bottom: "20%" }}
          >
            <span className="w-px flex-1 bg-[var(--avi-primary)]" />
            <span className="text-caption font-bold text-[var(--avi-primary-dark)] bg-white border border-[var(--avi-ink-08)] rounded px-1.5 py-0.5 whitespace-nowrap" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
              Cao ~{dimensions.heightCm}cm
            </span>
            <span className="w-px flex-1 bg-[var(--avi-primary)]" />
          </div>
          <div className="absolute flex items-center gap-1.5" style={{ left: "10%", right: "10%", bottom: 0 }}>
            <span className="h-px flex-1 bg-[var(--avi-primary)]" />
            <span className="text-caption font-bold text-[var(--avi-primary-dark)] bg-white border border-[var(--avi-ink-08)] rounded px-1.5 py-0.5 whitespace-nowrap">
              Ngang ~{dimensions.widthCm}cm
            </span>
            <span className="h-px flex-1 bg-[var(--avi-primary)]" />
          </div>
        </>
      )}
    </div>
  )
}

export function AssemblyStepsPanel({ steps }: { steps: string[] }) {
  return (
    <div className="p-3 rounded-xl bg-[var(--avi-primary-05)] border border-[var(--avi-primary-15)]">
      <span className="text-caption font-bold text-[var(--avi-primary)] uppercase tracking-wide block mb-2">
        Cách cắm tham khảo
      </span>
      <ol className="flex flex-col gap-1.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-caption text-[var(--avi-ink)] leading-relaxed">
            <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-[var(--avi-gold)] text-[var(--avi-gold-text)] text-caption font-black flex items-center justify-center">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
