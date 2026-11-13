/**
 * industry-greeting-templates.ts — Chuyên biệt hoá Mẫu Thẻ Chào theo Ngành (Industry-Specialized Greeting Templates)
 * Cho phép 12 phong cách vuốt thẻ và Interactive Decks tự động thích ứng recommendedFor và mô tả theo ngành.
 * Pure TypeScript — Domain thuần, không import Prisma, không phụ thuộc client.
 */
import type { GreetingTemplateId, GreetingCardTemplateDef } from "./greeting-template-types"
import { GREETING_TEMPLATES } from "./greeting-template-catalog"

export interface IndustryTemplateOverride {
  readonly recommendedFor?: string
  readonly subtitle?: string
  readonly description?: string
  readonly tag?: string
}

type IndustryOverrides = Partial<Record<GreetingTemplateId, IndustryTemplateOverride>>

const FASHION_OVERRIDES: IndustryOverrides = {
  "editorial-luxury": {
    subtitle: "Sang trọng, tạp chí thời trang Haute Couture",
    description: "Nền kem trầm ấm, font Serif tương phản cao, typography to bản sau trang phục, viền mảnh tinh tế và khoảng thở rộng rãi chuẩn tạp chí.",
    tag: "Sang trọng & Thời trang",
    recommendedFor: "Bộ sưu tập thiết kế cao cấp, đầm dạ hội, trang phục may đo tinh tế",
  },
  "minimal-clean": {
    subtitle: "Tối giản, hiện đại & Thanh lịch",
    description: "Nền trắng ngà thanh thoát, font Sans-serif hiện đại, tối đa khoảng trống tôn trọn vẹn đường may và phom dáng trang phục.",
    tag: "Tối giản & Tinh tế",
    recommendedFor: "Trang phục tối giản, sơ mi, linen, phong cách thanh lịch thường nhật",
  },
  "cinematic-dark": {
    subtitle: "Điện ảnh, cá tính & Quyền lực",
    description: "Nền đen studio điện ảnh, ánh sáng spotlight gom tiêu điểm tôn chất liệu vải cao cấp và đường kim mũi chỉ.",
    tag: "Cá tính & Quyền lực",
    recommendedFor: "Trang phục dạ tiệc đêm, veston, phong cách cá tính sang trọng",
  },
  "romantic-pastel": {
    subtitle: "Ngọt ngào, nữ tính & Mềm mại",
    description: "Dải màu pastel dịu nhẹ tôn nét nữ tính của các thiết kế váy hoa, đầm dạo phố.",
    tag: "Ngọt ngào & Nữ tính",
    recommendedFor: "Váy tiểu thư, trang phục dạo phố ngọt ngào, đồ mặc nhà mềm mại",
  },
  "botanical-frame": {
    subtitle: "Mộc mạc, chất liệu tự nhiên",
    description: "Khung viền nét vẽ thanh lịch, nền giấy thô ấm áp tôn chất liệu vải organic, lanh, đũi tự nhiên.",
    tag: "Tự nhiên & Bền vững",
    recommendedFor: "Thời trang Eco, sợi tự nhiên lanh/đũi, phong cách Bohemian mộc mạc",
  },
  "glassmorphism": {
    subtitle: "Hiện đại, vị lai & Năng động",
    description: "Tấm thông tin kính mờ nổi trên nền ảnh trang phục, chuẩn phong cách công nghệ hiện đại.",
    tag: "Hiện đại & Streetwear",
    recommendedFor: "Thời trang Streetwear, đồ công sở hiện đại, phong cách Futuristic",
  },
  "real-life-shop": {
    subtitle: "Ảnh chụp tại showroom, sào đồ thực tế",
    description: "Bối cảnh showroom thời trang chân thực, góc chụp trước sào đồ với ánh sáng ấm cúng tạo cảm giác gần gũi tin cậy.",
    tag: "Chân thực & Showroom",
    recommendedFor: "Ảnh chụp tại showroom, sào đồ thực tế, khách thích ảnh chụp thật",
  },
  "real-life-daylight": {
    subtitle: "Ánh sáng tự nhiên dạo phố ban ngày",
    description: "Ánh sáng mặt trời ban ngày rực rỡ, góc chụp OOTD dạo phố tự nhiên chuẩn Lookbook ngoài trời.",
    tag: "Lookbook & Dạo phố",
    recommendedFor: "Thời trang dạo phố, chụp ngoài trời tự nhiên, phong cách Lookbook hè",
  },
  "real-life-in-store": {
    subtitle: "Không gian tiệm may đo, xưởng thiết kế",
    description: "Không gian bên trong xưởng may đo với bàn cắt vải, thước dây và khung cảnh làm việc đầy chất nghệ nhân.",
    tag: "Ấm cúng & Nghệ nhân may",
    recommendedFor: "Trang phục may đo riêng, áo dài thiết kế, đồ thủ công cao cấp",
  },
  "real-life-handheld": {
    subtitle: "Cầm tay, góc chụp POV phòng thử đồ",
    description: "Góc chụp ngôi thứ nhất (POV) cận cảnh chất vải, thử đồ dạo phố tự nhiên chuẩn phong cách mạng xã hội.",
    tag: "Casual & Fitting Room",
    recommendedFor: "Trang phục thường nhật, phụ kiện xách tay, khách trẻ năng động",
  },
  "lifestyle-context": {
    subtitle: "Phối đồ trong không gian sống thực tế",
    description: "Trang phục phối cùng phụ kiện trong bối cảnh quán cafe, góc phố, góc làm việc giúp khách dễ hình dung khi mặc.",
    tag: "Phong cách sống & Phối đồ",
    recommendedFor: "Trang phục công sở, set đồ dạo phố, trang phục du lịch",
  },
  "mixed-media": {
    subtitle: "Phối vẽ tay doodle sáng tạo Gen Z",
    description: "Ảnh chụp thật phối cùng nét vẽ tay doodle ngộ nghĩnh, phong cách Lookbook thời trang trẻ trung sáng tạo.",
    tag: "Sáng tạo & Độc bản",
    recommendedFor: "Thời trang Gen Z, thiết kế phá cách, đồ dạo phố trẻ trung",
  },
  "lookbook-grid": {
    subtitle: "Lưới Lookbook Thương Mại",
    description: "Bố cục lưới 2 cột sang trọng cho phép khách hàng nhìn tổng quan tất cả mẫu thiết kế trong bộ sưu tập cùng lúc.",
    recommendedFor: "Bộ sưu tập theo mùa, lookbook ra mắt nhiều mẫu trang phục (>10 mẫu)",
  },
  "split-compare": {
    subtitle: "Soi Chi Tiết Chất Vải & Đường May",
    description: "Thiết kế chia đôi màn hình: nửa trên soi cận cảnh bề mặt vải, nửa dưới hiển thị thông số size và bảng đo chi tiết.",
    recommendedFor: "Trang phục cao cấp, chất vải lụa tơ tằm, đồ may đo kỹ tính",
  },
}

