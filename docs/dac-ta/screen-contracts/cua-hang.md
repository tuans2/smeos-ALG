---
id: SCR-STORE-cua-hang
tier: STORE
module: greeting-card
route: /cua-hang
archetype: B
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Cổng đối tác chi nhánh nhận gia công (BranchPortalBoard)
  - Phân luồng rõ ràng: Đơn được mời và Đơn đang thực hiện của chi nhánh
  - Cập nhật tiến độ tức thì, kết nối sổ thu tiền công gia công
  - Đầy đủ 6 trạng thái UI và chuẩn WCAG 2.2 AA
---

# Screen Contract — Cổng Chi Nhánh Nhận Gia Công (Branch Portal)

**Mã màn:** `SCR-STORE-cua-hang` · **Tuyến:** `/cua-hang` · **Tầng:** `STORE` · **Bố cục (Archetype):** `B` (Bảng quản lý đơn)

## 1. Vai & Mục đích
- **Vai chính (03b):** `store_manager` / `florist` (Chi nhánh cửa hàng nhận đơn cắm thay / gia công).
- **Phạm vi dữ liệu:** `branch` (Các đơn chuỗi điều phối về cho chi nhánh hiện tại).
- **Mục tiêu chính:** Tiếp nhận lời mời gia công, xác nhận đơn hàng, xem công thức BOM và cập nhật tiến độ cho điều phối trung tâm.
- **Câu hỏi cốt lõi:** "Hôm nay chi nhánh có những đơn gia công nào cần cắm và tiến độ ra sao?"
- **Mật độ thông tin (Density):** `comfortable`

## 2. Cấu trúc Bố cục & Thứ bậc (Visual Hierarchy)
- **Header:** `PageHeader` tiêu đề "Cổng Gia Công Chi Nhánh", bộ lọc trạng thái đơn.
- **Vùng làm việc:** `BranchPortalBoard` dạng bảng Kanban hoặc danh sách thẻ đơn theo tiến độ.
- **Khối chức năng chính:**
  1. L0 (Thiết yếu): Danh sách đơn mới được mời, tiền công thoả thuận, thời hạn hoàn thành.
  2. L1 (Hành động): Nút "Chấp nhận đơn", "Bắt đầu chế tác", "Gửi duyệt QC".
  3. L2 (Bổ trợ): Ghi chú giao hàng, liên hệ điều phối viên chuỗi.

## 3. Hành động cấp trang (Actions)
- **Hành động chính (Primary CTA):** Nút "Nhận đơn gia công".
- **Hành động phụ (Secondary):** "Báo trễ / Sự cố", "In phiếu chế tác".

## 4. Đặc tả 6 Trạng thái Giao diện (States)
1. **Đang tải (Loading):** Skeleton danh sách thẻ đơn gia công.
2. **Rỗng (Empty):** `EmptyState kind="none"` báo: "Chi nhánh hiện chưa có đơn gia công mới nào".
3. **Lỗi (Error):** Lỗi kết nối API điều phối trung tâm.
4. **Không có quyền (Forbidden):** Chi nhánh chưa được liên kết vào mạng lưới chuỗi.
5. **Dữ liệu một phần (Partial):** Báo trạng thái ngoại tuyến tạm thời.
6. **Thành công (Success):** Danh sách đơn tải mượt mà, phản hồi nhận đơn 1 chạm.

## 5. Quy chuẩn Trợ năng & Responsive (A11y & Responsive)
- Thiết kế di động ưu tiên cho thợ tại cửa hàng.
- Nút bấm to rõ, hỗ trợ thao tác nhanh không nhầm lẫn.
