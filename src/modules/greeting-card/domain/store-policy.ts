/**
 * Quản lý Ưu đãi, Cam kết & Thỏa thuận (Task #2 & Task #5).
 * - Ưu đãi = Khách được nhận gì (khách chọn tối đa 01 ưu đãi khi đặt).
 * - Cam kết = Cửa hàng chắc chắn thực hiện/cung cấp đúng chuẩn công bố.
 * - Thỏa thuận = Tình huống có thể xảy ra và khách đã được thông báo trước (bắt buộc xác nhận trước khi đặt).
 * Pure TypeScript.
 */
import {
  isGovernedItemEnabled,
  PLATFORM_MAX_DISCOUNT_PERCENT,
  type PolicyGovernanceUpper,
  type PolicySystem,
} from "@/modules/organization/domain/governance-decisions"
import { promotionPricingOf, type PromotionKind } from "./promotion-pricing"

export interface PromotionItem {
  id: string
  title: string
  description: string
  /** Loại tính tiền (PO 08/10/2026); thiếu → suy từ `config.percent`, còn lại là Tặng kèm. */
  kind?: PromotionKind | undefined
  /** Ví dụ: `{ percent: 10 }` cho Giảm %. */
  config?: Record<string, unknown> | undefined
  /** Điều hành bật/tắt theo từng thời điểm trong Hồ sơ tiệm (PO 08/10/2026); thiếu = đang áp dụng. */
  active?: boolean | undefined
}

export interface CommitmentItem {
  id: string
  title: string
  customerText: string
  internalText?: string | undefined
}

export interface AgreementItem {
  id: string
  title: string
  customerText: string
  internalText?: string | undefined
}

export interface IntakePromotionCtaConfig {
  enabled: boolean
  percent: number
}

export interface StorePoliciesConfig {
  promotions: PromotionItem[]
  commitments: CommitmentItem[]
  agreements: AgreementItem[]
  intakePromotionCta?: IntakePromotionCtaConfig | undefined
}

/**
 * Ưu đãi mặc định — đúng 3 lựa chọn PO chốt 08/10/2026 (khách chọn tối đa 01): Giảm 10% trên tổng
 * đơn (trừ tiền thật), Tặng thiệp, Thêm phụ liệu. Thay 9 ưu đãi mẫu cũ chỉ ghi chú mà không trừ tiền.
 */
export const DEFAULT_PROMOTIONS: PromotionItem[] = [
  { id: "promo-discount-10", title: "Giảm 10%", description: "Giảm 10% trên tổng giá trị đơn hàng.", kind: "PERCENT_OFF", config: { percent: 10 } },
  { id: "promo-free-card", title: "Tặng thiệp", description: "Tặng 01 thiệp chúc mừng kèm lời nhắn của bạn.", kind: "GIFT" },
  { id: "promo-accessory", title: "Thêm phụ liệu", description: "Thêm phụ kiện trang trí cao cấp cho sản phẩm.", kind: "GIFT" },
]

