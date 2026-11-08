# 08 — Findings Register

> Trạng thái: **V** = Verified (có bằng chứng trực tiếp) · **P** = Potential risk (cấu hình/mã cho thấy rủi ro, chưa có số đo/xác nhận production) · **I** = Informational.
> Cùng gốc rễ được gộp — xem `09-CROSS-AUDIT-ANALYSIS.md`. Commit audit: `main@87f30f2`, 07/11/2026.

## Tổng hợp theo mức

| Mức | Số lượng | ID |
|---|---|---|
| CRITICAL | 0 | — |
| HIGH | 6 | TC-01, TC-02, CI-01, SEC-01, RES-01, RES-02 |
| MEDIUM | 16 | TC-03, TC-04, CI-02, CI-03, CI-04, CI-05, CI-06, CI-07, DEP-01, DEP-02, DEP-03, SEC-02, SEC-03, SEC-04, RES-03, RES-04 |
| LOW | 10 | TC-05, CI-08, CI-09, CI-10, DEP-04, DEP-05, DEP-06, SEC-05, RES-05, RES-06 |
| INFORMATIONAL | 9 | TC-06, TC-07, CI-11, DEP-07, DEP-08, SEC-06, SEC-07, RES-07, RES-08 |
| **Tổng** | **41** | |

## Register

