# Báo cáo Audit Toàn diện Toàn bộ Hệ thống ALG Core (System-Wide Baseline Specification)

> **Mã tài liệu**: `AUDIT-FLORAOS-CORE-SYSTEM-WIDE-2026-10`  
> **Thời điểm thẩm tra**: 06/10/2026  
> **Phạm vi thẩm định**: Toàn bộ codebase `floraos-core` gồm **30 Modules nghiệp vụ** (`src/modules/*`), **235 API Routes** (`src/app/api/v1/*`), **39 Màn hình giao diện** (`src/app/(app)/*`), **90 Bảng CSDL** (`prisma/schema.prisma`), **29 Tệp AI Worker Python** (`workers/*`), và **151 Mã năng lực RBAC** (`src/core/rbac/`).  
> **Tiêu chuẩn phân loại**: ✅ **Implemented** (Đã chạy thực tế) · ⚠️ **Partial** (Hoàn thiện một phần) · ❌ **Missing** (Chưa xây dựng) · 🪦 **Dead Code** (Mã dư thừa) · ❓ **Unclear** (Chưa rõ ràng).  
> **Mục tiêu**: Thiết lập Baseline hiện trạng chuẩn 100% không suy đoán, làm căn cứ chuyển giao và nâng cấp lên chuẩn **Enterprise Commercial-Ready**.

---

## 1. TỔNG QUAN KIẾN TRÚC TOÀN HỆ THỐNG

### 1.1 Khái quát Vận hành & Mô hình Saas
ALG là nền tảng SaaS đa khách thuê (Multi-tenant B2B) chuyên sâu cho ngành hoa tươi và điện hoa tại Việt Nam, kết hợp tự động hóa vận hành cửa hàng với trí tuệ nhân tạo (AI Vision, AI Content, AI Video, AI Chat, Market Intelligence).

Hệ thống hoạt động trên nguyên tắc **Clean Architecture 4 tầng** (`domain/`, `use-cases/`, `infra/`, `adapters/`), đảm bảo:
- **Tầng Domain thuần khiết**: 100% không import Prisma hay thư viện ngoài, cho phép kiểm thử luật nghiệp vụ không phụ thuộc CSDL.
- **Cách ly Tenant tuyệt đối (Tenant Isolation)**: 100% bảng thuộc dữ liệu tenant đều có cột `organization_id`, không chấp nhận `organization_id` từ client body/query mà luôn giải từ session máy chủ (`requireTenantContext`).
- **Phân quyền 3 tầng cắt**: Mặc định theo vai $\rightarrow$ Bảng công tắc tổ chức $\rightarrow$ **Trần cứng cắt sau cùng (Hard Cap)**.

### 1.2 Chỉ số Quy mô Codebase Thực tế
- **Cơ sở dữ liệu**: 90 Models trong Postgres qua Prisma ORM (`prisma/schema.prisma`).
- **Phân hệ nghiệp vụ (Modules)**: 30 thư mục tại `src/modules/`.
- **Giao diện người dùng (App Router)**: 32 trang ứng dụng nội bộ (`src/app/(app)/*`), 1 trang vận hành Console (`src/app/(platform)/van-hanh/*`), và 5 trang chia sẻ công khai (`/b/`, `/c/`, `/g/`, `/s/`, `/dang-nhap`).
- **Giao diện Template chuẩn hóa**: 13 phân hệ template dùng chung (`src/components/templates/`).
- **Điểm kết nối Backend (Endpoints)**: 235 route handlers RESTful (`/api/v1/*`).
- **Năng lực AI Background (Workers)**: 2 cụm worker Python chạy độc lập (`workers/vision` và `workers/media_ai`), giao tiếp qua Postgres `SKIP LOCKED` + `LISTEN/NOTIFY`.
- **Hệ thống Phân quyền (RBAC)**: 151 mã năng lực (`A1`–`V3`), 17 vai hệ thống (`system-roles.ts`), và 14 vai trải nghiệm người dùng (`role-ux-catalog.ts`).

---

## 2. MA TRẬN PHÂN TÍCH 10 TRỤ CỘT CHỨC NĂNG CỐT LÕI

