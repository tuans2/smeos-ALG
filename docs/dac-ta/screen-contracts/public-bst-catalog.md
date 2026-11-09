---
id: SCR-PUB-bst-catalog
tier: PUBLIC
module: greeting-card
route: /bst/[orgSlug]/[catalogCode]
archetype: B
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Hoàn toàn KHÔNG dùng dữ liệu giả demo (§2 OPERATING_PRINCIPLES)
  - Hiển thị danh mục sản phẩm công khai chuẩn xác theo mã tuyển tập
  - Liên hệ cửa hàng hiện rõ qua ShopContactBar
  - Xử lý link không tồn tại hoặc hết hạn qua LinkUnavailable
  - Đầy đủ 6 trạng thái UI và chuẩn WCAG 2.2 AA
---

# Screen Contract — Tuyển Tập Sản Phẩm Công Khai Theo Slug

**Mã màn:** `SCR-PUB-bst-catalog` · **Tuyến:** `/bst/[orgSlug]/[catalogCode]` · **Tầng:** `PUBLIC` · **Bố cục (Archetype):** `B` (Danh sách)

## 1. Vai & Mục đích
- **Vai chính (03b):** Khách hàng công khai (`customer` / `guest`).
- **Phạm vi dữ liệu:** Bộ sưu tập sản phẩm của cửa hàng (`orgSlug`) có mã (`catalogCode`).
- **Mục tiêu chính:** Khách duyệt xem album sản phẩm mẫu công khai của tiệm trên mạng xã hội hoặc link gửi trực tiếp.
- **Câu hỏi cốt lõi:** "Tiệm này có những mẫu sản phẩm nào đẹp, giá bao nhiêu?"
- **Mật độ thông tin (Density):** `spacious`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** `ShopContactBar` chứa hotline, địa chỉ, logo tiệm.
- **Vùng làm việc:** `BrochurePublicView` dạng lưới thẻ sản phẩm trực quan, ảnh chất lượng cao.
- **Khối chức năng chính:**
  1. L0 (Thiết yếu): Tên bộ sưu tập, mô tả và lưới mẫu sản phẩm.
  2. L1 (Hành động): Nút chọn mẫu hoặc yêu cầu tư vấn theo mẫu.
  3. L2 (Bổ trợ): Hộp chat công khai (`PublicChatSlot`) hỗ trợ khách đặt câu hỏi tức thì.

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** Nút "Chọn mẫu này" hoặc "Liên hệ đặt hàng".
- **Hành động phụ (Secondary):** "Gọi hotline", "Chat với tiệm".

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** Skeleton lưới sản phẩm với tỷ lệ ảnh chuẩn.
2. **Rỗng (Empty):** Thông báo bộ sưu tập đang được cập nhật thêm mẫu mới.
3. **Lỗi / Không tìm thấy (Error / Not Found):** `LinkUnavailable` gợi ý liên hệ cửa hàng thay vì trang 404 kỹ thuật trơ trụi.
4. **Không có quyền (Forbidden):** Bộ sưu tập đã đóng / riêng tư → hướng dẫn liên hệ tiệm.
5. **Dữ liệu một phần (Partial):** Tải trước ảnh thu nhỏ khi mạng yếu.
6. **Thành công (Success):** Lưới sản phẩm tải mượt mà kèm giá niêm yết rõ ràng.

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- Hỗ trợ cuộn mượt và lazy load ảnh có thuộc tính alt đầy đủ.
- Responsive từ di động 1 cột đến máy tính để bàn 3-4 cột.

## 6. Nút Đặt hàng / Liên hệ (09/11/2026, PO)
Theo cài đặt nguồn `BROCHURE` như `/b/[sendCode]` — xem `public-b-sendcode.md` §6.
