# Nhật ký thay đổi — tối ưu GitHub Actions

> Báo cáo đầy đủ (số đo, rủi ro, cơ hội còn lại): [`GITHUB_ACTIONS_OPTIMIZATION_REPORT.md`](GITHUB_ACTIONS_OPTIMIZATION_REPORT.md).
> Mã `O-n` khớp §3 của báo cáo. Không đổi tên job, không xoá cổng, không sửa `render.yaml` hay mã ứng dụng.

## 10/11/2026 — nhánh `claude/bold-bardeen-473alq`

### `.github/workflows/ci.yml`
- **O-1** Thêm `concurrency` cấp workflow: `group: ci-<sự kiện>-<số PR | SHA>`, `cancel-in-progress` chỉ khi `pull_request`.
  Push `main` nhóm theo SHA ⇒ không bao giờ bị huỷ (cổng deploy của Render).
- **O-2** `timeout-minutes`: `web` 75, `security` 15, `industry-terms` 10, `worker` 20, `e2e-ux` 40 (trước: mặc định 360).
- **O-3** Xoá bước `npm run build` cuối job `web`. Xoá `SKIP_BUILD_TYPECHECK: "true"` khỏi env của `e2e-ux` ⇒ build của `e2e-ux` là lần
  `next build` duy nhất và có kiểm kiểu (gồm typed routes).
- **O-4** `industry-terms`: bỏ `cache: npm` + `npm ci`; chạy `npm exec --package=tsx@<bản trong package-lock.json> -- tsx scripts/industry-term-audit.ts --check`.
- **O-5** `worker`: checkout `fetch-depth: 2` trên PR; bước `scope` so `HEAD^1..HEAD` của merge ref — PR không đổi `workers/` hay `ci.yml` thì bỏ
  qua setup-python, ffmpeg, pip, pytest (job xanh, có `::notice`). Push `main` và lỗi đọc diff ⇒ chạy đủ.
- **O-7** `web`: bước mới "Postgres CI dùng một lần — tắt ghi đĩa đồng bộ" (`ALTER SYSTEM SET fsync/full_page_writes/synchronous_commit = off`
  + `pg_reload_conf()`), đặt trước `db:deploy`. `worker`: `setup-python` thêm `cache: pip` (`workers/requirements.txt`).

### `.github/workflows/codeql.yml`
- **O-1** Thêm `concurrency` như `ci.yml` (nhóm `codeql-…`); push `main` và lịch tuần không bị huỷ.
- **O-2** `timeout-minutes: 30` cho `analyze`.
- **O-6** Checkout `fetch-depth: 2` trên PR; bước `scope`: chỉ ngôn ngữ `python` trên `pull_request`, PR không đổi `*.py`, `workers/`,
  `codeql.yml`, `scripts/codeql-*` ⇒ bỏ qua init/analyze/upload artifact/gate. JS/TS luôn chạy.

### `.github/workflows/ui-weekly.yml`
- **O-2** `timeout-minutes: 60`; `concurrency: { group: ui-weekly, cancel-in-progress: false }`.

### `.github/workflows/release-gd1.yml` (11/11/2026, sau khi merge `main` mang workflow này vào)
- **O-8** `concurrency` (nhóm `release-gd1-…`, chỉ huỷ trên PR); `timeout-minutes: 90`; bước "Postgres CI dùng một lần — tắt ghi đĩa
  đồng bộ" trước bước dựng CSDL của bản cắt. Trigger và mọi bước kiểm giữ nguyên.

### Tài liệu
- Thêm `docs/audit/GITHUB_ACTIONS_OPTIMIZATION_REPORT.md` và tệp này.

### Hoàn tác
Mỗi mục độc lập; hoàn tác bằng `git revert` commit này hoặc xoá đúng khối có nhãn `O-n` trong workflow. Hoàn tác O-3 phải làm cả hai nửa
(trả `npm run build` cho `web` **và** `SKIP_BUILD_TYPECHECK` cho `e2e-ux`), nếu không CI sẽ build 2 lần hoặc mất kiểm kiểu trong build.
