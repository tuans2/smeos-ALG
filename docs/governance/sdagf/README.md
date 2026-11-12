# ALG Storage, Data & Artifact Governance Framework (SDAGF)

**Phiên bản:** 0.1.0-draft  
**Trạng thái:** Draft — cần audit repository ALG và phê duyệt trước khi áp dụng  
**Ngôn ngữ:** Tiếng Việt; tên kỹ thuật giữ bằng tiếng Anh khi hữu ích.

## Mục tiêu

SDAGF là framework quản trị vòng đời của dữ liệu và tài sản số trên toàn ALG, từ lúc được tiếp nhận/tạo ra đến khi được xác thực, lưu trữ, xử lý, chia sẻ, phát hành, lưu trữ dài hạn hoặc xóa. Framework bao phủ input, business data, intermediate artifacts, output, technical artifacts và governance records.

Đây là **bộ tiêu chuẩn mục tiêu để đánh giá và điều chỉnh**, không phải mô tả hiện trạng ALG. Không được giả định công nghệ, cấu trúc thư mục, database, cloud provider hoặc kiến trúc hiện có khi chưa kiểm tra.

## Cấu trúc bộ tài liệu

| Tài liệu | Nội dung |
|---|---|
| `01-framework-charter.md` | Mục tiêu, phạm vi, thuật ngữ, nguyên tắc |
| `02-reference-frameworks.md` | Nguồn tham chiếu bên ngoài và cách sử dụng |
| `03-target-architecture.md` | Kiến trúc logic và ranh giới trách nhiệm |
| `04-asset-taxonomy.md` | Phân loại dữ liệu/tài sản |
| `05-storage-routing.md` | Quy tắc chọn nơi lưu trữ |
| `06-identity-metadata-schema.md` | Định danh, metadata và registry |
| `07-access-control-and-operations.md` | Quyền, thao tác và tenant isolation |
| `08-lifecycle-versioning-retention.md` | Trạng thái, phiên bản, retention, deletion |
| `09-provenance-and-processing.md` | Lineage, nguồn gốc, xử lý input-output |
| `10-security-integrity-recovery.md` | Bảo mật, tính toàn vẹn, backup/restore |
| `11-integration-contracts.md` | Hợp đồng tích hợp giữa module và storage |
| `12-audit-observability.md` | Audit events, logs, monitoring |
| `13-assessment-controls.md` | Bộ control để audit hiện trạng |
| `14-implementation-roadmap.md` | Lộ trình triển khai |
| `15-readiness-and-handover.md` | Cổng commercial/production/handover |
| `16-templates.md` | Mẫu ADR, policy exception, asset class, test |
| `AI_AGENT_MASTER_PROMPT.md` | Prompt giao AI coding agent audit theo pha |
| `GLOSSARY.md` | Thuật ngữ chuẩn |

## Quy tắc sử dụng

1. Đưa bộ tài liệu vào repository ALG tại vị trí được chủ dự án phê duyệt.
2. Không sửa code, di chuyển, đổi tên hoặc xóa file trong giai đoạn audit chỉ vì framework đề xuất cấu trúc khác.
3. AI agent phải thu thập bằng chứng thực tế và phân biệt: **Observed Fact**, **Inference**, **Recommendation**, **Decision Required**.
4. Mọi thay đổi phải có kế hoạch, đánh giá tác động, kiểm thử và phê duyệt phù hợp.
5. Không tuyên bố đạt ISO, SOC 2 hoặc một chứng nhận nào chỉ dựa trên việc áp dụng bộ tài liệu này.

## Trạng thái kiểm soát

Các chính sách trong bộ tài liệu là **đề xuất mục tiêu**. Chúng chỉ trở thành chính sách chính thức sau khi được chủ sở hữu ALG phê duyệt, được điều chỉnh theo audit và được tích hợp vào các kiểm soát kỹ thuật tương ứng.