export function getIndustryDefaultPromotions(industryKey?: string | null): PromotionItem[] {
  if (industryKey === "HOMESTAY") {
    return [
      { id: "promo-discount-10", title: "Giảm 10%", description: "Giảm 10% trên tổng giá trị đặt phòng.", kind: "PERCENT_OFF", config: { percent: 10 } },
      { id: "promo-welcome-drink", title: "Set đón tiếp", description: "Tặng set trà, cà phê và bánh chào mừng tại phòng.", kind: "GIFT" },
      { id: "promo-early-checkin", title: "Nhận phòng sớm", description: "Hỗ trợ nhận phòng sớm hoặc trả phòng muộn linh hoạt.", kind: "GIFT" },
    ]
  }
  if (industryKey === "FNB") {
    return [
      { id: "promo-discount-10", title: "Giảm 10%", description: "Giảm 10% trên tổng giá trị hóa đơn.", kind: "PERCENT_OFF", config: { percent: 10 } },
      { id: "promo-dessert", title: "Món tráng miệng", description: "Tặng 01 phần tráng miệng hoặc đồ uống chào mừng.", kind: "GIFT" },
      { id: "promo-greeting-card", title: "Thẻ chúc mừng", description: "Tặng thiệp chúc mừng bàn tiệc kèm lời chúc ý nghĩa.", kind: "GIFT" },
    ]
  }
  if (industryKey === "SERVICES") {
    return [
      { id: "promo-discount-10", title: "Giảm 10%", description: "Giảm 10% trên tổng chi phí dịch vụ.", kind: "PERCENT_OFF", config: { percent: 10 } },
      { id: "promo-consultation", title: "Tư vấn miễn phí", description: "Miễn phí kiểm tra, đo đạc hoặc tư vấn giải pháp chi tiết.", kind: "GIFT" },
      { id: "promo-warranty", title: "Gia hạn bảo hành", description: "Tặng thêm 01 tháng bảo hành và hỗ trợ kỹ thuật tận nơi.", kind: "GIFT" },
    ]
  }
  if (industryKey === "FASHION" || industryKey === "RETAIL_GENERAL" || industryKey === "CRAFT_GIFT") {
    return [
      { id: "promo-discount-10", title: "Giảm 10%", description: "Giảm 10% trên tổng giá trị đơn hàng.", kind: "PERCENT_OFF", config: { percent: 10 } },
      { id: "promo-gift-wrap", title: "Hộp quà và thiệp", description: "Tặng hộp quà cao cấp kèm thiệp chúc mừng gửi kèm.", kind: "GIFT" },
      { id: "promo-free-shipping", title: "Freeship", description: "Miễn phí giao hàng tiêu chuẩn trên toàn quốc.", kind: "GIFT" },
    ]
  }
  return DEFAULT_PROMOTIONS
}

/**
 * 6 Cam kết cốt lõi — nội dung PO chốt 08/10/2026. Chỉ là mặc định: tiệm sửa/thêm/xóa trong
 * Hồ sơ tiệm; đã lưu `store_policies` thì không còn dùng bộ này.
 */
export const DEFAULT_COMMITMENTS: CommitmentItem[] = [
  { id: "commit-match-sample", title: "Đúng mẫu – đúng tone màu", customerText: "Sản phẩm được thực hiện theo mẫu quý khách đã chọn, giữ đúng phong cách, tone màu và bố cục chính của thiết kế.", internalText: "Thợ thực hiện đối chiếu chặt chẽ với ảnh mẫu (phong cách, tone màu, bố cục) trước khi chuyển kiểm tra chất lượng." },
  { id: "commit-match-value", title: "Đúng hoa chính – đúng cấu phần", customerText: "Đúng thành phần chính, số lượng và các hạng mục đã được xác nhận trong đơn hàng.", internalText: "Đảm bảo đúng chủng loại, số lượng hoa chính và các hạng mục đã xác nhận trong đơn." },
  { id: "commit-qc", title: "Hoa tươi – kiểm tra trước khi giao", customerText: "Hoa và sản phẩm hoàn thiện đều được kiểm tra chất lượng, độ tươi và hình thức trước khi rời cửa hàng.", internalText: "Chụp ảnh kiểm tra chất lượng và đối chiếu checklist kiểm định." },
  { id: "commit-send-photo", title: "Xem ảnh hoa thật trước khi giao", customerText: "Quý khách được xem ảnh sản phẩm thực tế sau khi hoàn thiện, trước khi đơn hàng được giao đi.", internalText: "Tải ảnh sản phẩm hoàn thiện lên hệ thống cho khách xem." },
  { id: "commit-delivery-time", title: "Giao đúng khung giờ đã xác nhận", customerText: "Cửa hàng chủ động chuẩn bị và điều phối để giao hoa trong khung giờ quý khách đã chọn và được xác nhận.", internalText: "Điều phối điều xe trước 45 phút so với mốc hẹn khách." },
  { id: "commit-support", title: "Cửa hàng chịu trách nhiệm đến cùng", customerText: "Mọi phản hồi về sản phẩm hoặc giao hàng đều được cửa hàng tiếp nhận và phối hợp xử lý nhanh chóng.", internalText: "Chăm sóc sau giao trong vòng 24h." },
]