const HOMESTAY_OVERRIDES: IndustryOverrides = {
  "editorial-luxury": {
    subtitle: "Sang trọng, tạp chí kiến trúc nghỉ dưỡng",
    description: "Nền kem trầm ấm, font Serif tương phản cao tôn trọn vẻ đẹp của không gian villa và căn hộ nghỉ dưỡng sang trọng.",
    tag: "Sang trọng & Nghỉ dưỡng",
    recommendedFor: "Villa nguyên căn, penthouse view biển/đồi, phòng Suite sang trọng",
  },
  "minimal-clean": {
    subtitle: "Tối giản, phong cách Scandinavian / Muji",
    description: "Nền trắng ngà thanh thoát, font Sans-serif hiện đại tôn vinh không gian phòng thoáng đãng, ngập tràn ánh sáng.",
    tag: "Tối giản & Thanh tịnh",
    recommendedFor: "Phòng phong cách Scandinavian / Muji tối giản, căn hộ studio view thoáng",
  },
  "cinematic-dark": {
    subtitle: "Huyền bí, phong cách Industrial & Hầm rượu",
    description: "Nền đen studio điện ảnh, ánh đèn spotlight ấm áp tôn không gian nghỉ ngơi yên tĩnh, riêng tư và cá tính.",
    tag: "Riêng tư & Độc đáo",
    recommendedFor: "Homestay phong cách Industrial, hầm rượu, quầy bar nghỉ dưỡng",
  },
  "romantic-pastel": {
    subtitle: "Lãng mạn, ngọt ngào cho cặp đôi",
    description: "Tông màu pastel dịu êm, góc check-in lãng mạn dành riêng cho các kỳ nghỉ kỷ niệm tình yêu.",
    tag: "Ngọt ngào & Kỷ niệm",
    recommendedFor: "Phòng nghỉ phong cách Hàn Quốc ngọt ngào, view hoàng hôn cho cặp đôi",
  },
  "botanical-frame": {
    subtitle: "Thiên nhiên, Farmstay & Nhà gỗ sinh thái",
    description: "Khung viền nét vẽ thực vật, mang trọn hơi thở thiên nhiên trong lành của núi rừng, sông suối.",
    tag: "Thiên nhiên & Sinh thái",
    recommendedFor: "Nhà gỗ trên đồi, farmstay sinh thái, bungalow gần gũi thiên nhiên",
  },
  "glassmorphism": {
    subtitle: "Hiện đại, Smart-home City View",
    description: "Tấm thông tin kính mờ nổi bật trên nền ảnh ban công ngắm nhìn toàn cảnh thành phố lung linh ánh đèn.",
    tag: "Hiện đại & City View",
    recommendedFor: "Căn hộ công nghệ cao, Smart-home city view hiện đại",
  },
  "real-life-shop": {
    subtitle: "Ảnh chụp thực tế không gian phòng",
    description: "Góc chụp chân thực từ cửa phòng bước vào, ánh sáng ấm cúng tạo cảm giác an tâm tuyệt đối cho khách đặt.",
    tag: "Chân thực & Tin cậy",
    recommendedFor: "Ảnh phòng chụp thật tại chỗ, khách thích hình ảnh không gian chân thực",
  },
  "real-life-daylight": {
    subtitle: "Nắng sớm ban mai ngập tràn phòng",
    description: "Ánh sáng mặt trời ban ngày rực rỡ qua khung cửa sổ lớn, view núi đồi hoặc biển cả bao la.",
    tag: "Nắng sớm & Tươi mới",
    recommendedFor: "Phòng ngập tràn ánh nắng sớm, ban công view biển / thung lũng",
  },
  "real-life-in-store": {
    subtitle: "Không gian phòng khách, góc bếp ấm cúng",
    description: "Không gian sinh hoạt chung ấm áp với bàn ăn, gian bếp nhỏ mang lại cảm giác thân quen như chính ngôi nhà của mình.",
    tag: "Ấm cúng & Như ở nhà",
    recommendedFor: "Không gian phòng khách, góc bếp homestay ấm cúng như ở nhà",
  },
  "real-life-handheld": {
    subtitle: "Góc quay POV bước vào nhận phòng",
    description: "Góc nhìn thứ nhất (POV) bước qua bậc cửa, mở khóa phòng và chiêm ngưỡng không gian nghỉ dưỡng.",
    tag: "Trải nghiệm & Check-in",
    recommendedFor: "Góc quay POV bước vào check-in phòng, trải nghiệm chân thực",
  },
  "lifestyle-context": {
    subtitle: "Trải nghiệm kỳ nghỉ thư thái thực tế",
    description: "Bối cảnh nghỉ dưỡng thực tế: tách cafe sáng trên ban công, cuốn sách đọc dở bên hồ bơi.",
    tag: "Thư thái & Trải nghiệm",
    recommendedFor: "Bối cảnh nghỉ dưỡng thư thái: bàn trà ban công, tách cafe sáng",
  },
  "mixed-media": {
    subtitle: "Nghệ thuật & Check-in sống ảo Gen Z",
    description: "Ảnh chụp phòng phối cùng nét vẽ tay doodle ngộ nghĩnh, chỉ dẫn tiện ích và góc check-in sống ảo cực chill.",
    tag: "Sáng tạo & Chill",
    recommendedFor: "Homestay nghệ thuật độc lạ, check-in chụp ảnh sống ảo Gen Z",
  },
  "occasion-budget-quiz": {
    subtitle: "Trợ Lý Gợi Ý Phòng Theo Nhu Cầu & Ngân Sách",
    description: "Hỏi nhanh số lượng khách, mục đích chuyến đi và mức ngân sách để đề xuất hạng phòng lý tưởng trong 30 giây.",
    recommendedFor: "Khách đặt phòng gấp, nhóm bạn hoặc gia đình tìm không gian phù hợp",
  },
}

