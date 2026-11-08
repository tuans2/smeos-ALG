"use client"

import type { ComponentType, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { CostPreview } from "@/components/ui/cost-preview"

interface FirstOptionsCardProps {
  icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>
  title: string
  description: string
  busy: boolean
  generating: boolean
  busyLabel: string
  onGenerate: () => void
  children?: ReactNode
}

/** Trạng thái chưa có phương án của Bước 2/3: một nút chính "Tạo 3 phương án" (miễn phí). */
export function FirstOptionsCard({ icon: Icon, title, description, busy, generating, busyLabel, onGenerate, children }: FirstOptionsCardProps) {
  return (
    <section className="rounded-2xl bg-surface shadow-sm p-6 sm:p-8 flex flex-col items-center text-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-muted text-primary"><Icon size={32} aria-hidden /></div>
      <div>
        <h2 className="text-title font-bold text-text">{title}</h2>
        <p className="text-body-sm text-text-muted mt-1 max-w-md">{description}</p>
      </div>
      {children}
      <Button type="button" disabled={busy} onClick={onGenerate}>{generating ? busyLabel : "Tạo 3 phương án"}</Button>
      <CostPreview cost={0} />
    </section>
  )
}
