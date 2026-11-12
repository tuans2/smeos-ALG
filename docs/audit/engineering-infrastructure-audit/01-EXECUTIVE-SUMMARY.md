# 01 — Executive Summary: ALG Engineering Infrastructure & Build Performance Audit

> Audit chỉ đọc · 07/11/2026 · Commit: `main@87f30f2` · Không sửa mã/cấu hình/dependency; 12 báo cáo này là thay đổi duy nhất (chưa commit).
> Phép đo chạy trên bản sao trong scratchpad; dữ liệu CI lấy từ GitHub Actions API. Không truy cập được Render dashboard và cài đặt bảo mật GitHub.
> PR #189 (chưa merge) đang sửa một phần typecheck/CodeQL — audit đánh giá `main`, không đánh giá PR đó.

## 1. Tình trạng tổng thể

**Vận hành được nhưng chưa sẵn sàng mở rộng.** Nền tảng kỹ thuật có nhiều kiểm soát tốt và được tài liệu hoá kỹ (cổng cách ly tenant, migration expand/contract,
deploy chỉ khi CI xanh, lockfile npm, gitleaks toàn lịch sử). Nhưng ba điểm yếu cấu trúc khiến hệ thống **không chịu được tăng trưởng mã và khách hàng** ở trạng thái hiện tại:

1. **Kiểm kiểu đứng sát trần bộ nhớ** — bước kiểm kiểu trong `next build` dùng 3,86 GB / 4,0 GB heap (đo được), đã OOM 2 lần trên CI ngày 07/11.
2. **Cổng chất lượng không được thi hành** — `main` không được bảo vệ; PR #187 được merge khi check đỏ; CodeQL không tạo kết quả từ khi repo private.
3. **Không có quan trắc production** — không theo dõi lỗi mặc định, không metrics; heap web (2048 MB) vượt RAM gói Starter (512 MB, theo bảng giá Render).

## 2. Mức trưởng thành theo domain (theo bằng chứng triển khai)

| Domain | Mức | Một dòng lý do |
|---|---|---|
| Typecheck Performance | **1 – Basic** | Strict tốt; không đo; chạy 3 lần không tương đương; headroom heap 6 %. |
| CI/CD | **2 – Defined** | Cổng định nghĩa & tài liệu đầy đủ, deploy fail-safe; không thi hành merge, pipeline 25–46 phút. |
| Dependency Management | **2 – Defined** | npm tái lập + Dependabot + audit high; Python không lock, runtime không ghim. |
| Security Scanning | **1 – Basic** | gitleaks/npm audit chạy; CodeQL "configuration error"; Python không quét. |
| Resource Management | **1 – Basic** | Có trần pool/worker; không metrics, cấu hình heap/gói chưa kiểm chứng. |

## 3. Số phát hiện theo mức

| CRITICAL | HIGH | MEDIUM | LOW | INFO | Tổng |
|---|---|---|---|---|---|
| 0 | 6 | 16 | 10 | 9 | **41** |

Không có CRITICAL: không thấy lỗ hổng đang bị khai thác, rò rỉ bí mật, hay mất dữ liệu. Các HIGH là rủi ro tin cậy/kiểm soát.

## 4. Top 10 phát hiện quan trọng nhất

| # | ID | Mức | Phát hiện |
|---|---|---|---|
| 1 | CI-01 | HIGH | `main` không được bảo vệ (`protected: false`); PR #187 merge khi `web`/`e2e-ux` đỏ. |
| 2 | SEC-01 | HIGH | CodeQL đỏ mọi run từ ~13:14 UTC 07/11: "Code scanning is not enabled" (repo private) ⇒ 0 SAST; có thể chặn mọi deploy Render qua `checksPass` (cần xác minh). |
| 3 | TC-02 | HIGH | Kiểm kiểu có typed routes: 243 s, 3,86 GB/4 GB heap; 31 tệp chiếm 72 % thời gian (dashboard workspaces, copilot…). |
| 4 | TC-01 | HIGH | `npm run typecheck` OOM với heap mặc định (2.096 MB) — dev không chạy được cổng; CI chỉ qua nhờ `NODE_OPTIONS` thêm ngày 07/11. |
| 5 | RES-02 | HIGH | Blueprint không có `SENTRY_DSN`; không APM/metrics/cảnh báo tài nguyên ⇒ sự cố production vô hình. |
| 6 | RES-01 | HIGH | Web: heap 2048 MB trên gói 512 MB + 5 scheduler nền trong tiến trình ⇒ rủi ro OOM-kill. |
| 7 | CI-02 | MEDIUM | PR xanh tạo `main` đỏ (merge skew) — 2 lần ngày 07/11 (`0da028b`, `0692d9a`). |
| 8 | CI-03 | MEDIUM | `test:tenant` 19,8 phút tuần tự (reset toàn DB ở 418 `beforeEach`) — 65 % job `web`. |
| 9 | CI-07 | MEDIUM | DB test dựng bằng `db push`, thiếu CHECK/TRIGGER/RLS từ SQL migration ⇒ cổng cách ly không chạy trên lược đồ giống production. |
| 10 | DEP-01 | MEDIUM | Worker Python không lock phiên bản; Render cài lại mỗi deploy ⇒ gói production ≠ gói đã test. |

## 5. Phụ thuộc quan trọng giữa 5 domain

