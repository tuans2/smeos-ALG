# Kết quả các cổng cần DB `*_test` và build (BẢN NHÁP)

Nhánh `claude/fervent-pascal-ilhcgb`, 11/11/2026. Trước đây ghi "chưa chạy"; nay đã chạy. Mọi lệnh ghi dữ liệu chỉ chạy trên `smeos_test` (kiểm tên đuôi `_test` trước khi chạy).

## 1. Cách dựng (máy không có Docker)
Tạo database `smeos_test` trên Postgres local rồi `prisma migrate deploy` (155 bảng) và `npm run db:seed`. Không dùng `prisma db push --accept-data-loss` như `scripts/dung-db-test.sh` vì Prisma đòi người dùng đồng ý rõ ràng và tôi không tự tạo sự đồng ý đó; `migrate deploy` trên DB trống là đủ.

## 2. Kết quả

| Cổng | Kết quả |
|---|---|
| `test:platform` | **17/17 tệp, 55/55 test đạt** |
| `test:tenant` | 271/276 tệp đạt; 5 tệp có test đỏ (xem dưới) |
| `npm run build` | **Đạt** (biên dịch thành công, có `BUILD_ID`) |
| `test:e2e:ux` (server production trên `smeos_test`) | 28 đạt, 5 đỏ; sau khi sửa 1 lỗi của tôi: 29 đạt, 4 đỏ (xem dưới) |

### `test:tenant` — 5 tệp đỏ
Chạy lại riêng trên mã **trước mọi thay đổi của tôi** (`c3055bf4`): 4 tệp đỏ y hệt, nên là lỗi có sẵn trong môi trường này.
- `append-only-logs`, `chain-dispatch-sweep-grace`: lỗi Prisma (chưa tìm nguyên nhân).
- `one-image-kit`, `product-copies`: luồng sinh nội dung bằng AI trả 500/FAILED (local không có khoá AI).
- `retry-recharge-credit`: đỏ một lần khi chạy song song, **đạt 3/3** khi chạy lại riêng: chập chờn do tranh chấp DB.

### `test:e2e:ux` — 5 lỗi ban đầu
| Test | Nguyên nhân | Phân loại |
|---|---|---|
| `role-homepage` (Điều hành) | Đòi tiêu đề cấp 3 "Hồ sơ & Thương hiệu"; tôi đã đổi thẻ mục tiêu sang cấp 2 để sửa thứ tự tiêu đề | **Do tôi**; đã sửa test sang cấp 2 và đạt (3/3) |
| `a11y-done-tools` (`/tai-anh?tab=m01c`, 390px) | axe `color-contrast` | Có sẵn (đỏ y hệt trên mã gốc) |
| `a11y-journeys` (J01 catalog `/c/…`) | axe `document-title` (trang thiếu `<title>`) | Có sẵn |
| `internal-chat-journey` | không thấy "Đang mời nhận đơn" ở `/tin-nhan` | Có sẵn |
| `visual-journeys` (`/khach-hang`, 390px) | lệch ảnh mẫu 0,08% | Có sẵn |

Bốn lỗi có sẵn **chưa được xử lý** (ngoài phạm vi và chưa tìm nguyên nhân). Hai lỗi axe (`color-contrast` ở `/tai-anh`, `document-title` ở catalog công khai) là việc giao diện hợp lệ để sửa sau.

## 3. Còn lại
- Chưa chạy lại toàn bộ E2E sau khi sửa test `role-homepage` (chỉ chạy riêng spec đó); các spec còn lại không bị ảnh hưởng bởi thay đổi này.
- Ảnh mẫu `*-linux.png` của visual spec không được cập nhật (theo ghi chú trong CI, ảnh mẫu phải chụp trên runner CI).
