"use client"

import { Tile, TilePill } from "@/components/brand-kit/tiles/tile"
import { CalendarClock } from "@/components/ui/icon-set/calendar-clock"
import { Plug } from "@/components/ui/icon-set/plug"
import { Send } from "@/components/ui/icon-set/send"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import type { ContentJourney } from "./use-content-journey"

/**
 * Bước 3 và Bước 4 trong đợt đầu (PO 08/11/2026): hành trình mới đang hoàn thiện ở đợt sau (viết bài từ dữ liệu đã
 * duyệt; đăng tự động bằng module đăng bài riêng của SMEOS). Trong lúc đó các ô dẫn tới công cụ đang chạy, để user
 * không bị chặn — nói rõ là công cụ hiện có, không giả là đã xong.
 */
export function ChannelPostsStep({ journey }: { journey: ContentJourney }) {
  const name = journey.view?.product.name
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <Tile
        title="Viết bài đăng cho từng nền tảng"
        icon={Sparkles}
        pill={<TilePill tone="need">Đang hoàn thiện</TilePill>}
        preview={name
          ? `Sắp có: viết bài cho "${name}" ngay tại đây từ Thẻ sản phẩm, Bài giới thiệu và Thẻ chào đã duyệt.`
          : "Sắp có: viết bài cho từng nền tảng ngay tại đây từ dữ liệu đã duyệt trong Kho."}
      />
      <a href="/noi-dung" className="contents">
        <Tile
          title="Dùng công cụ viết bài hiện có"
          icon={Send}
          pill={<TilePill tone="muted">Công cụ hiện có</TilePill>}
          preview="Mở trình viết bài đa kênh đang chạy, chọn sản phẩm trong Kho để viết."
          footer="Mở trang Nội dung"
        />
      </a>
    </div>
  )
}

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
