# Nhóm 2 — Sản phẩm, mẫu & hình ảnh (9 chức năng)

Phân hệ chính: `src/modules/products/` (sản phẩm, giá, trạng thái), `src/modules/costing/` (công thức, giá vốn),
`src/modules/product-copies/` (nội dung bán hàng), `gc/` (khả dụng trên Thẻ Chào). Màn: `/san-pham`, `/san-pham/[id]`,
`/san-pham/tao-moi`, `/san-pham/nhap-hang-loat`, `/san-pham/kha-dung`, `/tinh-gia/*`.

---

### 2.1 Tạo thẻ sản phẩm

- **Hành vi:** tạo mẫu với tên, mã, phân loại, giá, mô tả, màu, ảnh, dịp, kích thước, kiểu dáng. Mã để trống → máy chủ sinh mã
  `AUTO-…` duy nhất trong tổ chức (thử lại khi trùng); mã nhập trùng → 409.
- **Mã chính:** `api/products/route.ts`, `src/modules/products/use-cases/create-product.ts`, quy ước mã
  `src/modules/products/domain/product-code.ts`; form `src/app/(app)/san-pham/tao-moi/page.tsx`,
  `src/components/products/use-create-product-form.ts`, dịp và kích thước `use-product-occasion-size.ts`, `create-occasion-size-card.tsx`.
- **Dữ liệu:** `products` (`attributes.occasionCodes`, `attributes.dimensions`, `attributes.craftStyle`).
- **Quyền:** `L2`.
- **Test:** `tt/products-create.test.ts`, `tt/products-pricing.test.ts`.

### 2.2 Cập nhật sản phẩm, đồng bộ Thẻ Chào

- **Hành vi:** sửa mẫu; Thẻ Chào đọc sản phẩm qua quan hệ nên thay đổi hiện ngay trên link khách.
- **Mã chính:** `api/products/[id]/route.ts`, `gc/infra/greeting-catalog-repository.ts`; màn `src/app/(app)/san-pham/[id]/page.tsx`.
- **Quyền:** `L3`.
- **Test:** `tt/products-pricing.test.ts`, `tt/product-governance.test.ts`.
- **Khi nâng cấp:** không sao chép dữ liệu sản phẩm vào Thẻ Chào; đơn đã đặt giữ ảnh chụp sản phẩm riêng (`greeting_sessions.product_snapshot`).

### 2.3 Trạng thái sản phẩm

- **Hành vi:** `DRAFT` (nháp), `ACTIVE` (đang bán), `PAUSED` (tạm ngưng), `ARCHIVED` (lưu trữ). Mẫu tạm ngưng/lưu trữ không bán trên
  link khách. Mẫu đã có đơn không xoá vĩnh viễn được (409), chỉ lưu trữ. Thao tác hàng loạt trên danh sách.
- **Mã chính:** `api/products/[id]/route.ts`, `api/products/bulk-status/route.ts`, `gc/domain/product-availability.ts`,
  `gc/use-cases/check-product-availability.ts`, `src/modules/storage/infra/trash-repository.ts`,
  `src/components/products/product-card.tsx`, `product-bulk-status-bar.tsx`.
- **Dữ liệu:** enum `product_status` (migration `20261104120000_product_status_paused`).
- **Quyền:** lưu trữ cần `L4`.
- **Test:** `tt/products-status.test.ts`.

### 2.4 Phiên bản kích cỡ (Nhỏ/Vừa/Lớn/VIP)

- **Hành vi:** giá theo phiên bản = tổ hợp nhóm đặc điểm (Kích cỡ × Màu…), mỗi phiên bản có giá thường, giá cao điểm, số cành, ảnh
  riêng. Đơn khách đặt ghi phiên bản và số cành vào dòng đơn; phiếu thợ đọc theo phiên bản.
- **Mã chính:** `src/modules/products/domain/product-pricing.ts`, `src/components/products/pricing/` (`product-pricing-editor.tsx`,
  `pricing-variant-table.tsx`, `pricing-dimensions-picker.tsx`), `gc/use-cases/place-brochure-order.ts`,
  `gc/domain/order-product-view.ts`, `src/modules/orders/domain/florist-work.ts`.
