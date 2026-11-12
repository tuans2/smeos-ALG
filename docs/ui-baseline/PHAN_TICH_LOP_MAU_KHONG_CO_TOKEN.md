# Phân tích lớp màu dùng token không tồn tại (BẢN NHÁP, chỉ đọc)

Nhánh `claude/fervent-pascal-ilhcgb`, 11/11/2026. Chưa sửa mã. Phát hiện ở `BAO_CAO_VIEC_KHONG_KHOA.md` §4, phân tích chi tiết thêm tại đây.

## 1. Bằng chứng

- Quét mã: 15 tên màu được dùng trong lớp Tailwind (`bg-*`, `text-*`…) nhưng **không có** `--color-<tên>` trong `src/styles/tokens/*.css` hay `src/app/globals.css`. Tổng **341 lượt dùng**.
- Kiểm chứng bằng CSS đã biên dịch (`.next/dev/static`): có quy tắc cho `.bg-surface-alt`, `.bg-primary-muted`, `.bg-warning-bg` nhưng **không có quy tắc** cho `.bg-surface-muted`, `.bg-primary-subtle`, `.bg-surface-raised`, `.bg-warning-subtle`. Nghĩa là phần tử dùng các lớp này không có nền.
- Một hậu quả đã thấy: chip loại tổ chức ở Kết nối nội bộ (`bg-warning-subtle`) trong suốt, nên khi nằm trên hàng nền đỏ mận thì chữ tối đạt 1,31:1. Tôi đã sửa riêng chỗ này (4 lớp).
- Phạm vi kiểm chứng: chỉ kiểm CSS cho 7 lớp mẫu. Một số lớp có thể được thêm lúc chạy ở nơi khác; chưa kiểm từng chỗ.

## 2. Danh sách và gợi ý thay thế

| Tên không có token | Lượt | Tệp | Tiền tố | Thư mục dùng nhiều | Gợi ý token có sẵn | Ghi chú giá trị |
|---|---:|---:|---|---|---|---|
| `surface-muted` | 240 | 130 | bg×240 | components/greeting-card, components/profiles, components/products | `surface-alt` | #F5ECE4 trên nền trang #FBF6F2: thêm nền be nhạt |
| `primary-subtle` | 34 | 17 | bg×34 | app/(app), components/layout, components/internal-chat | `primary-muted` | #F5E6EA: thêm nền hồng nhạt |
| `surface-raised` | 16 | 11 | bg×16 | components/orders, components/chat, app/(app) | `surface` | #FFFFFF: thẻ nổi trên nền kem |
| `primary-bg` | 13 | 8 | bg×13 | components/catalog, components/crm | `primary-muted` | #F5E6EA |
| `surface-elevated` | 9 | 6 | bg×9 | components/marketing-center, components/crm, components/internal-chat | `surface` | #FFFFFF |
| `primary-hover` | 7 | 7 | bg×5, text×2 | app/(app), components/marketing-center, components/platform | `primary-dark` | #57202F (bg hover và 2 chỗ text) |
| `warning-subtle` | 5 | 5 | bg×5 | components/internal-chat, app/(app) | `warning-bg` | #FBF1E4 |
| `danger-dark` | 4 | 4 | bg×4 | components/greeting-card, components/coordinator, components/templates | `danger-text` | #7A2420 (nền tối đậm) |
| `success-dark` | 4 | 3 | bg×3, text×1 | app/(app), components/creative-studio, components/products | `success-text` | #3A4A2C |
| `success-subtle` | 4 | 4 | bg×4 | components/internal-chat, app/(app) | `success-bg` | #EAF0E6 |
| `surface-dark` | 1 | 1 | bg×1 | components/catalog | `(cần xem)` | dùng cho phong cách "Dark Cinematic" của catalog, có thể là dữ liệu phong cách |
| `secondary-foreground` | 1 | 1 | text×1 | components/knowledge-base | `(cần xem)` | chữ trên nền secondary; chưa rõ |
| `surface-subtle` | 1 | 1 | bg×1 | components/greeting-card | `surface-alt` | #F5ECE4 |
| `danger-subtle` | 1 | 1 | bg×1 | app/(app) | `danger-bg` | #FBEBE9 |
| `secondary-bg` | 1 | 1 | bg×1 | app/(app) | `(cần xem)` | chưa rõ ý định |

## 3. Phương án xử lý

| Phương án | Làm gì | Hình ảnh thay đổi | Cần PO | Công sức |
|---|---|---|---|---|
| A. Thêm token bí danh | Thêm `--color-surface-muted: var(--color-surface-alt)`… vào `color.css` | **Thêm nền** cho ~340 chỗ đang trong suốt | Có (README Design System §3: thêm token cần PO duyệt) | Nhỏ về mã, rộng về ảnh hưởng |
| B. Đổi tên lớp theo gợi ý | Codemod 341 chỗ sang token sẵn có | Như A | Không thêm token nên không cần duyệt token, nhưng đổi diện mạo nên nên có PO xem mẫu | Vừa (chạy codemod, chụp lại 130 tệp liên quan) |
| C. Xoá các lớp vô hiệu | Bỏ khỏi mã | **Không đổi** (giữ đúng diện mạo hiện tại) | Không | Vừa; mất ý định thiết kế ban đầu |
| D. Chặn phát sinh mới | Thêm luật lint (ratchet) báo lớp màu không có token, đặt baseline 341 | Không đổi | Không (luật lint không phải token) | Nhỏ |

**Đề xuất:** làm D ngay (không đổi gì, ngăn tình trạng tồi hơn); trước khi chọn A/B/C, áp thử gợi ý lên 5 màn tiêu biểu trên nhánh tạm và chụp ảnh trước/sau cho PO xem. Lý do: `surface-muted` chiếm 70% (240/341) và đa số là `bg` trên nền kem; đổi sang `surface-alt` sẽ làm nhiều thẻ, ô nhập, chip có nền be rõ rệt mà hiện chưa có.

## 4. Rủi ro khi sửa hàng loạt
- Một số chỗ có thể **vô tình cần trong suốt** (ví dụ đặt trên nền đã có màu); tự động đổi có thể làm tối/đục thêm.
- `surface-dark` nằm trong dữ liệu phong cách catalog; `secondary-foreground`, `secondary-bg` chưa rõ ý định; cần người chủ module xác nhận.
- Tương phản: nền mới có thể làm đổi tỉ lệ tương phản của chữ đặt trên đó; phải chạy lại axe sau khi đổi.

