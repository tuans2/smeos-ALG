---
id: SCR-STORE-tich-hop
tier: STORE
module: integrations
route: /tich-hop
archetype: F
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Trung tâm Tích hợp kênh bán hàng & cổng thanh toán (IntegrationsHubClient)
  - Chung cho Cửa hàng, Chuỗi, Ngành; kiểm soát quyền năng lực W1
  - Quản lý trạng thái kết nối các kênh: Zalo OA, Telegram Bot, Webhook, Thanh toán QR
  - Đầy đủ 6 trạng thái UI và chuẩn WCAG 2.2 AA
---

# Screen Contract — Trung Tâm Tích Hợp Kênh & Dịch Vụ Ngoài

**Mã màn:** `SCR-STORE-tich-hop` · **Tuyến:** `/tich-hop` · **Tầng:** `STORE` · **Bố cục (Archetype):** `F` (Cài đặt tích hợp)

## 1. Vai & Mục đích
- **Vai chính (03b):** `owner` / `store_manager`.
- **Phạm vi dữ liệu:** `organization` (Cấu hình tích hợp bên thứ ba).
- **Mục tiêu chính:** Kết nối hệ thống với Zalo Official Account, bot Telegram thông báo, tài khoản thanh toán VietQR / ngân hàng và sàn TMĐT.
- **Câu hỏi cốt lõi:** "Tiệm đã kết nối Zalo, Telegram và cổng thanh toán tự động chưa?"
- **Mật độ thông tin (Density):** `comfortable`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** `PageHeader` tiêu đề "Trung Tâm Tích Hợp", phân nhóm theo loại dịch vụ.
- **Vùng làm việc:** `IntegrationsHubClient` hiển thị các thẻ dịch vụ đối tác.
- **Khối chức năng chính:**
  1. L0 (Thiết yếu): Trạng thái kết nối của từng kênh (Đã kết nối / Chưa kết nối).
  2. L1 (Hành động): Nút "Kết nối", "Ngắt kết nối", "Kiểm tra kết nối".
  3. L2 (Bổ trợ): Cài đặt nâng cao Webhook, tài liệu API hướng dẫn.

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** Nút "Kết nối kênh mới".
- **Hành động phụ (Secondary):** "Kiểm tra tình trạng bot", "Xem lịch sử webhook".

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** Skeleton danh sách các kênh tích hợp.
2. **Rỗng (Empty):** Khi chưa bật cấu hình kênh nào.
3. **Lỗi (Error):** Báo lỗi khi kiểm tra kết nối thất bại (sai API key / token hết hạn).
4. **Không có quyền (Forbidden):** Yêu cầu quyền năng lực `W1`.
5. **Dữ liệu một phần (Partial):** Báo trạng thái cảnh báo nếu có kênh mất tín hiệu webhook.
6. **Thành công (Success):** Danh sách kênh hoạt động ổn định, chỉ báo màu xanh rõ ràng.

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- Bảo mật tuyệt đối: không để lộ secret token trên giao diện người dùng.
- Tuân thủ chuẩn WCAG 2.2 AA.
