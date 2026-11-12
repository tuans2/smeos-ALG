# KẾ HOẠCH TRIỂN KHAI KIẾN TRÚC 4 TẦNG (4-TIER CASCADING GOVERNANCE)
## Cho các hạng mục: Ưu đãi, Cam kết, Chính sách, Thanh toán & Đặt cọc, Phí gia công, Mẫu in ấn & Phong cách

> **Mã văn bản:** `PLAN-4TIER-CASCADING-001`  
> **Cấp thẩm quyền:** Level 2 — Architectural & Implementation Blueprint  
> **Ngày tạo:** 27/10/2026  
> **Branch thực thi:** `Nangcap_kientruc4tang_uudai-camket-chinhsach-thanhtoan-datco-phigiacong-templates-styles`  
> **Trạng thái:** DỰ THẢO CHI TIẾT — SẴN SÀNG TRIỂN KHAI

---

## 1. MỤC TIÊU VÀ NGUYÊN TẮC BẤT BIẾN

### 1.1. Mục tiêu
Chuyển đổi toàn diện các hệ thống cấu hình, quy tắc vận hành và định mức của ALG từ mô hình "Cửa hàng đơn lẻ/phẳng" sang mô hình **Quản trị Phân tầng Thác Đổ 4 Cấp (4-Tier Cascading Governance)** đã chuẩn hóa thành công ở hệ thống Thông báo (Notification).

### 1.2. 4 Tầng Quản trị (The 4 Governance Tiers)
1. **Tier 1 — SaaS Mother (Nền tảng / Console `/van-hanh`)**:
   - Nắm giữ Master SSOT Catalog của mọi hạng mục.
   - Bật/tắt module, tính năng toàn hệ thống.
   - Thiết lập trần cứng an toàn (`hard-locks`), ngăn chặn hành vi vi phạm pháp luật hoặc gian lận tài chính.
2. **Tier 2 — Industry Profile (Đặc tả Ngành SSOT)**:
   - Cung cấp Preset định hình mặc định cho 7 ngành hàng: Hoa tươi, Thời trang, F&B, Quà tặng thủ công, Bán lẻ tổng hợp, Dịch vụ, Homestay du lịch.
   - Phản ánh đúng văn hóa, chuẩn mực và thói quen tiêu dùng của từng nghề.
3. **Tier 3 — Store Chain / Collection (Chuỗi Thương Hiệu & Mạng Lưới - ChainOS)**:
   - Thiết lập quy định thương hiệu đồng nhất cho toàn bộ chi nhánh.
   - Phát hành voucher/chính sách/mẫu in áp dụng toàn chuỗi.
   - Khóa cứng tiêu chuẩn kiểm tra chất lượng (QC) và tỷ lệ đặt cọc khi điều phối đơn.
4. **Tier 4 — Store Single (Cửa hàng cơ sở - StoreOS)**:
   - Vận hành tại tiệm, tự động kế thừa ngược từ cấp trên mà không cần cấu hình phức tạp.
   - Chỉ lưu phần sai khác (Delta Overrides) trong phạm vi trần cho phép.

### 1.3. Tam Trụ Thác Đổ (Cascading Triad)
- **Kế thừa tự động (Cascading Fallback)**: `Store → Chain → Industry → Mother Default`. Dùng mặc định = không tạo thêm dòng rác trong DB.
- **Trần cứng cắt sau cùng (Hard-Locks)**: Cấp trên khóa `is_locked = true` thì cấp dưới không được phép can thiệp; UI hiện badge nguồn khóa rõ ràng.
- **Ghi đè an toàn (Safe Delta Overrides)**: Xóa bản ghi override cục bộ đồng nghĩa với việc khôi phục hoàn hảo về mặc định của chuỗi/ngành.

---

## 2. MA TRẬN 6 HẠNG MỤC CẦN NÂNG CẤP

