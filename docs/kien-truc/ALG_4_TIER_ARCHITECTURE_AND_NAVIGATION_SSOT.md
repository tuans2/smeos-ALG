# ALG 4-TIER ARCHITECTURE & NAVIGATION SSOT
## Đặc Tả Kiến Trúc 4 Tầng & Chuẩn Hóa Điều Hướng (Sidebar) Hệ Thống ALG

> **Mã văn bản:** `DOC-ARCH-4TIER-NAV-001`  
> **Cấp thẩm quyền:** Level 2 — Architectural SSOT  
> **Ngày phê duyệt:** 26/10/2026  
> **Branch thực thi:** `Thietke_sidebar_ALL`  
> **Phạm vi áp dụng:** Toàn bộ hệ thống ALG (`src/components/layout/`, `src/modules/organization/`, `src/app/`)

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG 4 TẦNG

Hệ sinh thái **ALG** được cấu trúc thành **4 tầng độc lập nhưng cộng sinh chặt chẽ**, mỗi tầng giải quyết một bài toán kinh doanh và nhiệm vụ giá trị riêng biệt:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    🏛️ TẦNG 1: SAAS MOTHER                                       │
│                       (Hệ Điều Hành Quản Trị Tối Cao Nền Tảng Mẹ)                               │
│  - Quản trị toàn bộ 3 tầng dưới: SaaS Ngành, ChainOS, StoreOS                                   │
│  - Hạ tầng Cloud, Đa tenant, Cách ly dữ liệu (Tenant Isolation)                                 │
│  - Quản lý Gói cước SaaS (Plans & Subscriptions), Doanh thu nền tảng                            │
│  - Quản trị Cổng AI Providers, Model License (D18), Circuit Breaker & Quota                     │
└───────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                │ Quản lý & Phân quyền tổ chức
         ┌──────────────────────────────────────┴──────────────────────────────────────┐
         ▼                                                                            ▼
┌─────────────────────────────────────────────────┐       ┌─────────────────────────────────────────────────┐
│              🌐 TẦNG 2: SAAS NGÀNH              │       │               🔗 TẦNG 3: CHAINOS                │
│       (Hệ Sinh Thái Chuẩn Hóa & Mạng Lưới       │       │         (Chuỗi Thương Hiệu Đơn Ngành:           │
│        Bán Hàng Affiliate Tự Động Đa Đối Tác)   │       │         Bán Hàng Chuỗi + Điều Hành Mạng Lưới)   │
│  1. Bộ não Chuẩn hóa Ngành:                     │       │  1. Bán hàng Thương hiệu Chuỗi (HQ Sales):      │
│     - Taxonomy, Định lượng BOM Spec, Ngành mẫu  │       │     - Catalog Bộ sưu tập Chuỗi                  │
│     - Kho ấn phẩm A6, AI Studio Prompt Blueprints│      │     - Đơn khách đặt trực tiếp vào Chuỗi         │
│  2. Cỗ máy Bán hàng Affiliate Tự Động:          │       │     - CSKH & Marketing thương hiệu Chuỗi        │
│     - Phát hành Link bán (Landing Page, Catalog,│       │  2. Điều phối & Mạng lưới Chi nhánh / Xưởng:    │
│       Smart Greeting Card, Voucher)             │       │     - Tháp điều phối (Control Tower)            │
│     - Auto-Dispatch Engine: Tự động định tuyến  │       │     - Bắn đơn gia công (Subcontract Orders)     │
│       đơn về Cửa hàng/Đối tác tối ưu để gia công│       │     - Chat nội bộ & Duyệt chất lượng (QC)       │
│     - Tự động chia hoa hồng & Đối soát gia công │       │     - Đối soát công nợ chi nhánh / xưởng ngoài  │
└────────────────────────┬────────────────────────┘       └────────────────────────┬────────────────────────┘
                         │                                                         │
                         │ Bắn đơn gia công Affiliate                              │ Điều phối đơn gia công Chuỗi
                         └────────────────────────────┬────────────────────────────┘
                                                      ▼
                                  ┌─────────────────────────────────────────────────┐
                                  │               🏪 TẦNG 4: STOREOS                │
                                  │       (Hệ Điều Hành Toàn Diện Cho Cửa Hàng)     │
                                  │  1. Vận hành Kinh doanh Độc lập tại Tiệm:       │
                                  │     - Bán hàng tại chỗ (POS, Khách quen, CRM)   │
                                  │     - AI Studio chụp ảnh, tạo video, viết bài   │
                                  │     - Quản lý kho, khả dụng, tính giá lẻ        │
                                  │     - Sổ quỹ thu chi, giao vận nội thành        │
                                  │  2. Cổng Nhận Đơn Mạng Lưới (Branch Portal):    │
                                  │     - Tiếp nhận đơn rót về từ SaaS Ngành & Chuỗi│
                                  │     - Hàng đợi thợ chế tác (Production Queue)   │
                                  │     - In ấn phẩm A6 (Tag, Card, Menu, Warranty) │
                                  │     - Chụp ảnh nghiệm thu gửi khách / Tổng bộ   │
                                  └─────────────────────────────────────────────────┘
```

---

## 2. MA TRẬN PHÂN ĐỊNH BẢN CHẤT GIÁ TRỊ 4 TẦNG

| Tiêu chí | Tầng 1: SaaS Mother | Tầng 2: SaaS Ngành | Tầng 3: ChainOS | Tầng 4: StoreOS |
| :--- | :--- | :--- | :--- | :--- |
| **Bản chất nhiệm vụ** | Quản trị nền tảng SaaS & Cơ sở hạ tầng đám mây đa tổ chức. | Chuẩn hóa ngành hàng + Vận hành mạng lưới bán hàng Affiliate tự động xuyên cửa hàng. | Vận hành chuỗi thương hiệu đơn ngành: Bán hàng tập trung và Điều phối mạng lưới chi nhánh. | Vận hành toàn diện một điểm bán lẻ: Tự bán hàng tại chỗ + Nhận đơn gia công từ mạng lưới. |
| **Đối tượng sử dụng** | `platform_admin`, DevOps, Quản trị viên hệ thống. | `industry_admin`, Chuyên gia ngành, Giám đốc mạng lưới Affiliate. | `flower_network_admin`, `coordinator`, `ceo`, `manager`, `quality_control`. | `store_admin`, `sales`, `florist` (Thợ cắm/may/bếp), `crm`. |
| **Phạm vi ngành** | Đa ngành, bao trùm toàn hệ thống. | Đa ngành (Hệ sinh thái liên kết nhiều ngành hàng). | **Đơn ngành chuyên sâu** (Hoa tươi, Thời trang, F&B...). | **Đơn ngành** theo loại hình của cửa hàng. |
| **Câu hỏi trọng tâm** | *"Hạ tầng có ổn định, bảo mật và các tenant dùng đúng gói không?"* | *"Chiến dịch affiliate đang tạo bao nhiêu đơn và phân bổ về đâu?"* | *"Chuỗi bán được bao nhiêu đơn và các chi nhánh xử lý ra sao?"* | *"Hôm nay tiệm có bao nhiêu đơn, thợ làm kịp không và tiền về bao nhiêu?"* |
| **Đơn vị thao tác lõi** | Tenant, AI Model, Quota Token, Gói dịch vụ. | Link bán (Landing/Catalog/Card), Đơn Affiliate, Quy chuẩn BOM. | Đơn thương hiệu Chuỗi, Đơn gia công chi nhánh, Đối soát chuỗi. | Khách hàng lẻ, Đơn tại quầy, Đơn nhận từ mạng lưới, Phiếu thợ. |

---

## 3. DÒNG CHẢY ĐƠN HÀNG & DỮ LIỆU LIÊN TẦNG (CROSS-TIER ORDER FLOW)

### 3.1 Luồng 1 — Kênh Bán Hàng Affiliate Tự Động của SaaS Ngành:
```
[SaaS Ngành phát hành Link: Landing Page / Catalog / Thẻ chào / Mã QR]
                            │
                            ▼
      [Khách hàng truy cập link, chọn sản phẩm và đặt hàng]
                            │
                            ▼
     [Hệ thống SaaS Ngành ghi nhận đơn hàng mạng lưới]
                            │
                            ▼
  [AUTO-DISPATCH ENGINE: Quét vị trí khách, tồn kho & tay nghề các Store đối tác]
                            │
                            ▼
     [Bắn đơn gia công (Subcontract Order) về StoreOS gần nhất]
                            │
                            ▼
 [StoreOS: Hiện thông báo trên Telegram Card + Tab "Đơn nhận từ mạng lưới" (/cua-hang)]
                            │
                            ▼
      [Thợ tại StoreOS cắm hoa/may đo/làm món + In ấn phẩm A6]
                            │
                            ▼
   [StoreOS quét ảnh nghiệm thu thành phẩm -> Khách duyệt -> Giao hàng]
                            │
                            ▼
 [SaaS Ngành ghi nhận hoàn tất -> Tự động tính Hoa hồng Affiliate & Phí gia công]
