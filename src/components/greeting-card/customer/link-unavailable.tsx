import { MessageCircle, Phone } from "@/components/ui/icons"
import type { ShopContact } from "@/modules/greeting-card/domain/shop-contact"
import { ShopContactBar } from "./shop-contact-bar"

/**
 * Link đã hết hạn, bị thu hồi hoặc bộ sưu tập đã ngừng — thay cho trang 404 chung,
 * để khách vẫn liên hệ được đúng cửa hàng thay vì bỏ đi. Cũng dùng khi link riêng đã được mở
 * trên thiết bị khác (`title`/`message` riêng). `action`: nút thử lại (vd. trình duyệt chặn cookie).
 */
export function LinkUnavailable({ shop, title, message, action }: {
  shop?: ShopContact | null; title?: string; message?: string; action?: { href: string; label: string }
}) {
  return (
    <div className="min-h-dvh bg-bg text-text">
      {shop && <ShopContactBar shop={shop} />}
      <main className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-16 text-center">
        <h1 className="text-title font-bold">{title ?? "Bộ sưu tập này không còn mở"}</h1>
        <p className="text-body text-text-muted">
          {message ?? (shop
            ? `Link có thể đã hết hạn hoặc cửa hàng đã cập nhật mẫu mới. Liên hệ ${shop.name} để nhận bộ sưu tập mới nhất.`
            : "Đường dẫn xem sản phẩm này không tồn tại hoặc đã hết thời gian sử dụng. Vui lòng liên hệ người gửi hoặc cửa hàng hoa để nhận link mới.")}
        </p>
        {action && (
          <a href={action.href} className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-body font-bold text-surface hover:bg-primary-dark">
            {action.label}
          </a>
        )}
        {shop && (
          <div className="mt-2 flex w-full flex-col gap-2">
            {shop.zaloUrl && (
              <a href={shop.zaloUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-body font-bold text-surface hover:bg-primary-dark">
                <MessageCircle size={18} aria-hidden="true" />
                Nhắn Zalo cho cửa hàng
              </a>
            )}
            {shop.phone && (
              <a href={`tel:${shop.phone}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border text-body font-bold text-text hover:bg-surface-alt">
                <Phone size={18} aria-hidden="true" />
                Gọi {shop.phone}
              </a>
            )}
            {shop.address && <p className="mt-2 text-body-sm text-text-muted">Địa chỉ: {shop.address}</p>}
          </div>
        )}
      </main>
    </div>
  )
}
