---
id: SCR-STORE-san-pham-tao-moi
tier: STORE
module: catalog
route: /san-pham/tao-moi
archetype: D
snapshots:
  mobile: 390x844
  desktop: 1280x800
acceptance:
  - Form tạo mới sản phẩm đa ngành hỗ trợ nhập liệu đầy đủ BOM, ảnh, giá
  - Hỗ trợ quét AI từ ảnh mẫu để tự động điền form
  - Báo lỗi validation rõ ràng khi thiếu trường bắt buộc
---

# Screen Contract — Tạo Mới Sản Phẩm (`/san-pham/tao-moi`)

**Tuyến:** `/san-pham/tao-moi` · **Tệp chính:** `src/app/(app)/san-pham/tao-moi/page.tsx` · **Cập nhật:** 01/11/2026 · **Thẻ:** M4-01

## 1. Vai và mục đích
- **Vai chính:** `product_manager`, `store_manager`, `operations_manager`
- **Phạm vi:** organization
- **Việc chính:** Thêm sản phẩm mẫu mới vào danh mục bán hàng, nhập định lượng nguyên vật liệu (BOM) hoặc quét ảnh bằng AI.
- **Archetype:** D (Form / FormLayout).

## 2. Hiện trạng & API
- **API:** `POST /api/v1/products` (tạo sản phẩm mới).
- **Quyền:** Chỉnh sửa `F2`/`H4`.

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Tên sản phẩm, mã, giá bán, ảnh mẫu, danh mục | CreateGeneralCard |
| L1 Hành động | Quét mẫu bằng AI, Lưu vào danh mục | PageHeader |
| L2 Thiết kế | Kiểu dáng, cách cắm/may/trình bày, bình/hộp/phụ kiện | CreateDesignCard |
| L3 Định lượng | Công thức nguyên vật liệu (BOM) và số lượng | CreateBomCard |
| L4 Tiếp thị | Câu chuyện sản phẩm, thông điệp ý nghĩa | CreateStoryCard |

Mặc định khi mở form: trạng thái **Bản nháp**; công thức là các dòng trống theo vai của ngành (ngành hoa: Hoa chính, Hoa phụ, Lá đệm), ví dụ chỉ nằm ở chữ gợi ý — dòng không tên không được lưu (PO 11/11/2026).

## 4. Trạng thái
- **Sẵn sàng:** Form rỗng với các giá trị mặc định theo plugin ngành.
- **Đang gửi (submitting):** Nút lưu hiển thị trạng thái "Đang lưu..." và khoá double-submit.
- **Lỗi:** Hộp thoại báo lỗi cụ thể khi thiếu trường hoặc lỗi server.
- **Thành công:** Chuyển hướng về `/san-pham/[id]?moi=1`.
