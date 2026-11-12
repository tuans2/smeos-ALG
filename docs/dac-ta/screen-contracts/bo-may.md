---
id: SCR-STORE-bo-may
tier: STORE
module: bo-may
route: /bo-may
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

# Screen Contract — Cấu Hình Bộ Máy Phân Tích Ảnh

**Tuyến:** `/bo-may` · **Tệp chính:** `src/app/(app)/bo-may/page.tsx` · **Cập nhật:** 27/09/2026 · **Thẻ:** T5.D4

## 1. Vai và mục đích
- Vai chính (03b): `operations_manager`, `store_manager`
- Phạm vi: organization
- Việc chính: Lựa chọn bộ máy phân tích thị giác AI (Vision Engine) dùng cho toàn bộ quy trình nhận diện hoa tươi của tổ chức.
- Câu hỏi chính: Tiệm đang dùng bộ máy phân tích nào, chất lượng và chi phí ra sao, ảnh có bị chuyển ra ngoài hạ tầng không?
- Mật độ: MEDIUM.

## 2. Hiện trạng (audit)
- API:
  - `GET /api/v1/vision/engine` → Đọc bộ máy đang dùng và danh sách các bộ máy khả dụng (cần quyền `H1`)
  - `PUT /api/v1/vision/engine` → Cập nhật bộ máy đang dùng cho tổ chức (cần quyền `H4` - chỉ Điều hành)
- Khối: 3 khối chính (Thanh điều hướng quay lại, Danh sách thẻ radio chọn bộ máy kèm cảnh báo kiểm toán, Thanh nút hành động ghim dưới cùng kèm Dialog xác nhận tác động)
- Nút primary: Nút "Chuyển sang bộ đã chọn" (khi có quyền H4 và chọn bộ khác)
- Dialog xác nhận: `Dialog` Base-UI hiển thị khi bấm chuyển đổi (03a §22), phân tích rõ ảnh hưởng quyền riêng tư và chi phí
- Trạng thái có sẵn: tải ☑ rỗng ☑ lỗi ☑ không quyền ☑ một phần ☑ thành công ☑

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | Tên bộ máy, trạng thái đang dùng, icon chọn | Thẻ từng bộ máy |
| L1 Hành động | Chọn bộ máy, Nút Chuyển sang bộ đã chọn | Thẻ radio & Thanh tác vụ chân trang |
| L2 Ngữ cảnh | Cảnh báo dữ liệu chuẩn, ghi chú quyền riêng tư (Ảnh gửi ra ngoài / không rời hệ thống) | Badge & Box cảnh báo màu vàng |
| L3 Chi tiết | Mô tả chi tiết ưu nhược điểm từng bộ máy | Nội dung text trong thẻ |
| L4 Xác nhận | Dialog xác nhận thay đổi tác động lớn | Modal Base-UI Dialog |

## 4. Hành động
- Chính (1): `Chuyển sang bộ đã chọn` (`variant: "primary"`, kích hoạt Dialog xác nhận).
- Phụ (≤ 2):
  - `Quay lại` (`variant: "ghost"`, icon `ArrowLeft`).
  - `Hủy` trong Dialog xác nhận (`variant: "outline"`).
  - `Xác nhận chuyển đổi` trong Dialog (`variant: "primary"`).
- Menu `…`: Không cần thiết.

## 5. Content budget
- Nút nổi: Đúng 1 nút primary lớn dưới chân trang.
- Khối chính: Danh sách radio 3 bộ máy rõ ràng.
- Dialog xác nhận: Nêu rõ 4 lưu ý (lượt đang chạy, áp dụng toàn tổ chức, quyền riêng tư ảnh, ghi log audit).

## 6. Trạng thái
- Tải: `SkeletonBlock` 3 dòng.
- Không quyền: Thông báo "Chỉ Điều hành mới đổi được bộ máy phân tích" thay cho nút bấm.
- Đang dùng: Huy hiệu "Đang dùng" màu xanh lá, nút vô hiệu hóa với nhãn "Đang dùng bộ này".
- Lỗi: Alert box màu đỏ nổi bật.
- Đã lưu: Text xác nhận thành công dịu mắt.

## 7. Responsive
- 390px: Bố cục tối ưu trên màn hình dọc di động, thanh footer dính chân trang (thumb zone).
- 768px+: Căn giữa gọn gàng.
- 1280px+: Trực quan, dễ quan sát.

## 8. Trợ năng
- Bàn phím: Danh sách bọc trong `<div role="radiogroup">`, mỗi lựa chọn là `<button type="button" role="radio" aria-checked={...}>`.
- Focus: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`.
- Nhãn: Đầy đủ `aria-label`, thẻ radio có mô tả rõ ràng.

## 9. AI
- Là màn hình cốt lõi quản trị Vision Engine: phân biệt rõ ràng bộ máy gửi ảnh ra nhà cung cấp bên ngoài (Cloud) và bộ máy xử lý nội bộ (Server) tuân thủ Luật YC-K1.

## 10. Dữ liệu và quyền
- Nguồn sự thật: Cấu hình `vision_engine` của tenant.
- Quyền: `H1` (xem bộ máy), `H4` (chỉ Điều hành mới được đổi).

## 11. Component
- Dùng lại: `Button`, `Dialog`, `SkeletonBlock`.
- Tạo mới: Không.

## 12. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|
| Card div onClick | Chuẩn hóa trợ năng T1.7 | Đổi sang `<button role="radio">` trong `radiogroup` | Hỗ trợ bàn phím, screen reader và focus ring chuẩn | `bo-may/page.tsx` |
| Bấm chuyển là gọi API ngay | Hành động tác động lớn cần xác nhận 03a §22 | Thêm `Dialog` Base-UI giải thích rõ tác động | Tránh bấm nhầm làm thay đổi luồng nhận diện ảnh của cả tiệm | `bo-may/page.tsx` |
| Thẻ chọn bộ máy tự dựng `role="radio"` | Nhóm lựa chọn chuẩn | `RadioGroup` + `RadioGroupItem`, mỗi thẻ là `<label>` | Bàn phím/ARIA chuẩn, bỏ xử lý phím tự viết (Đợt 4, D4-09) | `bo-may/page.tsx` |

## 13. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Mật độ · Thứ bậc · CTA · Luồng · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền · AI · Nhất quán | PASS | Đạt chuẩn 100% |
