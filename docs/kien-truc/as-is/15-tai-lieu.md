# 15. Documentation Inventory — As-Is

Thư mục `docs/` có 228 tệp (153 tệp `.md`) tại commit `9b4a54b`, chưa tính bộ tài liệu này. Quản trị bởi `docs/00-DOCUMENTATION-CONSTITUTION.md` (5 tầng thẩm quyền, vòng đời `CANONICAL/SUPPORTING/DRAFT/HISTORICAL/ARCHIVED`) và `docs/00-DOCUMENTATION-REGISTRY.yaml` (69 mục `- id:` trước khi thêm mục của tài liệu này, nay 70; trường `total_documents` ghi 67). Tài liệu chỉ được liệt kê ở đây — nội dung không dùng làm bằng chứng hành vi.

## 15.1 Theo loại

| Loại | Tài liệu | Ghi chú |
|---|---|---|
| README | `README.md` (gốc), `workers/README.md`, `tests/README.md`, `tests/tenant/README.md`, `src/modules/README.md`, `src/app/api/v1/README.md`, `src/core/rbac/README.md`, `src/core/tenancy/README.md`, `docs/dac-ta/README.md`, `docs/dac-ta/screen-contracts/README.md`, `docker/iopaint/README.md`, `workers/media_ai/guard/README.md`, 9 tệp `README.md` trong `src/modules/*/{adapters,infra}/` | Một số mô tả trạng thái cũ hơn mã (xem [16](16-quan-sat-hien-thuc.md)) |
| Hướng dẫn cho agent | `CLAUDE.md`, `AGENTS.md` (~60 KB), `.agents/AGENT_RULES.md`, `.agents/skills/*/SKILL.md` (7), `.claude/skills/*` (7), `.claude/hooks/guard-bash.mjs` | `check:docs` kiểm đường dẫn/lệnh trong các tệp này có thật |
| Kiến trúc (Level 1) | `docs/kien-truc/ALG_SAAS_TARGET_ARCHITECTURE_V2.md`, `docs/kien-truc/TRANG_THAI.md` (~1.280 dòng, nhật ký trạng thái), `docs/kien-truc/Nâng cấp tasks/ALG_Core_v2_3_FINAL_Hardening_Patch.md` | Kiến trúc **đích** và nhật ký |
| PRD & yêu cầu | `docs/dac-ta/00-PRD.md`, `01-technical-requirements.md`, `02-function-catalog.md`, `Roadmap.md`, `Checklist_Thuc_Thi.md`, `TECHNICAL_DEBT.md` | |
| UX | `docs/dac-ta/03-ux-architecture.md`, `03a-ux-constitution.md`, `03b-role-ux.md`, `docs/kien-truc/ALG_ROLE_UX_EXECUTION_CONTRACT.md`, `docs/ALG-UIUX-10-chuc-nang.md`, `docs/UIUX-Execution-Checklist.md`, `docs/dac-ta/screen-contracts/*.md` (39 tệp, một tệp mỗi màn), `docs/dac-ta/Wireframe UI/` | |
| Frontend / Backend | `docs/dac-ta/04-frontend-architecture.md`, `05-backend-architecture.md`, `docs/kien-truc/UNIFIED_SHELL.md` | |
| API | `docs/dac-ta/06-api-specification.md` (được `check:docs` đối chiếu tự động với 242 route) | |
| Database | `docs/dac-ta/07-database-specification.md` (~2.400 dòng; `check:docs` đối chiếu model/enum với `schema.prisma`) | |
| Tích hợp & AI | `docs/dac-ta/08-integration-specification.md`, `10-ai-orchestration.md`, `docs/kien-truc/ALG_AI_CHAT_ASSISTANT_OMNICHANNEL_ARCHITECTURE.md` | |
| Module chuyên đề | Creative Studio (`FLORAOS_CREATIVE_STUDIO_*`), Template (`ALG_TEMPLATE_SYSTEM_SSOT.md`, `…ENGINE_ARCHITECTURE.md`), M04 (`M04_ALG_PRODUCT_IMAGE_OPTIMIZER_FULL.md`), Market Intelligence (`ALG_MARKET_INTELLIGENCE_ARCHITECTURE.md`, `ALG-Intelligence-Engine_FINAL_v2.0.md`), Điều phối (`FLORAOS_COORDINATOR_*`, thư mục `docs/ALG_COORDINATOR_AI_AGENT_PACKAGE/` 12 `.md` + 1 `.docx`), Thẻ chào (`HIEN_TRANG_THE_CHAO*.md`, `THE_CHAO_HANH_TRINH_KHACH.md`, `KHAC_PHUC_THE_CHAO.md`, thư mục trong `Nâng cấp tasks/`), Business profile, Product-to-Market journey, 13 journeys | |
| Kế hoạch | `docs/kien-truc/KE_HOACH_*.md` (5 tệp) | Mô tả việc dự định |
| Quy ước & từ điển | `QUY_UOC_DEM.md`, `TU_DIEN_TU_CAM_CONTENT_NGANH_HOA.md`, `QUYET_DINH_RS_18_09.md`, `BO_ANH_VANG.md` | |
| Schema máy đọc | `docs/dac-ta/schemas/{creative-studio,coordinator,content-engine}/*.json` (sinh/kiểm bằng `gen:schemas:*` / `check:schemas:*`) | |
| Lưu trữ | `docs/archive/{audit-logs,drafts,guides,historical,merged}/` (21 tệp) | Không có thẩm quyền theo hiến pháp |
| Dữ liệu đánh giá AI | `golden/` (hướng dẫn gán nhãn, báo cáo độ chính xác CSV) | |
| Deployment | Không có tài liệu triển khai riêng; thông tin nằm trong `render.yaml` (chú thích), `README.md` mục "Chạy tại máy", `docker-compose.yml`, `.env.example` | |
| Tài liệu người dùng | Trong ứng dụng: `/tri-thuc` (nội dung tĩnh `components/knowledge-base/knowledge-data`), `FeatureGuidanceCard` trên nhiều màn, trợ lý Copilot nhánh `SAAS_HELP` (`saas-knowledge-base.ts`), `/chinh-sach-bao-mat` | Không có tài liệu người dùng ngoài ứng dụng |
| Tài liệu này | `docs/kien-truc/as-is/` | Snapshot `SUPPORTING` |

## 15.2 Tài liệu có trong `docs/` nhưng không có mục trong registry

`docs/kien-truc/BO_ANH_VANG.md`, `BO_TINH_NANG_HIEN_TRANG.md`, `HIEN_TRANG_THE_CHAO.md`, `HIEN_TRANG_THE_CHAO_DE_HIEU.md`, `KHAC_PHUC_THE_CHAO.md`, `THE_CHAO_HANH_TRINH_KHACH.md`; `docs/dac-ta/BAO_CAO_LAYOUT_VA_CHUC_NANG_ADMIN.md`, `ALG_JOURNEY_FIRST_UX_LANDING_CATALOG_EXECUTION_SPEC_FINAL.md`, `ALG_STORE_13_USER_JOURNEYS_DETAIL_SPEC_BACKUP.md`, `README.md` (dò theo đường dẫn chính xác trong `docs/00-DOCUMENTATION-REGISTRY.yaml`; chưa dò các thư mục con khác).
