# Lộ trình Enterprise Readiness — ALG

Nội bộ (không vào bản giao khách). Lập 30/10/2026 từ 8 chuẩn đã đối chiếu code + chuẩn 09/10. Mỗi hạng mục khi làm: **một nhánh, một PR**, kèm test/gate, cập nhật cột trạng thái trong `smeos/*.md` cùng commit. Ký hiệu: **PO** = cần Product Owner quyết trước khi làm (dependency, nhà cung cấp, schema, CI, `render.yaml`, chi phí).

## Tổng quan

| Giai đoạn | Mục tiêu | Hạng mục | Điều kiện hoàn thành |
|---|---|---|---|
| **G0 · Dọn nền** (1 tuần) | Gate xanh, chuẩn đúng code | E0 | `main` xanh mọi gate kể cả `audit:industry:check` |
| **G1 · Production-ready** (3–5 tuần) | Biết lỗi trước khách, chạy được nhiều instance, khôi phục được | E1 E2 E3 E4 E5 | SLO đo được; 2 instance staging chạy đúng; diễn tập khôi phục đạt RTO |
| **G2 · Commercial** (4–6 tuần) | Thu tiền thuê bao, kiểm soát chi phí, vòng đời tenant | E6 E7 E8 | Một tenant thật trả tiền qua cổng; trần chi phí AI chặn đúng |
| **G3 · Enterprise** (theo hợp đồng) | Bán cho chuỗi lớn/doanh nghiệp | E9 E10 E11 E12 | Bộ hồ sơ bảo mật; SSO + MFA; API/webhook công khai |

Thứ tự phụ thuộc: E0 → E1 → (E2, E5) → E4 → E3 · E1 → E8 · E6 → E7 · E10 trước E9/E11.

---

## G0 · Dọn nền

