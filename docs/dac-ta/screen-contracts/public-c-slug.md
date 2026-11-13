---
id: SCR-PUB-c-slug
tier: PUBLIC
module: catalog-links
route: /c/[slug]
archetype: C
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Hoàn toàn KHÔNG dùng dữ liệu giả demo (§2 OPERATING_PRINCIPLES)
  - Tự động nhận diện bề mặt: Landing Page chiến dịch (Công cụ 08) hoặc Catalog sản phẩm (Công cụ 09)
  - Khung xem Storefront công khai chuẩn thương hiệu cửa hàng
  - Hỗ trợ PublicChatSlot tư vấn khách hàng tự động
  - Đầy đủ 6 trạng thái UI và chuẩn WCAG 2.2 AA
---

# Screen Contract — Trang Bán Hàng & Bộ Sưu Tập Công Khai (Storefront)

**Mã màn:** `SCR-PUB-c-slug` · **Tuyến:** `/c/[slug]` · **Tầng:** `PUBLIC` · **Bố cục (Archetype):** `C` (Chi tiết / Showcase)

## 1. Vai & Mục đích
- **Vai chính (03b):** Khách hàng tiềm năng (`customer` / `guest`).
- **Phạm vi dữ liệu:** Bộ sưu tập hoặc trang đích chiến dịch công khai theo đường dẫn định danh (`slug`).
- **Mục tiêu chính:** Khám phá chi tiết sản phẩm, trải nghiệm câu chuyện thương hiệu và tương tác mua sắm.
- **Câu hỏi cốt lõi:** "Sản phẩm / gói ưu đãi này gồm những gì và tôi mua như thế nào?"
- **Mật độ thông tin (Density):** `spacious`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** Banner chiến dịch / nhận diện thương hiệu cửa hàng, mô tả thông điệp tiếp thị.
- **Vùng làm việc:** `CatalogStorefront` trưng bày sản phẩm nổi bật, thành phần và giá.
- **Khối chức năng chính:**
  1. L0 (Thiết yếu): Hình ảnh sản phẩm trực quan, câu chuyện tiếp thị (Storytelling).
  2. L1 (Hành động): Nút đặt mua hoặc gửi yêu cầu báo giá.
  3. L2 (Bổ trợ): Chatbot AI tư vấn sản phẩm thông minh (`PublicChatSlot`).

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** Nút "Đặt mua ngay" hoặc "Nhận tư vấn ưu đãi".
- **Hành động phụ (Secondary):** "Chia sẻ trang", "Xem thêm sản phẩm cùng loại".

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** Skeleton toàn trang hiển thị bố cục hero banner và danh sách thẻ.
2. **Rỗng (Empty):** Cửa hàng chưa kích hoạt sản phẩm trong chiến dịch này.
3. **Lỗi / Không tìm thấy (Error / Not Found):** Thông báo trang chiến dịch đã kết thúc hoặc không tồn tại.
4. **Không có quyền (Forbidden):** Chiến dịch đã bị thu hồi hoặc chuyển sang chế độ nội bộ.
5. **Dữ liệu một phần (Partial):** Hiển thị trước nội dung văn bản khi media đang tải.
6. **Thành công (Success):** Toàn bộ giao diện storefront hiển thị sắc nét, sống động.

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- Tương thích hoàn hảo trên các ứng dụng mạng xã hội (in-app browser của Facebook, Zalo, TikTok).
- Đảm bảo điểm số Web Vitals (LCP < 2.5s, CLS = 0).
