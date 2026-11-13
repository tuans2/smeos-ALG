# Screen Contract — Trang chủ Bán hàng (SalesWorkspace)

**Tuyến:** `/` · **Tệp chính:** `src/components/dashboard/sales-workspace.tsx` · **Cập nhật:** 26/09/2026 · **Thẻ:** T5.A2

## 1. Vai và mục đích
- **Vai chính (03b):** `sales` (Nhân viên bán hàng & chăm sóc khách hàng).
- **Phạm vi:** organization (đơn hàng và khách hàng được phân công hoặc toàn tiệm).
- **Việc chính:** Bắt đầu ngày làm việc với khách cần chăm sóc (dịp kỷ niệm sắp tới) và đơn hàng nháp đang chờ xử lý; truy cập nhanh tạo đơn, thêm khách, tra giá.
- **Câu hỏi chính:** "Hôm nay tôi cần liên hệ khách nào và có đơn nháp nào cần chốt?"
- **Mật độ:** MEDIUM (2 khối P0 song song trên desktop 1280px).

## 2. Hiện trạng (audit)
- **API gọi:**
  - `GET /api/v1/crm/reminders/upcoming?days=14` → `Q1` (`crm.read`)
  - `GET /api/v1/orders?status=DRAFT&limit=5` → `R1` (`order.read`)
- **Khối:** 1 thanh tác vụ chính (Tạo đơn `R2`, Thêm khách `Q2`, Tra giá `L1`) + 2 khối P0 chính (Khách cần liên hệ, Đơn nháp đang mở).
- **Trạng thái:** Tải (`SkeletonBlock`), rỗng (`EmptyState`), lỗi (`InlineError`).

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Nhóm tác vụ chính (Tạo đơn, Thêm khách, Tra giá) | Đỉnh phần nội dung chính |
| L1 Hành động | P0 Khách cần liên hệ (tối đa 6 khách trong 14 ngày tới) | Cột trái (1280px) hoặc trên cùng (mobile) |
| L1 Hành động | P0 Đơn nháp đang mở (tối đa 5 đơn nháp kèm mã & tổng tiền) | Cột phải (1280px) hoặc dưới (mobile) |
| L3 Chi tiết | Xem chi tiết khách hàng tại `/khach-hang`, đơn hàng tại `/don-hang` | Chuyển trang qua `router.push` |

## 4. Hành động
- **Chính:** 1 nút chính (`Tạo đơn` - `R2`, `size="sm"`).
- **Phụ:** 2 nút phụ hiển thị trực tiếp (`Thêm khách` - `Q2`, `Tra giá` - `L1`). Tuân thủ nghiêm ngặt 03a UX-010/011.
- **Tương tác dòng:**
  - Nhấp vào khách cần liên hệ → chuyển trang `/khach-hang`.
  - Nhấp vào đơn nháp → chuyển trang `/don-hang`.

## 5. Content budget
- Nút nổi: 0.
- Khối chính: 2 khối P0 (Khách cần liên hệ, Đơn nháp) ≤ 5 khối.

## 6. Trạng thái
- Tải: `SkeletonBlock` dạng thanh shimmer mềm cho cả 2 khối.
- Rỗng:
  - Khách: `EmptyState` "Không có khách nào sắp tới dịp kỷ niệm trong 14 ngày tới."
  - Đơn nháp: `EmptyState` "Không có đơn nháp nào đang mở."
- Lỗi: `InlineError` hiển thị thông báo thân thiện kèm nút "Thử lại".
- 403: Không có quyền đọc khối nào thì ẩn khối đó, không hiện số 0 giả. Nếu cả 2 đều 403, hiện thông báo hướng dẫn liên hệ quản lý.

## 7. Responsive
- **390px (Mobile):** Xếp dọc 1 cột, các nút và dòng danh sách đều đạt `min-h-11` (≥ 44px) hỗ trợ ngón cái.
- **768px (Tablet):** Bố cục 1 cột thoáng đãng.
- **1280px (Desktop):** Lưới 2 cột cân xứng (grid-cols-2), hiển thị đồng thời cả khách cần chăm sóc và đơn nháp.

## 8. Trợ năng
- Danh sách phần tử sử dụng thẻ `<button type="button">` kèm `focus-visible:outline-2 focus-visible:outline-primary` và `min-h-11`.
- Các biểu tượng trang trí có `aria-hidden="true"`.
- Cấu trúc tiêu đề ngữ nghĩa chuẩn: `h1` (tên tiệm), `h2` (Khách cần liên hệ, Đơn nháp đang mở).

## 9. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai | PASS | Chuẩn xác cho `sales` |
| Việc | PASS | Khách cần chăm sóc + đơn nháp cần chốt |
| IA | PASS | Khung P0 2 cột chuẩn mực |
| Mật độ | PASS | 2 khối P0 chính, không quá tải |
| Thứ bậc | PASS | Tác vụ nhanh -> Danh sách công việc |
| CTA | PASS | 1 chính (Tạo đơn) + 2 phụ (Thêm khách, Tra giá) |
| Luồng | PASS | Nhảy trực tiếp vào các tuyến con |
| Trạng thái | PASS | Đủ tải / rỗng / lỗi / 403 ẩn |
| Responsive | PASS | 1280px chia 2 cột đều |
| Trợ năng | PASS | Đạt chuẩn touch target ≥ 44px, focus visible |
| Dữ liệu | PASS | Dữ liệu CRM và Đơn hàng thật qua API |
| Quyền | PASS | Gating theo R2, Q2, L1, Q1, R1 |
| Nhất quán | PASS | Dùng 100% token Semantic và font token |
