/**
 * Danh mục công cụ smeOS (51 công cụ gốc + trang có sẵn ở app-page-tools.ts) — SSOT cho /cong-cu.
 *
 * Trạng thái mỗi công cụ:
 *   DONE        – Hoàn thiện, sẵn sàng dùng
 *   IN_PROGRESS – Đang phát triển, có UI/API nhưng chưa đủ spec
 *   FOUNDATION  – Nền tảng code sẵn, cần cấu trúc lại
 *   PLANNED     – Chưa có gì, cần xây mới hoàn toàn
 */
import { APP_PAGE_TOOLS } from "./app-page-tools"
// ── Types ──────────────────────────────────────────────────────────

export type ToolStatus = "DONE" | "IN_PROGRESS" | "FOUNDATION" | "PLANNED"

export type ToolLabel = "STORE" | "BOTH" | "CHAIN"

export interface ToolDefinition {
  /** Số thứ tự 00-50; số âm là công cụ trong lộ trình (business-modules.ts) */
  readonly id: number
  /** Tên chức năng tiếng Việt */
  readonly name: string
  /** Mô tả ngắn (1-2 câu) */
  readonly description: string
  /** Icon lucide-react */
  readonly icon: string
  /** Nhãn phân loại: Cửa hàng / Cả hai / Chuỗi */
  readonly label: ToolLabel
  /** Trạng thái phát triển */
  readonly status: ToolStatus
  /** Phần trăm hoàn thành (0-100) */
  readonly progress: number
  /** Đường dẫn đến trang chức năng nếu đã có */
  readonly href: string | null
  /** Ghi chú ngắn về trạng thái hiện tại */
  readonly statusNote: string
}

export interface ToolGroup {
  /** Số nhóm (1-8) */
  readonly groupNumber: number
  /** Tên nhóm */
  readonly name: string
  /** Mục tiêu của nhóm */
  readonly objective: string
  /** Icon nhóm */
  readonly icon: string
  /** Danh sách công cụ trong nhóm */
  readonly tools: readonly ToolDefinition[]
}

// ── Data ───────────────────────────────────────────────────────────

const GROUP_1_TOOLS: readonly ToolDefinition[] = [
  {
    id: 0, name: "Chế tác tự động trọn gói từ A-Z",
    description: "Quy trình AI tự động trọn gói từ 1 ảnh thô ra bộ tư liệu bán hàng đa kênh",
    icon: "Sparkles", label: "BOTH", status: "IN_PROGRESS", progress: 80,
    href: "/creative-studio", statusNote: "Đang hoàn thiện — hành trình 14 chặng: bóc tách BOM, ảnh studio, video, caption và thẻ chào",
  },
  {
    id: 1, name: "Tạo ảnh sản phẩm chuyên nghiệp",
    description: "Biến ảnh chụp thô thành ảnh sản phẩm chuẩn studio bằng AI",
    icon: "Camera", label: "BOTH", status: "DONE", progress: 100,
    href: "/cong-cu/anh-san-pham", statusNote: "Công cụ 01 — Provider Single-Call Studio",
  },
  {
    id: 2, name: "Tạo bộ ảnh sản phẩm từ một ảnh gốc",
    description: "Sinh nhiều biến thể tỉ lệ, phong cách, góc chụp từ một ảnh",
    icon: "Images", label: "BOTH", status: "DONE", progress: 100,
    href: "/cong-cu/bo-anh-san-pham", statusNote: "Công cụ 02 — Provider Single-Call Image Set Studio",
  },
  {
    id: 3, name: "Tạo thẻ chào sản phẩm",
    description: "Tạo thẻ giới thiệu mẫu sản phẩm dạng ảnh, sẵn sàng gửi hoặc đăng",
    icon: "CreditCard", label: "BOTH", status: "DONE", progress: 100,
    href: "/tai-anh?tab=m01c", statusNote: "Công cụ 03 — Thẻ chào đa kích thước A6/1:1/Story, xuất ảnh & Zalo Script",
  },
  {
    id: 4, name: "Tạo nội dung bán hàng",
    description: "Sinh tên, mô tả, caption, CTA, hashtag đa kênh cho sản phẩm",
    icon: "FileText", label: "BOTH", status: "DONE", progress: 100,
    href: "/noi-dung", statusNote: "M04 — Content Engine hoàn chỉnh 4+ kênh",
  },
  {
    id: 5, name: "Tạo poster và banner quảng cáo",
    description: "Tạo bộ thiết kế quảng cáo nhiều kích thước theo dịp và chương trình",
    icon: "Presentation", label: "BOTH", status: "DONE", progress: 100,
    href: "/cong-cu/poster-banner", statusNote: "Công cụ 05 — Provider Single-Call & Template Hybrid Engine",
  },
  {
    id: 6, name: "Tạo video giới thiệu sản phẩm",
    description: "Dựng video ngắn từ ảnh sản phẩm với hiệu ứng và nhạc nền",
    icon: "Video", label: "BOTH", status: "IN_PROGRESS", progress: 50,
    href: "/video", statusNote: "Đang phát triển — hoàn thiện pipeline video marketing",
  },
  {
    id: 7, name: "Tạo thiệp và lời chúc",
    description: "Tạo thiệp cá nhân hóa kèm lời chúc cho người nhận theo dịp",
    icon: "Heart", label: "BOTH", status: "PLANNED", progress: 0,
    href: null, statusNote: "Chức năng mới — khác module greeting-card hiện tại",
  },
] as const

