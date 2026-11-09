/**
 * industry-journeys.ts — Sinh danh mục Journey thích ứng theo ngành SSOT
 *
 * Cho phép các ngành Thời trang, F&B, Quà tặng, Bán lẻ tổng hợp, Dịch vụ...
 * tự động hiển thị đúng thuật ngữ chuyên môn trên Trang chủ.
 *
 * Không import React, không import Prisma (Clean Architecture Domain).
 */

import type { JourneyDefinition } from "./journey-model"
import { STORE_JOURNEYS, NETWORK_JOURNEYS } from "./journey-catalog"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"

export function getStoreJourneys(industryKey?: string | null): JourneyDefinition[] {
  if (!industryKey || industryKey === "FLORAL") {
    return STORE_JOURNEYS
  }
  const terms = getIndustryTerminology(industryKey)
  return STORE_JOURNEYS.map((j) => {
    switch (j.id) {
      case "greeting-card-hub":
        return {
          ...j,
          goal: "Bộ sưu tập riêng",
          description: `Gửi ${terms.catalogTitle.toLowerCase()} cho khách chọn mẫu, đặt hàng và thanh toán ngay trên điện thoại.`,
        }
      case "market-intelligence-explore":
        return {
          ...j,
          goal: "Xu hướng thị trường",
          description: `Biết khách thích kiểu dáng, màu sắc và mức giá nào để chuẩn bị hàng.`,
        }
      case "analyze-product-photo":
        return {
          ...j,
          goal: "Sản phẩm từ ảnh",
          description: `Chụp ảnh sản phẩm, AI nhận diện các chi tiết, ${terms.rawMaterialItem.toLowerCase()} và tạo sẵn mẫu để bán.`,
          steps: j.steps.map((s, idx) =>
            idx === 0
              ? { ...s, description: `Chọn ảnh ${terms.sampleProduct.toLowerCase()} cần phân tích` }
              : idx === 1
              ? { ...s, description: `Kiểm tra danh mục thành phần ${terms.rawMaterialItem.toLowerCase()} và thông số định giá` }
              : s
          ),
        }
      case "create-product-quote":
        return {
          ...j,
          description: `Soạn báo giá ${terms.sampleProduct.toLowerCase()} cho khách mua hoặc cho đối tác của cửa hàng.`,
        }
      case "create-audio-voiceover":
        return {
          ...j,
          description: `Chuyển bài viết thành giọng đọc để ghép vào video giới thiệu ${terms.sampleProduct.toLowerCase()}.`,
        }
      case "create-marketing-image":
        return {
          ...j,
          description: `Tách nền và đặt sản phẩm vào không gian studio hoặc sự kiện để có ảnh quảng cáo đẹp hơn.`,
        }
      case "create-product-video":
        return {
          ...j,
          goal: "Video sản phẩm",
          description: `Biến ảnh ${terms.sampleProduct.toLowerCase()} thành video ngắn để đăng Story, Reels, TikTok.`,
        }
      case "create-catalog-collection":
        return {
          ...j,
          goal: "Bộ sưu tập chung",
          description: `Tạo trang web ${terms.catalogTitle.toLowerCase()} kèm mã QR để in ấn hoặc gửi khách.`,
          steps: j.steps.map((s, idx) =>
            idx === 0 ? { ...s, label: `Tuyển chọn danh sách ${terms.sampleProduct.toLowerCase()}` } : s
          ),
        }
      case "create-order":
        return {
          ...j,
          description: `Theo dõi đơn từ lúc chốt, giao việc cho ${terms.makerTitle.toLowerCase()} đến khi sản phẩm tới tay người nhận.`,
        }
      case "manage-customers":
        return {
          ...j,
          description: `Lưu sở thích, ngày sinh nhật, ngày kỷ niệm và lịch sử mua sắm của khách quen.`,
        }
      case "launch-product-combo":
        return {
          ...j,
          goal: "Ra mắt sản phẩm mới",
          description: `Từ một ảnh chụp: nhận diện chi tiết, tạo ${terms.sampleProduct.toLowerCase()}, viết bài và làm ảnh quảng cáo.`,
        }
      case "customer-service-chatbot":
        return {
          ...j,
          goal: "Hỏi trợ lý smeOS",
          description: "Trợ lý AI giải đáp thắc mắc và hướng dẫn bạn dùng smeOS.",
        }
      default:
        return j
    }
  })
}

/**
 * Trả về danh mục Hành trình cho ChainOS (flower_network_admin / chain_admin).
 * Thay thế thuật ngữ hardcode "điện hoa / hoa" bằng từ điển ngành SSOT.
 */
export function getNetworkJourneys(industryKey?: string | null): JourneyDefinition[] {
  if (!industryKey || industryKey === "FLORAL") {
    return NETWORK_JOURNEYS
  }
  const terms = getIndustryTerminology(industryKey)
  return NETWORK_JOURNEYS.map((j) => {
    switch (j.id) {
      case "network-overview":
        return {
          ...j,
          goal: "Báo cáo mạng lưới",
          description: `Theo dõi dòng đơn điều phối, tỷ lệ nhận đơn và doanh số toàn mạng lưới`,
        }
      case "network-products":
        return {
          ...j,
          goal: "Sản phẩm mạng lưới",
          description: `Chuẩn hóa danh mục ${terms.sampleProduct.toLowerCase()} chung cho các thành viên nhận làm`,
        }
      case "network-sales":
        return {
          ...j,
          goal: "Bán hàng",
          description: `Tiếp nhận đơn hàng liên tỉnh và phân bổ nhanh chóng`,
        }
      case "network-dispatch":
        return {
          ...j,
          goal: "Điều phối đơn hàng",
          description: `Chuyển đơn ${terms.sampleProduct.toLowerCase()} tới đối tác gần điểm giao nhất`,
        }
      case "network-partners":
        return {
          ...j,
          goal: "Đối tác làm hàng",
          description: `Đánh giá chất lượng, tỷ lệ hoàn thành đúng hẹn của ${terms.makerTitle.toLowerCase()} đối tác`,
        }
      case "network-marketing":
        return {
          ...j,
          description: `Quảng bá thương hiệu mạng lưới và thúc đẩy lưu lượng đặt ${terms.sampleProduct.toLowerCase()} toàn quốc`,
        }
      case "network-finance":
        return {
          ...j,
          description: `Tính toán chi phí ${terms.makerTitle.toLowerCase()}, hoa hồng giới thiệu và thanh toán cho đối tác`,
        }
      default:
        return j
    }
  })
}
