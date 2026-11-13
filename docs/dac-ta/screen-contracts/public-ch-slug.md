---
id: SCR-PUB-ch-slug
tier: PUBLIC
module: profiles
route: /ch/[slug]
archetype: B
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Hoàn toàn KHÔNG dùng dữ liệu giả demo (§2 OPERATING_PRINCIPLES)
  - Hồ sơ công khai cửa hàng: địa chỉ, số điện thoại, mạng xã hội, giờ mở cửa
  - Tự động ghi nhận lượt xem trang (recordStoreProfileView)
  - Xử lý trạng thái REVOKED (Cửa hàng đã ngừng chia sẻ trang này)
  - Đầy đủ 6 trạng thái UI và chuẩn WCAG 2.2 AA
---

# Screen Contract — Hồ Sơ Cửa Hàng Chia Sẻ Công Khai

**Mã màn:** `SCR-PUB-ch-slug` · **Tuyến:** `/ch/[slug]` · **Tầng:** `PUBLIC` · **Bố cục (Archetype):** `B` (Danh mục hồ sơ)

## 1. Vai & Mục đích
- **Vai chính (03b):** Đối tác, khách hàng và cộng đồng quan tâm đến tiệm (`customer` / `guest`).
- **Phạm vi dữ liệu:** Hồ sơ thông tin công khai của cửa hàng (`profile`).
- **Mục tiêu chính:** Cung cấp danh thiếp điện tử đa năng, địa chỉ bản đồ, kênh liên lạc chính thức.
- **Câu hỏi cốt lõi:** "Cửa hàng này ở đâu, liên hệ hotline nào và hoạt động ra sao?"
- **Mật độ thông tin (Density):** `comfortable`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** Logo tiệm, tên thương hiệu, khẩu hiệu kinh doanh.
- **Vùng làm việc:** `PublicStoreProfileView` tích hợp bản đồ, nút gọi nhanh, liên kết mạng xã hội.
- **Khối chức năng chính:**
  1. L0 (Thiết yếu): Tên cửa hàng, hotline, địa chỉ thực tế và trạng thái mở cửa.
  2. L1 (Hành động): Nút "Gọi điện ngay", "Chỉ đường", "Nhắn tin Zalo/Messenger".
  3. L2 (Bổ trợ): Chat tư vấn trực tiếp (`PublicChatSlot`), danh mục sản phẩm tiêu biểu.

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** Nút "Gọi hotline" hoặc "Chỉ đường đến tiệm".
- **Hành động phụ (Secondary):** "Ghé thăm gian hàng", "Lưu danh thiếp".

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** Skeleton card hồ sơ với avatar tròn và các dòng thông tin.
2. **Rỗng (Empty):** Cửa hàng chưa hoàn thiện phần giới thiệu chi tiết.
3. **Lỗi (Error):** Lỗi tải dữ liệu hồ sơ từ máy chủ.
4. **Thu hồi / Đóng chia sẻ (REVOKED):** Màn hình thông báo "Cửa hàng đã ngừng chia sẻ trang này" kèm lời giải thích lịch sự.
5. **Dữ liệu một phần (Partial):** Hiển thị số điện thoại và tên trước khi tải bản đồ.
6. **Thành công (Success):** Hồ sơ hiển thị hoàn chỉnh, tương tác 1 chạm để gọi hoặc nhắn tin.

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- Nút bấm to rõ, dễ chạm bằng một tay trên điện thoại di động.
- Văn bản tương phản cao, hỗ trợ chế độ đọc trợ năng.
