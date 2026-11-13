import React from "react"
import { UserRound } from "@/components/ui/icons"

/**
 * Hướng dẫn thêm chủ cửa hàng để nhận lời mời gia công NHẮN RIÊNG 1:1 (không qua nhóm).
 * Bot không được nhắn trước cho một người: chủ cửa hàng phải bấm Start và gửi mã liên kết một lần.
 */
export function TelegramDirectChatGuide({ botUsername, linkCode }: { botUsername: string; linkCode: string | null }) {
  const code = "font-mono bg-surface px-1 py-0.5 rounded border border-border"
  return (
    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col gap-2.5">
      <h4 className="text-body-sm font-bold text-text flex items-center gap-1.5">
        <UserRound size={16} className="text-primary" /> Nhắn riêng cho từng cửa hàng (khuyên dùng)
      </h4>
      <p className="text-caption text-text-muted leading-relaxed">
        Mỗi đơn, hệ thống chọn 3–5 cửa hàng phù hợp và gửi lời mời riêng vào Telegram của từng chủ cửa hàng. Mỗi cửa hàng chỉ cần thiết lập một lần:
      </p>
      <ol className="text-caption text-text/90 space-y-1.5 list-decimal pl-4 leading-relaxed">
        <li>
          Chủ cửa hàng mở Telegram, tìm <strong className="text-primary font-mono">@{botUsername}</strong> và bấm <strong>Start</strong>.
        </li>
        <li>
          Trong khung chat riêng với bot, gửi mã <code className={code}>{linkCode ?? "…"}</code>. Nên làm trong ngày bạn quét ở bước 3 — bot chỉ đọc được tin trong khoảng 24 giờ.
        </li>
        <li>
          Bấm <strong>&quot;Quét Chat ID mới&quot;</strong>. Chủ cửa hàng hiện bên dưới bằng tên Telegram của họ, kèm một dãy số <strong>không có dấu trừ</strong>. Bấm <strong>Chọn</strong> rồi <strong>Gửi thử</strong> để chắc họ nhận được.
        </li>
        <li>
          Vào <strong>Nhập từ Excel &amp; Ảnh</strong> → phần chi nhánh, điền dãy số đó vào cột <strong>&quot;Telegram ID riêng / Nhóm&quot;</strong> đúng dòng cửa hàng của họ, rồi nhập lại file.
        </li>
      </ol>
      <p className="text-caption text-text-muted leading-relaxed">
        Dãy số bắt đầu bằng dấu trừ là của nhóm. Nếu nhiều cửa hàng điền cùng một số nhóm, cả nhóm sẽ nhận nhiều tin giống nhau.
      </p>
    </div>
  )
}
