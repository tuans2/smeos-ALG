---
id: SCR-STORE-gia
tier: STORE
module: products
route: /gia
archetype: F
snapshots:
  - 390x844
  - 1280x800
acceptance:
  - Tiêu đề cấp 1 qua PageHeader/ToolHero (ADR-011 D-UI-05)
  - Tối đa 1 nút chính (primary) theo K2
  - Đủ trạng thái tải, rỗng, lỗi, không quyền
  - Không vi phạm axe-core critical/serious ở 390px và 1280px
---

# Screen Contract — Tính giá sản phẩm (`/gia`)

**Tuyến:** `/gia` · **Tệp chính:** `src/app/(app)/gia/page.tsx`, `pricing-calculator-card.tsx`, `pricing-rules-config-card.tsx`, `customer-tier-pricing-card.tsx`, `src/components/sales/quotation-discount-settings-card.tsx` · **Cập nhật:** 12/11/2026 · thêm thẻ "Giảm giá Sale được tự quyết trên báo giá" (mặc định 20%, tối đa 50%; vượt mức thì Điều hành lưu báo giá; sửa cần `F2` — audit BL-28) · **Thẻ:** T5.B6

## 1. Vai và mục đích
- **Vai chính (03b):** `store_manager`, `florist`, `sales`.
- **Phạm vi:** organization (tính toán báo giá sản phẩm, đối soát hoa hồng xưởng và cấu hình quy tắc giá tổ chức).
- **Việc chính:**
  - Nhập giá vốn hoa và chi phí phụ liệu để máy tính đối soát tỷ lệ lợi nhuận, mức thưởng đối tác và khoảng giá tối ưu.
  - Điều chỉnh và lưu trữ quy tắc giá tổ chức (thưởng theo hạng, tỷ lệ giá tối ưu, hệ số sàn/trần).
  - Đặt ưu đãi % theo hạng khách (Khách mới/Đồng/Bạc/Vàng/VIP, tối đa 50%) và phụ phí giờ cao điểm theo khung giờ giao; áp ở báo giá Thẻ Chào, mỗi khoản một dòng.
- **Câu hỏi chính:** "Mẫu hoa này tính ra giá bán bao nhiêu là tối ưu, và shop nhận về bao nhiêu sau khi trừ tiền công thợ?"
- **Mật độ:** MEDIUM (3 khối card: tính toán, cấu hình quy tắc, ưu đãi hạng khách & giờ cao điểm).

## 2. Hiện trạng (audit)
- **API:**
  - `GET /api/v1/pricing-rules` → `L5` (`pricing.read`)
  - `PUT /api/v1/pricing-rules` → `L6` (`pricing.write`)
- **Khối:** 3 khối card riêng biệt:
  1. `PricingCalculatorCard`: Máy tính giá tức thời phía client (chạy các hàm thuần `quotePrice`, `checkPriceInvariants`, `checkPriceGuard`).
  2. `PricingRulesConfigCard`: Quản lý quy tắc giá của tổ chức (gating theo năng lực L6).
  3. `CustomerTierPricingCard`: Ưu đãi hạng khách và giờ cao điểm (khoá `customer_tier_discount`, `peak_hour_surcharge`; sửa khi có L6, không có thì chỉ xem).
- **Nút primary:** Tối đa 1 nút chính trên mỗi khối card.
- **Trạng thái có sẵn:** Tải (`SkeletonBlock lines={5}`), Lỗi kết nối (thông báo kèm nút "Thử lại"), Thành công (thông báo lưu quy tắc).

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Header trang "Tính giá sản phẩm", nút quay về Trang chủ | Đỉnh trang |
| L1 Máy tính giá | Form nhập giá vốn, hạng đối tác, phụ phí, giá niêm yết + Nút "Tính toán đối soát giá" | Khối trên |
| L2 Kết quả tính | Tổng tiệm nhận, thưởng đối tác, giá tối ưu đề xuất, tiền cọc/còn lại, cảnh báo sàn trần | Dưới nút tính giá |
| L3 Cấu hình quy tắc | Bảng thưởng theo hạng đối tác, tỷ lệ giá tối ưu, hệ số sàn/trần + Nút "Lưu quy tắc giá" | Khối dưới |
| L3 Ưu đãi hạng khách | % giảm cho 5 hạng khách, danh sách giờ cao điểm (từ giờ, đến giờ, phụ phí) + "Thêm giờ cao điểm", "Lưu" | Khối cuối |