const GROUP_2_TOOLS: readonly ToolDefinition[] = [
  {
    id: 8, name: "Tạo landing page cửa hàng",
    description: "Tạo trang giới thiệu trực tuyến có link chia sẻ",
    icon: "Globe", label: "BOTH", status: "DONE", progress: 100,
    href: "/landing-page", statusNote: "Trang giới thiệu cửa hàng có link chia sẻ — chuẩn UX 03c",
  },
  {
    id: 9, name: "Tạo catalog và bộ sưu tập",
    description: "Tổ chức sản phẩm theo danh mục với link chia sẻ và bộ lọc",
    icon: "BookOpen", label: "STORE", status: "DONE", progress: 100,
    href: "/catalog", statusNote: "Showroom số hoá theo danh mục, link chia sẻ và bộ lọc — chuẩn UX 03c",
  },
  {
    id: 10, name: "Tạo trang giới thiệu dịch vụ",
    description: "Trang dịch vụ công khai với ảnh, quy trình, gói dịch vụ và nút báo giá",
    icon: "Briefcase", label: "BOTH", status: "PLANNED", progress: 0,
    href: null, statusNote: "Chức năng mới — output là trang web công khai",
  },
  {
    id: 11, name: "Tạo hồ sơ cửa hàng chia sẻ nhanh",
    description: "Trang one-page có bản đồ, nút gọi/nhắn tin và link ngắn",
    icon: "Store", label: "STORE", status: "DONE", progress: 100,
    href: "/ho-so", statusNote: "Trang công khai có nút gọi, Zalo, chỉ đường; tạo và ngừng link ở Hồ sơ cửa hàng",
  },
  {
    id: 12, name: "Tạo QR code cửa hàng và sản phẩm",
    description: "Sinh mã QR với logo, khung thiết kế và thống kê lượt quét",
    icon: "QrCode", label: "BOTH", status: "IN_PROGRESS", progress: 80,
    href: "/thu-hut-khach", statusNote: "QR động (đổi đích không in lại), logo + dòng mời, bản in SVG, thống kê lượt quét theo ngày/thiết bị",
  },
] as const

