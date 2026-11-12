# Kiểm kê màu cứng và điểm thương hiệu cứng (BẢN NHÁP)

Mục đích: biết chính xác việc "đổi UI theo bộ nhận diện ALG" chạm bao nhiêu chỗ. Chỉ đọc mã, chưa sửa gì. Số liệu đo ngày 11/11/2026 trên nhánh `claude/fervent-pascal-ilhcgb`.

## 1. Đính chính so với câu trả lời trước

Tôi đã nói thêm thương hiệu mới "chỉ qua `themes.css` + `presets.ts` + PO duyệt". **Chưa đầy đủ.** Dự án còn có **màu thương hiệu theo từng tổ chức**:

- `organizations.settings.ui_brand` → `resolveUiTheme()` sinh CSS custom properties đè `--color-primary`, `-dark`, `-muted`, `-border`, `--color-accent` cho shell của tổ chức đó (`src/lib/ui-system/resolve-ui-theme.ts`).
- API có sẵn: `GET/PUT/PATCH /api/v1/organization/brand` (`src/app/api/v1/organization/brand/route.ts`), có kiểm tương phản màu chính ≥ 4,5:1 với nền trắng (`validateBrandContrast`).
- Schema có thêm trường `logoUrl` (chưa kiểm xem shell có hiển thị logo này không).

**Vậy với ALG là một tổ chức (tenant) trong hệ thống, đổi màu chủ đạo có thể làm bằng cấu hình, không cần sửa mã.** Giới hạn của cơ chế này ở mục 4.

## 2. Màu hex cứng trong mã (ngoài `src/styles/tokens`)

654 giá trị trong 51 tệp `.ts/.tsx/.css` (không tính test). Chia nhóm:

| Nhóm | Giá trị | Tệp | Ý nghĩa với việc đổi thương hiệu |
|---|---:|---:|---|
| A. Dữ liệu mẫu / phong cách / công cụ chọn màu | 453 | 15 | Bảng màu của 12 phong cách catalog, swipe-themes, brand-kit, hồ sơ mẫu, màu mặc định form thương hiệu. **Không phải chrome nền tảng**, không cần đổi theo ALG (nhưng ALG có thể muốn bộ phong cách riêng) |
| B. Bản chép preset | 72 | 1 (`presets.ts`) | Có test đối chiếu với CSS; thêm preset phải sửa cả hai nơi |
| C. Giao diện / ấn phẩm / email cần rà | 112 | 33 | **Sẽ không đổi theo theme.** Gồm thẻ catalog công khai (`catalog-card-*`, `catalog-cover-poster*`, `catalog-storefront-header` với màu nền dự phòng `#9A3412`), nền tối của khung phóng ảnh (`global-image-zoom`), phiếu in (`order-evidence-print`), **email thông báo** (`email-adapter.ts`, nút `#2563eb`), mã QR (`qr-engine`, `qr-branding`), ảnh OG ghép (`catalog-collage-image`) |
| D. Thương hiệu khách nhúng trong mã | 17 | 2 | `avi-lotus-brand.ts` (màu thương hiệu AVI GIFT viết thẳng trong mã) và mặt danh thiếp |

Tệp lớn nhất: `swipe-themes.ts` (109), `style-registry-s01-s06.ts` (85), `style-registry-s07-s12.ts` (83), `presets.ts` (72) — đều là dữ liệu.

Lưu ý: lint R1/R3 hiện chỉ có 6 miễn trừ và không báo vi phạm. Tôi chưa kiểm phạm vi chính xác của hai quy tắc này, nên chưa kết luận được vì sao các tệp nhóm C (đặc biệt `.ts` và chuỗi HTML email) không bị bắt.

## 3. Điểm thương hiệu cứng khác

