# Từ điển thuật ngữ UI (03c UX-026)

Một khái niệm — một cách gọi. **Đây là bảng thuật ngữ UI duy nhất của repo**; `docs/dac-ta/ALG_UX_WRITING_GLOSSARY.md` chỉ giữ giọng điệu và mẫu câu thông báo, không định nghĩa từ (gộp 07/11/2026).

Cột "Không dùng" là đầu vào cho lint R16 (`scripts/ux-lint/rules-pd.ts`, danh sách `GLOSSARY_BANNED`). R16 hiện tự động bắt: Worker, render, job, P\d, BOM, Master Index, PII, Control Tower, payload, tenant, M0–M5, mã chức năng M01–M19, mức R1–R9, Sale Pitch — trong chữ JSX, thuộc tính hiển thị của thẻ và giá trị các khoá hiển thị (`label`, `title`, `description`…) trong mảng/object; các dòng trạng thái tác vụ do R14 + `task-state.ts` thực thi.

| Khái niệm | Dùng | Không dùng trên UI |
|---|---|---|
| Tác vụ đang chạy | Đang xử lý | Đang chạy, processing, running |
| Tác vụ đang chờ | Đang chờ xử lý | Trong hàng đợi, queued, pending |
| Tác vụ hoàn tất | Đã xong | Completed, done, succeeded |
| Tác vụ thất bại | Chưa xong được | Lỗi hệ thống, failed, error |
| Thiết lập nâng cao | Tùy chỉnh thêm | Khác, Advanced, Nâng cao (đứng một mình) |
| Đơn vị tính AI | credit (thuật ngữ sản phẩm đã thiết lập — xem ghi chú luật R12 trong `scripts/ux-lint/rules.ts`) | Token, lượt, tín dụng |
| Mã tra cứu lỗi | Mã hỗ trợ | Request ID, trace ID |
| Máy xử lý nền | hệ thống (hoặc bỏ hẳn) | Worker |
| Dựng video/ảnh | Dựng, Đang dựng video | render, Render |
| Tác vụ | tác vụ (hoặc bỏ mã) | job |
| Bước duyệt | tên bước nghiệp vụ: Duyệt kịch bản, Duyệt video | P1, P2 … P9 |
| Định lượng sản phẩm | Định lượng nguyên vật liệu, Công thức chế tác | BOM, Bill of Materials |
| Danh mục chuẩn | Danh mục tổng hợp, Thư viện chuẩn | Master Index |
| Dữ liệu cá nhân | Thông tin cá nhân khách hàng | PII |
| Tiến độ đơn | Tiến độ xử lý kèm tên bước (Nhận đơn → Chế tác → Giao hàng) | M0 … M5, M-Phases |
| Màn điều phối mạng lưới | Tháp điều phối đơn | Control Tower |
| Dữ liệu biểu mẫu | Dữ liệu gửi lên, Thông tin nhập liệu | Payload, Request body |
| Đơn vị thuê bao | Cửa hàng (StoreOS) hoặc Doanh nghiệp / Tổ chức (tầng trên) | Tenant |
| Mã chức năng nội bộ | tên chức năng (Phân tích ảnh, Dựng video…) | M01, M01a … M19 |
| Mức rủi ro thu thập dữ liệu | Rủi ro cao, Tiêu chuẩn | R1, R2 |
| Kịch bản bán hàng đã chốt | Kịch bản tư vấn | Sale Pitch, Sales Pitch |

## Động từ thao tác

| Thao tác | Dùng | Tránh |
|---|---|---|
| Tạo | Tạo {đối tượng} — Tạo đơn hàng, Tạo sản phẩm | Khởi tạo, Thêm mới (dùng tuỳ tiện) |
| Lưu form | Lưu thay đổi, Lưu bản nháp | Cập nhật (khi người dùng chỉ bấm lưu) |
| Xác nhận | Xác nhận {hành động} — Xác nhận đặt cọc | — |
| Huỷ | Hủy bỏ (hộp thoại), Hủy đơn hàng (nghiệp vụ) | — |
| Xoá | Xóa {đối tượng}, luôn qua hộp thoại xác nhận | — |
| Gửi duyệt | Gửi duyệt | — |
| Tải lại dữ liệu | Làm mới | Refresh, Tải lại |

## Nhãn trạng thái nghiệp vụ

Nhãn trạng thái đơn hàng và nghiệp vụ lấy từ từ điển i18n trong mã (`src/lib/i18n/locales/vi/*.ts`, ví dụ `orders.ts`) — mã là nguồn sự thật, không chép danh sách nhãn vào tài liệu.

Bổ sung từ mới: PR cập nhật bảng này + lint R16 trong cùng commit.
