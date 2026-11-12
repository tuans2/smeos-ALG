# 07 — Audit repository và tài liệu

## 1. Cấu trúc repository

```
ALG/
├── src/
│   ├── app/            Next.js App Router — (app) 73 trang, (platform) 22, (auth) 1, công khai 8; api/ 440 route
│   ├── components/     45 thư mục theo miền + ui/ (design system)
│   ├── core/           17 gói lõi dùng chung (tenancy, rbac, platform, ai, http, observability, governance…)
│   ├── modules/        45 mô-đun nghiệp vụ: domain / use-cases / infra / adapters
│   ├── layers/         chain-os, contracts (2 thư mục — vai trò chưa rõ so với modules/)
│   ├── lib/            tiện ích, i18n, ui-system, session, feature-catalog (990 dòng)
│   ├── instrumentation.ts   khởi động Sentry + 3 lịch nền
│   └── proxy.ts        middleware gắn x-request-id
├── workers/            Python: media_ai, vision, shared, tests (45 tệp test)
├── prisma/             schema.prisma (3.967 dòng), 32 migrations, seed/
├── tests/              unit, tenant (137), platform (10), e2e, helpers
├── scripts/            70 tệp: deploy CSDL, ratchet, sinh schema, nạp dữ liệu, bàn giao
├── docs/               417 .md + 30 tệp nhị phân (11 MB)
├── golden/             bộ ảnh vàng (nghiệm thu Vision)
├── public/             brand, images, templates, mock-data, data
├── .github/workflows/  ci.yml, codeql.yml
├── .agents/ .claude/   bộ luật, skill, standard, hook cho AI agent (export-ignore)
└── render.yaml · vercel.json · docker-compose.yml · cron-job-entry.txt
```

### Đánh giá

