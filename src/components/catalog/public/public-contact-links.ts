/** Link liên hệ cấp cửa hàng cho trang công khai — chỉ dựng khi tiệm có số điện thoại thật. */

export function shopPhoneDigits(phone: string | null | undefined): string {
  return phone ? phone.replace(/[^0-9]/g, "") : ""
}

export function shopZaloUrl(shopName: string, phone: string | null | undefined, topic: string): string | null {
  const digits = shopPhoneDigits(phone)
  if (!digits) return null
  const text = encodeURIComponent(`Chào ${shopName}, tôi muốn được tư vấn mẫu trong "${topic}".`)
  return `https://zalo.me/${digits}?text=${text}`
}

export function shopCallUrl(phone: string | null | undefined): string | null {
  const digits = shopPhoneDigits(phone)
  return digits ? `tel:${digits}` : null
}
