/**
 * Vòng đời xoá asset (SDAGF P1, audit `docs/audit/sdagf-2026-10`).
 *
 * - Legal hold (D-04): còn hạn giữ thì không xoá vĩnh viễn, kể cả cron.
 * - Hàng đợi xoá payload thử lại có giới hạn rồi dừng — tệp sót lại do job
 *   đối soát xử lý, không lặp vô hạn.
 *
 * Thuần: không import hạ tầng.
 */
export const MAX_OUTBOX_ATTEMPTS = 5

export function isUnderLegalHold(asset: { legal_hold_until?: Date | null | undefined }, now: Date): boolean {
  return asset.legal_hold_until != null && asset.legal_hold_until.getTime() > now.getTime()
}

/**
 * Nơi đang dùng một asset theo id (SDAGF-012, audit lại 04/11/2026). Còn nơi
 * dùng thì không chuyển vào thùng rác, không xoá vĩnh viễn — kể cả cron dọn
 * rác — để không mất chứng từ thanh toán, ảnh sản phẩm, logo… (D-03).
 * Kết quả phân tích của chính ảnh (`product_analyses`) không tính là "đang dùng".
 */
export type AssetUsage =
  | "payment_proof"
  | "order_photo"
  | "product_image"
  | "brand"
  | "video"
  | "print"
  | "campaign"
  | "content"
  | "channel_usage"

const USAGE_LABEL: Readonly<Record<AssetUsage, string>> = {
  payment_proof: "chứng từ thanh toán",
  order_photo: "ảnh mẫu hoặc ảnh giao hàng của đơn",
  product_image: "ảnh sản phẩm",
  brand: "logo hoặc thư viện thương hiệu",
  video: "video",
  print: "bản in",
  campaign: "gói chiến dịch",
  content: "nội dung đã tạo",
  channel_usage: "bài đăng hoặc kênh bán đang chạy",
}

export function assetInUseMessage(usages: readonly AssetUsage[], subject = "Ảnh"): string {
  const labels = [...new Set(usages)].map((u) => USAGE_LABEL[u])
  const object = subject === "Ảnh" ? "ảnh" : "mục này"
  return `${subject} đang được dùng làm ${labels.join(", ")} nên chưa xoá được. Gỡ ${object} khỏi nơi đang dùng trước.`
}
