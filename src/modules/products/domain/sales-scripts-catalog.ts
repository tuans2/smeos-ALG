/**
 * sales-scripts-catalog.ts
 *
 * Danh mục 14 kịch bản tư vấn bán hàng thực chiến (KB-01 -> KB-14, BH-07, BH-08, BH-10).
 * Clean Architecture: Domain thuần TypeScript — Không import Prisma, không import React.
 */

import { formatNumber } from "@/lib/i18n/formatters"

export type SalesScriptCategory =
  | "CHAO_HOI"
  | "TU_VAN_DIP"
  | "NGAN_SACH"
  | "XU_LY_TU_CHOI"
  | "CHOT_DON"
  | "XU_LY_SU_CO"
  | "CHAM_SOC_SAU_BAN"

export interface SalesScriptItem {
  id: string
  code: string
  category: SalesScriptCategory
  title: string
  summary: string
  template: string
  psychologicalTip: string
  suggestedActionLabel: string
}

export interface ScriptVariables {
  shopName?: string
  customerName?: string
  productName?: string
  priceVnd?: string | number
  substituteFlower?: string
  deliveryTime?: string
  hotline?: string
  [key: string]: string | number | undefined
}

export const SALES_SCRIPTS_CATALOG: readonly SalesScriptItem[] = [
  // 1. Chào khách mới
  {
    id: "kb-01",
    code: "KB-01",
    category: "CHAO_HOI",
    title: "Chào khách mới ghé hỏi giá",
    summary: "Mở đầu thân thiện, xác định ngay nhu cầu và dịp tặng để tránh khách rời đi.",
    template:
      "Dạ {{shopName}} xin chào {{customerName}} ạ! Sản phẩm {{productName}} này đang là mẫu thiết kế rất được yêu thích tại tiệm bên em. Em xin phép hỏi anh/chị đang chọn sản phẩm cho dịp gì và gửi tới ai (bạn bè, người yêu hay đối tác) để em tư vấn tone màu và thiệp chúc phù hợp nhất cho mình nhé ạ?",
    psychologicalTip: "Không báo mỗi giá cộc lốc; đặt câu hỏi mở về 'dịp tặng' để mở ra cơ hội tư vấn sâu hơn.",
    suggestedActionLabel: "Sao chép chào khách mới",
  },

  // 2. Chào khách quen
  {
    id: "kb-02",
    code: "KB-02",
    category: "CHAO_HOI",
    title: "Chào khách quen quay lại",
    summary: "Gợi nhắc lịch sử đặt hàng trước đó, mang lại cảm giác được tôn trọng và ưu tiên.",
    template:
      "Dạ em chào {{customerName}}, rất vui được gặp lại anh/chị ạ! Lần trước sản phẩm tặng bên em gửi đi mọi người có ưng ý không ạ? Hôm nay {{customerName}} đang có dịp đặc biệt nào cần {{shopName}} chuẩn bị không, để em ưu tiên chọn những bông sản phẩm mới về sáng nay cho mình nhé ạ!",
    psychologicalTip: "Gợi nhớ trải nghiệm tích cực lần trước giúp khách hàng cảm thấy họ là khách VIP.",
    suggestedActionLabel: "Sao chép chào khách quen",
  },

  // 3. Tư vấn hoa khai trương
  {
    id: "kb-03",
    code: "KB-03",
    category: "TU_VAN_DIP",
    title: "Tư vấn hoa khai trương hồng phát",
    summary: "Nhấn mạnh ý nghĩa phong thủy, sự hoành tráng và băng rôn chúc mừng nổi bật.",
    template:
      "Dạ với dịp khai trương hồng phát, bên em thường ưu tiên các tone màu mang lại may mắn và thịnh vượng như Đỏ rực rỡ, Vàng hoàng kim hoặc Cam san hô. Mẫu {{productName}} có dáng kệ cao sang trọng, sản phẩm bền 3–5 ngày kèm bảng chúc mừng thiết kế riêng in tên anh/chị cực kỳ nổi bật giữa sự kiện ạ!",
    psychologicalTip: "Khai trương là dịp người mua cần 'thể diện'; nhấn mạnh tính sang trọng và băng rôn to rõ.",
    suggestedActionLabel: "Sao chép tư vấn khai trương",
  },

  // 4. Tư vấn hoa sinh nhật người yêu / vợ
  {
    id: "kb-04",
    code: "KB-04",
    category: "TU_VAN_DIP",
    title: "Tư vấn sinh nhật người yêu / vợ",
    summary: "Đánh trúng cảm xúc tinh tế, lãng mạn và sự chu đáo với thiệp viết tay.",
    template:
      "Dạ sinh nhật người thương thì tone màu Pastel ngọt ngào (Hồng Ohara, Tulip, Baby) luôn khiến các nàng xiêu lòng anh/chị ạ! Bó {{productName}} được phối dáng tròn ôm trọn tay người nhận, kèm thiệp ép hoa viết tay và túi đựng quà trong suốt cao cấp. Bên em sẽ căn đúng khung giờ bất ngờ nhất để giao tận tay nàng giúp mình nhé ạ!",
    psychologicalTip: "Tập trung vào trải nghiệm người nhận cảm thấy được nâng niu và bất ngờ.",
    suggestedActionLabel: "Sao chép tư vấn sinh nhật",
  },

  // 5. Tư vấn hoa chia buồn
  {
    id: "kb-05",
    code: "KB-05",
    category: "TU_VAN_DIP",
    title: "Tư vấn hoa chia buồn trang nghiêm",
    summary: "Tông giọng trang trọng, thấu hiểu, ưu tiên giao nhanh và chuẩn nghi thức.",
    template:
      "Dạ {{shopName}} xin gửi lời chia buồn sâu sắc cùng gia quyến ạ. Đối với việc thăm viếng, bên em thiết kế kệ hoa tone Trắng - Tím thanh tịnh và trang nghiêm với hoa cúc, lan hồ điệp và lily tươi mới. Bên em sẽ hỗ trợ in dải băng rôn kính viếng cẩn trọng và giao tận nơi đúng giờ cử hành tang lễ ạ.",
    psychologicalTip: "Tuyệt đối không dùng icon vui nhộn; ngữ điệu khiêm tốn, lịch thiệp và cam kết giờ giấc.",
    suggestedActionLabel: "Sao chép tư vấn chia buồn",
  },

  // 6. Tư vấn theo ngân sách
  {
    id: "kb-06",
    code: "KB-06",
    category: "NGAN_SACH",
    title: "Tư vấn chọn hoa theo tầm giá",
    summary: "Định hướng khách chọn mẫu tối ưu nhất trong tầm tiền mà vẫn đảm bảo độ đầy đặn.",
    template:
      "Dạ trong tầm ngân sách {{priceVnd}} đ, em xin phép gợi ý cho {{customerName}} 2 phong cách đẹp nhất: một là bó dáng dài hiện đại với hoa hồng nhập điểm xuyết, hai là giỏ hoa để bàn dáng tròn xum xuê rất tiện trưng bày. Anh/chị thích dáng cầm tay chụp ảnh hay dáng giỏ để bàn hơn ạ?",
    psychologicalTip: "Đưa ra 2 lựa chọn (A hoặc B) thay vì câu hỏi Có/Không giúp khách dễ quyết định.",
    suggestedActionLabel: "Sao chép tư vấn ngân sách",
  },

  // 7. Xử lý khách chê đắt
  {
    id: "kb-07",
    code: "KB-07",
    category: "XU_LY_TU_CHOI",
    title: "Xử lý khi khách chê đắt / so sánh giá",
    summary: "Khẳng định chất lượng hoa loại 1, bảo hành sản phẩm 3 ngày thay vì vội vàng giảm giá.",
    template:
      "Dạ em rất hiểu tâm lý của anh/chị khi cân nhắc chi phí ạ. Tuy nhiên toàn bộ hoa tại {{shopName}} đều là hoa tuyển chọn loại 1 từ Đà Lạt và hoa nhập khẩu, bông nở đều to và tươi bền từ 3–5 ngày chứ không phải hoa dạt chợ. Đặc biệt bên em có chính sách bảo hành 1 đổi 1 nếu hoa héo úa trong 24h, kèm freeship và tặng thiệp thiết kế nên tính ra rất an tâm và xứng đáng cho một món quà chỉn chu ạ!",
    psychologicalTip: "Đừng giảm giá ngay khiến khách nghĩ giá ban đầu là giá ảo; hãy bảo vệ giá trị bằng bảo hành.",
    suggestedActionLabel: "Sao chép xử lý chê đắt",
  },

  // 8. Gợi ý hoa thay thế
  {
    id: "kb-08",
    code: "KB-08",
    category: "XU_LY_TU_CHOI",
    title: "Gợi ý hoa thay thế khi hết mẫu",
    summary: "Xoa dịu khách và đề xuất dòng hoa tương đương cùng tone màu hoặc nâng cấp miễn phí.",
    template:
      "Dạ hiện tại nguyên liệu này vừa hết đợt tươi nhất sáng nay rồi ạ. Để đảm bảo tác phẩm gửi đi được rạng rỡ nhất, em xin phép đổi sang hoa {{substituteFlower}} cùng tone màu và giá trị tương đương (hoặc thậm chí cao hơn) nhưng bên em không tính thêm phụ phí nào. Thợ chế tác bên em sẽ cắm phối thử và gửi ảnh trước để {{customerName}} duyệt trước khi giao nhé ạ!",
    psychologicalTip: "Cam kết gửi ảnh trước khi giao giúp loại bỏ 100% nỗi sợ hoa bị cắm xấu đi.",
    suggestedActionLabel: "Sao chép gợi ý hoa thay thế",
  },

  // 9. Thúc đẩy chốt cọc
  {
    id: "kb-09",
    code: "KB-09",
    category: "CHOT_DON",
    title: "Kêu gọi đặt cọc giữ sản phẩm",
    summary: "Tạo cảm giác cấp bách tự nhiên về số lượng cành sản phẩm đẹp nhất trong ngày.",
    template:
      "Dạ sản phẩm này hiện tại hoa trong kho chỉ còn vừa đủ cho 2 bó đẹp nhất hôm nay thôi ạ. Em xin phép tạo đơn giữ hoa cho mình nhé? {{customerName}} chỉ cần đặt cọc trước một phần là xưởng bên em sẽ chọn ngay những cành sản phẩm đẹp nhất để lên mẫu cho anh/chị ngay bây giờ ạ!",
    psychologicalTip: "Sự khan hiếm về sản phẩm đẹp là động lực chốt cọc mạnh mẽ nhất trong ngành hoa.",
    suggestedActionLabel: "Sao chép thúc đẩy chốt cọc",
  },

  // 10. Xác nhận giao hàng
  {
    id: "kb-10",
    code: "KB-10",
    category: "CHOT_DON",
    title: "Xác nhận thông tin giao & Lời chúc thiệp",
    summary: "Chốt lại thông tin chi tiết một cách ngăn nắp, tránh sai sót khi shipper giao hoa.",
    template:
      "Dạ em xin phép chốt lại thông tin đơn hàng của mình ạ:\n🌸 Sản phẩm: {{productName}}\n💰 Giá thanh toán: {{priceVnd}} đ\n👤 Người nhận: {{customerName}}\n📍 Địa chỉ: [Nhập địa chỉ nhận]\n⏰ Khung giờ giao: {{deliveryTime}}\n💌 Lời nhắn thiệp: [Nhập lời chúc]\n\nAnh/chị kiểm tra lại giúp em xem đúng hết chưa để bên em tiến hành thực hiện nhé ạ!",
    psychologicalTip: "Trình bày dạng danh sách gạch đầu dòng rõ ràng giúp khách dễ rà soát và xác nhận ngay.",
    suggestedActionLabel: "Sao chép xác nhận đơn",
  },

  // 11. Xin lỗi giao trễ
  {
    id: "kb-11",
    code: "KB-11",
    category: "XU_LY_SU_CO",
    title: "Xin lỗi giao trễ do thời tiết / kẹt xe",
    summary: "Chủ động thông báo trước khi khách giục, đưa ra lý do khách quan và gửi lời xin lỗi chân thành.",
    template:
      "Dạ {{shopName}} xin chân thành cáo lỗi cùng {{customerName}} ạ! Hiện tại tài xế giao hoa đang trên đường tới nhưng do khu vực đang kẹt xe/mưa lớn nên đơn có thể chậm hơn dự kiến khoảng 15–20 phút. Shipper đang di chuyển cẩn thận để giữ sản phẩm được nguyên vẹn nhất. Bên em đang bám sát định vị và sẽ cập nhật ngay khi tài xế tới nơi ạ, rất mong anh/chị thông cảm giúp bên em nhé ạ!",
    psychologicalTip: "Báo trước khi khách kịp bực mình sẽ chuyển từ thế bị trách sang thế được thông cảm.",
    suggestedActionLabel: "Sao chép xin lỗi trễ đơn",
  },

  // 12. Xử lý khiếu nại hoa dập
  {
    id: "kb-12",
    code: "KB-12",
    category: "XU_LY_SU_CO",
    title: "Xử lý khiếu nại hoa dập cánh / không đúng mẫu",
    summary: "Không cãi lý với khách; nhận trách nhiệm ngay lập tức và đề xuất phương án đổi/bù hoa.",
    template:
      "Dạ {{shopName}} thật sự rất tiếc và xin lỗi {{customerName}} vì trải nghiệm không như mong đợi này ạ! Anh/chị cho em xin hình ảnh thực tế hoa nhận được nhé. Bên em xin phép được cắm đền một sản phẩm mới tinh chuyển gấp đến mình hoặc hoàn tiền lại phần hoa bị ảnh hưởng ngay lập tức ạ. Uy tín của tiệm là trên hết nên anh/chị cứ an tâm bên em sẽ xử lý thỏa đáng nhất cho mình ạ!",
    psychologicalTip: "Khẳng định uy tín và giải pháp bồi thường ngay lập tức giúp dập tắt cơn giận của khách.",
    suggestedActionLabel: "Sao chép xử lý khiếu nại",
  },

  // 13. Gửi ảnh hoa hoàn thiện
  {
    id: "kb-13",
    code: "KB-13",
    category: "CHAM_SOC_SAU_BAN",
    title: "Gửi ảnh hoa cắm xong tại xưởng trước khi giao",
    summary: "Xác thực sự uy tín, cho khách duyệt tác phẩm thật trước khi tài xế lăn bánh.",
    template:
      "Dạ hoa của {{customerName}} đã được thợ chế tác hoàn thiện xong xuôi rồi đây ạ! Em gửi ảnh và video thực tế tại tiệm để mình ngắm trước nhé. Sản phẩm phối đúng tone màu và chế tác loại 1 rất tươi đẹp. Shipper bắt đầu di chuyển, em sẽ gửi ảnh giao tận tay người nhận sau khi giao xong anh/chị nhé!",
    psychologicalTip: "Người mua hoa gián tiếp (tặng người khác) rất thèm nhìn thấy món quà họ đã bỏ tiền ra mua.",
    suggestedActionLabel: "Sao chép gửi ảnh hoàn thiện",
  },

  // 14. Xin đánh giá 5 sao & tặng voucher
  {
    id: "kb-14",
    code: "KB-14",
    category: "CHAM_SOC_SAU_BAN",
    title: "Xin feedback, đánh giá 5 sao & kích hoạt ưu đãi",
    summary: "Khép lại đơn hàng với trải nghiệm tích cực và biến khách hàng thành khách thân thiết.",
    template:
      "Dạ đơn hoa của mình đã được giao tận tay người nhận chu đáo rồi ạ! Nếu hài lòng với sản phẩm và dịch vụ của {{shopName}}, anh/chị dành tặng bên em một đánh giá 5 sao nhé ạ, đó sẽ là nguồn động viên rất lớn cho đội ngũ thợ chế tác bên em. Để cảm ơn {{customerName}}, bên em xin gửi tặng mình mã giảm 10% cho lần đặt hàng tiếp theo ạ!",
    psychologicalTip: "Tặng voucher ngay sau khi xin đánh giá làm tăng 300% tỷ lệ quay lại mua lần 2.",
    suggestedActionLabel: "Sao chép xin đánh giá",
  },
]

