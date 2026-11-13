import type { DbClient } from "../infra/db-client"
import { getBusinessProfileRepository } from "../infra/business-profile-repository"
import { getBrandProfileRepository } from "../infra/brand-profile-repository"
import type { TenantContext } from "@/core/tenancy"

export const MOC_LAN_BUSINESS_PROFILE = {
  display_name: "Siin Store",
  legal_name: "Công ty TNHH Siin Store",
  phone: "0900 123 456",
  email: "hello@siinstore.vn",
  address: "42 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
  website: "https://siinstore.vn",
  tax_code: "0318999888",
  description: "Siin Store — Cửa hàng sản phẩm cao cấp, chuyên hoa thiết kế, hoa sinh nhật, hoa sự kiện và hoa cưới",
  operating_hours: {
    open: "07:30",
    close: "21:30",
  },
  social_links: {
    facebook: "https://facebook.com/siinstore",
    zalo: "https://zalo.me/0900123456",
    instagram: "https://instagram.com/siinstore",
  },
}

export const MOC_LAN_BRAND_PROFILE = {
  primary_color: "#e11d48",
  secondary_color: "#fda4af",
  accent_color: "#f59e0b",
  background_color: "#ffffff",
  text_color: "#111827",
  font_heading: "Playfair Display",
  font_body: "Inter",
  logo_asset_id: "/mock-data/floral/logo.jpg",
  tone_of_voice: "romantic",
  hashtags: {
    default: ["#siinstore", "#hoatuoisaigon", "#hoathietke", "#hoasinhnhat", "#hoatinhyeu"],
  },
  cta_templates: {
    default: "Nhắn tin Zalo hoặc gọi ngay Hotline để đội ngũ Siin Store tư vấn sản phẩm độc bản dành riêng cho bạn!",
    free_gifts: [
      "Tặng thiệp chúc mừng thiết kế riêng theo thông điệp",
      "Tặng gói nước dưỡng hoa Chrysal giúp sản phẩm lâu 5 - 7 ngày",
      "Ruy băng lụa cao cấp in nhũ sang trọng",
    ],
    guarantees: [
      "100% sản phẩm mới tuyển chọn nhập trong ngày",
      "Chụp hình hoa thực tế gửi quý khách duyệt trước khi giao",
      "Giao hoa hỏa tốc đúng giờ (60 - 90 phút nội thành)",
      "Bảo hành đổi mới nếu hoa bị dập héo khi vận chuyển",
    ],
  },
  forbidden_styles: {
    banned_words: ["hoa rẻ", "phá giá", "xả hàng tồn", "thanh lý hoa héo"],
  },
}

