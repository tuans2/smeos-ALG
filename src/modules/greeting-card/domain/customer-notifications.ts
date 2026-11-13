/**
 * Thông báo khách theo mốc đơn Thẻ chào (Zalo ZNS / SMS). Pure TypeScript.
 */

export const NOTIFY_EVENTS = ["ORDER_RECEIVED", "ORDER_ACCEPTED", "QUOTED", "PAYMENT_REMINDER", "DEPOSIT_RECEIVED", "PAYMENT_COMPLETED", "SUBSTITUTE_PROPOSED", "READY", "DISPATCHED", "DELIVERY_FAILED", "DELIVERED", "CANCELLED"] as const
export type NotifyEvent = (typeof NOTIFY_EVENTS)[number]

export const NOTIFY_EVENT_LABELS: Record<NotifyEvent, string> = {
  ORDER_RECEIVED: "Đã nhận đơn",
  ORDER_ACCEPTED: "Đã xác nhận nhận đơn",
  QUOTED: "Đã báo giá",
  PAYMENT_REMINDER: "Nhắc chuyển khoản",
  DEPOSIT_RECEIVED: "Đã nhận tiền cọc",
  PAYMENT_COMPLETED: "Đã thanh toán đủ",
  SUBSTITUTE_PROPOSED: "Tiệm đề xuất mẫu thay thế",
  READY: "Hoa đã cắm xong",
  DISPATCHED: "Đang giao hoa",
  DELIVERY_FAILED: "Giao hoa chưa thành công",
  DELIVERED: "Giao hoa thành công",
  CANCELLED: "Đơn bị huỷ",
}

export type NotifyChannel = "ZNS" | "ESMS"

/** Tham số gửi kèm mẫu tin — tên khoá trùng với tham số khai trong mẫu ZNS đã duyệt. */
export interface NotifyParams {
  order_code: string
  customer_name: string
  shop_name: string
  status: string
  amount: string
  tracking_url: string
}

/** `0912345678` / `+84912345678` → `84912345678` (định dạng ZNS & eSMS). `null` nếu không phải số VN. */
export function toInternationalPhone(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "")
  if (/^0[35789]\d{8}$/.test(digits)) return `84${digits.slice(1)}`
  if (/^84[35789]\d{8}$/.test(digits)) return digits
  return null
}

/** Che SĐT khi lưu nhật ký: 84912***678. */
export function maskPhone(phone: string): string {
  return phone.length > 6 ? `${phone.slice(0, 5)}***${phone.slice(-3)}` : "***"
}

function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
}

/**
 * Nội dung SMS (không dấu — tin brandname có dấu tính gấp đôi phí và dễ lỗi
 * mã hoá). Giữ dưới 160 ký tự khi có thể.
 */
export function smsText(event: NotifyEvent, p: NotifyParams, options?: { isBalanceDue?: boolean; skippedPhoto?: boolean }): string {
  const readyText = options?.skippedPhoto
    ? options?.isBalanceDue
      ? `${p.shop_name}: Hoa don ${p.order_code} da hoan thanh. Mo link thanh toan ${p.amount} con lai de giao hoa.`
      : `${p.shop_name}: Hoa don ${p.order_code} da hoan thanh, chuan bi giao.`
    : options?.isBalanceDue
    ? `${p.shop_name}: Hoa don ${p.order_code} da cam xong. Mo link xem anh va thanh toan ${p.amount} con lai de giao hoa.`
    : `${p.shop_name}: Hoa don ${p.order_code} da cam xong, chuan bi giao.`
  const deliveredText = options?.isBalanceDue
    ? `${p.shop_name}: Don ${p.order_code} da giao thanh cong. Vui long mo link thanh toan ${p.amount} con lai. Cam on quy khach!`
    : `${p.shop_name}: Don ${p.order_code} da giao thanh cong. Cam on quy khach!`

  const body: Record<NotifyEvent, string> = {
    ORDER_RECEIVED: `${p.shop_name}: Da nhan don ${p.order_code}. Cua hang se bao khi nhan duoc thanh toan va khi hoa duoc giao.`,
    ORDER_ACCEPTED: `${p.shop_name}: Da xac nhan nhan don ${p.order_code}. Xuong hoa da tiep nhan va dang chuan bi cam hoa.`,
    QUOTED: `${p.shop_name}: Don ${p.order_code} da co gia ${p.amount}. Mo link de xem ma QR thanh toan.`,
    PAYMENT_REMINDER: `${p.shop_name}: Don ${p.order_code} dang cho chuyen khoan ${p.amount}. Mo link de xem ma QR.`,
    DEPOSIT_RECEIVED: `${p.shop_name}: Chuyen khoan thanh cong! Da nhan tien coc ${p.amount} cho don ${p.order_code}. Cua hang se xac nhan don va bat dau chuan bi trong vong 30' (hoan tien neu khong the phuc vu).`,
    PAYMENT_COMPLETED: `${p.shop_name}: Chuyen khoan thanh cong! Da nhan du ${p.amount} cho don ${p.order_code}. Cua hang se xac nhan don va bat dau chuan bi trong vong 30' (hoan tien neu khong the phuc vu).`,
    SUBSTITUTE_PROPOSED: `${p.shop_name}: Mau hoa don ${p.order_code} tam thoi khong lam duoc. Mo link de chon mau thay the hoac phan hoi cua hang.`,
    READY: readyText,
    DISPATCHED: `${p.shop_name}: Don ${p.order_code} dang duoc giao den nguoi nhan.`,
    DELIVERY_FAILED: `${p.shop_name}: Don ${p.order_code} chua giao duoc. Cua hang se lien he hen giao lai, hoac mo link de doi gio/dia chi giao.`,
    DELIVERED: deliveredText,
    CANCELLED: `${p.shop_name}: Don ${p.order_code} da duoc huy. Lien he cua hang neu can ho tro.`,
  }
  const link = p.tracking_url ? ` Theo doi: ${p.tracking_url}` : ""
  return stripDiacritics(body[event] + link).slice(0, 306)
}

