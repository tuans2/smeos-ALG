# 12 — Engineering Infrastructure Baseline (chuẩn dài hạn đề xuất)

> Đề xuất — chưa phải SSOT. Muốn thành chuẩn CANONICAL cần PO duyệt và đăng ký trong `docs/00-DOCUMENTATION-REGISTRY.yaml`.
> Nguyên tắc: giữ quy ước hiện có của repo (ratchet, cổng bắt buộc, Render `checksPass`, expand/contract); chỉ thêm công cụ mới khi có bằng chứng cần.

## 1. Mức trưởng thành hiện tại (dựa trên triển khai, không dựa trên tài liệu)

| Domain | Mức | Lý do |
|---|---|---|
| Typecheck | **1 – Basic** | Cấu hình strict tốt, có cổng; nhưng không đo, chạy 3 lần không tương đương, heap được nâng theo kiểu phản ứng, headroom 6 %. |
| CI/CD | **2 – Defined** | Cổng được định nghĩa, tài liệu hoá kỹ, deploy fail-safe qua Render; nhưng không thi hành ở GitHub (merge đỏ được), không đo xu hướng. |
| Dependency | **2 – Defined** | Lockfile + `npm ci` + Dependabot + audit gate; Python không lock, runtime không ghim, moderate không theo dõi. |
| Security scanning | **1 – Basic** | gitleaks + npm audit hoạt động; CodeQL không ra kết quả; Python không quét; quyền workflow không tường minh. |
| Resource | **1 – Basic** | Có trần pool, trần worker build, health check; không metrics, không cảnh báo tài nguyên, cấu hình heap/gói chưa kiểm chứng. |

Mục tiêu 6 tháng: tất cả ≥ **3 – Controlled** (thi hành nhất quán + có kiểm thử + có giám sát).

## 2. Chuẩn đề xuất

### 2.1 TypeScript
- Một lần kiểm kiểu đầy đủ / commit, gồm route types sinh sẵn; build production không lặp kiểm kiểu.
- Heap kiểm kiểu ≤ 75 % trần; vượt 75 % ⇒ mở ticket tối ưu trước khi được nâng trần (nâng trần cần PO duyệt và ghi lý do).
- Mỗi run CI ghi "Memory used", "Check time", "Instantiations" để theo dõi xu hướng.
- Không thêm `@ts-nocheck`/`any` để đạt ngưỡng hiệu năng.
- Một phiên bản TypeScript cho mọi công cụ; ngoại lệ phải có ca đối chiếu kết luận.

### 2.2 CI/CD
- `main` được bảo vệ bằng ruleset: PR bắt buộc, check bắt buộc, up-to-date hoặc merge queue, chặn force-push.
- Mỗi workflow: `permissions` tường minh, `concurrency` (huỷ run PR cũ), action ghim SHA.
- Không job nguyên khối: các cổng độc lập chạy song song; khâu chuẩn bị chung; build một lần.
- Đổi tên/xoá job bắt buộc = thay đổi cổng production ⇒ cập nhật ruleset + `render.yaml` + runbook cùng PR (giữ quy ước `ci.yml:217-219`).
- DB test dựng bằng đúng đường production (`migrate deploy`).
- Mỗi tháng: báo cáo trung vị thời gian pipeline, tỉ lệ đỏ, phân loại nguyên nhân (mã / hạ tầng / flake).

### 2.3 Dependency
- Mọi hệ (npm, pip, actions) có lockfile hoặc ghim có hash.
- Runtime (Node, npm, Python) khai một nguồn, CI kiểm khớp với Render.
- Minor/patch: Dependabot nhóm tuần. Major: một gói/PR + bảng đo trước/sau + sổ major pending.
- Lỗ hổng: high/critical prod chặn; moderate prod ≤ 30 ngày; dev ≤ 90 ngày; ngoại lệ có hạn.
- Gói ngoài registry: ghi nguồn, hash, người theo dõi.

### 2.4 Security scanning
- SAST chạy và ra kết quả trên mọi PR; phát hiện mới vượt baseline chặn merge; baseline được giảm dần (ratchet như ESLint).
- Quét dependency cho mọi ngôn ngữ chạy production.
- Bí mật: chặn trước push nếu gói GitHub cho phép; gitleaks toàn lịch sử trên CI.
- Phân biệt "quét hỏng cấu hình" với "quét tìm thấy lỗi" trong kết quả check.
- Tenancy/RBAC tiếp tục được bảo vệ bằng `test:tenant`/`test:platform` là check bắt buộc.

### 2.5 Resource & observability
- Mỗi dịch vụ production: trần bộ nhớ ứng dụng ≤ 75 % RAM gói; số đo RAM/CPU 7 ngày trước khi đổi gói.
- Theo dõi lỗi bật ở mọi dịch vụ; cảnh báo tối thiểu: lỗi mới, RAM > 80 %, restart, cron thất bại, kết nối CSDL > 80 %.
- Ngân sách kết nối CSDL được ghi trong runbook và kiểm khi thêm dịch vụ.
- Tác vụ nền: khoá phân tán trước khi scale-out; cân nhắc tách khỏi tiến trình web khi tải tăng.
- Load test staging trước mỗi mốc mở rộng khách hàng; không load test production khi chưa được duyệt.

## 3. Chỉ số theo dõi định kỳ (dashboard kỹ thuật tối thiểu)

| Chỉ số | Nguồn | Tần suất |
|---|---|---|
| Heap/time kiểm kiểu | log CI | mỗi run |
| Trung vị & p90 thời gian pipeline, tỉ lệ đỏ | GitHub Actions API | hằng tuần |
| Số phát hiện SAST/dependency mở theo mức | CodeQL/npm audit/pip-audit | hằng tuần |
| RSS/CPU p95 mỗi dịch vụ, số restart | Render metrics | hằng ngày |
| Kết nối CSDL theo `application_name` | `pg_stat_activity` | hằng ngày |
| Kích thước Prisma Client sinh, số model | `prisma generate` | mỗi PR schema |

## 4. Điều kiện trước khi mở rộng ALG thêm (module/khách hàng)

1. Ruleset `main` thi hành (CI-01) và SAST ra kết quả (SEC-01).
2. Heap kiểm kiểu ≤ 75 % trần (TC-02) — nếu không, mỗi module mới tăng xác suất CI đỏ toàn cục.
3. Theo dõi lỗi + cảnh báo tài nguyên production bật (RES-02).
4. Heap/gói web kiểm chứng bằng số đo (RES-01).
5. Có báo cáo load test staging cho các hành trình chính (RES-07).
