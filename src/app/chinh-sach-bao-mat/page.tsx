import { getDictionary, translate } from "@/lib/i18n/server"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { isPrivacyNoticeEnabled } from "@/lib/privacy-notice"

export const metadata: Metadata = {
  title: "Chính sách bảo mật — Đặt hoa trực tuyến",
  robots: { index: false },
}

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Thông tin được thu thập",
    body: [
      "Khi bạn đặt hoa qua trang này, cửa hàng nhận: họ tên và số điện thoại của bạn; họ tên, số điện thoại và địa chỉ của người nhận; ngày giờ giao, lời nhắn thiệp và ghi chú bạn nhập.",
    ],
  },
  {
    title: "2. Mục đích sử dụng",
    body: [
      "Thông tin chỉ dùng để xác nhận đơn, thu tiền, gia công đơn hàng, giao nhận và báo tiến độ đơn cho bạn.",
      "Cửa hàng không dùng thông tin này để quảng cáo và không bán hay chia sẻ cho bên khác, trừ đơn vị giao hàng khi cần giao nhận.",
    ],
  },
  {
    title: "3. Thông tin của người nhận",
    body: [
      "Bạn xác nhận đã được người nhận đồng ý, hoặc có lý do chính đáng để cung cấp thông tin của họ cho việc giao hoa.",
    ],
  },
  {
    title: "4. Lưu trữ và bảo vệ",
    body: [
      "Thông tin được lưu trên hệ thống ALG mà cửa hàng sử dụng, chỉ nhân viên cửa hàng có thẩm quyền xem được, và được giữ trong thời gian cần cho việc giao hoa, đối soát và nghĩa vụ kế toán theo quy định.",
    ],
  },
  {
    title: "5. Quyền của bạn",
    body: [
      "Bạn có thể yêu cầu cửa hàng cho xem, sửa hoặc xoá thông tin của mình bằng cách liên hệ số điện thoại của cửa hàng trên trang đặt hoa.",
    ],
  },
]

/** Chính sách bảo mật mẫu chung ALG cho trang đặt hoa — chỉ mở khi bật cờ D13. */
export default function PrivacyPolicyPage() {
  const dict = getDictionary("vi")
  if (!isPrivacyNoticeEnabled()) notFound()
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-8 text-text">
      <h1 className="text-display font-bold">Chính sách bảo mật thông tin khách hàng</h1>
      {SECTIONS.map((s) => (
        <section key={s.title} className="flex flex-col gap-2">
          <h2 className="text-title-sm font-bold">{s.title}</h2>
          {s.body.map((p) => (
            <p key={p} className="text-body text-text-muted">
              {p}
            </p>
          ))}
        </section>
      ))}
    </main>
  )
}

export const dynamic = "force-dynamic"