const FNB_OVERRIDES: IndustryOverrides = {
  "editorial-luxury": {
    subtitle: "Sang trọng, ẩm thực Fine Dining",
    description: "Nền kem trầm ấm, font Serif tương phản cao tôn trọn vẻ đẹp nghệ thuật sắp đặt món ăn tinh tế chuẩn nhà hàng cao cấp.",
    tag: "Fine Dining & Đẳng cấp",
    recommendedFor: "Thực đơn món Âu, set tiệc sang trọng, fine dining đẳng cấp",
  },
  "minimal-clean": {
    subtitle: "Tối giản, ẩm thực thanh đạm & Healthy",
    description: "Nền trắng ngà thanh thoát, font Sans-serif hiện đại tôn vinh sự tươi ngon thuần khiết của từng nguyên liệu tươi sạch.",
    tag: "Thanh đạm & Tươi sạch",
    recommendedFor: "Cafe specialty, đồ uống thanh đạm, trà bánh tối giản",
  },
  "cinematic-dark": {
    subtitle: "Ấm áp, món nướng BBQ & Cocktail Bar",
    description: "Nền đen huyền bí, ánh sáng gom tiêu điểm tôn hương vị quyến rũ của các món nướng xèo xèo và ly cocktail sóng sánh.",
    tag: "Ấn tượng & Cuốn hút",
    recommendedFor: "Món nướng BBQ, quầy bar cocktail, ẩm thực đêm ấn tượng",
  },
  "romantic-pastel": {
    subtitle: "Ngọt ngào, tiệm trà bánh & Tráng miệng",
    description: "Tông màu pastel dịu ngọt, cánh hoa và hạt đường mơ màng dành riêng cho thế giới bánh ngọt, trà hoa.",
    tag: "Ngọt ngào & Dễ thương",
    recommendedFor: "Tiệm bánh ngọt, trà chiều lãng mạn, đồ tráng miệng xinh xắn",
  },
  "botanical-frame": {
    subtitle: "Thuần chay, thực dưỡng & Nước ép Organic",
    description: "Họa tiết cành lá vẽ nét mảnh, nền giấy thô ấm áp tôn trọn giá trị sức khỏe của món ăn thuần tự nhiên.",
    tag: "Thuần khiết & Dưỡng sinh",
    recommendedFor: "Món ăn thanh chay, thực dưỡng organic, nước ép tự nhiên",
  },
  "real-life-shop": {
    subtitle: "Khẩu phần thực tế tại bàn ăn",
    description: "Bối cảnh bàn ăn nhà hàng chân thực, đĩa món đầy đặn nóng hổi giúp khách hàng yên tâm khi chọn món.",
    tag: "Nóng hổi & Thật mắt",
    recommendedFor: "Ảnh chụp tại bàn ăn thực tế, khách thích thấy khẩu phần thật",
  },
  "real-life-in-store": {
    subtitle: "Bếp mở xèo xèo, quầy pha chế ấm cúng",
    description: "Khung cảnh đầu bếp chế biến trực tiếp, ngọn lửa ấm và không khí làm việc tràn đầy đam mê ẩm thực.",
    tag: "Tận tâm & Nghệ nhân bếp",
    recommendedFor: "Không gian bếp mở xèo xèo, quầy bar ấm cúng thân mật",
  },
  "lookbook-grid": {
    subtitle: "Thực Đơn Món Ăn Dạng Lưới",
    description: "Bố cục lưới trực quan giúp thực khách dễ dàng lướt nhanh toàn bộ thực đơn khai vị, món chính, đồ uống và tráng miệng.",
    recommendedFor: "Thực đơn phong phú nhiều món (>10 món), combo tiệc",
  },
}

