import { Disclosure } from "@/components/ui/disclosure"

/**
 * Hướng dẫn đăng ký mẫu tin Zalo ZNS cho Thẻ chào (nợ #173c). Zalo chỉ gửi đúng mẫu đã duyệt,
 * và tên tham số trong mẫu phải TRÙNG tên máy chủ gửi kèm — sai một chữ là tin bị từ chối.
 */
const PARAMS: Array<{ key: string; meaning: string }> = [
  { key: "order_code", meaning: "Mã đơn (DH…)" },
  { key: "customer_name", meaning: "Tên người đặt" },
  { key: "shop_name", meaning: "Tên tiệm" },
  { key: "status", meaning: "Mốc đơn (vd. Đã nhận đơn)" },
  { key: "amount", meaning: "Số tiền (đã thu, hoặc còn phải trả ở mốc báo giá / nhắc chuyển khoản)" },
  { key: "tracking_url", meaning: "Link theo dõi đơn của khách" },
]

export function ZnsTemplateGuide() {
  return (
    <Disclosure label="Hướng dẫn đăng ký mẫu tin với Zalo" className="text-body-sm">
      <ol className="my-2 flex list-decimal flex-col gap-1 pl-5 text-caption text-text-muted">
        <li>Vào trang quản lý ZNS của Zalo Official Account, tạo mẫu tin mới (loại giao dịch / chăm sóc khách).</li>
        <li>Trong nội dung mẫu, đặt đúng tên các tham số bên dưới — viết thường, có dấu gạch dưới.</li>
        <li>Gửi Zalo duyệt (thường 1–2 ngày làm việc). Mỗi mốc có thể dùng một mẫu riêng hoặc chung một mẫu.</li>
        <li>Duyệt xong, chép mã mẫu (template id) vào ô của mốc tương ứng ở mục &quot;Mã mẫu tin ZNS theo mốc&quot;, bấm Lưu rồi Gửi thử.</li>
      </ol>
      <table className="w-full text-left text-caption">
        <thead>
          <tr className="text-text-muted">
            <th className="py-1 pr-2">Tham số</th>
            <th className="py-1">Ý nghĩa</th>
          </tr>
        </thead>
        <tbody>
          {PARAMS.map((p) => (
            <tr key={p.key} className="border-t border-border">
              <td className="py-1 pr-2 font-mono text-text">{p.key}</td>
              <td className="py-1 text-text-muted">{p.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Disclosure>
  )
}
