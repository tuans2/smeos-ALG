/** Gộp thông báo tin nhắn: tối đa một thông báo mỗi (phòng, tổ chức nhận) trong `windowMs` (IC-7.3). Pure TypeScript. */
export const CHAT_NOTIFY_WINDOW_MS = 5 * 60 * 1000
const MAX_KEYS = 5000

export class ChatNotifyThrottle {
  private readonly last = new Map<string, number>()

  constructor(private readonly windowMs = CHAT_NOTIFY_WINDOW_MS) {}

  /** true = được gửi bây giờ (và ghi nhận mốc); false = vừa gửi trong cửa sổ, bỏ qua. */
  take(key: string, nowMs: number): boolean {
    const prev = this.last.get(key)
    if (prev !== undefined && nowMs - prev < this.windowMs) return false
    if (this.last.size >= MAX_KEYS) this.last.clear() // giới hạn bộ nhớ — mất gộp tạm thời, không mất thông báo
    this.last.set(key, nowMs)
    return true
  }
}
