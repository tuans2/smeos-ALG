# Pattern UX-P11 — Entitlement & Permission Gate

## Mục tiêu
Thực thi 03c UX-018: chức năng ngoài quyền hoặc ngoài gói không biến mất âm thầm.

## Quy tắc
- Hiển thị trạng thái khóa + lý do + đường đi tiếp (xin quyền / nâng gói).
- Quyết định dựa trên capability từ server, không dựa `roleKey` phía client.
- Tài nguyên thuộc tổ chức khác: không gợi ý sự tồn tại (quy tắc 404).
- Nút bị khóa phải có lý do đọc được bằng trình đọc màn hình.
