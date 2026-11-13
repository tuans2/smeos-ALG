/**
 * Danh mục 14 vai trải nghiệm (Role UX) — nguồn chuẩn trong mã của
 * `docs/dac-ta/03b-role-ux.md` (PO duyệt 26/09/2026, contract
 * ALG-UX-ROLE-001 v1.1).
 *
 * VAI TRẢI NGHIỆM ≠ VAI PHÂN QUYỀN. Bảng `roles` (vai phân quyền, bản ghi) và
 * mã năng lực vẫn quyết định người dùng LÀM ĐƯỢC gì. Danh mục này chỉ quyết
 * định người dùng THẤY GÌ TRƯỚC: trang chủ, thứ tự điều hướng, câu hỏi chính,
 * hành động chính. Không có hàm nào ở đây mở thêm quyền — mọi màn vẫn ẩn nút
 * theo `can(code)` và máy chủ vẫn kiểm lại ở mọi endpoint.
 *
 * Luật thuần — không import Prisma, không import React.
 */

import { OPERATIONS_ROLE_UX } from "./role-ux-operations"

export type RoleUxKey =
  | "platform_admin"
  | "industry_admin"
  | "store_admin"
  | "store_manager" // backward-compatibility alias for store_admin
  | "flower_network_admin"
  | "sales"
  | "crm"
  | "lead_marketing"
  | "ceo"
  | "manager"
  | "coordinator"
  | "quality_control"
  | "customer_service"
  | "partner_manager"
  | "marketing"
  | "product_manager"
  | "finance_accounting"
  | "florist"
  | "shipper"

export type RoleUxGroup = "PLATFORM" | "STORE" | "FLOWER_NETWORK" | "ONE_STORE" | "CHAIN"

/**
 * `AVAILABLE` — đã có dữ liệu + luồng thật, đã có trang chủ theo vai.
 * `IN_DEVELOPMENT` — hiển thị trong danh mục nhưng KHÔNG chọn/gán được;
 * mỗi vai trỏ tới một dòng nợ ở `docs/dac-ta/TECHNICAL_DEBT.md`.
 */
export type RoleUxStatus = "AVAILABLE" | "IN_DEVELOPMENT"

export type RoleUxHomepage =
  | "STORE_JOURNEY_HOME"
  | "NETWORK_JOURNEY_HOME"
  | "PLATFORM_JOURNEY_HOME"
  | "INDUSTRY_JOURNEY_HOME"
  | "CONTROL_CENTER"
  | "STORE_COMMAND_CENTER"
  | "STORE_GROWTH_CENTER"
  | "FLOWER_NETWORK_COMMAND_CENTER"
  | "SALES_WORKSPACE"
  | "PRODUCT_WORKSPACE"
  | "CREATIVE_WORKSPACE"
  | "CRM_WORKSPACE"
  | "CUSTOMER_SERVICE_WORKSPACE"
  | "CONTROL_TOWER"
  | "TOOLKIT_HOME"
  | "FLORIST_QUEUE"
  | "SHIPPER_DELIVERIES"
  | "ACCOUNTING_WORKSPACE"
  | "NOT_BUILT"

export interface RoleUxDefinition {
  key: RoleUxKey
  label: string
  group: RoleUxGroup
  primaryPhilosophy: string
  supportingPhilosophies: readonly string[]
  mission: string
  primaryQuestion: string
  homepageModel: string
  dominantActions: readonly string[]
  status: RoleUxStatus
  homepage: RoleUxHomepage
  /** Vai phân quyền (`roles.key`) đang mang khuôn trải nghiệm này. */
  systemRoleKeys: readonly string[]
  /** Nơi vào của vai — route hiện có, không tạo route mới. */
  entryHref: string | null
  /**
   * Điều hướng ưu tiên (desktop: nhóm "Việc chính", mobile: ô thứ hai của
   * thanh dưới lấy mục đầu tiên). Chỉ là THỨ TỰ — mục bị ẩn theo năng lực
   * vẫn bị ẩn.
   */
  navPriority: readonly string[]
  /** Số nợ ở TECHNICAL_DEBT.md cho phần còn thiếu của vai. */
  debtRefs: readonly number[]
}

