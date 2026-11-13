# Pattern UX-P07 — Confirmation (theo mức rủi ro)

## Khi dùng
Chỉ cho hành động **R3** (03c UX-015). R2 ưu tiên Hoàn tác (UX-021); R1 không xác nhận.

## Nội dung hộp xác nhận
1. Tiêu đề là hành động: "Xóa 3 sản phẩm?"
2. Hậu quả cụ thể: phạm vi, có hoàn tác được không, ai bị ảnh hưởng.
3. Nút xác nhận ghi lại động từ ("Xóa sản phẩm"), không "OK"; nút hủy là lựa chọn an toàn và nhận focus đầu.
4. Hành động không hoàn tác hoặc trên diện rộng: yêu cầu thao tác chủ động (gõ tên/tích ô).

## Thực thi
`src/components/ui/confirm-dialog.tsx` dựa trên `dialog.tsx` hiện có. Cấm `window.confirm` (lint R13). Hành động R3 ghi nhật ký (UX-020).

## Verification
- Esc/hủy không thực hiện hành động; focus trở về nút gốc.
- Bấm xác nhận hai lần không chạy hai lần.
