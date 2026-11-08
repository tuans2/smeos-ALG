# 18 — Checklist thực hiện implementation plan

> Đi kèm `16_IMPLEMENTATION_PLAN.md` và `17_SOCIALFLOW_REPLACEMENT_PLAN.md`. Mỗi hạng mục chỉ được tích **xong** khi đủ các ô con **và** checklist chuẩn §1.
> Cách dùng: agent tích ô trong PR của hạng mục (cùng commit với mã); PO tích ô **[PO]**. Cột "PR" ở bảng tiến độ §10 ghi số PR.
> Ký hiệu: **[TAY]** việc PO làm ngoài repo · **[SCHEMA]** có migration · **[CHỜ x]** chờ quyết định/đầu vào `x`.

## 1. Checklist chuẩn cho MỌI PR (Definition of Done)

**Trước khi viết mã**
- [ ] Đọc skill liên quan trong `.claude/skills/` và SSOT của khu vực (grep `docs/00-DOCUMENTATION-REGISTRY.yaml`)
- [ ] Đọc mã thật và test hiện có của phần sẽ sửa
- [ ] Nhánh riêng từ `main` mới nhất; tên `feat|fix|chore|docs/<mã-hạng-mục>-…`
- [ ] Hạng mục **[SCHEMA]**/CI/`render.yaml`/thư viện mới/nhà cung cấp mới: đã có PO đồng ý (trong PR hoặc `15`)

**Trong khi làm**
- [ ] Không đổi phạm vi ngoài hạng mục (`[PROD]`); phát hiện ngoài phạm vi → ghi vào PR, không sửa
- [ ] `organization_id` chỉ từ `requireTenantContext`; truy cập chéo → 404
- [ ] Gác bằng mã năng lực; route mới không gác → khai lý do trong `route-capability-guard.test.ts`
- [ ] Gọi AI qua `callCapability` (TS) / chính sách AI chung (worker)
- [ ] Mọi vòng lặp/thử lại có giới hạn
- [ ] Không tệp mới > 350 dòng; tệp cũ đã quá thì không làm dài thêm
- [ ] Chữ giao diện tiếng Việt tự nhiên, token ngữ nghĩa, không mã kỹ thuật trên màn hình
- [ ] Không bí mật, dữ liệu khách, nội dung `.env` trong mã/log/commit

**Kiểm thử và gate**
- [ ] Luật mới / sửa lỗi có test
- [ ] `npm run typecheck && npm run lint:ratchet`
- [ ] `npm run lint:ux -- --check` (nếu sửa `.tsx`)
- [ ] `npm test`
- [ ] `npm run test:tenant` · `npm run test:platform` (nếu chạm dữ liệu, route, schema, quyền) — chạy trên DB `*_test`
- [ ] `npm run check:docs` (nếu sửa đặc tả/route/bảng)
- [ ] `cd workers && python -m pytest tests -q` (nếu sửa `workers/`)
- [ ] `npm run build` · `npm run test:e2e:ux` (nếu cấu hình/route/màn hình mới)
- [ ] **[SCHEMA]**: `prisma migrate dev` tạo migration; `migrate diff --exit-code` sạch; migration theo expand → contract

**Tài liệu và PR**
- [ ] SSOT/đặc tả/Screen Contract cập nhật trong cùng commit
- [ ] Commit Conventional Commits; không `--no-verify`, không force-push nhánh chung
- [ ] Mô tả PR: thay đổi (`tệp:dòng`), gate đã chạy + kết quả, phần chưa kiểm chứng, cách quay lui
- [ ] CI xanh đủ job (`web`, `worker`, `e2e-ux`, `security`, `industry-terms` sau P0-02)
- [ ] **[PO]** Duyệt và merge
- [ ] Sau deploy: smoke test xanh (sau P1-03); theo dõi Sentry 24 giờ (sau P1-04)
- [ ] Tích hạng mục ở checklist này + bảng tiến độ §10

---

## 2. GĐ0 — Ổn định và chặn rủi ro (tuần 1)