```

### 3.2 Luồng 2 — Kênh Bán Hàng & Điều Phối của Chuỗi (ChainOS):
```
[Khách đặt hàng tại Kênh Chuỗi: Website HQ, Hotline, Fanpage Chuỗi]
                            │
                            ▼
 [ChainOS tiếp nhận đơn tại Trung tâm Bán hàng Chuỗi (/don-hang)]
                            │
                            ▼
 [Điều phối viên dùng Tháp Điều Phối (/dieu-phoi) bắn đơn về Chi nhánh phụ trách]
                            │
                            ▼
 [Chi nhánh (StoreOS) sản xuất -> Báo cáo tiến độ qua Living Dashboard Card]
                            │
                            ▼
 [Bộ phận QC Chuỗi duyệt ảnh thành phẩm (/duyet) trước khi giao cho khách]
                            │
                            ▼
 [Kế toán Chuỗi đối soát công nợ chi nhánh & phí gia công định kỳ (/du-lieu)]
```

### 3.3 Luồng 3 — Cửa hàng Cơ sở Tự Kinh Doanh (StoreOS):
```
[Khách vãng lai / Khách quen mua tại tiệm hoặc qua Chat Fanpage tiệm]
                            │
                            ▼
 [Nhân viên bán hàng tạo đơn trên StoreOS (/don-hang) hoặc gửi Thẻ chào (/the-chao)]
                            │
                            ▼
 [Đơn chuyển vào Hàng đợi chế tác -> Thợ xem công thức (BOM Recipe) làm hàng]
                            │
                            ▼
 [In ấn phẩm A6 tại chỗ (Tag giá, Thẻ chúc, Menu, Bảo hành) dán lên sản phẩm]
                            │
                            ▼
 [Bàn giao Shipper -> Thu tiền -> Tự động cập nhật Sổ quỹ thu chi (/so-lieu)]
