# Danh mục Asset — ánh xạ 77 asset + Bộ nhận diện thương hiệu vào hệ thống

> Nguồn thật để PR-0 sinh `src/modules/marketing-center/domain/asset-types/*.ts`. Khi lệch, **mã thắng**, sửa bảng này cùng commit.
> Đánh giá ngày 01/11/2026 trên `main` d4625c98.

## Quy ước

- **Module:** 01 Thương hiệu · 02 Tạo nội dung · 03 Quảng bá · 04 Bán hàng · 05 Chăm sóc · 06 Ấn phẩm.
- **Nơi dùng** (Usage): QB Quảng bá · BH Bán hàng · CS Chăm sóc · IN In ấn. Mọi asset đều "Lưu thư viện" được.
- **Công cụ:** mã trong `toolkit-catalog.ts`/`app-page-tools.ts` (`#n`) + đường dẫn.
- **Mức:**
  - **Sẵn** = công cụ `DONE` **và** tạo đúng loại này. Chỉ mức này hiện trên production (PO QĐ2).
  - **Mở rộng** = có công cụ/dữ liệu nền, thiếu preset, định dạng hoặc công cụ chưa `DONE`.
  - **Mới** = chưa có gì.
- Mức **tính từ mã**, không gõ tay: `READY ⇔ tool.status === "DONE" && fit === "FULL"`. Công cụ lên `DONE` → asset tự hiện.
- 🔒 = công cụ khoá, **không sửa code** (Catalog, Thẻ chào, thẻ chào sản phẩm ở `/tai-anh`). Chỉ trỏ link tới.

## A. 77 asset