### P0-01 Sửa thuật ngữ ngành, đưa `main` về xanh
- [x] Chạy `npm run audit:industry` lấy danh sách vi phạm mới
- [x] Thay chuỗi hardcode bằng `getIndustryPlugin().terminology` / `ti.*`
- [x] `npm run audit:industry:check` xanh
- [ ] CI trên `main` xanh sau merge

### P0-02 Tách ratchet + deploy chỉ khi CI xanh — **[PO] duyệt sửa CI/`render.yaml`**
- [x] Job `industry-terms` riêng, chạy song song
- [x] ~~Job `deploy` cần đủ 5 job, chỉ chạy khi `push` vào `main`~~ — **thay cơ chế (PO 05/11/2026)**
- [x] ~~`render.yaml`: `autoDeploy: false` cho web + 3 worker~~ — **thay cơ chế (PO 05/11/2026)**
- [x] ~~Hướng dẫn tạo secret deploy hook~~ — không còn deploy hook

Cơ chế hiện hành: blueprint tự đủ. `render.yaml` đặt `autoDeployTrigger: checksPass` + `branch: main`
cho cả 5 dịch vụ deploy từ mã, CI không còn job `deploy`, không còn secret `RENDER_DEPLOY_HOOK_*`.
Đáp ứng cả hai yêu cầu cùng lúc: "chạy blueprint là tự động thiết lập deploy" (PO 05/11/2026) **và**
bảo đảm gốc của D-14 "chỉ deploy bản đã qua kiểm" — Render chờ check CI xanh rồi mới deploy, commit
không sinh check nào thì không deploy. Ruleset `main` ở P0-03 vẫn nên bật nhưng là lớp phòng vệ thứ hai.
- [x] `render.yaml`: `autoDeployTrigger: checksPass` cho web + 3 worker + cron, ghim `NODE_VERSION`/`PYTHON_VERSION`
- [x] Biến bắt buộc tự cấp (`generateValue`/`fromDatabase`); `CRON_SECRET` chia sẻ qua `fromService.envVarKey`
- [x] Test gác bất biến blueprint: `tests/unit/architecture/render-blueprint-tu-du.test.ts`
- [ ] Thử: sync blueprint trên Render tạo đủ 7 tài nguyên; push vào `main` tự deploy 5 dịch vụ

### P0-03 Cấu hình GitHub/Render — **[TAY]**
- [x] ~~**[PO]** Thêm secret `RENDER_DEPLOY_HOOK_*` vào GitHub~~ — không còn cần (P0-02 đổi cơ chế)
- [ ] **[PO]** Ruleset `main`: bắt buộc PR, 5 check xanh, chặn force push — lớp phòng vệ thứ hai (chặn *merge* bản đỏ); cổng deploy do Render thực thi qua `autoDeployTrigger: checksPass`
- [ ] **[PO]** Chuyển repo `smeOS` sang riêng tư (D-22)
- [ ] **[PO]** Xác nhận Render deploy từ `smeOS`, rồi archive `floraos-core` (D-37)
- [ ] Lưu ảnh chụp cấu hình vào runbook

### P0-04 Gỡ cửa hậu console nền tảng (D-23)
- [x] Xoá nhánh cookie `smeos_dev_role` trong `resolve-platform-session.ts`
- [x] Xoá nhánh email `@dev.com`
- [x] Cookie dev chỉ còn đổi khuôn UI ngoài production (`resolve-app-session.ts`); seed dev cấp `platform_operators` thật cho tài khoản dev
- [x] Test platform: user `@dev.com` không phải operator → 403
- [x] Test platform: cookie dev → 403

### P0-05 Bắt buộc kho tệp ở production
- [x] Production thiếu `STORAGE_*` → mọi thao tác tệp báo lỗi rõ ràng + `/api/health/ready` 503 (chốt ở `getStorageProvider`, không ở import `env.ts`, để `next build`/E2E trên CI không hỏng; CI đặt `ALLOW_LOCAL_STORAGE=true`)
- [x] `/api/health/ready` báo loại kho
- [x] Unit test `env` (đủ / thiếu biến)
- [ ] **[PO]** Xác nhận 4 biến `STORAGE_*` đã đặt trên Render trước khi merge