export function getIndustryDefaultCommitments(industryKey?: string | null): CommitmentItem[] {
  if (industryKey === "HOMESTAY") {
    return [
      { id: "commit-room-clean", title: "Phòng sạch sẽ – khử khuẩn 100%", customerText: "Phòng ốc luôn được vệ sinh kỹ lưỡng, thay mới toàn bộ chăn ga gối đệm và khử khuẩn trước giờ quý khách nhận phòng.", internalText: "Bộ phận buồng phòng kiểm tra checklist vệ sinh 12 bước trước khi bàn giao chìa khóa." },
      { id: "commit-exact-amenities", title: "Đúng tiện nghi – đúng mô tả", customerText: "Cơ sở lưu trú cam kết cung cấp đầy đủ các tiện ích, trang thiết bị đúng như hình ảnh và thông tin đã công bố.", internalText: "Kiểm tra hoạt động của điều hòa, nước nóng, wifi và đồ dùng trước khi khách check-in." },
      { id: "commit-safe-quiet", title: "Không gian an ninh và riêng tư", customerText: "Đảm bảo sự yên tĩnh, an ninh và tôn trọng quyền riêng tư tuyệt đối cho kỳ nghỉ của quý khách.", internalText: "Giám sát an ninh khu vực công cộng, hỗ trợ khóa thông minh hoặc bảo vệ 24/7." },
      { id: "commit-ready-on-time", title: "Sẵn sàng đón tiếp đúng giờ", customerText: "Phòng luôn trong trạng thái sẵn sàng đón tiếp theo khung giờ nhận phòng tiêu chuẩn hoặc theo thỏa thuận.", internalText: "Bật sẵn điều hòa và chuẩn bị phòng đón tiếp trước 30 phút." },
      { id: "commit-host-support", title: "Quản gia và chủ nhà hỗ trợ 24/7", customerText: "Đội ngũ quản gia luôn sẵn sàng giải đáp thắc mắc, hướng dẫn chỉ đường và hỗ trợ trong suốt thời gian lưu trú.", internalText: "Trực hotline hỗ trợ khách lưu trú, xử lý sự cố phát sinh trong vòng 15 phút." },
      { id: "commit-transparent-pricing", title: "Minh bạch giá – không phụ phí ẩn", customerText: "Mọi chi phí dịch vụ, tiền cọc và quy định phụ thu đều được thông báo rõ ràng trước khi quý khách xác nhận đặt phòng.", internalText: "Hóa đơn và phiếu thu đặt phòng rõ ràng, không tự ý thu thêm phí." },
    ]
  }
  if (industryKey === "FNB") {
    return [
      { id: "commit-food-safety", title: "Vệ sinh an toàn thực phẩm 100%", customerText: "Toàn bộ nguyên liệu chế biến tươi ngon mỗi ngày, có nguồn gốc rõ ràng và đạt tiêu chuẩn an toàn thực phẩm.", internalText: "Kiểm tra hạn sử dụng và lưu mẫu thực phẩm theo quy chuẩn của bếp." },
      { id: "commit-exact-recipe", title: "Đúng định lượng và chuẩn vị món ăn", customerText: "Món ăn và thức uống được chế biến đúng công thức chuẩn, đảm bảo hương vị và định lượng đã niêm yết.", internalText: "Bếp trưởng kiểm tra thành phẩm đĩa ăn trước khi chuyển phục vụ." },
      { id: "commit-serve-on-time", title: "Phục vụ nhanh chóng – Đúng giờ hẹn", customerText: "Cửa hàng chuẩn bị bàn tiệc và lên món đúng thời gian đã xác nhận với quý khách.", internalText: "Bếp và bàn phối hợp điều phối món theo đúng tiến độ thời gian đặt bàn." },
      { id: "commit-support", title: "Lắng nghe và chăm sóc tận tâm", customerText: "Mọi phản hồi về chất lượng món ăn và dịch vụ đều được quản lý tiếp nhận và xử lý ngay tại bàn.", internalText: "Quản lý ca trực giải quyết phản hồi của khách trong vòng 5 phút." },
    ]
  }
  if (industryKey === "SERVICES") {
    return [
      { id: "commit-service-quality", title: "Kỹ thuật chuyên môn – Đúng tiêu chuẩn", customerText: "Dịch vụ được thực hiện bởi đội ngũ kỹ thuật viên lành nghề, đúng quy trình kỹ thuật tiêu chuẩn.", internalText: "Tuân thủ checklist quy trình kỹ thuật nghiệm thu dịch vụ." },
      { id: "commit-on-time", title: "Đúng lịch hẹn – Đúng tiến độ", customerText: "Kỹ thuật viên có mặt đúng giờ và hoàn thành công việc theo đúng tiến độ đã cam kết.", internalText: "Liên hệ xác nhận với khách trước 30 phút khi di chuyển tới địa điểm." },
      { id: "commit-warranty", title: "Bảo hành trách nhiệm rõ ràng", customerText: "Cam kết bảo hành chất lượng dịch vụ và hỗ trợ kỹ thuật nhanh chóng sau khi nghiệm thu.", internalText: "Ghi nhận phiếu bảo hành và chăm sóc khách hàng định kỳ." },
    ]
  }
  if (industryKey === "FASHION" || industryKey === "RETAIL_GENERAL" || industryKey === "CRAFT_GIFT") {
    return [
      { id: "commit-match-sample", title: "Đúng mẫu – đúng chất liệu", customerText: "Sản phẩm thực tế đúng kiểu dáng, màu sắc và chất liệu tiêu chuẩn như mô tả và hình ảnh.", internalText: "Kiểm tra đường may, phụ liệu và đối chiếu mẫu trước khi đóng gói." },
      { id: "commit-quality-check", title: "Kiểm tra kỹ lưỡng trước khi giao", customerText: "Mọi sản phẩm đều được kiểm định chất lượng kỹ càng, không lỗi chỉ hay trầy xước trước khi xuất kho.", internalText: "Soát lỗi thành phẩm và dán tem niêm phong chất lượng." },
      { id: "commit-exchange-policy", title: "Đổi trả linh hoạt nếu có lỗi", customerText: "Hỗ trợ đổi size hoặc đổi sản phẩm mới nếu phát sinh lỗi từ nhà sản xuất trong vòng 48h.", internalText: "Tiếp nhận và xử lý đổi trả trong vòng 24h làm việc." },
      { id: "commit-delivery-time", title: "Đóng gói cẩn thận – Giao đúng hẹn", customerText: "Hàng được đóng gói quy chuẩn bảo vệ sản phẩm tối đa và giao tới quý khách đúng thời gian cam kết.", internalText: "Bàn giao đơn vị vận chuyển đúng lịch hẹn điều phối." },
    ]
  }
  return DEFAULT_COMMITMENTS
}

