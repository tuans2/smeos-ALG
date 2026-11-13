/**
 * industry-profile.ts — Định nghĩa và danh mục cấu hình ngành (Industry Profile SSOT)
 *
 * Cho phép ALG thích ứng linh hoạt đa ngành (Bán lẻ, Thời trang, F&B, Quà tặng/Thủ công, Dịch vụ, Sản phẩm)
 * mà không phải sửa đổi cấu trúc CSDL hay viết lại logic nghiệp vụ cốt lõi.
 *
 * Tích hợp kiến trúc IndustryPluginContract SSOT:
 * Quản lý tập trung mọi thông tin từ Định danh, Thuật ngữ, Danh mục, BOM, Template in ấn đến AI Config.
 *
 * Luật thuần — Không import Prisma, không phụ thuộc client.
 */

import type {
  IndustryPluginContract,
  IndustryTerminology as PluginTerminology,
} from "./industry-plugin-contract"
import { INDUSTRY_REGISTRY } from "./industries"

export type IndustryKey =
  | "FLORAL"          // Hoa & Cây cảnh (Ngành mặc định/kế thừa)
  | "FASHION"         // Thời trang, may mặc, phụ kiện
  | "FNB"             // Ẩm thực, nhà hàng, quán cafe, tiệm bánh
  | "CRAFT_GIFT"      // Quà tặng, đồ thủ công, đồ trang trí
  | "RETAIL_GENERAL"  // Bán lẻ tổng hợp, siêu thị mini, tạp hóa
  | "SERVICES"        // Dịch vụ, salon, spa, sửa chữa
  | "HOMESTAY"        // Homestay, lưu trú, villa, căn hộ dịch vụ

export const ALL_INDUSTRY_KEYS = [
  "FLORAL",
  "FASHION",
  "FNB",
  "CRAFT_GIFT",
  "RETAIL_GENERAL",
  "SERVICES",
  "HOMESTAY",
] as const

export const DEFAULT_INDUSTRY: IndustryKey = "FLORAL"

export type IndustryTerminology = PluginTerminology

export interface IndustryDefinition {
  readonly key: IndustryKey
  readonly name: string
  readonly description: string
  readonly terms: IndustryTerminology
}

/**
 * Bản đồ tương thích ngược: chuyển đổi từ Plugin sang Definition
 */
export const INDUSTRY_CATALOG: Record<IndustryKey, IndustryDefinition> = Object.fromEntries(
  Object.entries(INDUSTRY_REGISTRY).map(([key, plugin]) => [
    key as IndustryKey,
    {
      key: plugin.identity.key as IndustryKey,
      name: plugin.identity.name,
      description: plugin.identity.description,
      terms: plugin.terminology,
    },
  ])
) as Record<IndustryKey, IndustryDefinition>

/**
 * Lấy đặc tả Plugin đầy đủ 6 khối thành phần của ngành
 */
export function getIndustryPlugin(industryKey?: string | null): IndustryPluginContract {
  if (!industryKey || !(industryKey in INDUSTRY_REGISTRY)) {
    return INDUSTRY_REGISTRY[DEFAULT_INDUSTRY]!
  }
  return INDUSTRY_REGISTRY[industryKey]!
}

/**
 * Lấy định nghĩa ngành, tự động dự phòng về FLORAL nếu không tìm thấy
 */
export function getIndustryDefinition(industryKey?: string | null): IndustryDefinition {
  if (!industryKey || !(industryKey in INDUSTRY_CATALOG)) {
    return INDUSTRY_CATALOG[DEFAULT_INDUSTRY]
  }
  return INDUSTRY_CATALOG[industryKey as IndustryKey]
}

/**
 * Lấy bộ từ điển thuật ngữ tương ứng với ngành
 */
export function getIndustryTerminology(industryKey?: string | null): IndustryTerminology {
  return getIndustryDefinition(industryKey).terms
}

