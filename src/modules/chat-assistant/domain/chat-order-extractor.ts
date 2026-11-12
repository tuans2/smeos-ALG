/**
 * Chat Order Extractor & Checkout Generator (DH-03, DH-04).
 * Thuần logic, bóc tách cấu trúc đơn hàng từ lịch sử trò chuyện và sinh dữ liệu thanh toán VietQR Napas 247.
 */

import { extractBudgetFromQuery, extractOccasionFromQuery } from "./flower-consultant-rules"

export interface ChatOrderDraft {
  recipientName: string | null
  recipientPhone: string | null
  deliveryAddress: string | null
  deliveryTime: string | null
  occasion: string | null
  cardMessage: string | null
  flowerStyleOrTone: string | null
  budgetVnd: number | null
  productId?: string | null
  productName?: string | null
}

export interface ChatOrderValidationResult {
  isReadyForCheckout: boolean
  confidenceScore: number // 0 - 100
  missingFields: string[]
  completedFields: string[]
}

export interface ChatOrderCheckoutPayload {
  orderCode: string
  recipientName: string
  recipientPhone: string
  deliveryAddress: string
  deliveryTime: string
  cardMessage: string
  productName: string
  totalVnd: number
  vietqrPayload: {
    bankCode: string
    accountNumber: string
    accountName: string
    amount: number
    orderCode: string
    paymentTransferCode: string
    qrQuickLink: string
  }
}

/**
 * Trích xuất số điện thoại Việt Nam từ văn bản
 */
export function extractVietnamesePhone(text: string): string | null {
  // Tìm dạng 0901234567, 090 123 4567, +84901234567, 03, 05, 07, 08, 09
  const phoneRegex = /(?:\+84|0)(?:3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[\s.-]?\d{3}[\s.-]?\d{4}\b/
  const match = text.match(phoneRegex)
  if (match) {
    return match[0].replace(/[\s.-]/g, "").replace(/^\+84/, "0")
  }
  return null
}

/**
 * Trích xuất tên người nhận
 */
export function extractRecipientName(text: string): string | null {
  const patterns = [
    /(?:người nhận|nguoi nhan|tên người nhận|tên là|ten la|giao cho|cho bạn|cho chị|cho anh|cho em)\s*(?:là|la|:|=|-)?\s*([\p{L}\s]{2,25}?)(?=\s*(?:sđt|sdt|số|nha|nhé|nhe|giúp|shop|ở|tại|địa chỉ|\d|,|\.|\n|$))/iu,
    /(?:chị|anh|bạn|em)\s+(\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+){0,2})(?=\s*(?:sđt|sdt|số|nha|nhé|nhe|giúp|shop|ở|tại|địa chỉ|\d|,|\.|\n|$))/iu,
  ]

  for (const regex of patterns) {
    const match = text.match(regex)
    if (match?.[1]) {
      let cleaned = match[1].trim()
      // Loại bỏ tiền tố xưng hô nếu bị bắt dính
      cleaned = cleaned.replace(/^(?:là|la|chị|anh|bạn|em|cô|bác)\s+/i, "")
      // Bỏ qua các từ phi tên riêng
      const forbidden = ["hoa", "sản phẩm", "sản phẩm", "giỏ hoa", "tiệm", "shop", "địa chỉ", "số", "mẫu đó", "mẫu này"]
      if (!forbidden.includes(cleaned.toLowerCase()) && cleaned.length >= 2) {
        return cleaned
      }
    }
  }
  return null
}

/**
 * Trích xuất địa chỉ giao hàng
 */
export function extractDeliveryAddress(text: string): string | null {
  const patterns = [
    /(?:địa chỉ|dia chi|giao đến|giao den|giao tại|giao tai|ở tại|o tai|ship đến|ship den|tới địa chỉ)\s*[:=-]?\s*([^,\n.]{8,120})/i,
    /(?:số\s+\d+[^,\n.]{5,100}(?:đường|phố|quận|huyện|phường|tp|hcm|hà nội|đà nẵng)[^,\n.]*)/i,
    /(?:toà nhà|tòa nhà|chung cư|căn hộ|khu đô thị)\s+[^,\n.]{5,80}/i,
  ]

  for (const regex of patterns) {
    const match = text.match(regex)
    if (match) {
      const raw = match[1] || match[0]
      const cleaned = raw.trim()
      if (cleaned.length >= 8) return cleaned
    }
  }
  return null
}