export const DEFAULT_AGREEMENTS: AgreementItem[] = [
  { id: "agree-substitute-flowers", title: "Hoa phụ có thể thay tương đương", customerText: "Nếu hoa phụ hoặc phụ kiện không có sẵn hay chưa đạt độ đẹp tại thời điểm thực hiện, cửa hàng có thể thay bằng loại tương đương, giữ nguyên tone màu, phong cách và tổng thể thiết kế.", internalText: "Chỉ thay hoa phụ/phụ kiện có màu sắc tương đồng." },
  { id: "agree-color-variation", title: "Màu sắc có thể khác nhẹ", customerText: "Hoa tươi là sản phẩm tự nhiên nên màu sắc, kích thước và độ nở từng bông có thể khác nhẹ so với hình ảnh trên màn hình. Cửa hàng ưu tiên giữ đúng tone màu tổng thể của mẫu.", internalText: "Giải thích rõ yếu tố tự nhiên nếu khách thắc mắc." },
  { id: "agree-natural-variance", title: "Sản phẩm làm thủ công", customerText: "Mỗi sản phẩm được cắm và hoàn thiện bằng tay nên có thể khác nhỏ về hình dáng hoặc bố cục so với ảnh mẫu, nhưng vẫn giữ phong cách và tinh thần thiết kế đã chọn.", internalText: "Tôn trọng tính thủ công độc bản của nghệ nhân." },
  { id: "agree-main-flower-replacement", title: "Hoa chính chỉ thay sau khi trao đổi", customerText: "Nếu hoa chính không đạt tiêu chuẩn hoặc không thể cung cấp, cửa hàng sẽ liên hệ để cùng quý khách thống nhất phương án thay thế trước khi thực hiện.", internalText: "Bắt buộc liên hệ và được khách đồng ý trước khi thay hoa chính." },
  { id: "agree-delivery-adjustment", title: "Giờ giao có thể điều chỉnh", customerText: "Khi không liên lạc được người nhận, thông tin giao hàng thay đổi, thời tiết xấu hoặc có sự cố ngoài khả năng kiểm soát, giờ giao có thể được điều chỉnh. Cửa hàng sẽ chủ động thông báo và cùng quý khách chọn phương án phù hợp.", internalText: "Tài xế gọi tối thiểu 3 cuộc trước khi hẹn lại." },
  { id: "agree-order-change", title: "Thay đổi thông tin đơn hàng", customerText: "Sau khi đơn đã được xác nhận hoặc bắt đầu thực hiện, việc đổi mẫu, địa chỉ, giờ giao hay nội dung đơn có thể ảnh hưởng đến chi phí và thời gian giao. Cửa hàng sẽ thông báo trước khi áp dụng.", internalText: "Báo khách chi phí/thời gian phát sinh và chờ khách đồng ý trước khi áp dụng thay đổi." },
  { id: "agree-cancellation-policy", title: "Hủy đơn và hoàn tiền", customerText: "Quý khách có thể yêu cầu hủy đơn trước khi cửa hàng bắt đầu thực hiện. Sau khi đơn đã được chuẩn bị hoặc hoàn thiện, việc hủy hoặc hoàn tiền sẽ được giải quyết theo tình trạng thực tế của đơn.", internalText: "Áp dụng theo workflow duyệt của Điều hành." },
]