### P0-06 Ẩn chức năng lỗi + sửa báo thành công giả
- [x] Ẩn nghiên cứu thị trường (D-20): khoá "Sắp ra mắt" mọi bản build production; API giữ nguyên (đã gác `V1`/`V2`)
- [x] Lịch đăng, phần MXH `/ket-noi`: trạng thái "chưa sẵn sàng" khi thiếu nguồn đăng
- [x] Lỗi mạng khi đăng → báo lỗi thật, không đổi trạng thái bài
- [x] Bỏ link giả `makeChannelUrl`; chỉ hiện link do nền tảng trả về
- [ ] E2E UX: không còn nút dẫn tới lỗi

### P0-07 Baseline xanh (D-43)
- [x] Chạy đủ bộ test trên `main`, lập danh sách lỗi có sẵn
- [x] Kết quả: chỉ có 1 lỗi có sẵn — ratchet thuật ngữ (sửa ở P0-01); unit 593/593 tệp, tenant 137/137, platform 11/11 xanh trên máy cục bộ
- [x] Tách PR theo mô-đun nếu > 10 lỗi — không cần
- [ ] `npm test`, `test:tenant`, `test:platform`, `build` xanh trên CI
- [x] Báo PO nếu vượt 5 ngày công — không cần

### P0-08 Bỏ `ignoreBuildErrors`
- [x] Sửa `next.config.ts`
- [x] `npm run build` xanh khi kiểm kiểu (mặc định); Render bỏ qua bằng `SKIP_BUILD_TYPECHECK=true` vì chỉ build commit đã qua typecheck ở CI

### P0-09 Xin duyệt app nền tảng — **[TAY]** (đường găng Workstream S)
- [ ] **[PO]** Chốt S-1, S-2 (`17` §7)
- [ ] **[PO]** Xác minh doanh nghiệp Meta
- [ ] **[PO]** Nộp xét duyệt quyền đăng bài Trang + Instagram
- [ ] **[PO]** Kiểm quyền API đăng bài Zalo OA
- [ ] Ghi ngày nộp / ngày duyệt vào §10

**Cổng GĐ0:** [ ] `main` xanh liên tục 3 lần merge · [ ] deploy chỉ khi xanh · [ ] không còn cửa hậu · [ ] không còn thành công giả

---

## 3. GĐ1 — Nền production (tuần 2–3)

### P1-01 Migration ở pre-deploy, seed hệ thống — **[PO] duyệt `render.yaml`**
- [ ] Tách `db:seed:system` (vai, AI registry, decision registry; idempotent)
- [ ] `buildCommand` chỉ cài + generate + build
- [ ] `preDeployCommand`: `db:deploy` + `db:seed:system`
- [ ] `db-deploy.mjs` ghi mốc thời gian trước migration (cho PITR)
- [ ] Thử migration lỗi: bản cũ vẫn chạy

### P1-02 PITR + diễn tập khôi phục — **[TAY] [CHỜ I-7]**
- [ ] **[PO]** Duyệt chi phí, nâng gói CSDL có PITR
- [ ] Viết lại runbook §4: RPO/RTO, người khôi phục, các bước
- [ ] Diễn tập khôi phục ra CSDL tạm
- [ ] Biên bản: thời gian khôi phục ≤ 1 giờ

### P1-03 Smoke test sau deploy
- [ ] `scripts/smoke-after-deploy.mjs` (health, ready, đăng nhập, trang công khai mẫu)
- [ ] Gắn vào cuối job `deploy`
- [ ] Hướng dẫn rollback khi smoke đỏ trong runbook

### P1-04 Sentry — **[CHỜ I-5]**
- [ ] `SENTRY_DSN`, `SENTRY_ENVIRONMENT` khai ở web + 3 worker (`sync: false`)
- [ ] **[PO]** Nhập DSN trên Render, chỉ định người nhận cảnh báo
- [ ] Lỗi thử hiện trên Sentry kèm `requestId`