- **Typecheck → CI**: heap sát trần làm kết quả CI phụ thuộc thứ tự merge và skip mọi cổng sau bước đỏ (RC-1).
- **Security → CI/Deploy**: CodeQL hỏng cấu hình + Render `checksPass` ⇒ check bảo mật có thể đóng băng phát hành; ngược lại không chặn được merge (RC-2).
- **Quyết định gói GitHub (public → private) → cả 3 domain**: mất Code Scanning, runner nhỏ hơn (7 GB), phút Actions có quota (RC-3).
- **Resource ↔ mọi domain**: không có số đo nên không xác nhận được cấu hình heap/gói, không thấy xu hướng heap build (RC-4).
- **Dependency → Security**: Python không lock làm quét lỗ hổng Python kém ý nghĩa (RC-5).

## 6. Blocker tức thời cho phát triển tiếp

1. **Headroom heap 6 %** ở bước build CI: PR kế tiếp tăng mã đáng kể có thể OOM và chặn mọi merge cho tới khi nâng trần hoặc tối ưu.
2. **CodeQL đỏ vì cấu hình** trên mọi commit `main`: nếu Render tính check này, **không deploy được** — cần xác minh ngay trên Render.
3. Không có blocker nào về bảo mật dữ liệu được phát hiện.

## 7. Trình tự khắc phục khuyến nghị

1. PO quyết định CodeQL/gói GitHub (SEC-01) → 2. Bật ruleset `main` + up-to-date/merge queue (CI-01, CI-02) → 3. Bật Sentry (RES-02) →
4. Một lần kiểm kiểu gồm typed routes, một lần build (TC-03, CI-04) → 5. Tối ưu 31 tệp typed routes, đo trước/sau (TC-02) →
6. Heap/gói web theo số đo (RES-01) → 7. Tách job `web` (CI-06) → 8. Lock + quét Python (DEP-01, SEC-02) → 9. DB test bằng migration (CI-07) → 10. P2/P3.
Chi tiết: `10-REMEDIATION-ROADMAP.md`; tiêu chí: `11-ACCEPTANCE-CRITERIA.md`.

## 8. Điều kiện trước khi mở rộng ALG

- Ruleset `main` thi hành và SAST tạo kết quả.
- Heap kiểm kiểu ≤ 75 % trần đang đặt, chỉ kiểm kiểu 1 lần/commit.
- Theo dõi lỗi + cảnh báo RAM/restart/cron bật ở 4 dịch vụ.
- Heap web và gói Render được xác nhận bằng 7 ngày số đo.
- Có báo cáo load test staging cho các hành trình chính.

## 9. Việc cần quyết định của con người (kiến trúc / kinh doanh)

| Quyết định | Lựa chọn | Liên quan |
|---|---|---|
| Gói GitHub cho repo private | Mua Code Security (+ Secret Protection) **hoặc** chấp nhận gate CodeQL không upload (ghi rõ không phải Code Scanning) **hoặc** quay lại public | SEC-01, SEC-04, RC-3 |
| Có chạy hai phiên bản TypeScript (5.9 cho ESLint/Next, 7 cho `tsc`) | Chấp nhận + ca đối chiếu, hoặc giữ một phiên bản và tối ưu typed routes | TC-07, PR #189 |
| Chi phí hạ tầng Render | Nâng gói web/worker hay hạ heap theo gói | RES-01, RES-03 |
| Đổi tên/tách job CI | Đồng nghĩa đổi cổng production (Render `checksPass`) | CI-06 |
| Công cụ mới | `pip-tools`/`uv`, `pip-audit`, dịch vụ Sentry, công cụ load test | DEP-01, SEC-02, RES-02, RES-07 |
| Chính sách giấy phép dependency | Có/không kiểm tra license tự động | DEP-08 |

## 10. Những gì chưa xác minh được

- Cài đặt GitHub: rulesets (ngoài cờ `protected`), GHAS, secret scanning/push protection, quyền mặc định `GITHUB_TOKEN`, trạng thái Dependabot alerts.
- Render: lịch sử deploy thực tế từ 07/11, việc Render có tính check CodeQL vào `checksPass`, RAM/CPU thực, giới hạn kết nối `basic-256mb`, gói build.
- Thời lượng `test:tenant` cục bộ (không chạy để tránh TRUNCATE ngoài kiểm soát); hiệu năng truy vấn production; tải người dùng đồng thời.
- Quota/chi phí phút GitHub Actions (API trả 0).
- 19 cảnh báo CodeQL high mà PR #189 nhắc tới — không đọc được alert.

## Danh mục báo cáo

`02-REPOSITORY-BASELINE.md` · `03-AUDIT-01-TYPECHECK-PERFORMANCE.md` · `04-AUDIT-02-CICD-OPTIMIZATION.md` · `05-AUDIT-03-DEPENDENCY-MANAGEMENT.md` ·
`06-AUDIT-04-SECURITY-SCANNING.md` · `07-AUDIT-05-RESOURCE-MANAGEMENT.md` · `08-FINDINGS-REGISTER.md` · `09-CROSS-AUDIT-ANALYSIS.md` ·
`10-REMEDIATION-ROADMAP.md` · `11-ACCEPTANCE-CRITERIA.md` · `12-ENGINEERING-INFRASTRUCTURE-BASELINE.md`
