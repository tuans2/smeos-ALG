---
id: SCR-STORE-them
tier: STORE
module: organization
route: /them
archetype: A
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 qua PageHeader/ToolHero (ADR-011 D-UI-05)
  - Tối đa 1 nút chính (primary) theo K2
  - Đủ trạng thái tải, rỗng, lỗi, không quyền
  - Không vi phạm axe-core critical/serious ở 390px và 1280px
---

# Screen Contract — Trang Thêm & Điều hướng Mobile (`/them`)

**Tuyến:** `/them` · **Tệp chính:** `src/app/(app)/them/page.tsx` · **Cập nhật:** 27/09/2026 · **Thẻ:** T5.B7

## 1. Vai và mục đích
- **Vai chính (03b):** Tất cả các vai (`store_manager`, `florist`, `sales`, `marketer`, v.v.).
- **Phạm vi:** organization (trang hub điều hướng trung tâm và tạo nhanh trên thiết bị di động).
- **Việc chính:** Cung cấp lối tắt nhanh tới các tính năng cốt lõi (Tải ảnh AI, Nghiên cứu thị trường), tạo thủ công sản phẩm mới, và hiển thị đầy đủ danh mục chức năng theo chuỗi giá trị.
- **Câu hỏi chính:** "Tôi muốn mở nhanh chức năng nào khác hoặc nhập nhanh mẫu hoa mới?"
- **Mật độ:** MEDIUM (Danh sách điều hướng phân nhóm theo chuỗi giá trị nghiệp vụ).

## 2. Hiện trạng (audit)
- **API:**
  - `POST /api/v1/products` → `L2` (`product.create`)
- **Khối:** 3 khối chính:
  1. Lối tắt nhanh: Tải ảnh bóc tách AI (`/tai-anh`) & Nghiên cứu Thị trường (`/market-intelligence`).
  2. Tạo thủ công sản phẩm mới: Form nhập mã, tên, danh mục (gating theo năng lực L2).
  3. Tất cả chức năng hệ thống: Phân nhóm tự động theo vai qua `buildNav(can, roleUx)` và `mobileSecondSlot(can, roleUx)`.
- **Nút primary:** 1 nút chính "Tạo sản phẩm" trong form nhập tay.
- **Trạng thái có sẵn:** Lỗi tạo sản phẩm (banner cảnh báo), Trạng thái Sắp có (`status === "COMING_SOON"` gắn huy hiệu disabled).

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Header trang "Thêm & Điều hướng" | Đỉnh trang |
| L1 Lối tắt nhanh | 2 Card liên kết "Tải ảnh AI" và "Nghiên cứu Thị trường" | Đỉnh nội dung |
| L2 Tạo nhanh | Form nhập mã, tên, danh mục sản phẩm (chỉ hiện khi có quyền L2) | Giữa trang |
| L3 Danh mục chức năng | Các nhóm chức năng bổ sung ngoài thanh điều hướng dưới (Bottom Bar) | Cuối trang |

## 4. Hành động
- **Chính:** "Tạo sản phẩm" (`type="submit"`).
- **Phụ / Điều hướng:**
  - Chạm thẻ "Tải ảnh, để AI nhận diện" → chuyển `/tai-anh`.
  - Chạm thẻ "Nghiên cứu Thị trường & Xu hướng" → chuyển `/market-intelligence`.
  - Chạm từng dòng chức năng → chuyển trang tương ứng.

## 5. Content budget
- Nút nổi: 1 nút chính trong form.
- Khối chính: 3 khối (Lối tắt, Tạo sản phẩm, Toàn bộ chức năng).

## 6. Trạng thái
- Lỗi: Banner cảnh báo đỏ khi tạo sản phẩm thất bại.
- Quyền: Thông báo rõ ràng khi tài khoản chưa có năng lực L2.
- Sắp có: Huy hiệu "Sắp có" màu trung tính, `aria-disabled="true"` không cho click.

## 7. Responsive
- **390px (Mobile):** Thiết kế tối ưu cho trải nghiệm chạm 1 tay, toàn bộ touch target đạt `min-h-11` (≥ 44px).
- **768px (Tablet) & 1280px (Desktop):** Căn giữa gọn gàng, bố cục mạch lạc.

## 8. Trợ năng
- Chuyển toàn bộ thẻ tương tác sang thẻ `<Link>` có `focus-visible:outline-2 focus-visible:outline-primary` (triệt tiêu vi phạm R5).
- Các mục "Sắp có" có thuộc tính `aria-disabled="true"`.
- Màu sắc và font chữ dùng 100% semantic token.

## 9. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai | PASS | Đạt chuẩn cho toàn bộ 14 vai |
| Việc | PASS | Lối tắt nhanh + Tạo sản phẩm + Hub điều hướng |
| IA | PASS | Phân nhóm rõ ràng theo chuỗi giá trị `buildNav` |
| Mật độ | PASS | Bố cục dạng danh sách chạm thoáng |
| Thứ bậc | PASS | Tiêu đề -> Lối tắt -> Tạo nhanh -> Menu mở rộng |
| CTA | PASS | Tối đa 1 nút chính trong form |
| Luồng | PASS | Chạm mở trang đích hoặc nhập nhanh sản phẩm |
| Trạng thái | PASS | Báo lỗi rõ ràng, vô hiệu hóa mục sắp có |
| Responsive | PASS | Hoàn hảo trên 390px mobile |
| Trợ năng | PASS | Touch target ≥ 44px, dùng Link chuẩn T1.7 |
| Dữ liệu | PASS | Kết nối API tạo sản phẩm và logic nav thật |
| Quyền | PASS | Gating theo L2 |
| Nhất quán | PASS | 100% token Semantic, không vi phạm UX lint |

## 10. Kết quả
- Triệt tiêu hoàn toàn 5 vi phạm UX Lint (R5 Card onClick và R1 raw colors).
- Đồng bộ Screen Contract và cập nhật Checklist thực thi.