| Tiêu chí | Kết quả | Bằng chứng / ID |
|---|---|---|
| Tách lớp theo mô-đun | Tốt, nhất quán ở đa số mô-đun | `src/modules/*` |
| Mã dùng chung | `src/core` + `src/lib`; ranh giới `lib` vs `core` không được định nghĩa thành văn | — |
| `src/layers/` | Song song với `modules/`, chỉ 2 thư mục; chưa thấy tài liệu giải thích | NV |
| Kích thước tệp | 105 tệp > 350 dòng (luật #7) | ARC-013 |
| Cấu hình | Một `.env.example` (14 KB, có chú thích) + `src/lib/env.ts` kiểm bằng zod | Tốt, nhưng `STORAGE_*` không bắt buộc (ARC-006) |
| Tách môi trường | Chỉ dev (docker-compose cổng 5433) và production (`render.yaml`) | ARC-005 |
| Quản lý dependency | `package-lock.json`, Dependabot, `npm audit`; `xlsx` từ CDN; worker `requirements.txt` ghim phiên bản | ARC-031 |
| Build & release | Không có tag/release/CHANGELOG; deploy = merge `main` | ARC-005 |
| Cấu hình thừa/lỗi thời | `vercel.json` (cron Vercel), `cron-job-entry.txt` (đường dẫn `/Users/tuan/Projects/floraos-core`), `predev:all` gọi `brew` | ARC-026 |
| Dữ liệu mẫu trong `public/` | `public/mock-data` được phục vụ công khai | NV nội dung (cần rà) |
| Tên thư mục trùng khác hoa/thường | `docs/Audit/` và `docs/audit/` | ARC-015 — checkout trên macOS/Windows (không phân biệt hoa/thường) sẽ trộn hai thư mục |
| Tên tệp/thư mục có dấu, khoảng trắng | `docs/nâng cấp chức năng cho cửa hàng/`, `docs/Nhập liệu/`, `docs/Audit/Checklist so sánh ` (dấu cách cuối) | ARC-015 — dễ lỗi script, NFC/NFD (TRANG_THAI §2 đã ghi một sự cố) |

### Khả năng bàn giao và triển khai độc lập

- `git archive` + `export-ignore` loại `CLAUDE.md`, `AGENTS.md`, `.agents/`, `.claude/` khỏi bản giao. `npm run handover:check` chạy trong audit: **"Bản giao (HEAD) sạch: 6016 mục"**, kèm 4 cảnh báo tệp có tên giống tài liệu agent vẫn nằm trong `docs/` (`AI_AGENT_MASTER_PROMPT.md`, `AI_CODING_AGENT_MASTER_PROMPT_VI.md`, …).
- Toàn bộ `docs/` — gồm audit nội bộ, kế hoạch, nhật ký quyết định, tài liệu khách hàng ALG (`docs/Audit/*.docx`) — đi kèm bản giao. Không có ranh giới "tài liệu khách" vs "tài liệu nội bộ" (ARC-015, ARC-028).
- Triển khai độc lập bởi bên nhận: khả thi trên Render nhờ `render.yaml`; các bước tay (biến `sync: false`, cấp superadmin bằng script, xoay khoá) nằm rải trong HO_SO_BAN_GIAO và runbook.
- Phụ thuộc repo khác: `dev:all` gọi `../SocialFlow`, `../LocalBudd`; tích hợp SSO/proxy với hai ứng dụng này (`SOCIALFLOW_URL`, `LOCALBUDD_URL`). Bên nhận cần biết hai repo này không nằm trong gói.

## 2. Cấu trúc tài liệu

| Tầng | Tài liệu | Vai trò |
|---|---|---|
| Hiến pháp | `docs/00-DOCUMENTATION-CONSTITUTION.md` (145 dòng) | Quy tắc quản trị tài liệu, cấp độ ưu tiên |
| Sổ đăng ký | `docs/00-DOCUMENTATION-REGISTRY.yaml` (82 mục, `total_documents: 75` ghi trong tệp — lệch 7) | Tra SSOT theo miền; mọi đường dẫn đã kiểm còn tồn tại |
| Level 1 | `ALG_SAAS_TARGET_ARCHITECTURE_V2.md`, `TRANG_THAI.md` (1.290 dòng) | Kiến trúc đích; trạng thái |
| Đặc tả | `docs/dac-ta/00–22` + schema JSON | PRD → API → CSDL → tích hợp; 06/07 kiểm tự động |
| Kế hoạch/kiến trúc miền | `docs/kien-truc/` 43 tệp | Nhiều `KE_HOACH_*` (kế hoạch) lẫn với SSOT |
| ADR | `docs/adr/` 15 | Quyết định kiến trúc |
| UX | `docs/dac-ta/03*`, `ux-patterns/`, `screen-contracts/`, `docs/ui-ux/` | Hiến pháp UX, mẫu, hợp đồng màn hình |
| Audit | `docs/audit/`, `docs/Audit/`, `docs/audit/sdagf-2026-10`, nay thêm `docs/audit/architecture-audit/` | — |
| Vận hành/bàn giao | `HO_SO_BAN_GIAO.md`, `OPERATIONS_RUNBOOK.md`, `VAN_HANH_*.md`, `QUY_TRINH_BAN_GIAO_SACH_TENANT.md` | Nhiều mục [CẦN XÁC NHẬN] |
| Người dùng | `docs/production-feature-map/` | Hướng dẫn cho vai Điều hành |
| Lưu trữ | `docs/archive/` | historical, merged, drafts, guides |

Chỉ 82/417 tệp `.md` nằm trong sổ đăng ký (~20%); phần còn lại không có trạng thái (CANONICAL/ARCHIVED…) chính thức. Có bản sao lưu thủ công (`ALG_STORE_13_USER_JOURNEYS_DETAIL_SPEC_BACKUP.md`). Tài liệu mang tên cũ "ALG" song song tên mới "ALG" — thương hiệu chưa thống nhất trong tài liệu.

### Độ chính xác tài liệu so với mã

| Kiểm | Kết quả |
|---|---|
| `node scripts/check-docs.mjs` (endpoint, bảng, enum, cách ly tenant, tài liệu agent) | **✓ Tài liệu khớp mã** |
| `TRANG_THAI.md` §3 (bốn repo) và §6 (việc kế tiếp) | **Lỗi thời**: tên repo `floraos-core`, việc P5/P13 tháng 9, "anh Tony chạy `prisma db push`", dọn P24 đã xong nhưng còn ghi chưa (ARC-014) |
| README → `docs/kien-truc/HARVEST_MANIFEST.md` | Sai đường dẫn (nay ở `docs/archive/historical/`) |
| Cổng dev | `CLAUDE.md`/AGENT_RULES 3100 vs `package.json`/README 3200 |
| `src/core/rbac/README.md` | 31 mã trần cứng (thật 49) |
| `CLAUDE.md` | 78 lỗi ESLint cũ (baseline hiện 58) |
| Runbook §7 | 95 tệp > 350 dòng (đo được 105) |
| HO_SO_BAN_GIAO §4 "AI: mọi lời gọi qua `callCapability`" | Không đúng cho worker Python (ARC-009) |

## 3. AGENTS.md / CONTEXT.md / quản trị agent

| Tệp | Hiện trạng | Đánh giá |
|---|---|---|
| `CLAUDE.md` (6 KB) | Ngắn, có 9 luật bất biến, danh sách "dừng hỏi PO", DoD khớp CI, bẫy an toàn, thứ bậc xung đột | Tốt; lệch số liệu nhỏ |
| `AGENTS.md` (665 dòng, 111 KB) | Lệnh, quy ước (416 dòng), kiến trúc luồng kép, thứ tự pha, luật thu hoạch, bản đồ, bẫy | Quá dài so với vai "ngữ cảnh"; trùng nội dung với AGENT_RULES/skill |
| `.agents/AGENT_RULES.md` | 3 tầng (Universal/Project/Skills), 12 anti-pattern, 15 mẫu lỗi đã gặp | Đánh số thiếu §12; tên "3-Tier" dễ nhầm với "4 tầng" sản phẩm |
| Skill (13) + standards (20) | Theo miền, có trạng thái ✅/🟡/🔴 đối chiếu mã | Tốt (standard 01 ghi trung thực phần chưa áp) |
| Hook `.claude/hooks/guard-bash.mjs` | Chặn `vitest run` trần, hỏi trước Prisma ghi DB không-local | Tốt |
| `CONTEXT.md` / `AGENT.md` | Không tồn tại | Vai trò do `CLAUDE.md` + `TRANG_THAI.md` đảm nhận; không cần tạo nếu thống nhất |

Thứ bậc chỉ dẫn (CLAUDE.md): người dùng → AGENT_RULES → Hiến pháp tài liệu → kiến trúc/TRANG_THAI → skill → AGENTS.md → mã. Rõ ràng, nhưng `TRANG_THAI.md` (cấp cao) đang lỗi thời — agent được hướng dẫn đọc nó đầu tiên (AGENT_RULES §14 #11 đã ghi một sự cố tương tự).

## 4. Sẵn sàng bàn giao khách

| Hạng mục bàn giao | Có | Thiếu |
|---|---|---|
| Mã nguồn sạch tài liệu agent | `export-ignore`, `handover:check` | `docs/` nội bộ vẫn đi kèm |
| Kiến trúc | V2 + 4 tầng | Bản "kiến trúc hiện trạng" tách khỏi "kiến trúc đích" |
| CSDL | Đặc tả 07 | ERD |
| API | Đặc tả 06 nội bộ | Tài liệu API cho tích hợp bên thứ ba / OpenAPI |
| Triển khai/cấu hình | `render.yaml`, `.env.example`, runbook §1–3 | Môi trường staging, quy trình phát hành có phiên bản |
| Vận hành | Runbook §4–5, §10–11 | Sao lưu/PITR, diễn tập khôi phục, người trực |
| Bảo mật | HO_SO_BAN_GIAO §4 | Báo cáo pentest, chính sách xử lý sự cố bảo mật |
| Quản trị | — | Hướng dẫn quản trị nền tảng (console `/van-hanh`) |
| Người dùng | Hướng dẫn vai Điều hành | Các vai khác (Sale, Điều phối, Marketing, CSKH, Cửa hàng) |
| Hỗ trợ/SLA | Mẫu bảng runbook §8 | Nội dung (trống) |
| Bàn giao quyền truy cập | Danh mục trong runbook §8 | Trống |

Kết luận: **Chưa sẵn sàng bàn giao** (ARC-028).