```

---

## 4. CHI TIẾT CẤU TRÚC ĐIỀU HƯỚNG (SIDEBAR SPECIFICATION)

---

### 4.1 SIDEBAR TẦNG 1: SAAS MOTHER
- **Architecture Nametag:** `ALG • SaaS Mother · Platform Console` (`Tầng 1`)
- **Màu sắc nhận diện:** Tím hoàng gia (`bg-[#6B21A8]` / `text-purple-700` / gradient strip `from-[#6B21A8]/15`)
- **Định hướng cốt lõi:** Platform Control Center · Quản trị nền tảng SaaS
- **Tư duy thiết kế:** Đây là console dành riêng cho quản trị viên nền tảng (`platform_admin`), không phải nơi trực tiếp xử lý đơn hàng hay tạo nội dung bán hàng lẻ. Sidebar được tinh gọn, có tính hệ thống cao, tập trung hoàn toàn vào tổ chức, dịch vụ, tài nguyên, bảo mật và giám sát kỹ thuật.
- **Tuyến URL gốc:** `/van-hanh/*` (chế độ tổ chức `PLATFORM` hoặc role `platform_admin`)
- **Builder Code:** `src/components/layout/nav/nav-mother.ts` (`buildMotherNav`)

```yaml
nhom_1:
  key: "tong-quan"
  label: "TỔNG QUAN"
  entries:
    - label: "Tổng quan nền tảng"
      href: "/van-hanh"
      icon: "LayoutDashboard"
      navKey: "platform-overview"
      mo_ta: "Platform Journey Home: Bảng chỉ huy toàn cảnh, số lượng tenant, lưu lượng và doanh thu"

nhom_2:
  key: "to-chuc-dich-vu"
  label: "TỔ CHỨC & DỊCH VỤ"
  entries:
    - label: "Tổ chức & Tenant"
      href: "/van-hanh/to-chuc"
      icon: "Building2"
      navKey: "platform-organizations"
      mo_ta: "Quản trị danh sách tổ chức 3 tầng (SaaS Ngành, Chuỗi thương hiệu, Cửa hàng cơ sở)"
    - label: "Đăng ký & Phê duyệt"
      href: "/van-hanh/dang-ky"
      icon: "UserPlus"
      navKey: "platform-registrations"
      mo_ta: "Tiếp nhận và thẩm định hồ sơ đăng ký gia nhập nền tảng từ doanh nghiệp mới"
    - label: "Gói dịch vụ & Đăng ký"
      href: "/van-hanh/phe-duyet"
      icon: "CreditCard"
      navKey: "platform-subscriptions"
      mo_ta: "Quản lý gói thuê bao SaaS, hạn mức tài nguyên (quota) và phê duyệt nâng cấp"
    - label: "Ngành hàng & Năng lực"
      href: "/van-hanh/nganh"
      icon: "Layers"
      navKey: "platform-industry-matrix"
      mo_ta: "Bật/tắt và quản trị plugin 7 ngành hàng chuẩn hóa cùng ma trận năng lực RBAC"

nhom_3:
  key: "ha-tang-tai-nguyen"
  label: "HẠ TẦNG & TÀI NGUYÊN"
  entries:
    - label: "AI Providers & Models"
      href: "/cai-dat-ai"
      icon: "Cpu"
      navKey: "platform-ai-providers"
      mo_ta: "Quản lý kết nối các cổng AI Gateway (OpenAI, Gemini, Anthropic), model routing và quota"
    - label: "Mức dùng & Chi phí"
      href: "/van-hanh/muc-dung"
      icon: "WalletCards"
      navKey: "platform-usage"
      mo_ta: "Giám sát Credit tiêu thụ, Token AI, GPU hours và chi phí vận hành đám mây"
    - label: "Dữ liệu & Lưu trữ"
      href: "/van-hanh/du-lieu"
      icon: "Database"
      navKey: "platform-org-data"
      mo_ta: "Tra cứu dữ liệu đa tenant, giám sát dung lượng S3/Cloudflare R2 và sao lưu CSDL"

nhom_4:
  key: "do-tin-cay-bao-mat"
  label: "ĐỘ TIN CẬY & BẢO MẬT"
  entries:
    - label: "Sức khỏe hệ thống"
      href: "/van-hanh/suc-khoe"
      icon: "Activity"
      navKey: "platform-health"
      mo_ta: "Trạng thái CSDL Postgres, Redis Queue, Vision Worker, Media Worker, Video Worker"
    - label: "Bảo mật & Nhật ký kiểm toán"
      href: "/van-hanh/nhat-ky"
      icon: "ShieldCheck"
      navKey: "platform-audit"
      mo_ta: "Audit logs giám sát cách ly Tenant Isolation, phát hiện truy cập bất thường và an ninh"

nhom_5:
  key: "thiet-lap-platform"
  label: "THIẾT LẬP"
  entries:
    - label: "Cấu hình nền tảng"
      href: "/van-hanh/truong-du-lieu"
      icon: "SlidersHorizontal"
      navKey: "platform-custom-fields"
      mo_ta: "Cấu hình tham số môi trường, trường dữ liệu mở rộng toàn cục và khóa hệ thống"
```

> **Nguyên tắc cốt lõi của Tầng 1 (SaaS Mother):**
> - **Tổ chức & Dịch vụ:** Quản lý toàn bộ vòng đời khách hàng SaaS (từ đăng ký, thẩm định đến nâng cấp gói cước).
> - **Hạ tầng & Tài nguyên:** Kiểm soát dòng tiền chi phí hạ tầng (Token AI, Cloud Storage, Compute).
> - **Độ tin cậy & Bảo mật:** Giám sát liên tục uptime và nhật ký kiểm toán bảo vệ an toàn phân lập dữ liệu (Tenant Isolation).
> - **Thiết lập:** Cấu hình nền tảng mang tính hệ thống.
> - **Tuyệt đối không đưa vào:** Catalog, Thẻ chào, Studio ảnh, Đơn hàng affiliate hay các chức năng tác nghiệp bán hàng lẻ — đó là nghiệp vụ thuộc về các tầng dưới.

---

### 4.2 SIDEBAR TẦNG 2: SAAS NGÀNH
- **Architecture Nametag:** `ALG • SaaS Ngành · Industry Platform` (`Tầng 2`)
- **Màu sắc nhận diện:** Xanh lục ngọc / Ngọc bích (`teal-600` / `teal-950`)
- **Định hướng cốt lõi:** Industry Growth & Network Platform · Nền tảng phát triển ngành và mạng lưới affiliate
- **Tư duy thiết kế:** Tầng này đóng vai trò vừa là bộ não chuẩn hóa ngành hàng, vừa là cỗ máy tạo kênh bán và phân phối đơn hàng tự động đến mạng lưới đối tác. Sidebar làm nổi bật ba trụ cột: tạo công cụ bán hàng sinh doanh thu, quản lý mạng lưới gia công và theo dõi hiệu quả thương mại.
- **Tuyến URL:** Kết hợp `/(app)/*` và các console điều hành ngành (`buildIndustryNav`)
- **Builder Code:** `src/components/layout/nav/nav-industry.ts` (`buildIndustryNav`)

```yaml
nhom_1:
  key: "trung-tam-dieu-hanh"
  label: "TRUNG TÂM ĐIỀU HÀNH"
  entries:
    - label: "Tổng quan ngành"
      href: "/"
      icon: "LayoutDashboard"
      navKey: "industry-overview"
      mo_ta: "Báo cáo tổng hợp số lượng đối tác liên kết, lưu lượng affiliate và tổng đơn phân bổ"

nhom_2:
  key: "cong-cu-ban-hang"
  label: "CÔNG CỤ BÁN HÀNG"
  entries:
    - label: "Landing Page & Kênh bán"
      href: "/landing-page"
      icon: "Globe"
      navKey: "industry-landing"
      mo_ta: "Trang đích chuyển đổi cao cho từng sản phẩm/chiến dịch ngành để đối tác quảng bá"
    - label: "Catalog & QR"
      href: "/catalog"
      icon: "QrCode"
      navKey: "industry-catalog"
      capability: "J1"
      mo_ta: "Catalog điện tử phân phối cho các đối tác affiliate chia sẻ và thu hút khách"
    - label: "Thẻ chào sản phẩm"
      href: "/the-chao"
      icon: "Sparkles"
      navKey: "industry-greeting-card"
      capability: "R1"
      mo_ta: "Công cụ tư vấn và chốt đơn tự động qua thẻ quà tặng số đa ngành"
    - label: "Thư viện Template"
      href: "/kho-templates"
      icon: "LayoutTemplate"
      navKey: "industry-templates"
      mo_ta: "Kho mẫu ấn phẩm chuẩn ngành (Tag giá, Menu, Thẻ bảo hành, Care Guide) cho đối tác in ấn"
    - label: "Studio sáng tạo AI"
      href: "/creative-studio"
      icon: "Wand2"
      navKey: "industry-studio"
      capability: "I1"
      mo_ta: "Bộ công cụ AI sản xuất ảnh marketing và bối cảnh thị giác chuẩn hóa theo ngành"

nhom_3:
  key: "chuan-hoa-nganh"
  label: "CHUẨN HÓA NGÀNH"
  entries:
    - label: "Danh mục & Sản phẩm mẫu"
      href: "/san-pham"
      icon: "Package"
      navKey: "industry-products"
      capability: "L1"
      mo_ta: "Taxonomy chuẩn hóa và thư viện sản phẩm mẫu theo ngành"
    - label: "Taxonomy & Quy chuẩn"
      href: "/van-hanh/nganh"
      icon: "Layers"
      navKey: "industry-taxonomy"
      mo_ta: "Quản trị danh mục ngành, thông số plugin contract, đơn vị đo và vai trò linh kiện BOM"
    - label: "Trường dữ liệu ngành"
      href: "/van-hanh/truong-du-lieu"
      icon: "SlidersHorizontal"
      navKey: "industry-fields"
      mo_ta: "Cấu hình thuộc tính động (dynamic attributes) theo đặc thù từng ngành hàng"

nhom_4:
  key: "mang-luoi-dieu-phoi"
  label: "MẠNG LƯỚI & ĐIỀU PHỐI"
  entries:
    - label: "Đối tác & Nhà cung cấp"
      href: "/dieu-phoi/doi-tac"
      icon: "Building2"
      navKey: "industry-partners"
      mo_ta: "Danh bạ các shop/xưởng gia công vệ tinh liên kết sẵn sàng nhận đơn"
    - label: "Đơn hàng Affiliate"
      href: "/don-hang"
      icon: "ShoppingBag"
      navKey: "industry-orders"
      capability: "R1"
      mo_ta: "Quản lý toàn bộ đơn hàng phát sinh từ các liên kết bán hàng của mạng lưới"
    - label: "Điều phối tự động"
      href: "/dieu-phoi"
      icon: "Radio"
      navKey: "industry-dispatch"
      capability: "C23"
      mo_ta: "Thuật toán định tuyến đơn về shop tối ưu theo vị trí địa lý và năng lực chế tác"
    - label: "Kiểm soát chất lượng"
      href: "/duyet"
      icon: "CheckCircle2"
      navKey: "industry-approvals"
      capability: "H3"
      mo_ta: "Duyệt ảnh sản phẩm thực tế của thợ gia công trước khi cho phép giao cho khách"

nhom_5:
  key: "hieu-qua-thuong-mai"
  label: "HIỆU QUẢ THƯƠNG MẠI"
  entries:
    - label: "Thị trường & Xu hướng"
      href: "/market-intelligence"
      icon: "TrendingUp"
      navKey: "industry-market"
      capability: "V2"
      mo_ta: "Phân tích xu hướng tiêu dùng, các dịp kích cầu và thị hiếu tiêu dùng theo ngành"
    - label: "Hiệu suất kênh bán"
      href: "/so-lieu"
      icon: "BarChart3"
      navKey: "industry-channel-performance"
      capability: "U3"
      mo_ta: "Đo lường tỷ lệ chuyển đổi, doanh thu theo kênh bán và hiệu quả đối tác affiliate"
    - label: "Hoa hồng & Đối soát"
      href: "/van-hanh/du-lieu"
      icon: "DollarSign"
      navKey: "industry-clearing"
      mo_ta: "Bảng cân đối hoa hồng affiliate, tiền công trả shop làm và đối soát công nợ"

nhom_6:
  key: "thiet-lap-nganh"
  label: "THIẾT LẬP"
  entries:
    - label: "Chính sách & Cấu hình ngành"
      href: "/cai-dat"
      icon: "Settings2"
      navKey: "industry-settings"
      capability: "F1"
      mo_ta: "Khung chính sách phí gia công (Craft Fee Policy), ngày lễ cao điểm và quy tắc phân chia hoa hồng"
```

> **Những quyết định quan trọng của Tầng 2 (SaaS Ngành):**
> 1. **Đặt công cụ tạo doanh thu ở vị trí nổi bật:** Landing Page, Catalog, Thẻ chào, Thư viện Template và Studio sáng tạo AI là các công cụ mũi nhọn tạo ra điểm tiếp xúc với khách hàng và phát sinh đơn hàng, được nhóm độc lập trong "CÔNG CỤ BÁN HÀNG" thay vì bị chìm trong nhóm chung.
> 2. **Tách chuẩn hóa ngành khỏi vận hành mạng lưới:**
>    - *Chuẩn hóa ngành:* Danh mục, taxonomy, BOM/spec và trường dữ liệu là tài sản chuẩn hóa (Standardization Assets).
>    - *Mạng lưới & Điều phối:* Đối tác, điều phối, đơn hàng và kiểm soát chất lượng (QC) là hoạt động vận hành dòng chảy (Operations Workflow).
> 3. **Báo cáo đo lường hiệu quả mô hình Affiliate:** Cung cấp bức tranh toàn diện về số đơn theo kênh, tỷ lệ chuyển đổi, chi phí hoa hồng và phí gia công.
> 4. **Điểm khác biệt cốt lõi với SaaS Mother:** SaaS Mother quản trị việc các tổ chức sử dụng nền tảng (Platform & Tenant Life-cycle); SaaS Ngành quản trị việc hệ sinh thái tạo ra giao dịch thương mại và vận hành mạng lưới đối tác (Commerce & Network Execution).
```

---

### 4.3 SIDEBAR TẦNG 3: CHAINOS
- **Architecture Nametag:** `ALG • ChainOS` (`Không gian điều hành chuỗi` · `Tầng 3`)
- **Màu sắc nhận diện:** Xanh da trời sâu (`sky-600` / `sky-950`)
- **Định hướng cốt lõi:** Chain Operations & Network Command
- **Tư duy thiết kế:** Điều hành chuỗi — Công cụ — Quản lý mạng lưới — Quản trị kết quả.
  - *01 · Điều hành:* xử lý các hoạt động đang diễn ra, đơn hàng và kiểm soát chất lượng (QC).
  - *02 · Công cụ:* nơi người dùng chủ động mở một công cụ để tạo, chỉnh sửa hoặc chuẩn bị tài nguyên phục vụ nghiệp vụ (Catalog, Thẻ chào, Studio AI, Video, Kho mẫu, Bộ sưu tập).
  - *03 · Kinh doanh & Khách hàng:* quản lý các đối tượng và quan hệ kinh doanh thường xuyên (Khách hàng CRM, CSKH, Chi nhánh & Xưởng, Năng lực).
  - *04 · Báo cáo & Tài chính:* đánh giá kết quả, doanh thu và đối soát công nợ.
  - *05 · Thiết lập:* cấu hình cách chuỗi hoạt động.
- **Tuyến URL:** `/(app)/*` (chế độ tổ chức `CHAIN` hoặc `FLOWER_NETWORK` qua `buildChainNav`)
- **Builder Code:** `src/components/layout/nav/nav-chain.ts` (`buildChainNav`)

```yaml
nhom_1:
  key: "dieu-hanh-chuoi"
  label: "01 · ĐIỀU HÀNH"
  entries:
    - label: "Tổng quan chuỗi"
      href: "/"
      icon: "LayoutDashboard"
      navKey: "chain-command"
      mo_ta: "Bảng chỉ huy mạng lưới: tiến độ vận hành, tình trạng đơn và cảnh báo SLA"
    - label: "Đơn hàng chuỗi"
      href: "/don-hang"
      icon: "ShoppingBag"
      navKey: "chain-orders"
      capability: "R1"
      mo_ta: "Toàn bộ đơn khách đặt trực tiếp qua Hotline, Fanpage và Website thương hiệu chuỗi"
    - label: "Tháp điều phối"
      href: "/dieu-phoi"
      icon: "Radio"
      navKey: "chain-coordinator"
      capability: "C23"
      mo_ta: "Phân bổ đơn về chi nhánh và xưởng vệ tinh tối ưu vị trí và thời gian"
    - label: "Duyệt chất lượng"
      href: "/duyet"
      icon: "CheckCircle2"
      navKey: "chain-qc"
      capability: "H3"
      mo_ta: "Nghiệm thu ảnh thành phẩm chi nhánh gửi lên trước khi giao cho khách hàng"

nhom_2:
  key: "cong-cu-chuoi"
  label: "02 · CÔNG CỤ"
  entries:
    - label: "Catalog & Kênh bán"
      href: "/catalog"
      icon: "Globe"
      navKey: "chain-catalog"
      capability: "J1"
      mo_ta: "Catalog điện tử phân phối cho các đối tác affiliate chia sẻ và chốt đơn"
    - label: "Thẻ chào sản phẩm"
      href: "/the-chao"
      icon: "Sparkles"
      navKey: "chain-greeting-card"
      capability: "R1"
      mo_ta: "Công cụ chốt đơn tự động qua thẻ quà tặng số của thương hiệu chuỗi"
    - label: "Studio sáng tạo AI"
      href: "/creative-studio"
      icon: "Wand2"
      navKey: "chain-studio"
      capability: "I1"
      mo_ta: "Sản xuất bộ ảnh tiếp thị đồng bộ cho chiến dịch toàn chuỗi"
    - label: "Công cụ ảnh & Video"
      href: "/video"
      icon: "Video"
      navKey: "chain-video"
      capability: "I1"
      mo_ta: "Tạo video ngắn giới thiệu sản phẩm tự động cho mạng xã hội"
    - label: "Kho mẫu & Ấn phẩm"
      href: "/kho-templates"
      icon: "LayoutTemplate"
      navKey: "chain-templates"
      mo_ta: "Thư viện mẫu A6 (Tag giá, Card, Menu, Care Guide) dùng chung toàn chuỗi"
    - label: "Quản lý bộ sưu tập & Giá"
      href: "/san-pham"
      icon: "Tag"
      navKey: "chain-collections"
      capability: "L1"
      mo_ta: "Quản lý Chain Collections và chính sách giá niêm yết phân bổ cho chi nhánh"

nhom_3:
  key: "kinh-doanh-chuoi"
  label: "03 · KINH DOANH & KHÁCH"
  entries:
    - label: "Khách hàng & CSKH"
      href: "/khach-hang"
      icon: "Users"
      navKey: "chain-customers"
      capability: "Q1"
      mo_ta: "Cơ sở dữ liệu khách hàng CRM tập trung của toàn chuỗi"
    - label: "Hội thoại"
      href: "/hoi-thoai"
      icon: "Bot"
      navKey: "chain-chat"
      capability: "T1"
      mo_ta: "Hộp thư tiếp nhận tư vấn và CSKH đa kênh tập trung"
    - label: "Chi nhánh & Xưởng"
      href: "/dieu-phoi/doi-tac"
      icon: "Store"
      navKey: "chain-branches"
      mo_ta: "Danh bạ hồ sơ, địa chỉ, năng lực và liên hệ của các chi nhánh thành viên"
    - label: "Khả dụng & Năng lực"
      href: "/san-pham/kha-dung"
      icon: "CalendarCheck"
      navKey: "chain-availability"
      capability: "L1"
      mo_ta: "Giám sát năng lực đáp ứng, ca thợ và tồn kho nguyên liệu các chi nhánh"

nhom_4:
  key: "bao-cao-tai-chinh-chuoi"
  label: "04 · BÁO CÁO & TÀI CHÍNH"
  entries:
    - label: "Báo cáo hiệu suất"
      href: "/so-lieu"
      icon: "BarChart3"
      navKey: "chain-stats"
      capability: "U3"
      mo_ta: "Doanh thu hợp nhất chuỗi, so sánh hiệu suất giữa các chi nhánh"
    - label: "Đối soát & Công nợ"
      href: "/du-lieu"
      icon: "Database"
      navKey: "chain-clearing"
      mo_ta: "Bảng công nợ gia công và phân chia doanh thu với các chi nhánh"

nhom_5:
  key: "thiet-lap-chuoi"
  label: "05 · THIẾT LẬP"
  entries:
    - label: "Chính sách & Cài đặt"
      href: "/cai-dat"
      icon: "Settings2"
      navKey: "chain-settings"
      capability: "F1"
      mo_ta: "Cài đặt phí gia công, hạn mức công nợ và chính sách thanh toán chuỗi"
```

---

### 4.4 SIDEBAR TẦNG 4: STOREOS
- **Architecture Nametag:** `ALG • StoreOS` (`Không gian làm việc cửa hàng` · `Tầng 4`)
- **Màu sắc nhận diện:** Xanh ngọc lục bảo (`emerald-600` / `emerald-950`)
- **Định hướng cốt lõi:** Store Workspace & Execution Center
- **Tư duy thiết kế:** Ưu tiên thao tác thực tế của nhân viên tiệm. Người dùng thường vào hệ thống để làm một việc cụ thể: tạo báo giá, phân tích ảnh, tạo nội dung, tính giá hoặc xử lý đơn.
  - *Việc hôm nay:* Ưu tiên theo vai trò (Đơn cần xử lý, Việc chờ duyệt).
  - *01 · Công cụ:* Thư viện công cụ dễ tìm, hỗ trợ thao tác nhanh không bị phân tán.
  - *02 · Bán hàng & Khách hàng:* Quản lý đơn bán tại tiệm, khách hàng CRM và chat.
  - *03 · Sản phẩm & Nguồn lực:* Danh mục mẫu, lịch ca/phòng/bàn, kho nguyên liệu.
  - *04 · Vận hành:* Đơn nhận từ mạng lưới, sản xuất điều phối, giao hàng, trao đổi nội bộ.
  - *05 · Quản trị cửa hàng:* Báo cáo kinh doanh, sổ quỹ thu chi, tri thức quy trình, cài đặt.
- **Tuyến URL:** `/(app)/*` (chế độ tổ chức `SINGLE` qua `buildStoreNav`)
- **Builder Code:** `src/components/layout/nav/nav-store.ts` (`buildStoreNav`)

```yaml
nhom_uu_tien: # Sinh động theo vai trò (Role UX)
  key: "viec-chinh"
  label: "⚡ Việc hôm nay"
  entries: "Đơn cần xử lý (/don-hang), Việc chờ duyệt (/duyet), Bàn làm việc (/)"

nhom_1:
  key: "cong-cu"
  label: "01 · CÔNG CỤ"
  entries:
    - label: "Thư viện công cụ"
      href: "/cong-cu"
      icon: "LayoutGrid"
      navKey: "toolkit"
      mo_ta: "Thư viện công cụ đa năng (Bán hàng, AI & Sáng tạo, Sản phẩm, Ấn phẩm, Tiện ích)"
    - label: "Chế tác tự động A-Z"
      href: "/creative-studio"
      icon: "Sparkles"
      navKey: "auto-campaign"
      capability: "I1"
      mo_ta: "Quy trình AI tự động trọn gói từ 1 ảnh thô ra bộ tư liệu bán hàng đa kênh"
    - label: "Thẻ chào sản phẩm"
      href: "/the-chao"
      icon: "CreditCard"
      navKey: "greeting-card"
      capability: "R1"
      mo_ta: "Tạo link thẻ chào kèm báo giá gửi khách duyệt mẫu và đặt cọc nhanh"
    - label: "Tạo Catalog & Link bán hàng"
      href: "/catalog"
      icon: "Globe"
      navKey: "catalog"
      capability: "J1"
      mo_ta: "Tạo trang Catalog online và link giới thiệu sản phẩm của tiệm"
    - label: "Phân tích ảnh bằng AI"
      href: "/tai-anh"
      icon: "Camera"
      navKey: "scan-photo"
      capability: "H1"
      mo_ta: "Trợ lý AI phân tích thành phần nguyên liệu từ ảnh chụp mẫu"
    - label: "Tạo ảnh sản phẩm"
      href: "/cong-cu/anh-san-pham"
      icon: "Wand2"
      navKey: "creative-studio"
      capability: "I1"
      mo_ta: "AI Studio tách nền, chỉnh sáng, nâng cấp ảnh sản phẩm chuyên nghiệp"
    - label: "Tạo video"
      href: "/video"
      icon: "Video"
      navKey: "video"
      capability: "I1"
      mo_ta: "Tạo video ngắn bán hàng tự động đăng TikTok / Reels / Shorts"
    - label: "Viết nội dung marketing"
      href: "/noi-dung"
      icon: "FileText"
      navKey: "content"
      capability: "I1"
      mo_ta: "Trợ lý AI viết bài đăng mạng xã hội chuẩn văn phong thương hiệu tiệm"
    - label: "Xu hướng & Cơ hội thị trường"
      href: "/cong-cu/thi-truong"
      icon: "TrendingUp"
      navKey: "market-trends"
      capability: "I1"
      mo_ta: "Khám phá xu hướng thiết kế, chủ đề hot và cơ hội mùa vụ cho tiệm"
    - label: "Kho mẫu & Ấn phẩm"
      href: "/kho-templates"
      icon: "LayoutTemplate"
      navKey: "templates"
      mo_ta: "In ấn phẩm A6 tại chỗ (Tag giá, Thẻ chúc mừng, Menu, Thẻ bảo hành, Care Guide)"
    - label: "Tính giá thành"
      href: "/gia"
      icon: "WalletCards"
      navKey: "pricing"
      capability: "L6"
      mo_ta: "Công cụ tính giá vốn theo nguyên vật liệu và biên lợi nhuận của tiệm"
    - label: "Trợ lý Tối ưu Tác nghiệp"
      href: "/cong-cu/toi-uu-he-thong"
      icon: "Brain"
      navKey: "system-optimizer"
      capability: "L6"
      mo_ta: "Học thói quen tác nghiệp và đề xuất cải tiến sử dụng toàn bộ công cụ"

nhom_2:
  key: "ban-hang"
  label: "02 · BÁN HÀNG & KHÁCH"
  entries:
    - label: "Đơn hàng"
      href: "/don-hang"
      icon: "ShoppingBag"
      navKey: "orders"
      capability: "R1"
      mo_ta: "Quản lý đơn bán tại quầy và đơn khách đặt trực tiếp"
    - label: "Khách hàng"
      href: "/khach-hang"
      icon: "Users"
      navKey: "customers"
      capability: "Q1"
      mo_ta: "Nhắc sinh nhật, ngày cưới, chăm sóc khách thân thiết của tiệm"
    - label: "Hội thoại"
      href: "/hoi-thoai"
      icon: "Bot"
      navKey: "chat"
      capability: "T1"
      mo_ta: "Hộp thư chat với khách từ Fanpage, Zalo, Website cửa hàng"

nhom_3:
  key: "san-pham"
  label: "03 · SẢN PHẨM & KHO"
  entries:
    - label: "Danh mục sản phẩm"
      href: "/san-pham"
      icon: "Tag"
      navKey: "products"
      capability: "L1"
      mo_ta: "Danh mục sản phẩm bán tại quầy kèm công thức thành phần BOM"
    - label: "Khả dụng & Lịch" # Động theo ngành (Homestay: Lịch phòng; FNB: Lịch bàn)
      href: "/san-pham/kha-dung"
      icon: "CalendarCheck"
      navKey: "availability"
      capability: "L1"
      mo_ta: "Cập nhật tồn kho nguyên liệu trong ngày và khả năng nhận đơn"
    - label: "Kho & Nguyên liệu"
      href: "/kho-du-lieu"
      icon: "Folder"
      navKey: "storage"
      capability: "G1"
      mo_ta: "Kho lưu trữ tài nguyên ảnh, video và quản lý nguyên vật liệu"

nhom_4:
  key: "van-hanh"
  label: "04 · VẬN HÀNH"
  entries:
    - label: "Đơn nhận từ mạng lưới"
      href: "/cua-hang"
      icon: "Inbox"
      navKey: "branch-portal"
      mo_ta: "Cổng nhận đơn gia công được rót về từ SaaS Ngành và ChainOS"
    - label: "Sản xuất & Điều phối"
      href: "/dieu-phoi"
      icon: "Radio"
      navKey: "coordinator"
      capability: "C23"
      mo_ta: "Điều phối đơn cho thợ làm và phân công shipper giao hàng"
    - label: "Giao hàng & Bàn giao"
      href: "/job"
      icon: "Clock"
      navKey: "jobs"
      capability: "G4"
      mo_ta: "Theo dõi trạng thái xử lý đơn hàng, bàn giao shipper và AI jobs"
    - label: "Việc chờ duyệt (QC)"
      href: "/duyet"
      icon: "CheckCircle2"
      navKey: "approval"
      capability: "H3"
      mo_ta: "Duyệt ảnh sản phẩm hoàn thiện trước khi xuất kho giao khách"
    - label: "Trao đổi nội bộ"
      href: "/tin-nhan"
      icon: "MessageSquare"
      navKey: "internal-chat"
      mo_ta: "Kênh trao đổi công việc nội bộ giữa nhân sự tiệm và điều phối chuỗi"

nhom_5:
  key: "quan-tri"
  label: "05 · QUẢN TRỊ TIỆM"
  entries:
    - label: "Báo cáo kinh doanh"
      href: "/so-lieu"
      icon: "BarChart3"
      navKey: "stats"
      capability: "U3"
      mo_ta: "Báo cáo doanh thu, lợi nhuận và tình hình bán hàng tiệm"
    - label: "Sổ quỹ & Thu chi"
      href: "/muc-dung"
      icon: "WalletCards"
      navKey: "usage"
      capability: "G8"
      mo_ta: "Dòng tiền thu chi thực tế trong ngày và số dư tài khoản"
    - label: "Tri thức & Quy trình"
      href: "/tri-thuc"
      icon: "BookOpen"
      navKey: "knowledge"
      mo_ta: "Cơ sở tri thức (Knowledge Base) đào tạo nhân viên và quy trình tiệm"
    - label: "Thiết lập & Kết nối"
      href: "/cai-dat"
      icon: "Settings2"
      navKey: "settings"
      capability: "F1"
      mo_ta: "Hồ sơ tiệm, tài khoản ngân hàng, mã thanh toán cọc và kết nối kênh"
```

---

### 4.5 QUY TẮC PHÂN BIỆT CÔNG CỤ VÀ VẬN HÀNH

Để hai khối "CÔNG CỤ" và "VẬN HÀNH" không bị lẫn lộn sau nhiều lần bổ sung tính năng mới, hệ thống áp dụng bộ quy tắc phân định ranh giới nghiêm ngặt:

| Chức năng | Khối đề xuất | Lý do phân loại |
| :--- | :--- | :--- |
| **Tạo Catalog, Link bán hàng** | **CÔNG CỤ** | Tạo tài nguyên phục vụ tiếp cận khách hàng và bán hàng |
| **Tạo Thẻ chào sản phẩm** | **CÔNG CỤ** | Tạo nội dung tương tác và trải nghiệm tư vấn / đặt hàng |
| **Phân tích ảnh, tạo ảnh/video AI** | **CÔNG CỤ** | Thực hiện một tác vụ nghiệp vụ chuyên biệt |
| **Tính giá thành** | **CÔNG CỤ** | Thực hiện phép tính chi phí và giá bán phục vụ kinh doanh |
| **Quản lý đơn hàng đang xử lý** | **VẬN HÀNH** | Theo dõi tiến trình thực hiện đơn hàng |
| **Điều phối đơn cho chi nhánh/thợ** | **VẬN HÀNH** | Điều phối luồng quy trình thực hiện công việc |
| **Hàng chờ QC (Duyệt chất lượng)** | **VẬN HÀNH** | Kiểm soát một bước trong quy trình sản xuất thành phẩm |
| **Báo cáo doanh thu & Sổ quỹ** | **BÁO CÁO & QUẢN TRỊ** | Theo dõi và đo lường kết quả kinh doanh |
| **Cấu hình tài khoản, kết nối** | **THIẾT LẬP** | Thay đổi cài đặt và thông số hệ thống |

> **Nguyên tắc liền mạch nghiệp vụ (Business Flow Continuity):**
> Nếu một công cụ tạo ra đơn hàng (ví dụ: tạo Thẻ chào, Catalog, Báo giá), sau khi khách chốt đơn thì hệ thống luôn cung cấp đường dẫn trực tiếp (deep link) sang màn hình Đơn hàng tương ứng trong khối Vận hành, bảo đảm không cắt đứt dòng chảy công việc của người dùng.

---

### 4.7 KIẾN TRÚC SSOT THƯ VIỆN CÔNG CỤ (PLATFORM TOOLKIT SSOT ARCHITECTURE)

Để phục vụ chiến lược đa ngành và quản trị tập trung toàn bộ 48+ công cụ nghiệp vụ, hệ thống thiết lập kiến trúc **Single Source of Truth (SSOT) Toolkit**:

```
                       ┌───────────────────────────────────────────────┐
                       │           TẦNG 1: SAAS MOTHER                 │
                       │     (Trung tâm Điều khiển Ma trận Công cụ)    │
                       │             /van-hanh/nganh?tab=tools         │
                       └──────────────────────┬────────────────────────┘
                                              │ Quản trị Bật/Tắt & Cấp phép
                                              ▼
                       ┌───────────────────────────────────────────────┐
                       │           SSOT TOOL REGISTRY (Domain)         │
                       │     src/modules/toolkit/domain/tool-registry  │
                       │  - 48+ Công cụ định nghĩa 1 nơi duy nhất      │
                       │  - Metadata: href, icon, tiers, capability    │
                       │  - Hàm chiếu: getSidebarToolsForTier(tier)    │
                       └──────┬────────────────┬────────────────┬──────┘
                              │                │                │
            Chiếu theo Tầng 2 │                │ Chiếu Tầng 3   │ Chiếu Tầng 4
                              ▼                ▼                ▼
         ┌────────────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
         │     TẦNG 2: SAAS NGÀNH │  │ TẦNG 3: CHAINOS  │  │   TẦNG 4: STOREOS    │
         │   (Công cụ Bán hàng)   │  │  (Công cụ Chuỗi) │  │ (Thư viện Công cụ)   │
         │    nav-industry.ts     │  │   nav-chain.ts   │  │    nav-store.ts      │
         └────────────────────────┘  └──────────────────┘  └──────────────────────┘
```

#### 4.7.1 Các Nguyên tắc Kiến trúc Bất biến của Toolkit SSOT:
1. **Định nghĩa Một nơi Duy nhất (Single Definition Rule):**
   - Mọi công cụ (Catalog, Thẻ chào, Studio ảnh AI, Video Studio, Tính giá thành BOM, Kho mẫu ấn phẩm...) được khai báo đầy đủ metadata tại `src/modules/toolkit/domain/tool-registry.ts`.
   - Tuyệt đối cấm định nghĩa lại các mảng công cụ tĩnh rời rạc rải rác trong các file giao diện.
2. **Một Trung tâm Điều khiển Bật/Tắt Toàn cục (Single Control Plane):**
   - Admin SaaS quản trị ma trận công cụ tập trung tại Console Tầng 1 (`/van-hanh/nganh?tab=tools`).
   - Việc bật/tắt hay nâng cấp một công cụ áp dụng tức thì xuống các tầng dưới theo ngành hàng (`industryKey`) và cấp độ tổ chức (`organizationType`).
3. **Tiêu thụ Động theo Tầng (Dynamic Tier Projection):**
   - Các thanh sidebar của **SaaS Ngành (Tầng 2)**, **ChainOS (Tầng 3)**, và **StoreOS (Tầng 4)** sử dụng hàm chiếu `getSidebarToolsForTier(tier)` từ SSOT Registry để tự động lọc và hiển thị đúng các công cụ được chỉ định cho tầng đó mà không phụ thuộc vào mã nguồn cứng.

#### 4.7.2 Hợp Nhất Hệ Thống 14 Chặng & Bộ Công Cụ (PO Decision 27/10/2026):
Theo quyết định phê chuẩn của PO, hệ thống triệt tiêu hoàn toàn sự phân mảnh giữa chuỗi 14 chặng Product-to-Market và Danh mục công cụ:
- **Chuỗi 14 chặng $\rightarrow$ Auto-Campaign Workflow Tool:** Đóng gói toàn bộ pipeline 14 chặng thành một **Công cụ Chế tác Tự động từ A-Z** (`/creative-studio`), tận dụng use-case `planProduction()` và modal handoff tự động hóa có sẵn.
- **Chức năng 03 $\rightarrow$ Tool Nghiên cứu Thị trường & Xu hướng:** Độc lập hóa Chặng 03 thành công cụ tra cứu xu hướng và cơ hội kinh doanh theo mùa vụ (`/cong-cu/thi-truong`).
- **Chức năng 13 $\rightarrow$ Tool Trợ lý Học & Tối ưu Tác nghiệp:** Độc lập hóa Chặng 13 thành công cụ học máy, nhận diện thói quen và đề xuất giải pháp tối ưu tác nghiệp (`/cong-cu/toi-uu-he-thong`).
- **Chức năng 14 $\rightarrow$ Universal Next Action Component:** Chuẩn hóa Chặng 14 thành component dùng chung `NextActionCard` tích hợp ở cuối trang kết quả của MỌI công cụ trong hệ thống.
Chi tiết xem văn bản SSOT cấp 2: [`docs/kien-truc/QUY_CHUAN_HOP_NHAT_14_CHANG_VA_BO_CONG_CU_SSOT.md`](QUY_CHUAN_HOP_NHAT_14_CHANG_VA_BO_CONG_CU_SSOT.md).

### 4.8 KIẾN TRÚC SSOT SẢN PHẨM & KHO (PRODUCT & INVENTORY SSOT ARCHITECTURE)

Để bảo đảm tính toàn vẹn dữ liệu, phân quyền quản lý và khả năng mở rộng xuyên suốt từ Tầng 1 đến Tầng 4, toàn bộ khối **Sản phẩm & Kho** được chuẩn hóa thành một hệ thống phân cấp SSOT độc lập (`src/modules/products/domain/product-nav-contract.ts`):

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             🏛️ TẦNG 1: SAAS MOTHER                                │
│                     (GIÁM SÁT SẢN PHẨM & KHO TOÀN NỀN TẢNG)                      │
│  - Thu thập toàn bộ dữ liệu về sản phẩm và kho của các tầng 2-3-4                │
│  - Tổng hợp tài nguyên lưu trữ, dữ liệu và mức tiêu thụ tài nguyên               │
│  - Giám sát trường thuộc tính động và catalog xuyên tenant                       │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Thu thập & Đồng bộ dữ liệu
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             🌐 TẦNG 2: SAAS NGÀNH                                │
│                     (CHUẨN HÓA SẢN PHẨM & QUY CHUẨN NGÀNH)                       │
│  - Thu thập dữ liệu và chuẩn hóa danh mục, taxonomy theo từng ngành hàng         │
│  - Thư viện sản phẩm mẫu, định lượng BOM Spec chuẩn theo ngành                   │
│  - Khung chính sách giá và cấu hình trường dữ liệu đặc thù ngành                │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Kế thừa & Phân bổ bộ sưu tập
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               🔗 TẦNG 3: CHAINOS                                 │
│                      (SẢN PHẨM & KHO HỆ THỐNG CHUỖI)                             │
│  - Thu thập, quản lý dữ liệu của riêng chuỗi (bản thân chuỗi & chi nhánh/xưởng)  │
│  - Quản lý Bộ sưu tập Chuỗi (Chain Collections) & Chính sách giá niêm yết        │
│  - Giám sát khả dụng, tồn kho nguyên liệu và năng lực của các chi nhánh          │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Đồng bộ khả dụng & Bán lẻ
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               🏪 TẦNG 4: STOREOS                                 │
│                  (SẢN PHẨM BÁN LẺ & KHO NGUYÊN LIỆU TẠI TIỆM)                    │
│  - Quản lý trực tiếp danh mục sản phẩm bán tại quầy & công thức BOM              │
│  - Khối KHO riêng biệt: Quản lý kho nguyên vật liệu, tài nguyên ảnh/video        │
│  - Cập nhật tồn kho khả dụng ngày & công cụ tính giá thành chi tiết              │
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### Bảng Đối Chiếu Ma Trận Sản Phẩm & Kho 4 Tầng:

| Tầng | Nhóm Sidebar | Mục tiêu cốt lõi | Chức năng thành phần |
|---|---|---|---|
| **Tầng 1 (SaaS Mother)** | `san-pham-kho-platform` | Thu thập & giám sát toàn diện dữ liệu tầng 2-3-4 | Dữ liệu nền tảng, Lưu trữ & Kho tài nguyên, Thuộc tính động |
| **Tầng 2 (SaaS Ngành)** | `san-pham-nganh` | Chuẩn hóa danh mục, taxonomy & định lượng theo ngành | Danh mục & Sản phẩm mẫu, Taxonomy & Quy chuẩn, Trường dữ liệu ngành |
| **Tầng 3 (ChainOS)** | `san-pham-kho-chuoi` | Quản lý sản phẩm chuỗi & tổng hợp kho chi nhánh | Bộ sưu tập & Giá chuỗi, Khả dụng & Tồn kho chi nhánh |
| **Tầng 4 (StoreOS)** | `san-pham` + `kho` | Quản trị trực tiếp sản phẩm & kho nguyên vật liệu tiệm | Danh mục tiệm, Khả dụng ngày, Kho nguyên liệu, Tính giá thành |

---

### 4.6 QUY CHUẨN THIẾT KẾ SIDEBAR ENTERPRISE GRADE & UX STANDARDS

Để đạt chuẩn Commercial & Enterprise Handover, toàn bộ 4 thanh sidebar tuân thủ nghiêm ngặt các quy chuẩn kỹ thuật và trải nghiệm người dùng sau:

1. **Header Thu nhỏ Tương tác Tinh xảo (Morphing Header & Hover Effect):**
   - Khi ở trạng thái thu nhỏ (`isCollapsed = true`), nút logo ở vị trí trung tâm (`36x36px`, `rounded-xl`) bình thường hiển thị biểu tượng ứng dụng (`Sparkles`).
   - Khi người dùng rê chuột (hover) vào nút, biểu tượng tự động chuyển hóa (morph) mượt mà thành icon mở rộng `PanelLeftOpen`, kèm tooltip định vị rõ `Mở thanh điều hướng (⌘B)`.
   - Toàn bộ vùng header ở trạng thái thu nhỏ cho phép click trực tiếp để bung sidebar ra, không gây ức chế người dùng.

2. **Khắc phục Triệt để Lỗi Tràn & Che khuất Menu Dropdown:**
   - Loại bỏ `overflow-hidden` tại container header `desktop-nav-header.tsx`, thay thế bằng `relative z-30` trên thanh điều hướng `desktop-nav.tsx`.
   - Dropdown chuyển đổi tầng kiến trúc (`ArchitectureNametag`) được bổ sung lớp backdrop trong suốt (`fixed inset-0 z-[9990]`) để xử lý click-away đóng bảng chọn an toàn, không bị lồng hay che khuất bởi các thành phần trang.

3. **Căn lề Trực quan & Chống vỡ Typography Nhóm:**
   - Căn chỉnh văn bản tiêu đề nhóm: Khắc phục thuộc tính mặc định của thẻ `<button>` bằng cách áp dụng `text-left truncate flex-1`, đảm bảo chữ luôn căn lề trái tuyệt đối, thẳng hàng với biểu tượng.
   - Loại bỏ viền xanh mặc định của trình duyệt: Thay thế bằng `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40` trang nhã, sắc nét.
   - Giữ icon mũi tên thu gọn `ChevronDown` có `shrink-0`, không bị co dúm khi tiêu đề nhóm dài.
   - Chuẩn hóa độ dài tiêu đề nhóm: Mọi nhãn nhóm trong ChainOS và các tầng khống chế trong khoảng 17–21 ký tự, hiển thị 1 dòng duy nhất, triệt tiêu hoàn toàn hiện tượng xuống dòng gây lệch giao diện.

4. **Trạng thái Mặc định Mở rộng (Expanded-by-Default Architecture):**
   - Thay vì mặc định đóng khiến thanh điều hướng trống trải, thuộc tính `isGroupExpanded` được đặt mặc định là `true` cho toàn bộ các nhóm trên tất cả các tầng.
   - LocalStorage key được nâng cấp lên `smeos_nav_groups_v2` và `smeos_nav_reports_open_v2` nhằm tự động xóa sạch các trạng thái đóng cũ bị lưu trong bộ nhớ trình duyệt người dùng, mang lại trải nghiệm đầy đủ tính năng ngay từ lần truy cập đầu tiên.

5. **Phím tắt Toàn cục Đẳng cấp (Keyboard Shortcuts):**
   - `⌘B` (macOS) hoặc `Ctrl+B` (Windows/Linux): Đóng/mở nhanh thanh điều hướng từ mọi màn hình.
   - `/`: Tiêu điểm nhanh vào ô tìm kiếm toàn cục.
   - `⌘K`: Mở Command Palette điều hướng nhanh theo chuẩn Linear / Stripe.

6. **Tuân thủ Tuyệt đối Giới hạn Đơn nhiệm SRP (File Size Limit < 350 lines):**
   - Tách toàn bộ logic hiển thị nhóm điều hướng ra component độc lập `src/components/layout/desktop-nav-group.tsx` (177 dòng).
   - Tệp chính `src/components/layout/desktop-nav.tsx` được rút gọn từ ~450 dòng xuống còn ~304 dòng, tuân thủ 100% Luật Kiến trúc số 3 và Anti-pattern A8 trong Hiến pháp phát triển.

---

## 5. MA TRẬN ÁNH XẠ VAI TRÒ (ROLE UX MATRIX)

Tùy theo kiến trúc của từng tầng, cơ chế điều hướng được tối ưu hóa như sau:
- **Tầng StoreOS (Cửa hàng cơ sở):** Tự động ghim nhóm **"⚡ VIỆC CHÍNH HÔM NAY"** lên đầu sidebar theo đúng vai trò thực tế (`useSession().roleUx`) để nhân viên vào ca thao tác ngay không cần tìm kiếm.
- **Tầng ChainOS & SaaS Mother/Ngành:** Duy trì cây điều hướng Trung tâm Chỉ huy hợp nhất (Unified Command Center) để đảm bảo toàn thể ban chỉ huy và điều phối viên có góc nhìn toàn cảnh về hệ sinh thái và mạng lưới chuỗi.

| Tầng | Vai trò (Role UX) | Danh mục ưu tiên thao tác |
| :--- | :--- | :--- |
| **SaaS Mother** | `platform_admin` | Chỉ huy Nền tảng (`/van-hanh`) · Đăng ký Mới (`/van-hanh/dang-ky`) · Mức dùng Token (`/van-hanh/muc-dung`) · Sức khỏe Server (`/van-hanh/suc-khoe`) |
| **SaaS Ngành** | `industry_admin` | Ma trận & Plugin Ngành (`/van-hanh/nganh`) · Landing Page (`/landing-page`) · Điều phối Đơn (`/dieu-phoi`) · Đối soát Affiliate (`/van-hanh/du-lieu`) |
| **ChainOS** | `flower_network_admin` / `chain_admin` | Chỉ huy Mạng lưới (`/`) · Đơn hàng Trực tiếp (`/don-hang`) · Tháp Điều phối (`/dieu-phoi`) · QC Duyệt chất lượng (`/duyet`) |
| | `coordinator` (Điều phối viên Chuỗi) | Tháp Điều phối (`/dieu-phoi`) · QC Duyệt chất lượng (`/duyet`) · Chat Nội bộ (`/tin-nhan`) · Danh bạ Chi nhánh (`/dieu-phoi/doi-tac`) |
| **StoreOS** | `store_admin` (Chủ tiệm / Quản lý) | Bàn làm việc (`/`) · **Đơn nhận từ Mạng lưới (`/cua-hang`)** · Đơn tiệm tự bán (`/don-hang`) · Khách CRM (`/khach-hang`) · Báo cáo (`/so-lieu`) |
| | `sales` (Nhân viên bán hàng) | Bàn làm việc (`/`) · Hội thoại đa kênh (`/hoi-thoai`) · Khách hàng (`/khach-hang`) · Đơn hàng (`/don-hang`) · Thẻ chào (`/the-chao`) |
| | `florist` (Thợ chế tác / Cắm / May) | **Đơn nhận từ Mạng lưới (`/cua-hang`)** · Quét ảnh nghiệm thu (`/tai-anh`) · In ấn phẩm A6 (`/kho-templates`) · Xem định lượng BOM (`/san-pham`) |
| | `marketing` (Nhân viên Marketing) | Creative Studio (`/creative-studio`) · Viết nội dung (`/noi-dung`) · Tạo video (`/video`) · Catalog QR (`/catalog`) |

---

## 6. TRẠNG THÁI TRIỂN KHAI & BÀN GIAO (IMPLEMENTATION & HANDOVER READINESS)

1. **Kiến trúc Dispatcher 4 Tầng độc lập (`src/components/layout/nav/`):**
   - `nav-mother.ts`: Cấu trúc 5 nhóm chuẩn Platform Control Center (`tong-quan`, `to-chuc-dich-vu`, `ha-tang-tai-nguyen`, `do-tin-cay-bao-mat`, `thiet-lap-platform`).
   - `nav-industry.ts`: Cấu trúc 6 nhóm tăng trưởng mạng lưới affiliate (`trung-tam-dieu-hanh`, `cong-cu-ban-hang`, `chuan-hoa-nganh`, `mang-luoi-dieu-phoi`, `hieu-qua-thuong-mai`, `thiet-lap-nganh`).
   - `nav-chain.ts`: Cấu trúc 5 nhóm điều hành chuỗi (`dieu-hanh-chuoi`, `cong-cu-chuoi`, `kinh-doanh-chuoi`, `bao-cao-tai-chinh-chuoi`, `thiet-lap-chuoi`).
   - `nav-store.ts`: Cấu trúc 5 nhóm không gian làm việc cửa hàng (`cong-cu`, `ban-hang`, `san-pham`, `van-hanh`, `quan-tri`) + `viec-chinh`.
   - `index.ts`: Dispatcher định tuyến tự động theo `organizationType` và `roleKey`.
2. **Kiểm chuẩn Toàn diện & Regression Testing:**
   - **Unit Tests:** `22/22 tests passing` (`npx vitest run src/components/layout/`).
   - **Typecheck:** `0 errors` (`npx tsc --noEmit`).
   - **Tenant Isolation:** Bảo đảm cách ly dữ liệu và phân quyền theo mã năng lực `can(capability)`.
3. **Mức độ Sẵn sàng Tách Repo Độc lập:**
   - Cả 4 tầng đã được module hóa ranh giới hoàn toàn sạch sẽ, cho phép đóng gói thành các sản phẩm phần mềm SaaS độc lập hoặc triển khai chung dưới dạng Monorepo thống nhất.

