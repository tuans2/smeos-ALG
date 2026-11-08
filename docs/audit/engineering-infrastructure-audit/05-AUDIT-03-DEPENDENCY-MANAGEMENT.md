# 05 — AUDIT 03: Dependency Management

> Chỉ đọc. Không cài/gỡ/nâng gói, không sinh lại `package-lock.json`. `npm ci` chỉ chạy trong bản sao scratchpad để kiểm tính tái lập.
> Thuật ngữ dùng tách bạch: **outdated** (có bản mới hơn) · **deprecated** (nhà phát hành gắn cờ ngừng) · **unsupported** (ngoài chính sách hỗ trợ) ·
> **vulnerable** (có advisory) · **incompatible** (vi phạm peer/engine range).

## 1. Dependency inventory

| Hệ | Trực tiếp | Cài đặt | Lockfile | Cập nhật tự động |
|---|---|---|---|---|
| npm (web) | 24 dependencies + 19 devDependencies (`package.json`) | **842 gói** (`npm ci` 27 s, exit 0) | `package-lock.json` 514 KB, có `integrity` sha512 | Dependabot weekly, nhóm minor/patch, **bỏ qua mọi semver-major** (`dependabot.yml:9-21`) |
| pip (workers) | 12 gói (`workers/requirements.txt`) | — | **không có** (chỉ `>=`, `sentry-sdk==2.72.0` là ghim duy nhất) | Dependabot weekly, bỏ qua major (`dependabot.yml:22-31`) |
| GitHub Actions | 6 action (tag `@v3/@v4/@v5`) | — | — | Dependabot monthly, bỏ qua major |