/**
 * Nội suy các biến vào nội dung kịch bản mẫu.
 */
export function renderSalesScript(template: string, vars: ScriptVariables = {}): string {
  let rendered = template
  const defaults: Record<string, string> = {
    shopName: vars.shopName?.trim() || "Flora Cửa Hàng",
    customerName: vars.customerName?.trim() || "anh/chị",
    productName: vars.productName?.trim() || "sản phẩm này",
    priceVnd: vars.priceVnd !== undefined && vars.priceVnd !== ""
      ? formatNumber(Number(vars.priceVnd))
      : "550,000",
    substituteFlower: vars.substituteFlower?.trim() || "hoa hồng Ecuador cùng tone",
    deliveryTime: vars.deliveryTime?.trim() || "09:00 - 11:00 hôm nay",
    hotline: vars.hotline?.trim() || "hotline cửa hàng",
  }

  for (const [key, val] of Object.entries(defaults)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g")
    rendered = rendered.replace(regex, val)
  }

  return rendered
}

/**
 * Tìm kịch bản theo ID hoặc Category
 */
export function getScriptById(id: string): SalesScriptItem | undefined {
  return SALES_SCRIPTS_CATALOG.find((s) => s.id === id || s.code === id)
}

export function getScriptsByCategory(category: SalesScriptCategory | "ALL"): readonly SalesScriptItem[] {
  if (category === "ALL") return SALES_SCRIPTS_CATALOG
  return SALES_SCRIPTS_CATALOG.filter((s) => s.category === category)
}

/** @deprecated Dùng `SALES_SCRIPTS_CATALOG` để chuẩn hóa đa ngành */
export const FLORIST_SALES_SCRIPTS = SALES_SCRIPTS_CATALOG

