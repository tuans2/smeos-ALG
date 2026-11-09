---
id: SCR-STORE-tin-nhan
tier: STORE
module: internal-chat
route: /tin-nhan
archetype: B
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Mỗi cửa hàng đối tác / chi nhánh có một phòng trao đổi với chuỗi, vào theo tổ chức và mã S1
  - Thẻ đơn gia công phản chiếu trạng thái thật, mở Thẻ Gia Công để nhận và cập nhật đơn
  - Danh sách phòng theo tên bên kia, số chưa đọc, tìm kiếm; di động một cột
  - Đủ 6 trạng thái UI và chuẩn WCAG 2.2 AA
---

# Screen Contract — Trao đổi nội bộ & đơn gia công

**Mã màn:** `SCR-STORE-tin-nhan` · **Tuyến:** `/tin-nhan` · **Tầng:** `STORE` · **Bố cục (Archetype):** `B` (Hội thoại / Danh sách tin)
**Cập nhật:** 09/11/2026 theo `docs/plan/hoan-thien-chat-noi-bo.md` (GĐ1–GĐ9). Màn còn trong `LOCKED_ROUTE_PREFIXES` cho tới khi PO nghiệm thu (D8).

## 1. Vai & Mục đích
- **Vai chính:** Điều phối / Điều hành chuỗi; nhân viên cửa hàng đối tác (Cửa hàng, Thợ cắm); nhân viên chi nhánh.
- **Quyền:** `S1` để vào màn và nhắn tin; `S2` để có nút mở Thẻ Gia Công trên thẻ đơn.
- **Phạm vi dữ liệu:** phòng của tổ chức mình, và phòng chuỗi mà tổ chức mình là cửa hàng đối tác (liên kết ACTIVE; tạm dừng = chỉ đọc).
- **Mục tiêu chính:** Chuỗi giao đơn gia công cho cửa hàng đối tác theo khu vực; cửa hàng nhận đơn và cập nhật ảnh thành phẩm, giao hàng, ảnh bàn giao; hai bên trao đổi tự do.
- **Câu hỏi cốt lõi:** "Có đơn mới nào mời tôi nhận, hay tin mới nào từ chuỗi / cửa hàng không?"
- **Mật độ thông tin (Density):** `comfortable`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** `PageHeader` "Trao đổi nội bộ" kèm một câu mô tả.
- **Vùng làm việc:** máy tính hai cột (danh sách phòng | phòng đang mở); điện thoại một cột, nút quay lại danh sách.
- **Khối chức năng chính (Progressive Disclosure):**
  1. L0: Danh sách phòng — tên bên kia, tin cuối, số chưa đọc; thẻ đơn gia công với trạng thái (đang mời / đã nhận – còn hạn huỷ / đang làm / đã có nơi nhận / hết hạn / đã giao / đã huỷ).
  2. L1: Nút trên thẻ ("Xem và nhận đơn", "Chốt làm hoặc huỷ nhận", "Gửi ảnh thành phẩm", "Nhập thông tin giao hàng", "Gửi ảnh bàn giao") mở Thẻ Gia Công; ô soạn tin.
  3. L2: Tiến độ 3 bước trên thẻ, hạn nhận / hạn huỷ nhận; tin hệ thống (nhắc hạn, chốt làm).

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** "Gửi" (Enter gửi, Shift+Enter xuống dòng).
- **Hành động phụ (Secondary):** Tìm phòng; nút trên thẻ đơn gia công (chỉ người của đúng cửa hàng được mời, có `S2`).
- **Lối vào:** nút "Nhắn tin" ở `/dieu-phoi/doi-tac` và `/noi-bo/ket-noi` mở thẳng phòng (`?doi-tac=` / `?chuoi=` / `?chi-nhanh=`); thông báo mở `?phong=` hoặc `?chuoi=`; số chưa đọc cạnh mục menu.

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** `SkeletonBlock` cho danh sách và cho tin.
2. **Rỗng (Empty):** "Chưa có phòng trao đổi" (hướng dẫn bấm "Nhắn tin") · "Chưa có tin nhắn" · "Chọn một phòng để bắt đầu"; tìm không ra → `kind="filtered"`.
3. **Lỗi (Error):** `EmptyState kind="error"` kèm "Thử lại"; gửi tin lỗi → dòng báo dưới ô soạn (`role="alert"`).
4. **Không có quyền (Forbidden):** danh sách 403 → nhờ Điều hành cấp quyền; phòng 404 → "không còn quyền xem phòng này".
5. **Mất mạng (Offline):** dải cảnh báo `role="status"`; giữ tin đã tải, gửi lỗi báo "Mất kết nối".
6. **Thành công (Success):** tin vừa gửi hiện ngay, cuộn xuống cuối; hỏi lại 5 giây/lần khi tab đang hiển thị.

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- Vùng tin `aria-live="polite"`; ô soạn có nhãn ẩn; số chưa đọc có `aria-label`; tiến độ bước đọc được "đã xong / chưa xong".
- Điện thoại (390 px): một cột, nút quay lại có nhãn; chạm được bằng một tay.
