# 16 — Implementation plan: đưa ALG lên Production & Commercial Ready

> Đầu vào: audit `01`–`14`, quyết định PO `15` (01/11/2026). Phạm vi: repo `ALG` (D-36).
> Trạng thái: **bản kế hoạch chờ PO duyệt**. Chưa thực hiện hạng mục nào.
> Hạng mục phụ thuộc đầu vào còn thiếu (`15` §4: D-46, I-1…I-7, A-1) được đánh dấu **[CHỜ]** — không chặn các hạng mục khác.

## 0. Quy ước

- **Mã hạng mục** `P<giai đoạn>-<workstream><số>`. **ARC** = phát hiện audit được xử lý. **D** = quyết định PO.
- **Công** (agent thực hiện + PO xem PR): S ≤ 1 ngày · M 2–4 ngày · L 5–10 ngày · XL > 10 ngày.
- **Cổng duyệt** (D-42): GĐ0–GĐ1 mỗi hạng mục một PR, PO duyệt từng PR; từ GĐ2 mỗi nhóm một PR. Hạng mục **[SCHEMA]** có migration — PO xem riêng (D-29). Hạng mục **[TAY]** là việc PO làm ngoài repo.
- **Định nghĩa xong** cho mọi hạng mục: CI xanh đủ 4 job (`web`, `worker`, `e2e-ux`, `security`); có test cho luật mới; tài liệu SSOT liên quan cập nhật trong cùng PR (`CLAUDE.md`); không tệp mới > 350 dòng; báo cáo PR ghi rõ gate đã chạy.
- **Quay lui**: mã — Render rollback về deploy trước; migration — chỉ thêm (expand), xoá cột ở bản sau (contract); khôi phục PITR khi hỏng dữ liệu.

## 1. Lịch tổng (ước lượng, chưa có ngày mục tiêu — I-6)

```
Tuần:      1     2     3     4     5     6     7     8     9    10    11    12
GĐ0  ████████                                                     Ổn định, chặn rủi ro
GĐ1        ████████████                                           Nền production
GĐ2-A            ████████████████████████                         4 tầng nhất quán (đường găng — D-40)
GĐ2-B            ████████████████                                 Thương mại (gói, credit)
GĐ2-C                  ████████████████████████████               Tích hợp (Hub, kênh)
GĐ2-D/E/F              ████████████████                           AI, bảo mật, dữ liệu
GĐ2-G      ████                                                   Gỡ LocalBudd
GĐ2-S  ▲S-00 duyệt app ……… ████████████████████████████          Thay SocialFlow (`17`)
GĐ3                                      ████████████████████     Bàn giao, tài liệu, chất lượng
```

Tổng công ước lượng: khoảng 100–145 ngày công agent (gồm Workstream S 25–35 ngày), chạy song song 2–3 luồng → 11–13 tuần lịch, phụ thuộc thời gian duyệt app Meta/Zalo.

---

## 2. GĐ0 — Ổn định và chặn rủi ro (tuần 1)