const GROUP_3_TOOLS: readonly ToolDefinition[] = [
  {
    id: 13, name: "Tạo link bán hàng",
    description: "Link bán hàng riêng cho từng sản phẩm với tùy chọn và nút đặt mua",
    icon: "Link", label: "STORE", status: "IN_PROGRESS", progress: 50,
    href: "/thu-hut-khach", statusNote: "Link ngắn có thống kê và nguồn chiến dịch trỏ tới catalog/trang sản phẩm; chưa có chọn phiên bản + thanh toán ngay trên link",
  },
  {
    id: 14, name: "Tạo catalog bán hàng theo nhu cầu",
    description: "Bộ sưu tập sản phẩm chọn lọc theo nhu cầu khách",
    icon: "ShoppingBag", label: "STORE", status: "DONE", progress: 100,
    href: "/the-chao?quick=true", statusNote: "Tư vấn chốt đơn 1-1 — tạo nhanh BST theo ngân sách & dịp (<10s)",
  },
  {
    id: 15, name: "Tạo báo giá theo yêu cầu",
    description: "Báo giá cá nhân hóa nhiều phương án từ công thức giá vốn",
    icon: "Receipt", label: "STORE", status: "PLANNED", progress: 0,
    href: null, statusNote: "Chức năng mới — báo giá cá nhân hóa nhiều phương án từ công thức giá vốn",
  },
  {
    id: 16, name: "Tạo báo giá sự kiện và doanh nghiệp",
    description: "Báo giá nhiều hạng mục cho sự kiện lớn, kèm điều khoản",
    icon: "FileSpreadsheet", label: "BOTH", status: "FOUNDATION", progress: 25,
    href: null, statusNote: "Nền tảng giá có, thiếu UI báo giá sự kiện",
  },
  {
    id: 17, name: "Tạo form đặt hoa theo yêu cầu",
    description: "Form nhận yêu cầu đặt hoa từ khách, tự động thông báo cửa hàng",
    icon: "ClipboardList", label: "BOTH", status: "PLANNED", progress: 0,
    href: null, statusNote: "Chức năng mới — form nhận yêu cầu đặt hàng tùy chỉnh độc lập",
  },
  {
    id: 18, name: "Tạo gói hoa và combo quà tặng",
    description: "Ghép sản phẩm thành gói với giá gói và ảnh mô tả",
    icon: "Gift", label: "STORE", status: "FOUNDATION", progress: 30,
    href: null, statusNote: "Dữ liệu sản phẩm có, thiếu UI tạo combo",
  },
  {
    id: 19, name: "Tạo gói đặt hoa định kỳ",
    description: "Gói dịch vụ định kỳ với lịch giao tự sinh và nhắc thanh toán",
    icon: "CalendarClock", label: "STORE", status: "PLANNED", progress: 0,
    href: null, statusNote: "Chức năng mới hoàn toàn",
  },
  {
    id: 20, name: "Tạo trang xác nhận và thanh toán",
    description: "Trang riêng cho khách xem tóm tắt đơn, xác nhận và thanh toán/đặt cọc",
    icon: "CreditCard", label: "STORE", status: "PLANNED", progress: 0,
    href: null, statusNote: "Chức năng mới — cần input/output mới hoàn toàn",
  },
] as const

const GROUP_4_TOOLS: readonly ToolDefinition[] = [
  {
    id: 21, name: "Tạo form thu thập khách hàng tiềm năng",
    description: "Form thu lead kèm ưu đãi, theo dõi nguồn và gán người phụ trách",
    icon: "UserPlus", label: "BOTH", status: "IN_PROGRESS", progress: 70,
    href: "/thu-hut-khach?tab=leads", statusNote: "Form trên trang catalog: chống spam, đồng ý liên hệ, ghi nguồn; khách vào CRM; theo dõi trạng thái. Chưa có trình dựng form riêng, tự phân công",
  },
  {
    id: 22, name: "Tạo chiến dịch thu hút khách hàng",
    description: "Bộ chiến dịch: nội dung, thiết kế, trang đích, form, lịch đăng",
    icon: "Megaphone", label: "STORE", status: "IN_PROGRESS", progress: 40,
    href: "/lich-dang", statusNote: "Lịch đăng + SocialFlow có, thiếu trang đích + form lead",
  },
  {
    id: 23, name: "Tạo chương trình giới thiệu khách hàng",
    description: "Cấp mã/link giới thiệu, ghi nhận lượt và cộng quyền lợi",
    icon: "Users", label: "BOTH", status: "PLANNED", progress: 0,
    href: null, statusNote: "Chức năng mới hoàn toàn",
  },
  {
    id: 24, name: "Tạo khảo sát nhu cầu khách hàng",
    description: "Khảo sát online gửi khách, tổng hợp thống kê và nhóm sở thích",
    icon: "ClipboardCheck", label: "BOTH", status: "PLANNED", progress: 0,
    href: null, statusNote: "Chức năng mới hoàn toàn",
  },
  {
    id: 25, name: "Tạo điểm thu hút khách qua QR code",
    description: "QR kèm lời mời, trang đích ưu đãi và thống kê theo vị trí",
    icon: "ScanLine", label: "BOTH", status: "IN_PROGRESS", progress: 75,
    href: "/thu-hut-khach", statusNote: "Mỗi điểm đặt một mã, thống kê lượt quét và số khách để lại thông tin theo vị trí",
  },
  {
    id: 49, name: "Khám phá xu hướng & cơ hội thị trường",
    description: "Nghiên cứu thị trường, phong cách thiết kế hot và cơ hội bán hàng theo mùa vụ",
    icon: "TrendingUp", label: "BOTH", status: "DONE", progress: 100,
    href: "/market-intelligence", statusNote: "Chức năng 03 hợp nhất — AI Market Intelligence & Seasonal Trend",
  },
] as const

