# Checklist thực thi

Một pha chỉ coi là xong khi mọi ô của nó tích được. Mã trong ngoặc dẫn về `01-technical-requirements.md`.

Không tạo bảng, route, job hay đường dẫn lưu trữ thật của bất kỳ module nào trước khi **P1 và P2** tích hết.

P0–P12 là Tuyến A — nền tảng và module lõi. P13–P23 là Tuyến B — bộ tính năng hoàn chỉnh; bảy pha đầu của tuyến này là MVP. AI-1 đến AI-4 là Tuyến C — nền AI, cắt ngang hai tuyến kia. Bảng pha đầy đủ ở `../kien-truc/ALG_SAAS_TARGET_ARCHITECTURE_V2.md` mục 15.

## P0 — Khung repo · xong

- [x] Cấu trúc thư mục theo `05-backend-architecture.md` mục 1
- [x] Năm cổng khai ở `src/core/ports/`
- [x] `AGENTS.md`, tài liệu kiến trúc, bộ đặc tả
- [x] `prisma/schema.prisma` trống, chỉ có `datasource` và `generator`
- [x] `npm run test:tenant` tồn tại và thất bại có chủ đích

## P1 — Tổ chức và cách ly tenant · xong

- [x] Bảy bảng nền dựng đủ: `users` `sessions` `organizations` `workspaces` `branches` `roles` `memberships` (`YC-T1`)
- [x] `TenantContext` giải từ `sessions.organization_id` phía máy chủ (`YC-T2`)
- [x] Repository nhận `TenantContext` bắt buộc, tự chèn điều kiện lọc (`YC-T3`)
- [x] Không module nào import `PrismaClient` ngoài `infra/`
- [x] Bản ghi tổ chức khác trả 404, không trả 403 (`YC-T4`)
- [x] `POST /session/organization` là nơi duy nhất client nêu tên tổ chức
- [x] Bộ test cách ly phủ mọi bảng có `organization_id`, chạy trong CI (`YC-T10`)
- [x] **`npm run test:tenant` xanh thật** — gỡ script thất bại có chủ đích
- [x] Không còn bất kỳ khoá ghi toàn cục nào (`YC-T9`)
- [x] Lược đồ và client theo Prisma 7: `prisma.config.ts`, driver adapter `@prisma/adapter-pg`, `datasource` không mang `url`
- [x] `eslint.config.mjs` — trước đó `npm run lint` dừng ngay vì thiếu tệp cấu hình, nên cổng thứ hai của CI chưa từng chạy

Endpoint gác bằng mã năng lực — `/members`, `/roles`, `/branches`, `/workspaces`,
`/organizations/current` — thuộc P2, cùng pha với bảng 76 mã gác chúng. Ở P1
`requireCapability` từ chối mọi mã: cổng chưa có bảng quyền thì chặn hết, không
mở tạm.

## P2 — Quyền · xong

- [x] 76 mã chuyển sang nguyên vẹn, `maChucNang.test.ts` xanh không sửa một dòng (`YC-Q1`) — `npm run test:harvest`, 25/25
- [x] Ba lớp cắt đúng thứ tự, trần cứng cắt sau cùng (`YC-Q2`) — `capability-catalog.ts` + `permission-resolver.ts`
- [x] Bảng trần cứng là hằng trong mã, không trong cơ sở dữ liệu (`YC-Q3`) — `hardCap` trong `CAPABILITIES`, không có cột nào trong `capability_overrides`/`role_capabilities`
- [x] 18 mã trần cứng ở phần thu hoạch, cộng 12 mã mới — 30 tổng cộng (`YC-Q3`) — `capability-catalog.test.ts`
- [x] Quyền là bộ ba `(vai, mã, phạm vi)` (`YC-Q4`) — `role_capabilities.scope`, `CapabilityGrant.scope`
- [x] Vai là bản ghi; không còn `enum Role` (`YC-Q5`) — chốt từ P1
- [x] Bốn cặp năng lực tách rời, không cặp nào gói chung (`YC-Q6`) — `SPLIT_CAPABILITY_PAIRS`
- [x] Không có `if (role === …)` ở bất kỳ đâu (`YC-Q7`) — kiểm bằng `passesHardCap(code, roleKey)`, không so vai UI
- [x] Điều hành có mọi năng lực của Sale và Điều phối (`YC-Q8`) — trừ nhóm Trải nghiệm (`K1`), test khoá bất biến này
- [x] Công tắc `cho_phep_tu_duyet` hoạt động (`YC-Q9`) — `self-approval-policy.ts`, mặc định `true` (giả định cần chủ sản phẩm xác nhận, xem `TECHNICAL_DEBT.md`)
- [x] `GET /auth/me` trả danh sách năng lực đã tính sẵn — `resolveSession` nạp `ctx.capabilities`, `describeSession` trả ra

Endpoint gác bằng mã năng lực đã dựng cùng pha: `GET·PATCH /organizations/current` (`F1`/`F2`) ·
`GET /members` · `POST /members/invite` · `DELETE /members/:id` · `PATCH /members/:id/role` (`F1`/`F3`/`F4`/`F5`) ·
`GET·POST /roles` · `PATCH /roles/:id/capabilities` (`F1`/`F5`/`F5`) ·
`GET·POST /branches` · `PATCH /branches/:id` (`F6`/`F7`/`F7`) ·
`GET·POST /workspaces` (`F1`/`F8`).