export interface IndustryOrderTerminology {
  readonly deliveryTimeLabel: string
  readonly customerRoleLabel: string
  readonly recipientRoleLabel: string
  readonly addressLabel: string
  readonly emptyAddressText: string
  readonly makerTabLabel: string
  readonly readyDeadlineLabel: string
  readonly fallbackTimeSlotText: string
  /** Nhãn khối Nguyên phụ liệu trên Thẻ Gia Công */
  readonly rawMaterialLabel: string
  /** Nhãn phần thông tin nhận hàng / nhận phòng trên Thẻ Gia Công */
  readonly recipientInfoLabel: string
  /** Nhãn ảnh mẫu chuẩn tham chiếu trên Thẻ Gia Công */
  readonly referencePhotoLabel: string
  /** Nhãn ngắn cho người nhận trong form đặt hàng (vd: "người nhận hoa", "khách lưu trú", "người nhận hàng") */
  readonly recipientShortLabel: string
  /** Nhãn ngày giao hàng / nhận phòng / hẹn dịch vụ trong form đặt hàng */
  readonly deliveryDateLabel: string
  /** Nhãn phí vận chuyển / phí dịch vụ trong form đặt hàng */
  readonly shippingFeeLabel: string
  /** Nhãn khu vực giao hàng / lưu trú / phục vụ trong form đặt hàng */
  readonly shippingZoneLabel: string
  /** Văn bản khi miễn phí vận chuyển / bao gồm trong gói */
  readonly freeShippingText: string
  /** Nhãn bước sản xuất trong thanh theo dõi 5 bước phía khách (vd: "Cắm hoa", "Chuẩn bị phòng", "Chế biến") */
  readonly productionStepLabel: string
  /** Tiêu đề khối ảnh thành phẩm phía khách (vd: "Ảnh hoa thành phẩm", "Ảnh phòng đã chuẩn bị", "Ảnh món ra đĩa") */
  readonly completedPhotoSectionTitle: string
  /** Nhãn nút xác nhận đặt và thanh toán trên màn hình Xem lại đơn */
  readonly confirmButtonText: string
  /** Tiêu đề khối thỏa thuận / nội quy */
  readonly agreementHeading: string
  // ─── Tracking page ────────────────────────────────────────────────────────
  /** Tiêu đề trang theo dõi (vd: "Đơn hàng", "Đặt phòng", "Đặt món") */
  readonly trackingPageTitle: string
  /** Nhãn "Người nhận" trong tóm tắt cuối trang theo dõi */
  readonly trackingRecipientLabel: string
  /** Nhãn "Địa chỉ giao" trong tóm tắt cuối trang theo dõi */
  readonly trackingAddressLabel: string
  /** Nhãn dòng tiền "Sản phẩm" trong khối thanh toán theo dõi */
  readonly trackingProductLineLabel: string
  /** Mô tả trạng thái đã nhận cọc — nêu rõ họ cần làm gì tiếp theo */
  readonly trackingDepositNote: string
  /** Văn bản hướng dẫn thanh toán phần còn lại (có mã QR, giao sau) */
  readonly trackingBalanceAfterDeliveryHint: string
  /** Văn bản hướng dẫn thanh toán phần còn lại (hoàn thành trước khi giao) */
  readonly trackingBalanceAfterCompletionHint: string
  /** Văn bản trạng thái chờ thanh toán phần còn lại (không có QR) */
  readonly trackingBalanceContactHint: string
  /** Mô tả trạng thái Mốc 2 khi đơn đã được Điều phối xác nhận */
  readonly trackingAcceptedNote: string
  /** Nhãn nút đổi thông tin đơn (vd: "Đổi giờ giao, địa chỉ hoặc người nhận", "Đổi ngày, thông tin người lưu trú") */
  readonly trackingChangeButtonLabel: string
  /** Nhãn bước "Đang giao" trong thanh 5 bước */
  readonly trackingDeliveryStepLabel: string
  /** Văn bản loading trang theo dõi */
  readonly trackingLoadingText: string
  /** Văn bản ghi chú ảnh thành phẩm ("Được chụp nghiệm thu trước khi giao.") */
  readonly trackingCompletedPhotoNote: string
  /** Nội dung thông báo Privacy khi submit đơn */
  readonly privacySubmitText: string
  /** Loại luồng thực hiện đơn hàng (CRAFT_AND_DELIVERY = Chế tác vật lý & giao hàng; CALENDAR_STAY = Đặt phòng & Khóa lịch; APPOINTMENT = Lịch hẹn; DINE_IN_OR_TAKEOUT = F&B ẩm thực; GENERAL = Bán lẻ) */
  readonly fulfillmentFlow: "CRAFT_AND_DELIVERY" | "CALENDAR_STAY" | "APPOINTMENT" | "DINE_IN_OR_TAKEOUT" | "GENERAL"
}

