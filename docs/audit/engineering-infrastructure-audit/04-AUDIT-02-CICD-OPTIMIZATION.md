# 04 — AUDIT 02: CI/CD Optimization

> Chỉ đọc. Không sửa workflow, branch protection, cấu hình Render. Dữ liệu run lấy qua GitHub Actions API (07/11/2026).

## 1. Kiến trúc CI/CD hiện tại

| Workflow | Trigger | Jobs | `permissions` | `concurrency` |
|---|---|---|---|---|
| `ci.yml` | `push: main`, `pull_request: main` | `web`, `security`, `industry-terms`, `worker`, `e2e-ux` (song song, không `needs`) | **không khai báo** | **không** |
| `codeql.yml` | push/PR `main` + cron thứ Hai 02:17 | `analyze` × {js-ts, python} | `contents: read`, `security-events: write` | không |
| `ui-weekly.yml` | cron thứ Hai 03:00 + `workflow_dispatch` | 1 job | **không khai báo** | không |

Deploy: **không có job deploy**. Render Blueprint đặt `autoDeployTrigger: checksPass` + `branch: main` cho 5 dịch vụ (`render.yaml:38,180,233,274,313`);
migration chạy ở `preDeployCommand: npm run db:deploy && npm run db:seed` (`render.yaml:35`). Rollback thủ công qua Render (`ci.yml:226`, `OPERATIONS_RUNBOOK.md` §3–4).

## 2. Sơ đồ phụ thuộc workflow (chỉ các giai đoạn có thật)

```
Developer push → PR → GitHub
   ├─ ci.yml ──┬─ web (30,5 m, TUẦN TỰ):
   │           │    npm ci → prisma generate → db:deploy → migrate diff → check:migrations
   │           │    → tạo floraos_test (db push) → db:seed → typecheck → eslint ratchet
   │           │    → check:docs/layers/tokens-doc/screen-contracts → lint:ux → npm test
   │           │    → check:template-ssot → test:tenant (19,8 m) → test:platform → next build (kèm typecheck)
   │           ├─ e2e-ux (11 m): npm ci → generate → db:deploy → seed → playwright install → next build (kèm typecheck) → playwright
   │           ├─ worker (4 m): apt ffmpeg → pip install → pytest
   │           ├─ security (1 m): gitleaks (full history) → npm audit --omit=dev --audit-level=high
   │           └─ industry-terms (1 m): npm ci → audit:industry:check
   └─ codeql.yml ─ analyze js-ts / python (~6 m) — HIỆN LUÔN ĐỎ (cấu hình, xem SEC-01)
Merge vào main  → chạy lại toàn bộ ci.yml + codeql.yml trên commit merge
Render (checksPass) → build (npm ci --include=dev → prisma generate → next build, bỏ typecheck)
                    → preDeploy (migrate deploy + seed hệ thống) → healthCheck /api/health → nhận traffic
Post-deploy verification: chỉ health check của Render; không có smoke test tự động.
```

## 3. Pipeline performance baseline

Run thành công `42378209168` (xem `02-REPOSITORY-BASELINE.md` §6). Tóm tắt:

| Chỉ số | Giá trị |
|---|---|
| Wall time pipeline (job dài nhất = `web`) | 30,5 m (40 run gần nhất: **24,7–39,0 m**, đa số 31–38 m; run `main@87f30f2` 45,8 m) |
| Runner-phút / sự kiện (CI + CodeQL) | ≈ 47 m (CI 5 job) + ≈ 12 m (CodeQL 2 job) ≈ **59 runner-phút** |
| Cài dependency | `npm ci` 36–62 s × 3 job; `pip install` 19–29 s; `apt ffmpeg` 16–27 s; `playwright install` 15–26 s |
| Build | `next build` 3 m 24 s (`web`) + 4 m 14 s (`e2e-ux`) = **7 m 38 s build trùng** |
| Test | `test:tenant` **19 m 48 s** (65 % job `web`) · `npm test` 2 m 30 s · Playwright 5 m 07 s · pytest 3 m 03 s |
| Cache | Chỉ cache npm của `setup-node` (`ci.yml:52`). Không cache pip, Playwright browsers, `.next/cache` (478 MB), tsbuildinfo. Không đo được hit/miss từ API. |
| Tần suất lỗi | 11/38 run hoàn tất bị đỏ trong ngày 07/11; nguyên nhân đã xác minh: 2 OOM typecheck (`0da028b`, PR #187), 1 `test:tenant` đỏ sau merge (`0692d9a`); còn lại chưa phân loại. CodeQL đỏ **mọi** run từ ~13:14 UTC 07/11. |
| Billable minutes | API `get_workflow_run_usage` trả `0` — **không xác minh được** quota/chi phí. |

`test:tenant` đắt vì: 215 tệp × 418 `beforeEach`; mỗi lần `resetDatabase()` (`tests/helpers/database.ts:111-142`) chạy `TRUNCATE … RESTART IDENTITY CASCADE`
trên toàn bộ bảng tenant rồi nạp lại vai hệ thống, ngành, AI capabilities, models; `vitest.config.ts:19` `fileParallelism: false`.
Log Postgres CI: checkpoint `sync files=156888` trong một chu kỳ ⇒ áp lực I/O từ TRUNCATE lặp lại.

## 4. Redundant execution findings

| ID | Mức | Phát hiện | Bằng chứng | Tác động |
|---|---|---|---|---|
| **CI-03** | MEDIUM | Pipeline 25–39 m, đường găng là job `web` tuần tự; riêng `test:tenant` 19,8 m (65 %) do reset DB đầy đủ ở 418 `beforeEach` và `fileParallelism: false`. | §3; `tests/helpers/database.ts:111-142`; `vitest.config.ts:19` | Vòng phản hồi PR ~35 m; tăng tuyến tính theo số ca test. |
| **CI-04** | MEDIUM | Công việc trùng mỗi run: `next build` ×2, kiểm kiểu ×3 (TC-03), `npm ci` ×3, `prisma generate` ×2, `db:deploy`+`db:seed` ×2, dựng Postgres ×2. | `ci.yml:53-105`, `ci.yml:141`, `ci.yml:192-197` | ~8–9 runner-phút/run lãng phí; bước build kiểm kiểu ở 94 % heap (TC-02) chạy 2 lần ⇒ 2 điểm OOM. |
| **CI-05** | MEDIUM | Không `concurrency`/`cancel-in-progress`, không `paths`/`paths-ignore` ⇒ push mới vào PR không huỷ run cũ; PR chỉ đổi tài liệu vẫn chạy pipeline ~35 m + CodeQL. | `ci.yml:3-7`, `codeql.yml:5-11` | 40 run CI trong 9,5 giờ (07/11); ~59 runner-phút/sự kiện. |

## 5. Reliability and deployment risks

| ID | Mức | Phát hiện | Bằng chứng |
|---|---|---|---|
| **CI-01** | HIGH | **Check đỏ không chặn merge.** (Commit merge `87f30f2` sau đó xanh — vì PR #188 nâng heap được merge trước 10 giây — nhưng việc merge một head đỏ vẫn là lỗi kiểm soát.) Nhánh `main` báo `protected: false` (API `list_branches`). PR #187 (head `551c8e3`) được merge lúc 14:14:34 khi run duy nhất của head đó **đỏ** (`web`: OOM typecheck; `e2e-ux`: build đỏ) — run `42380206615`. Runbook (`OPERATIONS_RUNBOOK.md:45`) và `ci.yml:223` ghi ruleset "vẫn nên bật" — thực tế không thi hành. | API Actions + PR list |
| **CI-02** | MEDIUM | **Không yêu cầu nhánh cập nhật / merge queue** ⇒ hai PR xanh tạo ra `main` đỏ: PR #186 xanh (`aaa13b5`, 13:02) nhưng commit merge `0da028b` OOM typecheck + build; merge `0692d9a` đỏ `test:tenant` dù PR head xanh. Cùng một mã nguồn không nhận kết quả nhất quán giữa PR và `main`. | run `42378432571`, `42361826843` |
| **CI-06** | MEDIUM | Job `web` là chuỗi tuần tự 23 bước: một bước đỏ sớm (vd. typecheck OOM) làm **skip** ESLint, unit, tenant, platform, build ⇒ mất tín hiệu của mọi cổng sau. Lỗi hạ tầng (exit 134 OOM, Postgres) hiển thị y như lỗi ứng dụng — không có phân loại. | job `128426037333`: 11 bước `skipped` |
| **CI-07** | MEDIUM | DB test dựng bằng `prisma db push` (`ci.yml:73`), không chạy migration ⇒ đối tượng chỉ có trong SQL migration (CHECK ở 9 migration, FUNCTION/TRIGGER ở 10, RLS ở 6) **vắng mặt** trong DB mà `test:tenant` dùng, trừ chỗ test tự áp lại (`tests/tenant/rls.test.ts:30-39`, `tests/helpers/industries-seed.ts`). Cổng cách ly không chạy trên lược đồ giống production. | `grep` migrations |
| CI-08 | LOW | Health check service `pg_isready` không có `-U` ⇒ `FATAL: role "root" does not exist` mỗi 5 s, làm ngập phần cuối log job (đuôi 160 dòng của job đỏ `0692d9a` không thấy lỗi vitest). | `ci.yml:21,173`, `ui-weekly.yml:62` |
| CI-09 | LOW | Cảnh báo GitHub: `actions/checkout@v4`, `setup-node@v4`, `upload-artifact@v4`, `codeql-action@v3` chạy Node 20 đã deprecated (bị ép sang Node 24). | log mọi job |
| CI-10 | LOW | Tài liệu/comment lệch thực tế: `render.yaml:66-67` nhắc "job `deploy`" (đã bỏ — `ci.yml:211`); `ci.yml:107-108`, `codeql.yml:1` nói repo **công khai** (thực tế private); CLAUDE.md nói 78 lỗi ESLint, baseline thực 57. | đọc tệp |
| CI-11 | INFO | `ui-weekly.yml` **chưa từng chạy** (0 run); chạy E2E trên `next dev`, không `NODE_OPTIONS` — chưa có bằng chứng hoạt động. | API |

Kiểm soát đang hoạt động tốt (đã xác minh): Render chỉ deploy commit có check xanh (fail-safe); migrate ở pre-deploy, lỗi thì bản cũ vẫn chạy;
`migrate diff --exit-code` chặn quên migration; `check:migrations` ép expand/contract; deploy chỉ từ `main`; Render tự tuần tự hoá deploy cùng dịch vụ.

**Rủi ro deploy cần xác minh trên Render**: với `checksPass`, check CodeQL đỏ trên `main` (SEC-01) nhiều khả năng **chặn mọi deploy** kể từ ~13:45 UTC 07/11
(`0da028b`, `2d359e5`, `87f30f2` đều có CodeQL đỏ). Run CI của `87f30f2` kết thúc **xanh** lúc 15:00 UTC (45,8 phút) trong khi CodeQL của cùng commit đỏ ⇒ commit HEAD của `main` có tập check hỗn hợp; deploy hay không phụ thuộc Render có tính CodeQL hay không. Không truy cập được Render để khẳng định.

## 6. Optimization recommendations (không thực thi)

1. Bật ruleset `main`: bắt buộc PR, bắt buộc 5 check CI (và CodeQL khi đã sửa), "require branches up to date" hoặc merge queue (đóng CI-01, CI-02).
2. Thêm `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: ${{ github.event_name == 'pull_request' }} }` (không huỷ run trên `main` vì Render đọc check của nó).
3. Tách job `web` thành các job song song có chung bước chuẩn bị (artifact `node_modules`/Prisma client hoặc cache), ví dụ: `static` (typecheck+lint+docs), `unit`, `tenant`, `platform`, `build` — giữ nguyên **tên check** Render đang đọc hoặc cập nhật đồng bộ `render.yaml` + runbook (PO duyệt, vì `ci.yml:217-219` nói đổi tên job là nới cổng production).
4. Build một lần, chia sẻ `.next` cho `e2e-ux` qua artifact; kiểm kiểu một lần (TC-03).
5. Rút ngắn `test:tenant`: shard theo nhiều DB `_test` (mỗi worker một DB) hoặc reset bằng transaction/rollback cho ca không cần commit; đo trước/sau.
6. Dựng DB test bằng `prisma migrate deploy` (cùng đường production) thay `db push` (CI-07).
7. `pg_isready -U floraos`; nâng action lên major hỗ trợ Node 24 khi có (Dependabot github-actions đang **bỏ qua semver-major**, `dependabot.yml:37-38`).

## 7. Proposed optimized pipeline

```
prepare (npm ci + prisma generate + next typegen → cache/artifact)
 ├─ static: tsc (1 lần, gồm typed routes) · eslint ratchet · check:* · lint:ux · industry-terms
 ├─ unit: npm test · check:template-ssot
 ├─ tenant [shard 1..N, mỗi shard 1 DB _test dựng bằng migrate deploy]
 ├─ platform
 ├─ build (SKIP_BUILD_TYPECHECK=true, upload .next) ──→ e2e-ux (tải .next, next start)
 ├─ worker (cache pip)
 ├─ security (gitleaks · npm audit · pip-audit)
 └─ codeql (chỉ khi code scanning bật hoặc gate SARIF được PO duyệt — xem SEC-01)
```
Mục tiêu đặt theo đo lại sau khi làm, không ước lượng trước.

## 8. Acceptance criteria

| Tiêu chí | Đo bằng | Ngưỡng |
|---|---|---|
| Merge bị chặn khi check bắt buộc đỏ | Thử PR có check đỏ | Nút merge bị khoá; 0 PR merge với check đỏ trong 30 ngày (API) |
| Commit được kiểm đúng là commit được merge | Ruleset up-to-date/merge queue | 0 run `main` đỏ do merge skew trong 30 ngày |
| Không chạy trùng | Đếm trong `ci.yml` | `next build` ×1, kiểm kiểu đầy đủ ×1, `prisma generate` ≤ 1 lần/khâu chuẩn bị |
| Thời gian pipeline | Trung vị 20 run `main` | Giảm so với baseline 30,5–38 m; báo cáo con số thật, không đặt mục tiêu trước khi có phép đo sau tối ưu |
| Run thừa | Sự kiện PR | Push mới huỷ run PR cũ (cancel-in-progress) |
| Phân biệt lỗi hạ tầng | Log | Bước OOM/hạ tầng in thông báo phân loại riêng; đuôi log không bị ngập bởi Postgres |
| Tính tái lập | Chạy lại cùng SHA | Cùng kết quả 3/3 lần (trừ flake được ghi sổ) |
| Deploy an toàn | `render.yaml` | Mọi dịch vụ `checksPass` + `branch: main`; rollback được diễn tập và ghi vào runbook |