## 4. Hành động
- **Chính:**
  - "Tính toán đối soát giá" (Khối máy tính giá).
  - "Lưu quy tắc giá" (Khối cấu hình giá — chỉ mở khi có quyền L6).
- **Phụ:**
  - "Thử lại" (`variant="outline"`) khi lỗi tải.
  - "+ Thêm hạng đối tác" / "Xoá" hạng đối tác.
  - "Thêm giờ cao điểm" / "Bỏ" khung giờ; "Lưu" ưu đãi hạng khách & giờ cao điểm (L6).

## 5. Content budget
- Nút nổi: 1 nút chính trên mỗi khối card.
- Khối chính: 3 khối card logic độc lập.

## 6. Trạng thái
- Tải: `<SkeletonBlock lines={5} label="Đang tải cấu hình giá" />`.
- Lỗi: Thông báo lỗi màu đỏ kèm nút "Thử lại".
- Lỗi trường nhập: Báo đỏ cụ thể từng trường (giá vốn, giá niêm yết, tỷ lệ cọc) ngay dưới ô input.

## 7. Responsive
- **390px (Mobile):** Các ô nhập liệu có `min-h-11`, hiển thị 1 cột thông thoáng, chạm thuận tiện.
- **768px (Tablet):** Căn giữa tối đa 768px (`max-w-4xl`).
- **1280px (Desktop):** Bố cục gọn gàng, căn lề chuẩn mực.

## 8. Trợ năng
- Toàn bộ ô nhập và nút bấm có `min-h-11`, `focus-visible:outline-2 focus-visible:outline-primary`.
- Số tiền định dạng chuẩn `vi-VN` (VNĐ) kèm nhãn `đ` rõ ràng.
- Báo lỗi trường nhập sử dụng icon `AlertCircle` kèm nhãn text tương phản cao.

## 9. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai | PASS | Đạt chuẩn cho Store Manager, Florist, Sales |
| Việc | PASS | Tính giá tối ưu và lưu quy tắc giá tiệm |
| IA | PASS | 2 card chuyên biệt, phân định rõ máy tính vs cấu hình |
| Mật độ | PASS | Bố cục vừa vặn, không quá tải |
| Thứ bậc | PASS | Tiêu đề -> Máy tính giá -> Kết quả -> Quy tắc tiệm |
| CTA | PASS | Tối đa 1 nút chính mỗi card (K2) |
| Luồng | PASS | Nhập số liệu -> Bấm tính -> Xem kết quả đối soát |
| Trạng thái | PASS | Skeleton tải thật, báo lỗi trường chi tiết, thành công |
| Responsive | PASS | Chuẩn từ 390px mobile đến desktop |
| Trợ năng | PASS | Touch target ≥ 44px, focus visible, format vi-VN |
| Dữ liệu | PASS | Kết nối API pricing-rules và domain pure functions |
| Quyền | PASS | Gating theo L5, L6 |
| Nhất quán | PASS | 100% token Semantic, tách file SRP < 250 dòng |

## 10. Kết quả
- Tách `page.tsx` (472 dòng) thành 3 file đạt SRP (< 250 dòng mỗi file).
- Triệt tiêu hoàn toàn vi phạm R4 trong `/gia`.
- Thêm kiểm tra hợp lệ và thông báo lỗi chi tiết cho từng trường nhập liệu.