Ghim đặc biệt: `next 16.4.3`, `react 19.3.1`, `sharp 0.35.5`, `@sentry/nextjs 11.10.0`, `@phosphor-icons/react 2.1.10` (exact);
`xlsx` cài từ tarball `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (lockfile có `integrity`, `package-lock.json:14565-14568`).

Sử dụng thực tế (grep import trong `src/ scripts/ prisma/ tests/`): mọi dependency runtime đều có import, trừ `server-only` (import side-effect, 4 tệp — có dùng).
`concurrently` dùng trong script `dev:all`. **`shadcn`** (devDependency): không có `components.json`, không import, không script ⇒ không thấy chỗ dùng.

## 2. Dependency health report

| Gói | Đang dùng | Mới nhất | Phân loại | Ghi chú |
|---|---|---|---|---|
| eslint | 9.39.5 | 10.14.0 | **deprecated** ("This version is no longer supported" khi `npm ci`) · outdated major | eslint-config-next 16.4.3 vẫn khai eslint 9 |
| typescript | 5.9.3 | 7.0.2 | outdated major | TS 7 **incompatible** với typescript-eslint 8.70 (`<6.1.0`) |
| prisma / @prisma/client | 7.10.1 | 8.0.0-rc.33 | hiện hành (8 chỉ là RC) | |
| next / eslint-config-next | 16.4.3 | 16.4.5 | outdated patch | ghim exact ⇒ chỉ đổi qua PR |
| @sentry/nextjs | 11.10.0 | 11.11.0 | **vulnerable** (moderate, chuỗi `glob`/`minimatch`) | bản sửa là minor, không phá vỡ semver |
| @anthropic-ai/sdk | 0.137.0 | 1.6.0 | outdated major | |
| ioredis | 5.11.1 | 6.0.0 | outdated major | |
| @types/node | 22.20.5 | 26.6.6 | outdated major — **cố ý** khớp runtime Node 22 | |
| vitest / @playwright/test / tailwind | 5.0.5 / 1.64.1 / 4.3.3 | 5.1.0 / 1.65.0 / 4.3.5 | outdated minor/patch | |

Trùng phiên bản: **TypeScript 5.9.3 duy nhất** (deduped toàn cây). Không phát hiện xung đột peer khi `npm ci`.

## 3. Version compatibility matrix

| Thành phần | Cài đặt | Yêu cầu chính thức (từ `package.json` của gói) | Trạng thái |
|---|---|---|---|
| Node.js | CI `22.x`, Render `"22"`, máy đo 22.23.4 | Next `>=20.9.0` · Prisma `^20.19 \|\| ^22.12 \|\| >=24.0` · Vitest 5 `^22.12.0 \|\| ^24 \|\| >=26` | ✅ với 22.12+; **không có `engines`** nên 22.0–22.11 không bị chặn |
| npm | 10.9.9 | — | không ghim `packageManager` |
| TypeScript | 5.9.3 | typescript-eslint `>=4.8.4 <6.1.0` · Prisma `>=5.4.0` | ✅ |
| typescript-eslint | 8.70.0 (qua eslint-config-next) | — | ✅ |
| Next.js | 16.4.3 | React `^18.2 \|\| ^19`, `@playwright/test ^1.51.1` (peer tuỳ chọn) | ✅ React 19.3.1, Playwright 1.64.1 |
| Prisma | 7.10.1 | `binaryTargets` native + debian/musl openssl 3 | ✅ (Render Node runtime debian — suy luận) |
| ESLint | 9.39.5 | eslint-config-next 16.4.3 | ✅ nhưng ESLint 9 deprecated |
| Vitest / tsx | 5.0.5 / 4.23.15 | esbuild transpile, không phụ thuộc phiên bản TS | ✅ |
| Python | 3.11 / 3.11.9 | `psycopg>=3.2` (comment `requirements.txt:1-2`) | ⚠️ phần còn lại không ghim ⇒ không xác định được |

## 4. Dependency conflict analysis

- Không có xung đột phiên bản npm. Rủi ro xung đột **tương lai** đã thấy trước: TS 7 ↔ typescript-eslint (PR #189 chọn chạy song song TS 5.9 + TS 7).
- Python: không lock ⇒ CI (`pip install` lúc chạy) và Render (`pip install` lúc build, `render.yaml:178,231,272`) có thể cài **phiên bản khác nhau** cho cùng commit;
  ba worker build độc lập nên ba dịch vụ production có thể lệch nhau. `pytest` nằm trong requirements production (`requirements.txt:9`).

## 5. Supply chain risk assessment

| ID | Mức | Phát hiện | Bằng chứng |
|---|---|---|---|
| **DEP-01** | MEDIUM | Python không lock/hash; cài lại ở mỗi deploy ⇒ không tái lập, không chứng minh được gói production = gói đã test. | `workers/requirements.txt` |
| **DEP-02** | MEDIUM | Không ghim Node/npm: thiếu `engines`, `.nvmrc`, `packageManager`; CI `22.x` và Render `"22"` trôi theo bản phát hành. | `package.json`, `ci.yml:51`, `render.yaml:53` |
| **DEP-03** | MEDIUM | Cổng `npm audit --omit=dev --audit-level=high` (`ci.yml:130`) bỏ qua **5 moderate production** (`@sentry/nextjs` → `@sentry/node`, `@sentry/bundler-plugins`, `glob`, `minimatch`) và **12 low/moderate dev** (`typescript-eslint` → `minimatch`, `shadcn` → `deepmerge`, `ts-morph`); không có sổ theo dõi/hạn xử lý. | `npm audit --json` (17 tổng; prod 5) |
| DEP-04 | LOW | ESLint 9.39.5 bị đánh dấu không còn hỗ trợ. | log `npm ci` |
| DEP-05 | LOW | `xlsx` ngoài registry npm: có integrity hash (tốt) nhưng **ngoài** tầm advisory DB của `npm audit` và Dependabot (`ci.yml:128` đã ghi nhận). Cần quy trình theo dõi tay. | `package.json`, lockfile |
| DEP-06 | LOW | `shadcn` devDependency không thấy chỗ dùng, kéo theo 3 advisory dev. Cần chủ sở hữu xác nhận trước khi gỡ. | grep, `npm audit` |
| DEP-07 | INFO | Dependabot bỏ qua mọi major cho cả 3 hệ ⇒ major (TS 7, ESLint 10, ioredis 6, Anthropic SDK 1.x, Prisma 8) cần sổ theo dõi thủ công — hiện chưa thấy sổ. | `dependabot.yml` |
| DEP-08 | INFO | Không có kiểm tra giấy phép (license) cho dependency, trong khi sản phẩm là SaaS thương mại `UNLICENSED`. Có bộ lọc giấy phép **mô hình AI** (CLAUDE.md) nhưng không thấy cho gói npm/pip. | không có công cụ trong `package.json`/CI |

Kiểm soát đang có: lockfile sha512 + `npm ci` (tái lập — đã kiểm 27 s, exit 0); gitleaks checksum-verified; Dependabot cho 3 hệ, mỗi PR phải qua CI và người duyệt (`dependabot.yml:2`);
Dependency Review Action **không** có trên PR (với repo private cần GitHub Advanced Security — chưa xác minh gói đăng ký).

## 6. Upgrade and maintenance recommendations

1. Lock Python bằng `pip-tools`/`uv` (`requirements.in` → `requirements.txt` có hash), tách `requirements-dev.txt` cho pytest — **cần PO duyệt** (công cụ mới).
2. Thêm `engines.node ">=22.12 <23"` + `.nvmrc`; ghim `NODE_VERSION` trên Render tới minor.
3. Nâng `@sentry/nextjs` 11.10.0 → 11.11.0 (bản sửa moderate, cùng major) qua PR thường.
4. Lập sổ "major pending" (gói, lý do hoãn, rủi ro, chủ sở hữu, ngày xem lại) — đặt cạnh `TECHNICAL_DEBT.md`.
5. Xác nhận và gỡ `shadcn` nếu không dùng (PR riêng).
6. Kế hoạch ESLint 10 phụ thuộc eslint-config-next hỗ trợ — kiểm peer trước khi nâng.

## 7. Dependency governance policy (đề xuất)

- Thêm dependency mới: phải qua PO (đã có trong CLAUDE.md "Stop and ask"), PR ghi lý do, giấy phép, người bảo trì, kích thước, thay thế đã cân nhắc.
- Minor/patch: Dependabot nhóm tuần; merge khi CI xanh + 1 người duyệt.
- Major: một gói/PR, kèm ghi chú breaking change, đo lại typecheck/build theo `03 §7`.
- Lỗ hổng: high/critical prod chặn merge (đang có); moderate prod — hạn 30 ngày; dev — hạn 90 ngày; mỗi ngoại lệ ghi sổ có ngày hết hạn.
- Gói ngoài registry (như `xlsx`): ghi nguồn, hash, người theo dõi advisory, lịch kiểm tra hàng tháng.

## 8. Acceptance criteria

| Tiêu chí | Ngưỡng |
|---|---|
| Cài đặt tái lập | `npm ci` và `pip install --require-hashes` thành công từ lockfile trên CI và Render; 0 gói Python không ghim |
| Phiên bản runtime | Node/npm/Python khai báo một nơi và khớp CI ↔ Render ↔ local (kiểm bằng script hoặc bước CI) |
| Lockfile | `npm ci` không sửa lockfile; PR đổi `package.json` mà không đổi lockfile ⇒ CI đỏ (đã đúng với `npm ci`) |
| Lỗ hổng | 0 high/critical prod (đang đạt); moderate prod có ticket + hạn; `pip-audit` (hoặc tương đương) chạy trên workers |
| Cập nhật | Dependabot PR minor/patch không tồn đọng > 14 ngày; sổ major được xem lại mỗi tháng |
| Breaking change | Mỗi major có PR riêng + bảng đo trước/sau |
| Phê duyệt | 100 % dependency mới có PO duyệt ghi trong PR |