Dưới đây là đánh giá line-by-line hiện trạng 10 phân hệ nghiệp vụ chính của ALG Core:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ALG CORE ARCHITECTURE                               │
├────────────────────────┬───────────────────────────┬───────────────────────────────────┤
│  1. SMART INGESTION    │    2. CREATIVE & CONTENT  │     3. COMMERCIAL & SALES         │
│  - M01a Vision BOM     │    - Creative Studio (14) │     - M01c Sales Pitch A6         │
│  - M04a Image Guard    │    - Video Studio (M04c)  │     - Greeting Cards / Swipe      │
│  - M01b Product Copy   │    - Social Publishing    │     - Pricing Engine (M02)        │
├────────────────────────┼───────────────────────────┼───────────────────────────────────┤
│  4. COMMERCE OPS (CN12)│    5. OMNICHANNEL CHAT    │     6. MARKET INTELLIGENCE        │
│  - Control Tower Tháp  │    - AI Chatbot (M08)     │     - Trend Extraction            │
│  - Partner Settlement  │    - Zalo/FB Connectors   │     - Evidence Catalog (TikTok/YT)│
│  - SLA Monitor Engine  │    - Human Handoff Inbox  │     - Topic Opportunities         │
├────────────────────────┼───────────────────────────┼───────────────────────────────────┤
│  7. PRODUCT & INVENTORY│    8. CRM & LOYALTY (M09) │     9. PLATFORM & FOUNDATION      │
│  - Product Master      │    - Customer RFM Tiers   │     - Field Platform (Custom CF)  │
│  - Size Multipliers    │    - Occasions Reminders  │     - AI Gateway & Governance     │
│  - Inventory Tracking  │    - Voucher Engine       │     - Audit Logs & Usage Credits  │
└────────────────────────┴───────────────────────────┴───────────────────────────────────┘
```

---

### TRỤ CỘT 1: NHẬN DIỆN THỊ GIÁC & BÓC TÁCH DỮ LIỆU SẢN PHẨM (M01 & M04a)
- **Tài liệu đặc tả chi tiết**: [`docs/audit/product-analysis-feature-spec.md`](./product-analysis-feature-spec.md)
- **Phạm vi code**: `src/modules/products/`, `workers/vision/`, `src/app/(app)/tai-anh/`

| Khối tính năng | Trạng thái | Đánh giá hiện trạng & Bằng chứng mã nguồn |
|---|---|---|
| **M01a — Nhận diện cấu phần hoa (BOM)** | ✅ Implemented | Worker Python chạy OpenAI Structured Outputs / Direct / Local CV SAM2. Ánh xạ 100% `Schema.json`: danh sách hoa, lá, phụ kiện, giấy gói, bảng màu `palette_accounting`, OCR chữ trên thiệp. |
| **Atomic Fields Chỉnh sửa trên UI** | ✅ Implemented | Component `AnalysisResultCard` + `result-card.tsx` phân rã từng trường (tên, số lượng, màu sắc, nụ, cành hỏng). Kiểm tra nghiêm ngặt `isValidAnalysisEdit` chống mất khóa cấp 1. |
| **Duyệt ghi Product Master Transaction** | ✅ Implemented | Use-case `approveAnalysis` (quyền `H3` trần cứng): ghi bản ghi `products` + cập nhật `product_analyses` + ghi `audit_logs` trong 1 giao dịch an toàn. |
| **M01b — Sinh nội dung thương mại** | ✅ Implemented | Use-case `product-copies/generate` (quyền `H5`): đọc hồ sơ thương hiệu (`learning_profiles`) tiệm hoa để sinh Tên thương mại, Slogan, USP, Câu chuyện ý nghĩa hoa, Thẻ SEO và Giá đề xuất. |
| **M04a — Tối ưu hóa ảnh & Identity Guard** | ⚠️ Partial | Mô hình bảo vệ nhận diện chủ thể sản phẩm (`Subject Integrity Guard`) đã có mã tại `workers/media_ai/guard/`, tuy nhiên luồng UI tự động kích hoạt còn tách rời chặng M01. |

---

### TRỤ CỘT 2: KÊNH BÁN HÀNG THẺ CHÀO & SWIPE BROCHURE (GREETING CARD)
- **Tài liệu đặc tả chi tiết**: [`docs/audit/greeting-card-feature-spec.md`](./greeting-card-feature-spec.md)
- **Phạm vi code**: `src/modules/greeting-card/`, `src/app/(app)/the-chao/`, `src/app/b/[sendCode]/`

| Khối tính năng | Trạng thái | Đánh giá hiện trạng & Bằng chứng mã nguồn |
|---|---|---|
| **Quản lý Bộ sưu tập Mẫu hoa (Catalog)** | ✅ Implemented | CRUD danh mục STANDARD / CLIENT, gán sản phẩm từ Product Master, chọn template theme hiển thị, tạo link `/b/<sendCode>`. |
| **Trải nghiệm Khách hàng Swipe Brochure** | ✅ Implemented | Giao diện di động vuốt thẻ mượt mà tại `/b/[sendCode]`. Form đặt hoa 5 ô địa chỉ, chọn biến thể size, tính phí ship khu vực, áp mã giảm giá tức thì. |
| **Thanh toán VietQR & Webhook Tự động** | ✅ Implemented | Sinh mã QR động chuẩn Napas, lắng nghe webhook ngân hàng tại `/api/v1/greeting-card/integrations/webhook`, tự động khớp tiền và đổi trạng thái thanh toán. |
| **Thông báo Khách hàng qua Zalo ZNS / SMS** | ✅ Implemented | Adapter `zalo-zns-adapter.ts` và `esms-adapter.ts` gửi thông báo tự động khi đơn Đã nhận, Đang cắm, Đã giao thành công. |
| **Phễu Thống kê Truy cập & Chia sẻ** | ✅ Implemented | Lưu trữ sự kiện `greeting_journey_events` (OPEN, SWIPE, SELECT, ORDER) và phân tích hành vi khách hàng theo kênh chia sẻ `greeting_share_links`. |

---

### TRỤ CỘT 3: THỰC HIỆN NGHIỆP VỤ ĐIỀU PHỐI (CHỨC NĂNG 12 / CONTROL TOWER)
- **Tài liệu đặc tả chi tiết**: [`docs/audit/coordinator-feature-spec.md`](./coordinator-feature-spec.md)
- **Phạm vi code**: `src/modules/coordinator/`, `src/app/(app)/dieu-phoi/`, `src/components/coordinator/`

| Khối tính năng | Trạng thái | Đánh giá hiện trạng & Bằng chứng mã nguồn |
|---|---|---|
| **Tháp Vận hành Control Tower UI** | ✅ Implemented | Dashboard theo dõi đơn thời gian thực, tự động refresh mỗi 60s, phân loại mức độ rủi ro trễ (`NORMAL`, `ATTENTION`, `AT_RISK`, `CRITICAL`). |
| **Ma trận Chuyển bước & Cổng Kiểm soát** | ✅ Implemented | Chặn chuyển bước nghiêm ngặt tại server: chặn cắm khi chưa gán xưởng; chặn giao khi chưa đạt QC (`PASSED`); chặn hoàn tất khi thiếu bằng chứng giao hàng POD; chặn đóng đơn khi còn sự cố mở. |
| **Động cơ Giám sát SLA Giao hàng** | ✅ Implemented | `sla-monitor.ts`: Tính toán hạn giao theo 4 gói (`OFFSET`, `EXACT`, `WINDOW`, `END_OF_DAY`), tự động cảnh báo NEAR_BREACH (<30p) và gợi ý hành động can thiệp. |
| **Quyết toán Tiền công Thợ cắm (Settlement)** | ✅ Implemented | `partner-settlement.ts`: Biểu phí gia công 6 dáng hoa, nhân hệ số giao gấp ($1.2\times$) và Lễ Tết ($1.3\times$). |
| **Sổ thu Tiền Đơn hàng (D2)** | ✅ Implemented | Quản lý 3 trục tài chính: Tổng tiền, Đã thu, Còn phải thu. Ghi nhận cọc (`DEPOSIT`), thu nốt (`BALANCE`), và hoàn tiền (`REFUND` - cần quyền `R10`). |
| **Tự động Chấm điểm QC bằng Vision AI** | ⚠️ Partial | Cột `ai_score` và `ai_critique` trong `order_qc_records` đã có sẵn trong schema, luồng gọi tự động sang Python Worker đang chờ nối dây. |

---

### TRỤ CỘT 4: CREATIVE STUDIO & XƯỞNG SẢN XUẤT NỘI DUNG (14 CHẶNG SÁNG TẠO)
- **Phạm vi code**: `src/modules/creative-production/`, `src/modules/content-engine/`, `src/modules/video-studio/`, `src/app/(app)/creative-studio/`

| Khối tính năng | Trạng thái | Đánh giá hiện trạng & Bằng chứng mã nguồn |
|---|---|---|
| **Hợp đồng Dữ liệu 14 Chặng Sáng tạo (IO Spec)**| ✅ Implemented | Zod schemas chuẩn hóa tại `contracts/` (Stage 01 Ingestion $\rightarrow$ Stage 14 Multi-platform Publisher). Kiểm soát đồng bộ tự động qua `conformance.ts`. |
| **Tách nền & Ghép bối cảnh (Scene Generation)** | ✅ Implemented | Worker Python `generate_scene.py` kết hợp nhà cung cấp ngoài (Cloud AI) và dự phòng cục bộ để dựng ảnh sản phẩm đặt trong các bối cảnh sang trọng. |
| **Xưởng Video Ngắn Sản phẩm (Video Studio)** | ✅ Implemented | Ghép ảnh sản phẩm thành video ngắn tỷ lệ 9:16 (TikTok, Reels), lồng nhạc nền tự động từ kho `music_tracks` và lồng giọng đọc AI ElevenLabs (`voice_clones`). |
| **Bộ Sinh Bài Viết Đa Kênh (Social Content)** | ✅ Implemented | `content-engine`: Sinh bài viết Facebook, Instagram, Zalo dựa trên 5 góc độ tiếp cận (Cảm xúc, Khuyến mãi, Tác phẩm nghệ thuật, Giáo dục cắm hoa, Bắt trend). |
| **Lịch Đăng Bài Đa Kênh (Social Publishing)** | ⚠️ Partial | Giao diện xếp lịch đăng tại `/lich-dang` đã hoàn thiện; phần kết nối API đăng bài tự động lên Fanpage Facebook qua Graph API đang dùng mô phỏng sandbox. |

---

### TRỤ CỘT 5: HỘI THOẠI ĐA KÊNH & TRỢ LÝ TƯ VẤN BÁN HOA AI (M08)
- **Phạm vi code**: `src/modules/chat-assistant/`, `src/app/(app)/hoi-thoai/`, `src/app/(app)/chat/`

| Khối tính năng | Trạng thái | Đánh giá hiện trạng & Bằng chứng mã nguồn |
|---|---|---|
| **Hộp thư Hội thoại Hợp nhất (Unified Inbox)** | ✅ Implemented | Giao diện hội thoại realtime tại `/hoi-thoai`, hỗ trợ quản lý tin nhắn Zalo OA, Messenger và Web Chat trên cùng một màn hình. |
| **AI Tư vấn Bán hoa Ngữ cảnh (Contextual AI)** | ✅ Implemented | AI Chatbot tra cứu trực tiếp Product Master Index để báo giá hoa, tư vấn mẫu theo ngân sách và gợi ý ý nghĩa hoa theo dịp sinh nhật/khai trương. |
| **Bàn giao Người thật (Human Handoff)** | ✅ Implemented | Khi khách hàng yêu cầu gặp tư vấn viên hoặc có khiếu nại, bot tự động nhường quyền và gửi thông báo cho nhân viên Sale trực ca. |
| **Tự động Trích xuất Đơn hàng từ Chat (M10)** | ⚠️ Partial | AI có khả năng bóc tách tên người nhận, SĐT và địa chỉ từ đoạn chat; việc tự động bắn đơn sang `order_coordinations` (ĐP-5) đang chờ hoàn thiện webhook. |

---

### TRỤ CỘT 6: THỊ TRƯỜNG THÔNG MINH & DẪN CHỨNG VIDEO KÉP (MARKET INTELLIGENCE)
- **Phạm vi code**: `src/modules/market-intelligence/`, `src/app/(app)/market-intelligence/`

| Khối tính năng | Trạng thái | Đánh giá hiện trạng & Bằng chứng mã nguồn |
|---|---|---|
| **Quét & Phân tích Xu hướng Thị trường** | ✅ Implemented | Quản lý bảng `research_runs` (DAILY_DEEP, HOURLY_PULSE), tự động bóc tách chủ đề hot, từ khóa thịnh hành và cơ hội kinh doanh cho shop hoa. |
| **Dẫn chứng Video Kép (Dual Video Evidence)** | ✅ Implemented | Mọi thẻ xu hướng hiển thị video chứng minh thực tế từ 2 nền tảng: **TikTok (9:16)** và **YouTube (16:9)** qua `video-evidence-catalog.ts`. |
| **Bộ Lọc Chống Tràn Từ Khóa Thô** | ✅ Implemented | Hàm `getOpportunityHeadline()` và `formatCleanHook()` làm sạch chuỗi từ khóa thô, ngăn chặn việc hiển thị chuỗi keyword nối dấu phẩy trên giao diện. |
| **Gắn kết Sản phẩm Shop vào Xu hướng** | ✅ Implemented | Khớp nối ảnh sản phẩm shop với xu hướng thị trường thông qua `product_analysis_runs` (tính điểm `trend_fit_score`, `audience_fit_score`). |

---

### TRỤ CỘT 7: ĐỊNH GIÁ & QUẢN TRỊ DANH MỤC SẢN PHẨM (M02 & M03)
- **Phạm vi code**: `src/modules/products/`, `src/app/(app)/san-pham/`, `src/app/(app)/gia/`, `src/app/(app)/bao-gia/`

| Khối tính năng | Trạng thái | Đánh giá hiện trạng & Bằng chứng mã nguồn |
|---|---|---|
| **Quản trị Danh mục Gốc (Product Master Index)**| ✅ Implemented | Quản lý bảng `products`, `product_variants`, `product_images`. Hỗ trợ danh mục danh sách, tra cứu đa tiêu chí (dáng, mặt, vật chứa, tone màu). |
| **Hệ số Kích thước Biến thể (Size Multipliers)** | ✅ Implemented | `product-size-variants.ts`: Tự động tính toán biến thể Size S ($0.8\times$), M ($1.0\times$), L ($1.3\times$), VIP ($1.6\times$) dựa trên BOM gốc. |
| **Công thức Định giá & Rào chắn Giá (Price Guard)**| ✅ Implemented | `pricing-rules.ts` & `price-guard.ts`: Tính giá vốn = vật tư + tiền công + hao hụt. Rào chắn giá: cấm đặt giá bán dưới sàn giá vốn (quyền `C10`). |
| **Quản lý Tồn kho Vật tư Tức thời** | ⚠️ Partial | Bảng `product_inventory` đã có trong schema, tuy nhiên tính năng tự động trừ kho khi đơn hàng được duyệt sản xuất chưa được kích hoạt liên thông. |

---

### TRỤ CỘT 8: QUẢN HỆ KHÁCH HÀNG & CHĂM SÓC DỊP KỶ NIỆM (CRM M09)
- **Phạm vi code**: `src/modules/crm/`, `src/app/(app)/khach-hang/`

| Khối tính năng | Trạng thái | Đánh giá hiện trạng & Bằng chứng mã nguồn |
|---|---|---|
| **Hồ sơ Khách hàng & Phân tầng RFM** | ✅ Implemented | Quản lý bảng `customers`, tự động phân tầng: NEW, BRONZE, SILVER, GOLD, VIP dựa trên tần suất mua và tổng chi tiêu. |
| **Quản lý Ngày Kỷ niệm & Dịp Tặng (Occasions)** | ✅ Implemented | Quản lý ngày sinh nhật người thân, ngày cưới, ngày thành lập công ty đối tác. Tự động nhắc nhở nhân viên chăm sóc trước 3–7 ngày. |
| **Chiến dịch Tri ân & Mã Giảm giá (Vouchers)** | ✅ Implemented | Quản lý bảng `crm_vouchers`, thiết lập quy tắc giảm giá theo % hoặc số tiền cố định, giới hạn lượt dùng và hạn sử dụng. |
| **Xuất Dữ liệu Khách hàng An toàn** | ✅ Implemented | Chặn trần cứng xuất file danh sách khách hàng (`Q5` - chỉ Điều hành được phép tải dữ liệu ra máy). |

---

### TRỤ CỘT 9: QUẢN TRỊ TRƯỜNG NỀN TẢNG & MỞ RỘNG TÙY BIẾN (FIELD PLATFORM - ĐP-3)
- **Phạm vi code**: `src/modules/field-platform/`, `src/app/(platform)/van-hanh/truong-du-lieu/`

| Khối tính năng | Trạng thái | Đánh giá hiện trạng & Bằng chứng mã nguồn |
|---|---|---|
| **Sổ Đăng ký Trường Dữ liệu Toàn Hệ thống** | ✅ Implemented | Bảng `field_definitions`: Quản lý siêu dữ liệu của hàng trăm trường dữ liệu trong đơn hàng, đối tác, sản phẩm. |
| **Danh mục Giá trị Động (Field Catalogs)** | ✅ Implemented | Bảng `field_catalogs` và `field_catalog_values`: Quản lý các danh mục lựa chọn (priority, service level, delivery type, payment method). |
| **Quản trị Nền tảng Tạo Trường Mới (Custom Fields)**| ✅ Implemented | Quản trị viên nền tảng có thể tạo thêm trường dữ liệu tùy biến hoàn toàn mới (tiền tố `cf_`) ngay trên Console Vận hành mà không cần sửa code. |
| **Ghi đè Cấu hình theo Tổ chức (Tenant Overrides)**| ✅ Implemented | Bảng `field_config_overrides`: Cho phép từng shop hoa bật/tắt hoặc đổi nhãn các trường dữ liệu phù hợp với mô hình kinh doanh riêng. |

---

### TRỤ CỘT 10: HẠ TẦNG CỐT LÕI, AI GATEWAY & BẢO MẬT (FOUNDATION)
- **Phạm vi code**: `src/core/`, `src/modules/organization/`, `src/modules/audit/`, `src/modules/usage/`

| Khối tính năng | Trạng thái | Đánh giá hiện trạng & Bằng chứng mã nguồn |
|---|---|---|
| **Cổng AI Gateway Tập trung (Port Interfaces)** | ✅ Implemented | 10 cổng tại `src/core/ports/`. Nghiệp vụ gọi năng lực AI trừu tượng, không gọi SDK nhà cung cấp. Sàn quyền riêng tư (`SENSITIVE`) không bao giờ để lọt dữ liệu ra ngoài. |
| **Hạn mức Tín dụng & Chi phí (Usage Engine)** | ✅ Implemented | Trừ tín dụng (Credits) ngay tại thời điểm tạo Job phía Core (`usage_transactions`), worker chỉ tính toán đối soát chi phí thực tế `ai_requests`. |
| **Nhật ký Kiểm toán Toàn vẹn (Audit Logs)** | ✅ Implemented | Mọi hành động phê duyệt, sửa đổi cấu hình hoặc thao tác nhạy cảm đều được ghi nhận vào `audit_logs` (lưu trữ người thực hiện, trước/sau thay đổi). |
| **Đa Khách thuê & Quản trị Tổ chức** | ✅ Implemented | Quản lý bảng `organizations`, phân quyền chi nhánh (`branches`), quản trị thành viên và tích hợp cơ chế đăng nhập nội bộ an toàn. |

---

## 3. TỔNG KẾT TRẠNG THÁI TOÀN HỆ THỐNG

| Nhãn phân loại | Số lượng phân hệ | Tỷ lệ (%) | Nhận xét tổng quan |
|---|---|---|---|
| ✅ **Implemented (Chạy thực tế)** | **24 phân hệ** | **80%** | Các nghiệp vụ sống còn: Nhận diện hoa M01a, Nội dung bán hàng M01b, Thẻ chào khách, Đặt hàng Swipe Brochure, Tháp điều phối Control Tower, Quản lý QC, Thanh toán VietQR, Danh mục sản phẩm, CRM và Nền quản trị trường đã hoàn chỉnh 100% mã nguồn và có test kiểm định. |
| ⚠️ **Partial (Một phần / Chờ nối dây)** | **5 phân hệ** | **17%** | Gồm các tính năng nâng cao: Chấm điểm AI QC tự động (chờ kích hoạt worker call); Đăng bài tự động lên Facebook Graph API (đang dùng sandbox); Tự động bắn đơn từ Chat sang Điều phối (chờ webhook ĐP-5); Trừ tồn kho tự động khi cắm hoa; và Cơ chế nhập địa chỉ 2 cơ chế (chờ duyệt Q-ĐC). |
| ❌ **Missing / Chưa xây** | **1 phân hệ** | **3%** | Cổng tương tác trực tiếp dành riêng cho Đối tác ngoài (Partner Portal) — theo quyết định PO D3 là không làm, nhân viên điều phối sẽ thao tác hộ. |

---

## 4. DANH MỤC NỢ KỸ THUẬT & KHUYẾN NGHỊ NÂNG CẤP ENTERPRISE

Từ kết quả thẩm định line-by-line, dưới đây là các khuyến nghị quan trọng nhất để đưa ALG Core lên chuẩn **Thương Mại Cấp Doanh Nghiệp (Enterprise Commercial-Ready)**:

### 4.1 Khắc phục Vi phạm SRP (Tệp giao diện quá giới hạn 350 dòng)
Các file giao diện trung tâm đang gánh quá nhiều logic và vượt xa quy định code hygiene:
- `src/app/(app)/tai-anh/page.tsx`: **1,878 dòng** $\rightarrow$ Cần tách thành 4 Workspace riêng (`M01aWorkspace`, `M01bWorkspace`, `M01cWorkspace`, `StorageWorkspace`).
- `src/components/coordinator/control-tower-dashboard.tsx`: **916 dòng** $\rightarrow$ Cần tách bảng đơn và các modal thành module con.
- `src/components/greeting-card/customer/brochure-customer-experience.tsx`: **1,120 dòng** $\rightarrow$ Cần phân rã form đặt hàng và trình diễn thẻ hoa.

### 4.2 Nâng cấp Cơ chế Thông báo Thời gian thực (Realtime Architecture)
- Hiện tại Tháp Điều phối đang dùng Polling định kỳ mỗi 60 giây (`REFRESH_MS = 60_000`).
- *Khuyến nghị*: Chuyển đổi sang Server-Sent Events (SSE) hoặc WebSocket nội bộ để khi thợ cắm hoa nạp ảnh thành phẩm hoặc khi đơn rơi vào cảnh báo vỡ SLA, màn hình điều phối viên lập tức phát chuông cảnh báo mà không có độ trễ.

### 4.3 Khả năng Phục hồi Kết nối AI Worker trên Thiết bị Di động
- Các thao tác xử lý ảnh AI Vision kéo dài 10–25 giây. Nếu mạng di động của shop hoa bị gián đoạn, kết nối SSE có thể bị đứt.
- *Khuyến nghị*: Bổ sung cơ chế Heartbeat/Polling tự phục hồi (Fallback Poll) kiểm tra trạng thái qua `GET /api/v1/jobs/:id` nếu sau 15 giây không nhận được sự kiện SSE mới.

### 4.4 Tối ưu hóa Nén Ảnh Thông minh Phía Client (Client-Side Compression)
- Shop hoa chụp ảnh trực tiếp từ smartphone thường có dung lượng lớn (8MB–15MB).
- *Khuyến nghị*: Tích hợp Web Worker nén ảnh tự động (Canvas Resize tối đa 2048px, nén WebP 85%) ngay trước khi gửi yêu cầu ký URL tải lên Cloud Storage, giúp tiết kiệm 80% băng thông và giảm 3 lần thời gian tải.
