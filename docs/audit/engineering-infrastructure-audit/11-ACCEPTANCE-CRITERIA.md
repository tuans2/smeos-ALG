# 11 — Acceptance Criteria (tiêu chí nghiệm thu khắc phục)

> Mỗi tiêu chí có: cách đo, ngưỡng, nguồn bằng chứng. Ngưỡng đặt **tương đối với hạ tầng hiện có** (runner private ~7 GB, Render Starter, trần heap đang đặt),
> không đặt số tuyệt đối khi chưa có phép đo. Audit khắc phục **đạt** khi mọi tiêu chí P0 + P1 đạt và có bằng chứng đính kèm PR.

## 1. Typecheck

| # | Tiêu chí | Cách đo | Ngưỡng | Liên quan |
|---|---|---|---|---|
| T1 | Heap đỉnh mọi lần kiểm kiểu trên CI | `tsc --extendedDiagnostics` "Memory used" | ≤ 75 % `--max-old-space-size` đang đặt | TC-01, TC-02 |
| T2 | Số lần kiểm kiểu đầy đủ / commit | Đếm bước trong `ci.yml` | = 1, và lần đó gồm `.next/types` | TC-03, CI-04 |
| T3 | Không OOM | Tìm "heap out of memory"/exit 134 trong log | 0 trong 20 run `main` liên tiếp | TC-01 |
| T4 | Thời gian | Trung vị 3 lần cold trên runner CI | Báo cáo trước/sau; không tăng so với baseline của cùng phạm vi kiểm | TC-02 |
| T5 | An toàn kiểu không bị nới | Diff | 0 `@ts-nocheck`/`@ts-ignore`/`as any` mới; `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` giữ nguyên; ESLint ratchet không tăng | — |
| T6 | DX local | Chạy trên máy 8 GB | `npm run typecheck` xanh không cần đặt biến thủ công | TC-01 |
| T7 | Tương thích | `npm ls`, peer check | typescript-eslint dùng TS trong peer range; `next build` xanh | TC-07 |

## 2. CI/CD

| # | Tiêu chí | Cách đo | Ngưỡng | Liên quan |
|---|---|---|---|---|
| C1 | Merge bị chặn khi check đỏ | PR thử | Không merge được; API: 0 PR merge-đỏ / 30 ngày | CI-01 |
| C2 | Commit được kiểm = commit được merge | Ruleset/merge queue | 0 run `main` đỏ do merge skew / 30 ngày | CI-02 |
| C3 | Không trùng việc | `ci.yml` | `next build` ×1; `npm ci` chỉ ở khâu chuẩn bị hoặc có cache hit | CI-04 |
| C4 | Một cổng đỏ không che cổng khác | Thử làm đỏ typecheck | tenant/platform/unit vẫn chạy và báo kết quả | CI-06 |
| C5 | Run thừa bị huỷ | Push 2 lần liên tiếp vào PR | Run cũ bị cancel | CI-05 |
| C6 | DB test như production | `ci.yml` | DB test dựng bằng `migrate deploy` | CI-07 |
| C7 | Thời gian pipeline | Trung vị 20 run | Giảm so với baseline 30,5–38 m, con số thật được ghi vào `02-REPOSITORY-BASELINE.md` bản cập nhật | CI-03 |
| C8 | Tái lập | Re-run cùng SHA 3 lần | Cùng kết luận 3/3 (flake phải có trong sổ) | CI-02 |
| C9 | Deploy an toàn & phục hồi | `render.yaml` + diễn tập | Mọi dịch vụ `checksPass`+`main`; rollback diễn tập 1 lần, ghi runbook | — |

## 3. Dependency

| # | Tiêu chí | Ngưỡng | Liên quan |
|---|---|---|---|
| D1 | Cài đặt tái lập | `npm ci` + `pip install --require-hashes` xanh ở CI và Render | DEP-01 |
| D2 | Phiên bản runtime một nguồn | Node/npm/Python khai một nơi, CI kiểm khớp | DEP-02 |
| D3 | Lỗ hổng | 0 high/critical prod; moderate prod có ticket ≤ 30 ngày | DEP-03 |
| D4 | Major pending | Sổ tồn tại, xem lại hằng tháng | DEP-07 |
| D5 | Phê duyệt | 100 % dependency mới có PO duyệt trong PR | policy |

## 4. Security scanning

| # | Tiêu chí | Ngưỡng | Liên quan |
|---|---|---|---|
| S1 | SAST chạy và ra kết quả | 100 % PR + push `main`; SARIF tồn tại; 0 "configuration error" / 14 ngày | SEC-01 |
| S2 | Phát hiện mới chặn merge | High/critical mới > baseline ⇒ PR không merge được | SEC-01, CI-01 |
| S3 | Quét Python | Chạy mỗi PR; 0 high/critical không ngoại lệ | SEC-02 |
| S4 | Least privilege | 100 % workflow có `permissions:` | SEC-03 |
| S5 | Bí mật | gitleaks xanh (giữ) + push protection bật hoặc lý do ghi sổ | SEC-04 |
| S6 | Hiển thị | Một nơi liệt kê phát hiện mở + chủ sở hữu + hạn | — |
| S7 | Khắc phục | High: ≤ 7 ngày; moderate: ≤ 30 ngày (theo ticket) | — |

## 5. Resource management

| # | Tiêu chí | Ngưỡng | Liên quan |
|---|---|---|---|
| R1 | Heap web khớp RAM | `--max-old-space-size` ≤ 75 % RAM gói | RES-01 |
| R2 | RAM runtime | RSS p95 web ≤ 80 % RAM gói (7 ngày); worker: đỉnh job lớn nhất ≤ 80 % | RES-01, RES-03 |
| R3 | Ổn định | 0 OOM-kill/restart ngoài kế hoạch / 14 ngày; health ≥ 99,5 % | RES-01 |
| R4 | Kết nối CSDL | Σ pool + worker + dư deploy chồng ≤ 80 % `max_connections`; cảnh báo ở 80 % | RES-04 |
| R5 | Quan trắc | Sentry bật 4 dịch vụ; cảnh báo cho lỗi mới, RAM > 80 %, restart, cron thất bại | RES-02 |
| R6 | Build CI | RSS đỉnh ≤ 75 % RAM runner | TC-02 |
| R7 | Mở rộng | Báo cáo load test staging (RPS, p95, lỗi %, RAM) trước mốc khách hàng do PO đặt | RES-07 |
| R8 | Scale-out an toàn | Scheduler có khoá phân tán trước khi web > 1 instance | RES-05 |
