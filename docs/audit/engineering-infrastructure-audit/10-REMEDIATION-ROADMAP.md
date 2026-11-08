# 10 — Remediation Roadmap

> Không thực thi trong audit này. Độ phức tạp là ước lượng định tính (Low/Medium/High), **không** phải ước lượng giờ công.
> Mỗi PR theo CLAUDE.md: một chủ đề, code + test + docs cùng commit, cổng CI không có lỗi mới. Mục có ⚑ cần PO duyệt trước (CLAUDE.md "Stop and ask": CI/`render.yaml`, dependency, nhà cung cấp trả phí).
> Lưu ý PR #189 (chưa merge) đã bắt đầu một phần P0/P1 — rà lại từng mục bên dưới với nội dung PR đó trước khi mở PR mới.

## P0 — Chặn ngay (bảo mật, toàn vẹn dữ liệu, phát hành)

| Finding | Thay đổi | Lý do | Phụ thuộc | Độ phức tạp | Acceptance | Ranh giới PR |
|---|---|---|---|---|---|---|
| SEC-01 ⚑ | PO chọn: (a) bật GitHub Code Security cho repo private; hoặc (b) CodeQL gate dựa trên SARIF + baseline, tài liệu ghi rõ không phải Code Scanning. Sửa comment "repo công khai". | 0 SAST trên `main`; check đỏ vì cấu hình có thể đóng băng deploy Render | Quyết định gói GitHub | Low (a) / Medium (b) | 0 run "configuration error" 14 ngày; SARIF có ở mọi run; xác nhận trên Render rằng deploy không bị chặn bởi check cấu hình | PR riêng: `codeql.yml` + docs |
| CI-01 ⚑ | Bật ruleset `main`: bắt buộc PR, 5 check CI (+ CodeQL sau SEC-01), chặn force-push/xoá, require up-to-date (hoặc merge queue — gộp CI-02) | PR đỏ đã vào `main`; cổng tenant không được thi hành | SEC-01 (nếu thêm CodeQL vào danh sách) | Low (cài đặt GitHub, không đổi mã) | Thử PR có check đỏ: không merge được; 0 PR merge-đỏ / 30 ngày | Cài đặt repo + 1 PR cập nhật runbook |
| TC-02 / TC-01 (phần khẩn) | Giữ trần 4 GB; thêm theo dõi heap: in `--extendedDiagnostics` trong bước typecheck để thấy xu hướng; tài liệu cho dev cách đặt heap | Headroom 6 % ⇒ OOM sắp tới chặn mọi PR | — | Low | Mỗi run CI in "Memory used"; dev doc có lệnh | PR nhỏ `ci.yml` ⚑ + docs |
| RES-02 (phần lỗi) ⚑ | Đặt `SENTRY_DSN`/`SENTRY_ENVIRONMENT` cho web + 3 worker (mã đã hỗ trợ); khai biến `sync: false` trong `render.yaml` để không bị quên | Lỗi production vô hình | Tài khoản Sentry (dịch vụ trả phí?) | Low | Sự kiện thử xuất hiện trên Sentry từ 4 dịch vụ | PR `render.yaml` + runbook |

## P1 — Độ tin cậy và hạ tầng ưu tiên cao

| Finding | Thay đổi | Lý do | Phụ thuộc | Độ phức tạp | Acceptance | Ranh giới PR |
|---|---|---|---|---|---|---|
| TC-03 + CI-04 ⚑ | Một bước kiểm kiểu đầy đủ: `next typegen` → `tsc --noEmit`; cả hai `next build` đặt `SKIP_BUILD_TYPECHECK=true`; build 1 lần, chia `.next` cho `e2e-ux` qua artifact | Bỏ 2 lần kiểm kiểu 4–5 phút ở 94 % heap; bỏ 1 build | — | Medium | Kiểm kiểu ×1/commit gồm typed routes; `next build` ×1; lỗi href cố ý bị bắt ở bước typecheck | PR 1: typegen+tsc; PR 2: build-once/artifact |
| TC-02 | Tối ưu 31 tệp nóng typed routes (thay `"…" as Route` bằng hằng/hàm route khai báo 1 lần, hoặc literal trực tiếp); đo trước/sau theo `03 §7` | 72 % thời gian check, +0,85 GB heap | TC-03 (để đo đúng) | Medium | Heap kiểm kiểu ≤ 75 % trần; thời gian check typed routes giảm có số đo | 1 PR / nhóm tệp (dashboard, organization, chat…) |
| RES-01 ⚑ | Đặt `--max-old-space-size` ≤ 75 % RAM gói (hoặc nâng gói web); tách heap build khỏi heap runtime nếu cần | Heap 2048 MB trên gói 512 MB | RES-02 đo RAM thực | Low (cấu hình) — quyết định chi phí | RSS p95 ≤ 80 % RAM gói 7 ngày; 0 OOM-kill | PR `render.yaml` + runbook |
| CI-02 | (gộp vào CI-01) merge queue / up-to-date | PR xanh → main đỏ | CI-01 | Low | 0 main đỏ do merge skew 30 ngày | cài đặt repo |
| CI-06 ⚑ | Tách `web` thành job song song (static, unit, tenant, platform, build) với khâu chuẩn bị chung; cập nhật tên check ở ruleset + `render.yaml` comment + runbook cùng lúc | Điểm hỏng đơn; skip cổng | CI-01 (tên check) | Medium | Một cổng đỏ không skip cổng khác; Render vẫn chỉ deploy khi mọi check xanh | 1 PR `ci.yml` + docs |
| SEC-03 | `permissions: contents: read` cho `ci.yml`, `ui-weekly.yml` | Least privilege | — | Low | 100 % workflow có `permissions` | PR nhỏ ⚑ |
| DEP-01 + SEC-02 ⚑ | Lock Python có hash (`pip-tools`/`uv` — công cụ mới), tách dev requirements; thêm `pip-audit` | Tái lập + quét lỗ hổng | PO duyệt công cụ | Medium | `pip install --require-hashes` xanh ở CI + Render; `pip-audit` chạy mỗi PR | PR 1 lock; PR 2 audit |
| CI-07 | DB test dựng bằng `prisma migrate deploy` thay `db push` | Test cách ly trên lược đồ giống production | — | Medium (có thể lộ test phụ thuộc lược đồ push) | `test:tenant` xanh trên DB dựng từ migration | PR riêng `ci.yml` ⚑ + `scripts/dung-db-test.sh` |