const CRAFT_GIFT_OVERRIDES: IndustryOverrides = {
  "editorial-luxury": {
    subtitle: "Sang trọng, tác phẩm thủ công độc bản",
    description: "Nền kem trầm ấm, font Serif tương phản cao tôn vinh giá trị văn hóa và tay nghề tinh xảo của nghệ nhân thủ công.",
    tag: "Độc bản & Nghệ thuật",
    recommendedFor: "Tác phẩm thủ công độc bản, gốm sứ cao cấp, quà tặng doanh nghiệp",
  },
  "minimal-clean": {
    subtitle: "Tối giản, mộc mạc tinh tế",
    description: "Khoảng trắng quang đãng tôn trọn từng đường nét mộc mạc, chất liệu tự nhiên của tác phẩm.",
    tag: "Mộc mạc & Tinh tế",
    recommendedFor: "Đồ thủ công tối giản, nến thơm, phụ kiện da handmade tinh tế",
  },
  "cinematic-dark": {
    subtitle: "Huyền bí, điêu khắc & Gỗ mỹ nghệ",
    description: "Nền đen studio điện ảnh, ánh sáng spotlight làm nổi bật vân gỗ tự nhiên và vết chạm khắc thủ công kỳ công.",
    tag: "Kỳ công & Chiều sâu",
    recommendedFor: "Đồ gỗ mỹ nghệ, tượng điêu khắc, trang sức chế tác kỳ công",
  },
  "split-compare": {
    subtitle: "Soi Chi Tiết Nét Chạm Khắc Thủ Công",
    description: "Thiết kế chia đôi màn hình: nửa trên soi cận cảnh chi tiết chạm trổ độ nét cao, nửa dưới hiển thị thông số kích thước và chất liệu.",
    recommendedFor: "Tác phẩm chế tác thủ công tinh xảo, quà lưu niệm cao cấp, khách hàng kỹ tính",
  },
}