const GROUP_5_TOOLS: readonly ToolDefinition[] = [
  {
    id: 26, name: "Tạo nội dung chăm sóc khách hàng",
    description: "Tin nhắn cá nhân hóa theo tình huống: cảm ơn, hỏi thăm, chúc mừng",
    icon: "MessageSquareHeart", label: "STORE", status: "PLANNED", progress: 0,
    href: null, statusNote: "Chức năng mới — tạo kịch bản chăm sóc khách hàng tự động",
  },
  {
    id: 27, name: "Tạo chiến dịch chăm sóc và bán lại",
    description: "Phân nhóm khách cũ, soạn thông điệp, lập lịch gửi và mã ưu đãi",
    icon: "Repeat", label: "STORE", status: "FOUNDATION", progress: 35,
    href: null, statusNote: "CRM data có, thiếu UI chiến dịch bán lại",
  },
  {
    id: 28, name: "Tạo lịch nhắc dịp quan trọng",
    description: "Ghi nhận dịp, tự nhắc trước 7-14 ngày kèm gợi ý sản phẩm",
    icon: "Bell", label: "STORE", status: "FOUNDATION", progress: 30,
    href: null, statusNote: "Domain logic có (scan-upcoming-reminders), thiếu UI riêng",
  },
  {
    id: 29, name: "Tạo chương trình khách hàng thân thiết",
    description: "Tích điểm, xếp hạng thành viên, tự động áp quyền lợi",
    icon: "Award", label: "BOTH", status: "FOUNDATION", progress: 20,
    href: null, statusNote: "CRM RFM segmentation có, thiếu chương trình điểm/hạng",
  },
  {
    id: 30, name: "Tạo gợi ý bán thêm và bán chéo",
    description: "Ghép sản phẩm bổ sung theo dịp, hiển thị khi khách đặt hàng",
    icon: "ShoppingCart", label: "STORE", status: "FOUNDATION", progress: 25,
    href: null, statusNote: "Dữ liệu sản phẩm có, thiếu quy tắc ghép + UI gợi ý",
  },
] as const