### P1-05 Khoá phân tán cho 3 lịch nền
- [ ] Advisory lock trong 3 scheduler
- [ ] Log khi bỏ lượt
- [ ] Tenant test: hai lượt đồng thời chỉ một lượt chạy

### P1-06 Cảnh báo thao tác nhạy cảm của người vận hành (R-2)
- [ ] Email cho PO sau `N3`, `N7`, `N14`
- [ ] Test platform

### P1-07 Kiểm Origin cho request ghi
- [ ] Kiểm trong `src/proxy.ts`; miễn webhook, cron, công khai có chữ ký
- [ ] Unit + E2E; webhook thử không bị chặn

**Cổng M1 — Production an toàn:** [ ] GĐ0 xong · [ ] P1-01…P1-05 xong · [ ] diễn tập khôi phục đạt · [ ] **[PO]** ký xác nhận M1

---

## 4. GĐ2-A — 4 tầng nhất quán (đường găng)

- [ ] **P2-A1 Ngành chỉ là plugin** (D-01): gỡ `INDUSTRY` khỏi khoá thông báo, sự kiện, `nav-industry`, xem trước tầng, `tierOf` · migration dữ liệu khoá nếu có · cập nhật `SMEOS_4_TIER_…` + standard 01 · test
- [ ] **P2-A2 [SCHEMA] Chuỗi chính + `resolveTierChain`** (D-02, D-03): cột `is_primary` + ràng buộc · hàm dùng chung · thay 3 bản sao · tenant test đối tác 2 chuỗi
- [ ] **P2-A3 [SCHEMA] Một thực thể chi nhánh** (D-02c):
  - [ ] PR 1: tài liệu thiết kế — **[PO]** duyệt
  - [ ] PR 2: expand (bảng/cột mới) + backfill
  - [ ] PR 3: chuyển mã đọc/ghi
  - [ ] PR 4: contract (bỏ cột cũ, `chain_branch_code`, giá trị `BRANCH`)
  - [ ] Tenant test giá theo chi nhánh, `/cua-hang`, điều phối giữ hành vi
- [ ] **P2-A4 Phạm vi quyền vào `TenantContext`**: `grants: Map<code, scope>` · `scopedWhereForBranch` · tương thích ngược
- [ ] **P2-A5 Áp phạm vi chi nhánh** (D-04) — bật bằng cờ theo tổ chức:
  - [ ] Đợt 1: đơn hàng, khách hàng, điều phối + tenant test chéo chi nhánh
  - [ ] Đợt 2: sản phẩm/giá, kho dữ liệu, báo cáo + test
  - [ ] Đợt 3: mô-đun còn lại + test
  - [ ] **[PO]** Thông báo khách trước khi bật mỗi đợt
- [ ] **P2-A6 Khuôn UX từ (tầng, mã quyền)** (D-05): bỏ so `roleKey` trong `components` · sửa fail-open MI · test kiến trúc
- [ ] **P2-A7 Vai CSKH / QL sản phẩm** (D-06) **[CHỜ I-1]**: nhãn mới · quyền `product_manager` · migration seed quyền
- [ ] **P2-A8 Khoá công cụ phủ API** (D-35): thêm API cho Thẻ chào, quét ảnh, mẫu · bỏ `system-optimizer` · test
- [ ] **P2-A9 Nav Mẹ lọc mã N + sửa 2 liên kết hỏng**
- [ ] **P2-A10 Áp ma trận Thanh toán, Phí gia công** (ngoài Thẻ chào) + tenant test
- [x] **P2-A11 Bộ test đối chiếu tầng** (mỗi trục × Mẹ/Chuỗi/Cửa hàng) xanh trong CI — `tests/tenant/tier-consistency.test.ts`

## 5. GĐ2-B — Thương mại

