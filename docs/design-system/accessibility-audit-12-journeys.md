# Quy trình kiểm trợ năng WCAG 2.2 AA trên 12 hành trình

> **Tiêu chuẩn:** WCAG 2.2 Level AA · **Lần kiểm:** 04/11/2026 — phần tự động; trình đọc màn hình chưa kiểm.
> **Tệp kết quả:** [`a11y-results/2026-11-04/a11y-journeys.json`](a11y-results/2026-11-04/a11y-journeys.json), sinh bởi `tests/e2e/ux/a11y-journeys.spec.ts` (chạy trong `npm run test:e2e:ux`, chặn CI).
> **Công cụ:** Playwright + `@axe-core/playwright` (`tests/e2e/ux/a11y*.spec.ts`), bàn phím, VoiceOver (macOS/iOS), NVDA (Windows).

## 1. Năm phép kiểm cho mỗi hành trình

1. **Chỉ dùng bàn phím** — `Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`, phím mũi tên đi hết hành trình, không dùng chuột.
2. **Tiêu điểm hiện rõ và không bị che** (2.4.7, 2.4.11) — vòng tiêu điểm thấy được; khi cuộn, header dính và thanh điều hướng đáy không che phần tử đang có tiêu điểm.
3. **Tương phản** (1.4.3, 1.4.11) — chữ thường ≥ 4,5:1, chữ lớn và thành phần giao diện ≥ 3:1, trên cả 3 preset `moc-lan`, `modern-slate`, `pure-swiss`, chế độ sáng và tối.
4. **Phóng 200%** (1.4.4) — không mất nội dung, không cuộn ngang hai chiều.
5. **Giảm chuyển động** (2.3.3) — với `prefers-reduced-motion: reduce`, hiệu ứng quay, nhấp nháy, chuyển cảnh dừng hoặc chuyển tức thời.

Mỗi hành trình chạy thêm quét axe tự động; mọi vi phạm `critical`/`serious` là lỗi chặn.

## 2. Mười hai hành trình

| # | Hành trình | Tuyến |
|---|---|---|
| J01 | Khách xem bộ sưu tập và đặt hàng | `/b/[sendCode]`, `/bst/[orgSlug]`, `/c/[slug]` |
| J02 | Khách nhận thiệp số và lời chúc | `/g/[id]` |
| J03 | Đăng nhập, đăng ký và dùng thử | `/dang-nhap` |
| J04 | Bảng điều khiển cửa hàng | `/` |
| J05 | Sản phẩm và định lượng | `/san-pham`, `/san-pham/[id]`, `/san-pham/tao-moi` |
| J06 | Đơn hàng và trạng thái | `/don-hang` |
| J07 | Khách hàng | `/khach-hang` |
| J08 | Điều phối chuỗi | `/dieu-phoi`, `/dieu-phoi/doi-tac` |
| J09 | Cổng đối tác gia công | `/subcontract/[orderCode]` |
| J10 | Số liệu kinh doanh | `/so-lieu` |
| J11 | Cài đặt và chính sách | `/cai-dat`, `/uu-dai`, `/tich-hop` |
| J12 | Console vận hành nền tảng | `/van-hanh` |

## 3. Kết quả

Bản build production, commit `ee6e5aea`, database đã seed; người kiểm: bộ kiểm tự động `a11y-journeys.spec.ts`. "Đạt" = 0 vi phạm critical/serious (axe), 0 lỗi ở phép kiểm tương ứng.

| # | Tuyến đã kiểm | Bàn phím | Tiêu điểm | Tương phản (3 preset) | Phóng 200% | Giảm chuyển động | axe | Trình đọc màn hình |
|---|---|---|---|---|---|---|---|---|
| J01 | `/c/[slug]`, `/b/[sendCode]`, `/bst/[orgSlug]/[catalogCode]` (có dữ liệu và không tìm thấy) | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Chưa kiểm |
| J02 | `/g/[id]` (có dữ liệu và không tìm thấy) | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Chưa kiểm |
| J03 | `/dang-nhap` | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Chưa kiểm |
| J04 | `/` | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Chưa kiểm |
| J05 | `/san-pham`, `/san-pham/[id]`, `/san-pham/tao-moi` | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Chưa kiểm |
| J06 | `/don-hang` | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Chưa kiểm |
| J07 | `/khach-hang` | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Chưa kiểm |
| J08 | `/dieu-phoi`, `/dieu-phoi/doi-tac` | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Chưa kiểm |
| J09 | `/subcontract/[orderCode]` (có lời mời gia công và không tìm thấy) | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Chưa kiểm |
| J10 | `/so-lieu` | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Chưa kiểm |
| J11 | `/cai-dat`, `/uu-dai`, `/tich-hop` | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Chưa kiểm |
| J12 | `/van-hanh` | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Chưa kiểm |

