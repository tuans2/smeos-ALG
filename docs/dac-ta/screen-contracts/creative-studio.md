---
id: SCR-STORE-creative-studio
tier: STORE
module: creative-production
route: /creative-studio
archetype: E
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Hành trình sản xuất nội dung sáng tạo 14 chặng (Product-to-Market Journey)
  - 6 Không gian làm việc: Intelligence ➔ Variant ➔ Contents ➔ Audio ➔ Video ➔ Package
  - Hỗ trợ xem trước và kiểm định chất lượng (ValidationScreen)
  - Đầy đủ 6 trạng thái UI và chuẩn WCAG 2.2 AA
---

# Screen Contract — Xưởng Sáng Tạo Nội Dung Đa Phương Tiện (Creative Studio)

**Mã màn:** `SCR-STORE-creative-studio` · **Tuyến:** `/creative-studio` · **Tầng:** `STORE` · **Bố cục (Archetype):** `E` (Builder / Không gian sáng tạo)

## 1. Vai & Mục đích
- **Vai chính (03b):** `marketing_staff` / `creative_lead` / `store_manager`.
- **Phạm vi dữ liệu:** `organization` (Sản phẩm và tài sản truyền thông đa phương tiện).
- **Mục tiêu chính:** Chuyển hoá ảnh thô sản phẩm thành bộ tài sản tiếp thị đa kênh hoàn chỉnh: ảnh Studio, bài viết, âm thanh lồng tiếng, video ngắn và gói xuất bản.
- **Câu hỏi cốt lõi:** "Làm sao để sinh nhanh nội dung tiếp thị chất lượng cao cho sản phẩm này?"
- **Mật độ thông tin (Density):** `comfortable`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** `TabActionHeader` với 6 tab không gian làm việc và nút quay lại.
- **Vùng làm việc:** Không gian tương tác chuyên sâu theo từng loại nội dung (`*Workspace`).
- **Khối chức năng chính:**
  1. L0 (Thiết yếu): Thông tin sản phẩm nguồn, ảnh gốc và định hướng sáng tạo.
  2. L1 (Hành động): Nút sinh ảnh AI, sinh kịch bản video, thu âm giọng nói AI.
  3. L2 (Bổ trợ): Bảng kiểm định chất lượng (`ValidationScreen`), gói xuất bản đa kênh.

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** Nút "Tạo tài sản sáng tạo" hoặc "Duyệt & Xuất bản".
- **Hành động phụ (Secondary):** "Thử nghiệm biến thể khác", "Tải về trọn gói".

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** Skeleton toàn diện mô phỏng thanh công cụ và khu vực preview đa phương tiện.
2. **Rỗng (Empty):** Khi chưa chọn sản phẩm mục tiêu → hướng dẫn chọn từ kho sản phẩm.
3. **Lỗi (Error):** Báo lỗi khi tác vụ sinh nội dung AI gặp sự cố kèm hướng dẫn điều chỉnh prompt.
4. **Không có quyền (Forbidden):** Yêu cầu quyền sáng tạo nội dung.
5. **Dữ liệu một phần (Partial):** Cho phép xem trước ảnh khi âm thanh đang được xử lý nền.
6. **Thành công (Success):** Toàn bộ bộ tài sản sẵn sàng xuất bản ra mạng xã hội.

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- Hỗ trợ thao tác kéo thả và điều khiển bằng phím.
- Giao diện đáp ứng mượt mà trên iPad/Tablet và Desktop màn hình rộng.
