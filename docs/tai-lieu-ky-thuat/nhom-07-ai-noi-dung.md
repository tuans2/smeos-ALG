# Nhóm 7 — AI phân tích, nội dung & marketing (3 chức năng)

Mọi lời gọi AI qua `callCapability` (`src/core/ai/gateway.ts`); mỗi lượt tính phí trừ credit lúc tạo job và hoàn khi hỏng
(`src/modules/usage/`). Hành trình ảnh 14 chặng: `src/modules/journey/`, quy tắc trong skill `creative-studio`. Thay đổi chạm tới tính
năng tải ảnh phải ghi rõ những chặng nào chạy.

---

### 7.1 AI nhận diện ảnh mẫu (thành phần, số lượng, màu)

- **Hành vi:** tải ảnh → job `vision.analyze` (worker `workers/vision/`) → kết quả nhận diện (thành phần, số lượng, màu, vai trò) →
  người dùng sửa trước khi duyệt → duyệt tạo sản phẩm. 1 credit mỗi lượt (`src/modules/usage/domain/pricing.ts`).
- **Mã chính:** `api/vision/analyses`, màn `src/app/(app)/tai-anh/page.tsx` (Phân tích ảnh bằng AI), hàng đợi duyệt
  `src/app/(app)/duyet/analyses-approval-panel.tsx` (`H3`).
- **Test:** `tt/vision-analyses.test.ts`.
- **Lưu ý:** `/duyet` thuộc danh sách khoá production; `/tai-anh` mở.

### 7.2 Bộ nội dung marketing tự động từ 1 ảnh

- **Hành vi:** một luồng: nhận diện ảnh (`vision.analyze`) → người dùng kiểm tra → duyệt tạo thẻ sản phẩm nháp → nội dung bán hàng
  (`product.copy.generate`) → giá vốn đề xuất từ công thức × đơn giá nguyên liệu → bài đăng Facebook/Zalo (`content.generate`) → thẻ A6
  (`print_renditions`). Mỗi bước AI trừ credit riêng, bước hỏng được hoàn; chuỗi dừng ở bước hỏng và giữ đầu ra trước đó; "Chạy lại bước
  còn thiếu". Chặng 01, 02, 06, 08, 09, 10.
- **Mã chính:** `src/modules/journey/use-cases/one-image-kit.ts`, `src/modules/journey/domain/one-image-kit.ts`,
  `src/modules/costing/use-cases/costing-service.ts` (`suggestCostFromBom`), `api/products/one-image-kit/route.ts`,
  `api/products/one-image-kit/run/route.ts`, `src/components/products/one-image-kit-dialog.tsx` (nút "Bộ nội dung từ 1 ảnh" ở `/san-pham`).
- **Test:** `tt/one-image-kit.test.ts` (AI giả lập ở tầng HTTP).

### 7.3 Kiểm tra sẵn sàng ra thị trường

- **Hành vi:** 5 tiêu chí (ảnh, danh mục, giá/công thức, bài viết bán hàng đã duyệt…); mở bán khi chưa đủ vẫn lưu, phản hồi kèm danh sách
  còn thiếu (PO 05/11/2026: chỉ cảnh báo, không chặn).
- **Mã chính:** `src/modules/products/domain/product-readiness.ts`, `src/components/dashboard/product-manager-workspace.tsx` (trang chủ vai
  Quản lý sản phẩm), `api/products/[id]/route.ts`, `api/products/bulk-status/route.ts`, `src/components/products/product-bulk-status-bar.tsx`.
- **Test:** `src/modules/products/domain/__tests__/product-readiness.test.ts`, `tt/products-readiness.test.ts`.