const SERVICES_OVERRIDES: IndustryOverrides = {
  "editorial-luxury": {
    subtitle: "Đẳng cấp, gói dịch vụ VIP chuyên sâu",
    description: "Phong cách tạp chí cao cấp giới thiệu quy trình phục vụ chuyên nghiệp và tay nghề chuyên gia hàng đầu.",
    tag: "Chuyên nghiệp & Đẳng cấp",
    recommendedFor: "Gói dịch vụ VIP, liệu trình chuyên sâu, gói kỹ thuật cao cấp",
  },
  "minimal-clean": {
    subtitle: "Minh bạch, liệu trình chuẩn hóa",
    description: "Bố cục tối giản làm rõ các bước dịch vụ, thời lượng thực hiện và cam kết hiệu quả rõ ràng.",
    tag: "Minh bạch & Rõ ràng",
    recommendedFor: "Dịch vụ thiết yếu nhanh gọn, bảo dưỡng định kỳ, liệu trình cơ bản",
  },
  "botanical-frame": {
    subtitle: "Thư giãn, dưỡng sinh thảo mộc",
    description: "Họa tiết thảo mộc dịu mắt mang lại cảm giác bình yên, thư thái trọn vẹn trước khi trải nghiệm dịch vụ.",
    tag: "Thảo mộc & Thư giãn",
    recommendedFor: "Trị liệu tự nhiên, gội đầu dưỡng sinh, massage thảo dược",
  },
}

