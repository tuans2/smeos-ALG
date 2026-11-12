---
id: SCR-STORE-san-pham
tier: STORE
module: products
route: /san-pham
archetype: B
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 <h1> đúng 20px (text-display)
  - Tối đa 1 nút chính (primary button) theo K2
  - Thanh lọc và tìm kiếm sát danh sách sản phẩm (UX-P09)
  - Đầy đủ 6 trạng thái UI
  - Chuyển đổi mượt mà giữa thẻ (mobile) và bảng (desktop)
---

# Screen Contract — Danh sách & Chi tiết Sản phẩm (`/san-pham`, `/san-pham/[id]`)

**Tuyến:** `/san-pham`, `/san-pham/[id]` · **Tệp chính:** `src/app/(app)/san-pham/page.tsx` (máy chủ tải trang đầu), `src/app/(app)/san-pham/san-pham-client.tsx`, `src/app/(app)/san-pham/[id]/page.tsx` · **Cập nhật:** 26/09/2026 · **Thẻ:** T5.B1

## 1. Vai và mục đích
- **Vai chính (03b):** `store_manager`, `florist`, `sales`, `marketer`.
- **Phạm vi:** organization (danh mục sản phẩm hoa tươi của cửa hàng).
- **Việc chính:**
  - `/san-pham`: Nắm bắt danh mục sản phẩm, tìm kiếm nhanh theo mã/tên, theo dõi trạng thái kinh doanh và kích hoạt tạo mới.
  - `/san-pham/[id]`: Xem chi tiết cấu trúc mẫu hoa (kiểu dáng, mặt hoa, vật chứa, danh mục) và chuyển tiếp tới Studio Tính năng AI.
- **Câu hỏi chính:** "Sản phẩm nào cần tôi xử lý?" → **Nút chính:** "Thêm sản phẩm".
- **Mật độ:** MEDIUM (Bảng dữ liệu chuẩn trên desktop, thẻ danh sách trên mobile).

## 2. Hiện trạng (audit)
- **API gọi:**
  - `GET /api/v1/products?limit=50` → `L1` (`product.read`)
  - `GET /api/v1/products/:id` → `L1` (`product.read`)
  - `PATCH /api/v1/products/:id` → `L3` (`product.update`), `L4` khi archive
- **Trạng thái:** Tải (`SkeletonBlock` dạng thanh shimmer), Rỗng (`EmptyState` kèm nút hành động "Thêm sản phẩm mới"), Lỗi (`InlineError`).

## 3. Thứ bậc thông tin
| Tuyến | Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|---|
| `/san-pham` | L0 Thiết yếu | Header trang + Nút chính "Thêm sản phẩm" + Thanh tìm kiếm | Đỉnh trang |
| `/san-pham` | L1 Danh mục | Bảng dữ liệu (desktop) hoặc Danh sách thẻ (mobile) | Thân trang |
| `/san-pham` | L2 Thao tác | Nút "Chi tiết" và "Tính năng" cho từng sản phẩm | Cột cuối bảng hoặc trên thẻ |
| `/san-pham/[id]` | L0 Thiết yếu | Thẻ tổng quan (Tên, Mã, Trạng thái Nháp/Đang bán/Lưu trữ) | Đầu trang chi tiết |
| `/san-pham/[id]` | L1 Định dạng | Định dạng thiết kế (Hình dáng, Mặt hoa, Vật chứa) | Thân trang chi tiết |
| `/san-pham/[id]` | L2 Lối tắt AI | Mở Studio Tính Năng AI (`/san-pham/[id]/tinh-nang`) | Cuối trang chi tiết |

## 4. Hành động
- **Tại `/san-pham`:**
  - Nút chính: "Thêm sản phẩm" dẫn tới `/tai-anh`.
  - Nút phụ: "Chi tiết" dẫn tới `/san-pham/[id]`, "Tính năng" dẫn tới `/san-pham/[id]/tinh-nang`.
- **Trạng thái bằng chữ và màu (03a §08):**
  - `Nháp`: chấm màu xám + chữ "Nháp" (`bg-surface-alt text-text-muted`).
  - `Đang bán`: chấm xanh lá + chữ "Đang bán" (`bg-success-bg text-success`).
  - `Lưu trữ`: chấm màu vàng + chữ "Lưu trữ" (`bg-warning-bg text-warning`).

## 5. Responsive
- **390px (Mobile):** Render dạng thẻ danh sách (`block md:hidden`), mỗi thẻ có chiều cao tối thiểu 44px (`min-h-11`), hỗ trợ chạm chuyển trang mượt mà.
- **1280px (Desktop):** Render dạng bảng dữ liệu (`hidden md:block`) với đầy đủ các cột: Sản phẩm, Mã, Danh mục, Trạng thái, Thao tác.

## 6. Trợ năng
- Tìm kiếm input và các nút chuyển trang có `min-h-11`, `focus-visible:outline-2 focus-visible:outline-primary`.
- Không sử dụng màu sắc đơn độc để biểu thị trạng thái (tuân thủ tiêu chuẩn WCAG và 03a §08).
- Biểu tượng trang trí có `aria-hidden="true"`.

## 7. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai | PASS | Đạt chuẩn cho Store Manager, Florist, Sales |
| Việc | PASS | Trả lời "Sản phẩm nào cần tôi xử lý?" |
| IA | PASS | Danh sách -> Chi tiết -> Tính năng AI |
| Mật độ | PASS | 390px dạng thẻ, 1280px dạng bảng |
| Thứ bậc | PASS | Thẻ tổng quan -> Định dạng -> AI Hub |
| CTA | PASS | "Thêm sản phẩm" là nút chính duy nhất |
| Luồng | PASS | /san-pham -> /san-pham/[id] -> Studio |
| Trạng thái | PASS | Tải (Skeleton), Rỗng (EmptyState), Lỗi |
| Responsive | PASS | 390px và 1280px phân tách rõ ràng |
| Trợ năng | PASS | Text + Color badge, touch target ≥ 44px |
| Dữ liệu | PASS | Kết nối API Products thật |
| Quyền | PASS | Gating theo L1, L3 |
| Nhất quán | PASS | 100% token Semantic và font token |

## Thay đổi Đợt 4 (12/11/2026)

- `ProductThumb` bắt lỗi tải ảnh → ô "Chưa có ảnh" (không để chữ thay thế đè nhãn, ST-01). Nhãn trạng thái tách khỏi nút ảnh để tên nút khớp chữ hiển thị (WCAG 2.5.3, D4-10).
