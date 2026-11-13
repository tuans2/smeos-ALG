# 03b — Trải nghiệm theo vai (Role UX)

> [!NOTE]
> **VAI TRÒ TÀI LIỆU — SSOT LỚP TRẢI NGHIỆM THEO VAI (Level 3, CANONICAL)**
> Tệp này quy định **16 vai trải nghiệm** của ALG: vai đó thấy gì trước, trang chủ là gì, điều hướng ưu tiên gì, hành động chính là gì, AI cư xử ra sao.
> Tệp **không** quy định quyền. Quyền vẫn là mã năng lực ở `02-function-catalog.md` + `src/core/rbac/capability-catalog.ts`.
> **Nguồn:** hợp đồng `ALG-UX-ROLE-001` v1.1 (`docs/kien-truc/ALG_ROLE_UX_EXECUTION_CONTRACT.md`, SUPPORTING) và Kế hoạch nâng cấp kiến trúc năng lực (`docs/kien-truc/KE_HOACH_THUC_THI_NANG_CAP_ROLE_CAPABILITY_ARCHITECTURE.md`).
> **Mã nguồn chuẩn:** `src/modules/organization/domain/role-ux-catalog.ts` (+ test cùng thư mục). Tài liệu và mã phải khớp nhau. Lệch nhau thì sửa cả hai trong cùng một commit.

---

## 1. Quyết định của PO & Kiến trúc sư (26/09 & 30/09/2026)

| # | Quyết định | Hệ quả |
|---|---|---|
| D-RU1 | Xây **16 vai trải nghiệm** theo contract và kiến trúc nâng cấp. Vai đã có dữ liệu và luồng thật thì **nâng cấp ngay**. Vai chưa có vẫn **hiển thị nhưng vô hiệu** cho tới khi phát triển xong, và ghi vào `TECHNICAL_DEBT.md`. | Mục 3 và mục 6. Nợ #162–#169 |
| D-RU2 | Sửa nguyên tắc "một bộ màn hình": **dùng chung một bộ màn hình và component. Vai quyết định trang chủ, thứ tự điều hướng và ưu tiên thông tin. Mã năng lực quyết định nút nào được hiện và được dùng.** | Đã sửa `03-ux-architecture.md` §1–§3, PRD nguyên tắc #4, `AGENTS.md` mục Quy ước |
| D-RU3 | "admin" trong contract đổi thành **`platform_admin`**, tức Quản trị nền tảng, dùng Console Vận hành `/van-hanh`. Vai **Điều hành** của tiệm chuẩn hóa thành **`store_admin`** (alias tương thích ngược `store_manager`). | `store-manager-dashboard.tsx` / `store-growth-center.tsx` |
| D-RU4 | **Đa vai / chuyển vai: hoãn.** PO xác nhận ngày 26/09/2026. Mỗi người vẫn chỉ có một vai trong một tổ chức (`memberships @@unique([organization_id, user_id])`). | Nợ #162 |
| Q-TC | **Thêm vai trải nghiệm Thợ cắm (`florist`)** vào danh mục với trạng thái `IN_DEVELOPMENT`. | T6.13, Nợ #169 |
| Q-FNA | **Xác lập Top-Level Role: Điện hoa Admin (`flower_network_admin`)** vận hành Flower Network Command Center 4 tầng, kết nối mạng lưới xưởng ngoài và điều phối đơn M11. | `flower-network-command-center.tsx` |
| D-JUX | **Nâng cấp Kiến trúc Journey-First UX (30/09/2026)**: Trang chủ của 3 Role cấp cao (`store_admin`, `flower_network_admin`, `platform_admin`) chuyển sang mô hình **ChoiceGrid ("Bạn muốn làm gì?")**, Progressive Disclosure, Action Contract 7 bước, Combo Workflow; bọc toàn bộ dashboard hiện có theo nguyên tắc **"WRAP, không REPLACE"**; cung cấp nút chuyển đổi linh hoạt sang **"Chế độ chuyên gia"** (Expert Mode). | `docs/kien-truc/KE_HOACH_THUC_THI_JOURNEY_FIRST_UX_ARCHITECTURE.md` |

## 2. Nguyên tắc bất biến