const RETAIL_GENERAL_OVERRIDES: IndustryOverrides = {
  "editorial-luxury": {
    subtitle: "Sang trọng, sản phẩm nhập khẩu cao cấp",
    description: "Bố cục sang trọng nâng tầm giá trị thương hiệu và sự chỉn chu của các hộp quà tặng, sản phẩm chọn lọc.",
    tag: "Thương hiệu & Uy tín",
    recommendedFor: "Sản phẩm chọn lọc, thương hiệu uy tín, gói quà sang trọng",
  },
  "minimal-clean": {
    subtitle: "Hiện đại, thông số rõ ràng",
    description: "Tập trung thể hiện trọn vẹn hình ảnh sản phẩm, thông số quy cách đóng gói và xuất xứ minh bạch.",
    tag: "Minh bạch & Tiện ích",
    recommendedFor: "Đồ gia dụng tiện ích, bách hóa hiện đại, sản phẩm thiết yếu",
  },
}

const INDUSTRY_OVERRIDE_MAP: Record<string, IndustryOverrides> = {
  FASHION: FASHION_OVERRIDES,
  HOMESTAY: HOMESTAY_OVERRIDES,
  FNB: FNB_OVERRIDES,
  CRAFT_GIFT: CRAFT_GIFT_OVERRIDES,
  SERVICES: SERVICES_OVERRIDES,
  RETAIL_GENERAL: RETAIL_GENERAL_OVERRIDES,
}

/**
 * Lấy định nghĩa Mẫu Thẻ Chào chuyên biệt hóa theo ngành
 */
export function getIndustryGreetingTemplate(
  id: GreetingTemplateId,
  industryKey?: string | null
): GreetingCardTemplateDef {
  const base = GREETING_TEMPLATES[id] ?? GREETING_TEMPLATES["editorial-luxury"]
  if (!industryKey || industryKey === "FLORAL" || !(industryKey in INDUSTRY_OVERRIDE_MAP)) {
    return base
  }
  const overrides = INDUSTRY_OVERRIDE_MAP[industryKey]?.[id]
  if (!overrides) return base

  return {
    ...base,
    ...(overrides.subtitle ? { subtitle: overrides.subtitle } : {}),
    ...(overrides.description ? { description: overrides.description } : {}),
    ...(overrides.tag ? { tag: overrides.tag } : {}),
    ...(overrides.recommendedFor ? { recommendedFor: overrides.recommendedFor } : {}),
  }
}

/**
 * Danh mục đầy đủ mẫu Thẻ Chào đã chuyên biệt hóa theo ngành
 */
export function getIndustryGreetingTemplates(
  industryKey?: string | null
): Record<GreetingTemplateId, GreetingCardTemplateDef> {
  const result: Record<string, GreetingCardTemplateDef> = {}
  for (const key of Object.keys(GREETING_TEMPLATES) as GreetingTemplateId[]) {
    result[key] = getIndustryGreetingTemplate(key, industryKey)
  }
  return result as Record<GreetingTemplateId, GreetingCardTemplateDef>
}

/**
 * Danh sách mẫu Thẻ Chào dạng mảng đã chuyên biệt hóa theo ngành
 */
export function getIndustryGreetingTemplateList(
  industryKey?: string | null
): GreetingCardTemplateDef[] {
  return Object.values(getIndustryGreetingTemplates(industryKey))
}
