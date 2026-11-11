// Điểm vào theo vai (đặc tả 03 mục 3 + đặc tả 03b-role-ux mục 4): một tuyến
// "/", nội dung chọn theo phiên đăng nhập THẬT đọc từ máy chủ.
//
// 1. Workspace TRẢI NGHIỆM → lưới thẻ chức năng (như cũ).
// 2. Workspace THẬT → khuôn trải nghiệm của vai (`resolveRoleUx`):
//    - `store_manager` (vai `dieu_hanh`) → Business & Operations Command Center
//    - `sales` (vai `sale`)             → Pipeline Workspace
//    - `coordinator` (vai `dieu_phoi`)  → trang chủ chuỗi (`/dieu-phoi` mở từ menu)
//    - `cua_hang` (cửa hàng nhận gia công) → trang chủ cửa hàng (`/cua-hang` mở từ menu)
//    - `tho_cam` → Việc của tôi · `shipper` → Đơn cần giao · `ke_toan` → bàn làm việc Kế toán (PO Q7)
//    PO 23/10/2026: mọi tài khoản luôn thấy trang chủ sau đăng nhập — không chuyển tiếp.
//    - vai chưa gắn khuôn (vai riêng của tổ chức…) → Command Center, giữ đúng
//      hành vi trước 26/09.
// Khuôn chỉ chọn MÀN; năng lực (`capabilities`) vẫn quyết định nút nào hiện
// và máy chủ vẫn kiểm lại ở mọi endpoint.
//
// Trước đây chọn màn theo tham số URL thủ công `?che_do=trai-nghiem` — đã gỡ:
// tài khoản tự đăng ký (`POST /auth/signup`) luôn có workspace `EXPERIENCE`.

import { getDictionary, translate } from "@/lib/i18n/server"
import { requestCookieHeader } from "@/lib/request-cookie-header"

import { ExperienceGrid } from "@/components/dashboard/experience-grid"
import { SalesWorkspace } from "@/components/dashboard/sales-workspace"
import { ProductManagerWorkspace } from "@/components/dashboard/product-manager-workspace"
import { MarketingWorkspace } from "@/components/dashboard/marketing-workspace"
import { CrmWorkspace } from "@/components/dashboard/crm-workspace"
import { CustomerServiceWorkspace } from "@/components/dashboard/customer-service-workspace"
import { StoreGrowthCenter } from "@/components/dashboard/store-growth-center"
import { FlowerNetworkCommandCenter } from "@/components/dashboard/flower-network-command-center"
import { StoreJourneyHome } from "@/components/dashboard/store-journey-home"
import { NetworkJourneyHome } from "@/components/dashboard/network-journey-home"
import { PlatformJourneyHome } from "@/components/dashboard/platform-journey-home"
// @release-strip — trang chủ tầng SaaS Ngành, không có trong bản giao GD1 (docs/plan/BANGIAO_GD1_PHAM_VI.md §4)
import { IndustryJourneyHome } from "@/components/dashboard/industry-journey-home"
// @release-strip-end
import { ToolkitHome } from "@/components/dashboard/toolkit-home"
import { FloristQueueHome } from "@/components/dashboard/florist-queue-home"
import { ShipperRunsHome } from "@/components/dashboard/shipper-runs-home"
import { AccountingWorkspace } from "@/components/dashboard/accounting-workspace"
import { resolveRoleUx } from "@/modules/organization/domain/role-ux-catalog"
import { resolveAppSession } from "@/modules/organization/use-cases/resolve-app-session"

export default async function DashboardPage() {
  const dict = getDictionary("vi")
  const cookieHeader = await requestCookieHeader()

  const session = await resolveAppSession(cookieHeader)
  // Không có phiên hợp lệ: layout bọc ngoài (`(app)/layout.tsx`) đã chuyển
  // sang /dang-nhap trước khi tới đây — nhánh này chỉ để tsc yên tâm về kiểu.
  if (!session) return null

  const roleUx = resolveRoleUx(session.roleKey, session.organizationType)

  switch (roleUx?.homepage) {
    case "TOOLKIT_HOME":
      return <ToolkitHome />
    case "STORE_JOURNEY_HOME":
      return <StoreJourneyHome />
    case "NETWORK_JOURNEY_HOME":
      return <NetworkJourneyHome />
    case "PLATFORM_JOURNEY_HOME":
      return <PlatformJourneyHome />
    // @release-strip
    case "INDUSTRY_JOURNEY_HOME":
      return <IndustryJourneyHome />
    // @release-strip-end
    case "CONTROL_TOWER":
      return <NetworkJourneyHome />
    case "FLOWER_NETWORK_COMMAND_CENTER":
      return <FlowerNetworkCommandCenter />
    case "SALES_WORKSPACE":
      return <SalesWorkspace />
    case "PRODUCT_WORKSPACE":
      return <ProductManagerWorkspace />
    case "CREATIVE_WORKSPACE":
      return <MarketingWorkspace />
    case "CRM_WORKSPACE":
      return <CrmWorkspace />
    case "CUSTOMER_SERVICE_WORKSPACE":
      return <CustomerServiceWorkspace />
    case "FLORIST_QUEUE":
      return <FloristQueueHome />
    case "SHIPPER_DELIVERIES":
      return <ShipperRunsHome />
    case "ACCOUNTING_WORKSPACE":
      return <AccountingWorkspace />
    case "CONTROL_CENTER":
    case "STORE_GROWTH_CENTER":
    case "STORE_COMMAND_CENTER":
    default:
      return <StoreJourneyHome />
  }
}