/**
 * Trích xuất thời gian giao hàng
 */
export function extractDeliveryTime(text: string): string | null {
  const patterns = [
    /(?:giao lúc|giao luc|giao tầm|giao tam|nhận lúc|nhan luc|lúc|khoảng)\s*(\d{1,2}\s*(?:h|giờ|g|pm|am)\s*(?:\d{1,2}\s*(?:p|phút))?(?:\s*(?:hôm nay|ngày mai|sáng mai|chiều mai|ngày\s*\d{1,2}\/\d{1,2}))?)/i,
    /(?:sáng mai|chiều mai|tối mai|trưa mai|ngày mai|hôm nay|sáng nay|chiều nay)(?:\s*(?:lúc|tầm)?\s*\d{1,2}\s*(?:h|giờ)?)?/i,
  ]

  for (const regex of patterns) {
    const match = text.match(regex)
    if (match) {
      return (match[1] || match[0]).trim()
    }
  }
  return null
}

/**
 * Trích xuất nội dung thiệp hoặc lời chúc
 */
export function extractCardMessage(text: string): string | null {
  const patterns = [
    /(?:ghi thiệp|ghi thiep|nội dung thiệp|noi dung thiep|lời chúc|loi chuc|thiệp ghi|thiep ghi)\s*[:=-]?\s*["“']?([^"”'\n]{5,120})["”']?/i,
    /(?:chúc\s+[^,\n.]{5,80}(?:sinh nhật|khai trương|hạnh phúc|thành công|hồng phát)[^,\n.]*)/i,
  ]

  for (const regex of patterns) {
    const match = text.match(regex)
    if (match) {
      const raw = match[1] || match[0]
      return raw.trim()
    }
  }
  return null
}

/**
 * Trích xuất toàn bộ Order Draft từ lịch sử tin nhắn
 */
export function extractOrderDraftFromChat(
  messages: Array<{ senderType: string; content: string }>
): ChatOrderDraft {
  const userText = messages
    .filter((m) => m.senderType === "USER")
    .map((m) => m.content)
    .join("\n")

  const allText = messages.map((m) => m.content).join("\n")

  const recipientPhone = extractVietnamesePhone(userText)
  const recipientName = extractRecipientName(userText)
  const deliveryAddress = extractDeliveryAddress(userText)
  const deliveryTime = extractDeliveryTime(userText)
  const cardMessage = extractCardMessage(userText)
  const occasion = extractOccasionFromQuery(userText)
  const budgetVnd = extractBudgetFromQuery(userText)

  // Tone màu hoặc phong cách hoa
  let flowerStyleOrTone: string | null = null
  const lowerAll = allText.toLowerCase()
  if (lowerAll.includes("pastel")) flowerStyleOrTone = "Tone Hồng Pastel nhẹ nhàng"
  else if (lowerAll.includes("đỏ") || lowerAll.includes("rực rỡ")) flowerStyleOrTone = "Tone Đỏ rực rỡ sang trọng"
  else if (lowerAll.includes("trắng") || lowerAll.includes("tinh khôi")) flowerStyleOrTone = "Tone Trắng tinh khôi thanh lịch"
  else if (lowerAll.includes("vàng") || lowerAll.includes("cam")) flowerStyleOrTone = "Tone Vàng cam may mắn"
  else if (lowerAll.includes("xanh")) flowerStyleOrTone = "Tone Xanh hy vọng"
  else if (lowerAll.includes("tulip")) flowerStyleOrTone = "Bó hoa Tulip Hà Lan"
  else if (lowerAll.includes("hướng dương")) flowerStyleOrTone = "Bó hoa Hướng Dương rạng rỡ"
  else if (lowerAll.includes("hồng đỏ")) flowerStyleOrTone = "Bó hoa Hồng đỏ Ecuador"

  return {
    recipientName,
    recipientPhone,
    deliveryAddress,
    deliveryTime,
    occasion,
    cardMessage,
    flowerStyleOrTone,
    budgetVnd,
  }
}