| Mã | Việc | ARC / D | Công | Thiết kế & tệp | Nghiệm thu |
|---|---|---|---|---|---|
| P0-01 | Sửa thuật ngữ ngành vi phạm để `main` xanh | ARC-001, D-19a | S–M | Chạy `npm run audit:industry` lấy danh sách; thay chuỗi hardcode bằng `getIndustryPlugin().terminology` / `ti.*` | `npm run audit:industry:check` xanh; CI `main` xanh |
| P0-02 | Tách ratchet thuật ngữ thành job CI song song; thêm bước deploy cuối CI; `render.yaml` `autoDeploy: false` | ARC-001, D-14a, D-19 | S | `.github/workflows/ci.yml`: job `industry-terms` riêng; job `deploy` `needs: [web, worker, e2e-ux, security, industry-terms]`, chỉ trên `push` `main`, gọi `RENDER_DEPLOY_HOOK_*` (secret GitHub) cho web + 3 worker | PR đỏ không deploy; merge xanh tự deploy |
| P0-03 | **[TAY]** Ruleset `main`: bắt buộc PR + 5 check, chặn force push; thêm secret deploy hook; chuyển repo sang riêng tư (D-22); archive `floraos-core` sau khi xác nhận Render deploy từ `smeOS` (D-37) | ARC-001, 042 | S | Hướng dẫn từng bước trong PR P0-02 | Ảnh chụp cấu hình lưu vào runbook |
| P0-04 | Gỡ cửa hậu console | ARC-003, D-23a | S | `modules/platform/use-cases/resolve-platform-session.ts`: xoá nhánh cookie `smeos_dev_role` và nhánh email `@dev.com`; giữ cookie dev chỉ cho khuôn UI (`resolve-app-session.ts`, `NODE_ENV === "development"`) | Test platform mới: user `@dev.com` không phải operator → 403; cookie dev → 403 |
| P0-05 | Kho tệp bắt buộc ở production | ARC-006 | S | `src/lib/env.ts`: `superRefine` — `NODE_ENV=production` thì 4 biến `STORAGE_*` bắt buộc; `/api/health/ready` báo loại kho | Unit test `env` |
| P0-06 | Ẩn chức năng đang lỗi trên production: nghiên cứu thị trường (D-20b); Lịch đăng + kết nối MXH khi chưa cấu hình SocialFlow; **sửa báo "xuất bản thành công" giả và link bài giả ở Lịch đăng** (`17` S-01) | ARC-030, D-20, D-46 | S | Dùng `ux-rollout-flags`/nav: ẩn mục; API MI trả `ENTITLEMENT_REQUIRED` với thông báo "chưa mở"; trang `/lich-dang`, phần MXH `/ket-noi` hiện trạng thái "chưa sẵn sàng" khi thiếu `SOCIALFLOW_URL` | E2E UX: không còn nút dẫn tới lỗi; lỗi mạng → báo lỗi thật |
| P0-09 | **[TAY]** Nộp xét duyệt app Meta (đăng Trang + Instagram), xác minh doanh nghiệp, kiểm quyền API Zalo OA — đường găng của Workstream S | D-46 | — | `17` S-00 | App được duyệt |
| P0-07 | Baseline xanh: chạy đủ bộ test trên `main`, sửa lỗi có sẵn trong PR riêng | D-43a | M–L | Không đổi hành vi nghiệp vụ; mỗi lỗi ghi nguyên nhân | `npm test`, `test:tenant`, `test:platform`, `build` xanh trên CI |
| P0-08 | Bỏ `typescript.ignoreBuildErrors` | ARC-004 | S | `next.config.ts` | `npm run build` xanh không cờ |

## 3. GĐ1 — Nền production (tuần 2–3)

| Mã | Việc | ARC / D | Công | Thiết kế & tệp | Nghiệm thu |
|---|---|---|---|---|---|
| P1-01 | Migration ở pre-deploy, sao lưu trước; seed production chỉ dữ liệu hệ thống | ARC-005, D-15a | M | `render.yaml`: `buildCommand` chỉ `npm ci && prisma generate && npm run build`; `preDeployCommand: npm run db:deploy && npm run db:seed:system`. Tách `prisma/seed.ts` → `seed:system` (vai, AI registry, decision registry; idempotent). `db-deploy.mjs` ghi mốc thời gian để khôi phục PITR | Deploy thử: migration lỗi → bản cũ vẫn chạy |
| P1-02 | **[TAY + CHỜ I-7]** Gói CSDL có PITR; diễn tập khôi phục ra CSDL tạm | ARC-005, D-16b | M | Runbook §4 viết lại: RPO/RTO, ai khôi phục, các bước | Biên bản diễn tập: thời gian khôi phục đo được ≤ 1 giờ |
| P1-03 | Smoke test sau deploy | R-1 | S | Script `scripts/smoke-after-deploy.mjs` (health, health/ready, trang đăng nhập, trang công khai mẫu) chạy cuối job `deploy`; đỏ → báo, hướng dẫn rollback | Job `deploy` hiện kết quả smoke |
| P1-04 | **[CHỜ I-5]** Sentry ở web + 3 worker; cảnh báo | ARC-023, D-18a | S | `render.yaml` thêm `SENTRY_DSN`, `SENTRY_ENVIRONMENT` (`sync: false`); cảnh báo lỗi mới, tăng đột biến | Lỗi thử hiện trên Sentry có `requestId` |
| P1-05 | Khoá phân tán cho 3 lịch nền | ARC-010, D-17a | S–M | `pg_try_advisory_lock(<hằng mỗi lịch>)` trong `background-sweep-scheduler`, `lead-recovery-scheduler`, `orders-sweep-scheduler`; ghi log khi bỏ lượt | Tenant test: hai lượt quét đồng thời chỉ một lượt chạy |
| P1-06 | Cảnh báo thao tác nhạy cảm của người vận hành | R-2 | S | Sau `N3`/`N7`/`N14` ghi `platform_audit_logs` + email cho PO (adapter email có sẵn) | Test platform |
| P1-07 | Kiểm Origin cho request ghi có cookie | ARC-022, D-25a | S–M | `src/proxy.ts`: POST/PUT/PATCH/DELETE dưới `/api/v1` (trừ webhook, cron, công khai có chữ ký) phải có `Origin`/`Sec-Fetch-Site` cùng nguồn | Unit + E2E; webhook không bị chặn |

