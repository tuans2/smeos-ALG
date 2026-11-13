# Pattern UX-P04 — Background Task

## Mục tiêu
Cho phép tác vụ kéo dài tiếp tục mà người dùng không phải giữ màn hình mở.

## Trạng thái
Chọn các trạng thái cần thiết theo backend: pending/queued/running/succeeded/failed/canceled.

## Yêu cầu
- Task có định danh bền vững nếu người dùng cần quay lại.
- UI lấy trạng thái từ nguồn dữ liệu có thẩm quyền.
- Có thể tiếp tục làm việc khác khi không gây rủi ro.
- Có cách quay lại kết quả: danh sách tác vụ, thông báo trong ứng dụng hoặc điểm vào phù hợp.
- Lỗi nói rõ hành động tiếp theo.
- Retry có giới hạn, có kiểm soát và không tạo tác vụ trùng ngoài ý muốn.
- Không hiển thị phần trăm tiến độ giả nếu backend không cung cấp tiến độ đáng tin cậy.
- Nếu chỉ biết “đang xử lý”, dùng trạng thái đó thay vì phần trăm giả.
- Quy tắc thông báo phải tôn trọng quyền riêng tư và lựa chọn người dùng.

## Verification
- Refresh/reopen.
- Điều hướng giữa các màn hình.
- Backend chậm.
- Task thất bại.
- Retry.
- Hai lần submit.
- Người dùng không còn quyền truy cập tác vụ.

## Thực thi trong repo
- Từ vựng và ánh xạ trạng thái: `src/lib/ui-system/task-state.ts` (03c UX-016).
- Hiển thị: `src/components/ui/task-status.tsx`; hoàn tất khi ở màn khác → trung tâm thông báo (UX-024).