const GROUP_6_TOOLS: readonly ToolDefinition[] = [
  {
    id: 31, name: "Tạo công thức và định mức nguyên liệu",
    description: "Ghi công thức chuẩn cho từng mẫu: thành phần, số lượng, thời gian",
    icon: "FlaskConical", label: "BOTH", status: "DONE", progress: 100,
    href: "/tinh-gia/cong-thuc", statusNote: "Công thức theo mẫu, bản nháp đọc từ ảnh, hao hụt và thời gian làm",
  },
  {
    id: 32, name: "Quản lý bảng giá nguyên liệu",
    description: "Lưu giá nhập, lịch sử biến động, cảnh báo khi giá thay đổi",
    icon: "Table", label: "BOTH", status: "DONE", progress: 100,
    href: "/tinh-gia/nguyen-lieu", statusNote: "Nguyên liệu, đơn giá, nhà cung cấp, lịch sử giá và cảnh báo biến động",
  },
  {
    id: 33, name: "Tính giá vốn sản phẩm",
    description: "Tự tính giá vốn từ công thức × đơn giá + nhân công + bao bì",
    icon: "Calculator", label: "STORE", status: "DONE", progress: 100,
    href: "/tinh-gia/gia-von", statusNote: "Giá vốn đủ nguyên liệu, hao hụt, tiền công, bao bì, chi phí chung",
  },
  {
    id: 34, name: "Đề xuất giá bán và lợi nhuận",
    description: "Mô phỏng nhiều mức giá, tính lợi nhuận dự kiến, cảnh báo ngưỡng",
    icon: "TrendingUp", label: "BOTH", status: "DONE", progress: 100,
    href: "/tinh-gia/gia-ban", statusNote: "3 mức giá theo ngành, so với đối thủ, áp giá có xác nhận và ghi nhật ký",
  },
  {
    id: 35, name: "Lập dự toán và nhu cầu mua nguyên liệu",
    description: "Cộng dồn nguyên liệu theo đơn, trừ tồn kho, ước chi phí mua",
    icon: "ClipboardList", label: "STORE", status: "DONE", progress: 100,
    href: "/tinh-gia/du-toan", statusNote: "Cộng dồn nguyên liệu theo đơn sắp giao, trừ tồn, ghi nhận đã mua",
  },
] as const

const GROUP_7_TOOLS: readonly ToolDefinition[] = [
  {
    id: 36, name: "Tạo phiếu sản xuất và hướng dẫn",
    description: "Phiếu in/xem trên điện thoại: ảnh mẫu, nguyên liệu, các bước, lưu ý",
    icon: "Hammer", label: "STORE", status: "FOUNDATION", progress: 35,
    href: "/don-hang", statusNote: "API print + RBAC R7 có, thiếu UI phiếu + giao việc thợ",
  },
  {
    id: 37, name: "Tạo checklist kiểm soát chất lượng",
    description: "Checklist theo đơn: đúng mẫu, màu, độ tươi, đóng gói, chặn giao nếu chưa đạt",
    icon: "ListChecks", label: "STORE", status: "FOUNDATION", progress: 30,
    href: null, statusNote: "Prisma order_qc_records có, thiếu UI checklist",
  },
  {
    id: 38, name: "Tạo link duyệt ảnh trước khi giao",
    description: "Gửi ảnh sản phẩm thật cho khách duyệt trước khi giao",
    icon: "Image", label: "STORE", status: "PLANNED", progress: 0,
    href: null, statusNote: "Chức năng mới — link duyệt ảnh độc lập trước khi giao hàng",
  },
  {
    id: 39, name: "Tạo phiếu giao hàng",
    description: "Phiếu giao A6 có địa chỉ, liên hệ, lưu ý, link bản đồ",
    icon: "Truck", label: "STORE", status: "IN_PROGRESS", progress: 45,
    href: "/don-hang", statusNote: "Template A6 + POD có, thiếu UI chuyên biệt + bản đồ",
  },
  {
    id: 40, name: "Lập lịch sản xuất và giao hàng",
    description: "Xếp lịch theo năng lực, cảnh báo quá tải, phân bổ việc",
    icon: "CalendarDays", label: "STORE", status: "IN_PROGRESS", progress: 40,
    href: "/don-hang", statusNote: "Kanban đơn có, thiếu calendar view + phân bổ",
  },
  {
    id: 41, name: "Theo dõi kết quả thực hiện đơn",
    description: "Bảng trạng thái đơn realtime, cảnh báo trễ, lịch sử chi tiết",
    icon: "Activity", label: "STORE", status: "IN_PROGRESS", progress: 55,
    href: "/don-hang", statusNote: "Kanban + status tracking có, thiếu cảnh báo + analytics",
  },
] as const