export function getIndustryDefaultAgreements(industryKey?: string | null): AgreementItem[] {
  if (industryKey === "HOMESTAY") {
    return [
      { id: "agree-checkin-checkout", title: "Giờ nhận và trả phòng tiêu chuẩn", customerText: "Thời gian nhận phòng (Check-in) từ 14:00 và trả phòng (Check-out) trước 12:00. Nếu quý khách có nhu cầu nhận sớm hoặc trả muộn, xin vui lòng liên hệ trước để được hỗ trợ tùy thuộc vào tình trạng phòng.", internalText: "Áp dụng biểu phí nhận sớm/trả muộn theo quy định cơ sở lưu trú." },
      { id: "agree-id-registration", title: "Xuất trình giấy tờ tùy thân", customerText: "Quý khách vui lòng xuất trình CMND/CCCD hoặc Hộ chiếu còn hạn của tất cả các thành viên lưu trú để làm thủ tục đăng ký tạm trú theo quy định pháp luật.", internalText: "Chụp ảnh giấy tờ và khai báo tạm trú qua cổng dịch vụ công." },
      { id: "agree-quiet-hours", title: "Giữ gìn trật tự và giờ yên tĩnh", customerText: "Xin vui lòng giữ trật tự chung sau 22:00 để không làm ảnh hưởng đến các phòng xung quanh và cư dân lân cận. Không tổ chức tiệc tùng gây ồn ào quá mức quy định.", internalText: "Nhắc nhở nhẹ nhàng khách giữ trật tự sau 22:00." },
      { id: "agree-guest-capacity", title: "Số lượng khách lưu trú tối đa", customerText: "Số lượng khách lưu trú thực tế không vượt quá số lượng đã xác nhận khi đặt phòng. Cơ sở có thể phụ thu nếu phát sinh thêm người lưu trú ngoài thỏa thuận.", internalText: "Thu phụ phí khách phát sinh theo bảng giá niêm yết." },
      { id: "agree-amenities-care", title: "Giữ gìn tài sản và tiện nghi phòng", customerText: "Quý khách vui lòng sử dụng cẩn thận các trang thiết bị trong phòng. Trường hợp làm mất mát, hỏng hóc hoặc làm bẩn không thể tẩy rửa, chi phí bồi thường sẽ được tính theo giá trị thực tế.", internalText: "Kiểm tra phòng khi khách check-out trước khi hoàn cọc." },
      { id: "agree-no-smoking", title: "Quy định cấm hút thuốc trong phòng", customerText: "Nghiêm cấm hút thuốc lá/thuốc lá điện tử bên trong không gian phòng kín. Quý khách có thể hút thuốc tại khu vực ban công hoặc sân vườn ngoài trời được phép.", internalText: "Phụ thu phí khử mùi nếu khách vi phạm quy định hút thuốc trong phòng." },
      { id: "agree-cancellation-policy", title: "Chính sách hủy phòng và hoàn cọc", customerText: "Quý khách có thể yêu cầu đổi lịch hoặc hủy phòng theo chính sách thông báo trước thời gian nhận phòng. Sau mốc quy định, tiền đặt cọc có thể không được hoàn lại tùy theo quy định của cơ sở.", internalText: "Giải quyết hoàn tiền hoặc bảo lưu kỳ nghỉ theo thỏa thuận đặt phòng." },
    ]
  }
  if (industryKey === "FNB") {
    return [
      { id: "agree-fresh-ingredients", title: "Nguyên liệu theo mùa vụ", customerText: "Một số nguyên liệu tươi sống đặc thù theo mùa có thể hết hoặc được thay thế bằng loại tương đương với sự đồng ý của quý khách.", internalText: "Báo trước cho khách nếu món ăn có thay đổi nguyên liệu phụ." },
      { id: "agree-serving-time", title: "Thời gian giữ bàn và lên món", customerText: "Bàn đặt trước sẽ được giữ trong vòng 15–20 phút so với giờ hẹn. Quý khách vui lòng thông báo nếu đến muộn để nhà hàng sắp xếp chu đáo nhất.", internalText: "Gọi nhắc khách trước 15 phút so với giờ đặt bàn." },
      { id: "agree-cancellation-policy", title: "Chính sách thay đổi và hủy đặt bàn", customerText: "Quý khách có thể thay đổi số lượng khách hoặc hủy đặt bàn trước 2 tiếng so với giờ hẹn để nhà hàng hỗ trợ hoàn cọc nếu có.", internalText: "Cập nhật lại sơ đồ bàn khi khách báo đổi lịch." },
    ]
  }
  if (industryKey === "SERVICES") {
    return [
      { id: "agree-site-condition", title: "Điều kiện mặt bằng và hiện trạng", customerText: "Quý khách tạo điều kiện về mặt bằng và nguồn điện/nước cần thiết để kỹ thuật viên tiến hành dịch vụ thuận lợi.", internalText: "Khảo sát hiện trạng trước khi tiến hành thi công/sửa chữa." },
      { id: "agree-reschedule", title: "Thay đổi lịch hẹn dịch vụ", customerText: "Quý khách có thể yêu cầu dời lịch hẹn trước tối thiểu 02 tiếng. Trường hợp phát sinh sự cố bất khả kháng, hai bên sẽ cùng thống nhất lịch hẹn mới.", internalText: "Cập nhật điều phối lịch làm việc của kỹ thuật viên." },
      { id: "agree-payment-terms", title: "Nghiệm thu và thanh toán", customerText: "Quý khách kiểm tra nghiệm thu kết quả dịch vụ cùng kỹ thuật viên trước khi hoàn tất thanh toán phần còn lại.", internalText: "Ký biên bản nghiệm thu trước khi nhận thanh toán." },
    ]
  }
  if (industryKey === "FASHION" || industryKey === "RETAIL_GENERAL" || industryKey === "CRAFT_GIFT") {
    return [
      { id: "agree-handmade-variance", title: "Đặc tính thủ công / Tự nhiên", customerText: "Sản phẩm thủ công hoặc vật liệu tự nhiên có thể có sự khác biệt nhỏ về hoa văn hoặc độ đậm nhạt màu sắc so với ảnh chụp trên màn hình.", internalText: "Tôn trọng đặc tính độc bản của sản phẩm thủ công." },
      { id: "agree-delivery-adjustment", title: "Thời gian giao hàng linh hoạt", customerText: "Thời gian giao hàng có thể xê dịch nhẹ tùy theo điều kiện thời tiết hoặc lộ trình của đơn vị vận chuyển. Cửa hàng sẽ chủ động cập nhật lộ trình đơn hàng.", internalText: "Cung cấp mã vận đơn để khách tiện theo dõi trực tuyến." },
      { id: "agree-exchange-condition", title: "Điều kiện đổi trả sản phẩm", customerText: "Sản phẩm đổi trả cần giữ nguyên tem mác, bao bì và chưa qua sử dụng trong vòng quy định của cửa hàng.", internalText: "Kiểm tra tình trạng hàng trả trước khi xuất đổi hoặc hoàn tiền." },
    ]
  }
  return DEFAULT_AGREEMENTS
}

