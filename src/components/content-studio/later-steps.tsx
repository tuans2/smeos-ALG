"use client"

import { Tile, TilePill } from "@/components/brand-kit/tiles/tile"
import { CalendarClock } from "@/components/ui/icon-set/calendar-clock"
import { Plug } from "@/components/ui/icon-set/plug"

/**
 * Bước 4 trong lúc chờ module đăng bài riêng của SMEOS (PO 08/11/2026, đợt sau — API chính thức của từng nền tảng):
 * ô "Đang hoàn thiện" + ô dẫn tới lịch đăng đang chạy, để user không bị chặn — nói rõ là công cụ hiện có.
 */
export function AutoPublishStep() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <Tile
        title="Đăng tự động lên các kênh"
        icon={Plug}
        pill={<TilePill tone="need">Đang hoàn thiện</TilePill>}
        preview="Sắp có: kết nối Facebook, Instagram, Zalo… một lần, chọn bài trong Kho và để hệ thống tự lên lịch đăng."
      />
      <a href="/lich-dang" className="contents">
        <Tile
          title="Dùng lịch đăng hiện có"
          icon={CalendarClock}
          pill={<TilePill tone="muted">Công cụ hiện có</TilePill>}
          preview="Mở lịch đăng đang chạy để lên lịch các bài đã viết."
          footer="Mở trang Lịch đăng"
        />
      </a>
    </div>
  )
}
