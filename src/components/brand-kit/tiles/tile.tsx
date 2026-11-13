"use client"

import type { ComponentType, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Check } from "@/components/ui/icon-set/check"
import { cn } from "@/lib/utils"

type IconCmp = ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>

export type TilePillTone = "ok" | "need" | "muted" | "primary"

const PILL: Record<TilePillTone, string> = {
  ok: "bg-success-bg text-success-text",
  need: "bg-warning-bg text-warning-text",
  muted: "bg-surface-alt text-text-muted",
  primary: "bg-primary-muted text-primary",
}

export function TilePill({ tone, children }: { tone: TilePillTone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 self-start rounded-full px-2.5 py-0.5 text-caption font-bold", PILL[tone])}>
      {tone === "ok" && <Check size={12} aria-hidden />}
      {children}
    </span>
  )
}

export function TileIcon({ icon: Icon, small = false }: { icon: IconCmp; small?: boolean }) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center bg-primary-muted text-primary", small ? "h-11 w-11 rounded-xl" : "h-12 w-12 rounded-2xl sm:h-14 sm:w-14")}>
      <Icon size={small ? 20 : 26} aria-hidden />
    </div>
  )
}

interface TileProps {
  /** Tên ô — cũng là nhãn của nút phủ toàn ô khi có `onOpen` */
  title: string
  pill?: ReactNode
  icon?: IconCmp
  preview?: ReactNode
  /** Dòng chân trái và hành động chân phải (nút tải nằm trên lớp phủ nên bấm riêng được) */
  footer?: ReactNode
  footerAction?: ReactNode
  onOpen?: (() => void) | undefined
  tone?: "default" | "need" | "selected" | "add"
  className?: string
  children?: ReactNode
}

/**
 * Ô thống nhất của mục Thương hiệu trên /cong-cu (cùng ngôn ngữ thẻ với Trung tâm Tiếp thị): nhãn trạng thái,
 * ô icon, tên, xem trước, chân ô. Cả ô bấm được qua nút phủ (`after:absolute after:inset-0`), không dùng
 * `<div role="button">`.
 */
export function Tile({ title, pill, icon, preview, footer, footerAction, onOpen, tone = "default", className, children }: TileProps) {
  return (
    <div
      className={cn(
        "group relative flex min-h-40 flex-col rounded-2xl p-4 transition-all sm:p-5",
        tone === "add" ? "items-center justify-center border-2 border-dashed border-border text-center" : "bg-surface shadow-sm",
        tone === "default" && "ring-1 ring-border/70 hover:ring-primary",
        tone === "need" && "border-2 border-dashed border-warning-border",
        tone === "selected" && "ring-2 ring-primary shadow-md",
        className,
      )}
    >
      {pill}
      {icon && <div className={tone === "add" ? "" : "mt-3"}><TileIcon icon={icon} /></div>}
      <h3 className={cn("text-title-sm font-bold text-text", icon ? "mt-3" : "mt-2")}>
        {onOpen ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onOpen}
            className="h-auto gap-0 p-0 text-left font-[inherit] text-[length:inherit] hover:bg-transparent group-hover:text-primary after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary"
          >
            {title}
          </Button>
        ) : (
          title
        )}
      </h3>
      {preview && <div className="mt-1 text-body-sm text-text-muted">{preview}</div>}
      {children}
      {(footer || footerAction) && (
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-caption text-text-muted [&>*]:relative [&>*]:z-10">
          <span>{footer}</span>
          {footerAction}
        </div>
      )}
    </div>
  )
}