1. **Vai ≠ Người.** Một người có thể giữ một hay nhiều vai; một vai có thể giao cho nhiều người. Không mã hoá UX theo một người cụ thể.
2. **Vai trải nghiệm ≠ Vai phân quyền ≠ Quyền.**
   - **Vai phân quyền** là bản ghi `roles` (`dieu_hanh`, `dieu_phoi`, `sale`, `experience_user`, cộng vai riêng của tổ chức). Vai này mang bộ mã năng lực.
   - **Vai trải nghiệm** (16 vai ở mục 3) là khuôn UX mà một vai phân quyền được gắn vào.
   - Thứ bậc: **Quyền (mã năng lực) > Phạm vi (tổ chức/chi nhánh) > Vai trải nghiệm > Ưu tiên UX.** Khuôn trải nghiệm **không bao giờ mở thêm quyền**.
3. **UX theo vai ≠ Giao diện riêng theo vai.** Mọi vai dùng chung token, typography, component. Chỉ khác thứ bậc thông tin, trang chủ, thứ tự điều hướng, hành động chính, hành vi AI.
4. **Dùng lại trước, tạo mới sau:** `REUSE > EXTEND > COMPOSE > CREATE`.
5. **Không bịa hiện trạng.** Thiếu dữ liệu thì ghi `DATA GAP / WORKFLOW GAP / PERMISSION GAP / BLOCKED` và mở nợ. Không dựng số liệu giả để lấp màn.
6. **Rà soát trước khi thiết kế lại.** Không đổi tên tuyến hay tái cấu trúc điều hướng chỉ vì mô hình lý thuyết đề xuất.

## 3. Danh mục 16 vai trải nghiệm

