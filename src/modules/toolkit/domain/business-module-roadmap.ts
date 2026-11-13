/**
 * Lộ trình AI và công cụ mục tiêu theo 6 Business Modules (PO 01/11/2026).
 *
 * Chỉ hiển thị ở môi trường phát triển (dev) với nhãn "Sẽ phát triển".
 */

import type { BusinessModuleKey } from "@/modules/marketing-center/domain/asset-type"

export const BUSINESS_MODULE_ROADMAP: Readonly<Record<BusinessModuleKey, readonly string[]>> = {
  brand: [
    "Trợ lý thương hiệu AI",
    "Gợi ý nội dung theo thương hiệu",
    "Kiểm tra tính nhất quán thương hiệu",
  ],
  content: [
    "Tự động tạo video từ ảnh sản phẩm",
    "Gợi ý kịch bản video theo xu hướng",
    "Tối ưu hóa hình ảnh theo kênh",
  ],
  promotion: [
    "Tự động hoá chiến dịch",
    "Tự động phân phối nội dung",
    "Tối ưu chiến dịch quảng cáo",
    "Kết nối hồ sơ Google của cửa hàng",
    "Kết nối quảng cáo Facebook",
    "Kết nối quảng cáo Google",
    "Tối ưu tìm kiếm (SEO)",
    "Tìm khách tiềm năng bằng AI",
    "Chấm điểm khách tiềm năng",
  ],
  sales: [
    "Nhận biết nhu cầu khách bằng AI",
    "Tuỳ chỉnh sản phẩm theo yêu cầu",
    "Trợ lý báo giá AI",
    "Cấu hình sản phẩm bằng AI",
    "Tự động nhắc báo giá",
    "Phân tích báo giá",
  ],
  care: [
    "Thu thập đánh giá tự động",
    "Phân tích mức hài lòng",
    "Phân loại khiếu nại",
    "Dự đoán nhu cầu mua lại",
    "Marketing cá nhân hoá",
    "Phân tích giá trị vòng đời khách",
    "Dự báo khách rời bỏ",
  ],
  print: [
    "Kiểm tra quy chuẩn in ấn tự động",
    "Xuất file in PDF chuẩn màu CMYK",
    "Kết nối nhà in ấn trực tuyến",
  ],
}