export function getIndustrySeedProfiles(industryKey?: string | null) {
  switch (industryKey) {
    case "FASHION":
      return {
        business: {
          display_name: "Lin Boutique",
          legal_name: "Công ty TNHH Thời Trang Lin Boutique",
          phone: "0900 123 456",
          email: "contact@linboutique.vn",
          address: "128 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh",
          website: "https://linboutique.vn",
          tax_code: "0318999881",
          description: "Lin Boutique — Thời trang thiết kế may đo cao cấp, đầm dự tiệc và âu phục công sở thanh lịch",
          operating_hours: { open: "08:30", close: "21:30" },
          social_links: { facebook: "https://facebook.com/linboutique", zalo: "https://zalo.me/0900123456" },
        },
        brand: {
          primary_color: "#1e293b",
          secondary_color: "#cbd5e1",
          accent_color: "#d97706",
          background_color: "#ffffff",
          text_color: "#0f172a",
          font_heading: "Playfair Display",
          font_body: "Inter",
          logo_asset_id: "/mock-data/fashion/logo.jpg",
          tone_of_voice: "elegant",
          hashtags: { default: ["#linboutique", "#thoitrangthietke", "#damdutiec", "#lookbook"] },
          cta_templates: {
            default: "Liên hệ Hotline hoặc Zalo để được chuyên viên tư vấn lấy số đo may đo riêng cho bạn!",
            free_gifts: ["Tặng phụ kiện cài áo sang trọng", "Miễn phí chỉnh sửa số đo theo dáng", "Túi vải bọc bảo quản cao cấp"],
            guarantees: ["100% chất liệu vải cao cấp nhập khẩu", "Đường may sắc sảo chuẩn phom dáng", "Đổi trả miễn phí trong 7 ngày"],
          },
          forbidden_styles: { banned_words: ["hàng chợ", "phá giá", "thanh lý lỗi mốt"] },
        },
      }
    case "FNB":
      return {
        business: {
          display_name: "Tiệm Bánh & Cà Phê Mùa Hạ",
          legal_name: "Công ty CP Ẩm Thực Mùa Hạ",
          phone: "0900 123 456",
          email: "hello@muahacafe.vn",
          address: "56 Nam Kỳ Khởi Nghĩa, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
          website: "https://muahacafe.vn",
          tax_code: "0318999882",
          description: "Mùa Hạ Bakery & Coffee — Cà phê pha máy đặc sản, bánh tươi thủ công nướng trong ngày và set tiệc sự kiện",
          operating_hours: { open: "07:00", close: "22:00" },
          social_links: { facebook: "https://facebook.com/muahacafe", zalo: "https://zalo.me/0900123456" },
        },
        brand: {
          primary_color: "#b45309",
          secondary_color: "#fde68a",
          accent_color: "#15803d",
          background_color: "#fffbeb",
          text_color: "#451a03",
          font_heading: "Outfit",
          font_body: "Inter",
          tone_of_voice: "warm",
          hashtags: { default: ["#muahacafe", "#banhtuoi", "#caphedacsan", "#teabreak"] },
          cta_templates: {
            default: "Đặt món trước qua Zalo hoặc Hotline để tiệm chuẩn bị món nóng hổi giao tận tay quý khách!",
            free_gifts: ["Tặng thiệp viết tay theo yêu cầu", "Kèm dao cắt và nến sinh nhật cao cấp", "Túi giữ nhiệt bảo quản bánh lạnh"],
            guarantees: ["100% nguyên liệu tươi sạch an toàn vệ sinh", "Bánh nướng mới mỗi ngày", "Giao hàng hỏa tốc đảm bảo hình thức"],
          },
          forbidden_styles: { banned_words: ["đồ ăn cũ", "bánh để qua ngày", "nguyên liệu giá rẻ"] },
        },
      }
    case "CRAFT_GIFT":
      return {
        business: {
          display_name: "Gốm Mộc & Quà Tặng An Nhiên",
          legal_name: "Hộ kinh doanh Gốm Mộc An Nhiên",
          phone: "0900 123 456",
          email: "annhien@craftgift.vn",
          address: "88 Trần Quang Khải, Phường Tân Định, Quận 1, TP. Hồ Chí Minh",
          website: "https://annhiencraft.vn",
          tax_code: "0318999883",
          description: "An Nhiên Craft — Đồ gốm mộc nghệ thuật, nến thơm tinh dầu và quà tặng doanh nghiệp độc bản",
          operating_hours: { open: "09:00", close: "21:00" },
          social_links: { facebook: "https://facebook.com/annhiencraft", zalo: "https://zalo.me/0900123456" },
        },
        brand: {
          primary_color: "#0f766e",
          secondary_color: "#ccfbf1",
          accent_color: "#b45309",
          background_color: "#ffffff",
          text_color: "#134e4a",
          font_heading: "Playfair Display",
          font_body: "Inter",
          tone_of_voice: "artistic",
          hashtags: { default: ["#annhiencraft", "#gommoc", "#nenthom", "#quatangdocban"] },
          cta_templates: {
            default: "Nhắn tin Zalo để nghệ nhân hỗ trợ tư vấn set quà tặng khắc tên theo yêu cầu!",
            free_gifts: ["Hộp quà kraft thắt nơ đính kèm", "Thiệp cảm ơn giấy mỹ thuật cao cấp", "Tặng kèm tinh dầu mini khuếch tán"],
            guarantees: ["Tác phẩm thủ công độc bản từ nghệ nhân", "Đóng gói bọc xốp chống sốc đa lớp", "Đổi mới miễn phí 100% nếu nứt vỡ khi vận chuyển"],
          },
          forbidden_styles: { banned_words: ["hàng nhái", "hàng đại trà", "chất liệu dỏm"] },
        },
      }
    case "RETAIL_GENERAL":
      return {
        business: {
          display_name: "Bách Hóa Tiện Lợi Gia Hưng",
          legal_name: "Công ty TNHH Bách Hóa Gia Hưng",
          phone: "0900 123 456",
          email: "cskh@giahungmart.vn",
          address: "15 Phổ Quang, Phường 2, Tân Bình, TP. Hồ Chí Minh",
          website: "https://giahungmart.vn",
          tax_code: "0318999884",
          description: "Bách Hóa Gia Hưng — Chuỗi phân phối hàng tiêu dùng, thực phẩm đóng gói và đồ gia dụng chính hãng",
          operating_hours: { open: "06:30", close: "22:00" },
          social_links: { facebook: "https://facebook.com/giahungmart", zalo: "https://zalo.me/0900123456" },
        },
        brand: {
          primary_color: "#1d4ed8",
          secondary_color: "#dbeafe",
          accent_color: "#ea580c",
          background_color: "#ffffff",
          text_color: "#1e3a8a",
          font_heading: "Outfit",
          font_body: "Inter",
          tone_of_voice: "friendly",
          hashtags: { default: ["#giahungmart", "#bachhoatienloi", "#hangtieudung", "#giaremoingay"] },
          cta_templates: {
            default: "Đặt hàng nhanh qua Zalo để nhận ưu đãi giá sỉ và giao hàng hỏa tốc trong 2 giờ!",
            free_gifts: ["Tặng túi vải mua sắm thân thiện môi trường", "Tích điểm 5% cho đơn hàng tiếp theo"],
            guarantees: ["100% hàng chính hãng có tem phụ rõ ràng", "Đổi trả dễ dàng trong vòng 7 ngày", "Miễn phí vận chuyển cho đơn từ 300k"],
          },
          forbidden_styles: { banned_words: ["hàng trôi nổi", "hàng cận date", "không rõ nguồn gốc"] },
        },
      }
    case "SERVICES":
      return {
        business: {
          display_name: "Viện Chăm Sóc Sắc Đẹp Mộc Lan",
          legal_name: "Công ty TNHH Dịch Vụ Mộc Lan",
          phone: "0900 123 456",
          email: "booking@moclanbeauty.vn",
          address: "102 Lê Thị Riêng, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh",
          website: "https://moclanbeauty.vn",
          tax_code: "0318999885",
          description: "Mộc Lan Beauty & Spa — Liệu trình gội đầu dưỡng sinh, chăm sóc da chuyên sâu và trị liệu thư giãn",
          operating_hours: { open: "09:00", close: "20:30" },
          social_links: { facebook: "https://facebook.com/moclanbeauty", zalo: "https://zalo.me/0900123456" },
        },
        brand: {
          primary_color: "#047857",
          secondary_color: "#d1fae5",
          accent_color: "#b45309",
          background_color: "#ffffff",
          text_color: "#064e3b",
          font_heading: "Playfair Display",
          font_body: "Inter",
          tone_of_voice: "caring",
          hashtags: { default: ["#moclanbeauty", "#spaduongsinh", "#chamsocda", "#thugian"] },
          cta_templates: {
            default: "Đặt lịch hẹn trước qua Hotline để nhận ưu đãi buổi trải nghiệm đầu tiên giảm tới 30%!",
            free_gifts: ["Tặng gói soi da và tư vấn chuyên sâu", "Ngâm chân thảo dược thải độc miễn phí"],
            guarantees: ["Kỹ thuật viên tay nghề cao đào tạo bài bản", "Dược mỹ phẩm nhập khẩu chính hãng", "Không chèo kéo phát sinh chi phí"],
          },
          forbidden_styles: { banned_words: ["chặt chém", "kem trộn", "thuốc rởm"] },
        },
      }
    case "HOMESTAY":
      return {
        business: {
          display_name: "Homestay Villa Mây Sơn",
          legal_name: "Hộ kinh doanh Du lịch Mây Sơn",
          phone: "0900 123 456",
          email: "booking@villaMaySon.vn",
          address: "Thôn Mây Sơn, Xã Cẩm Thanh, Hội An, Quảng Nam",
          website: "https://villaMaySon.vn",
          tax_code: "0318999886",
          description: "Villa Mây Sơn — Homestay nguyên căn sân vườn view thung lũng, không gian yên tĩnh lý tưởng cho kỳ nghỉ gia đình và trăng mật",
          operating_hours: { open: "07:00", close: "22:00" },
          social_links: { facebook: "https://facebook.com/villamayson", zalo: "https://zalo.me/0900123456" },
        },
        brand: {
          primary_color: "#065f46",
          secondary_color: "#d1fae5",
          accent_color: "#b45309",
          background_color: "#f0fdf4",
          text_color: "#052e16",
          font_heading: "Playfair Display",
          font_body: "Inter",
          logo_asset_id: "/mock-data/homestay/logo.jpg",
          tone_of_voice: "warm",
          hashtags: { default: ["#villamayson", "#homestayhoian", "#nghiduong", "#villaviewthunglung", "#homstayvietnam"] },
          cta_templates: {
            default: "Nhắn tin Zalo hoặc gọi Hotline để đặt phòng và được hỗ trợ lên lịch trình nghỉ dưỡng trọn vẹn!",
            free_gifts: ["Tặng bữa sáng đặc sản địa phương", "Setup phòng đặc biệt cho trăng mật & sinh nhật", "Hỗ trợ đặt xe đón sân bay miễn phí"],
            guarantees: ["100% không gian sạch sẽ đạt chuẩn kiểm tra trước mỗi lượt khách", "Ảnh phòng thực tế 100% không chỉnh sửa quá mức", "Hoàn tiền đầy đủ nếu hủy trước 72 giờ"],
          },
          forbidden_styles: { banned_words: ["phòng bẩn", "không đúng mô tả", "lừa đảo"] },
        },
      }
    case "FLORAL":
    default:
      return {
        business: MOC_LAN_BUSINESS_PROFILE,
        brand: MOC_LAN_BRAND_PROFILE,
      }
  }
}