export const STORE_POLICIES_SETTINGS_KEY = "store_policies"

export function parseStorePolicies(settings: unknown, industryKey?: string | null): StorePoliciesConfig {
  const root = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {}
  const industry = industryKey || (typeof root.industry === "string" ? root.industry : null)
  const raw = root[STORE_POLICIES_SETTINGS_KEY] as Partial<StorePoliciesConfig> | undefined
  const promotions = cleanItems<PromotionItem>(raw?.promotions, "description")
  const commitments = cleanItems<CommitmentItem>(raw?.commitments, "customerText")
  const agreements = cleanItems<AgreementItem>(raw?.agreements, "customerText")
  const rawCta = raw?.intakePromotionCta
  const intakePromotionCta: IntakePromotionCtaConfig = {
    enabled: typeof rawCta?.enabled === "boolean" ? rawCta.enabled : true,
    percent: typeof rawCta?.percent === "number" && rawCta.percent > 0 && rawCta.percent <= 100 ? rawCta.percent : 10,
  }
  return {
    promotions: promotions.length > 0 ? promotions : getIndustryDefaultPromotions(industry),
    commitments: commitments.length > 0 ? commitments : getIndustryDefaultCommitments(industry),
    agreements: agreements.length > 0 ? agreements : getIndustryDefaultAgreements(industry),
    intakePromotionCta,
  }
}

