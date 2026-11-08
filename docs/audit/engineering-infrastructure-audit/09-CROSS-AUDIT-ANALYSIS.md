# 09 — Cross-Audit Analysis

> Mục tiêu: gom các phát hiện cùng gốc rễ, chỉ ra phụ thuộc giữa các bản sửa. Không lặp lại bằng chứng — xem `08-FINDINGS-REGISTER.md`.

## 1. Gốc rễ chung (root causes)

### RC-1 — Nhu cầu bộ nhớ kiểm kiểu sát trần, xử lý theo kiểu phản ứng
Gộp: **TC-01, TC-02, TC-03, TC-04, CI-02 (một phần), CI-04 (một phần), CI-06 (một phần)**.
- Chương trình TS = 1 khối (4.701 tệp check + 400 k dòng Prisma sinh) cần 3,0 GB; thêm typed routes thành 3,86 GB.
- Trần heap được nâng từ 2 → 4 GB trong ngày 07/11 sau OOM (commit `6162c8a`); headroom thực của bước build còn ~6 %.
- Vì đứng sát trần, **kết quả CI phụ thuộc vào thứ tự merge** (CI-02: PR #186 xanh → merge `0da028b` OOM) và lỗi OOM ở bước đầu job làm skip mọi cổng sau (CI-06).
- Kiểm kiểu chạy 3 lần không tương đương (TC-03, CI-04) ⇒ nhân 3 số điểm có thể OOM.

### RC-2 — Cổng chất lượng được định nghĩa nhưng không được thi hành ở GitHub
Gộp: **CI-01, CI-02, SEC-01 (khía cạnh chặn), SEC-06**.
- Tài liệu (CLAUDE.md, runbook, comment `ci.yml:217-224`) mô tả "cổng bắt buộc", nhưng `main` không được bảo vệ và PR đỏ đã được merge.
- Lớp chặn duy nhất còn lại là Render `checksPass` — chặn *deploy* chứ không chặn *merge*; khi một check hỏng vì cấu hình (CodeQL), chính cơ chế này chặn mọi deploy (fail-safe nhưng có thể đóng băng phát hành).
- Hệ quả: test tenant/RBAC — kiểm soát bảo mật chính của SaaS đa tenant (SEC-06) — chỉ hiệu lực nếu mọi người tự giác.

### RC-3 — Thay đổi bối cảnh repo (public → private) chưa được phản ánh vào cấu hình
Gộp: **SEC-01, CI-10, (gián tiếp) runner 7 GB trong RC-1, chi phí runner-phút CI-05**.
- `codeql.yml:1` và `ci.yml:107-108` giả định repo công khai. Repo hiện private ⇒ Code Scanning không khả dụng (SEC-01), runner chuẩn nhỏ hơn (7 GB thay vì 16 GB — làm RC-1 nặng hơn), phút Actions bị tính quota (không xác minh được).
- Đây là một **quyết định kinh doanh** (gói GitHub) có hệ quả kỹ thuật ở cả 3 domain.

### RC-4 — Thiếu đo lường vận hành
Gộp: **RES-01, RES-02, RES-03, RES-04, RES-07, CI-03 (không theo dõi xu hướng), TC (không theo dõi heap theo thời gian)**.
- Không có số đo RAM/CPU/kết nối production, không theo dõi thời gian/heap build ⇒ cấu hình (heap 2048 MB trên gói 512 MB, worker AI trên 512 MB) không thể được xác nhận hay bác bỏ.

### RC-5 — Tái lập môi trường không đồng đều
Gộp: **DEP-01, DEP-02, CI-07, SEC-02**.
- npm tái lập tốt (lockfile + `npm ci`), nhưng Python không lock, Node trôi theo `22.x`, DB test dựng khác đường production (`db push` vs `migrate deploy`). Không lock Python cũng làm `pip-audit` (SEC-02) kém ý nghĩa.

## 2. Ma trận tương tác giữa 5 domain

| Từ → Đến | Typecheck | CI/CD | Dependency | Security | Resource |
|---|---|---|---|---|---|
| **Typecheck** | — | OOM làm đỏ/skip CI (TC-01/02 → CI-06, CI-02) | TS 7 đòi chạy 2 phiên bản (TC-07) | — | Build CI đỉnh 4,5 GB RSS trên runner 7 GB |
| **CI/CD** | Kiểm kiểu ×3 (CI-04) | — | Dependabot PR chạy full 35 m | Check bảo mật không chặn merge (CI-01) | ~59 runner-phút/sự kiện |
| **Dependency** | Chọn phiên bản TS quyết định chi phí heap | Python không lock ⇒ CI ≠ Render | — | Python không quét (SEC-02); moderate bỏ qua (DEP-03) | Thư viện AI nặng trên gói 512 MB |
| **Security** | — | CodeQL đỏ có thể chặn deploy (SEC-01 ↔ `checksPass`) | — | — | — |
| **Resource** | Runner private 7 GB giới hạn trần heap khả dụng | Không cache ⇒ tải lại mỗi run | — | Không quan trắc ⇒ sự cố bảo mật khó phát hiện | — |

## 3. Phụ thuộc giữa các bản sửa (thứ tự bắt buộc)

```
[PO quyết định gói GitHub / CodeQL] ──► SEC-01 sửa ──► mới thêm CodeQL vào ruleset (CI-01)
CI-01 (ruleset) ◄── cần SEC-01 xong, nếu không check CodeQL đỏ sẽ khoá mọi merge
TC-03 (1 lần kiểm kiểu gồm typed routes) ──► CI-04 (bỏ kiểm kiểu trong 2 lần build) ──► TC-02 giảm điểm OOM
TC-02 (tối ưu 31 tệp) ── độc lập, nhưng phải đo theo 03 §7 trước khi hạ trần heap
CI-06 (tách job web) ──► phải cập nhật tên check mà Render `checksPass` và ruleset dùng (PO duyệt, ci.yml:217-219)
DEP-01 (lock Python) ──► SEC-02 (pip-audit có ý nghĩa)
RES-02 (quan trắc) ──► RES-01, RES-03, RES-04 (chọn gói/heap theo số đo)
CI-07 (DB test bằng migrate) ── có thể làm lộ test đang dựa vào lược đồ `db push`; chạy riêng, đo kết quả
```

## 4. Điểm yếu kiến trúc rút ra

1. **Một chương trình TypeScript nguyên khối** cho toàn bộ app + test + script + Prisma sinh — không ranh giới biên dịch. Tách project references *không* giảm tổng RAM (đã đo, TC-06) nhưng tối ưu typed routes và giảm số lần kiểm thì có.
2. **Job CI nguyên khối** (`web`) vừa là đường găng thời gian vừa là điểm hỏng đơn.
3. **Phát hành phụ thuộc vào tập check** (Render `checksPass`) mà không có quy trình phân loại check "cấu hình hỏng" vs "mã hỏng".
4. **Tác vụ nền nằm trong tiến trình web** trên gói nhỏ nhất — trộn tải nền với tải request, chặn scale-out an toàn.

## 5. Những gì không bị trùng lặp (giữ riêng)

- DEP-03 (ngưỡng npm audit) được ghi ở Dependency, không lặp ở Security.
- Peak RAM của build CI được ghi trong TC-02, không lặp thành finding Resource riêng.
- SEC-01 là một finding; tác động lên deploy được ghi chú trong CI (không tạo ID mới).
