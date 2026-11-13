# 21 — Đối chiếu checklist `18` với mã thật (13/11/2026)

Bảng tiến độ `18` §12 ghi phần lớn hạng mục ⬜/🟦 từ đầu tháng 11, nhưng nhiều việc đã vào `main` qua các đợt sau (audit API §37–§42, ADR-012/014/015, UJ-11…).
Tài liệu này đối chiếu từng hạng mục với mã ở `main` sau PR #64, kèm PR #66 đang mở.
Bằng chứng là đường dẫn tệp. Mục nào chỉ kiểm được trên Render, GitHub hoặc với PO thì ghi **[TAY]**, không suy đoán.

Ký hiệu: ✅ xong trong mã · 🟨 một phần · ⬜ chưa làm · 🟦 mã xong, chờ PO/thao tác tay · 🔁 quyết định PO thay hướng.

## GĐ0 — Ổn định

| Mã | TT | Bằng chứng / còn thiếu |
|---|---|---|
| P0-01 | ✅ | Job `industry-terms` xanh trên CI (PR #64) |
| P0-02 | 🟦 | `render.yaml`: `autoDeployTrigger: checksPass` + `branch: main` cho 5 dịch vụ; test `render-blueprint-tu-du.test.ts`. **[TAY]** thử sync blueprint trên Render |
| P0-03 | ⬜ | **[TAY]** ruleset `main`, repo riêng tư, archive `floraos-core` — không kiểm được từ repo |
| P0-04 | ✅ | `resolve-platform-session.ts`: quyền vận hành chỉ từ `platform_operators` |
| P0-05 | 🟦 | Chốt ở `getStorageProvider`, `/api/health/ready` báo kho. **[TAY]** PO xác nhận `STORAGE_*` trên Render |
| P0-06 | ✅ | Đã ẩn nghiên cứu thị trường và bỏ thành công giả. E2E "không còn nút dẫn tới lỗi" chưa có test riêng |
| P0-07 | ✅ | CI `web` (unit + tenant + platform + build) xanh trên PR #64 |
| P0-08 | ✅ | `next.config.ts` chỉ bỏ kiểm kiểu khi `SKIP_BUILD_TYPECHECK=true` (Render) |
| P0-09 | ⬜ | **[TAY]** duyệt app Meta/Zalo |

## GĐ1 — Nền production (cổng M1)

| Mã | TT | Bằng chứng / còn thiếu |
|---|---|---|
| P1-01 | 🟨 | `buildCommand` không còn migration; `preDeployCommand: db:deploy && db:seed`. `db:seed` chỉ nạp vai hệ thống và sổ AI, đúng tinh thần `db:seed:system`. Còn: `db-deploy.mjs` chưa ghi mốc cho PITR; chưa thử migration lỗi |
| P1-02 | ⬜ | Runbook §4 còn **[CẦN XÁC NHẬN]** về PITR; chưa diễn tập khôi phục — chờ I-7 |
| P1-03 | ⬜ | Không có `scripts/smoke-after-deploy*` |
| P1-04 | 🟨 | Có adapter `src/core/observability/adapters/sentry-error-tracker.ts`; `render.yaml` chưa khai `SENTRY_*`; **[TAY]** DSN — chờ I-5 |
| P1-05 | 🟨 | `src/core/runtime/infra/cluster-lock.ts` (`runExclusive`) dùng ở 5 bộ quét + `tests/tenant/cluster-lock.test.ts`. Còn `crm/customer-metrics-scheduler.ts` chưa khoá |
| P1-06 | ⬜ | Chưa có cảnh báo email sau `N3`/`N7`/`N14` |
| P1-07 | 🟦 | `src/core/http/origin-guard.ts` gọi trong `handle()` (không phải `proxy.ts`), test unit + tenant. **[TAY]** `ORIGIN_CHECK_MODE=enforce` |

## GĐ2-A — 4 tầng

| Mã | TT | Bằng chứng / còn thiếu |
|---|---|---|
| P2-A1 | 🔁 | D-48 (05/11/2026) thay D-01: giữ tầng Ngành, làm sau; không gỡ `INDUSTRY` |
| P2-A2 | ✅ | `organization_links.is_primary` + trigger; `organization/infra/tier-chain-repository.ts` `resolveTierChain` |
| P2-A3 | ✅ | Chỉ còn model `branches`; không còn `chain_branch_code`; `tests/tenant/branches-merge.test.ts` |
| P2-A4 | ✅ | `TenantContext.grants`, `src/core/tenancy/branch-scope.ts` |
| P2-A5 | 🟨 | Phạm vi chi nhánh áp ở đơn hàng, khách hàng, điều phối, sản phẩm/giá, báo cáo, kho, Thẻ chào (test `branch-scope*.test.ts`). Chưa rà đợt 3 (mô-đun còn lại) |
| P2-A6 | ⬜ | Còn 16 phép so `roleKey ===` trong `src/components`; chưa có test kiến trúc |
| P2-A7 | 🟨 | Vai `customer_service`/`product_manager` có trong `role-ux-catalog.ts`; quyền chờ I-1 |
| P2-A8 | 🟨 | `tool-route-entitlement.ts` có cột `apis`, nhưng 5/10 công cụ chưa khoá API (gồm `greeting-card`); `system-optimizer` còn |
| P2-A9 | 🟨 | `nav-mother.ts` lọc theo mã năng lực; 2 liên kết hỏng chưa xác minh |
| P2-A10 | ⬜ | Ma trận `PAYMENTS` lưu/đọc được (test đối chiếu tầng) nhưng chưa thấy áp vào sổ thu/phí gia công ngoài Thẻ chào |
| P2-A11 | ✅ | `tests/tenant/tier-consistency.test.ts` |

## GĐ2-B — Thương mại (cổng M2)

| Mã | TT | Bằng chứng / còn thiếu |
|---|---|---|
| P2-B1 | ⬜ | `entitlement-service.ts` trả `PRO` khi tổ chức không có gói; `sign-up.ts` không gán `STARTER` |
| P2-B2 | ⬜ | Không route nào kiểm gói |
| P2-B3 | ⬜ | Chưa có khoá/gợi ý nâng cấp theo gói |
| P2-B4 | ⬜ | Không có `VND_PER_CREDIT` — chờ A-1 |
| P2-B5 | ⬜ | Không có bảng `credit_topups` |

## GĐ2-C — Tích hợp

| Mã | TT | Bằng chứng / còn thiếu |
|---|---|---|
| P2-C1 | 🟨 | `integration-hub/adapters/connector-contract.ts`; chưa có test kiến trúc "host nhà cung cấp chỉ trong thư mục đầu nối" |
| P2-C2 | 🟨 | Zalo ZNS gửi thật ở `notification/infra/channel-adapters/zalo-adapter.ts`, chưa qua Hub |
| P2-C3 | ⬜ | SePay ở `greeting-card/use-cases/payment-webhook.ts` và `orders/…/match-standard-bank-transfers.ts`, ngoài Hub |
| P2-C4 | 🟨 | SMS gửi thật (`sms-adapter.ts`, không còn stub), chưa qua Hub |
| P2-C5 | ⬜ | Ba bản Telegram: Hub, thông báo, Thẻ chào (`staff-channels`) |
| P2-C6 | ⬜ | Messenger chưa vào Hub |
| P2-C7 | 🟨 | `email-adapter.ts` ở thông báo, chưa qua Hub |
| P2-C8 | ✅ | Kênh Zalo của thông báo không còn stub |
| P2-C9 | ✅ | Bảng `push_subscriptions`, `web-push-protocol.ts` (tự triển khai, không thêm thư viện), `web-push-adapter.ts` |
| P2-C10 | ✅ | `connector-catalog.ts` ghi trạng thái `MANAGED`/`LEGACY`/`COMING_SOON` |

## GĐ2-D/E/F/G

| Mã | TT | Bằng chứng / còn thiếu |
|---|---|---|
| P2-D1 | ⬜ | Không có `workers/shared/ai_policy.py`; worker còn gọi thẳng OpenAI (`media_ai/providers/enhancement/openai_enhancer.py`, `media_ai/audio/tts_engine.py`, `vision/providers/openai_structured.py`) |
| P2-D2 | ⬜ | `CLAUDE.md` #5 vẫn ghi mọi lời gọi qua `callCapability`, chưa phản ánh worker |
| P2-E1 | ✅ | `src/core/http/csp.ts`: CSP theo nonce, mặc định chặn (D-68) |
| P2-E2 | ✅ | `content-engine/rewrite` gác ở use-case (`requireRewriteCapability`), ARC-025 đã đóng |
| P2-E3 | ⬜ | Chưa có biên bản OWASP ASVS |
| P2-F1 | ✅ | `customer_consents`, `data_subject_requests` + `tests/tenant/data-subject-requests*.test.ts`. Cơ sở pháp lý D13 vẫn chờ PO |
| P2-F2 | 🟦 | `organization/use-cases/retention-scheduler.ts` chạy hằng đêm (ADR-014); phạm vi "3 tháng" chờ I-2 |
| P2-F3 | ⬜ | Còn 18 cột `status String`; DB test vẫn dựng bằng `db push` (`scripts/dung-db-test.sh`) |
| P2-F4 | ✅ | `orders/domain/order-lifecycle.ts` là nơi duy nhất xét chuyển bộ ba trục (BL-03); `business-reporting.ts` chưa đối chiếu lại |
| P2-G1 | ⬜ | **[TAY]** |
| P2-G2 | ⬜ | Còn mã LocalBudd (`integration/use-cases/*`, `profiles/domain/profile-rules.ts`, `dev:all`) |
| P2-G4 | ⬜ | Còn proxy, SSO liên-app, token tích hợp |

## Workstream S — Thay SocialFlow

| Mã | TT | Bằng chứng / còn thiếu |
|---|---|---|
| S-00 | ⬜ | = P0-09 **[TAY]** |
| S-01 | ✅ | = P0-06 |
| S-02 | ✅ | `social_posts`, `social_post_attempts` (thay `social_post_events`) + `tests/tenant/social-publishing.test.ts` |
| S-03 | ✅ | `social-publishing/domain/post-lifecycle.ts`, `schedule.ts`, `channel-rules.ts` + unit |
| S-04 | ✅ | `/api/v1/social-publishing/posts` (đường dẫn khác bản kế hoạch `/social/posts`) |
| S-05 | 🟨 | `content-studio/publish-api.ts` gọi API nội bộ; chưa xác minh gói chiến dịch / Chặng 10 |
| S-06 | ✅ | `connect-channel.ts`, `refresh-connection.ts`, `adapters/oauth/` + `social-channel-connect.test.ts` |
| S-07/S-08 | 🟦 | `meta-graph-publisher.ts` (Trang + Instagram); **[TAY]** thử thật |
| S-09 | 🟦 | `zalo-oa-publisher.ts`; **[TAY]** thử thật |
| S-10 | ✅ | `publish-due-posts.ts` qua `/internal/integrations-sweep`, cron trong `render.yaml` |
| S-11 | ⬜ | Không có mã `O7` |
| S-12 | ⬜ | Chưa nối `content_metrics` |
| S-13 | ⬜ | `/lich-dang`, `marketing-workspace.tsx`, `use-channel-accounts.ts` còn 8 lời gọi `/api/v1/proxy` tới SocialFlow |
| S-14 | ⬜ | Còn proxy `SOCIALFLOW`, `worker:socialflow` |
| S-15 | ⬜ | **[TAY]** |
| S-16 | 🟨 | Có `tiktok-publisher.ts`; LinkedIn chưa |

## GĐ3 — Bàn giao (cổng M4)

| Mã | TT | Bằng chứng / còn thiếu |
|---|---|---|
| P3-01 | ⬜ | Chưa rà lại `TRANG_THAI.md` §3/§6 và số liệu `CLAUDE.md` |
| P3-02 | 🟨 | `docs/Audit` đã gộp; có `handover:check`; I-4 chờ |
| P3-03 | 🟨 | `gen:erd` → `docs/kien-truc/ERD_THEO_MIEN.md`; chưa gác trong CI |
| P3-04 | ⬜ | Chờ I-3 |
| P3-05 | ⬜ | Chưa có test bắt buộc Screen Contract |
| P3-06 | ✅ | `tests/unit/architecture/file-size-ratchet.test.ts` |
| P3-07 | 🟨 | `check:layers` cấm `src/components` import `infra/`; chưa cấm domain |
| P3-08 | ⬜ | Còn `vercel.json`, `cron-job-entry.txt`, `chat-assistant/adapters/dify-chat-provider.ts` |
| P3-09 | ⬜ | Chưa kiểm tải |

## Tổng hợp theo cổng mốc

- **M1 — Production an toàn:** chưa đạt.
  - Mã còn thiếu: P1-01 (mốc PITR, thử migration lỗi), P1-03 smoke test, P1-04 khai Sentry, P1-05 bộ quét cuối.
  - Thao tác tay: P0-02/P0-03/P0-05 trên Render và GitHub, P1-02 diễn tập khôi phục (chờ I-7).
- **M2 — Commercial ready (cửa hàng):** chưa đạt.
  - Cả nhóm thương mại P2-B1…B5 chưa làm.
  - P2-C3 SePay ngoài Hub; P1-06; P2-D1 chính sách AI cho worker.
- **M3 — Chuỗi:** P2-A6, A8, A10 chưa xong; A5 còn đợt 3; C5/C6.
- **M4 — Bàn giao:** S-13/S-14 (UI còn gọi SocialFlow), P2-G2/G4, phần lớn GĐ3.
- **Phần đã xong mà bảng `18` §12 chưa ghi:**
  - P0-04, P0-08, P1-07.
  - P2-A2/A3/A4/A11.
  - C8/C9/C10, E1/E2, F1/F4.
  - S-02…S-04, S-06, S-10, P3-06.
