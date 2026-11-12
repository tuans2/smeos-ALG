# Đánh giá đồng bộ — Marketing & Sales Center so với hệ thống hiện tại

> Trạng thái: **ĐÃ DUYỆT HƯỚNG** (PO 01/11/2026 — 7 quyết định ở §6) · Tài liệu gốc: `00_TAI_LIEU_GOC.md` · Danh mục asset: `02_DANH_MUC_ASSET.md` · Kế hoạch: `03_KE_HOACH_TRIEN_KHAI.md`.
> Cơ sở: đọc mã thật trên `main` (d4625c98) ngày 01/11/2026. Trạng thái công cụ lấy từ `toolkit-catalog.ts`; chưa chạy thử từng công cụ.

## 1. Hiện trạng `/cong-cu`

| Thành phần | Tệp | Ghi chú |
|---|---|---|
| Trang | `src/app/(app)/cong-cu/page.tsx` → `ToolkitHome` | Lớp 1 lưới module → lớp 2 chi tiết module (`toolkit-module-grid.tsx`, `toolkit-module-detail.tsx`) |
| 10 module tăng trưởng × 3 giai đoạn | `src/modules/toolkit/domain/growth-modules.ts` (+ `growth-module-roadmap.ts`) | Thêm khu "Quản lý chuỗi và tối ưu hệ thống" |
| Danh mục công cụ | `toolkit-catalog.ts` (51 gốc) + `app-page-tools.ts` (16 trang) | Production chỉ hiện `DONE` |
| Danh mục công cụ thứ hai | `tool-registry.ts` (`PLATFORM_TOOL_REGISTRY`) | Phân tầng/menu/quyền; đánh số khác `toolkit-catalog` |
| Trang con dưới `/cong-cu` | `anh-san-pham`, `bo-anh-san-pham`, `poster-banner` | Còn lại là liên kết sang trang khác |

Kết luận: `/cong-cu` là **danh mục công cụ**; chưa có khái niệm *loại asset*, *mục đích*, *nơi sử dụng*. Code dẫn chiếu `DONG_BO_51_CONG_CU.md` nhưng tệp không tồn tại (sửa ở PR-0). Chưa có Screen Contract `cong-cu.md`.

## 2. Đối chiếu module

| Tài liệu | Hiện có | Mức khớp |
|---|---|---|
| 01 Hồ sơ & Thương hiệu | `/ho-so`, Danh thiếp, Thư viện thương hiệu, Kho mẫu | Thiếu tạo bộ nhận diện AI + duyệt phiên bản |
| 02 Tạo nội dung | Ảnh, bộ ảnh, thẻ chào sản phẩm, nội dung, poster, video | Tốt |
| 03 Quảng bá | Quảng bá + Thu hút khách (catalog, ưu đãi, mã giảm giá, bảng giá, QR, link, form khách, lịch đăng) | Thiếu Chiến dịch |
| 04 Bán hàng | Tư vấn + Báo giá | `/bao-gia` chỉ là giao diện: không lưu, 3 chỗ `alert()` |
| 05 Chăm sóc | Chăm sóc + Tăng trưởng | Đa số FOUNDATION/PLANNED |
| 06 Ấn phẩm & Vật phẩm | Không có module; bản in rải rác (catalog PDF, danh thiếp PDF, bảng giá in, QR SVG, phiếu A6) | Thiếu |
| Ngoài 6 module | Tính giá, Đơn hàng, Thanh toán, Sản xuất/giao, Chuỗi, Tối ưu | → khu **Vận hành cửa hàng** (PO QĐ1) |

## 3. Đối chiếu mô hình dữ liệu (`prisma/schema.prisma`)

| Thực thể tài liệu | Hiện có | Thiếu |
|---|---|---|
| StoreProfile | `business_profiles` | Định vị, khách mục tiêu, phong cách, khu vực phục vụ |
| BrandProfile/Version | `brand_profiles` (1 dòng/tiệm, không phiên bản/duyệt); `brand_library_items/versions` (có phiên bản, không duyệt) | Phiên bản thương hiệu đã duyệt |
| AssetType | Không có (rải rác: enum kỹ thuật `asset_kind`, `LIBRARY_TYPES`, preset poster/landing) | Toàn bộ |
| AssetInstance | `assets` (ảnh/video, `approval_state`, `version`, `parent_asset_id`); bảng riêng `landing_pages`, `catalog_links`, `greeting_catalogs`, `content_drafts`, `campaign_packages`, `video_jobs`; Kho dữ liệu v2 (`storage/domain/library.ts`) gom đọc 8 loại | Poster/banner không lưu; báo giá không lưu |
| AssetUsage | Không có. Gần nhất: `short_links` (QR/link + utm + đích), các bảng link chia sẻ | Toàn bộ — lõi của tài liệu |
| Campaign | Chỉ chuỗi `utm_campaign` | Bảng chiến dịch |
| Lead | `leads` (nguồn, utm, đồng ý, phụ trách, hẹn, đơn chuyển đổi, `short_link_id`) | Pipeline mở rộng (PO QĐ4) |
| Customer/Segment | `customers` (hạng, tag, RFM), `customer_occasions`, `customer_consents` | Nhóm khách lưu được, nhật ký tương tác |
| Quotation | Không có (chỉ `/api/v1/orders/[id]/quote` báo giá **đơn đã có**, quyền `R15`) | Báo giá trước đơn |
| OrderReference | `orders` + nguồn đơn + `leads.converted_order_id` | Khớp |
| PrintRendition | Không có; mỗi trang tự xuất PDF bằng `jspdf` | Preset, bleed, preflight |