/** Mốc thanh toán: lần thu chưa đủ → DEPOSIT_RECEIVED, thu đủ → PAYMENT_COMPLETED. */
export function paymentNotifyEvent(balanceAfterVnd: number): NotifyEvent {
  return balanceAfterVnd > 0 ? "DEPOSIT_RECEIVED" : "PAYMENT_COMPLETED"
}

/**
 * Tin soạn sẵn báo khách "cửa hàng đã nhận tiền" — Điều hành/Sale chép gửi qua Zalo khi tiệm chưa
 * bật Zalo ZNS/SMS (PO 08/10/2026). Có dấu (gửi tay qua Zalo, không tính phí SMS).
 */
export function customerPaymentMessage(p: { orderCode: string; amountVnd: number; balanceVnd: number; trackingUrl: string | null }): string {
  const money = (n: number) => `${n.toLocaleString("vi-VN")} đ`
  const head = p.balanceVnd > 0
    ? `Cửa hàng xác nhận: Chuyển khoản thành công! Đã nhận ${money(p.amountVnd)} (tiền cọc) cho đơn hoa ${p.orderCode}, còn ${money(p.balanceVnd)}.`
    : `Cửa hàng xác nhận: Chuyển khoản thành công! Đã nhận đủ ${money(p.amountVnd)} cho đơn hoa ${p.orderCode}.`
  const confirmText = `Cửa hàng sẽ xác nhận đơn và bắt đầu chuẩn bị trong vòng 30 phút (hoàn tiền nếu không thể phục vụ).`
  return p.trackingUrl ? `${head} ${confirmText} Theo dõi tiến độ tại: ${p.trackingUrl}` : `${head} ${confirmText}`
}

/**
 * Tin soạn sẵn báo khách "cửa hàng đã xác nhận nhận đơn" — Điều phối/Sale chép gửi qua Zalo.
 */
export function customerOrderAcceptedMessage(p: {
  orderCode: string
  trackingUrl: string | null
  sampleProductTerm?: string
  makerActionTerm?: string
  completedPhotoTerm?: string
}): string {
  const item = (p.sampleProductTerm || "sản phẩm").replace(/ chuẩn$/i, "").toLowerCase()
  const makerAction = p.makerActionTerm ? p.makerActionTerm.toLowerCase() : "chế tác"
  const photoText = p.completedPhotoTerm ? p.completedPhotoTerm.toLowerCase() : "ảnh thực tế"
  const head = `Cửa hàng thông báo: Đã xác nhận nhận đơn ${p.orderCode}! Xưởng đã tiếp nhận đơn và đang chuẩn bị ${item}.`
  return p.trackingUrl ? `${head} Theo dõi tiến độ đơn hàng và ${photoText} tại: ${p.trackingUrl}` : head
}

/**
 * Tin soạn sẵn báo khách khi đã tải ảnh chuyển khoản và chờ xác nhận (SLA 15 phút).
 */
export function customerPaymentProofReportedMessage(p: { orderCode: string; trackingUrl: string | null }): string {
  const head = `Cửa hàng đã nhận ảnh chuyển khoản cho đơn ${p.orderCode}. Thời gian xác nhận chuyển khoản sẽ trong vòng 15’.`
  return p.trackingUrl ? `${head} Theo dõi tiến độ tại: ${p.trackingUrl}` : head
}

/**
 * Tin soạn sẵn Sale nhắn khách duyệt ảnh thành phẩm và thanh toán lần 2 (đơn đặt cọc).
 * Có dấu (chép gửi nhanh qua Zalo, không tính phí SMS).
 */
export function customerSecondPaymentReminderMessage(p: {
  orderCode: string
  balanceVnd: number
  trackingUrl: string | null
  skippedPhoto?: boolean
  sampleProductTerm?: string
  makerActionTerm?: string
  completedPhotoTerm?: string
  deliveryActionTerm?: string
}): string {
  const money = `${p.balanceVnd.toLocaleString("vi-VN")} đ`
  const item = (p.sampleProductTerm || "sản phẩm").replace(/ chuẩn$/i, "").toLowerCase()
  const makerAction = p.makerActionTerm ? `${p.makerActionTerm.toLowerCase()} hoàn tất` : "hoàn tất"
  const photoText = p.completedPhotoTerm ? p.completedPhotoTerm.toLowerCase() : "ảnh thực tế"
  const deliveryAction = p.deliveryActionTerm || "tiến hành giao hàng"

  const head = p.skippedPhoto
    ? `Dạ chào anh/chị, ${item} cho đơn ${p.orderCode} đã hoàn thành và đang chuẩn bị giao gấp ạ!`
    : `Dạ chào anh/chị, ${item} cho đơn ${p.orderCode} đã ${makerAction} ạ!`
  const body = p.skippedPhoto
    ? `Anh/chị mở link thanh toán số tiền còn lại là ${money} để cửa hàng ${deliveryAction} nhé ạ:`
    : `Anh/chị mở link kiểm tra ${photoText} và thanh toán số tiền còn lại là ${money} để cửa hàng ${deliveryAction} nhé ạ:`
  return p.trackingUrl ? `${head} ${body} ${p.trackingUrl}` : `${head} ${body}`
}