- [ ] **P2-B1 [SCHEMA] Gói mặc định** (D-07): tổ chức hiện có → `PRO` · đăng ký mới → `STARTER` · chuỗi → `FLOWER_NETWORK` · test
- [ ] **P2-B2 Thực thi gói ở API**: bảng route → `featureKey` · kiểm ở biên · test kiến trúc · `STARTER` gọi studio/video → 403
- [ ] **P2-B3 Giao diện gói** (mẫu P11): khoá + gợi ý nâng cấp · nav lọc theo gói · E2E UX theo gói
- [ ] **P2-B4 Tỷ giá credit** (D-12) **[CHỜ A-1]**: `VND_PER_CREDIT = 1000` · làm tròn · hiện VND ở ước phí và console · unit
- [ ] **P2-B5 [SCHEMA] Sổ nạp tiền + phiếu thu** (D-11): bảng `credit_topups` · console `N3` ghi qua đây · tổ chức xem lịch sử · audit log

## 6. GĐ2-C — Tích hợp (thứ tự D-31)

- [ ] **P2-C1 Khung đầu nối Hub**: hợp đồng gửi/nhận/kiểm sức khoẻ · test kiến trúc "host nhà cung cấp chỉ nằm trong thư mục đầu nối"
- [ ] **P2-C2 Zalo OA/ZNS** → Hub; Thẻ chào dùng adapter mỏng (D-32) · **[PO]** duyệt sửa `the-chao-freeze.test.ts` · test Thẻ chào giữ nguyên
- [ ] **P2-C3 SePay** → Hub · test thanh toán
- [ ] **P2-C4 eSMS** → Hub; thay stub SMS của thông báo
- [ ] **P2-C5 Telegram** một đầu nối (bỏ bản trùng)
- [ ] **P2-C6 Messenger** → Hub
- [ ] **P2-C7 Email** → Hub
- [ ] **P2-C8 Kênh Zalo của thông báo** (thay stub)
- [ ] **P2-C9 [SCHEMA] Web Push**: **[PO]** duyệt thư viện `web-push` · khoá VAPID · service worker · bảng đăng ký · E2E
- [ ] **P2-C10 Danh mục đầu nối ghi đúng trạng thái**

## 7. GĐ2-D/E/F/G — AI, bảo mật, dữ liệu, LocalBudd

