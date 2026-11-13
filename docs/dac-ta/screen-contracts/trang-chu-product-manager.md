# Screen Contract — Trang chủ Quản lý Sản phẩm (ProductManagerWorkspace)

**Tuyến:** `/` · **Tệp chính:** `src/components/dashboard/product-manager-workspace.tsx` · **Cập nhật:** 27/09/2026 · **Thẻ:** T6.1

## 0. Audit vai (theo T6.SOP)
- **Dữ liệu:**
  - Thực thể CSDL: `products`, `product_variants`, `product_images`, `product_analyses`, `pricing_rules`. Trạng thái: CÓ ĐỦ.
  - Trường P0/P1: Tên, mã, ảnh chính (`masterImageUrl`), trạng thái (`status`), danh mục (`category`), công thức cành hoa (`bom.flowers`), định giá (`pricing.quotePriceVnd`, `costPriceVnd`). Trạng thái: CÓ ĐỦ trong `ProductMasterIndex`.
  - Luật domain: `computeProductReadiness(product)` tại `src/modules/products/domain/product-readiness.ts` (đã có unit tests 100% xanh).
- **Luồng:**
  - Quản lý danh mục sản phẩm, hoàn thiện các mẫu hoa còn thiếu thông tin (ảnh/BOM/giá), kích hoạt sản phẩm mở bán. Đã có API `GET /api/v1/products/master-index` và các màn hình `/san-pham`, `/catalog`, `/gia`.
- **Quyền:**
  - Mã năng lực: `L1` (`product.read`), `L2` (`product.create`), `L3` (`product.update`), `L5` (`pricing.read`), `B1`–`B5` (`vision_run.*`), `C24`–`C26` (`pricing_card.*`). Trạng thái: ĐÃ CẤP trong `capability-catalog.ts`.

## 1. Vai và mục đích
- **Vai chính (03b):** `product_manager` (Quản lý sản phẩm).
- **Phạm vi:** organization (danh mục sản phẩm toàn tổ chức).
- **Việc chính:** Theo dõi mức độ sẵn sàng bán của danh mục, rà soát và bổ sung ngay các sản phẩm thiếu ảnh đại diện, thiếu phân loại, thiếu giá bán hoặc BOM hoa trước khi đội ngũ Sales chào bán.
- **Câu hỏi chính:** "Sản phẩm nào chưa sẵn sàng để bán?"
- **Mật độ:** MEDIUM (Khối chỉ số 4 ô + Khối P0 việc cần xử lý + Khối P2 sản phẩm hoàn thiện).

## 2. Hiện trạng (audit)
- **API gọi:**
  - `GET /api/v1/products/master-index?limit=100` → `L1` (`product.read`)
- **Khối:** 1 thanh tác vụ chính (Thêm sản phẩm `L2`, Tra cứu Catalog `L1`, Quy tắc giá `L5`) + Khối P1 4 thẻ chỉ số nhanh + Khối P0 Sản phẩm chưa sẵn sàng bán + Khối P2 Sản phẩm đã kích hoạt hoàn chỉnh.
- **Trạng thái:** Tải (`SkeletonBlock`), rỗng (`EmptyState`), lỗi (`InlineError`).

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Hướng dẫn | 1 `<FeatureGuidanceCard />` (K1) | Đỉnh màn hình, tự thu gọn |
| L1 Hành động | Thanh tác vụ K2 (1 primary "Thêm sản phẩm", 2 outline "Tra cứu Catalog", "Quy tắc giá") | Dưới guidance card |
| L2 Tổng quan | 4 chỉ số danh mục: Tổng sản phẩm, Cần hoàn thiện, Sẵn sàng bán, Điểm sẵn sàng TB | Lưới 4 ô (2 cột mobile, 4 cột desktop) |
| L3 Việc khẩn | Khối P0 "Sản phẩm chưa sẵn sàng bán" kèm lý do thiếu cụ thể và điểm % (dòng giãn theo số nhãn lý do, không cắt chiều cao) | Thẻ Card chính ở giữa |
| L4 Tham khảo | Khối P2 "Sản phẩm đang bán hoàn chỉnh" (100% readiness) | Dưới cùng khi đã tải xong |

## 4. Hành động
- **Chính:** 1 nút chính duy nhất (`Thêm sản phẩm` - `L2`, `variant="primary"`).
- **Phụ:** 2 nút phụ hiển thị trực tiếp (`Tra cứu Catalog` - `L1`, `Quy tắc giá` - `L5`). Tuân thủ nghiêm ngặt 03a UX-010/011 và K2.
- **Tương tác dòng:**
  - Nhấp vào từng sản phẩm chưa hoàn thiện → dẫn sang `/san-pham` để cập nhật ảnh/BOM.

## 5. Content budget
- Nút nổi: 0.
- Khối chính: 1 Guidance Card + 1 Action Bar + 1 Metric Grid + 1 P0 Card + 1 P2 Card ≤ 5 khối.

## 6. Trạng thái
- Tải: `SkeletonBlock` cho cả danh sách chỉ số và bảng danh sách việc.
- Rỗng:
  - Khi chưa có sản phẩm: `EmptyState` hướng dẫn thêm sản phẩm đầu tiên.
  - Khi 100% sản phẩm đã sẵn sàng: `EmptyState` chúc mừng "Tất cả sản phẩm đã sẵn sàng bán!".
- Lỗi: `InlineError` hiển thị thông báo lỗi thân thiện kèm nút "Thử lại".
- 403: Không có quyền `L1` thì ẩn danh sách, hiện thông báo liên hệ quản lý.

## 7. Responsive
- **390px (Mobile):** Xếp dọc 1 cột, thẻ chỉ số 2 cột nhỏ gọn, dòng sản phẩm đạt touch target `min-h-12` (≥ 48px) thao tác dễ dàng.
- **768px (Tablet):** Bố cục thoáng, chỉ số dàn đều.
- **1280px (Desktop):** Lưới 4 chỉ số trên 1 hàng, danh sách việc hiển thị đầy đủ chi tiết mã/tên/ảnh/lý do thiếu.

## 8. Trợ năng
- Danh sách phần tử sử dụng thẻ `<button type="button">` kèm `focus-visible:outline-2 focus-visible:outline-primary`.
- Các biểu tượng trang trí có `aria-hidden="true"`.
- Cấu trúc tiêu đề ngữ nghĩa chuẩn: `h1` (tên tiệm), `h2` (Sản phẩm chưa sẵn sàng bán, Sản phẩm đang bán).

## 9. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai | PASS | Chuẩn xác cho `product_manager` |
| Việc | PASS | Rà soát sản phẩm chưa sẵn sàng bán & lý do thiếu |
| IA | PASS | Khung P0 + P1 + P2 mạch lạc |
| Mật độ | PASS | 1 Feature Guidance Card (K1), thông tin tập trung |
| Thứ bậc | PASS | Hướng dẫn -> Hành động -> Chỉ số -> Việc khẩn -> Tham khảo |
| CTA | PASS | 1 chính (Thêm sản phẩm) + 2 phụ (Catalog, Giá) (K2) |
| Luồng | PASS | Nhảy trực tiếp vào `/san-pham`, `/catalog`, `/gia` |
| Trạng thái | PASS | Đủ tải / rỗng / lỗi / 403 |
| Responsive | PASS | Hoàn hảo từ 390px đến 1280px |
| Trợ năng | PASS | Touch target ≥ 44px, focus visible rõ ràng |
| Dữ liệu | PASS | Dữ liệu Master Index thật qua API `/api/v1/products/master-index` |
| Quyền | PASS | Gating theo `L1`, `L2`, `L5` |
