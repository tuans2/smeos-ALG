# Pattern UX-P01 — Upload & Generate

## Mục tiêu
Cho phép người dùng đưa đầu vào và yêu cầu hệ thống tạo kết quả với ít thao tác nhất.

## Lớp disclosure
Theo thang L0–L4 + SYS (03c §2):
- L0/L1: tải/chọn đầu vào, CTA chính, chi phí/lượt dự kiến (UX-019), trạng thái, kết quả.
- L2: lựa chọn chỉ liên quan đến ngữ cảnh (ví dụ tỷ lệ ảnh theo kênh).
- L3/L4: tùy chỉnh nâng cao trong `Disclosure` "Tùy chỉnh thêm".
- SYS: validation, tạo task, xử lý nền, lưu kết quả, retry theo chính sách — chỉ hiện trạng thái qua `TaskStatus`.

## Luồng
1. Chưa có đầu vào: hướng dẫn ngắn và vùng tải/chọn.
2. Đang tải: hiển thị tiến trình upload nếu có.
3. Đầu vào hợp lệ: preview/tóm tắt và CTA.
4. Đầu vào không hợp lệ: giải thích cụ thể và cho phép thay thế.
5. Khi submit: chống double-submit và phản hồi đã tiếp nhận.
6. Khi xử lý: thể hiện trạng thái backend.
7. Khi thành công: kết quả và hành động tiếp theo.
8. Khi lỗi: giữ đầu vào nếu an toàn; cho retry khi hợp lý.

## Không làm
- Không hiển thị nhiều tham số kỹ thuật ngay ban đầu.
- Không giả lập tiến trình hoặc thành công.
- Không xóa đầu vào khi lỗi tạm thời nếu có thể giữ.
- Không tự chạy lại tác vụ tốn phí mà không theo chính sách rõ ràng.

## Verification
- File hợp lệ/không hợp lệ.
- Kích thước/định dạng không được hỗ trợ.
- Mạng chậm/mất kết nối.
- Submit lặp.
- Backend thành công/thất bại/timeout.
- Điều hướng khỏi trang và quay lại.
- Mobile và keyboard.