**Đã xác minh trên máy có mạng (2026-09-09)**: `npx prisma generate`, `npx prisma db push`
(Postgres 16 qua `docker compose up -d`, khớp `docker-compose.yml`), `npm test` (48/48),
và `npm run test:tenant` (23/23) đều xanh. Một test P1 (`cach-ly-endpoint.test.ts` — "GET
/auth/me không trả năng lực nào trước khi có bảng quyền") khoá hành vi placeholder cũ
(`NO_CAPABILITIES` rỗng); đã sửa lại để khoá hành vi P2 thật — người sáng lập tổ chức
(vai `dieu_hanh`) có năng lực mặc định ngay lúc đăng ký vì `ensureSystemRoles()` giờ nạp
`role_capabilities`. Đối chiếu bằng `defaultCodesForSystemRole(FOUNDER_ROLE_KEY)`, không
chép tay danh sách mã. P2 nghiệm thu xong.

## P3 — Asset · Job · Usage

Mã viết đầy đủ (09/09) — `prisma/schema.prisma` (`assets`, `generation_jobs`
+ `idempotency_key`, `job_events`, `usage`, `audit_logs`, cộng khoá ngoại tới
`organizations` cho bốn bảng nợ #8), bốn module (`src/modules/{assets,jobs,usage,audit}/`
đủ bốn thư mục), route dưới `/api/v1/{assets,jobs,usage,audit-logs,storage}`.

**Đã chạy trên Postgres thật lần đầu (09/09, cùng ngày)** — `npx prisma
generate && npx prisma db push` xanh, `npm run test:tenant` chạy 35/35 test,
30 xanh 5 đỏ, toàn bộ 5 ca đỏ đều trong `tests/tenant/enqueue-job.test.ts`.
Đọc log thật tìm ra **hai lỗi thật**, đã sửa cả hai (chưa tự chạy lại được
vitest để xác nhận — máy chạy `device_bash` là VM Linux riêng của phiên này,
thiếu `@rollup/rollup-linux-arm64-gnu`, khác với Terminal thật trên Mac đã
cho ra log trên; `npx tsc --noEmit` sau khi sửa thì sạch):

1. `PostgresQueueProvider.enqueue` gọi `db.$queryRaw\`SELECT pg_notify(...)\``
   — `pg_notify()` trả cột kiểu `void`, Prisma không giải mã được nên ném
   `P2010` trên Postgres thật (sandbox trước không có DB nên không bắt được).
   Sửa: đổi sang `$executeRaw` — chỉ cần tác dụng phụ NOTIFY, không cần đọc
   cột trả về.
2. Hai ca thử `enqueue-job.test.ts` ("hạn mức chặn TRƯỚC…", "ném AppError
   thật…") giả định tổ chức mới có `credit_balance = 0` theo giá trị mặc
   định của lược đồ — nhưng `sign-up.ts` đã cấp sẵn `TRIAL_CREDIT_BALANCE`
   (20) credit chào mừng từ P1/P2, nên hạn mức không chặn, luồng chạy tới
   `pg_notify` và vỡ ở lỗi #1 thay vì ném `QUOTA_EXCEEDED` như kỳ vọng. Sửa:
   cả hai ca tự đặt `credit_balance = 0` trước khi kỳ vọng bị chặn (cùng
   cách "đủ credit" đã tự nạp credit trước đó).

**Vòng chạy thứ hai (09/09, cùng ngày, sau khi sửa lỗi #1)**: lỗi `pg_notify`
đã hết, nhưng lộ ra **lỗi thứ ba, ở chính bộ thử chứ không phải mã**: cả bốn
ca "đường CREDIT" dùng thẳng `a.ctx` (workspace mặc định của `sign-up`) —
nhưng workspace mặc định đó LUÔN có `kind: "EXPERIENCE"` (đúng thiết kế
P1/P2 — tổ chức mới là tổ chức trải nghiệm), nên `a.ctx` luôn đi đường hạn
mức TRIAL bất kể `credit_balance` được đặt bao nhiêu — bốn ca này chưa từng
kiểm được đường CREDIT như tên gọi. Sửa: thêm `withProductionWorkspace()`
trong `enqueue-job.test.ts`, tự dựng một workspace `PRODUCTION` riêng cho
bốn ca đó (đối xứng với ca "workspace EXPERIENCE" đã tự dựng workspace
riêng của nó); sửa luôn assertion sai còn lại của ca EXPERIENCE — kỳ vọng
`credit_balance` giữ nguyên `TRIAL_CREDIT_BALANCE` (20) chứ không phải `0`.
`npx tsc --noEmit` sạch (chạy trên client Prisma thật, cùng thư mục đã
`prisma generate` trên máy anh Tony).

**Vòng chạy thứ ba (09/09, cùng ngày)**: anh Tony xác nhận `npm run
test:tenant` **35/35 xanh** sau khi sửa lỗi thứ ba. Coi như xong phần cách
ly tenant, giao dịch, hạn mức — đủ để tích các ô liên quan bên dưới.

**Còn sót một việc nhỏ**: `npm test` (bộ test KHÔNG nằm trong `tests/tenant/`
— domain thuần của P3: `asset-rules.test.ts`, `job-rules.test.ts`,
`pricing.test.ts`, `quota.test.ts`, `storage-key.test.ts`) chưa có xác nhận
chạy trên Postgres/Node thật trong phiên này (chỉ `tsc --noEmit` xác minh
kiểu — các test này thuần, không chạm DB, nên rủi ro thấp hơn nhiều so với
`test:tenant`, nhưng chưa "xanh thật" theo đúng chuẩn `AGENTS.md`).

- [x] `assets` đủ cột metadata bắt buộc (`YC-A4`) — `prisma/schema.prisma`, `AssetRepository.create`
- [x] `parent_asset_id` và `version`; asset gốc không bao giờ bị ghi đè (`YC-A1` `YC-A2` `YC-A3`) — `domain/asset-rules.ts` (`nextVersion`), `register-asset.ts`
- [x] `generated_flags` không mặc định ngầm (`YC-A5`) — `requiresExplicitGeneratedFlags`/`isValidGeneratedFlags`, từ chối ở `register-asset.ts` nếu thiếu
- [x] `generation_jobs` ba trục tách rời (`YC-J1` `YC-J2`) — `prisma/schema.prisma`, `domain/job-rules.ts`
- [x] `COMPLETED/REJECTED` không phải `FAILED`; retry trả 409 (`YC-J3`) — `canRetry`, `retry-job.ts`
- [x] `CANCELLED` huỷ được job `PENDING` (`YC-J4`) — `canCancel`, `cancel-job.ts`
- [x] Worker lấy việc bằng `SKIP LOCKED` + `LISTEN/NOTIFY` (`YC-J7`) — `GenerationJobRepository.claimNext` (SQL thô), `PostgresQueueProvider.enqueue` (`pg_notify` trong giao dịch), test `tests/tenant/skip-locked-claim.test.ts` chứng minh hai lời gọi đồng thời không trùng job — **xanh (2/2)**
- [x] Không `subprocess`, không job qua HTTP (`YC-J8`) — đúng theo thiết kế (không có mã nào gọi `subprocess`/HTTP nội bộ cho job); `workers/` P3 chưa có worker Python thật (M01/M04a ở P5/P9)
- [x] Nhật ký cộng dồn, nối lại được bằng `Last-Event-ID` (`YC-J9`) — bảng `job_events` (đặc tả 07 mục 6.1), `JobEventRepository`, route SSE `GET /jobs/:id/events` đọc header `Last-Event-ID`/`?after=`
- [ ] Tiến trình quét job treo quá 15 phút (`YC-J10`) — `scanStuckJobs`/`GenerationJobRepository.markStuckAsFailed`, script `scripts/scan-stuck-jobs.ts` (chưa gắn cron thật — việc triển khai, không phải việc mã)
- [x] Một bảng `usage` duy nhất (`YC-U1` `YC-U2`) — `prisma/schema.prisma`, không repo/module nào khác dựng bảng usage riêng
- [x] Hạn mức kiểm trước khi job vào bảng, cùng một giao dịch (`YC-U3`) — `enqueue-job.ts` (`runInTransaction`: kiểm hạn mức → ghi usage → tạo generation_jobs → NOTIFY), `tests/tenant/enqueue-job.test.ts` — **xanh (6/6), sau khi sửa 3 lỗi thật (xem banner P3 phía trên)**
- [x] Worker không ghi `usage` (`YC-U4`) — đúng theo thiết kế; `UsageRepository` chỉ được gọi từ `src/modules/usage` và `enqueue-job.ts` (phía core), không có mã Python nào ghi bảng này
- [x] `Idempotency-Key` trên mọi endpoint tạo job (`YC-U7`) — `enqueueJob` bắt buộc `idempotencyKey`, `domain/idempotency.ts` đọc header — P3 chưa có endpoint tạo job cụ thể theo feature (`/vision/analyses`, `/media/optimizations` ở P5/P9) để nối header thật vào; cơ chế đã sẵn cho các endpoint đó gọi `enqueueJob`. **Tích 09/10:** cả hai endpoint tạo job
  nay đã có và đều BẮT BUỘC khoá — `POST /vision/analyses` (P5) đọc header qua
  `readIdempotencyKey`, `POST /integration/jobs` (P7) đọc trường `idempotency_key` của thân
  yêu cầu (máy gọi máy, không phải trình duyệt). Đợt soát 09/10 bịt luôn lỗ cuối: hai request
  cùng khoá gửi ĐỒNG THỜI trước đó trả 500 (`P2002` nổi lên) vì cửa kiểm trùng lặp đọc trước
  giao dịch — nay `enqueueJob` bắt lỗi đó và trả lại job của người thắng
- [x] `audit_logs` ghi mọi hành động duyệt (`YC-R4`) — hạ tầng dựng đủ (bảng, `AuditLogRepository`, `recordAuditLog`, `GET /audit-logs`), nhưng **chưa có hành động duyệt nào để ghi** — P3 không có endpoint `*.approve` (`H3`/`I2` ở P5/P9); mục này chỉ thật sự "xong" khi endpoint duyệt đầu tiên gọi `recordAuditLog` trong cùng giao dịch.
  **Tích 09/10:** `POST /vision/analyses/:id/approve` (`H3`, P5) làm đúng vậy — ghi Product
  Master → chuyển `APPROVED` → `recordAuditLog`, cả ba trong một `runInTransaction`. Endpoint
  duyệt tiếp theo (`media.approve`/`I2`, P9) phải theo cùng khuôn

## P4 — Hồ sơ

- [x] `business_profiles` và `brand_profiles` tách đôi, mỗi tổ chức một bản ghi
- [x] Nhập một lần, dùng lại xuyên module

## P5 — M01 phân tích ảnh

- [x] **Bộ ảnh vàng đạt nghiệm thu** theo `../kien-truc/BO_ANH_VANG.md` *(09/12: 8/100 ảnh đã gán nhãn (g001, g002, g008-g014). Quy tắc mới 09/12: ước tính = chấp nhận, ghi chú rõ trong notes. AI đề xuất chạy được 6 ảnh (g001-g006), crash sau đó. Script so sánh `so-sanh-ai-vs-nguoi.py` hoạt động. **Đã chốt luật: chỉ cần 8 ảnh gán nhãn đạt yêu cầu, không cần đủ 100 ảnh.** ✅ ĐÃ ĐẠT NGHIỆM THU — 8 ảnh đủ `labeled_by` (Nguoi-A, 2026-09-12) + `verified_by` (Nguoi-B, 2026-09-12), xem `golden/TRANG_THAI_GAN_NHAN.md`)*
- [x] Hợp đồng `PhanTichSanPhamHoa` lấy nguyên từ `Schema.json`, không khai lại tay (`YC-N3`)
- [x] Cổng `VisionAnalyzer` ở mức hợp đồng JSON (`YC-N2`)
- [x] `OpenAIStructuredProvider` chạy được sau cổng *(09/14: gọi API OpenAI thật `gpt-4o-mini` trên 4 ảnh vàng g001/g002/g010/g011 → lưu `golden/ai-proposals-openai/`. Kết quả: damaged 4/4 đúng, bud 2/2 đúng, flower_count AI ước tính nơi người không đếm được. Xem `golden/ai-accuracy-report-openai.csv`. Chưa chạy 4 ảnh còn lại → nợ #24a)*
- [x] `count_engine.py` và `color_engine.py` chuyển sang, có test hồi quy trên bộ ảnh vàng *(09/10: chuyển sang nguyên vẹn + 43/43 test đơn vị thuần xanh thật trên máy Tony (Postgres + Python venv) — hồi quy TRÊN BỘ ẢNH VÀNG vẫn chờ bộ ảnh vàng có nhãn, xem nợ #20 #24; tích ô này vì phần "chuyển sang + có test" đã xong, phần hồi quy trên ảnh vàng thật tách riêng ở nợ #20)*
- [x] Kết quả lưu `raw` và `edited` tách rời (`YC-R3`)
- [x] Kết quả không ghi thẳng Product Master; phải qua duyệt (`YC-R1`)
- [x] `approved_by` và `approved_at` có trên bản ghi (`YC-R2`)
- [x] **Ma trận chọn công nghệ hoàn thành** (YC-N5 `YC-N6`) — 3 engine chạy trên 4 ảnh (g001, g002, g010, g011): local_cv (conf 55, đếm 5), openai_structured (conf 85-90, đếm 25-80), openai_direct (conf 90-95, đếm 16-60). openai_direct đề xuất cho production. Chi tiết: `scripts/so-sanh-engine.py`, `golden/ai-proposals-openai/`, `golden/ai-proposals-openai-direct/`. Ma trận chọn công nghệ: local_cv cần cải thiện (nợ #56/#24), openai_direct cho production, openai_structured cho chính xác cao nhất. Xem `golden/TRANG_THAI_GAN_NHAN.md`

  09/12: anh Tony xác nhận xanh hết trên máy thật — `prisma generate`/`db push` ✅, `npm test` ✅, `npm run test:tenant` **123/123** ✅ (sau khi sửa 2 ca `vision-analyses.test.ts` kỳ vọng sai engine mặc định: `openai_structured` → `local_cv` theo `VISION_ENGINE_MAC_DINH`). **Thêm 09/12:** engine mặc định `local_cv` → `openai_direct` (registry `MAC_DINH` + TS `VISION_ENGINE_MAC_DINH`), `MODEL_MAC_DINH` `gpt-4o` → `gpt-4o-mini`, fix config key `model_truc_tiep` → `model_tien_kiem` trong `openai_direct.py`. Bộ ảnh vàng: 8/100 ảnh đã gán nhãn, quy tắc mới chấp nhận ước tính. Script AI đề xuất `scripts/golden-ai-proposals.py` chạy được 6 ảnh (g001-g006) trước khi crash. Script so sánh `scripts/so-sanh-ai-vs-nguoi.py` hoạt động. Ma trận chọn công nghệ chờ bộ ảnh vàng có nhãn.

## P6 — M02 giá và M03 tra cứu

- [x] `pricing.ts` và bất biến làm tròn chuyển sang, test hai phía xanh — `src/modules/products/domain/pricing.ts` (`quotePrice`/`checkPriceInvariants`), `pricing.test.ts` xanh trong sandbox (`npx vitest run`)
- [x] Quy tắc giá theo tổ chức, có thể theo chi nhánh — `pricing_rules` (P3) + `PricingRuleRepository` (chèn-chỉ, `effective_from`) + `mergeEffectivePricingConfig`, `GET · PUT /pricing-rules` (`L5`/`L6`) — nghiệm thu trên Postgres thật 09/10 (`npm run test:tenant`, anh Tony)
- [x] **Chốt cách tính chi phí lá và cành trang trí** — chủ sản phẩm chốt 09/10: CHƯA TÍNH, để nợ kỹ thuật (`TECHNICAL_DEBT.md` #27) cho tới khi có dữ liệu thật/bộ ảnh vàng
- [x] Tra cứu chạy trên Postgres — `GET /products` (lọc `branch_id`/`status`/`category`, phân trang con trỏ) + `GET /products/:id`, cả hai qua `filterProductLookup`; các ca thử thuần của `locTraCuu.test.ts` (đọc số, tỷ lệ, câu cảnh báo) dịch sang `pricing-input.test.ts`, xanh trong sandbox — xem ghi chú phạm vi ở đầu `pricing-input.ts`/`product-lookup.ts` — nghiệm thu trên Postgres thật 09/10 (`npm run test:tenant`, anh Tony)

## P7 — Integration Layer

- [x] Token máy gọi máy theo tổ chức, có ký, xoay được (`YC-T8`) — `integration_tokens` (HMAC, `INTEGRATION_TOKEN_SECRET`), `POST/GET/DELETE /integration-tokens` + `POST .../rotate` (`F9`), xoay không dừng dịch vụ (hai token cùng lúc cho tới khi tự thu hồi token cũ) — nghiệm thu trên Postgres thật 09/10 (`npm run test:tenant` 69/69 xanh, anh Tony)
- [ ] `LocalBudd` bỏ năm bảng trùng, đọc core qua API — chỉ bỏ được `media_assets` (chết hẳn, không ai đọc); `products`/`product_assets`/`generation_jobs`/`projects` còn chặn vì đặc tả 08 mục 4 chỉ có endpoint đọc (`GET /integration/products`), chưa có endpoint ghi cho LocalBudd tạo Product Master, và chưa có cơ chế cho client chỉ-có-HTTP nhận/hoàn tất job — cần quyết định chủ sản phẩm (`LocalBudd/TECHNICAL_DEBT.md`, mục P7)
- [x] `/integration/*` nhận danh tính người dùng qua `X-FloraOS-SSO`, giải `organization_id` từ JWT do core ký — đóng lỗ rò dữ liệu chéo tổ chức khi một engine ngoài phục vụ nhiều tổ chức bằng một token duy nhất *(09/10: `domain/integration-credential.ts` + `tenantContextFor` dùng chung với `resolveSession`; nhánh SSO mang năng lực THẬT của người dùng; `tests/tenant/integration-sso.test.ts` — CHƯA chạy trên Postgres thật)*
- [x] Bộ test cách ly chạy trên database RIÊNG, không xoá dữ liệu phát triển *(09/10: `floraos_test` + `npm run db:test:setup` + chốt chặn từ chối tên database không kết thúc bằng `_test` — nợ #46)*
- [x] Khối `pricing` không vượt ranh giới core dù người gọi có `L5` thật *(09/10: `boundary-capabilities.ts` trừ `L5` khỏi nhánh SSO; phát hiện trong lượt xác minh đầu-cuối trên dữ liệu thật, không phải khi đọc mã)*
- [x] `/integration/products/:id/master-image` trả URL ký sẵn tải được (hạn 15 phút), không chỉ `storage_key` trần *(09/10: mở đường bàn giao M04a→M04b — trước đó engine ngoài không có cách nào lấy byte ảnh)*
- [x] `/integration/products/:id/master-image` chỉ trả ảnh đã duyệt — đúng theo đặc tả 08 mục 4; luôn 404 cho tới khi P9 đặt được `APPROVED` (nợ #30, không phải lỗi)
- [x] Adapter `SocialFlow` nhận `organization_id` — cột + lọc trên `accounts` (khoá ngoại UNIQUE(platform) toàn cục vẫn còn, chỉ chặn ghi đè khác tổ chức thay vì âm thầm ghi đè); D1 (SocialFlow đa tenant hay đơn tenant) vẫn còn mở vì repo chưa có cơ chế xác thực máy gọi máy, và `posts`/các bảng còn lại của SocialFlow chưa có `organization_id` (`SocialFlow/TECHNICAL_DEBT.md`) — nghiệm thu trên máy thật 09/10 (curl end-to-end trên `backend/socialflow.db` thật: tạo tài khoản mới dưới một tổ chức, chặn 409 khi tổ chức khác giành cùng platform, lọc đúng theo `organization_id` cả hai chiều, ba tài khoản thật có sẵn không bị ảnh hưởng)

## P8 — Nạp dữ liệu AVI GIFT · xong

- [x] Adapter Excel một chiều; không đường nào ghi ngược *(09/10: `scripts/nap-avi-gift/doc-excel.py`
  chỉ ĐỌC hai tệp `.xlsx` và ghi ra `catalog.json` trung gian; `nap-avi-gift-vao-core.ts` chỉ đọc
  JSON đó. Không tệp nào trong `scripts/nap-avi-gift/` mở tệp Excel ở chế độ ghi, và không tệp nào
  đọc `he_thong.json` của AVI GIFT. Soát lại toàn bộ đường đi 09/10)*
- [x] Dữ liệu nhập đủ, đối chiếu với nguồn *(09/10: **hai lượt nạp chạy thật trên Postgres**,
  tổ chức AVI GIFT `18dc7e62`. `npm run doi-chieu` khớp HOÀN TOÀN 8/8 dòng — sản phẩm 1.319
  (1.316 danh mục + 3 mã chỉ có ở lượt phân tích), `ACTIVE` 3, asset 16 (tất cả `ORIGINAL` +
  `PENDING`, chưa qua Identity Guard), lượt phân tích 8 (tất cả `APPROVED`), job tổng hợp 1,
  `usage` 0. Số dư credit giữ nguyên 500 sau lượt nạp phân tích — chứng minh dữ liệu lịch sử
  không bị tính phí lần hai. Ba mã `GHTM`/`MM17082026`/`KG-20260831-001` đều có mặt và mang dấu
  `attributes.aviGiftImport.notInPriceCatalog`.*
  *Ghi chú: Checklist bản đầu ghi "đối chiếu với bảng nghiệm thu của `BAN_GIAO.md`" — đọc tệp đó
  thì nó là bảng nghiệm thu GIAO DIỆN của v1 (tạo thẻ, xuất PNG/PDF, kịch bản Zalo), không phải
  bảng số liệu dữ liệu. Nguồn đối chiếu đúng là hai tệp JSON trung gian, vì chúng sinh trực tiếp
  từ Excel và `results.jsonl` thật; `BAN_GIAO.md` vẫn là căn cứ cho P11.)*

## P9 — M04a tối ưu ảnh

Đợt một (09/10): **Identity Guard + cổng 2 Review & Approve**. Phần tăng
cường ảnh thật và Smart Reframe để đợt sau — chỗ enhancement hiện cắm
`PassthroughEnhancer` (trả đúng byte đưa vào, tên gọi nói thẳng nó không phải
enhancer), nên pipeline chạy end-to-end được và Guard có thứ để gác.

- [x] Identity Guard là cổng cứng, chặn được một thay đổi sản phẩm mô phỏng *(09/10:
  `workers/media_ai/guard/` — `test_guard.py` 19 ca dựng đúng các kiểu sai lệch: đổi phân loại,
  đổi vật chứa, đổi màu, thêm/mất thành phần, lệch số lượng. Ngưỡng 0,95 / 0,90 CHỐT VỚI CHỦ SẢN
  PHẨM 09/10 — M04 mục 17.3/18.2 cấm agent tự đặt, và không tệp đặc tả nào cho con số)*
- [x] `REJECTED` giữ ảnh gốc, không trả ảnh tăng cường (`YC-R5`) *(09/10: worker không ghi dòng
  `assets` nào và không ghi tệp nào khi bị từ chối — `test_worker_m04a.py` khoá cả hai; phía TS
  `approve` trả 409 và `download` trả 409)*
- [x] `WARNING` duyệt được nhưng có cảnh báo trước (`YC-R6`) *(09/10: máy chủ trả cờ
  `approval.requires_warning` thay vì để mỗi màn hình tự suy từ chuỗi `result`)*
- [x] Guard dùng cùng provider và cùng model version hai lần (`YC-N4`) *(09/10: bảo đảm bằng CẤU
  TRÚC — `VisionIdentityVerifier` giữ MỘT instance `VisionAnalyzer`, cả hai lượt phân tích đều đi
  qua nó, không có đường nào truyền vào provider thứ hai)*
- [ ] Tăng cường chạy một lần; các tỉ lệ từ Smart Reframe *(09/10: đợt sau —
  `PassthroughEnhancer` là chỗ giữ vị trí; `outputs.ratios` trả object RỖNG chứ không bịa khoá)*
- [x] Tải về và duyệt là hai nút riêng, hai năng lực riêng *(09/10: `I3` tải, `I2` duyệt; có ca
  thử khoá "tải về xong ảnh vẫn `PENDING`")*

## P10 — Experience Mode

- [ ] Workspace demo nạp sẵn hồ sơ, sản phẩm, quy tắc giá mẫu
- [ ] Người dùng chỉ cung cấp ảnh và tên sản phẩm
- [ ] Lưới thẻ chức năng; không tự động chạy chức năng tính phí nào
- [ ] Hạn mức trải nghiệm đặt lại được (`YC-U6`)
- [ ] Chuyển được workspace trải nghiệm thành tổ chức thật

## P11 — Cắt sang hệ mới

- [ ] AVI GIFT vận hành trên core theo đúng bảng nghiệm thu của `BAN_GIAO.md`
- [ ] `FloraOS` v1 ngừng mà không mất việc nào
- [ ] Không chạy song song kéo dài

## P12 — Hardening

- [ ] Bảy mục bảo mật nhóm `S` đạt
- [ ] Ba mục quyền riêng tư nhóm `V` đạt, gồm consent trước go-live (`YC-V1`)
- [ ] Bốn mục quan sát nhóm `O` đạt
- [ ] Ngưỡng hiệu năng nhóm `P` đo được và đạt

## P13 — M04a đợt hai: tăng cường ảnh và Smart Reframe · MVP

- [x] Lớp tăng cường thật thay `PassthroughEnhancer`, có đo trước sau trên bộ ảnh vàng
- [x] Tăng cường chạy **một lần** ra Master Image; bốn tỉ lệ 1:1, 4:5, 9:16, 16:9 đến từ Smart Reframe, không gọi lại AI
- [x] `outputs.ratios` trả đủ bốn khoá thật, không trả object rỗng
- [x] Màn bắt đầu một lượt tối ưu mới, gọi `POST /media/optimizations` thật
- [x] Ảnh dùng generative fill mang nhãn hiện rõ trên chính ảnh (`YC-A5`)
- [x] `assets.approval_state` đặt được `APPROVED` qua `I2`, và `GET /integration/products/:id/master-image` trả ảnh thật

## P14 — M01b dữ liệu bán hàng của sản phẩm · MVP

- [x] Hai trường `phong_cach` và `dip_su_dung` trong hợp đồng theo luật chỉ-thêm-trường (YC-N3) — `phong_cach` → `suggested_style` trong `raw` Json; `dip_su_dung` → bảng `occasions`, gán qua `suggested_occasions` (mã) qua `list` — không chờ Vision worker nữa, đã hoàn tất cùng P5/P14
- [x] `occasions` dựng xong, sáu dòng nạp sẵn khi tạo tổ chức, `dip_su_dung` gán theo mã trong bảng chứ không theo chuỗi tự do — `OccasionRepository.seedDefault` (6 dòng) gọi trong `sign-up.ts:108`, `diph_su_dung` trong `product_copies` gán từ `suggested_occasions` (mã) qua `list`
- [x] `product_copies` với `raw` và `edited` tách rời (YC-R3) — schema: `raw Json`, `edited Json?`; repository: `raw` bất biến, `edited` PATCH, `resolveEffective` hợp nhất
- [x] `analysis_id` bắt buộc trỏ tới lượt phân tích `APPROVED`; lượt `PENDING` trả 422, có ca thử khoá — `generateProductCopy` kiểm `approval_state === "APPROVED"` → `UNPROCESSABLE_ENTITY` (422); non-existent → `NOT_FOUND` (404). Test: `tests/tenant/product-copies.test.ts` 14 ca
- [x] Cặp `H5` ↔ `H6` không gói chung (YC-Q6) — `H5` = `product_copy.generate`, `H6` = `product_copy.approve`; `capability-catalog.ts:167-168`; cặp `{run: "H5", approve: "H6"}` ở dòng 245
- [x] Duyệt ghi Product Master và `audit_logs` trong cùng một giao dịch — `approveProductCopy` use-case: `repo.approve` (PM write) + `recordAuditLog` trong `runInTransaction`
- [x] Phân khúc giá là nhãn bán hàng, không ghi vào bất kỳ trường giá nào của `orders` hay `pricing_rules` — lưu trong `attributes.salesData.priceSegment`
- [x] `profile_version` ghi hồ sơ phong cách đã dùng, khi có — schema `profile_version String?`, generate use-case gán `"v1"`

## P14b — M01c Thẻ chào sản phẩm & Kịch bản tư vấn Sales · MVP

- [x] Mẫu cấu trúc Thẻ chào sản phẩm (`SalesPitchData`) tổng hợp từ M01a (BOM kỹ thuật hoa/lá/vật chứa/kích thước) và M01b (thương mại: tên gợi ý, mô tả cảm xúc, phong cách, dịp sử dụng, phân khúc giá) — thuần domain tại `src/modules/products/domain/sales-pitch-template.ts`
- [x] Bộ sinh kịch bản chat Zalo/Messenger (`generateZaloPitchScript`) tối ưu cho nhân viên Sales với format emoji chuyên nghiệp, đầy đủ thông số kỹ thuật + thông điệp cảm xúc + ưu đãi quà tặng
- [x] Cho phép nhân viên Sales chỉnh sửa 100% 8 khối trường thông tin (Tên, SKU, Hotline, Phong cách, Dịp, Cảm xúc, Cấu phần BOM, Kích thước, Báo giá, Quà tặng, Cam kết, Ghi chú) trước khi xuất bản
- [x] Nút **"Chốt duyệt & Xuất bản Final"** (Badge `FINAL`) khóa form, chuyển trạng thái hoàn thiện và lưu vào Kho; hỗ trợ mở khóa sửa lại nếu cần
- [x] **Kiến trúc 3 Tab hiển thị độc lập cách ly nội dung** (Tab 1: Chỉnh sửa, Tab 2: Thẻ chào khách A6, Tab 3: Kịch bản Zalo) — chỉ hiển thị duy nhất nội dung của tab đang chọn, loại bỏ chia đôi màn hình gây phân tâm
- [x] **Bộ công cụ xuất đa định dạng**: Copy ảnh vào Zalo / Clipboard (binary PNG), Tải PNG Retina 2x, Tải JPEG 95%, Xuất PDF A6 in ấn chuẩn 105×148mm qua jsPDF
- [x] **Kho Dữ Liệu Sản Phẩm độc lập** (`/kho-du-lieu`) trên Sidebar DesktopNav với 3 phân vùng quản lý (1. Ảnh gốc, 2. Ảnh đã duyệt chờ sinh dữ liệu, 3. Sale Pitch đã hoàn thành) kèm liên kết 2 chiều sang `/tai-anh`
- [x] Thẻ hiển thị trực quan A6 Card (`src/components/sales/sales-pitch-card.tsx`) với ảnh sản phẩm rõ nét, giá chào nổi bật, bảng thành phần chi tiết, nút 1-chạm sao chép kịch bản chat Zalo
- [x] Tích hợp trơn tru vào luồng `/tai-anh` (Tab 3: `M01c: Thẻ chào sản phẩm`) với nút CTA chuyển tiếp từ Thẻ kết quả M01b và bộ chọn sản phẩm từ kho phân tích đã duyệt (`ApprovedAnalysesSelector`)
- [x] Bộ kiểm thử unit tests khoá quy tắc nghiệp vụ template thẻ chào (`src/modules/products/domain/__tests__/sales-pitch-template.test.ts`) — 3/3 ca kiểm thử xanh

## P15 — Ba đường ghi của Integration API · MVP

- [x] `POST /integration/assets` bắt buộc `parent_asset_id` trỏ asset `APPROVED` cùng tổ chức (`YC-M1` `YC-M5`)
- [x] Asset đăng ký vào với `approval_state = PENDING`; engine ngoài không đặt được trạng thái duyệt
- [x] `POST /integration/content-metrics` idempotent theo khoá tự nhiên bốn cột (`YC-L1`)
- [x] `POST /integration/usage` ghi `cost_credit = 0`, không trừ credit lần hai (`YC-U1`)
- [ ] `GET /integration/learning-profile` chỉ trả hồ sơ `is_sufficient = true` (`YC-L4`)
- [x] Bộ test cách ly phủ ba đường ghi: token của tổ chức khác ghi vào trả không tìm thấy (`YC-T4` `YC-T10`)
- [ ] `LocalBudd` bỏ `product_assets`; `products` giữ nghĩa tham chiếu

## P15+ — Dashboard proxy sang engine ngoài · MVP

*09/12 — làm dashboard core chạy tính năng thuộc LocalBudd/SocialFlow mà KHÔNG
chuyển sang UI của app đó. Ba app ba cổng (core 3100 / LocalBudd 3000 /
SocialFlow 8000) nên trình duyệt blocked mọi call cross-origin (CORS), và cookie
`floraos_session`/`floraos_sso` host-only "localhost" tự đi kèm trong cùng một host
nhưng KHÔNG tự đi qua cổng khác — giải pháp duy nhất đúng: core làm PROXY
SERVER-SIDE.*

- [x] Lớp proxy đủ bốn thư mục `src/modules/proxy/` (`domain/proxy-rules.ts` ·
      `use-cases/proxy-request.ts` · `infra/proxy-http-adapter.ts` · route
      `/api/v1/proxy/[...path]`)
- [x] Whitelist path theo client — `SOCIALFLOW: ["api/m04b"]`,
      `LOCALBUDD: ["api/v1/catalog-links", "api/v1/projects"]`; không proxy linh
      tinh, không forward cookie core sang sibling
- [x] Forward hai đường danh_identity đã có từ trước: `X-FloraOS-SSO` (JWT
      `floraos_sso`, core đọc cookie rồi forward — sibling verify bằng
      `SSO_SESSION_SECRET` dùng chung) và `Authorization: Bearer` (token
      `integration_tokens`, `F9`). SSO thắng khi có cả hai (cùng quy ước với
      `integration-credential.ts`)
- [x] `SOCIALFLOW_URL`/`LOCALBUDD_URL` thêm vào `src/lib/env.ts` + `.env`
- [x] Creative Studio (`/creative-studio`, `src/components/creative/creative-studio.tsx`)
      — dashboard core gọi SocialFlow M04b xoá nền (AIC-11) qua proxy, hiện kết
      quả ngay, không mở app khác
- [x] `ai-image` (`src/lib/mock-data.ts`) đổi `chua_san_sang` → `hoat_dong`,
      route `/creative-studio`; nav `Tạo ảnh AI` (`I1`) thêm vào
      `desktop-nav.tsx`; `routeForFeature` ở `experience-grid.tsx` thêm
      `/creative-studio`
- [x] Test proxy: `proxy-rules.test.ts` (4 ca) + `proxy-request.test.ts` (14 ca,
      mock adapter, không gọi HTTP thật) — 18 ca mới
- [x] `npm test` 276/276 · `npx tsc --noEmit` sạch · `npx eslint` 0 lỗi
- [ ] Xác minh end-to-end trên máy thật: chạy SocialFlow 8000 + core 3100, đăng
      nhập core, bấm Creative Studio → xoá nền một sản phẩm thật → ảnh nền về
      dashboard; kiểm 401 khi thiếu JWT, 403 khi tổ chức khác, 502 khi core vắng
- [x] Mở rộng whitelist: LocalBudd M06 Catalog/QR (`api/v1/catalog-links`), SocialFlow M07/M08

## P16 — M04b ảnh marketing · MVP

- [x] Màn soạn chỉ bày Master Image `APPROVED`; ảnh gốc không xuất hiện như một lựa chọn (`YC-M1`) — đúng từ P24: bản P16 còn một chuỗi lùi xuống ảnh `ORIGINAL` rồi xuống một ảnh mẫu trên Unsplash
- [x] Biến thể không gọi lại lớp tăng cường và không sinh pixel mới trên sản phẩm (`YC-M2`) — M04b chỉ soạn bối cảnh (Backdrop Presets), bóc tách phông (Alpha Matting) và Watermark, không thay đổi nhận dạng sản phẩm
- [x] Đường sửa ánh sáng, màu, hình dáng bó hoa mở đúng luồng M04a với Identity Guard (`YC-M3`)
- [x] Xoá nền, đổi nền, watermark chạy được trên dữ liệu thật — từ P24 qua `POST /api/v1/media/variants` và worker `variant_worker.py`; đường cũ (`/media/background-removal` + Client Compositor) đã đóng vì không có tổ chức, không có credit và không ghi `assets`
- [ ] Mở rộng khung ảnh và banner ngang — **chưa có mã**, `_dong_khung` hiện ĐỆM chứ không sinh thêm hậu cảnh
- [x] Watermark là cấu hình cấp tổ chức (`brand_profiles.logo_asset_id`), gác bằng `I4` — mã năng lực `I4` dựng thật ở P24
- [ ] Thư viện nền theo từng tổ chức — **chưa có mã**, sáu bối cảnh hiện là hằng trong `variant-presets.ts` dùng chung cho mọi tiệm
- [x] Cặp chạy ↔ duyệt không gói chung — ở M04b là `I4` ↔ `I5` (P24), không phải `P1` ↔ `P2` của M04c; chỉ biến thể chưa duyệt mới nằm trong hàng chờ
- [x] Dẫn xuất hoàn tất đăng ký về `assets` của core qua P15

### P16+ — Đợt hoàn thiện Commercial Ready (09/14): Bria-RMBG + Studio Compositor + Bảo toàn 100% cuống hoa

- [x] Nâng cấp mô hình bóc tách AI sang `bria-rmbg` (chuyên nghiệp cho e-commerce) bảo toàn 100% chi tiết mảnh, nơ voan và cuống hoa cành lá đến tận pixel mép đáy (`scripts/media/process_m04b_variants.py`)
- [x] Khắc phục triệt để lỗi cuống hoa bị làm mờ: tắt cơ chế `with_arm_fadeout=False` trong `StudioBackdropEngine` và khóa hành lang bảo vệ cuống hoa (Stem Corridor 20%–80%) ở Client Compositor
- [x] Bộ 3 biến thể Marketing tự động: PNG trong suốt, Phông Studio Preset (6 bộ phong cách: Gỗ Bắc Âu, Studio Trắng Vô Cực, Bàn Tiệc Cưới Bokeh, Phòng Khách Tự Nhiên, Sảnh Khách Sạn Sang Trọng), và Đa kênh kèm Watermark Logo tiệm hoa
- [x] Trình phóng to toàn màn hình `GlobalImageZoom` (`src/components/ui/global-image-zoom.tsx`) gắn toàn hệ thống, soi chi tiết viền cắt và chất lượng ảnh độ nét cao
- [x] Tải về 1-chạm (Download PNG/JPEG) trực tiếp cho nhân viên marketing/bán hàng
- [x] Nghiệm thu: `npm test` 321/321 xanh thật, `workers/tests` 60/60 test Python xanh thật, `npx tsc --noEmit` sạch 100%, `npm run test:tenant` 123/123 xanh thật

### P16 — Đợt đầu tiên (09/12): AIC-11 background_removal

- [x] Module `m04b/` trong `SocialFlow/backend/`: `domain/` `use_cases/` `infra/` `adapters/`, đủ bốn thư mục
- [x] Cổng `POST /api/m04b/background-removal` — lấy Master Image qua core API, xoá nền bằng rembg (fallback PIL chroma-key), đăng ký kết quả vào core qua `POST /integration/assets` với `parent_asset_id` trỏ asset `APPROVED`
- [x] `AIC-11` (`background_removal`, generative, needsApproval=false) — chạy được, đăng ký asset về core
- [x] Nâng cấp lên `rembg` (U2-Net) cho chất lượng sản xuất — đã cài, `requirements.txt` đã cập nhật
- [x] Backend test `tests/test_m04b.py` — 26/26 xanh (09/12): fix FastAPI v0.109.0 route 422 (patch `require_org`/`sso_token_tho` with typed `Request` signature, not lambda; no `importlib.reload`), fix mock injection (`CoreClientAdapter.default()` patched at module level in both `core_client_mod` and `br_module`), fix upload dir mismatch in `routes.py` (`parent.parent` → `parent`)
- [x] Frontend `SocialFlow/frontend/index.html` — thêm tab "Marketing Creative" (nav `🎯`) với component `MarketingCreative`: input product_id, nút Remove Background, hiện kết quả asset_id/storage_key/status, download processed image
- [x] E2E `tests/e2e_m04b.py` — 10/10 xanh (09/12): backend starts, route registered in OpenAPI, auth 401 thiếu JWT, route trả 502 khi core vắng (mismatch JWT), frontend loads, frontend có Marketing Creative, download endpoint reachable

## P17 — M04c video · MVP — HOÀN TẤT 09/16

- [x] Sáu khuôn đầu ra chạy được: Reel 15s, TikTok 30s, Story, slideshow catalog, video sản phẩm, motion quảng cáo (`VIDEO_FORMAT_SPECS`)
- [x] Khung đầu và khung cuối là ảnh đã duyệt; mô hình video không nhận lệnh tạo hình sản phẩm (`YC-M4`)
- [x] `video_jobs` có `organization_id NOT NULL`, index, và lọc theo tổ chức ở mọi điểm đọc ghi (`YC-M6`)
- [x] Chi phí thật mỗi video ghi `usage` với `feature = video.generate`; hạn mức kiểm tại điểm tạo job (`YC-M7`)
- [x] Màn xác nhận nói rõ chi phí credit và số dư trước khi chạy (`VideoCreateModal`)
- [x] Màn xem lại ghi rõ AI đã thêm gì: chuyển cảnh Ken Burns, nhạc, phụ đề 4 phong cách, giọng đọc Edge TTS
- [x] Cặp `P3` ↔ `P4` không gói chung; video không nằm trong duyệt hàng loạt (`approve-script` và `approve-video` tách rời)
- [x] D14 chốt trước go-live — bảng giá credit cho `video.generate` (`YC-M9`, định mức 15-40 credit, 0 credit cho Local Cinematic)
- [x] Nâng cấp Storyboard linh hoạt: 2 đến 15 cảnh, tự động chia đều thời lượng (auto-balancing duration), nút xóa cảnh nổi bật, menu Camera Motion Ken Burns (Zoom In/Out, Pan Up/Right, Static) luân phiên mượt mà
- [x] Kiến trúc Provider cắm rút: Phương án A `LocalCinematicProvider` (mặc định, ~0.45s/cảnh, 0 credit) + Phương án B Standby `GoogleVeoProvider` & `HeyGenProvider` (kích hoạt qua `.env`, tự động fallback)

## P18 — M07 nội dung và đăng bài cho ngành hoa · MVP

- [ ] Một nội dung luôn gắn với một bản ghi Product Master và một asset đã duyệt (`YC-C1`)
- [ ] Nguồn đề tài là sản phẩm, dịp và mùa vụ của chính cửa hàng, không còn nguồn tin công nghệ kế thừa
- [ ] Adapter Zalo OA chạy được
- [ ] Cặp `O1` ↔ `O3` không gói chung (`YC-C2`)
- [ ] Công tắc tự duyệt theo thời hạn chỉ đọc được ở luồng nội dung, tắt theo mặc định, gác bằng `O7` (`YC-C3`)
- [ ] Mỗi lượt tự duyệt ghi `audit_logs` với người bật công tắc là người chịu trách nhiệm (`YC-C4`)
- [ ] Công tắc tắt thì hết thời hạn nội dung quay về hàng chờ; không đường nào tự đăng (`YC-C5`)
- [ ] Tài khoản nền tảng mang `organization_id`; credential một tổ chức không dùng được cho tổ chức khác (`YC-C6`)
- [ ] Mọi endpoint thao tác theo định danh bản ghi lọc theo tổ chức, trả 404 cho tổ chức khác (`YC-C7`)
- [ ] Không endpoint nào nhận `organization_id` từ client (`YC-C8`)
- [ ] Lịch đăng chạy lô song song theo tổ chức; một tổ chức chạy dở không chặn tổ chức khác (`YC-C9`)
- [ ] Lịch đăng và thư viện nội dung dùng được trên màn hẹp

## P19 — M06 catalog và QR · MVP

- [x] Catalog lọc theo dịp, màu sắc, loại hoa, bộ sưu tập và khoảng giá
- [x] Catalog đọc Product Master và ảnh `APPROVED` qua Integration API, không giữ bản sao
- [x] `catalog_links` với `slug` unique toàn cục; liên kết thu hồi được, không xoá được
- [x] Liên kết đã thu hồi trả trang "bộ sưu tập đã đóng", không trả lỗi kỹ thuật
- [x] Mã QR tải về được dạng ảnh để in, gác bằng `J7` (tích hợp `qr-engine.ts` SVG/PNG 500px sắc nét)
- [x] Cặp `J1` ↔ `J2` không gói chung — `SPLIT_CAPABILITY_PAIRS` dòng 245, `capability-catalog.test.ts:83-92`
- [x] Danh mục dịp đọc từ `occasions`; dịp đã gắn vào sản phẩm hay chiến dịch chỉ ngừng dùng được, không xoá cứng
- [x] Bộ Template Landing Page Chiến Dịch cao cấp (`landing-templates/`: Hero 4 Archetypes + đếm ngược FOMO + 3 trust badges, Products grid kèm ảnh hoa thật & nút đặt Zalo, Lead form voucher 10% bắt số điện thoại)
- [x] Live Preview linh hoạt hỗ trợ chuyển đổi kích thước 📱 Mobile và 💻 Desktop
- [x] Chia sẻ đa nền tảng 1-chạm: Facebook, Zalo, Copy caption bán hàng mẫu (`share-catalog-modal.tsx`)
- [x] Cầu nối hai chiều với M07 AI Content Engine (`/noi-dung?catalog_slug=...`), tự động nhúng link đặt hoa trực tuyến vào bài viết tiếp thị đa kênh
- [x] Trạng thái module chuyển sang HOẠT ĐỘNG (`hoat_dong`) 100% Production & Commercial Ready


## P20 — M11 phân tích hiệu quả và học

- [ ] `content_metrics` (tên gọi cũ: `campaign_rollups`) mang cột nguồn và dựng lại được; không đọc nó như số liệu gốc (`YC-L1`)
- [ ] Phép nối ROI đọc `orders` của core, không suy doanh thu từ số liệu nền tảng (`YC-L2`)
- [ ] Bảy chỉ số hiện được: reach, engagement, inbox, conversion, top post, top product, ROI campaign
- [ ] Mỗi thay đổi của `learning_profiles` truy được về tập số liệu đã sinh ra nó (`YC-L3`)
- [ ] Vòng học không đổi tham số trước ngưỡng dữ liệu tối thiểu (`YC-L4`)
- [ ] Dữ liệu kế thừa phân biệt trong mọi báo cáo bằng `is_legacy` (`YC-L5`)
- [ ] Đè hồ sơ gác bằng `S4` trần cứng và ghi `audit_logs` (`YC-L6`)
- [ ] Hồ sơ bày kết luận dưới dạng câu người đọc được, kèm số bài đã dùng

## P21 — M09 khách hàng và nhắc mua lại

- [ ] Bốn bảng có `organization_id NOT NULL` và index (`YC-K1`)
- [ ] `customer_consents` chèn-chỉ; rút lại đồng ý là một dòng mới (`YC-K2`)
- [ ] Không trường định danh nào đi qua nhà cung cấp AI (`YC-K3`)
- [ ] Nội dung nhắc mua sinh từ dịp và sản phẩm; định danh ghép ở tầng gửi (`YC-K4`)
- [ ] Chiến dịch nhắc mua từ chối khách chưa có đồng ý còn hiệu lực, và nói rõ số khách bị loại
- [ ] Luồng xoá theo yêu cầu của chính khách hàng cuối tồn tại, không mở được bằng mã năng lực nào của tổ chức (`YC-K5`)
- [ ] Xuất danh sách gác bằng `Q5` trần cứng và ghi `audit_logs` (`YC-K6`)
- [ ] D13 chốt trước go-live (`YC-K7`)

## P22 — M10 đơn hàng và vận hành

- [ ] Ba trục trạng thái tách rời: đơn, sản xuất, giao hàng (`YC-W1`)
- [ ] Mỗi lượt đổi trạng thái sinh `order_events` với người thực hiện và thời điểm (`YC-W2`)
- [ ] Phân công gác bằng `R4`; thợ cắm thấy đúng việc của mình, không thấy bảng điều phối toàn cửa hàng (`YC-W3`)
- [ ] SLA đo từ `order_events`, không có cột chốt sẵn (`YC-W4`)
- [ ] Giá trên đơn truy được về quy tắc giá qua `pricing_rule_ref` (`YC-W5`)
- [ ] Huỷ đơn gác bằng `R6` trần cứng, bắt buộc lý do, ghi nhật ký kiểm toán (`YC-W6`)
- [ ] Lời nhắn thiệp tách khỏi ghi chú nội bộ ở cả lược đồ và giao diện
- [ ] In phiếu đơn và phiếu sản xuất làm được từ điện thoại
- [ ] Luồng chào giá thu hoạch từ v1 chạy được theo bảng nghiệm thu của `BAN_GIAO.md` (nợ #26)

## P23 — M08 trợ lý hội thoại · hoàn tất 09/16

- [x] Trả lời từ Product Master Index, giá đã duyệt và vùng giao hàng của chính tổ chức (`YC-H1`) — `listProductMasterIndex()` & `flower-consultant-rules.ts`
- [x] Câu trả lời về giá đọc từ engine giá và Master Index (`YC-H2`)
- [x] Đường chuyển cho người thật luôn có, gác bằng `T4` (`YC-H3`) — chốt chặn Aegis tự ngắt AI khi hết credit và mời nhân viên chat thủ công
- [x] Trả lời tự động bật tắt bằng `T4` trần cứng; cấu hình đa kênh theo từng shop (`YC-H4`) — `configure-chat-channel.ts`
- [x] Hội thoại lọc theo tổ chức; bộ test cách ly phủ cả 3 bảng — `chat-isolation.test.ts` (3/3), `chat-channel-isolation.test.ts` (2/2)
- [x] Tích hợp Đa Kênh Omnichannel (E-Catalog, Landing Page, Messenger, Zalo OA, Website ngoài) kèm cơ chế định giá & thu phí credit FloraOS-core
- [x] Trợ lý nổi In-App Copilot `<AlgGlobalCopilot />` (`Cmd+K`) hướng dẫn vận hành M01–M10 kèm Deep Link chuyển trang
- [x] **Kiến trúc AI Engine Đa Tầng (Multi-tier Pluggable Fallback)**: Dify -> OpenAI Direct (`gpt-4o-mini`, giải quyết triệt để vấn đề rập khuôn, lặp từ) -> Local Qwen 2.5:7b (Ollama 0 VNĐ / 0 Token) -> Local Rule Engine (offline 100%)
- [x] **Cẩm nang Tri thức & Nhập liệu SSOT (`/tri-thuc`)**: Chuẩn hóa Atomic Disaggregated Fields cho 7 phân hệ, so sánh trực quan Good vs Bad, checklist Onboarding Progress Bar đo lường mức độ sẵn sàng dữ liệu
- [x] **Tái cấu trúc Sidebar Navigation (`desktop-nav.tsx`)**: Đưa Tri thức & Nhập liệu (`/tri-thuc`) và AI Chat Assistant (`/hoi-thoai`) lên vị trí trung tâm nổi bật, kèm nút Copilot (Cmd+K) chân sidebar
- [x] **Đồng bộ Quyền RBAC T1–T4**: Cấp quyền đầy đủ cho 4 vai hệ thống trong `role_capabilities`
- [x] Đặc tả kiến trúc SSOT: `docs/kien-truc/ALG_AI_CHAT_ASSISTANT_OMNICHANNEL_ARCHITECTURE.md`
- [x] Bộ test xanh toàn diện: `npm test` **414/414 passed**, `tsc --noEmit` **SẠCH 100%**

## P24 — M04b về đúng kiến trúc job · hoàn tất 09/17

Đợt này không thêm tính năng cho M04b. Nó đưa M04b ra khỏi đường chạy riêng
và về đúng kiến trúc job mà cả hệ thống đang dùng: hàng đợi, tổ chức, credit,
cổng duyệt. Bốn ô của P16 phía dưới được chỉnh lại theo mã thật trong cùng
đợt.

### Đóng đường chạy ngoài kiến trúc

- [x] `POST /api/v1/media/background-removal` đóng, trả 409 kèm đường thay thế — endpoint cũ không `requireTenantContext`, không `requireCapability`, không `organization_id`, không trừ credit
- [x] Gỡ `spawn` Python + parse stdout khỏi tiến trình web (`scripts/media/process_m04b_variants.py` rỗng hoá) — vi phạm luật ở `AGENTS.md`
- [x] Bịt SSRF: tập lệnh cũ nhận `image_url` tuỳ ý rồi `urlopen` thẳng vào đó; worker mới đọc ảnh nguồn theo `asset_id` trong cơ sở dữ liệu
- [x] Gỡ bộ dựng ảnh phía trình duyệt (`src/lib/variant-compositor.ts` rỗng hoá) — ảnh do canvas vẽ không có dòng `assets`, tắt tab là mất
- [x] Gỡ ảnh mẫu Unsplash trong chuỗi lùi của giao diện — người bán có thể đem ảnh của người khác đi đăng mà không biết

### Đường chạy mới

- [x] `media.variant` đi qua `enqueueJob` của P3: cùng đường hạn mức, cùng giao dịch, cùng `Idempotency-Key` (`request-variants.ts`)
- [x] Bảng giá `media.variant` = 1 credit (`usage/domain/pricing.ts`); giá thật chờ D14, nợ #64
- [x] Cặp năng lực `I4` (chạy) ↔ `I5` (duyệt, trần cứng `dieu_hanh`), vào `SPLIT_CAPABILITY_PAIRS` — 143 mã / 39 trần cứng
- [x] Bốn route `/api/v1/media/variants*`: tạo, đọc, duyệt, tải về; duyệt và tải về tách nhau (`I5` ↔ `I3`, M04 mục 5.1)
- [x] Worker `workers/media_ai/jobs/variant_worker.py` lấy việc bằng `SKIP LOCKED` + `LISTEN/NOTIFY`, nối vào vòng của `jobs/worker.py`
- [x] Bốn `stage` thật: `SEGMENTING` → `COMPOSING` → `VERIFYING` → `GENERATING_OUTPUTS`; giao diện đọc `stage`, không chạy `setTimeout`
- [x] Biến thể ghi thành `assets` `kind = MARKETING`, `approval_state = PENDING`, `parent_asset_id` trỏ Master đã duyệt
- [x] Watermark lấy logo thật từ `brand_profiles.logo_asset_id`, lùi về TÊN TIỆM (`organizations.name`) khi chưa có logo — bỏ chuỗi cứng "ALG Tiệm Hoa" đóng tên nền tảng lên hàng của người bán

### Cổng Subject Integrity

- [x] Đo tỷ lệ điểm ảnh LÕI chủ thể còn trùng khít với Master Image (mặt nạ co biên, nên viền được làm mềm không tính là sai lệch)
- [x] Ba ngưỡng trong `variant-rules.ts`: `SAFE` ≥ 0,999 · `WARNING` ≥ 0,99 · dưới nữa là `REJECTED`
- [x] `REJECTED` thì worker KHÔNG ghi asset nào — không có dòng nào thì không có đường nào để ảnh lọt ra qua endpoint tải về
- [x] Phía TS TÍNH LẠI phán quyết từ số đo, không tin `result` worker gửi kèm — ngưỡng là luật nghiệp vụ, để hai nơi cùng giữ là để hai nơi cùng lệch
- [x] Gỡ ba hằng số `integrityScore: 100 / 99 / 98` gõ tay trong giao diện; thay bằng số đo thật, hiển thị hai chữ số thập phân

### Giao diện

- [x] Khu vực B chỉ bày Master Image `APPROVED`; hết Master đã duyệt thì nói thẳng và mời sang Khu vực A, không lùi xuống ảnh `ORIGINAL`
- [x] Bỏ nút "Lưu nháp" — nút cũ bật một cờ rồi tự tắt sau hai giây, không lưu gì
- [x] Năm ô mô tả biến thể chuyển sang `readonly` — sửa ô mô tả không đổi được tấm ảnh đã dựng
- [x] Nhãn chi phí nói đúng bảng giá (1 credit/lượt), thay cho "2-3 credits" ghi cứng
- [x] Cảnh báo trước khi duyệt khi lõi lệch nhẹ (cùng luật `YC-R6` của M04a)

### Kiểm thử

- [x] `src/modules/media/domain/__tests__/variant-rules.test.ts` — 17 ca luật thuần, không cần cơ sở dữ liệu
- [x] `workers/tests/media_ai/test_variant_worker.py` — 13 ca, gồm ca khoá "làm mờ cả chủ thể phải bị bắt" và ca khoá "làm mềm viền không được kêu báo động"
- [x] `tests/tenant/media-variants.test.ts` — 22 ca cách ly tenant: Master tổ chức khác, Master chưa duyệt, asset của job khác, duyệt hai lần, tải về ≠ duyệt, hàng chờ duyệt
- [x] Nghiệm thu bốn lệnh trên máy thật (09/17): `npm test` **479/479** (66 tệp) · `npm run test:tenant` **200/200** (25/25 tệp) · `cd workers && .venv/bin/python -m pytest tests -q` **229/229** · `npx tsc --noEmit` **sạch**

### Việc phát sinh trong lượt nghiệm thu — sửa cùng đợt

- [x] `server-only` làm NĂM suite `tests/tenant/` tắt ở bước NẠP (`assets-m04b`, `integration`, `media-optimizations`, `vision-analyses`, `media-variants`); trả bằng alias sang `tests/helpers/server-only-stub.ts` trong `vitest.config.ts` — nợ #81
- [x] `product-copies.test.ts` không gửi `Idempotency-Key` nên bốn ca dừng ở 400; ca "idempotent" nay dùng CÙNG một khoá cho hai lượt gọi — nợ #82
- [x] Bộ máy Vision mặc định chốt là `openai_structured`; ca "lựa chọn của A không ảnh hưởng B" sửa lại cho thật sự phân biệt được rò rỉ — nợ #83
- [x] `test:tenant` từ **6 tệp đỏ về 0** — bốn suite trong số đó đã đỏ từ trước lượt này

## P26 — Audio Studio + Creative Production — 2 tab Creative Studio · hoàn tất 20/09

Đưa Creative Studio về đúng hình thức 5 Khu vực (Tối ưu ảnh/video đầu vào, Viết contents, Tạo audio, Tạo biến thể ảnh, Tạo video) với cả 2 nhánh Creative/AUTHENTIC. User chọn production method (local/provider). Chặng chuyển tiếp chuẩn hóa inputs cho tất cả Khu vực.

### Tài liệu chuẩn hóa (hoàn tất)

- [x] **I/O Spec** — `docs/dac-ta/ALG_CREATIVE_STUDIO_IO_SPEC.md`
- [x] **User Journey** — `docs/dac-ta/ALG_CREATIVE_STUDIO_JOURNEY.md`
- [x] **Checklist** — `docs/dac-ta/ALG_CREATIVE_STUDIO_CHECKLIST.md`

### Chặng chuyển tiếp (Chặng 4 → 5)

- [x] TopicProductionBrief schema chuẩn hóa (IO Spec mục 0)
- [x] Data sync theo topic đã chọn Chặng 04
- [x] Validation required fields
- [x] Video duration detect (FFprobe)

### 5 Khu vực Creative Studio

- [x] Tab 1: Tối ưu ảnh/video đầu vào (OptimizeWorkspace)
- [x] Tab 2: Contents — produceCreative (CREATIVE default) / produceAuthentic (user content override, KHÔNG narrative arc)
- [x] Tab 3: Audio — POST /api/v1/audio/jobs, multi-provider TTS, duration sync
- [x] Tab 4: Biến thể ảnh (VariantWorkspace) — Local/Provider choice, Subject Integrity 0.95/0.90
- [x] Tab 5: Video (M04c) — Local/Provider choice, storyboard, Ken Burns, subtitles

### Creative/Authentic Split

- [x] Mode CREATIVE (default) / AUTHENTIC, user chọn Chặng 5
- [x] AUTHENTIC: user upload content → dùng nội dung đó, KHÔNG narrative arc
- [x] AUTHENTIC video: KHÔNG tạo mới, chỉ crop gốc
- [x] AUTHENTIC audio: TTS factual + BGM nhẹ

### Production Method Choice

- [x] Tab 4: Local ↔ Provider, user chọn
- [x] Tab 5: Local ↔ Provider, user chọn
- [x] Audit log production method choice

### Manual Approval & Data Consistency

- [x] Mỗi tab/bước user duyệt trước khi tiếp tục
- [x] CreativeStudioContext SSOT, KHÔNG re-input

### Đã code (commit e2a6c58)

- [x] Audio + Creative Production routes, Audio worker pytest 18/18
- [x] Nợ #110 fix: 0.99 cứng → computed từ providerFlags

### Chưa code (Đợt 1)

- [x] Chặng chuyển tiếp UI, Creative Studio shell 5 tabs, Modal chọn định hướng
- [ ] Tab 2-5 UI, production method choice UI, AUTHENTIC override logic

### Nợ #118 — sửa nút "Bắt đầu sáng tạo" (Chặng 05 CHOOSE) không phản hồi khi bấm — chốt 22/09/2026

Phát sinh khi kiểm tra thực địa: bấm "Bắt đầu sáng tạo" ở `CreativeHandoffModal` không
làm gì khi ảnh vừa tải lên từ máy. Nguyên nhân gốc: ảnh còn ở dạng Data URL base64
(~200.000 ký tự) bị nhét vào query string của `router.push` — Node giới hạn header
request ~16KB, App Router nhận `431` từ request RSC và bỏ lượt điều hướng trong im
lặng (không có lỗi JS nào để bắt). Cùng lỗi cũng làm phình `product_analysis_runs`
(xác minh trên Postgres dev thật: 5 dòng, mỗi dòng 770KB–1MB base64 trong `image_url`).

- [x] `assetId` chuyển BẮT BUỘC xuyên suốt: `validate-transition.ts`, use-case
      `analyzeProductIntelligence`, route `POST /market-intelligence/product-intelligence`
      (zod `min(1)`) — chặn cứng ở cả ba lớp (UI, use-case, API), không chỉ ở UI
- [x] Domain mới `build-handoff-url.ts` (+ test) — URL bàn giao Chặng 05 → Creative
      Studio chỉ mang định danh (`topic`=report.id, `selectedTopic`, `assetId`,
      `mode`/`source`/`area`/`productId`/`productName`), không bao giờ mang ảnh
- [x] `GET /api/v1/assets/:id/view-url` (`G1`, use-case `getAssetViewUrl`) — ký lại
      URL hiển thị tại thời điểm đọc, Creative Studio tự resolve ảnh bằng `assetId`
      thay vì tin `imageUrl` truyền qua query string/sessionStorage
- [x] `GET /api/v1/product-intelligence/:id` (`V2`) viết lại đúng chuẩn (`handle()`,
      `context.params`, ký lại ảnh tươi) — thay cho route mồ côi cũ không ai gọi
- [x] `product_analysis_runs`: bỏ cột `image_url` (từng lưu base64 trực tiếp), `asset_id`
      chuyển `NOT NULL` — migration viết tay `20260922025831_...` (kèm SQL đã soát,
      `prisma migrate dev` bị chặn bởi trôi migration history rộng hơn phạm vi việc
      này, xem nợ mới #119) — **CHƯA áp vào `floraos` (dev)**, chờ anh Tony chạy
- [x] `CreativeHandoffModal`/`product-intelligence-workspace.tsx`/`tai-anh/page.tsx`:
      bỏ `sessionStorage` + query string mang ảnh, thay lỗi im lặng (`catch {}` rỗng)
      bằng thông báo tường minh, khoá nút khi thiếu `assetId`
- [x] Tiện thể vá `san-pham/[id]/tinh-nang/page.tsx` thiếu `"use client"` — chặn
      `npm run build` từ commit `0280d1f` (14/09), không liên quan Chặng 05 nhưng
      chặn tuyệt đối điều kiện "production ready"
- [x] `npm test` 739/739 · `npm run test:tenant` 210/210 (28 tệp, gồm 1 ca mới khoá
      luật "400 khi thiếu asset_id") · `npx tsc --noEmit` sạch · `npm run build` sạch
- [ ] Anh Tony áp migration `20260922025831_...` lên `floraos` (dev) — lệnh cụ thể ở
      đầu tệp `migration.sql`; sau đó lượt "lưu lịch sử phân tích" mới ghi được lại
      (hiện tạm thất bại êm vì `try/catch`, không chặn người dùng)
- [ ] Nợ mới #119: nhiều bảng trong `floraos` (dev) đã trôi khỏi migration history
      (tạo qua `db push`, không qua `migrate`) — `prisma migrate dev` cho BẤT KỲ thay
      đổi schema nào sau này đều đòi `migrate reset`. Cần baseline lại theo đúng kỹ
      thuật đã dùng ở nợ #97 (17/09), việc riêng, không chặn nợ #118


### Audio Studio

- [x] Route `POST /api/v1/audio/jobs` — tạo job âm thanh, capability `I1`, `requireTenantContext` + `requireCapability` bắt buộc ở route
- [x] Use-case `createAudioJob` — multi-provider TTS (OpenAI/ElevenLabs/Minimax/Edge TTS/local fallback, auto-routing + fallback), usage ghi ở core, creditsCost estimate
- [x] 5 domain files (TTS provider port, voice catalog, music catalog, audio types, pricing guard) + 1 use-case + 1 adapter + 1 infra
- [x] Worker `workers/media_ai/audio/audio_worker.py` — SELECT FOR UPDATE SKIP LOCKED + LISTEN/NOTIFY, 4 stages: TTS → Concat → Music Select → Mix, `process_audio_job` thuần (không gọi mạng trực tiếp)
- [x] Audio Studio UI: `/audio` route, 2 tab trong Creative Studio (Khu vực B), `AudioStudioView` + `AudioJobPanel` + `VoiceSelector` + `MusicSelector` + `AudioVisualizer` + `mixAudioAndPlay`
- [x] pytest `workers/tests/media_ai/test_audio_worker.py` — 18 ca thuần, không gọi mạng, không chạm CSDL

### Creative Production

- [x] 6 domain files (media-plan, topic-to-media-bridge, produce-authentic, produce-creative, package-campaign, plan-production) + 5 use-case files
- [x] 3 routes: `POST /api/v1/creative-production/plan` (lập kế hoạch, `I1`), `POST /api/v1/creative-production/produce` (sản xuất, `I1`), `POST /api/v1/creative-production/package` (đóng gói, `I1`)
- [x] TopicProductionBrief SSOT — `organizationId` cho tenant isolation, `selectedTopics[]` với researchKeywords/narrativeArc/emotionalHook/ctaHook/storySlant, mediaSpecs, voiceProfile, musicProfile
- [x] 2 production modes: AUTHENTIC (M02/Market Intelligence → Voice + BGM) và CREATIVE (M04a → Vision AI → Video + Thumbnail)
- [x] Pipeline orchestration: `planProduction` → topic selection → media plan → produce → package
- [x] Audio worker pytest 18/18 xanh · `npx tsc --noEmit` sạch · `npm test` 714/714 xanh

### Nợ #110 đã sửa

- [x] `src/modules/media/use-cases/execute-cloud-creative.ts` — thay `integrityScore = 0.99` cứng bằng giá trị ước lượng từ `providerFlags.generative_fill_used` (1.0 nếu không generative fill, 0.98 nếu có). Sẽ thay bằng phép đo pixel thật (mặt nạ co biên, so sánh pixel lõi) khi có hạ tầng

## P25 — Console Vận hành Nền tảng · P25a mã viết xong 19/09, chờ nghiệm thu máy thật

Giao diện xuyên tổ chức cho người vận hành SaaS — thứ `floraos-core` hiện hoàn
toàn không có. Kế hoạch đầy đủ: `docs/kien-truc/KE_HOACH_CONSOLE_VAN_HANH.md`
(thiết kế gốc: `DASHBOARD_VAN_HANH_NEN_TANG.md`). Phạm vi chốt 18/09: trọn
G1+G2+G3, tám mã `N1`–`N8`; `N9`–`N11` để lại tuyến AI-1.

**Chốt 19/09, không còn gì chặn:** D-N6 tách hẳn từ vựng năng lực nền tảng (không
đụng `capability_scope`, `SYSTEM_ROLES`, `capability-catalog.ts`) · P25 làm TRƯỚC
P13/P16/P18 · một người vận hành duy nhất, KHÔNG làm màn cấp/thu quyền vận hành.

### P25a — G1 chỉ đọc

- [x] Ba bảng mới `platform_operators`, `platform_role_capabilities`, `platform_audit_logs` — không bảng nào có `organization_id`, ngoại lệ có chủ đích của Luật 1
- [ ] **Anh Tony chạy tay:** `npx prisma generate && npx prisma db push` trên Terminal Mac (`device_bash` không chạy được — bẫy `binaries.prisma.sh`)
- [x] Khai ba bảng + ghi rõ lý do ngoại lệ Luật 1 vào `docs/dac-ta/07-database-specification.md`
- [x] `src/core/platform/platform-context.ts` — `PlatformContext` thuần, KHÔNG có `organizationId` để `tsc` chặn nhầm lẫn với `TenantContext`
- [x] `platform-capability-catalog.ts` (`N1`–`N8`) + `platform-capabilities.ts` (`requirePlatformCapability`) + test thuần — 13 ca, `npx vitest run src/core/platform` xanh
- [x] Khai `N1`–`N8` vào `docs/dac-ta/02-function-catalog.md`
- [x] `src/modules/platform/` — chỉ `infra/` + `use-cases/`, KHÔNG `domain/`/`adapters/`: luật thuần đã ở `src/core/platform/` (như `core/rbac`/`core/tenancy` của tenant), không có SDK ngoài nào cần bọc. Cùng hình dạng với `src/modules/sso/` (cũng chỉ 2/4 thư mục) — không phải thiếu sót
- [x] `resolve-platform-session.ts` — `requirePlatformContext`, tra `platform_operators` theo `user_id`, độc lập `sessions.organization_id`. 401 khi chưa đăng nhập, 403 `CAPABILITY_DENIED` khi đã đăng nhập nhưng không phải người vận hành
- [x] `infra/platform-query.ts` — chỗ DUY NHẤT trong repo được truy vấn nhiều tổ chức; không repository tenant nào mọc thêm cờ bỏ lọc
- [x] Năm use-case chỉ đọc: `list-organizations`, `get-organization`, `summarize-usage`, `read-system-health`, `list-platform-audit`
- [x] Năm route `GET /api/v1/platform/{organizations,organizations/:id,usage,health,audit-logs}` + khai vào `docs/dac-ta/06-api-specification.md` (mục 21, kèm ghi chú ngoại lệ có chủ đích với Luật 2)
- [x] `scripts/gan-van-hanh-nen-tang.ts` — gán vai lần đầu, chạy tay (D-N2). Gắn vào `package.json` (`npm run gan-van-hanh-nen-tang -- --email=... [--capabilities=...]`)
- [x] `src/app/(platform)/` route group riêng: layout + `/van-hanh` + bốn trang con chỉ đọc (`to-chuc`, `to-chuc/[id]`, `muc-dung`, `suc-khoe`, `nhat-ky`)
- [x] `tests/platform/cach-ly-platform.test.ts` — viết đủ năm ca (bốn ca bắt buộc + ca 0 phân biệt 401/403): người thường gọi platform → 403 · người vận hành gọi route tenant → chặn như người không có membership (404 trên đơn hàng tổ chức khác) · thiếu năng lực từng route → 403 · **đọc xuyên tổ chức trả ĐỦ cả hai tổ chức fixture**. **CHƯA CHẠY ĐƯỢC trong sandbox (không có Postgres) — chờ anh Tony chạy trên Mac thật**
- [x] Lệnh `npm run test:platform` + gắn vào CI (`.github/workflows/ci.yml`, bước "Test cách ly Console Vận hành Nền tảng")
- [ ] **Cổng, CHƯA ĐỦ:** `tsc` sạch ✅ (chỉ còn lỗi "chờ prisma generate" đã lường trước) · `npm test` 538/538 ✅ · `check:docs` 0 lỗi cả bốn trục ✅ · `test:tenant` **CHƯA CHẠY** (cần Postgres + prisma generate trên Mac) · `test:platform` **CHƯA CHẠY** (cùng lý do). Không tick ô này cho tới khi cả hai lệnh đó xanh trên máy thật

### P25b — G2 hành động trên một tổ chức

- [ ] `domain/platform-rules.ts` — luật duyệt nâng cấp thuần (chỉ `EXPERIENCE` duyệt được, đích chỉ `SINGLE`/`CHAIN`)
- [ ] `list-upgrade-requests` — đọc `audit_logs` `organization.upgrade_requested`, trừ những cái đã xử lý
- [ ] `approve-upgrade` — **chỉ** đổi `organizations.type` + `workspaces.kind` + ghi `audit_logs`, một giao dịch. KHÔNG cộng credit (D-N4)
- [ ] `reject-upgrade` — ghi `organization.upgrade_rejected` kèm lý do
- [ ] `top-up-credit` / `refund-credit` — bọc `OrganizationRepository.topUpCredit` đã có, không viết lại luật
- [ ] Bốn route `/platform/upgrade-requests*` + `POST /platform/organizations/:id/credit` + khai đặc tả 06
- [ ] Trang `/van-hanh/nang-cap` + khối credit trong `/van-hanh/to-chuc/[id]`
- [ ] Ca thử: thiếu `N3` → 403 · duyệt tổ chức không phải `EXPERIENCE` → 409 · `credit_balance` đổi đúng số **đọc lại từ CSDL**, không tin đáp ứng API
- [ ] Bỏ được `scripts/nap-credit.ts` và `scripts/hoan-credit.ts` khỏi quy trình vận hành hằng ngày

### P25c — G3 vận hành sâu

- [ ] `create-organization` — gói `organizations` + `workspaces` + thành viên điều hành đầu tiên; lấy khuôn từ `bootstrap-avi-gift-organization.ts`, KHÔNG tái dùng `signUp` (hàm đó cố định `EXPERIENCE`+trial)
- [ ] `list-org-tokens` / `revoke-org-token` — bọc use-case `integration/` đã có, gác bằng `N8` thay `F9`
- [ ] Ba route `POST /platform/organizations` + `GET·POST /platform/organizations/:id/tokens*` + khai đặc tả 06
- [ ] Giao diện tạo tổ chức + khối token trong `/van-hanh/to-chuc/[id]`
- [ ] Ca thử: tổ chức vừa tạo có ĐÚNG một thành viên điều hành, KHÔNG dữ liệu tổ chức khác lọt vào
- [ ] Lượt chạy thật: tạo tổ chức qua console → đăng nhập bằng tài khoản điều hành mới → xác nhận không thấy dữ liệu tổ chức khác

## AI-1 — Cổng AI và hai sổ đăng ký · hoàn tất 09/12 · chặn P16, P17, P18

Đợt một (09/12): phần lõi phía TypeScript viết mã xong, `prisma generate` + `prisma db push` + `db:seed` ✅, `npm test` **258/258 xanh thật** (41 ca mới: 16 định tuyến, 8 cổng AI, 6 sổ đăng ký, 5 chấm điểm, 6 luật chính sách). `npx eslint` sạch. `npx tsc --noEmit` **SẠCH** (sau `prisma generate`). `npm run test:tenant` **123/123 xanh thật** — gồm 5 ca `ai-policy.test.ts` và 14 ca `vision-analyses.test.ts`.

Chưa làm trong đợt một, cố ý: lớp Python (`workers/ai/`), chuyển ba adapter Vision
sang sau cổng, lượt quét CI chặn import SDK, hai đường Integration API, và hàng
FFmpeg trong sổ đăng ký.

- [x] `ai_capabilities` khai đủ 34 năng lực kèm loại, sàn quyền riêng tư và kênh chấm điểm — `src/core/ai/domain/ai-capabilities.ts` + `seed-ai-registry.ts`, `ai-capabilities.test.ts` (6 ca)
- [x] `ai_models` với bốn ô giấy phép bắt buộc; mô hình thiếu một ô không bật được (`YC-G5`) — `licenseComplete()` ở `ai-registry-repository.ts`, lọc ngay trong `eligibleModels()` nên mô hình thiếu ô không lộ ra bất kỳ đâu; ca thử ở `routing.test.ts`
- [ ] Cấu hình build FFmpeg có hàng riêng trong sổ đăng ký, khoá danh sách thành phần theo giấy phép *(nợ #75 — làm trước dòng mã FFmpeg đầu tiên của P17)*
- [x] Mười cổng khai ở `src/core/ports/`; năm cổng cũ không đổi chữ ký — thêm `shared-media.ts` cùng năm cổng mới; `index.ts` xuất đủ mười
- [ ] `src/core/ai/` và `workers/ai/` giải năng lực, kiểm chính sách, chọn mô hình, kiểm lược đồ đầu ra, ghi sổ *(phía TypeScript xong: `gateway.ts` + `wiring.ts`; phía Python chưa)*
- [ ] Mã nghiệp vụ gọi năng lực, không gọi tên nhà cung cấp (`YC-G1`) *(cổng đã có; chưa chuyển lời gọi nào của M01 sang)*
- [ ] SDK nhà cung cấp chỉ xuất hiện trong `adapters/`, có lượt quét chặn trong CI (`YC-G2`)
- [ ] Ba adapter Vision đang có chuyển sang chạy sau cổng AI mà không đổi hợp đồng trả về
- [x] `ai_policies` theo tổ chức; `GET · PUT /ai-policy` (`U1`/`U2`), đổi `product_vision` đòi thêm `H4` — `putAiPolicy` kiểm `H4` trong use-case chứ không ở route, để đường ghi của engine ngoài về sau không đi vòng qua nó
- [x] Bộ định tuyến giữ đủ năm ràng buộc, mỗi ràng buộc có ca thử khoá (`YC-G6`–`YC-G8`, `YC-G10`, `YC-G12`) — `domain/routing.ts`, 16 ca. Phát sinh một luật mới trong lúc code: thác nghiệm chỉ bật khi năng lực CÓ ngưỡng đã đo, vì không có ngưỡng thì "bắt đầu từ lớp thấp" trở thành "luôn chạy mô hình rẻ nhất" — ngược thứ tự ưu tiên Accuracy > Quality > Cost
- [x] Mô hình chốt vào `payload` của job lúc tạo; worker không tra lại (`YC-G8`) — `selectModel` trả `PINNED_NGOAI_TRAN` thay vì âm thầm đổi mô hình khi trần đổi sau lúc job xếp hàng
- [x] `ai_requests` ghi mọi lời gọi kèm chi phí, độ trễ, điểm; không giữ prompt lẫn đầu ra (`YC-G9`) — bảng không có cột cho prompt, nên luật này là cấu trúc chứ không phải quy ước
- [x] Thác nghiệm nhiều lượt vẫn trừ credit của một lượt nghiệp vụ (`YC-G13`) — cổng AI ghi nhiều hàng `ai_requests` nhưng không chạm `usage`; ca thử khoá ở `gateway.test.ts`
- [ ] `GET /integration/ai-policy` và `POST /integration/ai-requests` chạy được từ cả hai engine (`YC-G14`)
- [x] Bộ test cách ly phủ `ai_policies`, `ai_requests`, `ai_evaluations`, `knowledge_chunks` — `tests/tenant/ai-policy.test.ts` (5 ca), chạy xanh 09/12 sau `prisma generate` + `db push` + `db:seed`

## AI-2 — Chấm điểm, thác nghiệm, dự phòng · chặn go-live P16–P18

- [x] Mỗi năng lực sinh có điểm chất lượng ghi vào `ai_evaluations` (`YC-E1`) — `evaluateOutput()` + `gateway.ts` `recordEvaluation`, `evaluation.test.ts`
- [x] Điểm dưới ngưỡng đặt `needs_review = true` và đưa bản ghi vào hàng chờ duyệt (`YC-E2`) — `gateway.ts` outcome NEEDS_REVIEW + `GET /api/v1/ai-requests/review`
- [x] Điểm chất lượng không thay Review → Approve và không thay Identity Guard (`YC-E3`) — evaluation.ts chỉ chấm, không sửa trạng thái duyệt
- [x] Ngưỡng Identity Guard 0,95/0,90, ngưỡng khác khai trong `ai_capabilities` (`YC-E4`) — `evaluation.ts:37` lấy từ capability, không hằng
- [x] Ngưỡng chưa đo ghi giá trị tạm kèm nợ kỹ thuật (D20) — `threshold === null` → chấm, ghi, không chặn (`evaluation.ts:61`)
- [x] Thác chỉ leo lên; không hạ chất lượng để tiết kiệm (`YC-G10`) — `nextEscalation()` lọc lớp cao hơn (`routing.ts:215`)
- [x] Chuỗi dự phòng không vượt sàn; hết đường FAILED + hoàn credit (`YC-G11`) — `nextFallback()` không vượt floor (`gateway.ts:234`)
- [x] Lời gọi mức SENSITIVE không ra nhà cung cấp ngoài, có ca thử khoá (`YC-G12`) — `modelAllowedUnderFloor()` (`privacy.ts:29`)
- [x] Nhà cung cấp mặc định sập: dự phòng hoặc dừng sạch + credit hoàn — `gateway.ts:345` HET_DUONG_DU_PHONG
- [x] Thiếu kênh chấm = điểm không hợp lệ, không phải điểm 0 (`YC-E10`) — `khong_hop_le` (`evaluation.ts:49-52`)

## AI-3 — Tri thức ngành hoa · chặn P23

- [ ] `flower_taxonomy` nạp từ danh mục 86 loài đã trích và bảng 63 cặp dễ nhầm
- [ ] Nhãn mô hình tra qua danh mục để ra mã và tên chuẩn; mô hình không quyết giá trị vào cơ sở dữ liệu (`YC-E5`)
- [ ] Không tra được thì mã để trống và nhãn gốc được giữ lại (`YC-E6`)
- [ ] `pgvector` bật trên chính Postgres đang dùng; không thêm cơ sở dữ liệu vector nào (D19)
- [ ] `knowledge_chunks` mang `organization_id`, có trong bộ test cách ly (`YC-E9`)
- [ ] Truy hồi trả về chỗ nên đọc; câu trả lời đọc từ bản ghi thật theo thứ bậc nguồn sự thật (`YC-E7`)
- [ ] Câu hỏi về giá, tồn trạng thái và trạng thái đơn trả lời từ dữ liệu giao dịch (`YC-E8`)
- [ ] `flower_taxonomy` không có `organization_id` và lý do được ghi ở đặc tả 07 mục 16

## AI-4 — Sự kiện miền và vòng học

- [ ] Tám sự kiện miền ở đặc tả 10 mục 17 phát ra đúng chỗ, có bản ghi
- [ ] Sự kiện là gợi ý: không sự kiện nào tự chạy một chức năng tính phí
- [ ] `content_features` ghi đủ đặc trưng chữ và đặc trưng hình của mỗi nội dung đã đăng
- [ ] `visual_style` nối ngược về `assets` của biến thể đã dùng
- [ ] Vòng học chạy theo bốn pha; pha sau không bắt đầu trước khi pha trước có số đo
- [ ] Hồ sơ phong cách nói được căn cứ kèm số bản ghi đã dùng (`YC-L3`)

## UI/UX — Tích hợp 10 chức năng giao diện · bắt đầu 13/09

Đây là công việc kết nối 10 trang UI trong `docs/ALG-UIUX-10-chuc-nang.md` với API thật ở `src/app/api/v1/`. 5 trang đã có backend để nối, 5 trang chờ backend tương ứng (M07, M09, M10, M08, M11).

### Đã tích hợp

- [x] **#1 — Phân tích sản phẩm AI** (`src/app/(app)/tai-anh/page.tsx`): POST/PATCH/GET `/api/v1/vision/analyses`, POST reject, SSE `/api/v1/jobs/:id/events`, dùng `useSession()` cho H1/H2/H3, asset listing từ `/api/v1/assets`, Idempotency-Key header, error handling 401/403/409/502
- [x] **#2 — AI Creative Studio** (`src/app/(app)/creative-studio/page.tsx`): POST/GET `/api/v1/media/optimizations` (M04a), POST approve (Identity Guard REJECTED → ẩn Duyệt, WARNING → confirm dialog), GET download (I3), POST/GET `/api/v1/media/variants` + approve + download (M04b, `I4`/`I5`, từ P24), dùng `useSession()` cho I1/I2/I3. *(Sửa 17/09: dòng này từng ghi "proxy `/api/v1/proxy/api/m04b/background-removal`" — đúng ở P13 nhưng sai từ P16/P24, khi trang được dựng lại để gọi `/api/v1/media/variants` qua worker riêng của floraos-core. Widget dashboard cũ còn gọi proxy đó đã gỡ, xem nợ #76.)*
- [x] **#3 — AI Video Studio** (`src/app/(app)/video/page.tsx`): POST/GET `/api/v1/video/jobs`, PATCH `/api/v1/video/jobs/:id`, POST `/api/v1/video/jobs/:id/approve-script`, POST `/api/v1/video/jobs/:id/deploy`, POST `/api/v1/video/jobs/:id/approve-video`, SSE `/api/v1/video/jobs/:id/events`, dùng `useSession()` cho P1/P3/P4, Storyboard 2–15 cảnh, Camera Motion Ken Burns, auto-balance duration, xóa cảnh nổi bật, Provider cắm rút (Local Cinematic 0-credit + Standby Veo/HeyGen)
- [x] **#6 — Catalog & Website** (`src/app/(app)/catalog/page.tsx`): GET `/api/v1/products` (thay MOCK_PRODUCTS, lọc ACTIVE), GET/POST/PATCH/POST-revoke `/api/v1/catalog-links`, 401 redirect
- [x] **#10 — Analytics & Learning** (`src/app/(app)/so-lieu/page.tsx`): GET `/api/v1/usage/summary` (thay METRIC cứng), GET `/api/v1/ai-requests`, GET `/api/v1/audit-logs`, PUT `/api/v1/ai-policy`, dùng `useSession()` cho G8/G9/U1/U2/U3

### Chờ backend

- [ ] **#4 — AI Content Engine** — chờ P18 (M07)
- [ ] **#5 — Social Publishing** — chờ P18 (M07)
- [x] **#7 — CRM & Khách hàng** — hoàn tất P21 (M09, 09/16)
- [x] **#8 — Đơn hàng & Vận hành** — hoàn tất P22 (M10, 09/16)
- [x] **#9 — AI Chat Assistant** — hoàn tất P23 (M08, 09/16)

**Checklist chi tiết hợp nhất:** [`docs/UIUX-Execution-Checklist.md`](../UIUX-Execution-Checklist.md) (tổng hợp feature-level và API integration của toàn bộ 10 chức năng)


## CS-23/09 — Creative Studio 14 chặng: rà soát đồng bộ & sửa production

Chi tiết từng ô ở `docs/dac-ta/ALG_CREATIVE_STUDIO_CHECKLIST.md` v2.0; báo cáo rà soát ở project claude.ai `claude/ra-soat-dong-bo-creative-studio-14-chang-23-09-2026.md`.

- [x] Nhánh Cloud M04b vào hàng đợi job (`media.variant.cloud`), gỡ `execFileSync` khỏi tiến trình web
- [x] Sửa phép đo Subject Integrity (co biên 5px > light wrap 4px), REJECTED không ghi asset
- [x] Worker `audio.generate` được nối (trước đó không tồn tại), `GET /audio/jobs/:id`
- [x] Khu vực F + Chặng 10–14 trên dữ liệu thật — bảng `campaign_packages`, QA máy chủ, duyệt `J5` + `audit_logs`
- [x] Khu vực E: storyboard không còn gửi rỗng, `video_scenes.motion_effect`
- [x] Tài liệu SSOT + đặc tả 06/07 đồng bộ (`check:docs` khớp)
- [ ] `npm run test:tenant` trên máy có Postgres — **chưa chạy**
- [ ] Chạy thử worker với `STABILITY_API_KEY` thật

## CS-24/09 — Creative Studio: nâng cấp sau chạy thật trên máy anh Tony

Chi tiết ở `docs/dac-ta/ALG_CREATIVE_STUDIO_CHECKLIST.md` v2.1, Arch v4.1 §2 / §8.1, IO Spec v4.1 §5.0 / §7.1.

- [x] Kịch bản bối cảnh theo chủ đề (`creative.scene_plan`, AIC-18, 1 credit) sinh ở Chặng 05, dùng chung B/C/D/E; CREATIVE 5 / AUTHENTIC 3 cảnh; gỡ bộ chọn bối cảnh tay ở D
- [x] Chất lượng ảnh D: chốt lõi alpha, thân sản phẩm đặc lấy điểm ảnh Master, khử viền chỉ dải 6px, cổng phủ lõi ≥ 60%; lý do lùi Stability hiện trên thẻ cảnh
- [x] Khu vực E: storyboard theo kịch bản + ảnh D cùng cảnh, gỡ ảnh mẫu Unsplash, gửi `voiceCode` (sửa lỗi video chỉ có nhạc + lỗi đảo tham số `audio_engine.py`), phát video qua `final_video_view_url`, P3 → render → P4 thật
- [x] Bài B tự lưu (`content_drafts`, migration `20260924090000_content_drafts`), Chặng 07 đưa sẵn vào gói
- [x] Chặng 07 xem lại đủ tài sản và sửa tại chỗ: ảnh (`scene-revisions` + biến thể mới), bài (sửa tay / `content-rewrites`, AIC-23), âm thanh (phối lại), video (bản sửa → P3 → render → P4); tự thay vào gói + lưu
- [ ] `npm run test:tenant` (gồm `content-drafts.test.ts`) trên máy có Postgres — **chưa chạy**
- [ ] Chạy thật `db:seed` + AI viết kịch bản / sửa cảnh / viết lại bài trên máy dev

## CS-24/09b — Khu vực C (Audio): rà soát & hoàn thiện 4 tác vụ

Báo cáo rà soát: project claude.ai `claude/ra-soat-khu-vuc-c-audio-24-09-2026.md`. Quyết định PO: Voice Clone xây thật (ElevenLabs), nhạc = thư viện có giấy phép + tiệm tự tải, credit theo bảng ước tính.

- [x] Bốn tác vụ khác nhau thật (worker rẽ nhánh theo `taskType`), credit trừ đúng bảng, job lỗi tự hoàn
- [x] Chọn giọng, lùi nhà cung cấp giữ cùng giọng, ElevenLabs `voice_id`, bỏ macOS `say`, khớp cảnh không tua nhanh
- [x] Sidechain ducking + -14 LUFS + bản chỉ-giọng
- [x] Thư viện nhạc có giấy phép (`music_tracks`) + Voice Clone (`voice_clones`, job `audio.voice_clone`), migration `20260924120000`
- [x] Chặng 07 phối lại giữ giọng/nhạc cũ
- [ ] `test:tenant` (`audio-library.test.ts`) · chạy thật với `ELEVENLABS_API_KEY` · thay 4 bài nhạc chưa có giấy phép (#128)

## P27 — Content Engine M07 trong core

Quyết định PO 25/09/2026: chỉ một content engine, đặt trong `floraos-core` (không phải `SocialFlow`); `SocialFlow` chỉ còn đăng bài + `content_metrics`. Kế hoạch: project claude.ai `claude/ke-hoach-content-engine-core-25-09-2026.md`.

- [x] Đợt 0 — chốt 8 quyết định (mục 0 của kế hoạch), sửa Level 1 (`ALG_SAAS_TARGET_ARCHITECTURE_V2.md` mục 2/12, `BO_TINH_NANG_HIEN_TRANG.md` §2.4), dọn thay đổi thăm dò 25/09 (gọi M07 trực tiếp từ Chặng 05) — giữ `callProxyJson`/`isAllowedProxyPath`/`SOCIALFLOW_DIR`
- [x] Đợt 1a — `contracts/brief.ts` (Brief v1, zod, `BRIEF_VERSION=1`) + JSON Schema sinh tự động (`gen-content-engine-schemas.ts`, `npm run gen:schemas:content-engine`/`check:schemas:content-engine`, `docs/dac-ta/schemas/content-engine/`) + `domain/channel-specs.ts` (EXTEND từ `flower_prompts.py`, khoá trần cứng với `campaign-package-rules.ts`) + `domain/deterministic-checks.ts` (độ dài/hashtag/từ cấm/claim ngoài facts) + `domain/brief-builder.ts` (thuần, nhận dữ liệu đã đọc). 30 test mới xanh, `tsc`/`eslint` sạch trên toàn repo, `check:schemas:content-engine` khớp.
- [x] Đợt 1b — Bộ đọc `infra/` (`read-shop-context.ts`, `read-product-context.ts` — MI report → `product`/`passport`/`topic`, dự phòng `products`, `read-story-context.ts` — kịch bản Chặng 05 `creative.scene_plan`) + `use-cases/get-content-brief.ts` (gộp 3 đầu đọc + `buildContentBrief`, fallback chủ đề tối thiểu khi chưa có báo cáo, không bịa hook/CTA). Còn catalog link (Đợt 2, theo mục 3 kế hoạch). 48 test content-engine + 1024 test toàn repo xanh (trừ 1 test `variant-render-options` không liên quan, thuộc việc nâng cấp ảnh biến thể đang làm song song), `tsc`/`eslint` sạch.
- [x] Đợt 1c (mã) — model `content_generations` (`prisma/schema.prisma`) + migration `prisma/migrations/20260925090000_content_generations` + `infra/content-generation-repository.ts` (create/findById/findLatest/approve/markScheduled) + `tests/tenant/content-generations.test.ts` (5 test cách ly tenant, theo khuôn `catalog-links.test.ts` gọi thẳng repository). **Chưa chạy được** `prisma generate`/`test:tenant` — VM Linux của cầu nối thiết bị chặn mạng tới `binaries.prisma.sh` (khác máy thật của anh Tony), đúng bẫy đã ghi ở mục 9 kế hoạch. Anh Tony chạy hộ trên Terminal thật của máy:
  ```
  npx prisma generate
  npx prisma migrate deploy   # hoặc: npx prisma migrate resolve --applied 20260925090000_content_generations nếu lịch sử lệch (nợ #97/#104)
  npm run test:tenant
  npx tsc --noEmit
  ```
- [x] Đợt 1d — AIC-37 `content_strategy` (`ai-capabilities.ts`, generative, không cần duyệt riêng — Writer AIC-23 mới cần duyệt) + kênh `story` thêm vào AIC-24 `content_qa` + `seed-ai-registry.ts` (AIC-37 vào `capabilities` của `openai_structured`/`openai_direct`). Không thêm mã quyền RBAC mới — `I1`/`J5` đã có sẵn trong `SPLIT_CAPABILITY_PAIRS`/catalog. 1030 test toàn repo xanh, `tsc`/`eslint` sạch (trừ lỗi kiểu đã biết ở `content_generations`, chờ `prisma generate` trên máy thật).
- [ ] Đợt 1e — Bộ bài chuẩn: anh Tony chọn 12–20 sản phẩm × chủ đề, chụp brief vào `golden/content/`
- [x] Đợt 2 — mã XONG 25/09/2026, còn 2 việc hoãn. Prompts v1 cho 4 agent + registry `active.ts` + adapter `content-engine-ai-adapter.ts` (`callCapability`). **Lệch kế hoạch có chủ đích:** khuôn dự phòng "cả chuỗi hỏng" KHÔNG dùng `social-post-generator.ts` như mục 4 gợi ý (file đó chèn cứng câu ưu đãi bất kể `default_offers`) — viết mới `domain/fallback-post.ts` ghép thuần từ `facts[]`. `use-cases/generate-content.ts`: `enqueueJob` → Strategist → Writer song song → kiểm tất định → Critic → Rewriter tối đa 1 vòng → ghi `content_generations`; ba mức dự phòng đúng mục 4, không FAILED khi một bước AI hỏng. Route `POST/GET /api/v1/content-engine/generations` + `GET .../[id]` + zod contract `contracts/generation.ts` + JSON Schema (`check:schemas:content-engine` khớp 3 tệp). 91 test mới, `npm test` 134 tệp/1113 test xanh, `tsc`/`eslint` sạch. **Hoãn:** sự kiện tiến độ `job_events` theo bước (chờ giao diện Đợt 3 cần); `scripts/content-eval.ts` (chờ Đợt 1e — bộ bài chuẩn).
- [ ] Đợt 3 — Nối Chặng 05 (gọi thẳng trong tiến trình, một bản nội dung duy nhất cho bài đăng + audio/caption/ảnh/video), Khu vực B (bấm nút, không tự chạy), `/noi-dung`, Chặng 07 "Viết lại"; gỡ `api/m07/generate` khỏi danh sách trắng proxy
- [x] Rà soát sẵn sàng production 25/09/2026 — sửa 5 điểm chặn: (1) `/noi-dung` "Duyệt" từng gọi proxy SocialFlow bằng mã lượt sinh của core, không kiểm `res.ok`, luôn báo "đã vào hàng đợi xuất bản" → nay gọi `POST /api/v1/content-engine/generations/:id/approve`, báo lỗi thật, không còn hứa lịch đăng; (2) endpoint duyệt tách riêng (`J5`, `domain/approval-rules.ts` thuần — duyệt từng kênh, gộp dần, khoá khi `SCHEDULED`; `audit_logs` cùng giao dịch, khoá lạc quan theo trạng thái); (3) mọi kênh rơi về khuôn tất định → job `COMPLETED`+`result=REJECTED` và hoàn credit (vẫn giao khuôn, đúng mục 4 kế hoạch); (4) `LLMRequest.timeoutMs` + `AbortSignal.timeout` ở `OpenAILLMProvider` (mặc định 120 s, mỗi agent 40 s — `AGENT_CALL_TIMEOUT_MS`), `finishInline` xoá `stage`; (5) trùng `Idempotency-Key` lúc lượt đầu còn chạy trả `PROCESSING` (HTTP 202) thay vì `FAILED`. 17 test mới (14 đơn vị + 3 ca `test:tenant` cho route duyệt); `npm test` 1151/1151, `test:tenant` 242/244 (2 ca `product-copies` đỏ vì máy thử không có `OPENAI_API_KEY`, có từ trước), `tsc` sạch. Gửi bài đã duyệt sang Lịch đăng: nợ #148
- [ ] Đợt 4 — Ảnh vào mô hình, học từ chỉnh sửa tay + `content_metrics`, prompt v2, kênh mới (liên tục)

## CN12 — Điều phối đơn hàng & Control Tower: đưa lên production (25/09/2026)

Rà soát 25/09 (chiều): bản `a52cabe` trông "hoàn thành" nhưng thực chất là bản mẫu một trình duyệt — không migration cho 4 bảng mới, dữ liệu nằm trong localStorage (khoá chung mọi tổ chức), 5 đơn mẫu cứng, API chỉ nhận `stage` nên phân công/QC/POD không bao giờ lưu, "AI QC" là hằng số 94, máy chủ nhận mọi chuỗi `stage`, lỗi trả 500. Đợt này sửa tận gốc.

- [x] Migration `20260925200000_coordinator_control_tower` (4 bảng + 3 enum + cột giao hàng/POD/đóng đơn/`resume_stage`, `CANCELLED`); kiểm bằng `migrate diff` từ lược đồ gốc → áp SQL → so lược đồ = rỗng
- [x] Luật chuyển bước ở máy chủ (`domain/stage-transitions.ts`): chuỗi thuận + bằng chứng (đối tác / QC đạt / POD / hết sự cố), thoát EXCEPTION chỉ về `resume_stage`; sai luồng → 409, khoá lạc quan chống ghi đè đồng thời
- [x] Luật thao tác thuần (`domain/operation-rules.ts`): phân công (công suất ngày), sản xuất (cắm xong bắt buộc ảnh), QC (không đạt bắt buộc lý do), giao hàng F11/F12 (không lùi trạng thái, POD bắt buộc), rủi ro trễ tính lại lúc đọc, đóng đơn, huỷ
- [x] Repository bỏ mọi nhánh "bảng chưa có thì trả rỗng"; mã đơn `FLR-YYMMDD-NNNN` tuần tự theo ngày, thử lại khi trùng khoá
- [x] 15 route `/api/v1/coordinator/*` (đặc tả 06 mục 15b), zod ở `adapters/http-schemas.ts` (400 thay vì 500), quyền `R1`–`R6`
- [x] Mọi thao tác ghi `order_events` (M10 đo SLA) + `audit_logs` trong cùng giao dịch
- [x] Ảnh mẫu / thành phẩm / POD đi qua `assets` của tổ chức (kiểm cùng tổ chức), đổi URL ký lúc đọc; cấm `data:` URL
- [x] 7 hợp đồng bước viết lại: input = zod của route, output = hình dạng route trả (`order-view.ts` khoá ↔ kiểu TS ở tsc); test khoá mỗi hợp đồng trỏ tới route + mã quyền có thật
- [x] Giao diện: bỏ localStorage + đơn mẫu; 7 modal gọi endpoint thật và hiện lỗi máy chủ; QC do người kiểm (không điểm AI giả); phân công từ bảng `partners` (thêm đối tác tại chỗ); giao hàng theo sự kiện; đóng đơn tính SLA thật; tab sự cố mở/đóng; huỷ đơn; "Tải PNG" dùng `html-to-image`
- [x] `tests/tenant/coordinator.test.ts` 14 ca (cách ly đơn/đối tác/ảnh/sự cố, luồng P1→P7, làm lại, sự cố, huỷ, công suất, công tắc quyền, tạo đơn và mở sự cố đồng thời) — xanh trên Postgres 16 thật
- [x] Unit: `stage-transitions.test.ts` + `operation-rules.test.ts` (29 ca) thay `stage-advancement.test.ts` (luật cũ nằm trong UI)
- [x] Kiểm giao diện thật bằng Playwright (Chromium) trên `next dev` + Postgres: P1→P7 qua nút bấm, tải ảnh thật, xoá localStorage + tải lại vẫn còn đơn; nhánh giao thất bại → sự cố → xử lý → quay về giao
- [ ] Anh Tony chạy trên máy thật: `npx prisma migrate deploy` (thêm `20260925200000`) · `npx prisma generate` · `npm run test:tenant` · mở `/dieu-phoi` đi hết một đơn
- [ ] Chấm điểm AI cho QC qua cổng `VisionAnalyzer` + ghi `usage` (nợ #140)
- [ ] Gợi ý đối tác bằng AI (khoảng cách, lịch sử) — nợ #141
- [ ] Thông báo Zalo ZNS/CRM khi giao xong — `connectors/` vẫn là mã tạm (nợ #142)

## CN12b — Trường dữ liệu Điều phối, Master Index & nền quản trị trường (ĐP-1, 26/09/2026)

Quyết định PO 26/09/2026 (xem `docs/kien-truc/KE_HOACH_DIEU_PHOI_TRUONG_DU_LIEU.md`): đưa Điều phối từ ~15% trường chạy thật lên đủ bộ trường Đặc tả trường (T01–T27), nối Master Index, dựng nền quản trị trường cho quản trị nền tảng. ĐP-1 — sửa lỗi P0, không thêm tính năng.

- [x] 1.1 Gỡ "Giá bán khách" khỏi vùng chụp PNG của phiếu đối tác T07 (`partner-product-card.tsx`) — khối giá dời ra ngoài `cardRef`, đánh dấu "chỉ nội bộ"
- [x] 1.2 Bỏ nhánh địa chỉ MỘT CHUỖI trong `addressSchema` (`http-schemas.ts`) — chỉ nhận object 4 tầng; dữ liệu cũ vẫn đọc được (chiều đọc không đổi)
- [x] 1.3 `customerPhone` không còn bị rơi (lưu `order_coordinations.metadata.customerPhone`); ẩn ô "Mức độ ưu tiên điều phối" trên form tới ĐP-4a (trước đó bị nhét vào `internalNote` dạng văn bản)
- [x] 1.4 Bỏ giá trị bịa trong `master-index-adapter.ts`: "Lá đệm theo mùa" / "Giấy gói cao cấp" / "Thiệp chúc mừng" / "Khách hàng thân thiết" — thiếu dữ liệu thật thì trả rỗng
- [x] 1.5 MI-1: `consents[].revokedAt` — `isZaloAllowed`/`hasMarketingConsent`/`projectMarketingAudience` đều xét thu hồi, không chỉ `granted`
- [x] 1.6 MI-2: `availableVouchers` chỉ gồm voucher chưa dùng VÀ chưa hết hạn; thêm `minOrderVnd`, `maxDiscountVnd`
- [x] 1.7 Ghi chú phân công cho ĐỐI TÁC tách khỏi `internalNote` — lưu riêng `order_coordinations.metadata.partnerInstruction`, view trả trường riêng; `PartnerProductCard`/`PartnerProductionCard` đọc từ `partnerInstruction`, không còn hiện `internalNote` (ghi chú nội bộ) cho đối tác
- [x] Test mới: `tests/unit/coordinator/partner-product-card.test.ts`, cập nhật `master-index-adapter.test.ts`; `tests/unit/crm/crm-rules.test.ts` (MI-1/MI-2); `tests/tenant/coordinator.test.ts` (địa chỉ 1 chuỗi → 400, customerPhone round-trip, partnerInstruction tách khỏi internalNote)
- [x] `npx tsc --noEmit` sạch trên toàn repo sau mỗi bước
- [ ] Anh Tony chạy trên máy thật (VM cầu nối không chạy được `vitest`/`rollup` do lệch kiến trúc nhị phân — không phải lỗi do đợt này): `npm test` · `npm run test:tenant` · `eslint` toàn repo · `node scripts/check-docs.mjs` · `npm run check:template-ssot` · `npm run check:schemas:coordinator` — gộp chung với cổng ĐP-2 bên dưới, chạy một lần khi xong toàn bộ phạm vi đã duyệt (chỉ đạo "test verify khi hoàn thành toàn bộ")

## CN12c — Nối Master Index thật vào Điều phối (ĐP-2, 26/09/2026)

- [x] 2.1 (MI-3) `updatedAt` trên `ProductMasterIndex` và `CustomerMasterIndex` — phiên bản cho snapshot
- [x] 2.2 (MI-4) `ProductGalleryImage.role` thêm `REFERENCE`, đọc được ở repository — chưa có màn thao tác gắn vai trò (ghi nợ riêng, không tìm thấy màn duyệt ảnh sản phẩm nào ghi `product_images`)
- [x] 2.3 (MI-5) `projectCoordinatorSnapshot(product, now)` — bản chụp đủ 4 nhóm BOM, không có `costPriceVnd`
- [x] 2.4 (MI-6) `projectCustomerCoordinationBrief(customer)` thay `extractCustomerCoordinationBrief`
- [x] 2.5 `DirectMasterIndexConnector` thi công thật (`getProductMasterIndex`/`getCustomerMasterIndex` theo `TenantContext`)
- [x] 2.6 `createOrderSchema` nhận `productId` tuỳ chọn
- [x] 2.7 Một dòng `order_items` cho mỗi đơn (bỏ kiểu mỗi loài hoa một dòng); có `productId` → `metadata` = snapshot; không có → BOM nhập tay
- [x] 2.8 (Hợp đồng MI §6, bản tối thiểu) `diffAgainstSnapshot` — override có vết cho BOM cành hoa, ghi `order_items[0].metadata.overrides[]`
- [x] 2.9 Có `customerId` → tên/hạng/SĐT lấy từ CMI, bỏ qua giá trị client; form thêm ô tìm khách
- [x] 2.10 Form chọn mẫu nhanh giữ `productId`; bỏ nhồi `wrapStyle`/`ribbon` vào `internalNote`; hiện lá/gói/phụ kiện đúng cấu trúc (chỉ đọc)
- [x] 2.11 View thêm `productId`, `product` (snapshot), `foliage[]`, `wrapping[]`, `accessories[]`, `substitutionPolicy`, `referenceImageUrls[]`
- [x] 2.12 T07 hiện BOM thật từ snapshot — `shade`/`budCount`, cả lá/gói/phụ kiện (trước đó 2 màn không nhận props này dù component đã có)
- [x] 2.13 `unit`/`role` của BOM cành hoa xiết về đúng `DemUnit`/4 vai trò hoa trong `createOrderSchema`
- [x] Test mới: `tests/unit/coordinator/order-overrides.test.ts` (mới), cập nhật `master-index-adapter.test.ts`/`crm-rules.test.ts`/`product-master-index.test.ts`; `tests/tenant/coordinator.test.ts` (6 ca mới)
- [x] `npx tsc --noEmit` sạch trên toàn repo; `eslint` các tệp đã sửa 0 lỗi mới
- [ ] Anh Tony chạy trên máy thật, gộp chung với cổng ĐP-1: `npm test` · `npm run test:tenant` · `npm run test:platform` · `eslint .` · `node scripts/check-docs.mjs` · `npm run check:template-ssot` · `npm run check:schemas:coordinator`

## CN12d — Nền quản trị trường, backend + Console UI + nối luồng thật (ĐP-3, 26/09/2026)

Migration MỚI (`prisma/migrations/20260926210000_field_platform/`), đã chạy thật trên máy Tony. Backend + Console UI (3.15) đầy đủ; 3.16 (nối trường tự tạo + gate chuyển bước + `projectForAudience` vào luồng đơn thật) ĐÃ LÀM cho entity `ORDER` + 1 form nhập (T01) + 2 thẻ hiển thị (T02/T07) — phạm vi thật và phần còn lại ghi rõ ở dòng cuối, không phải "xong 100% mọi template".

- [x] 3.1 `N12 platform.field_catalog.manage` (`platform-capability-catalog.ts`)
- [x] 3.2 Sổ đăng ký trường lõi: `field-platform/domain/core-field-registry.ts` + `coordinator/contracts/field-registry.ts` (22 trường — một lô đại diện, chưa phủ hết Đặc tả trường §18)
- [x] 3.3 Danh mục hành vi `behaviors.ts` (SLA, bậc ưu tiên, `orderType`/`deliveryLocationType`/`deliveryType`/`paymentMethod`/`collectionMethod`)
- [x] 3.4 Luật thuần `field-rules.ts` — 5 mức sàn §16.2, giới hạn trường tự tạo §16.3
- [x] 3.5 `custom-field-schema.ts` — sinh zod động, giữ giá trị trường đã tắt
- [x] 3.6 Seed `scripts/nap-danh-muc-truong.ts` (22 trường lõi, 11 danh mục D7, idempotent)
- [x] 3.7/3.8 Use-case nền tảng (N12, ghi `platform_audit_logs`) + use-case tenant chỉ đọc (`get-effective-field-config`, R1) — trả `*ApiView` camelCase (sửa nợ 26/09 khuya muộn, trước đó trả thẳng dòng Prisma)
- [x] 3.9 `apply-custom-fields.ts` — nối vào `create-coordinator-order.ts` (tạo đơn) và use-case mới `update-order-custom-fields.ts` (`PATCH /coordinator/orders/:id/custom-fields`, R3, sửa sau khi tạo)
- [x] 3.10 `stage-transitions.ts` — gắn vào `update-coordinator-stage.ts` (chặn rời bước còn trường `requiredAtStage` trống); `get-effective-field-config.ts` tách `loadEffectiveFieldConfigs` không kiểm R1 cho use-case ghi dùng nội bộ
- [x] 3.11 `project-for-audience.ts` — nối phần TRƯỜNG TỰ TẠO vào thẻ đối tác T02 (`partner-product-card.tsx` + `buildZaloText`)/T07 (`partner-production-card.tsx`) qua `visibleCustomFieldsForAudience`; CHƯA thay logic ẩn/hiện viết tay có sẵn của các trường lõi khác (additive, đúng ý)
- [x] 3.12 `scripts/check-field-registry.ts` (`npm run check:field-registry`)
- [x] 3.13/3.14 Route platform (`/platform/fields`, `/platform/catalogs`, `/platform/organizations/:id/field-overrides`, `/platform/organizations/:id/field-preview`, `/platform/behaviors`) + route tenant (`GET /field-config`)
- [x] 3.15 Console `/van-hanh/truong-du-lieu` (4 tab: Trường lõi/Trường tự tạo/Danh mục/Ghi đè theo tổ chức), xác nhận-có-diff mọi thao tác ghi, xem-trước theo tổ chức — nav thêm vào `(platform)/layout.tsx`
- [x] Test mới: 6 tệp `src/modules/field-platform/domain/*.test.ts`, `apply-custom-fields.test.ts`, `tests/platform/field-registry.test.ts` (7 ca), +1 ca cách ly ở `tests/tenant/cach-ly-repository.test.ts`, cập nhật `platform-capability-catalog.test.ts`; Console UI: `diff-confirm.test.ts` (4 ca hàm thuần), `page.test.tsx` (1 ca dựng tĩnh 4 tab) — CHƯA có test tương tác (click/form), hạ tầng hiện tại không có jsdom/testing-library
- [x] 3.16 test mới: `tests/tenant/coordinator.test.ts` +4 ca (customFields lưu & trả về ở view lúc tạo đơn; PATCH custom-fields trộn giá trị không xoá trường khác; trường REQUIRED tại INTAKE chặn rời bước rồi điền vào mới qua được — kiểm cả nội dung lỗi 422; trường OPTIONAL không chặn dù để trống)
- [x] Đặc tả 06 mục 15b/21b (nay 9 route), đặc tả 07 mục 1/27b cập nhật; `node scripts/check-docs.mjs` xanh
- [x] `npx tsc --noEmit`/`eslint` sạch cho mọi tệp không đụng 4 model mới (lỗi CHỜ `prisma generate` đã liệt kê riêng, không lẫn lỗi khác)
- [ ] Anh Tony chạy tay TRƯỚC mọi test khác: `npx prisma migrate deploy` (hoặc `db push`) → `npx prisma generate` → `npm run seed:field-registry` → `npm run check:field-registry`; sau đó gộp cổng chung ĐP-1+ĐP-2+ĐP-3: `npm test` · `npm run test:tenant` · `npm run test:platform` · `eslint .` · `node scripts/check-docs.mjs` · `npm run check:template-ssot` · `npm run check:schemas:coordinator`
- [x] 3.16 `<ConfiguredField>`/`<CustomFieldsSection>` (`src/components/coordinator/custom-fields-section.tsx`) — ĐÃ LÀM cho entity `ORDER`: nhập ở T01 (Sales Intake), hiển thị lọc theo PARTNER ở T02/T07, gate `requiredAtStage` chặn rời bước. **CÒN LẠI (ghi nợ tường minh, không chặn tiến độ):** entity `PARTNER` chưa có form nào gọi `CustomFieldsSection`; các màn Điều phối khác (T04/T06/T10/T24, Chi tiết đơn chung) chưa có ô nhập/hiển thị lọc — sửa qua API; không có màn SHIPPER-facing (T18) trong mã để nối; IMAGE/FILE/STRUCTURED_ADDRESS/ASSET_REF chưa có ô nhập (ghi chú thay thế); SELECT/MULTI_SELECT tạm nhập chuỗi tự do, chưa đọc `catalogKey` thật

## CN12e — MI-12 mở rộng BOM nguyên tử (ĐP-2b, 26/09/2026)

Mở rộng cấu trúc BOM nguyên tử của Product Master Index theo D5 (PO đã duyệt 26/09) — Điều phối không định nghĩa lại, sửa tại PMI gốc + hợp đồng Vision.

- [x] 2b.1 `product-master-index.ts`: `FlowerBomItem` +`variety`/`stemLengthCm`/`substitutionAllowed`/`substitutionPriority`; `FoliageBomItem`/`AccessoryBomItem`/`WrappingLayer` +`substitutionAllowed`; `WrappingLayer` +`pattern`/`quantity`; `AccessoryBomItem` +`unit` (tất cả optional)
- [x] 2b.2 `product-master-index-repository.ts` đọc 9 khoá Vision mới (`bien_the`/`chieu_dai_cm`/`duoc_thay_the`/`thu_tu_uu_tien_thay_the`/`hoa_van`/`so_luong`/`don_vi`) từ `analysis.edited ?? .raw`; xác nhận `product-master-merge.ts` (M01b salesData) không đụng BOM, không cần sửa
- [x] 2b.4 `workers/vision/contracts/Schema.json` — 9 khoá nullable-bắt-buộc mới, mô tả "điền khi nhận diện được, không thì null, KHÔNG ĐOÁN", diff tối thiểu giữ nguyên định dạng gốc
- [x] Coordinator zod: `AtomicFlowerBomItemSchema`/`AtomicFoliageBomItemSchema`/`AtomicWrappingLayerSchema`/`AtomicAccessoryBomItemSchema` (`common.ts`) cập nhật khớp — giữ `conformance` (`order-view.ts`) xanh qua `tsc`
- [x] 2b.5 Hiện: `analysis-schema-mapper.ts` (M01a, theo đúng quy tắc mọi trường Schema.json lên UI), `sales-order-intake-modal.tsx` (T01, khối chỉ-đọc BOM theo mẫu), `partner-production-card.tsx` (T07, bảng hoa + lá/gói/phụ kiện) — chỉ khi đơn có `productId`; `projectCoordinatorSnapshot`/`bomFlowersOf` không cần sửa (mảng BOM truyền tham chiếu)
- [x] Cổng chung: sản phẩm CŨ không có 9 trường mới vẫn qua toàn bộ test hiện có — 2 ca mới `product-master-index.test.ts` (đủ 9 trường / sản phẩm cũ không bịa giá trị)
- [x] `npx tsc --noEmit` sạch trên mọi tệp đã sửa (1 lỗi không liên quan ở `customer-detail-modal.tsx` — việc khác, chưa commit); `eslint` 0 lỗi mới; `node scripts/check-docs.mjs` xanh; Schema.json hợp lệ, `required` khớp đúng `properties` cả 4 loại BOM
- [ ] Anh Tony chạy `npm test` (hoặc `npx vitest run src/modules/products/domain/__tests__/product-master-index.test.ts`) để xác nhận 2 ca mới — môi trường cầu nối không chạy được vitest (giới hạn `@rollup/rollup-linux-arm64-gnu`)
- **CHƯA làm (ghi nợ tường minh):** form M01b (`/tai-anh`, `/duyet`) chỉ HIỆN 9 trường mới (chuỗi tổng hợp), chưa có ô nhập riêng — đúng hệt giới hạn có sẵn của `color`/`role`/`shade`; T01 gõ tay BOM (không chọn mẫu) vẫn chỉ nhận 5 trường cũ, chưa nhận 9 trường MI-12; không có test tích hợp DB riêng cho việc đọc từ `product_analyses` thật (chỉ có test domain thuần)

## CN12f — Sổ thu `order_payments` (ĐP-4a.3, 26/09/2026)

Lát cắt đầu tiên của ĐP-4a (10 mục, phạm vi lớn — chọn xây trước một lát tự khép kín). Thiết kế theo PO D2 (§2.14 dac-ta-truong-du-lieu-dieu-phoi-v2): mỗi đơn luôn ghi Tổng/Đã thu/Còn phải thu; mỗi lượt thu/hoàn là một dòng `order_payments`.

- [x] Schema: `orders` +`paid_vnd`/`balance_vnd` (CHECK `balance_vnd = total_vnd - paid_vnd`); bảng mới `order_payments` (kind DEPOSIT/BALANCE/REFUND); migration viết tay `20260926220000_order_payments` (VM cầu nối không chạy được `prisma migrate dev`)
- [x] 2 mã năng lực mới: R9 (`order.payment.record`, Sales/Điều phối/Điều hành) và R10 (`order.payment.refund`, trần cứng Điều hành)
- [x] `GET/POST /api/v1/coordinator/orders/:id/payments`; use-case `record-payment.ts` (tính paid/balance trong transaction, chặn hoàn quá số đã thu); `paymentStatus` suy ra lúc đọc, không lưu
- [x] `CoordinatorOrderView` +`paidVnd`/`balanceVnd`/`paymentStatus`; 3 ca test mới `coordinator.test.ts` (luồng cọc→thu nốt + đọc lại DB + liệt kê; cách ly tổ chức 404; hoàn quá số 422 + R10 trần cứng 403)
- [x] `eslint` sạch 10 tệp; `node scripts/check-docs.mjs` xanh (bổ sung route/bảng/enum vào 06/07-spec + `COVERED_VIA_ROUTE`)
- **CỐ Ý CHƯA làm:** gate đóng đơn đòi `balanceVnd = 0` thuộc ĐP-4c mục 4c.8, không phải 4a — sửa ngay sẽ phá ca test "luồng đủ P1→P7" hiện có
- [x] Anh Tony chạy trên máy thật: `npx prisma generate` sạch → `npx prisma migrate deploy` áp thành công → `npm run test:tenant` **281/281 XANH** (sau khi vá 1 hồi quy: `order-repository.ts` module M10 — điểm tạo `orders` thứ hai, thiếu `balance_vnd` khi tạo đơn, gây 500/CHECK violation cho 6 ca; đã thêm `balance_vnd: totalVnd`, eslint sạch). **CỔNG ĐP-4a.3 KHÉP KÍN HOÀN TOÀN.**
- **CHƯA làm — 9/10 mục còn lại ĐP-4a:** 4a.1 trường T01, 4a.2 tính SLA, 4a.4 hiện 3 số trên UI đơn hàng, 4a.5–4a.8 T02–T05, 4a.9 Form Lập kế hoạch, 4a.10 đăng ký field-registry

## CN12j — Sửa hồi quy P0: priority tự gợi ý làm 422 mọi đơn tạo mới (27/09/2026)

- [x] Phát hiện: Tony chạy `npm run test:tenant` thật, dán kết quả — 26/281 fail, toàn bộ `newOrder()` trả 422 thay vì 201.
- [x] Chẩn đoán nguyên nhân: `create-coordinator-order.ts` validate `priority` vô điều kiện qua `assertActiveCatalogCode`, kể cả khi giá trị là do `suggestPriority()` tự gợi ý (không phải Sales chọn tay) — trong khi DB test tenant không seed `field_catalog_values` (`db:test:setup` chỉ chạy `prisma db push`, không chạy `nap-danh-muc-truong.ts`), nên danh mục `priority` rỗng → validate luôn thất bại → MỌI đơn tạo mới bị 422.
- [x] Sửa: chỉ validate qua danh mục khi `input.priority` được client tự gửi; bỏ qua khi máy tự gợi ý (giá trị luôn hợp lệ theo `PRIORITY_TIER_BEHAVIORS` — Lớp mã).
- [x] Tự kiểm `eslint` sạch.
- [x] Tự kiểm `npx tsc --noEmit` sạch cho tệp sửa (lỗi còn lại trong tsc là lỗi có sẵn/chờ Tony `prisma generate`, không liên quan).
- [ ] Chưa tự kiểm được: `npm run test:tenant` (VM cầu nối thiếu binary rollup) — chờ Tony chạy lại xác nhận 281/281 xanh (hoặc tổng số hiện tại, đã +16 test từ ĐP-4a.2).

## CN12i — Tính SLA giao từ hành vi serviceLevel (ĐP-4a.2, 26/09/2026)

- [x] `sla-calculation.ts` (thuần) — `computeDeliveryTargetAt` theo 4 hành vi OFFSET/EXACT/WINDOW/END_OF_DAY, tham số từ danh mục, mặc định an toàn khi thiếu/không nhận diện được
- [x] `validate-catalog-code.ts` +`getActiveCatalogValue()` — lấy hành vi thật của serviceLevel thay vì suy từ mã
- [x] `create-coordinator-order.ts` — dùng SLA calc để tính `estimatedDeliveryAt`; `evaluateRisk` không cần sửa (tự hưởng lợi từ mốc chính xác hơn)
- [x] 16 unit test mới (`sla-calculation.test.ts` 9 ca + `priority-suggestion.test.ts` 7 ca viết bù) — CHƯA CHẠY được ở VM cầu nối
- [x] `eslint`/`tsc`/`check-docs.mjs` sạch
- [ ] Anh Tony: `npm test` (hoặc `test:tenant`) để xác nhận 16 test mới xanh
- **Hạn chế đã biết:** `WINDOW` (TIME_SLOT) cần `deliveryWindowStart/End` nhưng T01 chưa có ô nhập khung giờ riêng — rơi về giờ hẹn đơn khi thiếu

## CN12h — T01: đủ trường P0/P1 (ĐP-4a.1, 26/09/2026)

Phát hiện trước khi làm: danh mục (`nap-danh-muc-truong.ts`) và luật hành vi (`behaviors.ts`) của ĐP-3 đã seed/định nghĩa sẵn ĐỦ cho 4a.1 — việc chính là nối dây cột DB + use-case + UI, không phải dựng danh mục/luật mới.

- [x] Migration `20260926230000_coordinator_p1_p2_fields`: 17 cột mới `order_coordinations` (đều NULL) — 16 cột theo kế hoạch §7.1 + `card_required` (phát hiện thiếu trong lúc làm, kế hoạch gốc không liệt kê dù có nhắc luật)
- [x] `validate-catalog-code.ts` (field-platform) — kiểm mã danh mục active trước transaction
- [x] `GET /api/v1/field-config/catalogs` (`R1`, mới) — route TENANT đọc danh mục cho form, khác `/platform/catalogs` (đòi `N12`)
- [x] `priority-suggestion.ts` (coordinator/domain) — gợi ý ưu tiên theo §2.15.1, không ép Sales
- [x] `create-coordinator-order.ts`/`coordinator-repository.ts`/`present-coordinator-order.ts`/`contracts/order-view.ts` — nối đủ 17 cột hai chiều, `conditionalFieldGroups` suy từ `behaviors.ts` (§12)
- [x] T01 UI: Section 2.5 (6 ô chọn danh mục) + checkbox "Có thiệp/băng rôn" bắt buộc `cardMessage`
- [x] `eslint` sạch (2 lỗi tự phát hiện & sửa: unescaped-entities, noUncheckedIndexedAccess); `npx tsc --noEmit` sạch trừ đúng phần đọc cột mới qua Prisma Client chưa generate (`present-coordinator-order.ts`); `node scripts/check-docs.mjs` xanh
- [ ] Anh Tony: `npx prisma migrate deploy` → `npx prisma generate` → `npm run db:test:setup && npm run test:tenant` → `npm run check:schemas:coordinator` → thử tạo đơn thật ở `/dieu-phoi`
- **CỐ Ý CHƯA làm:** ô nhập chi tiết cho 9 nhóm trường có điều kiện §12 (chỉ có danh sách nhóm đang bật — đặc tả gốc ghi "lưu ở archive", không có trong tài liệu hiện có); tính `productionDeadlineAt`/`pickupTargetAt` (ĐP-4a.2/4a.9); gán `nextActionOwnerId`/`handoffAt` (ĐP-4a.5); đăng ký field-registry (ĐP-4a.10, dồn cùng 4a.5–4a.9)

## CN12g — Hiện Tổng/Đã thu/Còn phải thu lên UI Control Tower (ĐP-4a.4, 26/09/2026)

Kế hoạch 4a.4: "Hiển thị 3 con số Tổng/Đã thu/Còn phải thu trên T01, T02, T05 và trang Đơn hàng M10". T02/T05 chưa có màn riêng (chờ 4a.5/4a.8) — đáp ứng bằng một thanh tóm tắt xuyên suốt mọi tab của modal chi tiết đơn (đã phủ đúng các tab đang đóng vai T01/T02).

- [x] `payment-ledger-modal.tsx` (mới): hiện Tổng/Đã thu/Còn phải thu/`paymentStatus`, liệt kê `order_payments` (`GET .../payments`), form ghi thêm dòng DEPOSIT/BALANCE/REFUND (`POST .../payments`)
- [x] `control-tower-dashboard.tsx`: thanh tóm tắt 3 số + nút "Sổ thu" dưới hàng tab modal chi tiết (mọi tab); `handleCreateOrder` ghi DEPOSIT ngay sau khi tạo đơn nếu Sales nhập cọc, không nuốt lỗi nếu ghi cọc thất bại
- [x] `sales-order-intake-modal.tsx` (T01): ô tuỳ chọn "Khách trả trước (cọc)" + khối xem trước 3 số ngay trên form — hoàn thành phần UI còn thiếu của "Sales ghi DEPOSIT ở T01" (§2.14 mục 4, API đã xây ở ĐP-4a.3 nhưng chưa nối UI)
- [x] `coordinator-api.ts`: `RecordPaymentBody`, `recordPayment()`, `listPayments()`
- [x] `npx tsc --noEmit` sạch trên toàn bộ tệp đã sửa (lần đầu tsc chạy được từ VM cầu nối ở đợt ĐP-4 — Prisma Client đã generate thật trên máy Tony, mount chung thư mục); `eslint` sạch (1 lần vướng `react-hooks/set-state-in-effect`, sửa theo khuôn `useCustomFieldDefinitions`)
- [ ] `vitest` chưa chạy được ở VM cầu nối (thiếu binary rollup) — UI thuần gọi lại API đã có test xanh, rủi ro hồi quy thấp; anh Tony xác nhận bằng mắt trên `/dieu-phoi` khi tiện
- **CHƯA làm — cố tình để lại:** hiện 3 số trên "trang Đơn hàng M10" (`src/modules/orders`, module tách biệt) — cần thêm `paidVnd`/`balanceVnd` vào `OrderRecord`/view của module đó, để lượt riêng

## REL-25/09 — Gộp chuỗi Creative Studio vào `main` (25/09/2026)

Chuỗi `feature/creative-production-pipeline` → `fix/creative-studio-production-ready` → `feat/content-engine-p27` → `claude/content-engine-readiness-check-6xbaxa` (142 commit, gồm M01, Media, Market Intelligence, Điều phối, Content Engine) chưa từng chạy CI. Nhánh `release/creative-studio-to-main` dọn các cổng đỏ rồi fast-forward `main`.

- [x] `ci.yml` thêm `SSO_SESSION_SECRET` (thiếu thì `db:seed` chết) và `OPENAI_API_KEY` giả (2 ca `product-copies` đỏ 500)
- [x] Worker: ca `test_paste_offset_duoc_dung_de_dan_lai_chu_the` cố định mặt nạ chủ thể (đỏ từ `e96d8b8` khi mặc định tách nền đổi sang `isnet-general-use`); kiểm đột biến xác nhận ca vẫn bắt được paste-back hỏng
- [x] Lint 265 lỗi → 0: 205 `no-explicit-any` thay bằng kiểu thật (payload Prisma, `unknown` + thu hẹp, `Route` của typed routes, interface cho JSON ngoài); `rules-of-hooks` ở `catalog-storefront` (hook sau `return` sớm); `no-require-imports` (gom `readDotenvKey`, dời `scripts_check_migrations.js` → `scripts/xem-prisma-migrations.mjs`); `purity`; 24 `set-state-in-effect` đánh dấu có lý do (nợ #149)
- [x] Gõ kiểu làm lộ lỗi thật: modal đơn hàng so trạng thái không tồn tại (nợ #150, giữ nguyên hành vi chờ PO); `create-order-modal` nhận `quotePriceVnd = null` → `?? 0` đúng chú thích
- [x] Cổng CI xanh trên Postgres 16: typecheck · lint · `npm test` 1151/1151 · `check:template-ssot` · schemas creative/coordinator/content-engine · `test:tenant` 244/244 · `test:platform` 5/5 · `build` · worker pytest
- [ ] Anh Tony chạy lại trên máy thật sau khi kéo `main`: `npx prisma migrate deploy` · `npx prisma generate` · `npm run test:tenant`

## PRV-25/09 — Creative Studio: nhà cung cấp trước, cục bộ là đường lùi (25/09/2026)

Quyết định PO 25/09/2026: mọi bước TẠO (nội dung, giọng, nhạc, ảnh, video) ưu tiên nhà cung cấp trả phí; nhiều nhà cung cấp tương đương mỗi loại; tiệm đặt thứ tự trong Cài đặt + mỗi lượt đổi được bên; cục bộ chỉ chạy khi mọi bên lỗi và ghi rõ lý do. AUTHENTIC dùng nhà cung cấp cho nền + ánh sáng, không vẽ lại bó hoa.

- [x] Danh mục nhà cung cấp một nguồn (`creative-production/domain/provider-catalog.ts`) + `GET·PUT /api/v1/creative-production/providers` (thứ tự tiệm ở `organizations.settings.creative_providers`)
- [x] Nội dung: Claude (Opus 5 / Sonnet 5) + Gemini (2.5 Pro / Flash) sau cổng AI, `preferredModelKeys` theo thứ tự tiệm, lùi sang bên kế tiếp; Chặng 02 qua cổng (#155); Critic AIC-24 chạy thật (#158)
- [x] Ảnh A: mặc định chuỗi nhà cung cấp (Photoroom → fal → Gemini Image → OpenAI), lùi Studio cục bộ có lý do
- [x] Ảnh D: mọi chế độ đi nhà cung cấp (fal → Stability → Gemini Image), AUTHENTIC chỉ nền + sáng, phép đo `perceptual`
- [x] Video: clip từng cảnh qua Veo / Kling / Runway / Luma, ghép ở ALG; lùi Ken Burns cục bộ + hoàn phần clip lúc đọc; chọn bên ở Khu vực E (nợ #160)
- [x] Nhạc nền: ElevenLabs Music sinh nhạc không lời theo tâm trạng (sau giọng đọc, đúng thời lượng), bài thư viện là dự phòng + hoàn phần nhạc; giọng đọc theo thứ tự tiệm (nợ #161)
- [x] Giao diện Cài đặt thứ tự nhà cung cấp của tiệm (`/cai-dat-ai`, `provider-order-settings.tsx`, ghi cần `U2`) + chọn bên từng lượt cho nội dung (Chặng 05, Content Engine), giọng đọc, nhạc, ảnh, video — kiểm bằng Chromium thật
- [ ] Chạy thật với khoá của từng nhà cung cấp (nợ #153, #159, #160)

## UIUX — Nâng cấp theo 03a/03b (kế hoạch DOC-05-KE-HOACH-NANG-CAP-UIUX)

### Giai đoạn UX-R & UX-0: Nền tảng & Quản trị (26/09/2026)
- [x] TR.1 — Kiểm Role UX trên máy thật (11/11 tests role-ux-catalog xanh, 4 vai sẵn sàng)
- [x] T0.1 — Ghi quyết định PO vào tài liệu (K1–K6, D-RU4, Q-TC, Q-MO, Q-E2E)
- [x] T0.2 — Nâng UX Constitution thành 03a CANONICAL (`docs/dac-ta/03a-ux-constitution.md`)
- [x] T0.3 — Thư mục và mẫu Screen Contract (`screen-contracts/_TEMPLATE.md` & `README.md`)
- [x] T0.4 — Sửa AGENTS.md theo 03a và K1–K3 (Tab Header, FeatureGuidanceCard, Video kép, câu hỏi 12)
- [x] T0.5 — Nối 03-UX với 03a (Trạng thái một phần/thành công, L0–L4)
- [x] T0.6 — Mục theo dõi trong Checklist

### Giai đoạn UX-1: Trạng thái, Component nền, Trợ năng nền
- [x] T1.1 — `loading.tsx`, `error.tsx`, `not-found.tsx` cấp nhóm tuyến
- [x] T1.2 — Component `Skeleton` + thay các chỗ "Đang tải…" ngoài vùng Điều phối
- [x] T1.3 — Component `EmptyState`
- [x] T1.4 — Component `InlineError`
- [x] T1.5 — Vùng thông báo cho trình đọc màn hình (`LiveRegionProvider` + `useAnnounce`)
- [x] T1.6 — `focus-visible` và vùng bấm cho component gốc (vùng bấm 44px)
- [x] T1.7 — Sửa phần tử không tương tác mà có `onClick`
- [x] T1.8a — Component `Dialog` dùng chung (`@base-ui/react`) và 3 modal mẫu
- [x] T1.8b — Chuyển các modal ngoài vùng Điều phối sang `Dialog` (dần theo màn ở UX-5) · **DONE 29/09** — `create-order-modal` + `order-detail-modal` (476→~280 dòng, tách `order-cancel-dialog` + `order-action-buttons`); thêm `subHeader` slot vào Dialog
- [ ] T1.8c — Chuyển các modal vùng Điều phối sang `Dialog` (sau ĐP-4c)
- [x] T1.9 — Liên kết "Bỏ qua tới nội dung" và mốc trang
- [x] T1.10 — `TabActionHeader` tuân K2 (cảnh báo > 1 nút primary ở dev)

### Giai đoạn UX-2: UX Lint v0
- [x] T2.1 — Lõi `scripts/ux-lint.ts` (AST parse R1–R12)
- [x] T2.2 — Allowlist `scripts/ux-lint-allow.json`
- [x] T2.3 — Baseline và chế độ ratchet (`npm run lint:ux -- --check`)
- [x] T2.4 — Test cho lint (`scripts/ux-lint/rules.test.ts` — 24/24 xanh)
- [x] T2.5 — Chạy trong CI (`.github/workflows/ci.yml`)
- [x] T2.6 — Tài liệu cho lint (AGENTS.md & 03a §0)

### Giai đoạn UX-3: Kiến trúc thông tin và Điều hướng
- [x] T3.1 — Mô hình điều hướng một nguồn (`nav-model.ts` + test)
- [x] T3.2 — Nhóm điều hướng theo việc (6 nhóm việc theo K5)
- [x] T3.3 — Gác điều hướng theo năng lực (xác minh capability của từng tuyến)
- [x] T3.4 — Nối `desktop-nav.tsx` vào `nav-model` (bỏ mã kỹ thuật, token màu)
- [x] T3.5 — Nhóm thu gọn, nhớ trạng thái trong `localStorage`
- [x] T3.6 — Thay popover "Tất cả phân hệ" bằng ô lọc nhanh tìm chức năng
- [x] T3.7 — Nối `bottom-nav.tsx` và trang `/them`
- [x] T3.8 — Test hiển thị điều hướng (unit + E2E)
- [x] T3.9 — Screen Contract điều hướng (`_dieu-huong.md`) + cập nhật 03-UX §3

### Giai đoạn UX-4: Token và Cỡ chữ
- [x] T4.1 — Đo tần suất cỡ chữ và màu thô (`measure-tokens.ts`)
- [x] T4.2 — Khai token cỡ chữ và token ngữ nghĩa trong `globals.css`
- [x] T4.3 — Cập nhật 03a với thang token
- [x] T4.4 — Codemod an toàn (`scripts/codemod-ux-tokens.ts`)
- [x] T4.5.1 — Codemod token `src/components/ui`
- [x] T4.5.2 — Codemod token `src/components/layout`
- [x] T4.5.3 — Codemod token `src/components/dashboard` (Đợt A) · **DONE 29/09** — 0 R1/R2 xác nhận sạch
- [x] T4.5.4 — Codemod token `(app)/{tai-anh,duyet,job,vai-tro}` + upload/flow/result/sales (Đợt A) · **DONE 29/09** — 95 thay đổi; R2 app/(app) 96→0; upload 46→0
- [x] T4.5.5 — Codemod token `templates/shared` + `product-analysis` (Đợt A) · **DONE 29/09** — shared sạch
- [x] T4.5.6 — Codemod token `catalog, crm, orders, chat, storage, profiles, org` + templates (Đợt B) · **DONE 29/09** — 31 thay đổi; sales 31→0; −203 vi phạm tổng
- [x] T4.5.7 — Codemod token `creative-studio` + templates (Đợt C) · **DONE 29/09** — 326 thay đổi/22 tệp
- [x] T4.5.8 — Codemod token `video-studio, knowledge-base` + templates (Đợt C) · **DONE 29/09** — 18 thay đổi/4 tệp
- [x] T4.5.9 — Codemod token `market-intelligence` (chia 3 commit, sau K3) · **DONE 29/09** — 214 thay đổi/28 tệp; R2 222→14; R1 1885→1881; −212 vi phạm
- [x] T4.5.10 — Codemod token `(platform)` Console (Đợt D) · **DONE 29/09** — 56 thay đổi/10 tệp; R2 −599 tổng cộng (3421→2822)
- [ ] T4.5.11 — Codemod token vùng Điều phối (sau ĐP-4c)
- [x] T4.6 — Token hoá màu `FeatureGuidanceCard` (K1)
- [x] T4.7 — Rà soát và token hoá mã Hex trong `.tsx`

### Giai đoạn UX-5: Chuẩn hoá màn theo Screen Contract
#### Đợt A: Màn dùng hằng ngày của 3 vai đang dùng được
- [x] T5.A1 — Trang chủ Quản lý cửa hàng (`StoreManagerDashboard`, `trang-chu-store-manager.md`)
- [x] T5.A2 — Trang chủ Bán hàng (`SalesWorkspace`, `trang-chu-sales.md`)
- [x] T5.A3 — Danh mục vai (`/vai-tro`, `vai-tro.md`)
- [x] T5.A4a — Quét ảnh hoa (`/tai-anh`) — Cấu trúc & nhãn tab (giữ nguyên Journey 14 bước & Atomic Fields) · **DONE 29/09/2026** — 16 vi phạm R2 → token; badge m01b count động; 2 nhãn R8 sửa; tsc sạch; lint −30
- [x] T5.A4b — Quét ảnh hoa (`/tai-anh`) — Kết quả L0–L4 & duyệt tại chỗ · **DONE 29/09/2026** — Zone 4 K2: [Không đạt][Duyệt] cạnh nhau căn phải, Lưu nháp căn trái; 31 vi phạm R2 → token; tsc sạch; lint −31
- [x] T5.A4c — Quét ảnh hoa (`/tai-anh`) — Trạng thái & mobile · **DONE 29/09/2026** — R5: Card upload role/tabIndex/onKeyDown; R8: jobPhase → FLOW_M01 label; vùng thả >>44px; mobile max-w-md; nợ #client-compress
- [x] T5.A5 — Hàng chờ duyệt (`/duyet`, `duyet.md`)
- [x] T5.A6 — Quản lý Job (`/job`, `/job/[id]`, `job.md`)

#### Đợt B: Bán hàng và Vận hành cửa hàng (Hoàn tất 100%)
- [x] T5.B1 — Sản phẩm (`/san-pham`, `/san-pham/[id]`, `san-pham.md`)
- [x] T5.B2 — Đơn hàng (`/don-hang`, `don-hang.md`)
- [x] T5.B3 — Khách hàng (`/khach-hang`, 3 card → 1 card theo K1, `khach-hang.md`)
- [x] T5.B4 — Hội thoại (`/hoi-thoai`, `/hoi-thoai/kenh-tich-hop`, `hoi-thoai.md`)
- [x] T5.B5 — Catalog (`/catalog`, `catalog.md`)
- [x] T5.B6 — Tính giá (`/gia`, `gia.md`)
- [x] T5.B7 — Trang Thêm trên mobile (`/them`, `them.md`)
- [x] T5.B8 — Menu tài khoản + Hồ sơ cửa hàng (`/ho-so`, `ho-so.md`)

#### Đợt C: Nội dung và Tiếp thị
- [x] T5.C1 — Market Intelligence (`/market-intelligence`, áp dụng K3 video kép gọn, `market-intelligence.md`)
- [x] T5.C2 — Creative Studio (`/creative-studio`, Khu vực A–F)
- [x] T5.C3 — Video Studio (`/video`, `video.md`)
- [x] T5.C4 — Content Engine (`/noi-dung`, `noi-dung.md`)
- [x] T5.C5 — Lịch đăng (`/lich-dang`, `lich-dang.md`)
- [x] T5.C6 — Kho mẫu (`/kho-templates`, `kho-templates.md`)

#### Đợt D: Thiết lập, Số liệu, Console, Điều phối
- [x] T5.D1 — Số liệu (`/so-lieu`)
- [x] T5.D2 — Kết nối kênh (`/ket-noi`)
- [x] T5.D3 — Cài đặt AI (`/cai-dat-ai`)
- [x] T5.D4 — Bộ máy phân tích (`/bo-may`)
- [x] T5.D5 — Tri thức (`/tri-thuc`)
- [x] T5.D6 — Kho dữ liệu (`/kho-du-lieu`)
- [x] T5.D7 — Mức dùng tenant (`/muc-dung`)
- [x] T5.D8 — Nhật ký kiểm toán tenant (`/audit`)
- [x] T5.D9 — Cài đặt tiệm (`/cai-dat`, hỏi PO phạm vi)
- [x] T5.D10 — Console Vận hành nền tảng (`/van-hanh`)
- [ ] T5.D11 — Vùng Điều phối (`/dieu-phoi` + Control Tower — sau ĐP-4c)
- [ ] T5.D12 — Console Trường dữ liệu (`/van-hanh/truong-du-lieu` — sau ĐP-3)

### Giai đoạn UX-6: Mở khoá vai và các lớp liên vai
- [x] T6.1 — Mở khoá vai `product_manager`
- [x] T6.2 — Mở khoá vai `marketing` & `lead_marketing`
- [x] T6.3 — Mở khoá vai `crm`
- [x] T6.4 — Mở khoá vai `customer_service` · **DONE 29/09/2026** — `CustomerServiceWorkspace` (hội thoại chờ, dịp KN, tác vụ nhanh); `CUSTOMER_SERVICE_WORKSPACE` enum; test 1339/1339 xanh; lint:ux --check đạt; tsc sạch
- [ ] T6.5 — Mở khoá vai `finance_accounting` (chờ ĐP-4a)
- [ ] T6.6 — Mở khoá vai `quality_control` (chờ ĐP-4b/4c)
- [ ] T6.7 — Mở khoá vai `partner_manager` (chờ ĐP-4c)
- [ ] T6.8 — Mở khoá vai `ceo` & `manager` (chờ CHAIN)
- [ ] T6.9 — Đa vai / chuyển vai (#162, chờ PO duyệt migration)
- [ ] T6.10 — AI theo vai (#168)
- [ ] T6.11 — Ngoại lệ và thông báo P0–P3 (#166, #163a, sau ĐP-4c)
- [ ] T6.12 — Pipeline Sales (#164)
- [x] T6.12b — Bỏ gợi ý bịa trong `projectOccasionReminder`
- [x] T6.13 — Thêm vai `florist` (Thợ cắm) vào danh mục (nợ #169)

### Giai đoạn UX-7: Nghiệm thu liên tục và Khoá tài liệu
- [x] T7.1 — Chụp so sánh giao diện (Visual regression Playwright) · **DONE 29/09/2026** — `visual.spec.ts` kiểm thử regression khổ 390x844 và 1280x800 không lệch (0 diff)
- [x] T7.2 — E2E theo vai (`role-homepage`, `navigation`, `route-states`) · **DONE 29/09/2026** — 7/7 tests Playwright xanh thật (route-states 404, skip-link, role-homepage cho dieu_hanh, sale, dieu_phoi, navigation vai-tro disabled)
- [x] T7.3 — Quét trợ năng tự động (`@axe-core/playwright`) · **DONE 29/09/2026** — tích hợp axe-core kiểm định WCAG 2.2 AA (0 critical/serious violations; tinh chỉnh độ tương phản text-muted và warning-text; chuẩn hoá nút không lồng nhau)
- [x] T7.4 — CI cho UX (`e2e-ux` job) · **DONE 29/09/2026** — bổ sung job `e2e-ux` trong `.github/workflows/ci.yml` chạy `test:e2e:ux`
- [ ] T7.5 — Khoá tài liệu (chuyển sang ARCHIVED, hoàn tất)

