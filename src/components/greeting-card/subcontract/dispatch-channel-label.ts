/** Tên kênh gửi lời mời gia công hiển thị cho người dùng — không hiện mã kỹ thuật */
const CHANNEL_LABEL: Record<string, string> = { TELEGRAM: "Telegram", ZALO: "Zalo", APP: "Trang cửa hàng" }

export function dispatchChannelLabel(channel: string): string {
  return CHANNEL_LABEL[channel] ?? channel
}

/** Chi nhánh không có Telegram / Zalo vẫn thấy lời mời trên trang cửa hàng — không phải lỗi gửi */
export function dispatchFailureText(channel: string, error?: string): string {
  return channel === "APP" ? "Chỉ hiện trên trang cửa hàng" : error || "Không gửi được"
}