const GROUP_8_TOOLS: readonly ToolDefinition[] = [
  {
    id: 42, name: "Tạo danh bạ và bản đồ cửa hàng",
    description: "Trang danh bạ mạng lưới với bản đồ, bộ lọc khu vực và link mua",
    icon: "MapPin", label: "CHAIN", status: "FOUNDATION", progress: 20,
    href: null, statusNote: "Multi-branch model có, thiếu UI danh bạ công khai",
  },
  {
    id: 43, name: "Tạo catalog sản phẩm chung toàn chuỗi",
    description: "Catalog đa cửa hàng, dẫn khách đến cửa hàng có thể làm mẫu",
    icon: "Library", label: "CHAIN", status: "FOUNDATION", progress: 20,
    href: null, statusNote: "Catalog cửa hàng có, thiếu gom đa cửa hàng",
  },
  {
    id: 44, name: "Tạo chiến dịch bán hàng chung toàn chuỗi",
    description: "Chiến dịch thương hiệu phát cho nhiều cửa hàng kèm mã theo dõi",
    icon: "Radio", label: "CHAIN", status: "PLANNED", progress: 0,
    href: null, statusNote: "Chức năng mới hoàn toàn",
  },
  {
    id: 45, name: "Tạo bộ nhận diện và thư viện nội dung",
    description: "Thư viện tài nguyên thương hiệu có phân quyền và phiên bản",
    icon: "Palette", label: "BOTH", status: "DONE", progress: 100,
    href: "/ho-so/thu-vien-thuong-hieu", statusNote: "Thư viện logo, màu, phông, mẫu, câu chữ có phiên bản; chuỗi chia sẻ cho cửa hàng thành viên",
  },
  {
    id: 46, name: "Chuẩn hóa báo giá và tiêu chuẩn dịch vụ",
    description: "Bộ mẫu và tiêu chuẩn chung, tích hợp vào công cụ cửa hàng",
    icon: "Shield", label: "CHAIN", status: "FOUNDATION", progress: 20,
    href: null, statusNote: "Policy matrix có, thiếu phát hành chuẩn cho chuỗi",
  },
  {
    id: 47, name: "Theo dõi hiệu quả cửa hàng thành viên",
    description: "Báo cáo hiệu quả mạng lưới: doanh thu, lead, xếp hạng cửa hàng",
    icon: "BarChart3", label: "CHAIN", status: "FOUNDATION", progress: 15,
    href: null, statusNote: "Dữ liệu đơn hàng có, thiếu dashboard chuỗi",
  },
  {
    id: 48, name: "Phát triển mạng lưới cửa hàng mới",
    description: "Bộ công cụ tiếp nhận thành viên: form, quy trình, tài liệu, kích hoạt",
    icon: "Network", label: "CHAIN", status: "PLANNED", progress: 0,
    href: null, statusNote: "Chức năng mới hoàn toàn",
  },
] as const

const GROUP_9_TOOLS: readonly ToolDefinition[] = [
  {
    id: 50, name: "Trợ lý Học máy & Tối ưu Tác nghiệp",
    description: "Nhận diện thói quen tác nghiệp, hiệu quả chuyển đổi và đề xuất cải tiến toàn hệ thống",
    icon: "Brain", label: "BOTH", status: "FOUNDATION", progress: 30,
    // Chưa có trang (audit hành trình N1, UJ-05) — thẻ hiện ở danh mục nhưng không bấm vào trang 404.
    href: null, statusNote: "Chức năng 13 hợp nhất — System Learning & Operations Optimizer",
  },
] as const

// ── Registry ───────────────────────────────────────────────────────