export const ROLE_UX_CATALOG: readonly RoleUxDefinition[] = [
  {
    key: "platform_admin",
    label: "Quản trị nền tảng",
    group: "PLATFORM",
    primaryPhilosophy: "Governance & Control",
    supportingPhilosophies: ["Control Tower"],
    mission: "Quản trị cấu hình, chuẩn dữ liệu, phạm vi và hành vi toàn nền tảng.",
    primaryQuestion: "Cấu hình nào đang lệch hoặc cần áp dụng?",
    homepageModel: "Platform Journey Home",
    dominantActions: ["Cấu hình", "Kiểm tra", "Áp dụng"],
    status: "AVAILABLE",
    homepage: "PLATFORM_JOURNEY_HOME",
    // Không phải vai của tổ chức: cấp qua `platform_operators` (D-N6) hoặc roleKey platform_admin.
    systemRoleKeys: [],
    entryHref: "/van-hanh",
    navPriority: [],
    debtRefs: [],
  },
  {
    key: "industry_admin",
    label: "Quản trị SaaS Đa Ngành",
    group: "PLATFORM",
    primaryPhilosophy: "Multi-Industry Ecosystem & Standardization",
    supportingPhilosophies: ["Industry Benchmarks", "Plugin Contract SSOT"],
    mission: "Quản trị, chuẩn hóa và tối ưu hóa hệ sinh thái đa ngành (BOM, Taxonomy, AI Studio, Mẫu in ấn A6 và Tiêu chuẩn ngành).",
    primaryQuestion: "Hệ sinh thái ngành nào cần chuẩn hóa hoặc cập nhật tiêu chuẩn hôm nay?",
    homepageModel: "Industry Command Center",
    dominantActions: ["Chuẩn hóa", "Cấu hình AI", "Quản lý Ngành", "Định lượng BOM"],
    status: "AVAILABLE",
    homepage: "INDUSTRY_JOURNEY_HOME",
    systemRoleKeys: [],
    entryHref: "/",
    navPriority: ["/", "/san-pham", "/kho-templates", "/market-intelligence"],
    debtRefs: [],
  },
  {
    key: "store_admin",
    label: "Quản trị cửa hàng",
    group: "STORE",
    primaryPhilosophy: "Store Growth & Operations Command Center",
    supportingPhilosophies: ["Executive Dashboard"],
    mission: "Vận hành và phát triển cửa hàng hoa hiệu quả, thúc đẩy kinh doanh toàn diện.",
    primaryQuestion: "Hôm nay tôi cần làm gì để cửa hàng phát triển?",
    homepageModel: "Toolkit Home (51 công cụ)",
    dominantActions: ["Xem xét", "Ưu tiên", "Hành động"],
    status: "AVAILABLE",
    homepage: "TOOLKIT_HOME",
    systemRoleKeys: ["dieu_hanh"],
    entryHref: "/",
    navPriority: ["/don-hang", "/khach-hang", "/san-pham"],
    debtRefs: [163],
  },
  {
    key: "flower_network_admin",
    label: "Điện hoa Admin",
    group: "FLOWER_NETWORK",
    primaryPhilosophy: "Real-time Network Command & Operations Orchestration",
    supportingPhilosophies: ["Control Tower", "Exception Management"],
    mission: "Vận hành, giám sát, quản lý và điều hành toàn bộ hệ thống mạng lưới điện hoa.",
    primaryQuestion: "Toàn bộ hệ thống điện hoa đang hoạt động thế nào và tôi cần can thiệp ở đâu?",
    homepageModel: "Toolkit Home (51 công cụ)",
    dominantActions: ["Điều phối", "Giám sát", "Quản lý", "Điều hành"],
    status: "AVAILABLE",
    homepage: "TOOLKIT_HOME",
    systemRoleKeys: [],
    entryHref: "/",
    navPriority: ["/dieu-phoi", "/don-hang", "/san-pham", "/khach-hang"],
    debtRefs: [],
  },
  {
    key: "sales",
    label: "Bán hàng",
    group: "STORE",
    primaryPhilosophy: "Pipeline-first",
    supportingPhilosophies: [],
    mission: "Biến cơ hội đủ điều kiện thành doanh thu.",
    primaryQuestion: "Khách nào cần tôi liên hệ hôm nay?",
    homepageModel: "Pipeline Workspace",
    dominantActions: ["Liên hệ", "Chốt", "Tạo đơn"],
    status: "AVAILABLE",
    homepage: "SALES_WORKSPACE",
    systemRoleKeys: ["sale"],
    entryHref: "/",
    navPriority: ["/khach-hang", "/don-hang", "/san-pham", "/hoi-thoai"],
    debtRefs: [164],
  },
  {
    key: "crm",
    label: "Chăm sóc vòng đời khách hàng (CRM)",
    group: "STORE",
    primaryPhilosophy: "Customer Lifecycle Management",
    supportingPhilosophies: ["Relationship Management"],
    mission: "Thu hút, giữ chân, kích hoạt lại và phát triển khách hàng.",
    primaryQuestion: "Khách nào cần được giữ chân hoặc kích hoạt lại?",
    homepageModel: "Customer Lifecycle Workspace",
    dominantActions: ["Hiểu khách", "Tương tác", "Giữ chân"],
    status: "AVAILABLE",
    homepage: "CRM_WORKSPACE",
    systemRoleKeys: ["crm"],
    entryHref: "/",
    navPriority: ["/khach-hang", "/hoi-thoai", "/don-hang"],
    debtRefs: [],
  },
  {
    key: "lead_marketing",
    label: "Trưởng Marketing",
    group: "STORE",
    primaryPhilosophy: "Creative Workspace",
    supportingPhilosophies: [],
    mission: "Dẫn dắt nghiên cứu, sáng tạo, duyệt và phát hành nội dung.",
    primaryQuestion: "Nội dung nào cần tôi xử lý tiếp?",
    homepageModel: "Creative Workspace",
    dominantActions: ["Tạo", "Duyệt", "Phát hành"],
    status: "AVAILABLE",
    homepage: "CREATIVE_WORKSPACE",
    systemRoleKeys: ["marketing"],
    entryHref: "/",
    navPriority: ["/creative-studio", "/noi-dung", "/lich-dang", "/market-intelligence"],
    debtRefs: [],
  },
  {
    key: "ceo",
    label: "Giám đốc điều hành (CEO)",
    group: "FLOWER_NETWORK",
    primaryPhilosophy: "Strategic Command Center",
    supportingPhilosophies: ["Performance Dashboard"],
    mission: "Nắm tín hiệu chiến lược, ra quyết định và theo dõi thực thi.",
    primaryQuestion: "Thay đổi và rủi ro lớn nào cần tôi quyết định?",
    homepageModel: "Strategic Command Center",
    dominantActions: ["Hiểu", "Quyết định", "Chỉ đạo"],
    status: "IN_DEVELOPMENT",
    homepage: "NOT_BUILT",
    systemRoleKeys: [],
    entryHref: null,
    navPriority: [],
    debtRefs: [165],
  },
  {
    key: "manager",
    label: "Quản lý vận hành",
    group: "FLOWER_NETWORK",
    primaryPhilosophy: "Operations Command Center",
    supportingPhilosophies: [],
    mission: "Lập kế hoạch, phân bổ, giám sát và điều chỉnh vận hành.",
    primaryQuestion: "Điểm nghẽn và thiếu hụt nguồn lực nằm ở đâu?",
    homepageModel: "Operations Command Center",
    dominantActions: ["Phân công", "Điều chỉnh", "Kiểm soát"],
    status: "IN_DEVELOPMENT",
    homepage: "NOT_BUILT",
    systemRoleKeys: [],
    entryHref: null,
    navPriority: [],
    debtRefs: [165],
  },
  {
    key: "coordinator",
    label: "Điều phối",
    group: "FLOWER_NETWORK",
    primaryPhilosophy: "Control Tower & Exception Management",
    supportingPhilosophies: ["Real-time Operations"],
    mission: "Quan sát, phát hiện, ưu tiên và xử lý ngoại lệ vận hành theo thời gian thực.",
    primaryQuestion: "Đơn nào đang có rủi ro ngay lúc này?",
    homepageModel: "Control Tower",
    dominantActions: ["Xử lý", "Chuyển cấp", "Phân công lại"],
    status: "AVAILABLE",
    homepage: "CONTROL_TOWER",
    systemRoleKeys: ["dieu_phoi"],
    entryHref: "/",
    navPriority: ["/dieu-phoi", "/don-hang", "/san-pham", "/khach-hang"],
    debtRefs: [166],
  },
  {
    key: "quality_control",
    label: "Kiểm soát chất lượng (QC)",
    group: "FLOWER_NETWORK",
    primaryPhilosophy: "Quality Control & Exception",
    supportingPhilosophies: [],
    mission: "Phát hiện, xác minh, khắc phục và phòng ngừa lỗi chất lượng.",
    primaryQuestion: "Lỗi chất lượng nào đang chờ xác minh?",
    homepageModel: "Quality Exception Board",
    dominantActions: ["Xác minh", "Khắc phục", "Đóng"],
    status: "IN_DEVELOPMENT",
    homepage: "NOT_BUILT",
    systemRoleKeys: [],
    entryHref: null,
    navPriority: [],
    debtRefs: [165],
  },
  {
    key: "customer_service",
    label: "Chăm sóc khách hàng (CSKH)",
    group: "FLOWER_NETWORK",
    primaryPhilosophy: "Customer Context-first",
    supportingPhilosophies: ["Conversation-first"],
    mission: "Nắm ngữ cảnh khách, trò chuyện, giải quyết và theo dõi sau xử lý.",
    primaryQuestion: "Khách này đang cần gì ngay lúc này?",
    homepageModel: "Conversation Workspace",
    dominantActions: ["Phản hồi", "Giải quyết", "Theo dõi"],
    status: "AVAILABLE",
    homepage: "CUSTOMER_SERVICE_WORKSPACE",
    systemRoleKeys: ["customer_service"],
    entryHref: "/",
    navPriority: ["/hoi-thoai", "/khach-hang", "/don-hang"],
    debtRefs: [165],
  },
  {
    key: "partner_manager",
    label: "Quản lý đối tác",
    group: "FLOWER_NETWORK",
    primaryPhilosophy: "Relationship Management",
    supportingPhilosophies: ["Partner Growth", "Partner Performance"],
    mission: "Hiểu, đánh giá, phát triển và giám sát mạng lưới đối tác.",
    primaryQuestion: "Đối tác nào đang có rủi ro hoặc cơ hội?",
    homepageModel: "Partner Portfolio",
    dominantActions: ["Đánh giá", "Phát triển", "Mở rộng"],
    status: "IN_DEVELOPMENT",
    homepage: "NOT_BUILT",
    systemRoleKeys: [],
    entryHref: null,
    navPriority: [],
    debtRefs: [165],
  },
  {
    key: "marketing",
    label: "Marketing",
    group: "FLOWER_NETWORK",
    primaryPhilosophy: "Creative Workspace",
    supportingPhilosophies: [],
    mission: "Nghiên cứu, sáng tạo, duyệt, phát hành và học từ kết quả.",
    primaryQuestion: "Nội dung nào cần tôi xử lý tiếp?",
    homepageModel: "Creative Workspace",
    dominantActions: ["Tạo", "Duyệt", "Phát hành"],
    status: "AVAILABLE",
    homepage: "CREATIVE_WORKSPACE",
    // Chuỗi/CHAIN: Vai phân quyền "marketing" đã gắn cho lead_marketing
    // (ONE_STORE). Tổ chức CHAIN cần vai phân quyền riêng — nợ #165.
    systemRoleKeys: [],
    entryHref: "/",
    navPriority: ["/creative-studio", "/noi-dung", "/lich-dang", "/market-intelligence"],
    debtRefs: [165],
  },
  {
    key: "product_manager",
    label: "Quản lý sản phẩm",
    group: "FLOWER_NETWORK",
    primaryPhilosophy: "Product-centric",
    supportingPhilosophies: ["Catalog-centric"],
    mission: "Định nghĩa, cấu trúc, xác thực, phát hành và cải thiện sản phẩm.",
    primaryQuestion: "Sản phẩm nào chưa sẵn sàng để bán?",
    homepageModel: "Product Workspace",
    dominantActions: ["Định nghĩa", "Xác thực", "Phát hành"],
    status: "AVAILABLE",
    homepage: "PRODUCT_WORKSPACE",
    systemRoleKeys: ["product_manager"],
    entryHref: "/",
    navPriority: ["/san-pham", "/catalog", "/gia", "/kho-templates"],
    debtRefs: [],
  },
  // Vai vận hành Thợ cắm, Shipper, Kế toán (PO Q7, checklist ALG 1.12) — role-ux-operations.ts
  ...OPERATIONS_ROLE_UX,
] as const

