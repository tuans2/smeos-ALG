/**
 * Trang đã có trong app nhưng chưa nằm trong danh mục 51 công cụ gốc (PO 30/10/2026).
 *
 * Rà soát đồng bộ ở `docs/kien-truc/Nâng cấp tasks/SMEOS_Marketing_Sales_Center/02_DANH_MUC_ASSET.md`.
 * Mức hoàn thiện của từng trang CHƯA được đánh giá, nên tạm để IN_PROGRESS (production chưa hiện);
 * đổi sang DONE sau khi rà soát từng trang.
 */

import type { ToolDefinition } from "./toolkit-catalog"

const NOT_ASSESSED = "Trang đã có trong app — chưa đánh giá mức hoàn thiện"

function appPage(
  id: number, name: string, description: string, icon: string, href: string,
): ToolDefinition {
  return { id, name, description, icon, label: "STORE", status: "IN_PROGRESS", progress: 0, href, statusNote: NOT_ASSESSED }
}

export const APP_PAGE_TOOLS: readonly ToolDefinition[] = [
  {
    ...appPage(51, "Hồ sơ cửa hàng và thương hiệu", "Tên, logo, liên hệ và thông tin thương hiệu dùng chung cho mọi công cụ", "Store", "/ho-so"),
    status: "DONE", progress: 100,
    statusNote: "Tổng quan mức hoàn thiện hồ sơ, mục cần điền tiếp và dẫn đến chỗ sửa",
  },
  {
    ...appPage(64, "Danh thiếp cửa hàng", "Danh thiếp 90×54 mm từ hồ sơ cửa hàng: bản in PDF, ảnh và danh bạ điện tử", "IdCard", "/ho-so/danh-thiep"),
    status: "DONE", progress: 100,
    statusNote: "Xem trước hai mặt, mã QR trỏ trang chia sẻ, tải PDF in, ảnh 300 dpi và tệp danh bạ",
  },
  appPage(52, "Kho mẫu ấn phẩm", "Mẫu thiết kế có sẵn để tạo ấn phẩm theo thương hiệu", "LayoutTemplate", "/kho-templates"),
  appPage(53, "Quản lý sản phẩm và hình ảnh", "Danh sách sản phẩm, ảnh và nhập hàng loạt từ Excel", "Package", "/san-pham"),
  appPage(54, "Kết nối kênh bán hàng", "Kết nối trang mạng xã hội và kênh nhắn tin của cửa hàng", "Link", "/ket-noi"),
  appPage(55, "Quản lý khách hàng", "Thông tin, ghi chú và lịch sử của từng khách", "Users", "/khach-hang"),
  appPage(56, "Trao đổi nội bộ", "Nhắn tin với chuỗi, chi nhánh và cửa hàng đối tác; nhận đơn gia công", "Inbox", "/tin-nhan"),
  appPage(57, "Trợ lý tư vấn bán hàng AI", "Trợ lý gợi ý câu trả lời và tư vấn sản phẩm cho khách", "Bot", "/hoi-thoai"),
  {
    ...appPage(58, "Báo giá nhanh", "Lập báo giá từ sản phẩm có sẵn và gửi cho khách", "FileText", "/bao-gia"),
    status: "DONE",
    progress: 100,
    statusNote: "Báo giá có số hiệu lực, tính tiền, gửi khách qua link công khai, chuyển đổi thành đơn hàng",
  },
  appPage(59, "Quản lý đơn hàng", "Theo dõi đơn, xác nhận thanh toán và tạo đơn từ tin nhắn", "ShoppingBag", "/don-hang"),
  appPage(60, "Điều phối đơn hàng", "Chuyển đơn đến cửa hàng phù hợp để thực hiện", "Route", "/dieu-phoi"),
  // Cùng dữ liệu với Cài đặt → Ưu đãi (`/cai-dat/ma-tran-uudai`) — hai nơi hiển thị, một nguồn
  appPage(61, "Ưu đãi và giảm giá", "Thiết lập các chương trình ưu đãi đang áp dụng", "Percent", "/uu-dai"),
  appPage(62, "Thanh toán và đặt cọc", "Cách thanh toán và mức đặt cọc áp dụng cho đơn hàng", "Wallet", "/cai-dat/ma-tran-thanhtoan-datco"),
  appPage(63, "Số liệu kinh doanh", "Báo cáo hiệu quả bán hàng và khách hàng", "BarChart3", "/so-lieu"),
  {
    ...appPage(65, "Bảng giá sản phẩm", "Bảng giá gửi khách hoặc in tại quầy, lấy giá đang bán của sản phẩm", "FileSpreadsheet", "/bang-gia"),
    status: "DONE", progress: 100,
    statusNote: "Nhiều bảng giá theo loại sản phẩm, công tắc đang dùng, thời hạn, in kèm ưu đãi đang bật, in hoặc lưu PDF",
  },
  {
    ...appPage(66, "Phát hành mã giảm giá", "Tạo mã chung hoặc hàng loạt mã riêng cho khách nhập khi đặt hàng", "Ticket", "/uu-dai/ma-giam-gia"),
    status: "DONE", progress: 100,
    statusNote: "Mã chung hoặc mã riêng, giới hạn lượt và thời hạn, gắn theo công tắc ưu đãi, tạm dừng cả đợt, tải CSV",
  },
]