/**
 * Nạp 100% dữ liệu mẫu chuẩn cho workspace trải nghiệm (EXPERIENCE) theo đúng ngành nghề.
 * CHỈ tạo nếu chưa có hồ sơ — không ghi đè dữ liệu thật đã cập nhật qua UI.
 */
export async function seedExperienceMasterProfile(
  db: DbClient,
  organizationId: string,
  industryKey?: string | null
): Promise<void> {
  const dummyCtx: TenantContext = {
    organizationId,
    userId: "system",
    workspaceId: "system",
    branchId: null,
    capabilities: new Set<string>(),
  }

  const bizRepo = getBusinessProfileRepository(db)
  const brandRepo = getBrandProfileRepository(db)

  const [existingBiz, existingBrand] = await Promise.all([
    bizRepo.current(dummyCtx),
    brandRepo.current(dummyCtx),
  ])

  const seed = getIndustrySeedProfiles(industryKey)
  const tasks: Promise<unknown>[] = []
  if (!existingBiz) {
    tasks.push(bizRepo.upsert(dummyCtx, seed.business))
  }
  if (!existingBrand) {
    tasks.push(brandRepo.upsert(dummyCtx, seed.brand))
  }

  if (tasks.length > 0) {
    await Promise.all(tasks)
  }
}