- [ ] **P2-D1 Chính sách AI chung cho worker** (D-34): `workers/shared/ai_policy.py` · từ chối → `FAILED` + hoàn credit · pytest + test kiến trúc Python
- [ ] **P2-D2 Sửa tài liệu cổng AI** (`CLAUDE.md` #5, hồ sơ bàn giao, 2 skill)
- [ ] **P2-E1 CSP chặn**: đọc báo cáo 2 tuần · đổi header · E2E xanh
- [ ] **P2-E2 Gác mã năng lực `content-engine/rewrite`** · **[PO]** xác nhận mã
- [ ] **P2-E3 Tự rà OWASP ASVS mức 2** (R-3) · biên bản
- [ ] **P2-F1 [SCHEMA] Nghị định 13 tối thiểu** (D-27): đồng ý theo mục đích · ghi nhận ở biểu mẫu công khai · xuất/xoá theo yêu cầu · nhật ký · tenant test
- [ ] **P2-F2 Hạn lưu 3 tháng** (D-28) **[CHỜ I-2]**: bảng phân loại dữ liệu · job dọn · tenant test
- [ ] **P2-F3 [SCHEMA] Vệ sinh lược đồ** (D-29): enum · CHECK số dư · FK `product_images.asset_id` · `organization_id` bảng con · DB test dựng bằng `migrate deploy`
- [ ] **P2-F4 Máy trạng thái đơn SSOT** + sửa `business-reporting.ts` · unit đủ cặp chuyển
- [ ] **P2-G1 [TAY]** **[PO]** Kiểm LocalBudd đang chạy/dữ liệu thật · xuất dữ liệu · archive repo
- [ ] **P2-G2 Gỡ phần chờ LocalBudd** (proxy, client token, `business-profile`, `dev:all`, danh mục) · `check:docs`
- [ ] **P2-G4 Gỡ proxy, SSO liên-app, token tích hợp** (sau P2-G2 + S-14) · `grep` không còn mã gọi LocalBudd/SocialFlow

## 8. Workstream S — Thay SocialFlow (`17` §4)

- [ ] **S-00 [TAY]** = P0-09 (app Meta/Zalo được duyệt)
- [ ] **S-01** = P0-06 (báo lỗi thật, bỏ link giả)
- [ ] **S-02 [SCHEMA]** `social_posts`, `social_post_events`, enum trạng thái · tenant test cách ly
- [ ] **S-03 Domain**: máy trạng thái · luật lịch (không quá khứ, giới hạn bài/giờ/kênh) · luật tự duyệt D11 · unit đủ cặp chuyển
- [ ] **S-04 API `/api/v1/social/posts`**: danh sách, tạo, lên lịch hàng loạt, đăng ngay, thử lại, huỷ · zod · `J5` · đặc tả 06 · tenant test
- [ ] **S-05 Nối soạn → lịch đăng**: nút "Gửi lịch đăng" ở `/noi-dung` + gói chiến dịch · gọi `markScheduled` · Chặng 10 · tenant test luồng
- [ ] **S-06 Kết nối OAuth trong Hub**: bắt đầu/callback · token vào vault · làm mới token · kiểm sức khoẻ · `/ket-noi` bỏ trường mật khẩu
- [ ] **S-07 Đầu nối Facebook Page**: test hợp đồng HTTP giả · **[PO]** thử thật trên Trang thử nghiệm
- [ ] **S-08 Đầu nối Instagram** (ảnh qua URL ký có hạn) · test · **[PO]** thử thật
- [ ] **S-09 Đầu nối Zalo OA (đăng bài)** · test · **[PO]** thử thật
- [ ] **S-10 Lịch chạy** `/api/v1/internal/social-publish-sweep`: khoá chống trùng · retry ≤ 5 · xử lý bài kẹt `PUBLISHING` · tenant test không đăng trùng
- [ ] **S-11 Tự duyệt theo thời hạn**: thêm mã `O7` · công tắc lưu + audit log · quét hết hạn · test bật/tắt
- [ ] **S-12 Số liệu bài → `content_metrics`**: Chặng 12 + "Gợi ý đăng lại" dùng số liệu thật
- [ ] **S-13 Chuyển giao diện** (Lịch đăng, trang chủ Marketing, `/ket-noi`, Chặng 10) sang API nội bộ · Screen Contract `lich-dang.md`, `ket-noi.md` · E2E UX · không còn gọi `/api/v1/proxy`
- [ ] **S-14 Gỡ mã SocialFlow** (proxy `SOCIALFLOW`, client token, content-metrics cho SocialFlow, `worker:socialflow`, tài liệu)
- [ ] **S-15 [TAY]** **[PO]** Archive repo SocialFlow (+ xuất lịch sử nếu S-3 = b)
- [ ] **S-16 (v2)** LinkedIn, TikTok — sau khi được duyệt app

## 9. GĐ3 — Bàn giao, tài liệu, chất lượng

- [ ] **P3-01** Viết lại `TRANG_THAI.md` §3/§6; sửa số liệu `CLAUDE.md`, `AGENT_RULES` (§12, cổng), README; `check:docs` bắt các số liệu này
- [ ] **P3-02** Gộp `docs/Audit` → `docs/audit`; rà tài liệu trước khi giao (D-41c): bỏ bí mật, dữ liệu khách; tệp agent theo **[CHỜ I-4]**; `handover:check` 0 cảnh báo
- [ ] **P3-03** ERD sinh từ `schema.prisma` + kiểm trong CI
- [ ] **P3-04** Gói bàn giao **[CHỜ I-3]**:
  - [ ] Runbook không còn [CẦN XÁC NHẬN]
  - [ ] SLA
  - [ ] Hướng dẫn quản trị console `/van-hanh`
  - [ ] Hướng dẫn người dùng: Điều hành · Điều phối · Sale · Marketing · CSKH · Cửa hàng · Chuỗi
  - [ ] Quy trình phát hành/nâng cấp
  - [ ] Danh mục quyền truy cập (Render, GitHub, AI, kho tệp, Meta, Zalo, SePay, eSMS)
  - [ ] Ghi rõ rủi ro chấp nhận R-1, R-2, R-3
  - [ ] **[PO]** Duyệt
- [ ] **P3-05** Test bắt buộc Screen Contract cho trang mới/được sửa; hợp đồng cho trang đường găng (đơn hàng, điều phối, cửa hàng, tích hợp, lịch đăng)
- [ ] **P3-06** Ratchet số dòng mỗi tệp
- [ ] **P3-07** Kiểu domain riêng; `check:layers` cấm `import type` từ `infra/`
- [ ] **P3-08** Dọn `vercel.json`, `cron-job-entry.txt`, `dify-chat-provider.ts`
- [ ] **P3-09** Kiểm tải S1–S4 trên CSDL khôi phục từ PITR · báo cáo p95

## 10. Cổng mốc

**M1 — Production an toàn** (§3)

**M2 — Commercial ready (cửa hàng)**
- [ ] M1
- [ ] P1-06, P1-07
- [ ] P2-B1 … B5
- [ ] P2-C1 … C4
- [ ] P2-D1, P2-E1, P2-F1, P2-F2
- [ ] Workstream S v1 (nếu S-5 = a)
- [ ] **[PO]** Ký xác nhận M2

**M3 — Commercial ready (chuỗi)**
- [ ] M2
- [ ] P2-A1 … A11
- [ ] P2-C5, C6
- [ ] **[PO]** Ký xác nhận M3

**M4 — Bàn giao khách**
- [ ] M3
- [ ] GĐ3 (P3-01 … P3-09)
- [ ] S-14, S-15, P2-G4 (không còn SocialFlow/LocalBudd)
- [ ] **[PO]** Ký biên bản bàn giao

## 11. Đầu vào PO còn chờ

- [ ] S-1 … S-5 (`17` §7)
- [ ] I-1 Quyền `product_manager`, nhãn vai CSKH → mở P2-A7
- [ ] I-2 Phạm vi "3 tháng" → mở P2-F2
- [ ] I-3 Nội dung SLA → mở P3-04
- [ ] I-4 Tệp agent trong bản giao → mở P3-02
- [ ] I-5 Người nhận cảnh báo → mở P1-04
- [ ] I-6 Ngày mục tiêu
- [ ] I-7 Ngân sách hạ tầng → mở P1-02
- [ ] A-1 Cách làm tròn credit → mở P2-B4

## 12. Bảng theo dõi tiến độ

Trạng thái: ⬜ chưa làm · 🟨 đang làm · 🟦 chờ PO · ✅ xong · ⛔ bị chặn.

| Mã | Trạng thái | PR | Ngày xong | Ghi chú |
|---|---|---|---|---|
| P0-01 | 🟦 | nhánh `Nangcap_kientruc_toanhethong` `c15f2d6c` | | chờ CI + PO |
| P0-02 | 🟦 | `455a48b6` | | cần 4 secret deploy hook (P0-03) trước khi merge |
| P0-03 | ⬜ | — | | [TAY] |
| P0-04 | 🟦 | `cc58a058` | | |
| P0-05 | 🟦 | `3a536cd5` | | PO xác nhận `STORAGE_*` trên Render trước khi merge |
| P0-06 | 🟦 | `33ceb37d` | | |
| P0-07 | 🟦 | — | | không có lỗi có sẵn ngoài P0-01 |
| P0-08 | 🟦 | `5e31cb87` | | |
| P0-09 / S-00 | ⬜ | — | | [TAY] ngày nộp: … |
| P1-01 … P1-07 | ⬜ | | | |
| P2-A1 … A11 | ⬜ | | | |
| P2-B1 … B5 | ⬜ | | | |
| P2-C1 … C10 | ⬜ | | | |
| P2-D1, D2 | ⬜ | | | |
| P2-E1 … E3 | ⬜ | | | |
| P2-F1 … F4 | ⬜ | | | |
| P2-G1, G2, G4 | ⬜ | | | |
| S-02 … S-16 | ⬜ | | | |
| P3-01 … P3-09 | ⬜ | | | |
| M1 · M2 · M3 · M4 | ⬜ | — | | |

Gộp dòng để gọn; khi bắt đầu một nhóm, tách thành từng dòng hạng mục.