| # | Tên trên giao diện | Module | Nơi dùng | Công cụ hiện có | Mức |
|---|---|---|---|---|---|
| 1 | Ảnh bìa sản phẩm | 02 | QB BH | #1 `/cong-cu/anh-san-pham` | Sẵn |
| 2 | Ảnh thu nhỏ sản phẩm | 02 | QB BH | #2 `/cong-cu/bo-anh-san-pham` | Sẵn |
| 3 | Bộ ảnh sản phẩm | 02 | QB BH | #2 | Sẵn |
| 4 | Thẻ thông tin sản phẩm | 02 | BH | #3 `/tai-anh?tab=m01c` 🔒 | Sẵn |
| 5 | Ảnh trưng bày sản phẩm | 02 | QB | #2 (thiếu preset trưng bày) | Mở rộng |
| 6 | Bảng so sánh sản phẩm | 02 | BH | — | Mới |
| 7 | Bảng bộ sưu tập | 02 | CS BH | #9 dữ liệu catalog (thiếu bản ảnh/PDF) | Mở rộng |
| 8 | Poster | 03 | QB IN | #5 `/cong-cu/poster-banner` | Sẵn |
| 9 | Poster khuyến mãi | 03 | QB IN | #5 (ưu đãi từ Cài đặt → Ưu đãi) | Sẵn |
| 10 | Banner giảm giá | 03 | QB | #5 | Sẵn |
| 11 | Banner trang web | 03 | QB | #5 (16:9) | Sẵn |
| 12 | Banner Facebook | 03 | QB | #5 (thiếu tỉ lệ ảnh bìa) | Mở rộng |
| 13 | Banner mạng xã hội | 03 | QB | #5 | Sẵn |
| 14 | Tờ rơi | 03 | QB IN | #5 A4 (thiếu A5 + quy cách in) | Mở rộng |
| 15 | Brochure | 03 | QB IN | — (nhiều mặt gấp) | Mới |
| 16 | Standee | 03 | QB IN | — | Mới |
| 17 | Bảng quảng cáo điện tử | 03 | QB | #5 16:9 (thiếu kích thước chuẩn) | Mở rộng |
| 18 | Catalog sản phẩm | 03 | QB BH | #9 `/catalog` 🔒 | Sẵn |
| 19 | Catalog mini | 04 | BH CS | #14 `/the-chao` 🔒 | Sẵn |
| 20 | Lookbook | 03 | QB BH | #9 (thiếu bố cục lookbook) | Mở rộng |
| 21 | Bảng giá | 04 | BH IN | #65 `/bang-gia` | Sẵn |
| 22 | Thực đơn sản phẩm | 03 | QB BH IN | #65 (thiếu bố cục thực đơn) | Mở rộng |
| 23 | Bài giới thiệu sản phẩm | 04 | BH | — | Mới |
| 24 | Báo giá sản phẩm | 04 | BH | #58 `/bao-gia` (chưa lưu) | Mới (PR-4) |
| 25 | Phiếu chọn mẫu | 04 | BH | #14 `/the-chao` 🔒 | Sẵn |
| 26 | Bộ sưu tập quà tặng | 04 | BH CS | #14 `/the-chao` 🔒 | Sẵn |
| 27 | Bộ sưu tập theo sự kiện | 04 | BH CS | #14 `/the-chao` 🔒 | Sẵn |
| 28 | Ảnh bài đăng Facebook | 02 | QB | #2 + #4 `/noi-dung` | Sẵn |
| 29 | Bài đăng Instagram | 02 | QB | #2 + #4 | Sẵn |
| 30 | Instagram nhiều ảnh | 02 | QB | #2 + #4 (thiếu ghép bộ) | Mở rộng |
| 31 | Instagram Story | 02 | QB | #2 (9:16) | Sẵn |
| 32 | Facebook Story | 02 | QB | #2 (9:16) | Sẵn |
| 33 | Bài ảnh TikTok | 02 | QB | #2 (9:16) + #4 | Sẵn |
| 34 | Ảnh Pinterest | 02 | QB | #2 (thiếu 2:3) | Mở rộng |
| 35 | Bài nhiều ảnh mạng xã hội | 02 | QB | #2 + #4 | Mở rộng |
| 36 | Album mạng xã hội | 02 | QB | #2 + #22 `/lich-dang` | Mở rộng |
| 37 | Ảnh bìa mạng xã hội | 01 | QB | — (xem TH09) | Mới |
| 38–47 | Video: trình chiếu, reel, TikTok, giới thiệu, khuyến mãi, poster động, câu chuyện, catalog video, trước–sau, bộ sưu tập theo mùa | 02 | QB BH | #6 `/video` (đang làm 50%) | Mở rộng |
| 48 | Thiệp chúc mừng | 05 | CS IN | #7 (chưa làm) | Mới |
| 49 | Thiệp cảm ơn | 05 | CS IN | — | Mới |
| 50 | Thiệp sinh nhật | 05 | CS | — | Mới |
| 51 | Thiệp kỷ niệm | 05 | CS | — | Mới |
| 52 | Thẻ quà tặng | 05 | CS IN | — | Mới |
| 53 | Voucher | 05 | BH CS | #66 `/uu-dai/ma-giam-gia` (có mã, thiếu thiết kế) | Mở rộng |
| 54 | Phiếu giảm giá | 05 | BH CS | #66 | Mở rộng |
| 55 | Thẻ hướng dẫn chăm hoa | 05 | CS IN | — | Mới |
| 56 | Thẻ xác nhận giao hàng | 05 | CS IN | #39 phiếu giao (đang làm) | Mở rộng |
| 57 | Thẻ mời đánh giá | 05 | CS | module `shop-reviews` | Mở rộng |
| 58 | Ảnh sản phẩm bản in | 06 | IN | #1 + preset in (PR-6) | Mở rộng |
| 59 | Poster sản phẩm bản in | 06 | IN | #5 A4 + preset in | Mở rộng |
| 60 | Catalog bản in | 06 | IN | đọc dữ liệu catalog công khai, bản in **mới, riêng** | Mở rộng |
| 61 | Thực đơn bản in | 06 | IN | #65 in/PDF | Mở rộng |
| 62 | Kệ trưng bày quầy | 06 | IN | — | Mới |
| 63 | Bảng để bàn | 06 | QB IN | #12 QR SVG | Mở rộng |
| 64 | Poster cửa kính | 06 | QB IN | #5 | Mở rộng |
| 65 | Poster treo tường | 06 | IN | #5 | Mở rộng |
| 66 | Thẻ treo sản phẩm | 06 | IN | — | Mới |
| 67 | Tem dán bao bì | 06 | IN | — | Mới |
| 68 | Trang sản phẩm nổi bật | 03 | QB BH | #8 `/landing-page` (loại SHOWCASE_HIGHLIGHT) | Sẵn |
| 69 | Trang bộ sưu tập | 03 | QB BH | #8 (loại CAMPAIGN_SEASONAL) | Sẵn |
| 70 | Trang chi tiết sản phẩm | 03 | QB BH | catalog công khai 🔒 (chưa có trang riêng) | Mở rộng |
| 71 | Album sản phẩm Facebook | 02 | QB | #22 `/lich-dang` | Mở rộng |
| 72 | Link catalog trực tuyến | 03 | QB BH | #9 `/catalog` 🔒 | Sẵn |
| 73 | Trang sản phẩm qua mã QR | 03 | QB BH | #12 `/thu-hut-khach` (đang làm 80%) | Mở rộng |
| 74 | Thẻ sản phẩm gửi Zalo | 04 | BH | #3 `/tai-anh?tab=m01c` 🔒 | Sẵn |
| 75 | Bản tin email | 05 | CS | — (chưa có kênh email gửi khách) | Mới |
| 76 | Bộ sưu tập sản phẩm số | 02 | QB BH | #53 `/san-pham` (chưa đánh giá) | Mở rộng |
| 77 | Ảnh bán hàng mạng xã hội | 03 | QB | — | Mới |

