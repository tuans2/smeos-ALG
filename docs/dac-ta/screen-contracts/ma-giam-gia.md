# Screen Contract — Phát hành mã giảm giá

**Tuyến:** `/uu-dai/ma-giam-gia` · **Tệp chính:** `src/components/promotions/voucher-batches-client.tsx` · **Cập nhật:** 30/10/2026 · **Thẻ:** công cụ #66

## 1. Vai và mục đích
- Vai chính (03b): `dieu_hanh` · Vai phụ: `dieu_phoi`, `crm`, `customer_service` (mặc định của `Q8`)
- Phạm vi: organization
- Việc chính: phát hành một đợt mã giảm giá cho khách nhập khi đặt hàng.
- Câu hỏi chính: "Đợt mã nào đang dùng được và đã dùng bao nhiêu lượt?"
- Mật độ: MEDIUM
- Archetype: B Danh sách (+ D Biểu mẫu trong hộp thoại)

## 2. Hiện trạng
- API: `GET · POST /api/v1/vouchers/batches` → `Q8`; `GET · PATCH /vouchers/batches/:id` → `Q8`; `GET /vouchers/batches/:id/export` → `Q8`
- Nút primary: 1 (Phát hành đợt mới) · FeatureGuidanceCard: 1 · Modal: tạo đợt, danh sách mã
- Trạng thái: tải ☑ rỗng ☑ lỗi ☑ (InlineError + thử lại) không quyền ☑ thành công ☑

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí |
|---|---|---|
| L0 | Danh sách đợt: tên, trạng thái, mức giảm, lượt đã dùng | khung nhìn đầu |
| L1 | Phát hành đợt mới · công tắc tạm dừng · Xem mã | khung nhìn đầu |
| L2 | Ưu đãi gắn kèm, hạn dùng, đơn tối thiểu | dòng phụ của thẻ |
| L3 | Danh sách mã + tải CSV | hộp thoại |
| L4 | Điều kiện áp dụng (đơn tối thiểu, giảm tối đa, ngày, lượt) | `Disclosure` trong biểu mẫu |

## 4. Hành động
- Chính: Phát hành đợt mới → hộp thoại biểu mẫu → đợt mới ở đầu danh sách
- Phụ: Xem mã (tải CSV) · công tắc tạm dừng/mở lại

## 6. Trạng thái
tải: 2 khung xương · rỗng: "Chưa có đợt mã giảm giá nào" + nút phát hành · lỗi: thông báo + Thử lại · không quyền: EmptyState nhờ Điều hành cấp quyền · lỗi theo trường hiện dưới từng ô

## 7. Responsive
390px: nút điều hướng xuống dòng, thẻ đợt xếp dọc, không cuộn ngang (đã kiểm 375px) · 1280px: một cột tối đa 4xl

## 10. Dữ liệu và quyền
nguồn sự thật: `voucher_batches`, `vouchers`, `voucher_redemptions`; ưu đãi đang bật + trần % từ `shopPromotionPolicy` (cùng nguồn ma trận ưu đãi) · năng lực: `Q8`

## 11. Component
dùng lại: `Dialog`, `Disclosure`, `EmptyState`, `InlineError`, `FeatureGuidanceCard`, `Skeleton` · tạo mới: `ActiveSwitch` (công tắc dùng chung cho mã giảm giá và bảng giá), `PromotionsHubNav`
