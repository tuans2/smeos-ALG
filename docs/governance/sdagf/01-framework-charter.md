# 01. Framework Charter

## 1. Mục đích

Thiết lập một cách quản trị nhất quán, có thể kiểm tra và tự động hóa đối với mọi dữ liệu và tài sản số được ALG tiếp nhận, tạo ra, xử lý, lưu trữ hoặc phát hành.

## 2. Kết quả mong muốn

- Mỗi loại dữ liệu/tài sản có nơi lưu trữ và nguồn chuẩn được xác định.
- Mọi tài sản quan trọng có định danh ổn định, metadata cần thiết và chủ sở hữu trách nhiệm.
- Các module không tự ý vượt qua chính sách nền tảng.
- Có thể truy vết từ input đến output và ngược lại khi phù hợp.
- Quyền truy cập được kiểm soát theo người dùng, tenant, vai trò, mục đích và trạng thái.
- Retention, archival, legal hold và deletion có quy tắc, bằng chứng và cơ chế kiểm tra.
- Các quy tắc trọng yếu được thực thi tự động ở runtime, CI/CD hoặc quy trình review.
- Có bằng chứng kiểm thử đủ để đánh giá commercial readiness, production readiness và client handover.

## 3. Phạm vi

Bao gồm:
- Input: upload, nhập liệu, API requests, prompt, import, webhook payload.
- Business data: sản phẩm, đơn hàng, khách hàng, giá, cấu hình nghiệp vụ.
- Intermediate data/artifacts: file tạm, cache, bản chuyển đổi, dữ liệu xử lý.
- Output: ảnh, PDF, báo giá, báo cáo, export, nội dung do AI tạo.
- Technical artifacts: source code, build artifacts, migration, test reports, configuration artifacts.
- Governance records: audit events, version history, provenance, approval records, policy decisions.

Không mặc định rằng mọi đối tượng đều phải nằm trong cùng một hệ thống vật lý. Framework chuẩn hóa cách lựa chọn và kiểm soát các hệ thống lưu trữ khác nhau.

## 4. Ngoài phạm vi mặc định

Các nội dung sau cần liên kết với chính sách chuyên biệt nếu ALG có yêu cầu:
- Hồ sơ pháp lý hoặc dữ liệu chịu quy định ngành đặc thù.
- Hồ sơ kế toán/thuế có thời hạn lưu theo luật.
- Hệ thống quản lý khóa, secrets hoặc danh tính doanh nghiệp.
- Hệ thống backup/DR của nhà cung cấp hạ tầng.
- Quy trình xử lý dữ liệu cá nhân theo pháp luật từng thị trường.

Không được hiểu “ngoài phạm vi mặc định” là miễn kiểm soát.

## 5. Nguyên tắc bắt buộc

1. **Classify before route:** phân loại dữ liệu trước khi quyết định nơi lưu.
2. **Metadata is not the payload:** registry/metadata không thay thế nội dung file hoặc dữ liệu nghiệp vụ.
3. **One canonical owner:** mỗi loại dữ liệu có một nguồn chuẩn được chỉ định; bản sao phục vụ đọc phải được nhận diện là bản sao.
4. **Least privilege:** chỉ cấp quyền tối thiểu cần cho mục đích đã xác định.
5. **Tenant isolation by design:** không dựa vào frontend để bảo đảm cách ly tenant.
6. **Immutable identity:** định danh tài sản không đổi khi vị trí vật lý hoặc tên file thay đổi.
7. **Traceability:** ghi nhận nguồn gốc và các biến đổi quan trọng.
8. **Explicit lifecycle:** không để tài sản tồn tại vô hạn chỉ vì chưa có quy tắc xóa.
9. **Fail safely:** khi không xác định được phân loại hoặc quyền, không phát hành hay chia sẻ tài sản ra ngoài.
10. **Evidence over assertion:** mọi kết luận audit cần bằng chứng có thể kiểm tra.
11. **No destructive migration without approval:** không xóa, di chuyển hoặc ghi đè hàng loạt trước khi được phê duyệt và có rollback plan.
12. **Technology-neutral policy:** tiêu chuẩn logic không buộc dùng một cloud provider hoặc database cụ thể.

## 6. Vai trò

- **Platform Owner:** chịu trách nhiệm framework và quyết định chính sách cấp nền tảng.
- **Data/Asset Owner:** chịu trách nhiệm mục đích, chất lượng, quyền sử dụng và retention của một nhóm tài sản.
- **Module Owner:** tích hợp module với contract nền tảng.
- **Security Owner:** xác định phân loại nhạy cảm, yêu cầu truy cập, sự cố và kiểm soát bảo mật.
- **Operations Owner:** backup, restore, monitoring, incident handling.
- **Developer/AI Agent:** thực hiện theo chính sách; không tự phê duyệt ngoại lệ.
- **Approver:** người được chỉ định phê duyệt thay đổi rủi ro hoặc ngoại lệ.

Một người có thể đảm nhiệm nhiều vai trò trong tổ chức nhỏ, nhưng trách nhiệm phải được ghi rõ.

## 7. Định nghĩa hoàn thành

Framework chỉ được coi là triển khai khi:
- Các asset class chính được xác định.
- Storage routing và metadata contract được phê duyệt.
- Quyền truy cập và tenant isolation được kiểm tra.
- Lifecycle/retention/deletion được định nghĩa cho từng nhóm.
- Các control bắt buộc có bằng chứng hoặc finding được chấp nhận chính thức.
- Có test cho luồng quan trọng và failure paths.
- Có runbook, backup/restore evidence và hướng dẫn bàn giao phù hợp.
