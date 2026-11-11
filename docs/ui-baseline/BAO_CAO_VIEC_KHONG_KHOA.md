# Báo cáo các việc không khoá còn tồn (BẢN NHÁP)

Nhánh `claude/fervent-pascal-ilhcgb`, 11/11/2026. Làm các việc nêu ở `DE_XUAT_DOT3_CHO_PO.md` mục cuối, không đụng UX khoá.

## 1. Đã làm và đo lại (axe, 1280 và 390px)

| Việc | Trước → sau (số node, cả 2 khổ) | Cách sửa |
|---|---|---|
| Thứ tự tiêu đề (`heading-order`) | 26 → 0 trên 18 màn đo | Mục đầu trang nhảy từ h1 xuống h3/h4 đổi thành h2 ở 13 tệp; tiêu đề thẻ sản phẩm catalog công khai thành h2 |
| Banner trùng + landmark trùng (`/g`, `/s`, `/bst`) | 6 → 0 và 6 → 0 | Đầu bộ lật thẻ ("Hoa sinh nhật 1 / 4") không phải banner trang: đổi `<header>` thành `<div>`; khối ngoài cùng là `<main>` khi không nhúng xem trước |
| Tương phản (`color-contrast`) | 17 → 0 (ngoài một lỗi tạm thời, mục 3) | Chip loại tổ chức ở Kết nối nội bộ (1,31:1) dùng token có thật; chip bộ lọc Thư viện màn hình `bg-black/20` (4,21:1); bỏ `opacity-85` khỏi mô tả thẻ catalog (3,59:1) |
| Vùng nội dung (`region`) | 5 → 0 trên `/g`, `/s`, `/bst`, `/c` | Hero catalog có nhãn, thanh tìm kiếm `role="search"`, thanh thao tác nhanh là `<nav>` có nhãn |
| Nhãn truy cập nút thông tin cửa hàng | 3 → 0 | `ShopLogo` vẽ chữ cái đầu bằng `::before` nên chữ nhìn thấy khớp tên truy cập |
| Mã/tiếng Anh ở `/dieu-phoi` | — | "BRIEF (T02)" → "TÓM TẮT ĐƠN"; "MANTRA CỐT LÕI" → "NGUYÊN TẮC CỐT LÕI" |

Một sai sót của tôi trong lúc làm, đã sửa: đổi `<header>` sang `<div>` làm `region` tăng 5 → 11 (nội dung tiêu đề rơi ngoài landmark); sửa bằng cách thêm `<main>` rồi đo lại.

Test mới: `src/components/greeting-card/customer/__tests__/shop-logo.test.tsx`.

## 2. Cổng kiểm đã đạt

`typecheck`, `lint:ratchet` (không lỗi mới), `lint:ux -- --check` (28, không tăng), `check:screen-contracts`, `check:docs`, `check:layers`, `check:template-ssot`, `npm test` (chỉ 2 test `public-url` đỏ như trước, do `.env` local). Chưa chạy `test:e2e:ux`, `test:tenant`, `test:platform` (cần DB `*_test`).

## 3. Chưa làm / ghi nhận

- Lỗi `color-contrast` ở `/dieu-phoi` trong lần đo cuối là **trạng thái lỗi tạm thời** ("Lỗi tải đơn điều phối") do khoá giải mã dữ liệu cá nhân chưa nạp sau khi khởi động lại server; việc điều tra đã tạo riêng.
- "(T01)…(T06)" trong tiêu đề các bước điều phối (`modules/coordinator/contracts/step-*.ts`) vẫn hiện trên giao diện. Chúng nằm trong hợp đồng sinh JSON schema; đổi tiêu đề phải sinh lại schema (`check:schemas:coordinator`), nên chưa làm.
- Nút chữ cao 15–20px và 11 thanh trượt: vẫn chờ quyết định (xem `BAO_CAO_DOT2.md`).
- 11 màn Điều hành/Console có lỗi đo được trước đây nhưng chưa nằm trong danh sách này (button-name/label đã sửa ở Đợt 2).

## 4. Phát hiện mới: lớp màu dùng token không tồn tại

So danh sách lớp `bg-/text-/border-<màu>` dùng trong mã với token định nghĩa ở `src/styles/tokens/` và `globals.css` (81 token) cho thấy nhiều tên **không có token**, nên Tailwind không sinh quy tắc và phần tử **không có nền**:

| Tên không có token | Số lần dùng | Số tệp |
|---|---:|---:|
| `surface-muted` | 242 | 130 |
| `primary-subtle` | 36 | 17 |
| `surface-raised` | 16 | 11 |
| `primary-bg` | 13 | 8 |
| `surface-elevated` | 9 | 6 |
| `primary-hover` | 7 | 7 |
| `warning-subtle`, `danger-dark`, `success-dark`, `success-subtle`… | 1–6 mỗi tên | ≤ 6 |

Hệ quả: chip, thẻ, ô tô nền bằng các lớp này đang trong suốt; trên nền sáng trông vẫn ổn, trên nền tối thì chữ mất nền (chính là lỗi 1,31:1 ở Kết nối nội bộ). Tôi **chỉ sửa 4 chỗ đang gây lỗi** (Kết nối nội bộ). Sửa toàn bộ là quyết định thiết kế: đổi sang token có thật sẽ **thêm nền** cho hàng trăm chỗ (thay đổi diện mạo), hoặc thêm token mới (cần PO duyệt, `README` Design System §3). Số liệu đo bằng regex trên mã, chưa kiểm từng chỗ; có thể có token khai báo ở nơi tôi chưa quét.

## 5. Cần PO quyết

1. Xử lý lớp màu dùng token không tồn tại: đổi sang token sẵn có (`surface-alt`, `primary-muted`…) hay thêm token mới.
2. Có chuyển "(T0x)" ra khỏi tiêu đề hợp đồng điều phối (sinh lại schema) hay chỉ cắt ở lớp hiển thị.