/**
 * Đánh giá tính đầy đủ và sẵn sàng của đơn hàng
 */
export function validateChatOrderDraft(draft: ChatOrderDraft): ChatOrderValidationResult {
  const missingFields: string[] = []
  const completedFields: string[] = []
  let score = 0

  if (draft.recipientName) {
    completedFields.push("Tên người nhận")
    score += 20
  } else {
    missingFields.push("Tên người nhận")
  }

  if (draft.recipientPhone) {
    completedFields.push("Số điện thoại người nhận")
    score += 25
  } else {
    missingFields.push("Số điện thoại người nhận")
  }

  if (draft.deliveryAddress) {
    completedFields.push("Địa chỉ giao hàng")
    score += 25
  } else {
    missingFields.push("Địa chỉ giao hàng")
  }

  if (draft.budgetVnd || draft.productName) {
    completedFields.push("Sản phẩm hoặc Ngân sách")
    score += 15
  } else {
    missingFields.push("Sản phẩm hoặc Ngân sách")
  }

  if (draft.deliveryTime) {
    completedFields.push("Thời gian giao hàng")
    score += 10
  } else {
    missingFields.push("Thời gian giao hàng")
  }

  if (draft.cardMessage) {
    completedFields.push("Nội dung thiệp chúc mừng")
    score += 5
  }

  // Đủ điều kiện chốt đơn khi có: SĐT + (Địa chỉ hoặc Tên) + Ngân sách/Sản phẩm
  const isReadyForCheckout =
    Boolean(draft.recipientPhone) &&
    Boolean(draft.deliveryAddress || draft.recipientName) &&
    Boolean(draft.budgetVnd || draft.productName)

  return {
    isReadyForCheckout,
    confidenceScore: Math.min(100, score),
    missingFields,
    completedFields,
  }
}

/**
 * Tạo Payload thanh toán VietQR Napas 247 khi chốt đơn thành công từ Chatbot (DH-04)
 */
export function generateChatOrderCheckout(
  draft: ChatOrderDraft,
  orgCode = "TIEMHOA"
): ChatOrderCheckoutPayload {
  const rand = Math.floor(1000 + Math.random() * 9000)
  const orderCode = `DH-${Date.now().toString().slice(-6)}-${rand}`
  const totalVnd = draft.budgetVnd || 550_000
  const paymentTransferCode = `SME ${orgCode.toUpperCase().slice(0, 6)} ${orderCode.replace(/-/g, "")}`

  const bankCode = "ICB" // VietinBank Napas 247
  const accountNumber = "102874629102"
  const accountName = "ALG STORE PAY"

  const qrQuickLink = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${totalVnd}&addInfo=${encodeURIComponent(
    paymentTransferCode
  )}&accountName=${encodeURIComponent(accountName)}`

  return {
    orderCode,
    recipientName: draft.recipientName || "Khách đặt hoa",
    recipientPhone: draft.recipientPhone || "Chưa cập nhật",
    deliveryAddress: draft.deliveryAddress || "Nhận trực tiếp tại cửa hàng",
    deliveryTime: draft.deliveryTime || "Trong ngày hôm nay",
    cardMessage: draft.cardMessage || (draft.occasion ? `Chúc mừng ${draft.occasion}` : "Chúc mừng tốt đẹp nhất"),
    productName: draft.productName || draft.flowerStyleOrTone || "Sản phẩm tươi thiết kế cao cấp",
    totalVnd,
    vietqrPayload: {
      bankCode,
      accountNumber,
      accountName,
      amount: totalVnd,
      orderCode,
      paymentTransferCode,
      qrQuickLink,
    },
  }
}
