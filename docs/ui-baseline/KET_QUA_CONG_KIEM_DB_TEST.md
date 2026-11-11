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
| `test:e2e:ux` (server production trên `smeos_test`, có `ALLOW_LOCAL_STORAGE=true`) | Tất cả đạt trừ 1 spec ảnh chụp (`/khach-hang`, lệch 0,08%, phải chụp ảnh mẫu trên CI) |

### `test:tenant` — 5 tệp đỏ
Chạy lại riêng trên mã **trước mọi thay đổi của tôi** (`c3055bf4`): 4 tệp đỏ y hệt, nên là lỗi có sẵn trong môi trường này.
- `append-only-logs`, `chain-dispatch-sweep-grace`: lỗi Prisma (chưa tìm nguyên nhân).
- `one-image-kit`, `product-copies`: luồng sinh nội dung bằng AI trả 500/FAILED (local không có khoá AI).
- `retry-recharge-credit`: đỏ một lần khi chạy song song, **đạt 3/3** khi chạy lại riêng: chập chờn do tranh chấp DB.

### `test:e2e:ux`
Lần chạy đầu: 28 đạt, 5 đỏ. **Đính chính:** lúc đầu tôi gán 4 lỗi là "có sẵn" vì cũng đỏ trên mã gốc, nhưng thực ra cả mã gốc lẫn nhánh này đều chạy thiếu biến `ALLOW_LOCAL_STORAGE=true` mà CI đặt (`.github/workflows/ci.yml`). Máy chủ production không có kho tệp nên trang catalog công khai và vài luồng sập vào trang lỗi toàn cục. Chạy lại với cấu hình đúng:

| Test | Lần đầu | Với `ALLOW_LOCAL_STORAGE=true` | Ghi chú |
|---|---|---|---|
| `role-homepage` (Điều hành) | đỏ | **đạt** | Do tôi: test đòi tiêu đề cấp 3 sau khi tôi đổi sang cấp 2; đã sửa test |
| `a11y-done-tools` | đỏ (`color-contrast`) | **đạt** (11/11) | Đỏ do trang lỗi toàn cục; sửa thêm `text-danger` → `text-danger-text` trên trang đó |
| `a11y-journeys` | đỏ (`document-title`) | **đạt** | Đỏ do trang lỗi toàn cục không có `<title>`; đã thêm `<title>` vào `global-error.tsx` |
| `internal-chat-journey` | đỏ | **đạt** | Đỏ do thiếu cấu hình kho tệp |
| `visual-journeys` (`/khach-hang`, 390px) | đỏ | **vẫn đỏ** (lệch 0,08%) | Ảnh mẫu `*-linux.png` phải chụp trên runner CI (phông tải từ Google lúc chạy); không sửa được ở đây |

Sửa thêm trong mã sản phẩm: `src/app/global-error.tsx` tự khai `<title>` (layout gốc bị thay nên metadata không áp dụng, WCAG 2.4.2) và dùng `text-danger-text`; có test `src/app/global-error.test.tsx`.

Hệ quả cho nhóm `test:tenant`: bốn tệp đỏ ở trên cũng chưa chạy với `ALLOW_LOCAL_STORAGE=true`; chưa chạy lại.

## 3. Còn lại
- Chưa chạy lại toàn bộ E2E sau khi sửa test `role-homepage` (chỉ chạy riêng spec đó); các spec còn lại không bị ảnh hưởng bởi thay đổi này.
- Ảnh mẫu `*-linux.png` của visual spec không được cập nhật (theo ghi chú trong CI, ảnh mẫu phải chụp trên runner CI).
