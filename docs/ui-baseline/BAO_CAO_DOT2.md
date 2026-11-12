# Báo cáo Đợt 2 — điều khiển và vùng bấm (BẢN NHÁP)

Nhánh `claude/fervent-pascal-ilhcgb`, 11/11/2026. Phạm vi theo `KE_HOACH_NANG_CAP_UI.md` mục M3/M7: sửa ở component dùng chung, không đụng UX khoá (shell, `FeatureGuidanceCard`, tiêu đề Thẻ chào).

## 1. Đã làm

| Việc | Vấn đề | Kết quả đo |
|---|---|---|
| Thêm `aria-label` cho nút gửi chat, nút Studio ở chi tiết sản phẩm (390px), 3 ô phần trăm hạng đối tác (`/gia`), ô chọn preset và lọc tính năng ở Console | DS-02 | Axe critical/serious (trừ lỗi shell) = 0 trên 9 màn × 2 khổ |
| Biến thể `Button` `warning` đổi chữ trắng → `text-text` | DS-01 (primitive) | Tương phản 3,33:1 → 4,82:1; các biến thể khác đã ≥ 4,89:1 |
| `Checkbox` mở rộng vùng bấm bằng `::after` (không đổi kích thước hiển thị) | DS-10 | 20×20 → 24×24px (44px khi cảm ứng); tính theo CSS, đã sửa lần hai vì lần đầu chỉ ra 22px |
| Công tắc ở ma trận thông báo (36×20px) | DS-10 | Vùng bấm đo được 44×26px (60×44px khi cảm ứng); trước đó 36×20px, 95 công tắc ở 2 màn thông báo |
| Nút "Xác nhận tiền" không xuống dòng; ô số tiền có dấu phân cách | DS-11 | Đã xem ảnh `/don-hang` ở 1280px: nút đủ chữ một dòng, "450.000" thay cho "450000" |

Test mới: biến thể warning (`button.test.tsx`), vùng bấm Checkbox (`selection-controls.test.tsx`).

## 2. Chưa làm và lý do

| Việc | Lý do |
|---|---|
| Chuyển 11 `<input type="range">` (R18) sang component chuẩn | Kho `components/ui/` **chưa có `Slider`**. Cần PO quyết: tạo primitive mới hay miễn trừ R18 |
| 4 thẻ tương tác tự dựng (`role="button"`/`role="radio"` ở Bộ máy, trung tâm mạng hoa, lịch đăng, trình phát video) | Có phần tử tương tác lồng bên trong (InfoTip, nhiều nút); đổi sang `Button` làm vỡ cấu trúc, cần thiết kế lại |
| 7 điều khiển R18 ở shell, `FeatureGuidanceCard`, tiêu đề Thẻ chào | UX khoá K1/K2/shell → Đợt 3 |
| Các nút chữ cao 15–20px (Tri thức 8, Công cụ 5, Vận hành 4) | Dùng `h-auto` ghi đè; cần xem từng chỗ có phải liên kết trong dòng chữ (được miễn theo WCAG) hay nút độc lập |
| Các cặp tương phản còn lại ở Kết nối nội bộ, Thư viện màn hình, catalog khách `/c/[slug]` | Ngoài Đợt 2 |

## 3. Cổng kiểm

Đã đạt: `typecheck`, `lint:ratchet` (57 lỗi cũ, không mới), `lint:ux -- --check` (28, không tăng), `check:screen-contracts`, `check:docs`, `check:layers`, `check:template-ssot`, `npm test` (chỉ còn 2 test `public-url` đỏ, đỏ cả khi bỏ thay đổi của tôi vì `.env` local đặt sẵn URL công khai). Một test K11 (tệp không dài thêm) báo đỏ lần đầu do `hoi-thoai/page.tsx` dài thêm 1 dòng; đã sửa.

**Chưa chạy:** `test:e2e:ux`, `test:tenant`, `test:platform` (cần DB `*_test`); chưa chụp lại toàn bộ kho ảnh sau Đợt 2, chỉ chụp `/don-hang`.

## 4. Phát hiện ngoài phạm vi (không sửa)

1. **Lỗi 500 khi khoá PII chưa nạp bộ nhớ.** Sau khi khởi động lại server dev, `GET /api/v1/orders`, `/orders/workbench`, `/greeting-card/orders` trả 500 ("Thiếu khoá dữ liệu để giải mã dữ liệu cá nhân") cho đến khi gọi một API khác (vd. `/crm/customers`). Khoá có trong bảng `tenant_data_keys`. Chưa biết có xảy ra ở production không. Đã tạo việc riêng cho tầng bảo mật dữ liệu.
2. Trang Dữ liệu nền tảng hiện số bản ghi âm ("-1", "-32 bản ghi").
3. Một tài khoản chỉ có một phiên: đăng nhập lại ở nơi khác (kể cả script kiểm thử) đá phiên đang mở ra. Đã gây nhầm lẫn khi chụp ảnh.

## 5. Cần PO quyết

1. Thanh trượt: tạo `Slider` chuẩn hay miễn trừ R18 cho 11 chỗ.
2. 4 thẻ tương tác tự dựng: thiết kế lại hay giữ có miễn trừ.
3. Danh sách nút chữ nhỏ cần xử lý (sau khi tôi phân loại).
