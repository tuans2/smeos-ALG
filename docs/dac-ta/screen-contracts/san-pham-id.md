---
id: SCR-STORE-san-pham-chi-tiet
tier: STORE
module: catalog
route: /san-pham/[id]
archetype: C
snapshots:
  mobile: 390x844
  desktop: 1280x800
acceptance:
  - Tải đầy đủ thông tin chi tiết sản phẩm, BOM, ảnh master, giá và định lượng
  - Nút quay lại danh sách sản phẩm hoạt động chính xác
  - Có đầy đủ trạng thái skeleton loading, error alert, dirty validation
---

# Screen Contract — Chi tiết Sản Phẩm (`/san-pham/[id]`)

**Tuyến:** `/san-pham/[id]` · **Tệp chính:** `src/app/(app)/san-pham/[id]/page.tsx` · **Cập nhật:** 01/11/2026 · **Thẻ:** M4-01

## 1. Vai và mục đích
- **Vai chính:** `product_manager`, `store_manager`, `operations_manager`
- **Phạm vi:** organization
- **Việc chính:** Xem và chỉnh sửa thông tin chi tiết của từng sản phẩm, công thức BOM, câu chuyện tiếp thị, ảnh studio và định giá.
- **Archetype:** C (Chi tiết / DetailLayout).

## 2. Hiện trạng & API
- **API:** `GET /api/v1/products/:id` (đọc chi tiết sản phẩm).
- **Quyền:** Xem `L1`, Chỉnh sửa `F2`/`H4`, Duyệt đề xuất `H3`.

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Tên sản phẩm, mã, giá, ảnh đại diện, trạng thái bán | Thẻ Tổng quan (ProductOverviewCard) |
| L1 Hành động | Mở Studio Tính Năng, Phân tích AI & Chỉnh sửa, Chuẩn hóa ảnh | PageHeader & Banner hành động |
| L2 Chi tiết | Công thức định lượng (BOM), Kiểu dáng, Màu sắc, Phí gia công | Thẻ BOM & Thẻ Thiết kế |
| L3 Tiếp thị | Câu chuyện sản phẩm, bối cảnh chụp, gợi ý thông điệp | Thẻ Story |
| L4 Lịch sử | Lịch sử sửa đổi, Yêu cầu thay đổi, Đề xuất cập nhật | Cuối trang |

## 4. Trạng thái
- **Tải:** `SkeletonBlock` hiển thị khung xương các thẻ chi tiết.
- **Lỗi:** Thông báo lỗi khi không tìm thấy hoặc mất kết nối.
- **Thành công:** Hiển thị trọn vẹn thông tin các thẻ chi tiết, BOM, giá, ảnh.