export type IndustryFulfillmentFlow = "CRAFT_AND_DELIVERY" | "CALENDAR_STAY" | "APPOINTMENT" | "DINE_IN_OR_TAKEOUT" | "GENERAL"

export function getIndustryFulfillmentFlow(industryKey?: string | null): IndustryFulfillmentFlow {
  return getIndustryOrderTerms(industryKey).fulfillmentFlow
}

const ORDER_TERMS_MAP: Record<IndustryKey, IndustryOrderTerminology> = {
  HOMESTAY: {
    deliveryTimeLabel: "Thời gian nhận phòng / lưu trú",
    customerRoleLabel: "Khách đặt phòng",
    recipientRoleLabel: "Khách lưu trú",
    addressLabel: "Địa điểm lưu trú / Cơ sở",
    emptyAddressText: "Chưa có địa chỉ cơ sở lưu trú cụ thể",
    makerTabLabel: "Thẻ chuẩn bị phòng",
    readyDeadlineLabel: "Hạn sẵn sàng đón tiếp",
    fallbackTimeSlotText: "Theo thỏa thuận",
    rawMaterialLabel: "Vật tư & Tiện ích phòng:",
    recipientInfoLabel: "Thông tin khách lưu trú:",
    referencePhotoLabel: "Ảnh Phòng Chuẩn",
    recipientShortLabel: "khách lưu trú",
    deliveryDateLabel: "Ngày nhận phòng",
    shippingFeeLabel: "Phí dịch vụ & dọn dẹp",
    shippingZoneLabel: "Khu vực lưu trú",
    freeShippingText: "Nhận phòng tại chỗ (Không tính phí vận chuyển)",
    productionStepLabel: "Chuẩn bị phòng",
    completedPhotoSectionTitle: "Ảnh phòng đã chuẩn bị",
    confirmButtonText: "Xác nhận đặt phòng & thanh toán",
    agreementHeading: "Nội quy & Thỏa thuận lưu trú",
    trackingPageTitle: "Đặt phòng",
    trackingRecipientLabel: "Người lưu trú:",
    trackingAddressLabel: "Cơ sở lưu trú:",
    trackingProductLineLabel: "Tổng tiền đặt phòng",
    trackingDepositNote: "Cơ sở đã nhận tiền cọc. Phần còn lại thanh toán khi Check-in.",
    trackingBalanceAfterDeliveryHint: "Vui lòng thanh toán phần còn lại qua mã QR bên dưới hoặc trực tiếp khi Check-in.",
    trackingBalanceAfterCompletionHint: "Phòng đã sẵn sàng. Vui lòng thanh toán phần còn lại để xác nhận lịch lưu trú.",
    trackingBalanceContactHint: "Cơ sở sẽ liên hệ để nhận phần còn lại khi Check-in.",
    trackingAcceptedNote: "Quản gia đã xác nhận. Phòng đang được chuẩn bị cho kỳ lưu trú của bạn.",
    trackingChangeButtonLabel: "Đổi ngày, thông tin người lưu trú",
    trackingDeliveryStepLabel: "Nhận phòng",
    trackingLoadingText: "Đang tải tiến trình đặt phòng của bạn...",
    trackingCompletedPhotoNote: "Được chụp trước khi khách nhận phòng.",
    privacySubmitText: "Khi đặt phòng, bạn đồng ý để cơ sở dùng thông tin trên chỉ để phục vụ kỳ lưu trú.",
    fulfillmentFlow: "CALENDAR_STAY",
  },
  FLORAL: {
    deliveryTimeLabel: "Khung giờ giao hàng",
    customerRoleLabel: "Người đặt hoa",
    recipientRoleLabel: "Người nhận hoa",
    addressLabel: "Địa chỉ giao hàng",
    emptyAddressText: "Chưa có địa chỉ giao hàng cụ thể",
    makerTabLabel: "Thẻ gia công",
    readyDeadlineLabel: "Hạn cắm xong",
    fallbackTimeSlotText: "Trong ngày",
    rawMaterialLabel: "Nguyên phụ liệu & Phong cách cắm:",
    recipientInfoLabel: "Thông tin người nhận:",
    referencePhotoLabel: "Ảnh Mẫu Chuẩn",
    recipientShortLabel: "người nhận hoa",
    deliveryDateLabel: "Ngày giao hoa",
    shippingFeeLabel: "Phí giao hoa",
    shippingZoneLabel: "Khu vực giao hoa",
    freeShippingText: "Miễn phí giao hoa cho mọi đơn",
    productionStepLabel: "Cắm hoa",
    completedPhotoSectionTitle: "Ảnh hoa thành phẩm",
    confirmButtonText: "Xác nhận đặt hoa & thanh toán",
    agreementHeading: "Thỏa thuận khi thực hiện đơn",
    trackingPageTitle: "Đơn hàng",
    trackingRecipientLabel: "Người nhận:",
    trackingAddressLabel: "Địa chỉ giao:",
    trackingProductLineLabel: "Sản phẩm",
    trackingDepositNote: "Cửa hàng đã nhận tiền cọc. Phần còn lại thanh toán sau khi duyệt ảnh hoa hoàn thành.",
    trackingBalanceAfterDeliveryHint: "Vui lòng thanh toán phần còn lại qua mã QR bên dưới hoặc cho shipper khi nhận hoa.",
    trackingBalanceAfterCompletionHint: "Hoa của bạn đã hoàn thành. Vui lòng thanh toán phần còn lại để cửa hàng tiến hành giao hoa.",
    trackingBalanceContactHint: "Cửa hàng sẽ liên hệ để nhận phần còn lại khi giao hoa.",
    trackingAcceptedNote: "Điều phối đã duyệt đơn. Nghệ nhân hoa đang chuẩn bị nguyên liệu chế tác.",
    trackingChangeButtonLabel: "Đổi giờ giao, địa chỉ hoặc người nhận",
    trackingDeliveryStepLabel: "Đang giao",
    trackingLoadingText: "Đang tải tiến trình đơn hoa của bạn...",
    trackingCompletedPhotoNote: "Được chụp nghiệm thu trước khi giao.",
    privacySubmitText: "Khi đặt hoa, bạn đồng ý để cửa hàng dùng thông tin trên chỉ để giao hoa.",
    fulfillmentFlow: "CRAFT_AND_DELIVERY",
  },
  FNB: {
    deliveryTimeLabel: "Thời gian phục vụ / nhận món",
    customerRoleLabel: "Khách đặt món",
    recipientRoleLabel: "Người nhận / dùng món",
    addressLabel: "Địa chỉ giao món / bàn ăn",
    emptyAddressText: "Chưa có địa chỉ giao món cụ thể",
    makerTabLabel: "Thẻ bếp & pha chế",
    readyDeadlineLabel: "Hạn chế biến xong",
    fallbackTimeSlotText: "Trong ngày",
    rawMaterialLabel: "Nguyên liệu & Phong cách chế biến:",
    recipientInfoLabel: "Thông tin khách nhận món:",
    referencePhotoLabel: "Ảnh Món Chuẩn",
    recipientShortLabel: "người nhận món",
    deliveryDateLabel: "Ngày nhận món",
    shippingFeeLabel: "Phí giao món",
    shippingZoneLabel: "Khu vực giao món",
    freeShippingText: "Miễn phí giao cho mọi đơn",
    productionStepLabel: "Chế biến",
    completedPhotoSectionTitle: "Ảnh món ra đĩa",
    confirmButtonText: "Xác nhận đặt món & thanh toán",
    agreementHeading: "Thỏa thuận dịch vụ ẩm thực",
    trackingPageTitle: "Đơn đặt món",
    trackingRecipientLabel: "Người nhận:",
    trackingAddressLabel: "Địa chỉ giao:",
    trackingProductLineLabel: "Tổng tiền đơn",
    trackingDepositNote: "Cửa hàng đã nhận đặt cọc. Phần còn lại thanh toán khi nhận món.",
    trackingBalanceAfterDeliveryHint: "Vui lòng thanh toán phần còn lại qua mã QR bên dưới hoặc khi nhận món.",
    trackingBalanceAfterCompletionHint: "Món đã sẵn sàng. Vui lòng thanh toán phần còn lại để xác nhận giao.",
    trackingBalanceContactHint: "Cửa hàng sẽ liên hệ để nhận phần còn lại khi giao món.",
    trackingAcceptedNote: "Bếp đã tiếp nhận đơn. Đang bắt đầu chế biến theo yêu cầu của bạn.",
    trackingChangeButtonLabel: "Đổi giờ, địa chỉ hoặc người nhận",
    trackingDeliveryStepLabel: "Đang giao",
    trackingLoadingText: "Đang tải tiến trình đơn của bạn...",
    trackingCompletedPhotoNote: "Được chụp trước khi giao.",
    privacySubmitText: "Khi đặt món, bạn đồng ý để cửa hàng dùng thông tin trên chỉ để phục vụ đơn hàng.",
    fulfillmentFlow: "DINE_IN_OR_TAKEOUT" as any,
  },
  FASHION: {
    deliveryTimeLabel: "Khung giờ giao hàng",
    customerRoleLabel: "Người đặt may / mua",
    recipientRoleLabel: "Người nhận hàng",
    addressLabel: "Địa chỉ giao hàng",
    emptyAddressText: "Chưa có địa chỉ giao hàng cụ thể",
    makerTabLabel: "Thẻ may đo & gia công",
    readyDeadlineLabel: "Hạn may xong",
    fallbackTimeSlotText: "Trong ngày",
    rawMaterialLabel: "Vải & Phụ liệu & Phong cách may:",
    recipientInfoLabel: "Thông tin người nhận hàng:",
    referencePhotoLabel: "Ảnh Mẫu Thiết Kế",
    recipientShortLabel: "người nhận hàng",
    deliveryDateLabel: "Ngày nhận hàng",
    shippingFeeLabel: "Phí vận chuyển",
    shippingZoneLabel: "Khu vực giao hàng",
    freeShippingText: "Miễn phí giao hàng cho mọi đơn",
    productionStepLabel: "May đo",
    completedPhotoSectionTitle: "Ảnh trang phục hoàn thiện",
    confirmButtonText: "Xác nhận đặt may & thanh toán",
    agreementHeading: "Thỏa thuận may đo & mua sắm",
    trackingPageTitle: "Đơn hàng",
    trackingRecipientLabel: "Người nhận:",
    trackingAddressLabel: "Địa chỉ giao:",
    trackingProductLineLabel: "Sản phẩm",
    trackingDepositNote: "Cửa hàng đã nhận tiền cọc. Phần còn lại thanh toán sau khi may xong.",
    trackingBalanceAfterDeliveryHint: "Vui lòng thanh toán phần còn lại qua mã QR bên dưới hoặc khi nhận hàng.",
    trackingBalanceAfterCompletionHint: "Trang phục đã hoàn thiện. Vui lòng thanh toán phần còn lại để nhận hàng.",
    trackingBalanceContactHint: "Cửa hàng sẽ liên hệ để nhận phần còn lại khi giao hàng.",
    trackingAcceptedNote: "Thợ may đã tiếp nhận đơn. Đang bắt đầu gia công theo yêu cầu của bạn.",
    trackingChangeButtonLabel: "Đổi giờ giao, địa chỉ hoặc người nhận",
    trackingDeliveryStepLabel: "Đang giao",
    trackingLoadingText: "Đang tải tiến trình đơn hàng của bạn...",
    trackingCompletedPhotoNote: "Được chụp trước khi giao hàng.",
    privacySubmitText: "Khi đặt hàng, bạn đồng ý để cửa hàng dùng thông tin trên chỉ để thực hiện đơn.",
    fulfillmentFlow: "CRAFT_AND_DELIVERY",
  },
  CRAFT_GIFT: {
    deliveryTimeLabel: "Khung giờ giao hàng",
    customerRoleLabel: "Người đặt quà",
    recipientRoleLabel: "Người nhận quà",
    addressLabel: "Địa chỉ giao hàng",
    emptyAddressText: "Chưa có địa chỉ giao hàng cụ thể",
    makerTabLabel: "Thẻ chế tác thủ công",
    readyDeadlineLabel: "Hạn hoàn thành chế tác",
    fallbackTimeSlotText: "Trong ngày",
    rawMaterialLabel: "Nguyên phụ liệu & Phong cách chế tác:",
    recipientInfoLabel: "Thông tin người nhận quà:",
    referencePhotoLabel: "Ảnh Mẫu Quà Chuẩn",
    recipientShortLabel: "người nhận quà",
    deliveryDateLabel: "Ngày giao quà",
    shippingFeeLabel: "Phí vận chuyển",
    shippingZoneLabel: "Khu vực giao hàng",
    freeShippingText: "Miễn phí giao hàng cho mọi đơn",
    productionStepLabel: "Chế tác",
    completedPhotoSectionTitle: "Ảnh sản phẩm hoàn thiện",
    confirmButtonText: "Xác nhận đặt quà & thanh toán",
    agreementHeading: "Thỏa thuận chế tác thủ công",
    trackingPageTitle: "Đơn hàng",
    trackingRecipientLabel: "Người nhận:",
    trackingAddressLabel: "Địa chỉ giao:",
    trackingProductLineLabel: "Sản phẩm",
    trackingDepositNote: "Cửa hàng đã nhận tiền cọc. Phần còn lại thanh toán sau khi hoàn thành chế tác.",
    trackingBalanceAfterDeliveryHint: "Vui lòng thanh toán phần còn lại qua mã QR bên dưới hoặc khi nhận hàng.",
    trackingBalanceAfterCompletionHint: "Sản phẩm đã hoàn thiện. Vui lòng thanh toán phần còn lại để tiến hành giao.",
    trackingBalanceContactHint: "Cửa hàng sẽ liên hệ để nhận phần còn lại khi giao hàng.",
    trackingAcceptedNote: "Nghệ nhân đã tiếp nhận đơn. Đang bắt đầu chế tác theo yêu cầu của bạn.",
    trackingChangeButtonLabel: "Đổi giờ giao, địa chỉ hoặc người nhận",
    trackingDeliveryStepLabel: "Đang giao",
    trackingLoadingText: "Đang tải tiến trình đơn hàng của bạn...",
    trackingCompletedPhotoNote: "Được chụp trước khi giao hàng.",
    privacySubmitText: "Khi đặt quà, bạn đồng ý để cửa hàng dùng thông tin trên chỉ để thực hiện đơn.",
    fulfillmentFlow: "CRAFT_AND_DELIVERY",
  },
  SERVICES: {
    deliveryTimeLabel: "Thời gian hẹn dịch vụ",
    customerRoleLabel: "Khách đặt lịch",
    recipientRoleLabel: "Khách sử dụng dịch vụ",
    addressLabel: "Địa điểm thực hiện dịch vụ",
    emptyAddressText: "Chưa có địa điểm thực hiện cụ thể",
    makerTabLabel: "Thẻ thực hiện dịch vụ",
    readyDeadlineLabel: "Thời gian hẹn bắt đầu",
    fallbackTimeSlotText: "Theo lịch hẹn",
    rawMaterialLabel: "Vật tư & Thiết bị & Phong cách:",
    recipientInfoLabel: "Thông tin khách sử dụng dịch vụ:",
    referencePhotoLabel: "Ảnh Dịch Vụ Chuẩn",
    recipientShortLabel: "người thụ hưởng dịch vụ",
    deliveryDateLabel: "Ngày hẹn dịch vụ",
    shippingFeeLabel: "Phí dịch vụ",
    shippingZoneLabel: "Khu vực phục vụ",
    freeShippingText: "Miễn phí di chuyển cho mọi lịch hẹn",
    productionStepLabel: "Thực hiện",
    completedPhotoSectionTitle: "Ảnh dịch vụ hoàn thành",
    confirmButtonText: "Xác nhận đặt lịch & thanh toán",
    agreementHeading: "Thỏa thuận cung cấp dịch vụ",
    trackingPageTitle: "Lịch hẹn",
    trackingRecipientLabel: "Khách thụ hưởng:",
    trackingAddressLabel: "Địa điểm dịch vụ:",
    trackingProductLineLabel: "Tổng tiền dịch vụ",
    trackingDepositNote: "Cửa hàng đã nhận đặt cọc. Phần còn lại thanh toán sau khi hoàn thành dịch vụ.",
    trackingBalanceAfterDeliveryHint: "Vui lòng thanh toán phần còn lại qua mã QR bên dưới hoặc tại cửa hàng.",
    trackingBalanceAfterCompletionHint: "Dịch vụ đã hoàn thành. Vui lòng thanh toán phần còn lại.",
    trackingBalanceContactHint: "Cửa hàng sẽ liên hệ để nhận phần còn lại sau khi hoàn thành dịch vụ.",
    trackingAcceptedNote: "Kỹ thuật viên đã xác nhận lịch hẹn. Đang chuẩn bị để phục vụ theo lịch của bạn.",
    trackingChangeButtonLabel: "Đổi giờ hẹn, địa điểm hoặc người thụ hưởng",
    trackingDeliveryStepLabel: "Thực hiện",
    trackingLoadingText: "Đang tải tiến trình lịch hẹn của bạn...",
    trackingCompletedPhotoNote: "Được chụp sau khi hoàn thành dịch vụ.",
    privacySubmitText: "Khi đặt lịch, bạn đồng ý để cửa hàng dùng thông tin trên chỉ để thực hiện dịch vụ.",
    fulfillmentFlow: "APPOINTMENT",
  },
  RETAIL_GENERAL: {
    deliveryTimeLabel: "Khung giờ giao hàng",
    customerRoleLabel: "Người đặt hàng",
    recipientRoleLabel: "Người nhận hàng",
    addressLabel: "Địa chỉ giao hàng",
    emptyAddressText: "Chưa có địa chỉ giao hàng cụ thể",
    makerTabLabel: "Thẻ soạn hàng & đóng gói",
    readyDeadlineLabel: "Hạn soạn hàng xong",
    fallbackTimeSlotText: "Trong ngày",
    rawMaterialLabel: "Hàng hóa & Phương thức đóng gói:",
    recipientInfoLabel: "Thông tin người nhận hàng:",
    referencePhotoLabel: "Ảnh Sản Phẩm Chuẩn",
    recipientShortLabel: "người nhận hàng",
    deliveryDateLabel: "Ngày nhận hàng",
    shippingFeeLabel: "Phí vận chuyển",
    shippingZoneLabel: "Khu vực giao hàng",
    freeShippingText: "Miễn phí giao hàng cho mọi đơn",
    productionStepLabel: "Soạn hàng",
    completedPhotoSectionTitle: "Ảnh hàng đã đóng gói",
    confirmButtonText: "Xác nhận đặt hàng & thanh toán",
    agreementHeading: "Thỏa thuận mua bán & giao nhận",
    trackingPageTitle: "Đơn hàng",
    trackingRecipientLabel: "Người nhận:",
    trackingAddressLabel: "Địa chỉ giao:",
    trackingProductLineLabel: "Sản phẩm",
    trackingDepositNote: "Cửa hàng đã nhận tiền cọc. Phần còn lại thanh toán khi nhận hàng.",
    trackingBalanceAfterDeliveryHint: "Vui lòng thanh toán phần còn lại qua mã QR bên dưới hoặc khi nhận hàng.",
    trackingBalanceAfterCompletionHint: "Hàng đã sẵn sàng. Vui lòng thanh toán phần còn lại để tiến hành giao.",
    trackingBalanceContactHint: "Cửa hàng sẽ liên hệ để nhận phần còn lại khi giao hàng.",
    trackingAcceptedNote: "Đơn hàng đã được tiếp nhận. Đang tiến hành soạn và đóng gói theo yêu cầu của bạn.",
    trackingChangeButtonLabel: "Đổi giờ giao, địa chỉ hoặc người nhận",
    trackingDeliveryStepLabel: "Đang giao",
    trackingLoadingText: "Đang tải tiến trình đơn hàng của bạn...",
    trackingCompletedPhotoNote: "Được chụp trước khi giao hàng.",
    privacySubmitText: "Khi đặt hàng, bạn đồng ý để cửa hàng dùng thông tin trên chỉ để giao hàng.",
    fulfillmentFlow: "GENERAL",
  },
}

/**
 * Lấy các thuật ngữ chuyên biệt cho đơn hàng và luồng điều phối theo ngành SSOT
 */
export function getIndustryOrderTerms(industryKey?: string | null): IndustryOrderTerminology {
  if (!industryKey || !(industryKey in ORDER_TERMS_MAP)) {
    return ORDER_TERMS_MAP[DEFAULT_INDUSTRY]
  }
  return ORDER_TERMS_MAP[industryKey as IndustryKey]
}

/**
 * Danh sách tất cả các ngành hỗ trợ trong hệ thống
 */
export function listAllIndustries(): readonly IndustryDefinition[] {
  return Object.values(INDUSTRY_CATALOG)
}

/**
 * Danh sách tất cả các Plugin ngành đầy đủ
 */
export function listAllIndustryPlugins(): readonly IndustryPluginContract[] {
  return Object.values(INDUSTRY_REGISTRY)
}

export * from "./industry-plugin-contract"
export * from "./industries"

/** Mã ngành có trong registry (đăng ký / dùng thử chỉ nhận mã này — ngành bị khoá ngay sau khi chọn). */
export function isKnownIndustryKey(key: string | null | undefined): key is string {
  return typeof key === "string" && key in INDUSTRY_REGISTRY
}