| ID | Domain | Finding | Evidence | Severity | Status | Impact | Recommended Action |
|---|---|---|---|---|---|---|---|
| TC-01 | Typecheck | `tsc` cần 2,9–3,1 GB heap > mặc định Node 2.096 MB; script `typecheck` không đặt heap ⇒ OOM local và trên mọi job thiếu `NODE_OPTIONS` | `package.json:68`; đo exit 134 @34 s; CI PR #187 & `0da028b` OOM; heap chỉ ở `ci.yml:46,185` | HIGH | V | Dev không chạy được cổng; CI đỏ ngẫu nhiên theo kích thước mã | Đặt heap trong script/tài liệu; giảm nhu cầu heap (TC-02, TC-04) |
| TC-02 | Typecheck | Kiểm kiểu trong `next build` (typedRoutes) dùng 3,86 GB/4,0 GB (94 %), 4–5 phút; 31 tệp chiếm 72 % thời gian check | Đo 243 s, 7,11 M instantiations; trace top: `dashboard/marketing-workspace.tsx` 25,1 s…; `next.config.ts:41` | HIGH | V | Còn 6 % headroom ⇒ OOM ở lượt tăng mã kế tiếp; chạy 2 lần/run | Một lần kiểm kiểu gồm typed routes; tối ưu 31 tệp nóng (`as Route`); đo lại |
| TC-03 | Typecheck | Cổng `typecheck` không gồm `.next/types`; build có ⇒ 2 kết luận khác nhau cho cùng commit | `ci.yml:75` trước `ci.yml:105`; `tsconfig.json` include | MEDIUM | V | Lỗi route lộ muộn; trùng việc | `next typegen` trước `tsc`; build bỏ kiểm kiểu |
| TC-04 | Typecheck | Prisma Client sinh 400.878 dòng (46 % dòng TS), sàn heap 0,72 GB; `organizations` 121 quan hệ, 6,6 MB | `du`/`wc`; probe 503 tệp | MEDIUM | V | Sàn bộ nhớ tăng theo lược đồ | Theo dõi kích thước generated mỗi PR schema; cân nhắc cấu trúc quan hệ khi thêm bảng |
| TC-05 | Typecheck | `incremental` không được cache trên CI (warm 8,5 s vs cold 62 s) | `ci.yml` không cache tsbuildinfo | LOW | V | Thời gian CI | Cache tsbuildinfo (chỉ tối ưu) |
| TC-06 | Typecheck | Tách src/test không đưa heap dưới trần mặc định (2,74/2,25 GB) và chậm hơn 26 % | đo | INFO | V | Tránh tối ưu sai | Không tách để giảm RAM |
| TC-07 | Typecheck | TS 7 ngoài peer range typescript-eslint 8.70 (`<6.1.0`) ⇒ dùng TS 7 bắt buộc chạy 2 phiên bản | `npm view`, peer deps | INFO | V | Hai trình kiểm kiểu có thể bất đồng | Quyết định kiến trúc của PO |
| CI-01 | CI/CD | `main` không được bảo vệ; PR #187 merge khi check đỏ | `list_branches` `protected:false`; run `42380206615` đỏ, merge 14:14:34 | HIGH | V | Mã đỏ vào `main`; cổng tenant bắt buộc chỉ còn là khuyến nghị | Bật ruleset: PR + check bắt buộc + up-to-date/merge queue |
| CI-02 | CI/CD | Không yêu cầu nhánh cập nhật ⇒ PR xanh tạo `main` đỏ (2 lần 07/11) | `0da028b` OOM sau PR #186 xanh; `0692d9a` tenant đỏ | MEDIUM | V | Kết quả kiểm không nhất quán PR ↔ main; chặn deploy | Merge queue hoặc "require up to date" |
| CI-03 | CI/CD | Pipeline 25–39 m; `test:tenant` 19,8 m tuần tự (TRUNCATE + reseed ở 418 `beforeEach`) | job `web` run `42378209168`; `tests/helpers/database.ts:111-142`; `vitest.config.ts:19` | MEDIUM | V | Vòng phản hồi chậm; runner-phút | Shard tenant theo nhiều DB `_test`; đo trước/sau |
| CI-04 | CI/CD | Trùng: build ×2, kiểm kiểu ×3, `npm ci` ×3, generate ×2, seed ×2 | `ci.yml:53-105,141,192-197` | MEDIUM | V | ~8–9 runner-phút/run; 2 điểm OOM | Build 1 lần + artifact; job chuẩn bị chung |
| CI-05 | CI/CD | Không `concurrency`, không lọc `paths` | `ci.yml:3-7`, `codeql.yml:5-11` | MEDIUM | V | 40 run/9,5 h; ~59 runner-phút/sự kiện | `concurrency` cancel cho PR; `paths-ignore` cho tài liệu (giữ check bắt buộc bằng job rỗng nếu cần) |
| CI-06 | CI/CD | Job `web` tuần tự 23 bước: lỗi sớm skip mọi cổng sau; lỗi hạ tầng không phân biệt lỗi ứng dụng | job `128426037333` 11 bước skipped | MEDIUM | V | Mất tín hiệu, debug chậm | Tách job song song; phân loại OOM/hạ tầng |
| CI-07 | CI/CD | DB test dựng bằng `db push`, không migration ⇒ thiếu CHECK/FUNCTION/TRIGGER/RLS từ SQL | `ci.yml:73`; 9/10/6 migration có SQL tương ứng; `rls.test.ts:30-39` | MEDIUM | V | Cổng cách ly không chạy trên lược đồ giống production | `prisma migrate deploy` cho DB test |
| CI-08 | CI/CD | `pg_isready` không `-U` ⇒ log FATAL mỗi 5 s, che lỗi thật | `ci.yml:21,173`, `ui-weekly.yml:62` | LOW | V | Debug khó | `pg_isready -U floraos` |
| CI-09 | CI/CD | Action chạy Node 20 deprecated | cảnh báo trong log | LOW | V | Gãy khi GitHub gỡ Node 20 | Nâng action (Dependabot đang bỏ qua major) |
| CI-10 | CI/CD | Tài liệu lệch: "job deploy" (`render.yaml:66-67`), "repo công khai" (`ci.yml:107`, `codeql.yml:1`), 78 vs 57 lỗi ESLint (CLAUDE.md) | đọc tệp | LOW | V | Quyết định dựa trên giả định sai (vd. CodeQL miễn phí) | Sửa tài liệu cùng lượt sửa liên quan |
| CI-11 | CI/CD | `ui-weekly.yml` chưa từng chạy | API 0 run | INFO | V | Không có bằng chứng hoạt động | Chạy `workflow_dispatch` một lần để xác minh |
| DEP-01 | Dependency | Python không lock/hash; cài lại mỗi deploy; pytest trong requirements prod | `workers/requirements.txt` | MEDIUM | V | Không tái lập; 3 worker có thể lệch phiên bản | Lock có hash; tách dev requirements (PO duyệt công cụ) |
| DEP-02 | Dependency | Không ghim Node/npm (`engines`, `.nvmrc`, `packageManager`) | `package.json`, `ci.yml:51`, `render.yaml:53` | MEDIUM | V | Trôi runtime CI ↔ Render ↔ local | Khai một nguồn phiên bản |
| DEP-03 | Dependency | Cổng audit bỏ qua moderate & dev: 5 moderate prod (chuỗi Sentry), 12 dev | `ci.yml:130`; `npm audit --json` | MEDIUM | V | Lỗ hổng tích tụ không theo dõi | Nâng `@sentry/nextjs` 11.11.0; sổ ngoại lệ có hạn |
| DEP-04 | Dependency | ESLint 9.39.5 "no longer supported" | log `npm ci` | LOW | V | Không nhận bản vá tương lai | Kế hoạch ESLint 10 theo eslint-config-next |
| DEP-05 | Dependency | `xlsx` từ CDN ngoài registry — ngoài advisory DB/Dependabot (có integrity) | `package.json`, lockfile `:14565-14568` | LOW | V | Lỗ hổng mới không tự báo | Theo dõi thủ công hằng tháng |
| DEP-06 | Dependency | `shadcn` không thấy chỗ dùng, mang 3 advisory dev | grep; `npm audit` | LOW | P | Bề mặt supply chain thừa | Xác nhận rồi gỡ |
| DEP-07 | Dependency | Dependabot bỏ qua mọi major; không có sổ major | `dependabot.yml` | INFO | V | Nợ nâng cấp ẩn | Sổ major pending |
| DEP-08 | Dependency | Không kiểm tra giấy phép gói | CI/`package.json` | INFO | V | Rủi ro pháp lý SaaS thương mại | Quyết định của PO |
| SEC-01 | Security | CodeQL "configuration error — Code scanning is not enabled"; 0 SARIF upload từ ~13:14 07/11; repo private | runs `42380675610`, `42380664264`, `42378432581`; `list_repos` | HIGH | V (deploy-block: P) | 0 SAST trên `main`; có thể chặn mọi deploy Render | PO chọn: bật Code Security, hoặc gate SARIF có baseline (ghi rõ không phải Code Scanning) |
| SEC-02 | Security | Không quét lỗ hổng dependency Python | `ci.yml:145-160` | MEDIUM | V | Lỗ hổng trong pipeline xử lý file không bị phát hiện | `pip-audit` sau khi lock |
| SEC-03 | Security | `ci.yml`, `ui-weekly.yml` không khai `permissions` | đọc tệp | MEDIUM | V | Token quyền mặc định không kiểm soát trong mã | `permissions: contents: read` |
| SEC-04 | Security | Bí mật chỉ phát hiện sau push; push protection chưa xác minh; không hook pre-commit | `ci.yml:115`, `scripts/setup-hooks.ts` | MEDIUM | P | Bí mật lên remote trước khi chặn | Bật push protection (nếu gói cho phép) + hook tuỳ chọn |
| SEC-05 | Security | Action ghim tag, không SHA | `ci.yml`, `codeql.yml` | LOW | V | Rủi ro supply chain Actions | Ghim SHA |
| SEC-06 | Security | Tenancy/IDOR chỉ được bảo vệ bằng test (CodeQL không mô hình hoá) | coverage matrix | INFO | V | Phụ thuộc CI-01 | Giữ test là check bắt buộc |
| SEC-07 | Security | Log CI in mật khẩu tài khoản mẫu dev (đã công khai trong git, chặn ở prod) | job `128426037333`; `prisma/seed.ts:35` | INFO | V | Không phải rò rỉ prod | Có thể ẩn khi `CI=true` |
| RES-01 | Resource | Heap web 2048 MB trên gói Starter 512 MB + 5 scheduler trong tiến trình | `render.yaml:30,64-65`; `instrumentation.ts:22-36` | HIGH | P (cấu hình V; RAM gói theo bảng giá Render) | OOM-kill, restart, mất request | Heap ≤ 75 % RAM gói hoặc nâng gói (PO) |
| RES-02 | Resource | Không `SENTRY_DSN` trong blueprint; không APM/metrics/giám sát CSDL | `render.yaml`; `OPERATIONS_RUNBOOK.md:33,127` | HIGH | V | Sự cố production vô hình | Bật Sentry 4 dịch vụ + cảnh báo RAM/restart |
| RES-03 | Resource | Worker AI (onnxruntime/rembg/opencv) trên 512 MB, không số đo RAM | `render.yaml:172-179`; `rembg_segmenter.py:38-51`; `variant_worker.py:453` | MEDIUM | P | OOM giữa job | Đo 1 tuần, chọn gói theo số đo |
| RES-04 | Resource | Ngân sách kết nối CSDL không tài liệu hoá; giới hạn gói chưa xác minh | `env.ts:22`; `render.yaml` | MEDIUM | P | Cạn kết nối khi scale | Ghi ngân sách + cảnh báo 80 % |
| RES-05 | Resource | Scheduler không khoá phân tán | `background-sweep-scheduler.ts`, `reconciliation-scheduler.ts` | LOW | P | Chạy trùng khi scale-out | Advisory lock |
| RES-06 | Resource | `.next` 739 MB, cache 478 MB không dùng ở CI | đo | LOW | V | Build lặp lại | Cache/artifact |
| RES-07 | Resource | Không có load test / số năng lực | grep | INFO | V | Không biết giới hạn | Load test staging |
| RES-08 | Resource | Worker market-intelligence không deploy — tuyến bị khoá có chủ đích | `feature-lock.ts:71,75` | INFO | V | Không | Thêm dịch vụ khi mở tính năng |