## P2 — Hiệu năng và khả năng bảo trì

| Finding | Thay đổi | Phụ thuộc | Độ phức tạp | Acceptance | Ranh giới PR |
|---|---|---|---|---|---|
| CI-03 | Shard `test:tenant` theo N DB `_test` (mỗi worker 1 DB) hoặc giảm phạm vi reset; giữ chốt `_test` | CI-06 | High | Trung vị thời gian `test:tenant` giảm, 0 flake mới trong 20 run | PR helper DB + PR `ci.yml` |
| CI-05 ⚑ | `concurrency` (cancel cho PR, không cho `main`); `paths-ignore` tài liệu với job "skip" giữ tên check | CI-01 | Low | Push mới huỷ run PR cũ | PR `ci.yml` |
| TC-05, RES-06 | Cache tsbuildinfo, `.next/cache`, pip, Playwright browsers | TC-03 | Low | Có cache hit được ghi trong log | PR `ci.yml` |
| DEP-02 | `engines`, `.nvmrc`, ghim `NODE_VERSION` minor | — | Low | CI/Render/local cùng phiên bản (bước kiểm) | PR nhỏ |
| DEP-03 | Nâng `@sentry/nextjs` 11.11.0; sổ ngoại lệ moderate có hạn | — | Low | 0 moderate prod không có ticket | PR dependency |
| RES-03, RES-04 | Đo RAM worker 1 tuần, chọn gói; ghi ngân sách kết nối + cảnh báo 80 % | RES-02 | Low–Medium | Theo `11-ACCEPTANCE-CRITERIA.md` §5 | PR `render.yaml` + runbook ⚑ |
| SEC-04 | Bật push protection (nếu gói cho phép); hook pre-commit gitleaks tuỳ chọn | gói GitHub | Low | Push protection bật hoặc ghi lý do | cài đặt + PR hook |
| CI-08, CI-10 | `pg_isready -U`; sửa tài liệu lệch | — | Low | Log không còn FATAL root; tài liệu khớp | gộp vào PR CI gần nhất |

## P3 — Tối ưu dài hạn và trưởng thành kỹ thuật

| Finding | Thay đổi | Độ phức tạp | Acceptance |
|---|---|---|---|
| TC-07 ⚑ | Đánh giá TS 7 cho `tsc` khi typescript-eslint hỗ trợ, hoặc chạy song song có ca đối chiếu kết luận | Medium | Hai phiên bản cho cùng kết luận trên toàn repo, hoặc PO chấp nhận khác biệt được ghi sổ |
| TC-04 | Theo dõi kích thước Prisma Client sinh mỗi PR schema; xem lại quan hệ ngược về `organizations` | Medium | Báo cáo kích thước trong PR schema |
| RES-05 | Advisory lock cho 5 scheduler trước khi scale web > 1 | Low | Hai instance không chạy trùng một lượt (test) |
| RES-07 | Load test staging 5 hành trình chính; baseline RPS/p95/RAM | Medium | Báo cáo được lưu, lặp lại mỗi quý |
| SEC-05, CI-09 | Ghim action theo SHA; nâng action Node 24 | Low | 0 cảnh báo Node 20; 100 % action ghim SHA |
| DEP-04, DEP-06, DEP-07, DEP-08 | ESLint 10 khi được hỗ trợ; gỡ `shadcn` nếu không dùng; sổ major; kiểm tra giấy phép ⚑ | Low–Medium | Sổ major xem lại hằng tháng |
| CI-11 | Chạy `ui-weekly` thủ công một lần, sửa hoặc bỏ | Low | ≥ 1 run thành công |

## Thứ tự khuyến nghị

1. **SEC-01 quyết định** → 2. **CI-01/CI-02 ruleset** → 3. **RES-02 Sentry** → 4. **TC-03+CI-04** (1 lần kiểm kiểu, 1 lần build) →
5. **TC-02** tối ưu typed routes (đo) → 6. **RES-01** heap/gói theo số đo → 7. **CI-06** tách job → 8. **DEP-01+SEC-02** →
9. **CI-07** → 10. P2 còn lại → 11. P3.
