# Screen Contract: In phiếu xưởng A6 và băng rôn

| Thuộc tính | Giá trị |
|---|---|
| Đường dẫn | `/in-phieu/[id]` (`?loai=bang-ron` cho băng rôn) |
| Component | `src/app/in-phieu/[id]/page.tsx`, `FloristTicketA6`, `RibbonBannerPrint` (`src/components/orders/print/`) |
| Vai chính | Điều hành, Điều phối (người có `R7`) |

## 1. Mục đích

Bản in sạch ngoài khung ứng dụng (checklist ALG 4.9):
- Phiếu xưởng khổ A6 (`@page size: A6`): mã đơn, giờ giao, người nhận, ảnh mẫu, phiên bản và số cành, công thức có ô đánh dấu, lời thiệp, ghi chú xưởng. Không có giá.
- Băng rôn khổ A4 ngang: mỗi dòng lời chúc một dải chữ lớn.

## 2. Bố cục

Thanh thao tác (ẩn khi in): [In …] (chính) · [Xem băng rôn / Xem phiếu xưởng A6] (phụ). Bên dưới là nội dung in.

## 3. Nguồn dữ liệu

| API | Mục đích |
|---|---|
| `GET /api/v1/orders/:id/print` | Dữ liệu phiếu (`R7`); tổ chức/chi nhánh khác → 404 |

## 4. Hành vi

- Mở từ nút In trong chi tiết đơn (tab mới). 401 → báo đăng nhập; lỗi → thông báo.

## 5. Tuân thủ

- [x] Một nút chính; token ngữ nghĩa; thang chữ hệ thống; ≤ 350 dòng.
