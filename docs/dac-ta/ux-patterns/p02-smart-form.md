# Pattern UX-P02 — Smart Form

## Quy tắc
- Mỗi trường phải có mục đích nghiệp vụ.
- Ưu tiên giá trị đã lưu hợp lệ nếu người dùng có quyền.
- Đặt trường theo thứ tự người dùng hiểu, không theo thứ tự database.
- Đánh dấu trường bắt buộc rõ ràng.
- Validation gần trường và có hướng khắc phục.
- Giữ dữ liệu khi validation thất bại.
- Dùng progressive disclosure cho nhóm trường phụ/nâng cao.
- Không tự động điền dữ liệu nhạy cảm hoặc có hậu quả nếu không có cơ sở và quyền phù hợp.
- Với form dài, chia bước khi có nhóm nhiệm vụ tự nhiên hoặc giúp giảm lỗi thực tế.

## Verification
- Dữ liệu đầy đủ/thiếu/sai định dạng.
- Dữ liệu đã lưu cũ.
- Thay đổi ngữ cảnh.
- Submit lặp.
- Mobile keyboard.
- Keyboard-only/focus.