- **Test:** `src/modules/products/domain/__tests__/product-pricing.test.ts`, `tt/product-size-stems.test.ts`.
- **Giới hạn hiện tại:** giá vốn tính theo công thức của mẫu, chưa tách theo phiên bản.

### 2.5 Định mức nguyên liệu (công thức)

- **Hành vi:** công thức của mẫu gồm các dòng nguyên liệu (nhóm Chủ đạo/Phụ/Lá theo cấu hình ngành), số lượng, đơn vị, màu.
- **Mã chính:** `api/costing/recipes/[productId]/route.ts`, `src/modules/costing/`, nhóm theo ngành `org/domain/industries/floral.ts`,
  màn `src/app/(app)/tinh-gia/cong-thuc`, khối công thức ở chi tiết sản phẩm (`ProductBomCard`).
- **Dữ liệu:** `product_recipes`, `product_recipe_items`.
- **Test:** `tt/costing-isolation.test.ts`.

### 2.6 Nhập danh mục hàng loạt từ Excel/CSV

- **Hành vi:** đọc tệp, đánh lỗi từng dòng (thiếu trường, trùng mã), xem trước, nhập kèm ảnh.
- **Mã chính:** `src/components/products/bulk-import/parse-product-sheet.ts`, `import-preview.tsx`, `api/products/batch-import/route.ts`;
  màn `src/app/(app)/san-pham/nhap-hang-loat/page.tsx`.
- **Test:** `tests/unit/products/parse-product-sheet.test.ts`, `run-bulk-import.test.ts`, `tt/products-batch-import-images.test.ts`.

### 2.7 Đề xuất thay đổi thông tin/giá, duyệt 2 bước

- **Hành vi:** người không có quyền sửa trực tiếp gửi đề xuất; Điều hành duyệt/từ chối; đề xuất hết hạn tự đóng. Không tự duyệt đề
  xuất của mình.
- **Mã chính:** `api/products/[id]/change-requests`, `src/components/products/product-change-requests-card.tsx`, `proposal-queue-bar.tsx`,
  `org/use-cases/assert-not-self-approval.ts`.
- **Dữ liệu:** `product_change_requests`.
- **Test:** `tt/product-governance.test.ts`, `tt/self-approval.test.ts`.

### 2.8 Khả dụng và ẩn mẫu theo ngày

- **Hành vi:** chế độ khả dụng của mẫu và danh sách ngày không nhận đơn; máy chủ từ chối đơn giao vào ngày đã khoá.
- **Mã chính:** `gc/domain/product-availability-config.ts`, `gc/use-cases/check-product-availability.ts`,
  `gc/use-cases/assert-product-date-open.ts`, `src/components/products/blocked-dates-editor.tsx`, `product-availability-card.tsx`;
  màn tổng `/san-pham/kha-dung`.
- **Test:** `tt/availability-by-date.test.ts`, `tt/product-size-stems.test.ts`.
- **Giới hạn hiện tại:** danh sách mẫu trên link vẫn hiện mẫu có ngày bị khoá; khách bị chặn khi chọn đúng ngày đó.

### 2.9 Nội dung tư vấn bán hàng chuẩn SEO

- **Hành vi:** bộ nội dung gồm tiêu đề ngắn, điểm nổi bật, câu chuyện, từ khoá SEO; sinh bằng AI (job `product.copy.generate`) hoặc
  nhập tay; duyệt trước khi dùng; Sale sao chép kịch bản tư vấn.
- **Mã chính:** `src/modules/product-copies/domain/product-copy-rules.ts`, `api/product-copies`, màn so sánh bản AI và bản đã sửa
  `src/app/(app)/san-pham/[id]/tinh-nang/product-copy/[copyId]/page.tsx`, `src/components/sales/sales-pitch-card.tsx`.
- **Test:** `tt/product-copies.test.ts`.
