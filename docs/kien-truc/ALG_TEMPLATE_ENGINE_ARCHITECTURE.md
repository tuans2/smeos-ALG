# Kiến trúc & Đặc tả Kỹ thuật — Hệ thống Template Đa Tenant ALG
## (ALG Multi-tenant Template Engine Architecture)

> **Mã định danh:** `ARCH-TEMPLATES-V1`  
> **Trạng thái:** Dự thảo phê duyệt kiến trúc  
> **Ngày:** 14/09/2026  
> **Tác giả:** Đội ngũ Kiến trúc Nền tảng ALG  
> **Tài liệu liên quan:** `ALG_SAAS_TARGET_ARCHITECTURE_V2.md`, `AGENTS.md`, `03-ux-architecture.md`, `UIUX-Execution-Checklist.md`.

---

## 1. Tầm nhìn & Mục tiêu Kiến trúc

Hệ thống Template ALG (ALG Template Engine) chuyển đổi phương thức phát triển từ **viết mã giao diện thủ công từng màn hình** sang **Kiến trúc Hướng Mẫu (Template-Driven Architecture)** chuẩn SaaS đa tenant.

### 1.1. Ba Nguyên tắc Cốt lõi
1. **OSOT (One Source of Truth)**: Dữ liệu nghiệp vụ chỉ lưu trữ và chuẩn hóa tại một nơi (Product Master / Analysis Raw / Brand Profile). Mọi bản hiển thị (Web Card, Zalo Script, Thẻ A6, Bài viết Social, Phiếu thợ cắm hoa) chỉ là các phép chiếu (Projections) qua Template.
2. **Atomic Disaggregation (Tách biệt trường nguyên tử)**: Template không bao giờ chứa chuỗi văn bản cứng gộp thông số. Mọi trường dữ liệu đều là nguyên tử (`flower_name`, `quantity`, `unit`, `color`, `role`, `price_vnd`) để người dùng có thể nhấp chuột chỉnh sửa trực tiếp.
3. **Multi-tenant Inheritance (Kế thừa 2 lớp)**: Nền tảng sở hữu bộ *System Golden Templates* mặc định. Cửa hàng hoa (*Tenant*) có quyền ghi đè (*Overrides*) văn phong, logo, hotline, và quy tắc hiển thị theo Brand Profile của mình.

---

## 2. Phân loại 5 Họ Template (Template Taxonomy)

Toàn bộ hệ thống ALG được phân thành 5 họ template tiêu chuẩn:

```
                          ┌───────────────────────────────┐
                          │   ALG TEMPLATE ENGINE     │
                          └──────────────┬────────────────┘
                                         │
        ┌──────────────┬─────────────────┼─────────────────┬──────────────┐
        ▼              ▼                 ▼                 ▼              ▼
 ┌─────────────┐ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ ┌─────────────┐
 │ 1. GUIDANCE │ │ 2. INSPEC-  │  │3. COMMERCIAL│  │  4. SALES   │ │5. OPERATION-│
 │  TEMPLATES  │ │TION / BOM   │  │   CONTENT   │  │PITCH & CHAT │ │ AL & PRINT  │
 └─────────────┘ └─────────────┘  └─────────────┘  └─────────────┘ └─────────────┘
  - Khối hướng   - Cấu phần hoa   - Tên thương mại - Thẻ A6 mockup - Phiếu cắm hoa
    dẫn thao tác   BOM thực tế      - Mô tả sản phẩm - Kịch bản Zalo  - Thiệp mừng
  - Tips thực tế - Số cành, nụ, lá - Thẻ dịp, SEO    1-chạm copy   - Bill đơn hàng
  - Viền đỏ đứt  - Độ tin cậy AI  - Phân khúc giá  - Báo giá Sales - Nhãn decal
```

