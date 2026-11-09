# Kế hoạch thực thi — Nhóm "Quảng bá sản phẩm" dạng ô 3 chức năng

**Nhánh:** `Hoanthien_Quangba` · **Trạng thái:** ĐÃ DUYỆT, ĐANG THỰC THI (D-67) · **Lập:** 09/11/2026
**Phạm vi:** `[PROD]` — chỉ làm đúng phần dưới đây; không đổi lược đồ, không thêm thư viện, không thêm nhà cung cấp.

---

## 1. Quyết định PO đã chốt (09/11/2026)

| # | Câu hỏi | Quyết định |
|---|---|---|
| Q1 | Landing ở nhóm Quảng bá khác Landing ở nhóm Thương hiệu thế nào? | **Đồng ý đề xuất:** nhóm Thương hiệu giữ **một** "Landing page chính thức của cửa hàng". Nhóm Quảng bá làm **landing cho từng chiến dịch, sản phẩm hoặc dịp**, tạo được nhiều trang |
| Q2 | "Thẻ chào sản phẩm riêng cho cá nhân" là gì? | Là **greeting-card = "Bộ sưu tập riêng"** (`/the-chao`, đặt tên ở PR #14 / D-66): link riêng gửi đích danh một khách. Khách chọn mẫu, đặt hàng, thanh toán và theo dõi đơn ngay trên link |
| Q3 | Các công cụ và ấn phẩm cũ của nhóm Quảng bá xử lý ra sao? | **Ẩn toàn bộ khỏi nhóm này.** Chuyển vào khu "Phát triển sau", giống hai nhóm trước: không xoá code, môi trường dev vẫn thấy |

## 2. Kết quả người dùng nhìn thấy

Mở /cong-cu → bấm **"Quảng bá sản phẩm"**. Lưới công cụ và ấn phẩm cũ được thay bằng **3 ô** cùng phong cách với hai nhóm trước:

| Ô | Dòng phụ trên ô (ví dụ) | Bấm vào thì mở ngay trong /cong-cu |
|---|---|---|
| **Landing page** | "2 trang đang chạy" / "Chưa có trang nào" | Danh sách landing chiến dịch đã xuất bản và nút "Tạo landing mới" |
| **Bộ sưu tập chung** (Catalog) | "1 bộ sưu tập đang chạy" / "Chưa có" | Danh sách bộ sưu tập chung, kèm link và QR, và nút "Tạo bộ sưu tập" |
| **Bộ sưu tập riêng** (Thẻ chào riêng cho cá nhân) | "5 link đã gửi" / "Chưa gửi khách nào" | Luồng gửi nhanh 3 bước (chọn bộ sưu tập → nhập khách → lấy link) và danh sách link đã gửi |

**Điểm khác hai nhóm trước:**
- Ba chức năng **độc lập**, không khoá theo thứ tự. Không có "Bước 1/2/3", không có ổ khoá.
- Tiêu đề trên thẻ nhóm ở trang /cong-cu đổi thành: "3 chức năng: Landing · Bộ sưu tập chung · Bộ sưu tập riêng".

**Nhắc nhẹ, không chặn** (hiện phía trên 3 ô, mỗi câu kèm nút sang đúng chỗ bổ sung):
- Hồ sơ cửa hàng chưa đủ → "Landing và bộ sưu tập sẽ thiếu tên, số điện thoại hoặc nút gọi/Zalo." → nút **Hoàn thiện hồ sơ** (/ho-so).
- Kho chưa có sản phẩm nào đã duyệt → "Chưa có sản phẩm đã duyệt để đưa lên trang." → nút **Tạo Thẻ sản phẩm** (mở nhóm Tạo nội dung, Bước 1).

## 3. Thiết kế kỹ thuật

### 3.1 Nguyên tắc
- **Dùng lại 100% luồng tạo có sẵn.** Không viết lại trình tạo landing, catalog hay bộ sưu tập riêng. Ô chỉ là khung điều hướng cộng phần tóm tắt.
- **Không đổi API, lược đồ hay quyền.** Mọi dữ liệu lấy từ endpoint đang có, máy chủ vẫn kiểm quyền như cũ:
  - landing và bộ sưu tập chung: `catalog-links`, quyền `J1`;
  - bộ sưu tập riêng: `greeting-card`, quyền theo `GREETING_CARD_CAPABILITY`.
- Thiếu quyền thì ô vẫn hiện, nhưng nói rõ "Bạn chưa có quyền …", không ẩn lặng lẽ (Progressive Disclosure).
- Mọi câu chữ để chung một chỗ (`promotion-copy.ts`), tiếng Việt tự nhiên, không mã kỹ thuật.

### 3.2 Phân biệt landing và bộ sưu tập chung
Cả hai cùng lưu ở bảng `catalog_links`. Quy tắc phân biệt **đã có sẵn** trong `get-public-catalog.ts`:
`isLanding = filters.occasion || filters.archetype || filters.generatedPackage`.
- Đưa quy tắc này thành **hàm thuần dùng chung** `classifyCatalogLink(filters)` trả về `"OFFICIAL_LANDING" | "CAMPAIGN_LANDING" | "PUBLIC_COLLECTION"` (`filters.store_official === true` → trang chính thức).
- `get-public-catalog.ts` gọi lại hàm này, hành vi không đổi, có unit test khoá.
- Ô Landing chỉ đếm và liệt kê `CAMPAIGN_LANDING`. Trang chính thức vẫn thuộc nhóm Thương hiệu.
- Ô Bộ sưu tập chung chỉ đếm và liệt kê `PUBLIC_COLLECTION`.

### 3.3 Tệp dự kiến

**Domain (thuần, không import hạ tầng):**
- `src/modules/toolkit/domain/deferred-module-content.ts`:
  - thêm `promotion: { journey: "PROMOTION_HUB", … }`;
  - mở rộng kiểu `ModuleJourney`.
- `src/modules/catalog-links/domain/catalog-link-kind.ts` (mới): `classifyCatalogLink` cùng unit test.
- `src/modules/toolkit/domain/promotion-hub.ts` (mới):
  - `PROMOTION_FEATURES` gồm `LANDING`, `PUBLIC_COLLECTION`, `PRIVATE_COLLECTION`;
  - hàm tóm tắt `promotionSummary(counts)` cho dòng phụ trên ô;
  - unit test đi kèm.

**Giao diện (`src/components/promotion-hub/`, mới):**

| Tệp | Việc |
|---|---|
| `promotion-hub-tiles.tsx` | Khung 3 ô, nhắc nhẹ, chọn ô đang mở; nhớ ô qua `?muc=promotion&o=landing\|chung\|rieng` |
| `promotion-copy.ts` | Câu chữ, dòng phụ, câu nhắc |
| `use-promotion-hub.ts` | Tải song song: danh sách `catalog-links`, `greeting-card/send-links`, hồ sơ cửa hàng, số sản phẩm đã duyệt; mỗi nguồn lỗi riêng, có Thử lại |
| `landing-panel.tsx` | Danh sách landing chiến dịch (tên, ngày tạo, link, QR, ngừng chia sẻ), rồi `LandingTypeSelector` (chỉ "Trang chiến dịch & dịp lễ đặc biệt" và "Trang chào dịch vụ & công trình tiêu biểu"; bỏ hai loại trang thương hiệu) cùng `LandingCampaignTab` có sẵn |
| `public-collection-panel.tsx` | Danh sách bộ sưu tập chung dùng `CatalogManagementTab` có sẵn, kèm nút tạo |
| `private-collection-panel.tsx` | Nhúng `JourneyWizard` có sẵn (gửi nhanh 3 bước), kèm lối "Quản lý đơn và theo dõi" sang `/the-chao?mode=manager` |

**Sửa nhỏ:**
- `src/components/dashboard/toolkit-module-detail.tsx`: thêm nhánh `PROMOTION_HUB` → `<PromotionHubTiles />`. Tệp 205 dòng, thêm khoảng 2 dòng.
- `src/components/dashboard/toolkit-module-grid.tsx`: dòng phụ của thẻ nhóm.
- Nếu `landing-page-studio-client.tsx` và `catalog/page.tsx` đang giữ logic tải sản phẩm mà panel cần dùng lại, tách logic đó thành hook dùng chung (`use-catalog-products.ts`). Hai trang cũ gọi lại hook này, hành vi không đổi. Chỉ làm nếu cần để không chép code (A-patterns: không nhân bản).

**Không đụng:**
- `prisma/schema.prisma`, `render.yaml`, CI.
- Thanh tab khoá của `/the-chao` (5 tab, PO 06/10/2026).
- `<FeatureGuidanceCard />`.
- Các trang `/landing-page`, `/catalog`, `/the-chao` vẫn mở trực tiếp như cũ.

### 3.4 Khu "Phát triển sau" của nhóm Quảng bá
- 11 công cụ (`toolIds` 8, 9, 10, 12, 13, 14, 21, 25, 54, 61, 66) và các ấn phẩm `promotion` chuyển thành `deferredTools` / `deferredAssets`. Chỉ môi trường dev thấy, không tính vào số liệu đầu trang. Logic này đã có, chỉ cần thêm một dòng cấu hình.
- **Menu bên trái và các trang cũ (Ưu đãi, mã giảm giá, QR, link bán hàng, bảng giá…) không đổi.** Quyết định Q3 chỉ ẩn chúng khỏi nhóm Quảng bá trên /cong-cu. Nếu PO muốn ẩn cả menu, làm ở đợt riêng.

## 4. Kiểm thử

| Loại | Nội dung |
|---|---|
| Unit | `classifyCatalogLink`: trang chính thức, landing chiến dịch theo từng dấu hiệu (occasion/archetype/generatedPackage), bộ sưu tập chung, `filters` rỗng hoặc sai kiểu |
| Unit | `promotionSummary`: 0, 1, nhiều; nguồn lỗi; thiếu quyền |
| Unit | `business-modules.test.ts`: nhóm `promotion` có `journey = "PROMOTION_HUB"` cả dev lẫn production; nội dung cũ chỉ còn ở `deferred*`; các nhóm sales/care/print giữ `journey = null` |
| Unit | `get-public-catalog`: test có sẵn phải xanh nguyên, chứng minh việc tách hàm không đổi hành vi |
| Tenant | Không thêm endpoint nên không cần test cách ly mới. Vẫn chạy đủ `test:tenant` và `test:platform` để chắc không vỡ gì |
| UX audit | Kịch bản mới `scripts/ux-audit/scenarios/cong-cu-quang-ba.mjs`, chụp 390px và 1280px các trạng thái: chưa có gì, có landing và bộ sưu tập, hồ sơ thiếu (nhắc nhẹ), Kho trống, từng ô đang mở, lỗi một nguồn |

## 5. Tài liệu cập nhật cùng commit
- `docs/dac-ta/screen-contracts/cong-cu.md`: thêm §12 "Nhóm Quảng bá sản phẩm dạng ô 3 chức năng".
- `docs/audit/architecture-audit/15_PO_DECISION_REGISTER.md`: thêm dòng quyết định Q1–Q3 (09/11/2026).
- `docs/kien-truc/TRANG_THAI.md`: ghi trạng thái.
- Chú thích đầu tệp `deferred-module-content.ts`.

## 6. Các đợt và cổng kiểm

| Đợt | Nội dung | Ra |
|---|---|---|
| **1** | Domain (`classifyCatalogLink`, `promotion-hub`, cấu hình Phát triển sau) và test; khung 3 ô cùng nhắc nhẹ; ô **Bộ sưu tập riêng** (nhúng luồng gửi nhanh) | Commit 1 |
| **2** | Ô **Landing page** và ô **Bộ sưu tập chung** (danh sách, link, QR, ngừng chia sẻ, tạo mới); kịch bản UX audit; tài liệu | Commit 2, sau đó tạo PR vào `main` và theo dõi đến khi merge |

**Cổng chạy trước mỗi lần đẩy (theo CLAUDE.md):**
- `npm run typecheck`, `npm run lint:ratchet`, `npm run lint:ux -- --check`;
- `npm test`;
- `npm run test:tenant`, `npm run test:platform` (trên DB `*_test`);
- `npm run check:docs`, `npm run build`;
- kịch bản UX audit mới.

Không tệp nào vượt 350 dòng; tệp cũ quá 350 dòng không dài thêm.

## 7. Rủi ro và cách xử lý
| Rủi ro | Cách xử lý |
|---|---|
| `LandingCampaignTab` (396 dòng) và `JourneyWizard` vốn dựng cho trang riêng, có thể giả định chiều cao hoặc thanh tiêu đề | Chỉ nhúng, không sửa ruột. Nếu vỡ bố cục thì bọc khung trong panel. Tệp trên 350 dòng không được dài thêm |
| Tải trùng dữ liệu khi mở nhiều ô | Mỗi panel chỉ tải khi mở; phần tóm tắt dùng danh sách nhẹ (`limit`) |
| Landing cũ tạo trước khi có `archetype` bị nhận nhầm là bộ sưu tập chung | Quy tắc lấy đúng từ code đang chạy (`get-public-catalog.ts`), nên trang công khai và ô phân loại giống nhau |
| GitHub Actions đang không cấp máy chạy (Billing) | PR chỉ merge khi CI xanh; báo PO nếu vẫn bị chặn |

## 8. Chưa nằm trong kế hoạch (đề xuất, chờ PO)
- Số lượt xem từng landing hoặc bộ sưu tập: hiện `catalog_links` chưa đếm lượt xem. Muốn có thì phải đổi lược đồ, cần PO duyệt riêng.
- Ẩn các mục Ưu đãi / QR / link bán hàng khỏi menu bên trái.
- Gắn Thẻ chào sản phẩm (nhóm Tạo nội dung, Bước 2) vào bộ sưu tập riêng để khách xem thẻ ngay trên link.
