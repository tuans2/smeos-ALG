---
id: SCR-STORE-bao-cao
tier: STORE
module: reporting
route: /bao-cao
archetype: A
snapshots:
  mobile: 390x844
  desktop: 1280x800
acceptance:
  - Chọn khoảng ngày và cách nhóm (ngày, tuần, tháng) rồi xem năm báo cáo theo kỳ
  - Số liệu tính phía máy chủ, theo phạm vi chi nhánh của người xem
  - Không có quyền R20 thì hiện thông báo thiếu quyền, không gọi API
---

# Screen Contract — Báo cáo theo kỳ

> **Trạng thái production (12/11/2026, audit L-03):** tuyến thuộc tiền tố khoá `/bao-cao` trong `LOCKED_ROUTE_PREFIXES` (`src/lib/feature-lock.ts`). `src/app/(app)/bao-cao/layout.tsx` bọc `FeatureLockedGuard`, nên khi `NEXT_PUBLIC_APP_ENV=production` cả URL gõ thẳng cũng hiện màn "Sắp ra mắt" (trước đây chỉ làm mờ mục sidebar). Bản giao GD1 không đặt biến này nên không bị khoá.

**Tuyến:** `/bao-cao` · **Tệp chính:** `src/app/(app)/bao-cao/page.tsx`, `src/components/reporting/*` · **Cập nhật:** 05/11/2026

## 1. Vai và mục đích
- Vai chính: Điều hành, Kế toán (năng lực `R20`).
- Phạm vi: tổ chức; người bị giới hạn chi nhánh chỉ thấy số liệu chi nhánh mình (9.13).
- Việc chính: xem đơn hàng, doanh thu, sản phẩm, hiệu suất nhân sự và dòng tiền trong một khoảng thời gian.
- Câu hỏi chính: "Tháng này bán được bao nhiêu, thu về bao nhiêu, mẫu nào chạy, ai làm tốt, tiền về ngân hàng đã khớp sổ chưa?"
- Mật độ: MEDIUM.

## Điều hướng

Mục menu "Báo cáo theo kỳ" (Quản trị tiệm; chuỗi: Báo cáo & tài chính), quyền `R20`. Tuyến nằm trong danh sách khoá production (`src/lib/feature-lock.ts`) tới khi PO mở.

## 2. API
- `GET /api/v1/reports/orders` · `revenue` (`?detail=orders`) · `products` · `performance` · `cashflow` — cùng tham số `from`, `to`, `granularity`; cần `R20`.

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí |
|---|---|---|
| L0 | Tiêu đề "Báo cáo theo kỳ", ô Từ ngày, Đến ngày, nút Ngày/Tuần/Tháng, nút "Xem báo cáo" | Đỉnh trang |
| L1 | Thanh tab: Đơn hàng, Doanh thu, Sản phẩm, Hiệu suất, Dòng tiền | Dưới bộ chọn kỳ |
| L2 | Ô số liệu tổng (StatTile) và bảng theo kỳ của tab đang mở | Khung nội dung |
| L3 | Doanh thu: bấm một kỳ mở danh sách đơn của kỳ đó; Dòng tiền: danh sách giao dịch ngân hàng chưa khớp | Dưới bảng |

## 4. Hành động
- Chính (1): "Xem báo cáo" (áp kỳ đã chọn; tắt khi từ ngày > đến ngày).
- Phụ: chọn cách nhóm, chuyển tab, bấm dòng kỳ ở tab Doanh thu.

## 5. Trạng thái
- Tải: `SkeletonBlock` mỗi tab. Lỗi: `InlineError` với thông điệp máy chủ (kỳ sai, thiếu quyền). Rỗng: dòng "Chưa có dữ liệu trong kỳ." trong bảng. Không quyền: `EmptyState` "Bạn chưa có quyền xem báo cáo".

## 6. Responsive và trợ năng
- 390px: bộ chọn kỳ và tab xuống dòng; ô số liệu 2 cột; bảng cuộn trong khung.
- Bảng có `<caption>`, `<th scope="col">`, `<th scope="row">`; tab có `role="tab"`, `aria-selected`.

## 7. Dữ liệu và quyền
- Nguồn: `orders`, `order_events` (mốc đã giao), `order_coordinations` (giờ hẹn, shipper), `order_payments` (đã xác nhận), `order_items` + `products.attributes` (màu, phong cách), `order_assignments`, `greeting_payment_events` (SePay).
- Quyền: `R20`. Trên production trang nằm trong nhóm khoá cùng `/so-lieu` (`src/lib/feature-lock.ts`).