export const ROLE_UX_GROUP_LABEL: Record<RoleUxGroup, string> = {
  PLATFORM: "Nền tảng",
  STORE: "Cơ sở kinh doanh",
  FLOWER_NETWORK: "Mạng lưới / Chuỗi",
  ONE_STORE: "Cơ sở kinh doanh",
  CHAIN: "Mạng lưới / Chuỗi",
}

/**
 * Trả về nhãn vai trò được bản địa hóa và linh hoạt theo ngành của tenant
 */
export function getRoleUxLabelByIndustry(roleKey: RoleUxKey, industryKey?: string | null): string {
  if (roleKey === "florist") {
    if (!industryKey || industryKey === "FLORAL") return "Thợ chế tác"
    if (industryKey === "FASHION") return "Thợ may / Kỹ thuật cắt"
    if (industryKey === "FNB") return "Đầu bếp / Pha chế"
    if (industryKey === "CRAFT_GIFT") return "Nghệ nhân chế tác"
    if (industryKey === "SERVICES") return "Kỹ thuật viên"
    return "Thợ sản xuất / Thực hiện"
  }
  if (roleKey === "flower_network_admin") {
    if (!industryKey || industryKey === "FLORAL") return "Điện hoa Admin"
    return "Quản trị Chuỗi / Mạng lưới"
  }
  return getRoleUx(roleKey).label
}