const MAX_POLICY_ITEMS = 50

/** Bỏ mục hỏng (thiếu id/tiêu đề/nội dung dạng chuỗi) — dữ liệu này hiện ra trang công khai. */
function cleanItems<T>(value: unknown, textKey: "description" | "customerText"): T[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v): v is Record<string, unknown> =>
      Boolean(v) && typeof v === "object" &&
      typeof (v as Record<string, unknown>).id === "string" &&
      typeof (v as Record<string, unknown>).title === "string" &&
      typeof (v as Record<string, unknown>)[textKey] === "string")
    .slice(0, MAX_POLICY_ITEMS) as T[]
}

export type PublicAppliedPolicies = {
  promotions: Array<{ id: string; title: string; customerText: string; kind: PromotionKind; percent: number | null }>
  commitments: Array<{ id: string; title: string; customerText: string }>
  agreements: Array<{ id: string; title: string; customerText: string }>
  allowCustomerPromotionChoice: boolean
  intakePromotionCta?: IntakePromotionCtaConfig | undefined
}

export function resolveAppliedPolicies(
  catalogFilters: unknown,
  orgSettings: unknown,
  industryKey?: string | null,
  /** Ma trận quản trị: khoá của tầng Mẹ / chuỗi và quyết định của chính tiệm (`own`, ADR-012 T-7b). */
  governanceUpper: PolicyGovernanceUpper = {},
): PublicAppliedPolicies {
  const all = parseStorePolicies(orgSettings, industryKey)
  const governed = (system: PolicySystem) => (id: string) =>
    isGovernedItemEnabled(id, governanceUpper.own?.[system], system, governanceUpper[system])
  const promoOn = governed("PROMOTIONS")
  const commitOn = governed("COMMITMENTS")
  const agreeOn = governed("POLICIES")
  const capDiscount = promoOn("MAX_DISCOUNT_PERCENT")
  const filters = catalogFilters && typeof catalogFilters === "object" ? (catalogFilters as Record<string, unknown>) : {}
  const applied = filters.appliedPolicies as {
    promotionIds?: string[]
    commitmentIds?: string[]
    agreementIds?: string[]
    allowCustomerPromotionChoice?: boolean
    intakePromotionCta?: Partial<IntakePromotionCtaConfig>
  } | undefined

  const promoFilter = applied?.promotionIds
  const commitFilter = applied?.commitmentIds
  const agreeFilter = applied?.agreementIds

  const activePromotions = all.promotions.filter((p) => p.active !== false && promoOn(p.id))
  const promotions = (promoFilter ? activePromotions.filter((p) => promoFilter.includes(p.id)) : activePromotions).map((p) => {
    const pricing = promotionPricingOf(p)
    // Trần chiết khấu toàn sàn: tắt được chỉ khi Mẹ mở khoá và tầng dưới tắt mục này
    const percent = capDiscount && pricing.percent !== null ? Math.min(pricing.percent, PLATFORM_MAX_DISCOUNT_PERCENT) : pricing.percent
    return { id: p.id, title: p.title, customerText: p.description, ...pricing, percent }
  })
  const visibleCommitments = all.commitments.filter((c) => commitOn(c.id))
  const visibleAgreements = all.agreements.filter((a) => agreeOn(a.id))
  const commitments = (commitFilter ? visibleCommitments.filter((c) => commitFilter.includes(c.id)) : visibleCommitments).map(
    ({ id, title, customerText }) => ({ id, title, customerText })
  )
  const agreements = (agreeFilter ? visibleAgreements.filter((a) => agreeFilter.includes(a.id)) : visibleAgreements).map(
    ({ id, title, customerText }) => ({ id, title, customerText })
  )

  const catalogCta = applied?.intakePromotionCta
  const intakePromotionCta: IntakePromotionCtaConfig = {
    enabled: typeof catalogCta?.enabled === "boolean" ? catalogCta.enabled : all.intakePromotionCta?.enabled ?? true,
    percent: typeof catalogCta?.percent === "number" && catalogCta.percent > 0 ? catalogCta.percent : all.intakePromotionCta?.percent ?? 10,
  }

  return {
    promotions,
    commitments,
    agreements,
    allowCustomerPromotionChoice: applied?.allowCustomerPromotionChoice ?? true,
    intakePromotionCta,
  }
}