**E0 — Gate xanh & nợ chuẩn**
1. ✅ (30/10/2026) Thuật ngữ ngành hardcode: `b9b51f47` whitelist tệp giữ từ vựng hoa có chủ đích + câu trung tính; E0.1 đổi nốt 11 lỗi (Creative Studio, cam kết mặc định, sự kiện phiếu chế tác) sang ngôn từ trung tính. Baseline hạ 21 → 6 (0 lỗi, còn 6 cảnh báo IT-F07/F08).
2. ✅ (30/10/2026) `audit:industry:check` chạy trong CI (`ci.yml`, sau `lint:ux`) — PO duyệt Q5.
3. ✅ (30/10/2026) `core/governance/tier-of.ts` — `tierOf`, `isChainTier`, `organizationTierOf`; kiểu `GovernanceTier` (nợ #194).
4. ✅ (30/10/2026) Gỡ `cascading-resolver.ts` + 4 tệp `cascading-*`; lõi chung `core/governance/layered-resolver.ts` cho ma trận quản trị và thông báo (nợ #193).
5. ✅ (30/10/2026) Hằng `TRASH_RETENTION_DAYS` (nợ #196); mở rộng test chặn gọi AI trực tiếp ra toàn `src/` (nợ #197).

## G1 · Production-ready

**E1 — Giám sát** (chuẩn 09)
1. ✅ (30/10/2026) `request_id` — trước đó repo **chưa có** `proxy.ts`/middleware (Next 16 đổi tên middleware thành proxy — xem `node_modules/next/dist/docs/`) → thêm tệp này để sinh/nhận `x-request-id`, đưa vào ngữ cảnh `log`, header phản hồi `x-request-id`, cột `request_id` trên `generation_jobs` (**PO: schema**), worker đọc và log lại.
2. ✅ (30/10/2026) Ratchet `console.*` bằng test (`no-console-ratchet.test.ts`, chỉ giảm).
3. ✅ (30/10/2026) `workers/shared/log_json.py` — log JSON cùng trường với web, ngữ cảnh job theo `request_id`; còn `print` ở worker media/video cần đổi dần.
4. ✅ (30/10/2026) `/api/health/ready` tách khỏi `/api/health`; worker heartbeat qua `application_name` + `pg_stat_activity` (không cần bảng/Redis/phụ thuộc mới).
5. ✅ (30/10/2026) Sentry (PO chọn): `@sentry/nextjs` 11.8.0 + `sentry-sdk` 2.72.0, cổng `error-tracker.ts` + adapter, bật khi có `SENTRY_DSN`, lọc dữ liệu khách. Chưa gửi lỗi phía trình duyệt.
6. ✅ (30/10/2026) Mở rộng `/van-hanh/suc-khoe` (không tạo màn mới): bộ xử lý nền + hàng đợi theo loại việc; chi phí AI theo tenant đã có ở `/van-hanh/muc-dung`. Kênh thông báo chưa có số liệu lưu trong DB — dời sang khi có công cụ metrics (E1.5).
7. ✅ (30/10/2026) SLO v1 S1–S4 + truy vết `request_id` trong `docs/handover/OPERATIONS_RUNBOOK.md` §10–11; thêm log `http.internal_error` (lỗi 500 trong `handle()`) và `notification.dispatched` làm SLI. PO duyệt mục tiêu 30/10/2026.
*Nghiệm thu:* lần ngược một lỗi từ log web tới dòng log worker bằng một `request_id`.

**E2 — Nhiều instance** (chuẩn 10)
1. Hub SSE qua Redis pub/sub (`notification-sse-adapter.ts`), giữ fallback 1 instance khi không có Redis.
2. Thông báo: resolve một lần cho mọi kênh, giảm ~36 → ≤ 6 truy vấn (nợ #183) + test đếm truy vấn.
3. Cache cấu hình đọc nhiều (ma trận quản trị, quyền, plugin) trong Redis, khoá theo tenant, xoá khi ghi.
4. Giới hạn pool `PrismaPg` theo biến môi trường; **PO:** pooler nếu > 2 instance.
5. **PO:** staging 2 instance web (`render.yaml`) → kiểm SSE, rate limit, job không trùng.
*Nghiệm thu:* test e2e thông báo thời gian thực qua 2 instance.

**E3 — Sao lưu & khôi phục**
1. **PO:** bật PITR Postgres + thời gian giữ; versioning/backup cho R2/S3.
2. Diễn tập khôi phục trên staging, ghi RPO/RTO thật vào runbook (nợ #183).
3. Sau khi có backup kho tệp: **PO** bật `STORAGE_DELETE_PAYLOADS` (SDAGF D-06).
4. Lịch `npm run storage:reconcile` hằng tuần, báo kết quả.

**E4 — Phát hành an toàn**
1. Quy ước migration expand/contract trong skill `database-schema` + checklist PR.
2. Cờ tính năng chung (mở rộng `ux-rollout-flags`): bật theo tenant / theo %, audit, đọc có cache — không đổi schema nếu dùng `platform_settings`.
3. **PO:** môi trường staging cố định + dữ liệu mẫu; e2e chạy trên staging trước khi lên production.
4. Kiểm tải (k6/Artillery — **PO: dependency**) kịch bản cao điểm lễ; ngưỡng ghi vào runbook.

**E5 — Hàng đợi có kỷ luật**
1. ✅ (30/10/2026) Tự thử lại job lỗi tạm thời: `generation_jobs.run_after` + `failure_kind` (PO duyệt schema), `workers/shared/job_failure.py` (một câu UPDATE nguyên tử), tối đa 3 lần, backoff có ngẫu nhiên; worker nhận việc lọc `run_after`. Video/nhân bản giọng chỉ phân loại. Chạy lại thủ công đặt `attempts` về 0 (sửa lỗi cộng hai lần).
2. ✅ (30/10/2026) `/van-hanh/hang-doi-loi`: xem lý do, Chạy lại (lượt mới, nền tảng chịu chi phí) / Gác lại (→ CANCELLED); mã mới `N15` để `N5` vẫn chỉ đọc; ghi `platform_audit_logs`. Lỗ hổng chạy lại miễn phí phía tiệm (YC-J3 sau khi đã hoàn credit) ghi nợ #200 — chờ PO.
3. ✅ (30/10/2026) Bảng `idempotency_keys` (PO duyệt schema) + `claimIdempotencyKey` (`src/core/idempotency/infra/`); áp dụng webhook Facebook (`mid`) và Zalo (`msg_id`); cron dọn khoá > 30 ngày. E6 dùng cho thanh toán (ghi khoá trong cùng giao dịch).
*Nghiệm thu:* test chạy lại job không nhân đôi kết quả/credit.

## G2 · Commercial

**E6 — Tính tiền & đo sử dụng** *(chuẩn mới 11)*
1. Sổ đo sử dụng thống nhất: AI (đã có sổ AI), dung lượng kho, tin nhắn kênh ngoài, số chi nhánh.
2. Hạn mức theo gói (`PLAN_FEATURES` → thêm định mức), cảnh báo 80%/100%, chặn mềm.
3. **PO:** cổng thanh toán (VietQR động / PayOS / VNPay) — adapter `adapters/`, webhook ký + idempotent (E5.3).
4. Thuê bao: chu kỳ, hoá đơn, gia hạn, hạ/nâng gói không mất dữ liệu. **PO: schema.**

**E7 — Vòng đời tenant**
1. Trạng thái: dùng thử → hoạt động → quá hạn → tạm ngưng (chỉ đọc) → huỷ → xoá sau N ngày (tôn trọng legal hold).
2. Xuất toàn bộ dữ liệu tenant (đã có export từng phần + audit) thành một gói.
3. Quyền chủ thể dữ liệu theo Nghị định 13/2023: ghi nhận đồng ý, yêu cầu truy cập/xoá dữ liệu khách cuối. **PO + pháp lý.**

**E8 — Chi phí AI theo tenant**
1. Trần chi phí theo gói/tháng trong gateway (`callCapability`), cảnh báo, tự hạ mô hình rẻ hơn hoặc dừng tác vụ không thiết yếu.
2. Báo cáo biên lợi nhuận theo tenant (doanh thu gói − chi phí AI − lưu trữ).

## G3 · Enterprise

**E9 — Định danh doanh nghiệp**: SSO SAML/OIDC theo tổ chức (mở rộng `modules/sso`), SCIM cấp/thu hồi, **MFA bắt buộc** cho chủ tiệm và operator, đăng xuất mọi thiết bị. **PO: auth/SSO.**

**E10 — Hợp nhất mô hình phân tầng**: tầng Ngành có dữ liệu (nợ #195, **PO: schema**); lịch sử + hoàn tác quyết định quản trị; cân nhắc tầng Tập đoàn (nhiều chuỗi).

**E11 — Tích hợp mở**: API công khai có phiên bản, khoá API theo tenant có phạm vi (mở rộng `modules/integration`), webhook gửi ra có ký + thử lại + dead-letter (dùng E5), tài liệu OpenAPI.

**E12 — SLA & tuân thủ**: trang trạng thái; SLA theo gói đo từ SLO (E1); CSP chuyển từ Report-Only sang chặn; kiểm thử xâm nhập định kỳ; bộ hồ sơ bảo mật (chính sách, sổ rủi ro SDAGF, mẫu audit log, quy trình sự cố).

---

## Quyết định PO (cập nhật 30/10/2026)
| # | Quyết định | Kết quả PO | Ảnh hưởng |
|---|---|---|---|
| Q1 | Công cụ theo dõi lỗi / metrics | ✅ **Sentry** (PO chọn 30/10/2026) — SDK Next.js + Python | E1.5, E1.6 |
| Q2 | Cột `request_id` trên `generation_jobs` | ✅ Đồng ý | E1.1 |
| Q3 | Staging + 2 instance Render | ⏸ **Làm khi bàn giao** — code E2 vẫn viết và test cục bộ; nghiệm thu 2 instance dời tới lúc bàn giao | E2.5, E4.3 |
| Q4 | PITR Postgres + backup object store | ✅ Đồng ý — bật trên dashboard Render/R2 (chủ tài khoản thao tác), agent ghi RPO/RTO vào runbook | E3 |
| Q5 | `audit:industry:check` vào CI | ✅ Đồng ý — thêm vào CI **sau** khi E0.1 hạ vi phạm về baseline, để CI không đỏ ngay | E0.2 |
| Q6 | Chọn động cơ quản trị phân tầng duy nhất | ✅ **Phương án 2** — gỡ động cơ chết, gộp A + B về lõi chung (đã làm) | E0.4 |