## 4. Mức đồng bộ

**Khớp sẵn:** business-first, UI 2 lớp, "không dữ liệu giả / không tự xuất bản / không KPI khi chưa có dữ liệu", Kho dữ liệu v2, lead ghi nguồn qua link ngắn, QR có thống kê, ưu đãi một nguồn.

**Lệch phải xử lý:** (1) công cụ là trung tâm, chưa có danh mục loại asset; (2) chưa có lớp "Dùng ở đâu"; (3) không phải đầu ra nào cũng lưu; (4) thương hiệu chưa có phiên bản duyệt; (5) pipeline lead 4 trạng thái; (6) Zalo/SMS/Push là stub → giao diện phải ghi "gửi thủ công / sao chép"; (7) phạm vi `/cong-cu`; (8) tạo logo/slogan bằng AI cần nhà cung cấp — hỏi PO khi tới; (9) công cụ có tải ảnh lên → chốt chặng hành trình 14 chặng.

## 5. Catalog và Thẻ chào — một hay hai asset? (trả lời PO QĐ5)

**Hai Asset Type khác nhau**, không phải một asset với hai mục đích:

| | Catalog | Thẻ chào |
|---|---|---|
| Dữ liệu | `catalog_links` — bộ lọc sản phẩm, slug công khai | `greeting_catalogs` (STANDARD/CLIENT) + `greeting_share_links`, `greeting_sessions`, sự kiện, thanh toán |
| Ai xem | Đông người, chưa định danh (link `/c/[slug]`) | Từng khách, link gửi riêng, có phiên khách |
| Hành động | Để lại thông tin (lead); nút Đặt hàng tuỳ bật | Thả tim, chọn mẫu, báo giá, chuyển khoản, điều phối, giao — quy trình 9 bước |
| Asset trong tài liệu | #18 Product Catalog, #72 Online Catalog Link | #19 Mini Catalog, #25 Product Selection Sheet, #26 Gift Collection, #27 Event Collection |
| Module chính | 03 Quảng bá (04 Bán hàng khi bật Đặt hàng) | 04 Bán hàng (05 Chăm sóc khi gửi khách cũ) |

Tài liệu gốc §2.2 cho phép tách loại khi "khác biệt thực sự về… quy trình" — hai công cụ khác cả dữ liệu lẫn quy trình nên là hai loại. Hợp nhất **chỉ ở lớp Usage và giao diện**.

Lưu ý thứ ba: **"Thẻ chào sản phẩm"** ở `/tai-anh?tab=m01c` (tab "Tư vấn khách", năng lực `C*`) là ảnh thẻ A6/1:1/Story + kịch bản Zalo → asset #4 Product Information Card và #74 Zalo Product Card. Kế hoạch coi công cụ này cũng **không sửa**.

**Cam kết không đổi Catalog và Thẻ chào** — xem `03_KE_HOACH_TRIEN_KHAI.md` §2 (vùng cấm, test khoá, cách nối chỉ qua URL công khai, link ngắn và đọc dữ liệu đã có).

## 6. Quyết định PO (01/11/2026)

| # | Câu hỏi | Quyết định |
|---|---|---|
| QĐ1 | Công cụ ngoài 6 module | Khu **Vận hành cửa hàng** riêng trên `/cong-cu` |
| QĐ2 | Production hiện asset nào | **Chỉ loại Sẵn** |
| QĐ3 | Đổi database | **Đồng ý** (`asset_usages`, `campaigns`, `quotations`, `customer_segments`, phiên bản thương hiệu…) — từng phase, mỗi thay đổi có migration |
| QĐ4 | Pipeline lead | **Mở rộng theo tài liệu** (thay quyết định 31/10/2026) |
| QĐ5 | Catalog/Thẻ chào | Hợp nhất ở lớp Usage + giao diện; **không sửa code hai công cụ** |
| QĐ6 | Bộ nhận diện thương hiệu | Trong phạm vi: **lập danh mục asset ngay**, công cụ tạo phát triển sau (chạy sau khi hồ sơ cửa hàng đủ thông tin; gồm logo, slogan, bộ màu, phông chữ…) |
| QĐ7 | Chia PR | Mỗi phase một PR, nhiều commit nhỏ |
