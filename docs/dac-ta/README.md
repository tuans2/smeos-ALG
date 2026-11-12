# Bộ đặc tả `floraos-core`

Tài liệu để viết mã. Kiến trúc nền và quyết định gốc nằm ở `../kien-truc/`.

## Thứ tự đọc

| # | Tệp | Trả lời câu hỏi |
|---|---|---|
| 00 | `00-PRD.md` | Xây cái gì, cho ai, đạt là thế nào |
| 01 | `01-technical-requirements.md` | Ràng buộc nào phải thoả, mã yêu cầu để tra ngược |
| 02 | `02-function-catalog.md` | Từ vựng quyền — dải mã A–T, và cách đọc con số từ mã nguồn |
| 03 | `03-ux-architecture.md` | Người dùng thấy gì, đi qua những màn hình nào |
| 04 | `04-frontend-architecture.md` | Giao diện dựng bằng gì, theo lối nào |
| 05 | `05-backend-architecture.md` | Máy chủ chia lớp thế nào, worker nối vào đâu |
| 06 | `06-api-specification.md` | Endpoint nào, năng lực nào gác, trả về gì |
| 07 | `07-database-specification.md` | Bảng nào, cột nào, vì sao |
| 08 | `08-integration-specification.md` | Core phơi gì ra, engine ngoài đọc thế nào |
| 09 | `09-du-lieu-mau-experience.md` | Workspace dùng thử nạp sẵn những gì |
| 10 | `10-ai-orchestration.md` | Gọi AI thế nào — năng lực, sổ đăng ký, định tuyến, chấm điểm, tri thức |
| — | `ALG-Intelligence-Engine_FINAL_v2.0.md` | Đặc tả đầy đủ Market Intelligence + Product Intelligence (Đợt A và các đợt sau) — nguồn dẫn hướng có hiệu lực, gộp cả bản v1.0 (giữ ở `ALG-Core_Market_Intelligence_Engine_FINAL.md`, chỉ để truy vết lịch sử) |
| — | `Checklist_Thuc_Thi.md` | Pha này xong chưa |
| — | `Roadmap.md` | Đang ở đâu, gì đã đổi so với kế hoạch |
| — | `TECHNICAL_DEBT.md` | Đang nợ gì, trả khi nào |
| — | `../kien-truc/BO_TINH_NANG_HIEN_TRANG.md` | Bộ tính năng hoàn chỉnh đối chiếu với mã thật — cái gì đã có, cái gì còn phải xây |

## Luật của bộ tài liệu

**Một sự thật, một chỗ.** Bảng mã năng lực chỉ có ở tài liệu 02. Lược đồ chỉ có ở 07 và `prisma/schema.prisma`. Lộ trình chỉ có ở kiến trúc V2 mục 15. Trạng thái theo tính năng chỉ có ở `BO_TINH_NANG_HIEN_TRANG.md`. Các tệp khác dẫn chiếu, không chép lại.

**Con số sinh từ mã nguồn.** Tổng số mã năng lực và tổng số mã có trần cứng không nằm dưới dạng hằng số ở bất kỳ tệp nào trong bộ này — chúng đọc từ `capability-catalog.ts` và `capability-catalog.test.ts`. Bảng năng lực thu hoạch ở tài liệu 02 sinh từ `maChucNang.ts`. Hình dạng hợp đồng Vision đọc từ `Schema.json`. Danh sách cột `assets` đọc từ cơ sở dữ liệu thật của SocialFlow. Con số nào không trích được từ đâu thì không nằm trong bộ tài liệu này.

**Thứ bậc khi mâu thuẫn.** `../kien-truc/ALG_SAAS_TARGET_ARCHITECTURE_V2.md` là Level 1, thắng tuyệt đối. Bộ đặc tả này là Level 2. Gặp mâu thuẫn thì dừng và báo chủ sản phẩm, không tự chọn bên nào.

Chín điểm lệch đã phát hiện giữa tài liệu và mã thật ghi ở `../kien-truc/RA_SOAT_THU_HOACH.md`, và những điểm còn chờ xác nhận nằm trong `TECHNICAL_DEBT.md`.