export const TOOLKIT_GROUPS: readonly ToolGroup[] = [
  {
    groupNumber: 1,
    name: "Tạo hình ảnh và nội dung bán hàng",
    objective: "Biến ảnh chụp, ý tưởng và thông tin sản phẩm thành tài liệu bán hàng sẵn sàng đăng và gửi khách",
    icon: "Palette",
    tools: GROUP_1_TOOLS,
  },
  {
    groupNumber: 2,
    name: "Xây dựng thương hiệu và trang trực tuyến",
    objective: "Có hiện diện trực tuyến chuyên nghiệp và các trang giới thiệu có link để chia sẻ",
    icon: "Globe",
    tools: GROUP_2_TOOLS,
  },
  {
    groupNumber: 3,
    name: "Bán hàng và chốt đơn",
    objective: "Đưa khách từ xem sản phẩm đến báo giá, xác nhận và thanh toán",
    icon: "ShoppingCart",
    tools: GROUP_3_TOOLS,
  },
  {
    groupNumber: 4,
    name: "Thu hút khách hàng và tạo cơ hội",
    objective: "Tìm người quan tâm, thu thập thông tin và đưa họ vào quy trình tư vấn",
    icon: "Target",
    tools: GROUP_4_TOOLS,
  },
  {
    groupNumber: 5,
    name: "Chăm sóc khách hàng và tăng doanh thu",
    objective: "Giữ quan hệ với khách cũ, tăng số lần mua lại và giá trị mỗi đơn",
    icon: "Heart",
    tools: GROUP_5_TOOLS,
  },
  {
    groupNumber: 6,
    name: "Tính giá và tối ưu lợi nhuận",
    objective: "Biết rõ chi phí, định giá có căn cứ và chuẩn bị nguyên liệu đúng nhu cầu",
    icon: "Calculator",
    tools: GROUP_6_TOOLS,
  },
  {
    groupNumber: 7,
    name: "Sản xuất, kiểm soát và giao hàng",
    objective: "Thực hiện đúng yêu cầu của khách, kiểm soát chất lượng và giao đúng hẹn",
    icon: "Package",
    tools: GROUP_7_TOOLS,
  },
  {
    groupNumber: 8,
    name: "Phát triển và quản lý chuỗi cửa hàng",
    objective: "Tạo giá trị chung, hỗ trợ cửa hàng thành viên và mở rộng mạng lưới",
    icon: "Building2",
    tools: GROUP_8_TOOLS,
  },
  {
    groupNumber: 9,
    name: "Tối ưu hóa và học máy hệ thống",
    objective: "Học từ lịch sử sử dụng của tiệm và đề xuất cách cải tiến hiệu quả kinh doanh",
    icon: "Brain",
    tools: GROUP_9_TOOLS,
  },
] as const

// ── Helpers ────────────────────────────────────────────────────────

/** Trả tất cả công cụ flat */
export function getAllTools(): ToolDefinition[] {
  return [...TOOLKIT_GROUPS.flatMap((g) => [...g.tools]), ...APP_PAGE_TOOLS]
}

/**
 * Lọc nhóm + công cụ theo môi trường:
 * - Dev: toàn bộ 51 chức năng phân 9 nhóm
 * - Prod: chỉ hiện chức năng DONE
 */
export function getVisibleGroups(isDev: boolean): ToolGroup[] {
  if (isDev) return [...TOOLKIT_GROUPS]

  return TOOLKIT_GROUPS
    .map((group) => ({
      ...group,
      tools: group.tools.filter((t) => t.status === "DONE"),
    }))
    .filter((group) => group.tools.length > 0)
}

/** Đếm số lượng theo trạng thái */
export function countByStatus(): Record<ToolStatus, number> {
  const all = getAllTools()
  return {
    DONE: all.filter((t) => t.status === "DONE").length,
    IN_PROGRESS: all.filter((t) => t.status === "IN_PROGRESS").length,
    FOUNDATION: all.filter((t) => t.status === "FOUNDATION").length,
    PLANNED: all.filter((t) => t.status === "PLANNED").length,
  }
}

/** Label hiển thị cho trạng thái */
export const STATUS_DISPLAY: Record<ToolStatus, { label: string; emoji: string }> = {
  DONE: { label: "Hoàn thiện", emoji: "✅" },
  IN_PROGRESS: { label: "Đang phát triển", emoji: "🔨" },
  FOUNDATION: { label: "Nền tảng sẵn", emoji: "🏗️" },
  PLANNED: { label: "Sẽ phát triển", emoji: "📋" },
}

/** Label hiển thị cho nhãn phân loại */
export const LABEL_DISPLAY: Record<ToolLabel, string> = {
  STORE: "Cửa hàng",
  BOTH: "Cả hai",
  CHAIN: "Chuỗi",
}
