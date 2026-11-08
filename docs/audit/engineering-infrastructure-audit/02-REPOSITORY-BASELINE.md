# 02 — Repository Baseline (Đường nền kho mã)

> Audit chỉ đọc · Ngày đo: 07/11/2026 · Commit được audit: `main@87f30f2` (merge PR #187)
> Mọi phép đo chạy trên **bản sao** `git archive HEAD` trong scratchpad của phiên, không chạm working tree.
> Máy đo: Ubuntu 24.04, 4 vCPU, 15 GB RAM, Node v22.23.4, npm 10.9.9.

## 1. Công nghệ (phiên bản thật đã cài từ `package-lock.json`)

| Thành phần | Phiên bản | Nguồn |
|---|---|---|
| Node.js | `22.x` (CI, floating) · `"22"` (Render) · không có `engines`/`.nvmrc` | `ci.yml:51`, `render.yaml:52-53` |
| npm | 10.9.9 (máy đo) · không ghim `packageManager` | `package.json` |
| TypeScript | 5.9.3 (một bản duy nhất, deduped) | `npm ls typescript` |
| Next.js | 16.4.3 (Turbopack, `typedRoutes: true`) | `package.json`, `next.config.ts:41` |
| React | 19.3.1 | `package.json` |
| Prisma | 7.10.1 (`prisma-client` generator, `@prisma/adapter-pg`) | `prisma/schema.prisma:17-21` |
| ESLint / typescript-eslint | 9.39.5 / 8.70.0 (không bật typed linting) | `eslint.config.mjs` |
| Vitest / Playwright | 5.0.5 / 1.64.1 | `package.json` |
| Python workers | 3.11 (CI) / 3.11.9 (Render) · `requirements.txt` không ghim | `workers/requirements.txt` |
| CSDL | PostgreSQL 16 (CI service, Render `basic-256mb`) | `ci.yml:14`, `render.yaml:353-358` |
| Hàng đợi/Rate-limit | Render Key Value (Redis) `256mb` | `render.yaml:343-348` |

## 2. Kiến trúc (thực tế quan sát)

- **Web**: Next.js monolith `src/` — 53 module (`src/modules/*`), 506 route API (`src/app/api/**/route.ts`), 114 `page.tsx`.
  Lớp: `domain/` → `use-cases/` → `infra/` (Prisma) → `adapters/` (SDK nhà cung cấp). Prisma Client duy nhất tại
  `src/core/tenancy/infra/prisma.ts:34-77` (2 lớp `$extends` cho PII + order recipient, ép kiểu về `PrismaClient` ở dòng 74).
- **Worker Python** (`workers/`, 165 tệp `.py`): media, video, vision — mỗi worker 1 kết nối `LISTEN/NOTIFY` + `FOR UPDATE SKIP LOCKED`.
- **Tác vụ nền trong tiến trình web**: 5 scheduler `setInterval` khởi động trong `src/instrumentation.ts:22-36`.
- **Cron Render** gọi 3 endpoint nội bộ mỗi 5 phút (`render.yaml:308-337`).
- **Lược đồ**: `prisma/schema.prisma` 5.073 dòng, **151 model**, 73 enum, 84 migration.

## 3. Quy mô mã

| Chỉ số | Giá trị |
|---|---|
| Tệp `.ts/.tsx` được git theo dõi | 4.742 (src 4.154 · tests 472 · scripts 55 · prisma 6 · còn lại là tệp cấu hình gốc) |
| Dòng TS/TSX được git theo dõi | 462.689 |
| Prisma Client sinh ra (`src/generated/prisma`, gitignored) | 159 tệp · **400.878 dòng · 22,9 MB** · tất cả `// @ts-nocheck` |
| Tệp tsc nạp vào chương trình | 10.244 (4.701 tệp được *check*; phần còn lại là `.d.ts` thư viện + generated `@ts-nocheck`) |
| Test tenant / platform | 215 / 14 tệp (`tests/tenant`, `tests/platform`) |

## 4. Quy trình build / test / deploy hiện hành

| Bước | Lệnh | Nơi chạy |
|---|---|---|
| Typecheck | `tsc --noEmit` (`package.json:68`) | CI job `web` |
| Lint | `node scripts/eslint-ratchet.mjs` (baseline 57 lỗi / 45 tệp) | CI job `web` |
| Unit | `vitest run --exclude tests/tenant ...` | CI job `web` |
| Tenant/Platform isolation | `vitest run tests/tenant` / `tests/platform` (tuần tự, `fileParallelism: false`) | CI job `web` |
| Build | `next build` (có kiểm kiểu, trừ khi `SKIP_BUILD_TYPECHECK=true`) | CI `web`, CI `e2e-ux`, Render |
| E2E UX | `playwright test tests/e2e/ux` trên `next start` | CI `e2e-ux` |
| Worker | `pytest tests -q` | CI `worker` |
| Bảo mật | gitleaks (toàn lịch sử) + `npm audit --omit=dev --audit-level=high` · CodeQL (workflow riêng) | CI `security`, `codeql.yml` |
| Deploy | Render Blueprint, `autoDeployTrigger: checksPass`, `preDeployCommand: db:deploy && db:seed` | Render (5 dịch vụ) |

## 5. Đường nền đo được (máy đo, cold = không có `tsconfig.tsbuildinfo`)

| Phép đo | Thời gian | Heap tsc ("Memory used") | Peak RSS | Ghi chú |
|---|---|---|---|---|
| `npm ci` | 27 s | — | — | 842 gói, exit 0 |
| `prisma generate` | 1,7 s | — | — | |
| `tsc --noEmit` cold, heap 8 GB (2 lần) | 62–64 s | 2,90–3,14 GB | 3,22–3,26 GB | Check 47–52 s |
| `tsc --noEmit` cold, heap 4 GB (giống CI) | 64 s | 3,01 GB | 3,14 GB | qua |
| `tsc --noEmit` cold, **heap mặc định (2.096 MB)** | chết ở 34 s | — | 2,27 GB | **exit 134 — OOM** |
| `tsc --noEmit` warm (có tsbuildinfo) | 8,5 s | 1,72 GB | 1,86 GB | |
| `tsc` cold **khi đã có `.next/types`** (typedRoutes) | **243 s** | **3,86 GB** | 3,97 GB | Instantiations 7,11 M (so với 2,78 M) |
| `next build`, `SKIP_BUILD_TYPECHECK=true`, heap 2 GB | 52 s | — | 5,15 GB | Turbopack native |
| `next build` có kiểm kiểu, heap 4 GB | 304 s | — | 4,49 GB | "Finished TypeScript in 4.4min" |
| Kích thước `.next` | 739 MB (cache Turbopack 478 MB) | | | |

## 6. Đường nền CI (GitHub Actions, run thành công `42378209168`, PR #188)

| Job | Thời lượng | Bước đắt nhất |
|---|---|---|
| `web` | **30 m 33 s** | `test:tenant` **19 m 48 s** · `npm run build` 3 m 24 s · `npm test` 2 m 30 s · ESLint 1 m 15 s · typecheck 44 s |
| `e2e-ux` | 11 m 07 s | `npm run build` 4 m 14 s · Playwright 5 m 07 s |
| `worker` | 4 m 05 s | pytest 3 m 03 s |
| `security` | 53 s | gitleaks 42 s |
| `industry-terms` | 48 s | `npm ci` 36 s |
| CodeQL (2 job, workflow riêng) | ~6 m mỗi job | |

40 run CI gần nhất (07/11, 04:49–14:14 UTC): thời lượng 24,7–39,0 phút; 11/38 run hoàn tất bị đỏ.
Repo hiện là **private** (`list_repos` → `visibility: private`); runner chuẩn cho repo private ≈ 7 GB RAM (khớp commit `6162c8a`).

## 7. Những gì KHÔNG đo/kiểm được

- Cấu hình GitHub (rulesets, secret scanning/push protection, quyền mặc định `GITHUB_TOKEN`, GHAS) — không có API đọc trong phiên; chỉ suy ra từ hành vi (merge PR đỏ, log CodeQL).
- Render dashboard (lịch sử deploy, metrics RAM/CPU, giới hạn kết nối Postgres) — không có quyền truy cập.
- Thời lượng `test:tenant` cục bộ — cần DB `_test`; không chạy để tránh mọi thao tác TRUNCATE ngoài kiểm soát.