## 4. GĐ2 — Kiến trúc nhất quán và thương mại

### Workstream A — 4 tầng nhất quán (đường găng, D-40c)

| Mã | Việc | ARC / D | Công | Thiết kế & tệp | Nghiệm thu |
|---|---|---|---|---|---|
| P2-A1 | Ngành chỉ là plugin | ARC-008, 036, D-01a | M | Gỡ `INDUSTRY` khỏi `notification_hard_locks` (migration dữ liệu nếu có dòng), `industry-events.ts`, `nav-industry.ts`, `tier-preview.ts`, `tierOf()`; `GovernanceTier` giữ `INDUSTRY` chỉ cho khoá tích hợp theo `industry:<key>`; cập nhật `SMEOS_4_TIER_…`, standard 01 | `tierOf` không trả `INDUSTRY`; test thông báo không còn người nhận ảo |
| P2-A2 | **[SCHEMA]** Chuỗi chính + hàm `resolveTierChain` | ARC-034, 038, D-02c, D-03b | M | `chain_partnerships.is_primary Boolean` + unique một chuỗi chính ACTIVE mỗi đối tác (partial index qua SQL); `core/governance/resolve-tier-chain.ts` (port) + `organization/infra/tier-chain-repository.ts`; thay 3 bản `findFirst` | Tenant test: đối tác 2 chuỗi nhận khoá đúng chuỗi chính |
| P2-A3 | **[SCHEMA]** Một thực thể chi nhánh | ARC-034, D-02c | L | Thiết kế (PR đầu chỉ có tài liệu): gộp `branches` và `chain_branches` thành một bảng chi nhánh trong tổ chức (giữ cột của `chain_branches`), `memberships.branch_id` trỏ bảng mới, bỏ `chain_branch_code` ở bản contract; bỏ giá trị `partnership_type = "BRANCH"` (chuyển dữ liệu nếu có). Thực hiện theo expand → backfill → chuyển mã → contract | Tenant test giá theo chi nhánh, `/cua-hang`, điều phối không đổi hành vi |
| P2-A4 | Phạm vi quyền vào `TenantContext` | ARC-035, D-04a | M | `TenantContext.grants: ReadonlyMap<code, scope>`, giữ `capabilities` để tương thích; `scopedWhereForBranch(ctx, code)` ở `core/tenancy`; `requireCapability` không đổi | Unit resolver; tương thích ngược mọi route |
| P2-A5 | Áp phạm vi chi nhánh theo đợt | D-04a | L | Đợt 1: đơn hàng, khách hàng, điều phối. Đợt 2: sản phẩm/giá, kho dữ liệu, báo cáo. Đợt 3: còn lại | Mỗi đợt: tenant test "nhân viên chi nhánh A không thấy dữ liệu chi nhánh B" |
| P2-A6 | Khuôn UX từ (tầng, mã quyền) | ARC-016, D-05a | M | `role-ux-catalog` khoá theo vai hệ thống; bỏ so `roleKey` trong `components/` (trừ công cụ dev); sửa fail-open ở `use-market-intelligence-data.ts` | Test kiến trúc: không `roleKey ===` trong `src/components` |
| P2-A7 | **[CHỜ I-1]** Đổi nhãn `crm`/`customer_service`; bổ sung quyền `product_manager` | D-06b | S | `system-roles.ts`, `capability-catalog.ts` (defaultRoles); migration seed `role_capabilities` | `capability-catalog.test.ts` |
| P2-A8 | Khoá công cụ phủ API | ARC-037, D-35 | S | `TOOL_ROUTE_RULES`: thêm `/api/v1/greeting-card`, `/api/v1/vision`, `/api/v1/template-overrides`; giữ `content-engine` không khoá; bỏ `system-optimizer` | `require-tenant-tool-lock.test.ts` mở rộng |
| P2-A9 | Nav Mẹ lọc theo mã N; sửa liên kết hỏng | ARC-039 | S | `nav-mother.ts` thêm `capability`; bỏ `/van-hanh/san-pham`, `/cong-cu/toi-uu-he-thong` | Unit nav |
| P2-A10 | Áp ma trận Thanh toán, Phí gia công vào luồng tiền; Mẫu giữ ghi chú phạm vi | ARC-008 (nợ #185) | M | `resolveAppliedPolicies` cho `PAYMENTS`, `CRAFT_FEES` ở báo giá/đặt đơn (ngoài Thẻ chào — D-32) | Tenant test `governance-matrix` |
| P2-A11 | Bộ test đối chiếu tầng | `13` §10 | M | `tests/tenant/tier-consistency.test.ts`: mỗi trục × Mẹ/Chuỗi/Cửa hàng | Xanh trong CI |

### Workstream B — Thương mại

| Mã | Việc | ARC / D | Công | Thiết kế & tệp | Nghiệm thu |
|---|---|---|---|---|---|
| P2-B1 | **[SCHEMA]** Gói mặc định | ARC-033, D-07c | S | Migration: `credit_plan = 'PRO'` cho tổ chức hiện có đang null; `sign-up.ts` gán `STARTER` (chuỗi vẫn `FLOWER_NETWORK`); `resolvePlanFromOrg` null → `STARTER` | Unit + tenant test |
| P2-B2 | Thực thi gói ở API | ARC-033, D-08a, D-09b | M | Bảng `route → featureKey` (cạnh `tool-route-entitlement.ts`) theo `PLAN_FEATURES` hiện có; kiểm trong `requireTenantContext`; test kiến trúc: route tính năng trả phí phải có `featureKey` | Gói `STARTER` gọi studio/video → 403 `ENTITLEMENT_REQUIRED` |
| P2-B3 | Giao diện gói | D-09b | M | Mẫu UX P11 (`docs/dac-ta/ux-patterns/p11-entitlement-gate.md`): ẩn/khoá + gợi ý nâng cấp; nav lọc theo gói | E2E UX theo gói |
| P2-B4 | **[CHỜ A-1]** Tỷ giá credit | D-12 | S | `usage/domain/pricing.ts`: `VND_PER_CREDIT = 1000`, hàm đổi + làm tròn; hiện quy đổi VND ở ước phí và console nạp | Unit pricing |
| P2-B5 | **[SCHEMA]** Sổ nạp tiền thủ công + phiếu thu | D-11c | M | Bảng `credit_topups` (org, số tiền VND, số credit, người nạp, chứng từ, thời điểm); console `N3` ghi qua đây; tổ chức xem lịch sử nạp | Test platform; audit log |

### Workstream C — Tích hợp (thứ tự D-31)

| Mã | Việc | ARC / D | Công | Thiết kế & tệp | Nghiệm thu |
|---|---|---|---|---|---|
| P2-C1 | Hoàn thiện khung đầu nối Hub | ARC-007 | M | `connector-contract.ts`: gửi tin, nhận webhook, kiểm sức khoẻ; vault; retry; test kiến trúc "mỗi host nhà cung cấp chỉ xuất hiện trong `integration-hub/adapters/connectors/<kênh>`" | Test kiến trúc |
| P2-C2 | Zalo OA/ZNS → đầu nối Hub; Thẻ chào dùng adapter mỏng | ARC-007, D-32a | L | Chuyển mã từ `greeting-card/adapters/{zalo-zns-adapter, staff-channels/zalo-oa-*}`; webhook Zalo ghi qua Hub (đã có); cập nhật `the-chao-freeze.test.ts` cho đúng các adapter (PR riêng) | Tenant test Thẻ chào giữ nguyên hành vi |
| P2-C3 | SePay → đầu nối Hub | D-10a | M | Webhook + khớp chuyển khoản qua Hub; hai bộ khớp giữ nguyên luật | Tenant test thanh toán |
| P2-C4 | eSMS → đầu nối Hub; kênh SMS của thông báo | D-33a | M | Thay stub `sms-adapter.ts` | Test thông báo SMS |
| P2-C5 | Telegram một đầu nối (bỏ bản trùng) | ARC-007 | M | Gộp `telegram-bot-api.ts` và `telegram-photo-upload.ts` | Test kiến trúc host |
| P2-C6 | Messenger → đầu nối Hub | ARC-007 | M | Từ `staff-channels/messenger-adapter.ts` + webhook Facebook | Tenant test |
| P2-C7 | Email → đầu nối Hub | ARC-007 | S–M | `core/notifications/email-service.ts` thành adapter | Unit |
| P2-C8 | Kênh Zalo của thông báo | D-33a | S | Thay stub `zalo-adapter.ts` bằng gọi đầu nối P2-C2 | Test thông báo |
| P2-C9 | **[SCHEMA]** Web Push | D-33a | M | Bảng `push_subscriptions`, khoá VAPID (biến môi trường), service worker, adapter `web-push-adapter.ts` — **thêm thư viện `web-push` cần PO duyệt** | E2E đăng ký + nhận |
| P2-C10 | Danh mục đầu nối ghi đúng trạng thái | ARC-007 | S | `connector-catalog.ts` `MANAGED` chỉ khi có đầu nối thật | Unit |

### Workstream D — AI

| Mã | Việc | ARC / D | Công | Thiết kế & tệp | Nghiệm thu |
|---|---|---|---|---|---|
| P2-D1 | Chính sách AI chung cho worker | ARC-009, D-34a | M | `workers/shared/ai_policy.py`: đọc `ai_policies`, `ai_models` (giấy phép), sàn riêng tư trước mỗi lời gọi nhà cung cấp; từ chối → job `FAILED` có lý do, hoàn credit (D3) | pytest; test kiến trúc Python: provider phải gọi `ai_policy.check` |
| P2-D2 | Sửa tài liệu cổng AI | ARC-009 | S | `CLAUDE.md` #5, HO_SO_BAN_GIAO §4, skill `ai-integration`, `worker-python` | `check:docs` |

### Workstream E — Bảo mật

| Mã | Việc | ARC / D | Công | Thiết kế & tệp | Nghiệm thu |
|---|---|---|---|---|---|
| P2-E1 | CSP chặn | ARC-022, D-25a | S | Sau 2 tuần đọc báo cáo `csp-report`: đổi `Content-Security-Policy-Report-Only` → `Content-Security-Policy` | E2E xanh |
| P2-E2 | Gác mã năng lực cho `content-engine/rewrite` | ARC-025 | S | Dùng mã của luồng gọi (đề xuất `H5`) — PO xác nhận trong PR | Route guard test |
| P2-E3 | Tự rà OWASP ASVS mức 2 | R-3 | M | Checklist ghi vào `docs/handover/` | Biên bản rà |

### Workstream F — Dữ liệu và tuân thủ

| Mã | Việc | ARC / D | Công | Thiết kế & tệp | Nghiệm thu |
|---|---|---|---|---|---|
| P2-F1 | **[SCHEMA]** Nghị định 13 mức tối thiểu | ARC-011, D-27a | L | Mở rộng `customer_consents` (mục đích, thời điểm, nguồn); ghi nhận đồng ý ở biểu mẫu công khai; xuất/xoá dữ liệu khách theo yêu cầu (use-case + màn hình CRM); nhật ký xử lý | Tenant test xuất/xoá |
| P2-F2 | **[CHỜ I-2]** Hạn lưu 3 tháng | D-28 | M | Job dọn theo bảng phân loại dữ liệu (log, thông báo, hội thoại, marketing); dữ liệu đơn hàng theo I-2 | Tenant test job dọn |
| P2-F3 | **[SCHEMA]** Vệ sinh lược đồ | ARC-019, D-29a | M | Enum cho cột trạng thái mới; CHECK `orders_balance_vnd_check`; FK `product_images.asset_id`; `organization_id` cho `internal_chat_messages`; DB test dựng bằng `migrate deploy` | `migrate diff` sạch; tenant xanh |
| P2-F4 | Máy trạng thái đơn SSOT | ARC-017 | M | `orders/domain/order-state-machine.ts` dùng chung cho orders + coordinator; sửa `business-reporting.ts` theo enum; Thẻ chào chỉ đọc (D-32) | Unit đủ cặp chuyển |

### Workstream G — Hệ sinh thái (D-36…D-39)

| Mã | Việc | Công | Thiết kế | Nghiệm thu |
|---|---|---|---|---|
| P2-G1 | **[TAY]** Kiểm LocalBudd có đang chạy/có dữ liệu thật; xuất dữ liệu; archive repo | S | Theo `15` §3.1 | Biên bản |
| P2-G2 | Gỡ phần chờ LocalBudd trong `ALG` | S–M | Bỏ tiền tố proxy `LOCALBUDD`, client token `LOCALBUDD`, `integration/business-profile` (nếu không client nào khác), script `dev:all`, mục danh mục `api_tokens`; cập nhật đặc tả 06/08 | `check:docs`, route guard test |
| P2-G3 | Thay SocialFlow (D-46 = a) — **Workstream S**, 16 hạng mục S-00…S-16 ở `17_SOCIALFLOW_REPLACEMENT_PLAN.md` §4 | XL (25–35 ngày) | Bài đăng trong `ALG`, kết nối OAuth qua Integration Hub (không lưu mật khẩu MXH), đầu nối Facebook Page/Instagram/Zalo OA, lịch đăng qua cron, tự duyệt D11 (`O7`), số liệu Chặng 12; gỡ SocialFlow (S-14) | `17` §4 |
| P2-G4 | Gỡ proxy, SSO liên-app, token tích hợp khi cả hai app ngừng | M | Sau P2-G2 + S-14; giữ Integration API nếu có khách bên thứ ba cần (hỏi PO trong PR) | Route guard test; `ALG` không còn mã gọi LocalBudd/SocialFlow |

## 5. GĐ3 — Bàn giao, tài liệu, chất lượng (tuần 8–12)

| Mã | Việc | ARC / D | Công | Nghiệm thu |
|---|---|---|---|---|
| P3-01 | Viết lại `TRANG_THAI.md` §3/§6; sửa số liệu `CLAUDE.md`, `AGENT_RULES` (cổng, ESLint, §12), README; thêm kiểm tự động các số liệu này vào `check:docs` | ARC-014 | M | `check:docs` bắt lệch |
| P3-02 | Gộp `docs/Audit` vào `docs/audit`; rà tài liệu trước khi giao toàn bộ (D-41c): bỏ bí mật, dữ liệu khách, prompt nội bộ không cần; tệp agent theo I-4 | ARC-015 | M | `handover:check` 0 cảnh báo |
| P3-03 | ERD theo miền (sinh từ `schema.prisma`) | ARC-027 | S–M | Tệp sinh tự động + kiểm trong CI |
| P3-04 | **[CHỜ I-3]** Gói bàn giao: runbook đủ (không còn [CẦN XÁC NHẬN]), SLA, hướng dẫn quản trị console, hướng dẫn người dùng theo vai (Điều hành, Điều phối, Sale, Marketing, CSKH, Cửa hàng, Chuỗi), quy trình phát hành/nâng cấp, danh mục quyền truy cập | ARC-028 | L | PO duyệt |
| P3-05 | Test bắt buộc Screen Contract cho trang mới/được sửa; bổ sung hợp đồng cho trang thuộc đường găng (đơn hàng, điều phối, cửa hàng, tích hợp) | ARC-020, D-45 | M | Test kiến trúc |
| P3-06 | Ratchet số dòng mỗi tệp (không tăng; tách khi sửa) | ARC-013, D-45 | S | Test kiến trúc |
| P3-07 | Kiểu domain riêng; `check:layers` cấm `import type` từ `infra/` trong domain/components | ARC-018 | M | `check:layers` |
| P3-08 | Dọn tàn dư: `vercel.json`, `cron-job-entry.txt`, `dify-chat-provider.ts` | ARC-026 | S | — |
| P3-09 | Kiểm tải theo SLO S1–S4 trên CSDL khôi phục từ PITR (thay staging) | ARC-032, R-1 | M | Báo cáo p95, giới hạn 1 instance |

## 6. Thứ tự phụ thuộc

```
P0-01 ─► P0-02 ─► P0-03(tay) ─► P0-07 ─► P0-08
P0-04, P0-05, P0-06 (song song, sau P0-01)
P0-02 ─► P1-01 ─► P1-02 ─► P1-03 ─► P3-09
P2-A1 ─► P2-A11
P2-A2 ─► P2-A3 ─► P2-A5
P2-A4 ─► P2-A5
P2-B1 ─► P2-B2 ─► P2-B3
P2-C1 ─► P2-C2 ─► P2-C8 ; P2-C1 ─► P2-C3, C4, C5, C6, C7 ; P2-C9 độc lập (cần duyệt thư viện)
P2-G2 ─► P2-G4 ◄─ P2-G3 [CHỜ D-46]
P2-F1 ─► P2-F2 [CHỜ I-2]
P3-01, P3-02 ─► P3-04
```

## 7. Mốc sẵn sàng

| Mốc | Điều kiện |
|---|---|
| **M1 — Production an toàn** | GĐ0 xong + P1-01…P1-05 |
| **M2 — Commercial ready (cửa hàng)** | M1 + P1-06, P1-07 + Workstream B + P2-C1…C4 + P2-D1 + P2-F1, F2 + P2-E1 + Workstream S v1 (nếu S-5 = a) |
| **M3 — Commercial ready (chuỗi)** — D-40c | M2 + Workstream A đủ + P2-C5, C6 |
| **M4 — Bàn giao khách** | M3 + GĐ3 + S-14/S-15 (đã bỏ SocialFlow) + P2-G4 |

## 8. Rủi ro thực hiện

| Rủi ro | Giảm thiểu |
|---|---|
| Không staging (R-1) mà có migration lớn (P2-A3, F1, F3) | Expand → contract qua ít nhất 2 bản phát hành; sao lưu trước; diễn tập trên CSDL khôi phục từ PITR trước khi chạy production |
| Đóng băng Thẻ chào (D-32) chặn gộp kênh | Chỉ thay adapter mỏng; test Thẻ chào hiện có phải giữ xanh không sửa |
| P0-07 lộ nhiều lỗi có sẵn hơn dự kiến | Tách nhiều PR theo mô-đun; báo PO nếu > 5 ngày |
| Thêm thư viện (`web-push`) / nhà cung cấp mới | Hỏi PO trong PR trước khi thêm (`CLAUDE.md`) |
| Áp phạm vi chi nhánh làm người dùng hiện có mất quyền xem | Đợt 1 bật bằng cờ theo tổ chức; thông báo trước |

## 9. Cần PO trước khi bắt đầu

1. Duyệt bản kế hoạch này (hoặc chỉnh), gồm Workstream S (`17`).
2. Câu hỏi S-1…S-5 (`17` §7) và bắt đầu S-00 (duyệt app Meta/Zalo) ngay.
3. I-1 … I-7, A-1 (`15` §4) — chỉ chặn các hạng mục gắn **[CHỜ]**.

Sau khi duyệt, thực hiện từ P0-01; mỗi PR báo: thay đổi (`tệp:dòng`), gate đã chạy và kết quả, phần chưa kiểm chứng.
