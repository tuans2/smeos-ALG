"use client"

import { Button } from "@/components/ui/button"
import { ALL_MOODS_SWATCH, type ColorMood } from "../aux/catalog-filters"
import type { SwipeTheme } from "./swipe-themes"

/**
 * Hàng chọn tông màu trên mẫu vuốt (ALG 5.9) — dùng chung dữ liệu màu với mẫu Bảng màu.
 * Chỉ hiện khi bộ sưu tập có từ hai tông trở lên.
 */
export function SwipeColorFilter({ moods, activeId, theme, onPick }: {
  moods: ColorMood[]
  activeId: string | null
  theme: SwipeTheme
  onPick: (id: string | null) => void
}) {
  if (moods.length < 2) return null
  return (
    <div className="-mx-3 flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]" role="group" aria-label="Lọc theo tông màu">
      {[{ id: null, label: "Tất cả", swatch: ALL_MOODS_SWATCH }, ...moods].map((m) => {
        const active = activeId === m.id
        return (
          <Button variant="ghost"
            key={m.id ?? "all"}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(m.id)}
            className="text-[length:inherit] h-9 shrink-0 gap-1.5 rounded-full border px-3 py-0 font-[inherit] text-caption"
            style={{
              borderColor: active ? theme.stageText : theme.controlBorder,
              background: active ? theme.controlBg : "transparent",
              color: active ? theme.stageText : theme.stageMuted,
              fontWeight: active ? 700 : 500,
            }}
          >
            <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: m.swatch }} aria-hidden="true" />
            {m.label}
          </Button>
        )
      })}
    </div>
  )
}