| STT | Hạng mục | Vị trí hiện tại | Khóa cứng của Mother (Tier 1) | Chuẩn hóa Ngành (Tier 2) | Quản trị Chuỗi (Tier 3) | Override Tiệm (Tier 4) |
|:---:|:---|:---|:---|:---|:---|:---|
| **1** | **Ưu đãi & Khuyến mãi (Promotions)** | `store-policy.ts` | Khóa trần giảm giá tối đa (VD: Max 50%), quy định loại voucher | Presets ưu đãi mẫu theo ngành (F&B: Tặng tráng miệng, May: Hộp quà) | Voucher toàn chuỗi, khóa chi nhánh không được tắt khuyến mãi của hãng | Thêm mã ưu đãi riêng tại tiệm trong hạn mức |
| **2** | **Cam kết Chất lượng (Commitments)** | `store-policy.ts` (6 cam kết mẫu) | Cam kết chống hàng giả, an toàn thông tin & bảo vệ khách hàng | Cam kết đặc thù nghề (Hoa: Gửi ảnh trước giao; Bếp: VSATTP) | Tiêu chuẩn chất lượng chuỗi (SOP kiểm định, bắt buộc chụp ảnh duyệt) | Bổ sung cam kết giao nhanh cục bộ theo địa bàn tiệm |
| **3** | **Chính sách & Thỏa thuận (Policies & Agreements)** | `store-policy.ts` | Điều khoản dịch vụ nền tảng (ToS), chính sách xử lý sự cố thanh toán | Thỏa thuận theo mùa & đặc tính sản phẩm (Hoa đổi phụ liệu, Homestay hủy phòng) | Quy định bảo hành, đổi trả hàng hóa thống nhất toàn chuỗi | Quy định giờ mở cửa, phụ phí vận chuyển hẻm sâu/chung cư |
| **4** | **Thanh toán & Đặt cọc (Payment Plans)** | `brochure-quote.ts`, `BrochureOrderOptions` | Danh mục kênh thanh toán hợp lệ (VietQR, Thẻ, Ví), sàn cọc tối thiểu | Tỷ lệ cọc thói quen ngành (Homestay 50-100%, May đo 70%, Bán lẻ COD) | Tài khoản thụ hưởng tập trung chuỗi, khóa cọc bắt buộc đơn giá trị lớn | Tiệm linh hoạt cho nợ với khách VIP thân thiết |
| **5** | **Phí Gia công & Thợ (Craft Fee & Subcontract)** | `craft-fee-policy.ts`, `industry-plugin-contract.ts` | Sàn tiền công bảo vệ thợ, trần mức phạt lỗi gia công (Max 30%) | Nhãn phí theo ngành, công thức tính theo độ khó và ngày cao điểm | Bảng đơn giá khoán thợ chuỗi, chia hoa hồng đối tác liên kết | Cửa hàng thưởng thêm ca đêm, phụ cấp thợ làm gấp |
| **6** | **Mẫu In Ấn & Phong Cách (Templates & Visual Styles)** | `templates/`, `industry-plugin-contract.ts` | 12 Visual Styles cốt lõi, chuẩn in ấn A6, công cụ xuất file PDF/PNG | Bộ mẫu ấn phẩm chuyên ngành (Tag, Card, Menu, Warranty, Care Guide) | Bộ nhận diện thương hiệu chuỗi (Logo, Màu sắc, Khung viền đồng nhất) | Điền thông tin chi nhánh (Hotline, Địa chỉ, Mã QR tiệm) |

---

## 3. THIẾT KẾ KIẾN TRÚC MÃ NGUỒN CHUẨN CLEAN ARCHITECTURE

Để đảm bảo tuân thủ **Clean Repository & Boundary Isolation Standard** (Zero ORM trong domain, SRP < 350 dòng), mỗi hệ thống sẽ được cấu trúc đồng nhất theo 4 lớp:

```
src/modules/<system-name>/
├── domain/
│   ├── registry/               # Master Catalog định nghĩa các Keys, Labels tiếng Việt
│   ├── contracts.ts            # Domain Entities, DTOs, Enums thuần túy
│   ├── layered-resolver.ts     # Lõi chung (30/10/2026): khoá tầng cao nhất thắng → ghi đè cụ thể nhất → mặc định
│   └── __tests__/              # Unit test bao phủ 100% kịch bản resolve và hard-lock
├── infra/
│   ├── repositories/           # Repository ports & Prisma implementations
│   └── mappers/                # Chuyển đổi Prisma Raw Row sang Domain Entity
├── use-cases/
│   ├── resolve-<system>.ts     # Lấy cấu hình hiệu lực cho một ngữ cảnh (Store/Chain)
│   ├── update-<system>-tier.ts # Lưu cấu hình theo tầng kèm kiểm tra vi phạm hard-lock
│   └── reset-<system>-tier.ts  # Xóa override để khôi phục mặc định
└── adapters/
    └── controllers/            # API Route handlers (Next.js route handlers)
```

---

## 4. KẾ HOẠCH TRIỂN KHAI THEO 4 GIAI ĐOẠN (PHASES)