Giới hạn của lần kiểm:

- **Bàn phím:** kiểm 40 điểm dừng `Tab` đầu tiên mỗi tuyến (vòng tiêu điểm thấy được, không bị che hoàn toàn); chưa kiểm hết luồng thao tác như mở và đóng hộp thoại, chọn trong danh sách xổ.
- **Phóng 200%:** khung 640×400 CSS px (tương đương 1280×800 ở 200%); kiểm không cuộn ngang toàn trang.
- **Tương phản:** 3 preset ở giao diện sáng; hệ thống chưa có chế độ tối. Trước 06/11/2026 phép đo chỉ đổi preset trên `<html>` nên nội dung trong `AppShell` thực chất chỉ đo một preset; từ 06/11/2026 đo đủ 3 preset (CHANGELOG 1.3.1).
- **Trang công khai:** `/b`, `/bst`, `/g` kiểm cả trạng thái có dữ liệu (bộ sưu tập và link gửi tạo qua API trong bộ kiểm) và trạng thái không tìm thấy; `/subcontract` kiểm cả trạng thái có lời mời gia công (đơn và token chi nhánh tạo trong database test) và trạng thái không tìm thấy. Ba trang không tìm thấy `/b`, `/g`, `/subcontract` không có liên kết nào để quay lại.
- **Trình đọc màn hình** (VoiceOver, NVDA) chưa kiểm theo quyết định PO 03/11/2026.
- **Vùng PO khoá:** các lỗi trong vùng Thẻ chào đã sửa theo duyệt của PO ngày 05/11/2026 (mốc khoá cập nhật cùng commit); bộ kiểm không còn mục `KNOWN_FROZEN` nào.

Lỗi đã sửa trong vùng Thẻ chào (PO duyệt 05/11/2026): ô tìm kiếm đơn trên `/don-hang` (`coordinator-brochure-tab.tsx`) có vòng tiêu điểm khi dùng bàn phím (2.4.7); huy hiệu "Ưu đãi …" trên `/b`, `/bst`, `/g` (`journey-contact-form.tsx`) đổi sang `text-danger-text`; trên `/subcontract/[orderCode]`, nhãn "Thù lao gia công" dùng màu chữ chính, còn chữ màu chính đặt trên nền màu chính pha nhạt (huy hiệu đầu trang, tiêu đề thẻ, số tiền thù lao, bước đang mở, huy hiệu bước nhận đơn; nhãn chi nhánh và nhãn vòng mời trên bảng điều phối gia công) dùng `text-primary-dark` — preset `modern-slate` trước đó chỉ đạt 4,31–4,48:1.

Lỗi đã sửa trong lần kiểm trước: nút hiện/ẩn mật khẩu thiếu tên; ô nhập đăng nhập thiếu vòng tiêu điểm; huy hiệu trạng thái dùng `text-danger`/`text-warning` trên nền nhạt (đổi sang `text-danger-text`/`text-warning-text`); ô chọn và ô số thiếu tên ở tạo sản phẩm, cài đặt, ưu đãi; thẻ ngành bị làm mờ dưới ngưỡng tương phản; `PageHeader` và thanh lọc ma trận quản trị gây cuộn ngang ở 640px.

## 4. Cơ chế trợ năng có trong mã

| Cơ chế | Vị trí |
|---|---|
| Thông báo cho trình đọc màn hình | `LiveRegionProvider` trong `src/components/layout/app-shell.tsx` |
| Quản lý lớp nổi (modal, drawer, bottom sheet) | `src/components/layout/floating-layer.tsx` |
| Luật lint nút chỉ có icon phải có nhãn (R6), hiệu ứng phải có `motion-reduce` (R23) | `scripts/ux-lint/` — R23 còn 96 vi phạm trong baseline |
| Bộ kiểm tự động 12 hành trình | `tests/e2e/ux/a11y-journeys.spec.ts`, `tests/e2e/ux/a11y-journeys.helpers.ts` |