| Điểm | Số liệu / vị trí | Việc cần làm khi đổi sang ALG |
|---|---|---|
| Tên "smeOS" trong chuỗi hiển thị | ~73 chỗ trong `.tsx` (ngoài chú thích); nhiều nhất ở Copilot (7), Tri thức (4), chân thanh điều hướng (3), Thư viện màn hình (3) | Gom về một hằng/từ điển thương hiệu rồi thay |
| Tên "FloraOS" còn sót | ~8 chỗ trong `.tsx` | Thống nhất tên sản phẩm |
| Tiêu đề trang / mô tả | `src/app/layout.tsx`: `title: "smeOS"`, `description: "Nền tảng quản trị kinh doanh đa ngành cho SME"` | Chuyển sang cấu hình |
| Logo và biểu tượng | Trang Đăng nhập vẽ logo bằng SVG tại chỗ, dùng token `--color-flora-*`; `public/brand/` chứa tệp Mộc Lan (`moc-lan-logo.jpg`, `moc-lan-qr.svg`, `moc-lan-intro.mp4`) và `avi-lotus/` | Bộ logo/biểu tượng ALG (SVG), favicon, ảnh OG |
| Phông chữ | `typography.css`: Be Vietnam Pro, Fraunces, Playfair Display, Caveat; preset cũng chép phông | Cần tệp phông và giấy phép của ALG (nếu khác) |
| Chọn preset | `resolveUiTheme`: Console và Chuỗi bị ép `modern-slate`; cửa hàng chỉ nhận `ui_preset` là `modern-slate` hoặc `pure-swiss` (danh sách trong mã) | Thêm preset ALG phải sửa cả hàm này |
| Thương hiệu khách trong mã | `avi-lotus-brand.ts`, `public/brand/avi-lotus/`, và các tệp trong `modules/avi-gift-import/` (nhập danh mục AVI GIFT) | Tiền lệ cần xem xét: thương hiệu từng khách đang nằm trong mã thay vì cấu hình |

## 4. Ba mức "đổi theo ALG" và phạm vi tác động

| Mức | Làm gì | Chạm | Rủi ro / giới hạn |
|---|---|---|---|
| **1. Màu thương hiệu của tổ chức ALG** (cấu hình) | Gọi `PUT /organization/brand` với màu chính/phụ/accent | Chỉ 5 token màu primary/accent của shell tổ chức ALG | Không đổi nền, chữ, màu phụ, phông, bo góc, logo hiển thị; màu mới đặt cạnh nền kem Mộc Lan có thể lệch tông; chỉ kiểm tương phản màu chính trên nền trắng, chưa kiểm cặp khác (ví dụ chữ trên `primary-muted`) |
| **2. Preset giao diện ALG** (mã + PO duyệt) | Thêm khối `[data-theme="alg"]` vào `themes.css`, chép sang `presets.ts`, thêm vào danh sách trong `resolveUiTheme`, cập nhật test đối chiếu | Toàn bộ token (nền, chữ, bo góc, bóng, màu trạng thái) cho mọi màn dùng token | Token cần PO duyệt (CODEOWNERS); phải kiểm tương phản AA mọi cặp; chụp lại toàn bộ màn |
| **3. White-label đầy đủ** | Mức 2 + thay tên, logo, favicon, phông, tiêu đề, email, phiếu in, mã QR, ảnh OG, 33 tệp nhóm C | Khoảng 33 tệp màu cứng + ~80 chỗ tên + tài nguyên `public/brand` | Phạm vi lớn nhất; nên làm sau khi Đợt 2 hoàn tất để không đổi trên nền token còn lệch |

## 5. Điều kiện để bắt đầu (cần ALG/PO cung cấp)

1. **Quyết định phạm vi**: ALG là một tổ chức dùng hệ thống (mức 1–2) hay thương hiệu của chính nền tảng (mức 3).
2. Bộ nhận diện: bảng màu (mã hex), phông chữ kèm giấy phép, logo SVG (nền sáng/tối), favicon, quy tắc dùng màu.
3. PO duyệt thay đổi token (README Design System §3).
4. Xác nhận cách xử lý thương hiệu khách trong mã (AVI): giữ nguyên hay chuyển sang cấu hình.

## 6. Chưa kiểm

- Shell có thực sự hiển thị `ui_brand.logoUrl` hay không.
- Giao diện quản trị để người dùng đặt `ui_brand` (mới thấy API; chưa kiểm màn hình).
- Màu kết hợp thực tế khi đặt thử một màu ALG giả định cạnh nền Mộc Lan.