| Mã họ | Tên họ Template | Mục tiêu nghiệp vụ | Component đại diện | Phạm vi áp dụng |
|---|---|---|---|---|
| **GT** | **Guidance Templates** | Hướng dẫn thao tác đồng bộ, chống sai sót | `<FeatureGuidanceCard />` | Mọi Tab tính năng (M01a–M11) |
| **IT** | **Inspection / BOM Templates** | Chuẩn hóa thông số cấu phần hoa kỹ thuật | `<AnalysisResultTemplate />` | M01a, Kho Dữ Liệu, Phiếu thợ cắm |
| **CT** | **Commercial Content Templates** | Văn phong thương mại, định vị phân khúc | `<ProductCopyTemplate />` | M01b, Soạn thảo bài đăng M07, Catalog |
| **ST** | **Sales Pitch & Advisory Templates** | Tối ưu tỷ lệ chốt đơn của Sales Rep | `<SalesPitchCard />`, `<ZaloScriptBox />` | M01c, Trợ lý Chat M08, CRM M09 |
| **OT** | **Operational & Print Templates** | Ấn phẩm in ấn và vận hành đóng gói | `<FloristTicket />`, `<GreetingCard />` | Đơn hàng M10, Điểm bán lẻ POS |

---

## 3. Kiến trúc Kỹ thuật 4 Lớp (Technical 4-Layer Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. DATA LAYER (Domain & Raw Analysis)                                  │
│    - Raw Vision Schema (JSON)     - Product Master Record              │
│    - Brand Profile (Tone/Voice)   - Tenant Context (organization_id)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. TEMPLATE ENGINE & INTERPOLATION LAYER                               │
│    - System Golden Templates (Default) ➔ Tenant Custom Overrides       │
│    - Dynamic Variable Parser: {{product.name}}, {{pricing.final_vnd}}  │
│    - Fallback & Sanitization Engine (chống XSS, an toàn cú pháp)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. OMNI-CHANNEL RENDER ADAPTERS                                        │
│    - Web Interactive Card Adapter (React Components click-to-edit)     │
│    - Text / Instant Message Adapter (Zalo / Facebook emoji scripts)    │
│    - Media / Print Canvas Adapter (PNG Retina 2x, JPEG, PDF A6 Vector) │
│    - AI Prompt Adapter (Cung cấp template skeleton cho LLM Provider)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. PERSISTENCE & GOVERNANCE LAYER                                      │
│    - Prisma Model: template_overrides (CÓ THẬT từ 18/09, PHẠM VI HẸP —  │
│      xem ghi chú dưới). Model `templates` (System Golden Template       │
│      registry) VẪN CHƯA TỒN TẠI. organizations.settings (CÓ THẬT, không │
│      dùng cho template).                                                │
│    - RBAC: Quyền sửa template cấp tenant (Trần cứng `dieu_hanh`)        │
└────────────────────────────────────────────────────────────────────────┘
```

**Ghi chú 17/09 (P-Fix-5):** rà `prisma/schema.prisma` xác nhận KHÔNG có model `templates` hay
`template_overrides` nào tồn tại — khối trên mô tả kiến trúc DỰ KIẾN của Giai đoạn 3 (mục 7 bên
dưới), không phải trạng thái hiện tại. Hạ mức tài liệu từ "đã có" xuống đúng thực trạng "định
hướng, chưa triển khai" thay vì để người đọc tưởng nhầm hai bảng này đã tồn tại. Tenant
overrides hiện KHÔNG có đường lưu trữ nào — `organizations.settings` (Json, có thật, cùng khối
dùng cho `cho_phep_tu_duyet`/`bo_may_phan_tich`/`freshness_guarantee_days`) là ứng viên hợp lý
nhất khi triển khai thật, nhưng chưa ai xác nhận chọn hướng đó thay vì bảng `template_overrides`
riêng — đây là quyết định kiến trúc cần chốt trước khi viết mã Giai đoạn 3, không phải việc của
đợt đồng bộ tài liệu này.

**Cập nhật 18/09 (nợ #99/#105) — TRIỂN KHAI THẬT LẦN ĐẦU, NHƯNG PHẠM VI RẤT HẸP, KHÔNG PHẢI TOÀN
BỘ THIẾT KẾ DƯỚI ĐÂY.** Sau khi cân nhắc lại (đã có tiền lệ lệch cột Json ở nợ #102), chốt dùng
bảng riêng `template_overrides` (KHÔNG dùng `organizations.settings`) — ngược lại gợi ý ở đoạn
trên, xem `TECHNICAL_DEBT.md` nợ #99 để biết toàn bộ diễn biến quyết định. Nhưng đây KHÔNG phải
việc hiện thực hoá cơ chế 2 lớp tổng quát mô tả trong tài liệu này: (1) bảng `templates` (registry
System Golden Template) VẪN CHƯA XÂY — "golden template" của `sales_pitch_zalo` vẫn là chuỗi tiếng
Việt HẰNG trong mã (`generateZaloPitchScript()`, `sales-pitch-template.ts`), không phải một dòng
dữ liệu nạp từ registry; (2) `src/core/templates/*` (`interpolation-engine.ts`, `golden-templates.ts`,
danh mục biến `{{...}}` ở Mục 4 dưới đây) hoàn toàn KHÔNG được dùng trong đường đi thật — vẫn đánh
dấu "DỰ TRỮ" theo quyết định của anh Tony 17/09; (3) domain layer (`template-override-rules.ts`)
khoá cứng đúng MỘT tổ hợp field được phép ghi đè (`ST`/`sales_pitch_zalo`/`greeting_line`), không
nhận field tự do nào khác — mở rộng CÙNG LÚC với khi có nơi đọc thật, không đoán trước. Nói cách
khác: đây là một lát cắt thật, hẹp, viết tay riêng cho một trường hợp cụ thể — không phải cơ chế
tổng quát "nạp bất kỳ template nào qua `interpolateTemplate()`, hợp nhất với override bất kỳ field
nào" như khối sơ đồ trên mô tả. Toàn bộ phần dưới đây (§3.1, danh mục biến Mục 4) vẫn đúng là
THIẾT KẾ DỰ KIẾN cho việc tổng quát hoá sau này, chưa phải hiện trạng.

### 3.1. Cơ chế Kế thừa 2 Lớp (Inheritance Resolution Flow)
> **Trạng thái 18/09: ĐỊNH HƯỚNG cho trường hợp TỔNG QUÁT (nhiều field, nhiều họ template qua
> `interpolateTemplate()`) — VẪN CHƯA TRIỂN KHAI.** Luồng dưới đây vẫn mô tả thiết kế dự kiến đầy
> đủ của Giai đoạn 3. Đã có MỘT trường hợp riêng lẻ chạy thật khác với luồng này: `sales_pitch_zalo`
> / `greeting_line` (họ ST) đọc thẳng từ bảng `template_overrides` và được `generateZaloPitchScript()`
> chèn trực tiếp vào đầu chuỗi kết quả — không qua bước 3 (`interpolateTemplate()`), không có
> "System Golden Template" dạng registry ở bước "Không" (vẫn là chuỗi hằng trong mã). Xem ghi chú
> 18/09 ở trên và `TECHNICAL_DEBT.md` nợ #105 để biết chi tiết triển khai thật.

1. Ứng dụng yêu cầu template `sales_pitch_zalo` cho `organization_id = "org_123"`.
2. Hệ thống kiểm tra bảng `template_overrides` xem `org_123` có tùy chỉnh mẫu này không:
   - **Có**: Nạp template của tenant và hợp nhất với `BrandProfile` của họ.
   - **Không**: Nạp `System Golden Template` mặc định từ registry tĩnh.
3. Chạy qua bộ `interpolateTemplate(templateStr, dataContext)` để sinh chuỗi hoặc render component tương ứng.

---

## 4. Danh mục Biến Chuẩn (Standard Variable Catalog)

Bộ biến số được quy chuẩn hóa dưới dạng token hai ngoặc nhọn:

### 4.1. Nhóm Sản phẩm & Hoa (`product.*`, `flower.*`)
- `{{product.name}}`: Tên sản phẩm chính thức.
- `{{product.sku}}`: Mã SKU quản lý kho.
- `{{product.style}}`: Phong cách thiết kế (Hiện đại, Vintage, Tối giản...).
- `{{flower.summary_list}}`: Tóm tắt cấu phần (vd: "10 Hồng Ohara, 5 Cúc Tana, Lá bạc").
- `{{flower.main_tones}}`: Danh sách tone màu chủ đạo (vd: "Hồng pastel, Trắng kem").
- `{{flower.facing}}`: Hướng nhìn mặt hoa (360 độ, 1 mặt).
- `{{flower.wrapping}}`: Giấy gói & bao bì (vd: "Giấy xốp Hàn Quốc hồng cam, nơ voan").

### 4.2. Nhóm Báo giá & Khuyến mãi (`pricing.*`)
- `{{pricing.selling_price_vnd}}`: Giá bán thực tế (đã format tiếng Việt, vd: "650.000đ").
- `{{pricing.original_price_vnd}}`: Giá gốc trước giảm (vd: "750.000đ").
- `{{pricing.discount_percent}}`: Phần trăm giảm (vd: "15%").
- `{{pricing.segment}}`: Phân khúc giá (Tiết kiệm, Tiêu chuẩn, Cao cấp).

### 4.3. Nhóm Quà tặng & Cam kết (`service.*`)
- `{{service.gifts_bullets}}`: Danh sách quà tặng dạng gạch đầu dòng (Thiệp cao cấp, banner in theo yêu cầu, thuốc dưỡng hoa Chrysal).
- `{{service.commitments_bullets}}`: Cam kết chất lượng (Hoa tươi trên 3 ngày, chụp ảnh thực tế trước khi giao, giao hỏa tốc 60 phút).

### 4.4. Nhóm Cửa hàng & Liên hệ (`shop.*`)
- `{{shop.name}}`: Tên tiệm hoa (theo Brand Profile).
- `{{shop.hotline}}`: Số điện thoại tư vấn/đặt hàng.
- `{{shop.address}}`: Địa chỉ cửa hàng.
- `{{shop.zalo_link}}`: Đường dẫn Zalo OA của cửa hàng.

---

## 5. Tổ chức Thư mục & Mô đun Mã nguồn

Để bảo đảm nguyên tắc SRP (Single Responsibility Principle) và giới hạn kích thước file dưới 350 dòng, hệ thống được tổ chức:

```text
src/
├── core/
│   └── templates/                         # Core Template Engine (thuần logic, 0 Prisma)
│       ├── domain/
│       │   ├── template-types.ts          # Định nghĩa types: TemplateMeta, TemplateVariable, OutputFormat
│       │   ├── variable-catalog.ts        # Danh mục token chuẩn & resolver
│       │   └── interpolation-engine.ts    # Parser thay thế biến an toàn (an toàn regex)
│       └── golden-templates.ts            # Bộ System Golden Templates mặc định
│
├── components/
│   └── templates/                         # Thư viện UI Template chuẩn hóa THEO 10 CHỨC NĂNG CỐT LÕI
│       ├── shared/                        # Khung template cơ sở dùng chung
│       │   └── feature-guidance-card.tsx  # Khung hướng dẫn viền đỏ đứt nét, badge, tips bar, thu gọn thông minh (localStorage)
│       │
│       ├── product-analysis/              # 1. Phân tích ảnh sản phẩm (M01a/b/c)
│       │   ├── m01a-guidance-card.tsx     # Hướng dẫn nhận diện cấu phần hoa M01a
│       │   ├── m01b-guidance-card.tsx     # Hướng dẫn sinh nội dung bán hàng M01b
│       │   ├── m01c-guidance-card.tsx     # Hướng dẫn tạo thẻ chào khách M01c
│       │   ├── analysis-result-card.tsx   # Thẻ kết quả phân tích cấu phần hoa M01a
│       │   ├── commercial-content-card.tsx# Thẻ nội dung bán hàng thương mại M01b
│       │   ├── sales-pitch-card-a6.tsx    # Thẻ chào hàng trực quan A6 xuất ảnh/PDF
│       │   ├── zalo-script-box.tsx        # Kịch bản tư vấn Zalo 1-chạm sao chép
│       │   └── index.ts
│       │
│       ├── creative-studio/               # 2. Studio Sáng tạo (M04a/b)
│       │   ├── creative-guidance-card.tsx # Hướng dẫn studio ảnh hoa
│       │   ├── before-after-preview-card.tsx # So sánh ảnh gốc & tối ưu studio
│       │   ├── studio-variant-card.tsx    # Biến thể bối cảnh không gian
│       │   └── index.ts
│       │
│       ├── video-studio/                  # 3. Studio Video (M05)
│       │   ├── video-guidance-card.tsx    # Hướng dẫn tạo video ngắn 9:16
│       │   ├── storyboard-script-card.tsx # Kịch bản phân cảnh kèm lời thoại
│       │   ├── video-player-card.tsx      # Khung trình chiếu video 9:16 mobile
│       │   └── index.ts
│       │
│       ├── content-engine/                # 4. Máy Nội dung Đa kênh (M06)
│       │   ├── content-guidance-card.tsx  # Hướng dẫn máy sinh nội dung tiếp thị
│       │   ├── multichannel-post-card.tsx # Bài đăng Facebook/TikTok/Instagram
│       │   ├── angle-selector-card.tsx    # Chọn góc tiếp cận (Cảm xúc/Tay nghề/Ưu đãi)
│       │   └── index.ts
│       │
│       ├── social-publishing/             # 5. Đăng bài Mạng xã hội (M07)
│       │   ├── publishing-guidance-card.tsx # Hướng dẫn xuất bản đa kênh
│       │   ├── schedule-calendar-card.tsx # Lịch trình đăng bài & khung giờ vàng
│       │   ├── channel-status-card.tsx    # Trạng thái kết nối kênh Zalo OA/Fanpage
│       │   └── index.ts
│       │
│       ├── catalog/                       # 6. Danh mục & Báo giá (M02/M03)
│       │   ├── catalog-guidance-card.tsx  # Hướng dẫn danh mục số & báo giá
│       │   ├── product-detail-card.tsx    # Chi tiết sản phẩm catalog trực tuyến
│       │   ├── quote-summary-card.tsx     # Bảng tính giá cấu thành & phụ liệu
│       │   └── index.ts
│       │
│       ├── crm/                           # 7. Khách hàng & Chăm sóc (M08)
│       │   ├── crm-guidance-card.tsx      # Hướng dẫn quản lý khách & sự kiện
│       │   ├── customer-profile-card.tsx  # Hồ sơ khách VIP & gu cắm hoa
│       │   ├── event-reminder-card.tsx    # Nhắc hẹn ngày kỷ niệm & sinh nhật
│       │   └── index.ts
│       │
│       ├── orders/                        # 8. Đơn hàng & Xưởng hoa (M09)
│       │   ├── order-guidance-card.tsx    # Hướng dẫn quy trình xưởng & vận hành
│       │   ├── florist-ticket-card.tsx    # Phiếu thợ cắm hoa (định lượng hoa & mẫu)
│       │   ├── delivery-receipt-card.tsx  # Phiếu giao hoa khổ A6 & thiệp chúc mừng
│       │   └── index.ts
│       │
│       ├── chat-assistant/                # 9. Trợ lý AI Chat (M10)
│       │   ├── chat-guidance-card.tsx     # Hướng dẫn trợ lý AI tư vấn 24/7
│       │   ├── chat-thread-card.tsx       # Khung hội thoại & gợi ý mẫu hoa
│       │   ├── human-takeover-banner.tsx  # Banner cảnh báo nhân viên tiếp quản
│       │   └── index.ts
│       │
│       ├── analytics/                     # 10. Báo cáo & Giám sát AI (M11)
│       │   ├── analytics-guidance-card.tsx# Hướng dẫn giám sát vận hành & chi phí
│       │   ├── kpi-summary-card.tsx       # Chỉ số doanh thu, đơn hàng & chuyển đổi
│       │   ├── ai-credit-usage-card.tsx   # Giám sát hạn ngạch & chi tiêu token AI
│       │   └── index.ts
│       │
│       ├── platform-connections/          # 11. Kết nối Nền tảng (bổ sung 17/09, P-Fix-5 —
│       │   ├── platform-account-card.tsx  #     thư mục có thật, đúng chuẩn SSOT, nhưng chưa
│       │   ├── connect-account-modal.tsx  #     từng được liệt kê ở bản kiến trúc 14/09)
│       │   └── index.ts
│       │
│       └── index.ts                       # Root barrel export toàn bộ 11 chức năng
```

*(Cập nhật 17/09, P-Fix-5: cây thư mục trên đã đồng bộ lại với code thật. Một số chức năng —
đặc biệt `creative-studio/`, `content-engine/`, `social-publishing/` — đã phát triển thêm nhiều
component so với bản 14/09 này; xem `ALG_TEMPLATE_SYSTEM_SSOT.md` mục 3 để có danh sách đầy
đủ, tài liệu SSOT là nguồn cập nhật thường xuyên hơn, tài liệu kiến trúc này giữ nguyên phạm vi
tầng/nguyên tắc tổng thể.)*

---

## 6. Chiến lược Phân hạng Tính năng SaaS (SaaS Monetization Rules)

Hệ thống Template được gắn với ma trận phân quyền và gói thuê bao SaaS:

| Cấp độ gói | Quyền hạn đối với Template |
|---|---|
| **Free / Trial** | • Sử dụng toàn bộ System Golden Templates.<br>• Watermark ALG cố định trên ảnh xuất A6/PNG.<br>• Không hỗ trợ chỉnh sửa template gốc. |
| **Growth (Tiêu chuẩn)** | • Xóa watermark ALG, chèn logo & hotline của tiệm.<br>• Tùy biến kịch bản Zalo theo Tone of Voice riêng.<br>• Xuất ảnh Retina 2x & PDF A6 in ấn chất lượng cao. |
| **Pro / Enterprise (Chuỗi)** | • Tạo không giới hạn Custom Templates cho từng chi nhánh.<br>• Phân quyền thợ cắm hoa xem phiếu BOM ẩn giá vốn.<br>• A/B testing template kịch bản tư vấn trên kênh Zalo OA. |

---

## 7. Kế hoạch Lộ trình Triển khai (Execution Roadmap)

Lộ trình thực thi được triển khai theo các giai đoạn:

1. **Giai đoạn 1 — Chuẩn hóa Feature-Based Template System (ĐÃ HOÀN TẤT)**
   - Xây dựng base component `<FeatureGuidanceCard />` đạt chuẩn viền đỏ đứt nét, badge, tips bar.
   - Hoàn thiện trọn bộ templates cho chức năng #1 `product-analysis`: Guidance (M01a/b/c), AnalysisResultCard, CommercialContentCard, SalesPitchCardA6, ZaloScriptBox.
   - Thiết lập cấu trúc và dựng sẵn trọn bộ templates cho 9 chức năng còn lại (Creative Studio, Video Studio, Content Engine, Social Publishing, Catalog, CRM, Orders, Chat Assistant, Analytics).
   - Tích hợp trực tiếp vào `src/app/(app)/tai-anh/page.tsx` và đạt 309/309 tests passing.
2. **Giai đoạn 2 — Xây dựng Core Variable Interpolation Engine (ĐÃ HOÀN TẤT)**
   - Hoàn thiện module `src/core/templates/domain/interpolation-engine.ts` thuần túy, không import Prisma, bảo vệ an toàn regex.
   - Viết bộ unit test 100% khóa các quy tắc trộn biến (`{{product.name}}`, `{{pricing.selling_price_vnd}}`, fallback khi thiếu biến).
3. **Giai đoạn 3 — Lưu trữ & Tùy biến cấp Tenant (Tenant Overrides) — BẮT ĐẦU TRIỂN KHAI 18/09, PHẠM VI HẸP**
   - Đã chốt lưu vào bảng riêng `template_overrides` (không dùng `organizations.settings`) — nợ #99/#105.
   - Đã xây đúng MỘT field: `ST`/`sales_pitch_zalo`/`greeting_line`, kèm UI cài đặt cho chủ shop tự
     nhập ở `/ho-so` (tab "Chính sách & Cam kết") — không phải "xem trước template" tổng quát, chỉ
     một ô nhập câu chào.
   - CÒN THIẾU để coi là hoàn tất giai đoạn này: bảng `templates` (System Golden Template registry)
     chưa xây; cơ chế tổng quát cho nhiều field/nhiều họ template qua `interpolateTemplate()` chưa
     làm — xem ghi chú 18/09 ở Mục 3 trên.
4. **Giai đoạn 4 — Kết nối sâu với các Worker Backend**
   - Kết nối render template tự động khi nhận kết quả phân tích từ worker AI.
   - Đồng bộ hóa các kênh xuất bản tự động qua Integration API.