| Khoá | Tên hiển thị | Nhóm Scope | Triết lý chính (phụ) | Trang chủ | Vai phân quyền gắn vào | Trạng thái |
|---|---|---|---|---|---|---|
| `platform_admin` | Quản trị nền tảng | `PLATFORM` | Journey-first & Governance (Control Tower) | `PLATFORM_JOURNEY_HOME` (ChoiceGrid 10 tác vụ tại `/van-hanh`) | *(cấp qua `platform_operators`, D-N6)* | **Đang dùng được** |
| `store_admin` *(alias: `store_manager`)* | Quản trị cửa hàng hoa | `STORE` | Journey-first & Store Growth (Executive Dashboard) | `STORE_JOURNEY_HOME` (ChoiceGrid 12 tác vụ, bọc `StoreGrowthCenter`) | `dieu_hanh` | **Đang dùng được** |
| `flower_network_admin` | Quản trị mạng lưới điện hoa | `FLOWER_NETWORK` | Journey-first & Network Orchestration (Multi-Hub Logistics) | `NETWORK_JOURNEY_HOME` (ChoiceGrid 8 tác vụ, bọc `FlowerNetworkCommandCenter`) | `dieu_hanh` | **Đang dùng được** |
| `sales` | Bán hàng | `STORE` | Pipeline-first | `/`, dùng `SalesWorkspace` | `sale` | **Đang dùng được** *(pipeline: DATA GAP #164)* |
| `crm` | Chăm sóc vòng đời khách hàng | `STORE` | Customer Lifecycle Management (Relationship Management) | `/`, dùng `CrmWorkspace` | `crm` | **Đang dùng được** (T6.3) |
| `lead_marketing` | Trưởng Marketing | `STORE` | Creative Workspace | `/`, dùng `MarketingWorkspace` | `marketing` | **Đang dùng được** (T6.2) |
| `ceo` | Giám đốc điều hành | `FLOWER_NETWORK` | Strategic Command Center (Performance Dashboard) | Strategic Command Center | — | Đang phát triển (#165) |
| `manager` | Quản lý vận hành chuỗi | `FLOWER_NETWORK` | Operations Command Center | Operations Command Center | — | Đang phát triển (#165) |
| `coordinator` | Điều phối đơn & mạng lưới | `FLOWER_NETWORK` / `STORE` | Control Tower & Exception Management (Real-time Operations) | `/` chuyển sang `/dieu-phoi` | `dieu_phoi` | **Đang dùng được** *(nợ #166)* |
| `quality_control` | Kiểm soát chất lượng (QC) | `FLOWER_NETWORK` | Quality Control & Exception | Quality Exception Board | — | Đang phát triển (#165) |
| `customer_service` | Chăm sóc khách hàng (CSKH) | `STORE` | Customer Context-first (Conversation-first) | Conversation Workspace | `customer_service` | **Đang dùng được** (T6.4) |
| `partner_manager` | Quản lý đối tác xưởng ngoài | `FLOWER_NETWORK` | Relationship Management (Partner Growth, Partner Performance) | Partner Portfolio | — | Đang phát triển (#165) |
| `marketing` | Chuyên viên Marketing | `FLOWER_NETWORK` / `STORE` | Creative Workspace | `/`, dùng `MarketingWorkspace` | `marketing` | **Đang dùng được** (T6.2) |
| `product_manager` | Quản lý sản phẩm | `FLOWER_NETWORK` / `STORE` | Product-centric (Catalog-centric) | `/`, dùng `ProductManagerWorkspace` | `product_manager` | **Đang dùng được** (T6.1) |
| `finance_accounting` | Tài chính – Kế toán | `FLOWER_NETWORK` | Transaction-first | Transaction Workspace | — | Đang phát triển (#165) |
| `florist` | Thợ cắm | `STORE` | Production Queue | Production Queue | — | Đang phát triển (#169) |

**Vai phân quyền chưa có khuôn:** `experience_user` dùng lưới thẻ Trải nghiệm như cũ. Vai riêng của tổ chức dùng `StoreManagerDashboard` như trước 26/09. Vai **Thợ cắm** (`florist`) đã được bổ sung vào danh mục vai trải nghiệm với trạng thái `IN_DEVELOPMENT` theo quyết định Q-TC (PO 26/09/2026, T6.13).

**Tổ chức CHAIN:** `dieu_hanh` tạm dùng khuôn `store_manager` cho tới khi `ceo`/`manager` có dữ liệu (nợ #163).

## 4. Hồ sơ từng vai đang dùng được

Mỗi vai theo khuôn: **câu hỏi chính → P0 (thấy ngay) → P1 (thấy khi cần) → P2 (xem sâu) → hành động chính.**

### 4.1 `platform_admin` — Platform Journey Home (ChoiceGrid 10 tác vụ)
- **Câu hỏi chính:** Bạn muốn làm gì với ALG hôm nay?
- **P0:** Lưới ChoiceGrid 10 tác vụ quản trị (Báo cáo hệ thống, Quản lý tổ chức, Quản lý người dùng, Gói dịch vụ, Năng lực, AI & Credit, Tích hợp, Sức khỏe hệ thống, Cài đặt, Kiểm toán bảo mật).
- **Hành động:** Chọn tác vụ mục tiêu để mở workspace/route chức năng tương ứng; hỗ trợ toggle "Chế độ chuyên gia" để xem bảng số liệu tổng quan.
- **Giao diện:** `PlatformJourneyHome` (`src/components/dashboard/platform-journey-home.tsx`) tại tuyến `/van-hanh`.

### 4.2 `store_admin` *(alias: `store_manager`)* — Store Journey Home (ChoiceGrid 12 tác vụ)
- **Câu hỏi chính:** Bạn muốn làm gì cho cửa hàng hôm nay?
- **P0:** Lưới ChoiceGrid 12 tác vụ (Xem tình hình, Phân tích ảnh, Báo giá, Tạo ảnh, Tạo video, Viết bài, Tạo catalog, Combo ra mắt sản phẩm, AI gợi ý từ ảnh, Xu hướng thị trường, Tạo đơn, Quản lý khách).
- **Hành động:** Khởi động hành trình tác vụ (Action Contract 7 bước) hoặc mở Combo Workflow 6 bước; hỗ trợ nút "Chế độ chuyên gia" để vào thẳng trung tâm chỉ huy tăng trưởng.
- **Giao diện:** `StoreJourneyHome` (`src/components/dashboard/store-journey-home.tsx`) bọc `StoreGrowthCenter` theo nguyên tắc WRAP.

### 4.3 `flower_network_admin` — Network Journey Home (ChoiceGrid 8 tác vụ)
- **Câu hỏi chính:** Bạn muốn làm gì cho hoạt động điện hoa hôm nay?
- **P0:** Lưới ChoiceGrid 8 tác vụ (Báo cáo toàn hệ thống, Sản phẩm mạng lưới, Bán hàng, Điều phối, Quản lý đối tác xưởng ngoài, Khách hàng & CRM, Tiếp thị, Đối soát tài chính).
- **Hành động:** Điều phối liên tỉnh, Giám sát đối tác xưởng ngoài, Đối soát hoa hồng; hỗ trợ toggle "Chế độ chuyên gia" để xem Command Center 4 tầng.
- **Giao diện:** `NetworkJourneyHome` (`src/components/dashboard/network-journey-home.tsx`) bọc `FlowerNetworkCommandCenter`.

### 4.4 `sales` — Pipeline Workspace
- **Câu hỏi chính:** Khách nào cần tôi liên hệ hôm nay?
- **P0:** khách sắp tới dịp kỷ niệm trong 14 ngày (`GET /crm/reminders/upcoming`, `Q7`) và đơn nháp cần chốt (`GET /orders?status=DRAFT`, `R1`).
- **Hành động:** nút chính **Tạo đơn** (`R2`), nút phụ **Thêm khách** (`Q2`) và **Tra giá** (`L1`). Mỗi nút ẩn theo năng lực.
- **DATA GAP (nợ #164):** chưa có thực thể cho chuỗi *Lead → Qualify → Opportunity → Follow-up → Convert*. Màn ghi rõ "đang phát triển", không dựng dữ liệu giả.

### 4.4 `coordinator` — Control Tower
- **Câu hỏi chính:** Đơn nào đang có rủi ro ngay lúc này?
- **P0:** trạng thái trực tiếp, ngoại lệ nghiêm trọng, rủi ro SLA, việc bị chặn, việc chưa phân công · **P1:** hàng đợi, khối lượng việc, phụ thuộc · **P2:** mẫu lặp, tối ưu.
- **Hành động:** Xử lý, Chuyển cấp, Phân công lại.
- **Hiện trạng:** `/` chuyển sang tuyến có sẵn `/dieu-phoi` (`ControlTowerDashboard`), không dựng màn thứ hai. Đã thêm menu tài khoản vào đầu trang `/dieu-phoi`.
- **Còn thiếu (nợ #166):** vòng đời ngoại lệ đủ 8 bước (thiếu người phụ trách, bằng chứng, xác minh, nguyên nhân gốc, tái diễn), bảng thông báo, rà soát thứ tự "ngoại lệ trước, KPI sau".

### 4.5 `product_manager` — Product Workspace
- **Câu hỏi chính:** Sản phẩm nào chưa sẵn sàng để bán?
- **P0:** Sản phẩm chưa sẵn sàng bán kèm lý do thiếu (ảnh, giá/BOM, danh mục, trạng thái nháp) và điểm sẵn sàng · **P1:** Thống kê nhanh danh mục (tổng sản phẩm, cần hoàn thiện, sẵn sàng bán, điểm sẵn sàng trung bình) · **P2:** Danh sách sản phẩm hoàn thiện đang bán.
- **Hành động:** Thêm sản phẩm (`L2`), Tra cứu Catalog (`L1`), Quy tắc giá (`L5`).
- **Hiện trạng:** Tuyến `/` với component `ProductManagerWorkspace` (`src/components/dashboard/product-manager-workspace.tsx`), liên kết sâu tới `/san-pham`, `/catalog`, `/gia`.

### 4.6 `customer_service` — Conversation Workspace *(T6.4)*
- **Câu hỏi chính:** Khách này đang cần gì ngay lúc này?
- **P0:** Hội thoại đang chờ (ACTIVE), số dịp kỷ niệm cần liên hệ hôm nay/ngày mai · **P1:** Dịp kỷ niệm 7 ngày tới · **P2:** Tác vụ nhanh Hội thoại & Khách hàng.
- **Hành động:** Phản hồi, Giải quyết, Theo dõi.
- **Hiện trạng:** Tuyến `/` với component `CustomerServiceWorkspace` (`src/components/dashboard/customer-service-workspace.tsx`); nơi vào `/hoi-thoai`.
- **Còn thiếu (nợ #165):** Pipeline CHAIN đa-cửa-hàng, phân công nội bộ, báo cáo KPI CSKH.

## 5. Điều hướng theo vai (SSOT `nav-model.ts`)

Mọi logic gom nhóm và sắp xếp điều hướng theo vai được tập trung tại `src/components/layout/nav-model.ts` (Screen Contract `docs/dac-ta/screen-contracts/_dieu-huong.md`).

- **Desktop:** hàm `buildNav(can, roleUx)` sinh nhóm **"Việc chính · <tên vai>"** đứng đầu thanh bên, gồm Trang chủ (`/`) và các mục trong `navPriority` của vai. Các mục này **rời khỏi nhóm gốc**, không hiện hai lần. Năm nhóm chức năng còn lại theo chuẩn K5 (`ban-hang`, `san-pham`, `noi-dung`, `van-hanh`, `thiet-lap`) tự động lọc bỏ các mục đã ghim và ẩn các mục người dùng thiếu năng lực.
- **Điện thoại:** hàm `mobileSecondSlot(can, roleUx)` chọn ô thứ hai của thanh dưới là mục đầu tiên trong `navPriority` chưa có trên thanh: Quản lý cửa hàng thấy **Đơn hàng**, Bán hàng thấy **Khách hàng**, Điều phối thấy **Điều phối**, Quản lý sản phẩm thấy **Sản phẩm**, Marketing thấy **Creative Studio**, CSKH thấy **Hội thoại**. Vai chưa có khuôn thấy **Sản phẩm** như cũ.
- Nút giữa mobile gác năng lực `H1` (quét ảnh): có `H1` → **Tải ảnh** (`/tai-anh`), không có `H1` → Việc chính đầu tiên của vai hoặc **Sản phẩm**.
- Vai chỉ quyết định **thứ tự**. Quyền hiển thị và thao tác được gác chặt chẽ bởi mã năng lực qua `can(code)` và máy chủ kiểm soát lại ở mọi endpoint.

| Vai | `navPriority` | Nơi vào mặc định (`entryHref`) |
|---|---|---|
| `store_manager` | `/duyet` · `/don-hang` · `/san-pham` · `/khach-hang` | `/` (Dashboard Điều hành) |
| `sales` | `/khach-hang` · `/don-hang` · `/san-pham` · `/hoi-thoai` | `/` (Sales Workspace) |
| `coordinator` | `/dieu-phoi` · `/don-hang` · `/san-pham` · `/khach-hang` | `/dieu-phoi` (Control Tower) |
| `product_manager` | `/san-pham` · `/catalog` · `/gia` · `/kho-templates` | `/` (Product Workspace) |
| `lead_marketing` / `marketing` | `/creative-studio` · `/noi-dung` · `/lich-dang` · `/market-intelligence` | `/` (Creative Workspace) |
| `customer_service` | `/hoi-thoai` · `/khach-hang` · `/don-hang` | `/hoi-thoai` → `/` (Conversation Workspace) |

## 6. Vai chưa có và mục chưa có màn: hiện nhưng vô hiệu

- Màn **`/vai-tro`** (mở từ menu tài khoản) liệt kê đủ 15 vai theo ba nhóm. Vai đang dùng được có nhãn "Đang dùng được" và nút mở nơi vào. Vai chưa có có nhãn "Đang phát triển", `aria-disabled`, mờ đi, không bấm được.
- **Chuyển tầng (xem trước vai)** — quản trị nền tảng có năng lực `N1` bấm "Mở"/"Console" thì `POST /api/v1/platform/tier-preview { roleKey }` đặt cookie `smeos_tier_preview` (HttpOnly) và chuyển về nơi vào của tầng (SaaS Mother `/van-hanh`; SaaS Ngành, ChainOS, StoreOS `/`). Chỉ đổi khuôn trải nghiệm (vai + loại tổ chức); tổ chức, mã năng lực và dữ liệu vẫn theo phiên thật. Quyền `N1` được kiểm lại ở mỗi request. `DELETE` cùng đường dẫn (nút "Về vai thật của bạn") xoá xem trước. Chuyển thất bại thì báo lỗi ngay dưới dòng vai, không chuyển trang.
- Màn này **chỉ đọc danh mục trong mã**. Nó không gọi API và không đổi vai của ai; đổi vai vẫn cần `A4`.
- Vai đang phát triển **không bao giờ** được dùng làm trang chủ, dù có vai phân quyền trỏ tới (`resolveRoleUx` chỉ trả vai `AVAILABLE`).
- Ba mục điều hướng trước đây trỏ vào tuyến không tồn tại (`/muc-dung`, `/audit`, `/cai-dat`) nay hiện nhãn "Sắp có" và không bấm được (nợ #167).
- Khác với `03 §15` "Không đủ quyền: ẩn nút": quy tắc ẩn nút áp cho **nút hành động** mà người dùng không có quyền. Quy tắc "hiện nhưng vô hiệu" chỉ áp cho **lộ trình sản phẩm** (vai, mục chưa xây), và luôn kèm lý do "Đang phát triển".

## 7. Hành vi AI theo vai (mục tiêu, chưa thi công, nợ #168)

| Vai | AI nên làm |
|---|---|
| platform_admin | phát hiện cấu hình lệch, giải thích phụ thuộc |
| store_manager | tóm tắt tình hình, xếp ưu tiên việc |
| sales | gợi ý hành động tiếp theo với khách |
| coordinator | dự báo rủi ro SLA, xếp ưu tiên ngoại lệ |
| *(10 vai còn lại)* | theo bảng §11 của contract, mở khi vai được xây |

AI **không được**: bịa dữ liệu, luật hay quyền; tự đổi cấu hình toàn cục; tự chạy hành động tác động lớn; giấu ngoại lệ; vượt phạm vi vai; trình bày suy luận như sự thật.

## 8. Ngoại lệ, thông báo, bàn giao giữa các vai, phạm vi

Mô hình mục tiêu theo contract §12–§16: thông báo P0–P3, ngoại lệ 8 bước, bàn giao mang theo ngữ cảnh, phạm vi Nền tảng → Tổ chức → Chuỗi → Cửa hàng → Vai → Người. **Chỉ thi công trường có trong Master Index / lược đồ.** Hiện trạng: `order_exceptions` có mô tả, mức độ, trạng thái, cách xử lý; chưa có bảng thông báo; chưa có bàn giao tổng quát (nợ #166).

## 9. Tiêu chí nghiệm thu mỗi thay đổi UX theo vai

- **Đúng vai:** xác định được vai chính và việc chính; áp dụng đúng triết lý của vai.
- **Thông tin:** P0 hiện ngay; phạm vi rõ; không có thông tin lạc đề chiếm chỗ.
- **Hành động:** có một hành động chính rõ ràng; ngoại lệ bấm vào xử lý được.
- **Dữ liệu:** không bịa trường; giữ một nguồn sự thật; khối 403 thì ẩn, không hiện số 0 giả.
- **Quyền:** không leo thang quyền; nút khớp mã năng lực.
- **Hệ thiết kế:** dùng lại component sẵn có; không thêm màu hay cỡ chữ tuỳ tiện.
- **Trạng thái:** có đủ trạng thái đang tải (khung giữ chỗ), rỗng (có hướng đi tiếp), lỗi (có nút tải lại).

## 10. Bản đồ mã

| Việc | Tệp |
|---|---|
| Danh mục 15 vai + `resolveRoleUx` + `orderByRolePriority` | `src/modules/organization/domain/role-ux-catalog.ts` (+ `.test.ts`, 12 ca) |
| Phiên mang `roleKey` + `organizationType` | `src/modules/organization/use-cases/resolve-app-session.ts`, `src/lib/mock-data.ts` (`MockSession`), `src/lib/session.tsx` (`roleUx`) |
| Trang chủ theo vai | `src/app/(app)/page.tsx` |
| Khuôn store_manager | `src/components/dashboard/store-manager-dashboard.tsx` |
| Khuôn sales | `src/components/dashboard/sales-workspace.tsx` |
| Khuôn coordinator | `src/app/(app)/dieu-phoi/page.tsx` (có sẵn, thêm menu tài khoản) |
| Khuôn marketing / lead_marketing | `src/components/dashboard/marketing-workspace.tsx` |
| Khuôn crm | `src/components/dashboard/crm-workspace.tsx` |
| Điều hướng theo vai | `src/components/layout/desktop-nav.tsx`, `src/components/layout/bottom-nav.tsx` |
| Danh mục vai | `src/app/(app)/vai-tro/page.tsx`, `src/app/(app)/vai-tro/chuyen-tang.ts`, `src/modules/platform/domain/tier-preview.ts`, `src/app/api/v1/platform/tier-preview/route.ts`, lối vào ở `src/components/layout/user-menu.tsx` |

## 11. Kiểm soát thay đổi

Danh sách vai, triết lý của từng vai và các nguyên tắc ở mục 2 là **LOCKED**. Agent muốn đổi thì phải lập đề xuất (`change_id`, luật bị khoá, vấn đề, bằng chứng, đề xuất, vai và hệ thống bị ảnh hưởng, rủi ro, di trú) và **chờ PO quyết định**. Khi chuyển một vai từ "Đang phát triển" sang "Đang dùng được", làm cùng một commit: sửa `role-ux-catalog.ts` (trạng thái, `systemRoleKeys`, `entryHref`, `navPriority`), sửa test, cập nhật mục 3–4 của tệp này, và đóng dòng nợ tương ứng.
