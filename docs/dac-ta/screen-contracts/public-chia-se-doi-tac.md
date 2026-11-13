---
id: SCR-PUB-chia-se-doi-tac
tier: PUBLIC
module: coordinator
route: /chia-se/cho-doi-tac/[token]
archetype: C
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Hoàn toàn KHÔNG dùng dữ liệu giả demo (§2 OPERATING_PRINCIPLES)
  - Xem thông tin chợ điều phối / đơn chế tác qua token ký số an toàn
  - Không yêu cầu đăng nhập, ẩn hoàn toàn thanh điều hướng nội bộ
  - Bảo mật thông tin khách hàng nhạy cảm (PII), chỉ hiện dữ liệu chế tác cần thiết
  - Đầy đủ 6 trạng thái UI và chuẩn WCAG 2.2 AA
---

# Screen Contract — Chia Sẻ Đơn Chế Tác Cho Đối Tác Xưởng Ngoài

**Mã màn:** `SCR-PUB-chia-se-doi-tac` · **Tuyến:** `/chia-se/cho-doi-tac/[token]` · **Tầng:** `PUBLIC` · **Bố cục (Archetype):** `C` (Chi tiết chế tác)

## 1. Vai & Mục đích
- **Vai chính (03b):** Đối tác thợ cắm / xưởng gia công ngoài (`partner`).
- **Phạm vi dữ liệu:** Chi tiết đơn hàng và công thức chế tác được uỷ quyền qua chữ ký token.
- **Mục tiêu chính:** Đối tác xưởng ngoài mở link trực tiếp trên Zalo/Telegram để xem công thức, giá công và xác nhận nhận đơn.
- **Câu hỏi cốt lõi:** "Đơn hàng này yêu cầu chế tác mẫu nào, nguyên liệu gì và tiền công bao nhiêu?"
- **Mật độ thông tin (Density):** `comfortable`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** Tiêu đề phiếu chế tác đối tác, mã đơn rút gọn và thời hạn giao.
- **Vùng làm việc:** `SharedMarketplaceView` tối ưu cho màn hình di động của thợ chế tác.
- **Khối chức năng chính:**
  1. L0 (Thiết yếu): Ảnh mẫu sản phẩm chuẩn, danh mục nguyên vật liệu định lượng (BOM).
  2. L1 (Hành động): Nút "Nhận đơn gia công" hoặc "Từ chối / Báo bận".
  3. L2 (Bổ trợ): Ghi chú kỹ thuật, hướng dẫn bảo quản và yêu cầu QC.

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** Nút "Nhận gia công đơn này".
- **Hành động phụ (Secondary):** "Báo bận / Không thể nhận", "Tải ảnh mẫu".

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** Skeleton phiếu chế tác với khung ảnh và bảng vật liệu.
2. **Rỗng (Empty):** Đơn hàng không còn hiệu lực hoặc đã được đối tác khác nhận trước.
3. **Lỗi token (Error / Invalid Token):** Thông báo link ký đã hết hạn hoặc không hợp lệ.
4. **Không có quyền (Forbidden):** Token đã bị thu hồi bởi điều phối viên.
5. **Dữ liệu một phần (Partial):** Cho phép xem thông tin cốt lõi khi ảnh mẫu chưa tải xong.
6. **Thành công (Success):** Toàn bộ phiếu chế tác hiển thị sắc nét, thao tác nhận đơn tức thì.

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- Giao diện thân thiện với thợ thao tác tại xưởng (chữ to rõ, nút bấm bản rộng).
- Hỗ trợ xem rõ ràng dưới điều kiện ánh sáng mạnh trong xưởng chế tác.