export function getRoleGroupLabelByIndustry(group: RoleUxGroup, industryKey?: string | null): string {
  if (industryKey === "FLORAL") {
    if (group === "STORE" || group === "ONE_STORE") return "Cửa hàng hoa"
    if (group === "FLOWER_NETWORK" || group === "CHAIN") return "Mạng lưới điện hoa"
  }
  return ROLE_UX_GROUP_LABEL[group]
}

export function getRoleUx(key: RoleUxKey): RoleUxDefinition {
  const normalizedKey = key === "store_manager" ? "store_admin" : key
  const found = ROLE_UX_CATALOG.find((r) => r.key === normalizedKey)
  if (!found) throw new Error(`Không có vai trải nghiệm "${key}"`)
  return found
}

/**
 * Vai phân quyền → khuôn trải nghiệm. Trả `null` khi vai chưa gắn khuôn nào
 * (`experience_user`, vai riêng của tổ chức): màn gọi giữ hành vi cũ.
 *
 * Chỉ trả khuôn `AVAILABLE` — một khuôn đang phát triển không bao giờ được
 * dùng làm trang chủ dù có vai phân quyền trỏ tới.
 */
export function resolveRoleUx(
  systemRoleKey: string | null | undefined,
  organizationType?: string | null
): RoleUxDefinition | null {
  if (!systemRoleKey && !organizationType) return null

  // Khi là Quản trị nền tảng (PLATFORM hoặc platform_admin):
  if (
    organizationType === "PLATFORM" ||
    systemRoleKey === "platform_admin"
  ) {
    const pAdmin = ROLE_UX_CATALOG.find((r) => r.key === "platform_admin")
    if (pAdmin && pAdmin.status === "AVAILABLE") return pAdmin
  }

  // Khi là Quản trị SaaS Đa Ngành (INDUSTRY hoặc industry_admin):
  if (
    organizationType === "INDUSTRY" ||
    systemRoleKey === "industry_admin"
  ) {
    const indAdmin = ROLE_UX_CATALOG.find((r) => r.key === "industry_admin")
    if (indAdmin && indAdmin.status === "AVAILABLE") return indAdmin
  }

  // Khi là tổ chức Điện hoa / Mạng lưới (loại CHAIN — ADR-012 T-8b):
  const isNetwork = organizationType === "CHAIN"
  if (
    (isNetwork && (systemRoleKey === "dieu_hanh" || systemRoleKey === "flower_network_admin" || systemRoleKey === "chain_admin")) ||
    systemRoleKey === "flower_network_admin" ||
    systemRoleKey === "chain_admin"
  ) {
    const fnAdmin = ROLE_UX_CATALOG.find((r) => r.key === "flower_network_admin")
    if (fnAdmin && fnAdmin.status === "AVAILABLE") return fnAdmin
  }

  // Khi là Quản trị cửa hàng cơ sở (StoreOS / SINGLE):
  if (
    systemRoleKey === "store_admin" ||
    systemRoleKey === "cua_hang" ||
    (organizationType === "SINGLE" && systemRoleKey === "dieu_hanh")
  ) {
    const sAdmin = ROLE_UX_CATALOG.find((r) => r.key === "store_admin")
    if (sAdmin && sAdmin.status === "AVAILABLE") return sAdmin
  }

  const found = ROLE_UX_CATALOG.find(
    (r) => r.key === systemRoleKey || r.systemRoleKeys.includes(systemRoleKey ?? "")
  )
  if (!found || found.status !== "AVAILABLE") return null
  return found
}

/**
 * Sắp danh sách điều hướng theo ưu tiên của vai: mục có trong `navPriority`
 * lên trước đúng thứ tự khai báo, phần còn lại giữ nguyên thứ tự cũ. Không
 * thêm, không bớt mục nào.
 */
export function orderByRolePriority<T extends { href: string }>(
  items: readonly T[],
  role: RoleUxDefinition | null
): { priority: T[]; rest: T[] } {
  if (!role || role.navPriority.length === 0) return { priority: [], rest: [...items] }
  const priority: T[] = []
  for (const href of role.navPriority) {
    const item = items.find((i) => i.href === href)
    if (item) priority.push(item)
  }
  const rest = items.filter((i) => !priority.includes(i))
  return { priority, rest }
}