Tổng: **Sẵn 24** · Mở rộng 36 · Mới 17.

## B. Bộ nhận diện thương hiệu (PO QĐ6 — lập danh mục ngay, công cụ làm sau)

Bộ nhận diện là **một gói asset**, sinh một lần bằng công cụ "Tạo bộ nhận diện thương hiệu" (Mới). Công cụ chạy khi Hồ sơ cửa hàng đạt điều kiện "Sẵn sàng tạo" (tài liệu gốc §3.4). Chủ cửa hàng chọn/sửa/duyệt từng thành phần. Chỉ bản **đã duyệt** mới làm nguồn cho asset khác.

| Mã | Thành phần | Nơi dùng | Hiện có | Mức |
|---|---|---|---|---|
| TH01 | Logo (bản ngang, vuông, đơn sắc) | mọi asset | `brand_profiles.logo_asset_id` (tải lên tay) | Mới (tạo AI) |
| TH02 | Slogan | QB BH | — | Mới |
| TH03 | Bộ màu thương hiệu | mọi asset | `brand_profiles` màu (nhập tay) | Mở rộng |
| TH04 | Bộ phông chữ | mọi asset | `brand_profiles.font_*` | Mở rộng |
| TH05 | Giọng văn thương hiệu | nội dung | `brand_profiles.tone_of_voice` | Mở rộng |
| TH06 | Hồ sơ thương hiệu (tài liệu) | QB BH | — | Mới |
| TH07 | Hướng dẫn dùng thương hiệu | nội bộ, chuỗi | thư viện thương hiệu loại GUIDELINE (tải lên tay) | Mới |
| TH08 | Danh thiếp | BH IN | #64 `/ho-so/danh-thiep` | Sẵn |
| TH09 | Ảnh đại diện và ảnh bìa mạng xã hội | QB | — (= #37) | Mới |
| TH10 | Hashtag và câu kêu gọi chuẩn | nội dung | `brand_profiles.hashtags`, `cta_templates` | Mở rộng |
| TH11 | Câu giới thiệu cửa hàng chuẩn | mọi asset | `business_profiles.description` | Mở rộng |
| TH12 | Trang hồ sơ cửa hàng chia sẻ | QB | #11 `/ho-so` | Sẵn |
| TH13 | Landing page chính thức của cửa hàng | QB | #8 (loại STORE_BRAND) | Sẵn |
| TH14 | Brochure giới thiệu cửa hàng | QB IN | — (= biến thể #15) | Mới |
| TH15 | Bộ sưu tập mẫu đại diện | QB | #9 🔒 | Mở rộng |

Thành phần cốt lõi của gói AI: TH01–TH07, TH09, TH10, TH11. TH08, TH12–TH15 là **asset ứng dụng**, dùng bản thương hiệu đã duyệt (tài liệu gốc §3.3 B).

## C. Khu "Vận hành cửa hàng" (PO QĐ1 — không thuộc 6 module)

| Nhóm | Công cụ |
|---|---|
| Tính giá và lợi nhuận | #31 #32 #33 #34 #35 |
| Đơn hàng và giao hàng | #17 #19 #36 #37 #38 #39 #40 #41 #59 #60 |
| Thanh toán | #20 #62 |
| Chuỗi cửa hàng | #42 #43 #44 #46 #47 #48 |
| Số liệu và tối ưu | #63 #50 |

Công cụ tạo asset hoặc phục vụ 6 module giữ ở module tương ứng, ví dụ #49 Xu hướng thị trường → 02, #54 Kết nối kênh → 03, #55–#57 khách hàng/hộp thư/trợ lý → 04, #61 Ưu đãi → 03. Bảng gán đầy đủ từng mã nằm trong `business-modules.ts` (PR-0) và có test: mỗi công cụ xuất hiện đúng một nơi.
