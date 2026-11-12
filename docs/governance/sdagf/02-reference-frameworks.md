# 02. Reference Frameworks & Standards

## Mục đích

Dùng các nguồn tham chiếu bên ngoài để xây dựng SDAGF. Không nguồn đơn lẻ nào thay thế toàn bộ framework này.

## Nguồn tham chiếu

### W3C PROV
- URL: https://www.w3.org/TR/prov-overview/
- Dùng cho: mô hình hóa entity, activity, agent và quan hệ nguồn gốc.
- Áp dụng: truy vết input, tác vụ xử lý, công cụ/actor và output.
- Không dùng để: thay thế authorization, retention hoặc storage architecture.

### AWS Well-Architected Framework — SaaS Lens
- URL: https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/saas-lens.html
- Dùng cho: kiến trúc SaaS, tenant isolation, vận hành và các đặc thù multi-tenant.
- Áp dụng: đánh giá nguyên tắc tenant-aware resource/data access.
- Lưu ý: có các khuyến nghị gắn với AWS; chỉ dùng nguyên tắc phù hợp, không mặc định ALG phải chạy AWS.

### AWS Well-Architected Framework
- URL: https://docs.aws.amazon.com/wellarchitected/
- Dùng cho: operational excellence, security, reliability, performance efficiency, cost optimization, sustainability.
- Áp dụng: review kiến trúc lưu trữ và vận hành.

### NIST Secure Software Development Framework (SSDF)
- URL: https://csrc.nist.gov/pubs/sp/800/218/final
- Dùng cho: kiểm soát bảo mật trong vòng đời phát triển phần mềm.
- Áp dụng: bảo vệ source, build artifacts, CI/CD, xử lý lỗ hổng và release.

### ISO/IEC 27001
- URL: https://www.iso.org/standard/27001
- Dùng cho: hệ thống quản lý an toàn thông tin và quản trị rủi ro.
- Áp dụng: phân loại thông tin, kiểm soát truy cập, quản lý rủi ro, sự cố và cải tiến.
- Lưu ý: áp dụng framework không đồng nghĩa chứng nhận ISO 27001.

### Cloud object storage documentation
- Google Cloud Storage: https://cloud.google.com/storage/docs
- Azure Blob Storage: https://learn.microsoft.com/en-us/azure/storage/blobs/
- Dùng cho: hiểu các khả năng kỹ thuật như object identity, metadata, lifecycle, versioning, retention và access controls.
- Không dùng làm chuẩn logic duy nhất: cần giữ policy trung lập nhà cung cấp.

### OWASP File Upload Cheat Sheet
- URL: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- Dùng cho: xác thực file upload, giới hạn kích thước, kiểm tra loại file, tên file, lưu trữ an toàn và malware scanning.
- Áp dụng: mọi điểm tiếp nhận file từ người dùng hoặc hệ thống bên ngoài.

### OWASP ASVS
- URL: https://owasp.org/www-project-application-security-verification-standard/
- Dùng cho: yêu cầu xác minh bảo mật ứng dụng.
- Áp dụng: kiểm thử authorization, file handling, session, API và access control.

## Quy tắc sử dụng nguồn tham chiếu

Mỗi control của ALG nên có:
- `control_id`
- yêu cầu nội bộ
- nguồn tham chiếu và phiên bản/ngày truy cập nếu đã xác minh
- phạm vi áp dụng
- cách kiểm tra
- bằng chứng chấp nhận
- mức độ nghiêm trọng nếu không đạt

Không sao chép nguyên văn tài liệu tiêu chuẩn có bản quyền. Ghi nhận tóm tắt, nguồn tham chiếu và cách ALG diễn giải.

## Quy tắc cập nhật

Rà soát nguồn tham chiếu ít nhất theo chu kỳ được Platform Owner phê duyệt, hoặc khi:
- Có thay đổi lớn về kiến trúc.
- Thêm thị trường/ngành chịu quy định mới.
- Có sự cố bảo mật/dữ liệu.
- Thay đổi nhà cung cấp storage hoặc mô hình tenancy.