### GIAI ĐOẠN 1: Chuẩn Hóa Lõi Domain & Resolver (Core Engine)
- **Mục tiêu**: Xây dựng thuật toán phân tầng mẫu `CascadingResolver<T>` dùng chung hoặc chuyên biệt cho từng domain.
- **Các bước thực hiện**:
  1. Xây dựng interface `CascadingConfigItem<T>` và `HardLockDefinition`.
  2. Triển khai `CascadingResolver` với unit test mô phỏng đủ 4 cấp: Mother $\rightarrow$ Industry $\rightarrow$ Chain $\rightarrow$ Store.
  3. Định nghĩa Master Registries cho Ưu đãi, Cam kết, Chính sách, Kế hoạch thanh toán.

### GIAI ĐOẠN 2: Nâng Cấp Hệ Thống Ưu Đãi, Cam Kết & Chính Sách (Promotions, Commitments, Policies)
- **Mục tiêu**: Nâng cấp module `greeting-card/domain/store-policy.ts` và tích hợp với quản trị chuỗi.
- **Các bước thực hiện**:
  1. Tách `store-policy.ts` thành các domain con độc lập: `promotions/`, `commitments/`, `policies/`.
  2. Bổ sung bảng/trường lưu trữ cấu hình 4 tầng trong DB (kế thừa mô hình JSON scoped hoặc bảng quan hệ).
  3. Viết Use-case `ResolveStorefrontPoliciesUseCase` phục vụ cho Thẻ chào (`SmartGreetingCard`) và Báo giá Brochure.
  4. Cập nhật giao diện Cài đặt tiệm (`/cai-dat`) và Quản lý Chuỗi (`/chuoi` hoặc Chain Dashboard) hiển thị ma trận phân tầng và badge khóa.

### GIAI ĐOẠN 3: Nâng Cấp Thanh Toán, Đặt Cọc & Phí Gia Công Thợ (Payment & Craft Fees)
- **Mục tiêu**: Chuẩn hóa dòng tiền, chính sách cọc và bảo vệ quyền lợi người làm sản phẩm.
- **Các bước thực hiện**:
  1. Nâng cấp `brochure-quote.ts` đọc chính sách đặt cọc theo cơ chế 4 tầng.
  2. Mở rộng `craft-fee-policy.ts` để chuỗi có thể áp dụng biểu phí khoán thợ thống nhất cho toàn bộ xưởng và chi nhánh.
  3. Tích hợp trần cứng (Hard-lock) tại tầng Mother: Giới hạn tối đa tỷ lệ khấu trừ lỗi gia công.

### GIAI ĐOẠN 4: Chuẩn Hóa Ấn Phẩm In Ấn A6 & Thiết Kế Thẩm Mỹ (Templates & Styles)
- **Mục tiêu**: Cho phép Chuỗi ép buộc nhận diện thương hiệu (Watermark, Logo chuỗi) lên toàn bộ ấn phẩm in A6 của chi nhánh.
- **Các bước thực hiện**:
  1. Định nghĩa `BrandIdentityOverlay` tại Tier 3 (Chain).
  2. Bổ sung logic render template A6: Tự động lồng Logo chuỗi vào góc ấn phẩm nếu chuỗi bật `enforce_brand_logo = true`.
  3. Cho phép chi nhánh chỉ được sửa thông tin liên hệ cục bộ (địa chỉ, số điện thoại tiệm).

---

## 5. TIÊU CHÍ NGHIỆM THU (DEFINITION OF DONE)

1. **100% Tuân thủ Clean Architecture**: Không có import `@prisma/client` trong thư mục `domain/`.
2. **Kế thừa hoàn hảo (Zero Data Duplication)**: Khi một cửa hàng mới tạo lập chưa chỉnh sửa gì, toàn bộ ưu đãi, cam kết và mẫu in hiển thị trên Storefront kế thừa 100% từ Chuỗi và Ngành mà không phát sinh thêm bản ghi rác.
3. **Hard-lock an toàn tuyệt đối**: Khi Tier 1 (Mother) hoặc Tier 3 (Chain) bật khóa cứng, StoreOS tại Tier 4 không thể gửi request ghi đè (Server-side validation từ chối, UI chuyển sang trạng thái disabled có badge giải thích lý do).
4. **Kiểm thử tự động**: Đầy đủ bộ Unit Tests cho `layered-resolver` (thay `cascading-resolver` đã gỡ 30/10/2026, nợ #193) đạt độ bao phủ nhánh $\ge 95\%$.
5. **Không hồi quy (No Regression)**: Chạy toàn bộ test suite `npm run test:tenant`, `npm run check:industry`, và `npx tsc --noEmit` đạt kết quả xanh 100%.
