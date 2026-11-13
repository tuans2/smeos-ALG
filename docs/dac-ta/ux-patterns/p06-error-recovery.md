# Pattern UX-P06 — Error Recovery

## Cấu trúc thông báo lỗi
1. Điều gì đã xảy ra — câu ngắn, dễ hiểu.
2. Ảnh hưởng gì đến dữ liệu/tác vụ.
3. Người dùng nên làm gì tiếp theo.
4. Có thể thử lại không; nếu có, nút hành động rõ ràng.
5. Mã tham chiếu hỗ trợ nếu hữu ích và an toàn.

## Quy tắc
- Không chỉ hiện stack trace, mã backend hoặc thuật ngữ nội bộ.
- Không đổ lỗi cho người dùng.
- Không hứa rằng dữ liệu đã lưu nếu chưa xác minh.
- Giữ dữ liệu hợp lệ khi có thể.
- Không tự retry các hành động có thể gây phí hoặc tác dụng phụ nếu không có chính sách idempotency/ủy quyền phù hợp.
- Với lỗi quyền, không tiết lộ tài nguyên mà người dùng không được phép xem.

## Verification
- Validation phía client.
- Lỗi server.
- Timeout/mạng.
- Lỗi quyền.
- Retry an toàn và retry không an toàn.
- Khôi phục dữ liệu nhập.

## Thực thi trong repo
- Mã tham chiếu hỗ trợ theo 03c UX-020; lỗi quyền chéo tổ chức giữ quy tắc 404.
- Dùng `InlineError`/`EmptyState` hiện có trong `src/components/ui/`, không tạo biến thể mới.
