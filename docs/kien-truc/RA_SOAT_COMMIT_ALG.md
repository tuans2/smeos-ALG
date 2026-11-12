# Rà soát từng commit ALG (8c53b38 → nay)

> Trạng thái `SUPPORTING` · chủ sở hữu: Product Owner · bắt đầu 22/10/2026.
> Phạm vi: 134 commit không phải merge trên `main` sau `8c53b38` (17/10/2026) đến `e6d3c566` (22/10/2026).
> Phương pháp: rà theo cụm tính năng, kết luận trên code ở bản cuối; mỗi commit một dòng. Thứ tự theo rủi ro: G → B → H → E → F → K → J → D → C → I → A → L.

## 1. Tiêu chí (mỗi commit)

1. Mục đích rõ, khớp code thật.
2. Nghiệp vụ đúng, có trường hợp biên (tiền, trạng thái, thời gian, trùng lặp, đồng thời).
3. Luồng gọn: không trùng lặp, không code chết, đúng tầng `domain/` → `use-cases/` → `infra/` → route.
4. Cách ly tenant: `organization_id` chỉ từ phiên hoặc token ký; truy cập chéo → 404.
5. Phân quyền theo mã năng lực; route công khai có lý do.
6. Bảo mật: không lộ khoá/dữ liệu cá nhân, giới hạn tần suất, AI qua gateway.
7. Có test cho quy tắc/lỗi đã sửa.
8. CSDL: migration, index, ràng buộc.
9. Giao diện: tiếng Việt, token màu, không mã kỹ thuật, dùng được trên điện thoại.
10. Tài liệu SSOT cập nhật cùng commit.
11. Quy tắc repo: ≤ 350 dòng/tệp, không nợ ESLint mới.

Kết luận: `ĐẠT` · `ĐẠT SAU SỬA` (đã sửa trong đợt rà soát, ghi mã phát hiện) · `THAY THẾ` (commit sau đã làm lại) · `MỞ` (còn phát hiện chưa xử lý) · `CHƯA RÀ`.
Mức phát hiện: **Chặn** (tiền sai, lộ chéo tenant, lỗ bảo mật, mất dữ liệu) · **Cao** (sai luồng nghiệp vụ, thiếu test quy tắc quan trọng) · **Trung bình** (luồng rối, thiếu tài liệu, vi phạm quy tắc repo) · **Thấp**.

## 2. Tiến độ theo cụm

| Cụm | Nội dung | Số commit | Trạng thái |
|---|---|---|---|
| G | Điều phối chuỗi và gia công | 30 | Đã rà — G-SIZE hoãn |
| B | Đăng ký, dùng thử, đăng nhập, duyệt tài khoản | 11 | Đã rà |
| H | AI kiểm ảnh QC/POD | 8 | Đã rà |
| E | Lịch đặt chỗ Homestay | 5 | Đã rà |
| F | Ma trận menu ngành, Console vận hành | 7 | Đã rà |
| K | Sức khoẻ hệ thống, giám sát, worker | 6 | Đã rà |
| J | Seed, dữ liệu mẫu, script tài khoản | 6 | Đã rà |
| D | Sửa schema | 6 | Đã rà (migrate diff sạch) |
| C | Hạ tầng, CI, deploy, thư viện | 20 | Đã rà |
| I | Thông báo nhân viên | 2 | Đã rà |
| A | Nền đa ngành | 23 | Đã rà — nợ A-TERM (ratchet) |
| L | Tài liệu, token giao diện, kiến trúc, test | 10 | Đã rà |

## 3. Checklist từng commit

### Cụm G — Điều phối chuỗi và gia công

| Commit | Ngày | Nội dung | Kết luận | Phát hiện |
|---|---|---|---|---|
| `30650f12` | 10-19 | feat(org,order): tach quy trinh 1 cua hang vs chuoi & hoan thien luong xac nhan don 2 buoc | ĐẠT SAU SỬA | G-MODE, G-CANCEL |
| `3f775904` | 10-19 | feat(chain-dispatch): he thong dieu phoi gia cong tu dong cho chuoi cua hang | MỞ | G-SEC3, G-LOCK, G-COMMIT, G-SIZE |
| `670f03c2` | 10-19 | feat(dispatch): tich hop Telegram Bot va tu dong quet chat id chi nhanh | ĐẠT SAU SỬA | G-SEC1 |
| `8da0cc1c` | 10-19 | feat(chain): them tab nhap danh sach cua hang chuoi tu Excel + template mau 14 truong | ĐẠT SAU SỬA | G-IMPORT |
| `4dcbf30f` | 10-19 | feat(chain-dispatch): hoàn thiện quy trình cung cấp thông tin shipper và cơ chế leo thang 3 cấp độ | ĐẠT SAU SỬA | G-LOCK |
| `c01579a5` | 10-19 | feat(gate2): implement Dual-Stream + First-Wins Mutex + Link-Only for Gate 2 | ĐẠT SAU SỬA | G-LOCK, G-PHOTO |
| `55f7bc3d` | 10-19 | test(gate2): add unit tests for cancelSubcontractReminderSteps First-Wins Mutex | ĐẠT |  |
| `1bc6e4cb` | 10-19 | fix(dispatch): support local baseUrl in reminder links for local testing | ĐẠT SAU SỬA | G-URL |
| `0cdebac2` | 10-20 | feat(dispatch): add native inline buttons and product photo to telegram dispatch notifications | ĐẠT SAU SỬA | G-SEC2 |
| `1848c450` | 10-20 | fix(dispatch): resolve full delivery address from parts and street in subcontract messages | ĐẠT |  |
| `7d49f927` | 10-20 | feat(subcontract): mask recipient phone until QC photo is approved and ready for delivery | ĐẠT SAU SỬA | G-PII |
| `2da98046` | 10-20 | feat(dispatch): add resend notification button for dispatched state in chain panel | ĐẠT SAU SỬA | G-LOCK |
| `def7a3bd` | 10-20 | fix(dispatch): resolve sample photo, clean redundant link in telegram message, filter customer promotion from workshop note | ĐẠT |  |
| `62b29cfc` | 10-20 | feat(greeting-card): implement Single Living Dashboard Card for subcontract Telegram notifications | ĐẠT SAU SỬA | G-CARD |
| `58f6af91` | 10-20 | fix(subcontract): resolve product sample photo from warehouse fallback and attach to live dashboard & detail card | ĐẠT SAU SỬA | G-QC |
| `2a367bc0` | 10-20 | fix(subcontract): fix missing sample product image in telegram and claim card | ĐẠT |  |
| `beef121f` | 10-20 | fix(subcontract-claim-card): add onError fallback for product image to prevent broken image icon | THAY THẾ | G-DEAD |
| `228084a7` | 10-20 | fix(subcontract): auto-confirm order to ASSIGNED on branch commit regardless of existing order status | ĐẠT SAU SỬA | G-LOCK |
| `b6173e91` | 10-20 | fix(subcontract): fix broken sample photo origin and fallback for qc photos | ĐẠT SAU SỬA | G-QC |
| `fa1c6465` | 10-20 | feat(subcontract): redesign subcontract claim page with active block spotlight standard | MỞ | G-UI, G-DEAD, G-SIZE |
| `b65b58bc` | 10-20 | feat(subcontract): add real-time countdown timers and milestone deadlines for spotlight steps | ĐẠT SAU SỬA | G-UI |
| `97a2629e` | 10-20 | feat(subcontract): add force-majeure bypass evidence mechanism with coordinator approval and customer transparency | ĐẠT SAU SỬA | G-LOCK |
| `c3abac12` | 10-20 | fix(coordinator): show bypass banner in kanban view and fallback telegram chatId | ĐẠT |  |
| `cbbc2671` | 10-20 | fix(dispatch): harmonize craft fee to 50% SSOT and persist subcontractPriceVnd | THAY THẾ | G-FEE |
| `a795101f` | 10-21 | fix(subcontract): require signed per-branch links on public subcontract APIs | ĐẠT SAU SỬA | G-PII |
| `24566461` | 10-21 | fix(subcontract-ui): remove synchronous setState inside effects | ĐẠT |  |
| `169ad913` | 10-21 | fix(coordinator): guard subcontract coordinator actions by capability | ĐẠT |  |
| `e0d73308` | 10-21 | fix(telegram): scope the shared dispatch bot to each tenant's own chats | ĐẠT SAU SỬA | G-SEC1 |
| `f598dec1` | 10-21 | fix(subcontract): shorten photo URL lifetime and stop trusting Host | ĐẠT SAU SỬA | G-URL |
| `3ae29cf3` | 10-22 | feat(greeting-card): move chain_branches from org settings to its own table | ĐẠT SAU SỬA | G-IMPORT |

### Cụm B — Đăng ký, dùng thử, đăng nhập, duyệt tài khoản

| Commit | Ngày | Nội dung | Kết luận | Phát hiện |
|---|---|---|---|---|
| `484a180f` | 10-17 | feat(org): add industry selection support to tenant sign-up onboarding | ĐẠT SAU SỬA | B-IND |
| `2fc3cc70` | 10-17 | feat(auth, settings): add industry selection in onboarding and enforce paid unlock in store settings | ĐẠT SAU SỬA | B-IND |
| `4c14bddd` | 10-17 | feat(auth): nâng cấp form đăng ký chọn ngành nghề trực quan và khởi tạo hồ sơ chuẩn theo ngành | ĐẠT SAU SỬA | B-IND |
| `ab5768a4` | 10-17 | feat(ui): thêm thanh chuyển đổi Đăng nhập / Đăng ký trực tiếp tại màn hình auth | ĐẠT |  |
| `7a8aa652` | 10-17 | feat(auth): thêm cơ chế Trải nghiệm ngay (Instant Sandbox Trial) không cần mật khẩu kèm thu thập Lead | ĐẠT SAU SỬA | B-LEN, B-ARCH |
| `033b35dc` | 10-17 | test(arch): đăng ký auth/instant-trial vào NO_CAPABILITY_GUARD | ĐẠT |  |
| `9edc0ce6` | 10-21 | fix(auth): stop instant trial from issuing sessions for existing accounts | ĐẠT |  |
| `7a43a59b` | 10-21 | fix(sso): keep reading the legacy floraos_sso cookie during the rename | ĐẠT |  |
| `af790c20` | 10-21 | fix(signup): record a pending chain request instead of granting CHAIN | ĐẠT |  |
| `6f6e3f1e` | 10-22 | feat(auth): require superadmin approval for every self-registered account | ĐẠT SAU SỬA | B-RATE |
| `af809424` | 10-22 | fix(platform): load the registration queue without setState in an effect body | ĐẠT |  |

### Cụm H — AI kiểm ảnh QC/POD

| Commit | Ngày | Nội dung | Kết luận | Phát hiện |
|---|---|---|---|---|
| `ef991368` | 10-17 | feat(ai): establish multi-industry SSOT architecture for vision worker, market intelligence, and studio prompts | ĐẠT |  |
| `85d5f912` | 10-17 | feat(backend): add Pillar 5 to validate AI Prompts and JSON Schemas for multi-industry SSOT | ĐẠT |  |
| `a48852cb` | 10-19 | feat(qc): AI Vision verify ảnh thành phẩm cho cả 2 luồng điều phối + gia công | ĐẠT SAU SỬA | H-IND, H-SKIP |
| `9f2cd27e` | 10-20 | feat(qc-ai): enforce strict AI Vision cross-checking of QC photo against original sample photo | ĐẠT SAU SỬA | H-IND, H-INJ |
| `93847564` | 10-20 | feat(subcontract): tich hop AI kiem dinh anh giao hang POD va bo unit test cho QC/POD | ĐẠT SAU SỬA | H-INJ |
| `2418d62d` | 10-20 | fix(qc): enforce strict ai vision comparison for subcontract qc photos and eliminate blind auto-pass | ĐẠT |  |
| `7b86fddf` | 10-20 | fix(qc-ai): remove random sample photo fallback and enforce high-detail visual matching | ĐẠT SAU SỬA | H-SSRF |
| `0a509973` | 10-21 | fix(ai): route QC and delivery photo checks through the AI gateway | ĐẠT SAU SỬA | H-SSRF |

### Cụm E — Lịch đặt chỗ Homestay

| Commit | Ngày | Nội dung | Kết luận | Phát hiện |
|---|---|---|---|---|
| `e684cdfb` | 10-18 | feat(availability): implement multi-industry product availability module and real-time greeting card integration | ĐẠT SAU SỬA | E-IND |
| `e2357891` | 10-18 | feat(availability): hoan thien luong dat phong Homestay, tu dong khoa lich va popup chi tiet booking | ĐẠT SAU SỬA | E-IND |
| `6f9bd39a` | 10-21 | fix(availability): reject manual blocks on another organization's product | ĐẠT |  |
| `28e915b1` | 10-21 | fix(availability): prevent double booking of the same room | ĐẠT |  |
| `85a4db6e` | 10-22 | fix(availability): type product_bookings dates, status and order link | ĐẠT |  |

### Cụm F — Ma trận menu ngành, Console vận hành

| Commit | Ngày | Nội dung | Kết luận | Phát hiện |
|---|---|---|---|---|
| `d62aab60` | 10-17 | feat(org): unlock multi-industry switching for tuans2@dev.com and dev accounts | THAY THẾ | F-SU |
| `ba6dcffb` | 10-18 | feat(navigation): kien truc ma tran dieu huong da nganh master matrix va console van hanh saas admin | ĐẠT SAU SỬA | F-CAP |
| `039565c6` | 10-21 | feat(platform): thêm lối tắt Console Vận hành cho Super Admin và cập nhật ghi đè ma trận ngành | ĐẠT SAU SỬA | F-PII |
| `160d8251` | 10-21 | fix(platform): require platform capabilities for SaaS channel policy and nav matrix | ĐẠT |  |
| `8cdecbf1` | 10-21 | test(nav): decouple navigation rule tests from operator override data | ĐẠT |  |
| `df1b9630` | 10-21 | fix(org): enforce the industry lock on the server, drop email superusers | ĐẠT |  |
| `4ca5eafa` | 10-22 | fix(platform): store the industry nav matrix in the database so it takes effect | ĐẠT |  |

### Cụm K — Sức khoẻ hệ thống, giám sát, worker

| Commit | Ngày | Nội dung | Kết luận | Phát hiện |
|---|---|---|---|---|
| `5506c701` | 10-20 | chore(health): return db connectivity status and commit version in health endpoint | THAY THẾ | K-LEAK |
| `08994a17` | 10-20 | chore(health): expose error details and masked db target host in health endpoint | THAY THẾ | K-LEAK |
| `4f9a4fac` | 10-20 | fix(workers): lazy load openai client and add resilient reconnect loop to media worker | ĐẠT |  |
| `da210518` | 10-21 | fix(health): stop leaking database details from the public health check | ĐẠT |  |
| `173d8a10` | 10-21 | fix(cron): fail closed when CRON_SECRET is missing in production | ĐẠT |  |
| `963b4308` | 10-22 | feat(observability): log unhandled server errors and alert on degraded health | ĐẠT |  |

### Cụm J — Seed, dữ liệu mẫu, script tài khoản

| Commit | Ngày | Nội dung | Kết luận | Phát hiện |
|---|---|---|---|---|
| `5d18ecc2` | 10-19 | feat(profile): allow seeding industry-specific mock data on industry selection for SuperAdmin | THAY THẾ | J-MOCK |
| `0943f8f8` | 10-20 | feat(auth): sync tuans2@dev.com superuser in sync-siin-store seed for prod | ĐẠT SAU SỬA | F-SEED |
| `6a8ad623` | 10-21 | fix(seed): stop resetting hardcoded passwords on production deploys | ĐẠT SAU SỬA | F-SEED |
| `72fe6167` | 10-21 | fix(profiles): allow sample data only for trial organizations | ĐẠT SAU SỬA | J-KEY |
| `24447cf0` | 10-22 | feat(platform): script to delete all accounts but one superadmin | ĐẠT |  |
| `8a415d77` | 10-22 | feat(platform): script to create two QA accounts in a dedicated organization | ĐẠT |  |

### Cụm D — Sửa schema

| Commit | Ngày | Nội dung | Kết luận | Phát hiện |
|---|---|---|---|---|
| `7c78c075` | 10-20 | fix(org): provide id when creating roles in RoleRepository | ĐẠT |  |
| `87dd0bde` | 10-20 | fix(org): provide id when creating role_capabilities in CapabilityRepository | ĐẠT |  |
| `9f5a35cd` | 10-20 | fix(schema): add @updatedAt to all required updated_at DateTime fields to auto-generate in seed/upsert | ĐẠT |  |
| `7eee8117` | 10-20 | fix(schema): add @default(uuid()) to ai_models.id | ĐẠT |  |
| `430357b7` | 10-20 | fix(schema): restore @default(uuid()) to all 88 model id fields | ĐẠT |  |
| `592cb60d` | 10-20 | fix(schema): restore complete schema with relations and default uuids | ĐẠT |  |

### Cụm C — Hạ tầng, CI, deploy, thư viện

| Commit | Ngày | Nội dung | Kết luận | Phát hiện |
|---|---|---|---|---|
| `c155dc77` | 10-17 | chore(infra): isolate PostgreSQL port to 5433 and volume to smeos-db-data | ĐẠT |  |
| `e8a75d28` | 10-17 | chore(test): isolate test database connection to port 5433 and smeos_test | ĐẠT |  |
| `dce775e0` | 10-17 | chore(infra): isolate Render production blueprint (smeos-postgres, smeos-redis, smeos services) | ĐẠT SAU SỬA | C-ENV |
| `e9833b11` | 10-17 | chore(isolation): change web port to 3200 and cookies to smeos_session/smeos_sso | ĐẠT |  |
| `a2ed281e` | 10-17 | chore(isolation): purge legacy floraos database fallbacks in workers | ĐẠT |  |
| `7e8ee445` | 10-20 | fix(ci): update eslint baseline and fix playwright port to 3200 | ĐẠT |  |
| `e12e5e1f` | 10-20 | fix(render): comment out Redis keyvalue — free tier limit reached on account | THAY THẾ |  |
| `1d9f3c24` | 10-20 | feat(render): add TELEGRAM_DISPATCH_BOT_TOKEN and TELEGRAM_STAFF_BOT_TOKEN to render.yaml | ĐẠT |  |
| `6e03b338` | 10-21 | ci: point tenant and platform isolation gates at the CI test database | ĐẠT |  |
| `1e1613b0` | 10-21 | chore(render): schedule the dispatch sweep, add CRON_SECRET and Redis | ĐẠT |  |
| `57617ad2` | 10-22 | feat(db): deploy with prisma migrate deploy instead of db push --accept-data-loss | ĐẠT |  |
| `4b6a96ff` | 10-22 | ci(security): scan secrets, audit dependencies, add CodeQL and Dependabot | ĐẠT |  |
| `a8f03e45` | 10-22 | fix(deps): clear all high vulnerabilities in production dependencies | ĐẠT |  |
| `98d09ef6` | 10-22 | ci(dependabot): skip semver-major version updates | ĐẠT |  |
| `ea242c04` | 10-22 | chore(deps): bump the npm-minor-patch group across 1 directory with 18 updates | ĐẠT |  |
| `6ae6271f` | 10-22 | chore(deps): update pytest requirement from >=8.0 to >=9.1.1 in /workers (#9) | ĐẠT |  |
| `a75b19cc` | 10-22 | chore(deps): update onnxruntime requirement in /workers (#10) | ĐẠT |  |
| `f912ce25` | 10-22 | chore(deps): update pillow requirement in /workers (#11) | ĐẠT |  |
| `bee89a96` | 10-22 | chore(deps): upgrade vitest to 5 and @types/node to 22 | ĐẠT |  |
| `13da4998` | 10-22 | chore(deps): update pydantic requirement in /workers (#12) | ĐẠT |  |

### Cụm I — Thông báo nhân viên

| Commit | Ngày | Nội dung | Kết luận | Phát hiện |
|---|---|---|---|---|
| `c281d3ff` | 10-18 | feat(greeting-card): he thong staff notification matrix da vai, da kenh va da nganh | ĐẠT |  |
| `82fa0081` | 10-21 | fix(notify): time out staff channel calls and report undelivered invites | ĐẠT |  |

### Cụm A — Nền đa ngành

| Commit | Ngày | Nội dung | Kết luận | Phát hiện |
|---|---|---|---|---|
| `f85dd856` | 10-17 | feat(org): implement IndustryProfile domain and i18n industry terminology support | ĐẠT | A-TERM |
| `17384c4c` | 10-17 | feat(products): generalize Product BOM for multi-industry components support | ĐẠT | A-TERM |
| `da9855a0` | 10-17 | feat(media): generalize Studio Prompt Compiler and ProductPassport for multi-industry catalog | ĐẠT | A-TERM |
| `bba3fa2c` | 10-17 | feat(org): generalize Role UX titles and groups for multi-industry adaptation | ĐẠT | A-TERM |
| `0db182db` | 10-17 | feat: bổ sung giao diện chọn/xem ngành nghề kinh doanh và chuẩn hóa nhãn đa ngành tại hồ sơ cửa hàng | ĐẠT SAU SỬA | A-TERM, A-SET |
| `dd84a7c5` | 10-17 | feat(domain): thiết lập kiến trúc SSOT IndustryPluginContract và chuẩn hóa 6 ngành kinh doanh | ĐẠT | A-TERM |
| `fc9810cc` | 10-17 | feat(roadmap): lộ trình triển khai 95 ngành nghề — 20 ACTIVE, 75 COMING_SOON + nợ TD-INDUSTRY | THAY THẾ |  |
| `d40ccf0a` | 10-17 | feat(ui): adapt order detail modal and production ticket dynamically for fashion and multi-industry | ĐẠT | A-TERM |
| `330cdffd` | 10-17 | feat(ui): adapt journey home cards, spotlight card, and navigation dynamically to industry SSOT | ĐẠT | A-TERM |
| `bdd7da65` | 10-17 | feat(ui): adapt product creation, quotation, dashboard and coordinator cards to industry SSOT terminology | ĐẠT | A-TERM |
| `986b378f` | 10-17 | feat(industry): add automated SSOT checker, new-industry wizard, ratchet audit, and git pre-commit hook | ĐẠT | A-TERM |
| `3a777ad6` | 10-17 | feat(ui): adapt product catalog list, categories, and search filter to industry SSOT | ĐẠT | A-TERM |
| `ac26e8e1` | 10-17 | feat(ui): adapt product creation page and cards to dynamic industry SSOT | ĐẠT | A-TERM |
| `50a26567` | 10-17 | feat(ui): adapt greeting card catalog and journey cards to dynamic industry SSOT | ĐẠT | A-TERM |
| `68bb32d1` | 10-17 | refactor(industry): adapt app pages and catalog components to industry plugin contract | ĐẠT SAU SỬA | A-TERM, A-IMG |
| `43a1f1a7` | 10-18 | feat(industry): thêm ngành HOMESTAY & chuẩn hoá UI đa ngành | ĐẠT | A-TERM |
| `12aaf9d0` | 10-18 | feat(the-chao): implement active block spotlight, numbered step badges and multi-industry preview | ĐẠT | A-TERM |
| `7b6d19ca` | 10-18 | feat(products): phân tầng dữ liệu BOM cam kết giao kèo vs AI marketing | ĐẠT | A-TERM |
| `4dba1277` | 10-18 | feat(greeting-card): chuẩn hóa form đặt hàng đa ngành & thẻ chào chuyên biệt theo ngành | ĐẠT | A-TERM |
| `07e88f56` | 10-18 | feat(industry-order): standardize florist-job-tab & customer-slip with SSOT order terms | ĐẠT | A-TERM |
| `38c498d4` | 10-18 | feat(multi-industry): chuẩn hóa tab Bán hàng, Điều phối, Điều hành theo SSOT đa ngành | ĐẠT | A-TERM |
| `ef903f96` | 10-19 | feat(tracking): chuẩn hóa tab Theo dõi đơn theo SSOT đa ngành | ĐẠT | A-TERM |
| `dad881d7` | 10-22 | chore(industry): delete unused industry roadmap data file | ĐẠT | A-TERM |

### Cụm L — Tài liệu, token giao diện, kiến trúc, test

| Commit | Ngày | Nội dung | Kết luận | Phát hiện |
|---|---|---|---|---|
| `24078f51` | 10-17 | docs: cập nhật quy chuẩn tạo ngành mới theo Industry Plugin SSOT vào AGENTS.md | ĐẠT |  |
| `2d856ab2` | 10-19 | docs: formalize Dual-Stream + First-Wins Mutex architecture in AGENTS.md | ĐẠT |  |
| `a4a6d654` | 10-20 | docs(agents): add Single Living Dashboard Card as mandatory external integration standard (PO 20/10/2026) | ĐẠT SAU SỬA | G-CARD |
| `4dff7257` | 10-21 | test: align stale expectations with multi-industry behaviour | ĐẠT |  |
| `bd5e97d3` | 10-21 | docs(spec): document routes and tables added since the ALG switch | ĐẠT |  |
| `475831a0` | 10-21 | fix(ui): replace raw colors and ad-hoc font sizes with semantic tokens | ĐẠT |  |
| `30a6eacf` | 10-21 | refactor(arch): move direct Prisma access out of routes and use-cases | ĐẠT |  |
| `26e61a49` | 10-21 | fix(ui): show the ALG product name instead of ALG | ĐẠT SAU SỬA | L-NAME |
| `62fdaac2` | 10-22 | docs(handover): add handover index and backup, monitoring and incident runbook | ĐẠT |  |
| `e6d3c566` | 10-22 | docs(handover): reflect PO decision to keep Siin Store accounts | ĐẠT |  |

## 4. Phát hiện

| Mã | Mức | Vị trí | Vấn đề | Xử lý |
|---|---|---|---|---|
| A-SET | Trung bình | `GET /auth/me` (`describe-session.ts`) | Trả nguyên `organizations.settings` cho mọi thành viên, kể cả vai Sale: SĐT và chat id Điều phối, chính sách phí gia công. Giao diện không dùng | Chỉ trả `industry`, `industry_locked`, `pending_model_change`; test `tests/tenant/auth-me-settings.test.ts` |
| J-KEY | Trung bình | `POST /business-profile/mock-data` | `industry_key` bất kỳ được ghi vào `settings.industry` (cùng lỗi B-IND) | `isKnownIndustryKey`, sai → 400; thêm ca vào `mock-data-trial-only.test.ts` |
| A-IMG | Thấp | `POST /market-intelligence/product-intelligence` | Ảnh mặc định `/images/sample-product.jpg` không tồn tại | Để trống như bản lưu DB |
| L-NAME | Thấp | Tệp tải về | Tên tệp còn "ALG" (mẫu Excel nhập kho, ảnh thẻ sản phẩm kèm mã "T02") | Đổi sang `smeOS_…`, cập nhật tài liệu |
| C-LRU | Thấp | `render.yaml` Redis `allkeys-lru` | Khi đầy bộ nhớ, khoá giới hạn tần suất có thể bị đẩy ra → giới hạn lỏng tạm thời | Ghi nhận; đổi chính sách cần PO duyệt (render.yaml) |
| J-TX | Thấp | `account-cleanup.ts`, `qa-accounts.ts` | Cấp mã N / tạo nhân viên nằm ngoài giao dịch xoá / tạo chủ tiệm — lỗi giữa chừng thì chạy lại (đã có kiểm trước) | Ghi nhận; script chạy tay một lần, có chế độ xem trước |
| G-SLOT | Cao | `internal/chain-dispatch-sweep` | Sweep tự đọc giờ giao bằng regex riêng: lấy ĐẦU khung giờ (thẻ chi nhánh, đếm ngược, khấu trừ trễ dùng CUỐI khung), và bỏ qua hẳn đơn có khung dạng chữ ("Trước 12h") — đơn đó không được nhắc mốc nào | Dùng chung `parseDeliveryTimestampMs`; test tenant cho sweep (tự chốt hết hạn huỷ nhận, chạy lại không chốt lần hai) |
| A-TERM | Thấp | Giao diện | Còn 913 chỗ thuật ngữ ngành hoa viết cứng (`npm run audit:industry`) | Nợ có ratchet — không được tăng, giảm dần; `check:industry` 5/5 trụ cột đạt |
| C-ENV | Trung bình | `render.yaml` | Biến code đang dùng chưa khai (`sync: false`) nên dễ quên khi bàn giao: `GOONG_API_KEY` (toạ độ điều phối chuỗi — thiếu thì xếp hạng theo khu vực), `ZALO_OA_APP_ID/APP_SECRET/REFRESH_TOKEN/WEBHOOK_SECRET/FOLLOW_URL` (Zalo OA). Không có giá trị bí mật nào trong file | PO duyệt 22/10/2026 — đã khai (`sync: false`, không có giá trị) |
| J-MOCK | Cao | Nạp dữ liệu mẫu theo ngành | Tiệm thật nạp được dữ liệu mẫu đè hồ sơ | Đã thay bằng `72fe6167`: chỉ tổ chức dùng thử |
| K-LEAK | Cao | `GET /api/health` | Health công khai trả host CSDL đã che, chi tiết lỗi, phiên bản | Đã thay bằng `da210518`: chỉ trạng thái; chi tiết vào log và `/internal/health` có khoá |
| F-SU | Chặn | Đổi ngành | Mở khoá đổi ngành theo email cố định của tài khoản dev | Đã thay bằng mã năng lực nền tảng N1/N12 (`df1b9630`); không còn email đặc quyền trong code |
| F-CAP | Cao | Route `/platform/*` | Ma trận menu, chính sách kênh từng chỉ cần phiên nền tảng | Mọi route kiểm N1/N12/N13 (route hoặc use-case) — đã đối chiếu toàn bộ 15 route |
| F-SEED | Cao | `prisma/seed/sync-siin-store.ts` | Seed (sau cờ `SEED_DEV_DATA`) đặt lại mật khẩu tài khoản Điều hành/superadmin về giá trị công khai trong repo mỗi lần chạy; mật khẩu ghi cả trong comment | Chỉ đặt mật khẩu khi tạo mới, bỏ khỏi comment. Vẫn cần đổi mật khẩu các tài khoản này (HO_SO_BAN_GIAO) |
| F-PII | Thấp | `connect-account-modal.tsx` | Placeholder là email cá nhân thật | Đổi thành email mẫu |
| E-IND | Trung bình | `check-product-availability.ts` (route kiểm khả dụng công khai) | `industryKey` client gửi ghi đè ngành của tiệm → đổi được chế độ khả dụng mặc định, phòng đã đặt hiện "còn trống" (đặt đơn vẫn bị chặn ở máy chủ) | Luôn dùng ngành của tiệm |
| H-SSRF | Chặn | `run-photo-match.ts` `loadImageForAi` | Máy chủ tải mọi URL http(s) — kể cả địa chỉ nội bộ/metadata đám mây — khi URL ảnh mẫu do tiệm nhập (`attributes.imageUrl`); theo chuyển hướng, không giới hạn dung lượng | Chỉ https công khai (`lib/safe-remote-url.ts`, dùng chung với Telegram), `redirect: "error"`, tối đa 8 MB |
| H-IND | Cao | `verify-qc-photo-ai.ts` | Prompt kiểm ảnh thành phẩm chỉ nói về loài hoa — ngành khác bị chấm sai | Prompt theo ngành của tiệm (tên ngành, ảnh thành phẩm, `aiConfig.visionFocus`) |
| H-INJ | Trung bình | Prompt QC / ảnh giao hàng | Tên sản phẩm chèn thẳng vào prompt | Đưa vào dạng chuỗi JSON, cắt 200 ký tự, ghi rõ là dữ liệu |
| H-SKIP | Trung bình | `update-brochure-order-status.ts` (ảnh thành phẩm luồng 1 cửa hàng) | Không ký/tải được ảnh vừa tải lên → bỏ qua AI và cho qua; còn AI lỗi thì chặn — hai lỗi hạ tầng xử lý ngược nhau | PO 22/10/2026: cho qua kèm ghi chú — AI lỗi (UNCERTAIN) cũng cho qua với ghi chú "AI bỏ qua"; AI xác nhận sai mẫu vẫn chặn |
| B-RATE | Cao | `POST /auth/signup` | Không giới hạn tần suất — mỗi lần gọi tạo một tổ chức (dùng thử đã có 5/giờ) | 20 lần/giờ/IP |
| B-IND | Trung bình | Đăng ký / dùng thử | Mã ngành tuỳ ý được ghi rồi khoá ngành vĩnh viễn | Chỉ nhận mã có trong danh mục ngành (`isKnownIndustryKey`) |
| B-LEN | Trung bình | Đăng ký / dùng thử | Tên, tên tổ chức, email, SĐT không giới hạn độ dài/dạng | zod giới hạn độ dài, SĐT đúng dạng |
| B-ARCH | Thấp | `instant-trial.ts` | Use-case ghi `products` trực tiếp qua `tx: any` (trái luật Prisma chỉ ở infra) | Chuyển sang `organization/infra/sample-product-seeder.ts`, có kiểu |
| G-SEC1 | Chặn | Liên kết Telegram | Bot dùng chung nhận mọi chat id, tổ chức này gửi được vào chat của tổ chức khác | Chỉ gửi tới chat đã chứng minh thuộc tổ chức (`telegram_linked_chat_ids`, khoá do máy chủ ghi) |
| G-SEC2 | Chặn | `telegram-adapter.ts` | Ảnh gửi Telegram đọc file cục bộ / URL nội bộ | Chỉ URL https công khai (`safeRemotePhotoUrl`), bỏ đọc file |
| G-SEC3 | Cao | `renderDispatchMessage` | Giá trị khách nhập chèn thẳng vào HTML tin Telegram | Escape HTML |
| G-PII | Chặn | Route công khai gia công | Chi nhánh chưa nhận đơn vẫn thấy SĐT/ảnh/thông tin người nhận | Chỉ chi nhánh đang làm đơn thấy (`isClaimant`), link ký theo chi nhánh |
| G-URL | Cao | Link ký, ảnh | Link lấy theo header Host, URL ảnh sống lâu | `publicAppUrl()`, ảnh ký 1 giờ, kiểm tiền tố kho theo tổ chức |
| G-QC | Cao | Tải/xoá ảnh QC | Đường dẫn `..`, khoá kho của tổ chức khác, xoá theo chuỗi con | Chặn traversal và khoá lạ, xoá đúng khoá, chỉ trước khi xong |
| G-LOCK | Chặn | Trạng thái gia công | Ghi đè JSON không khoá: duyệt đúp trừ điểm 2 lần, đơn huỷ vẫn sang hoàn tất, "Gửi lại" xoá chi nhánh đang làm | Mọi bước ghi dưới khoá dòng + điều kiện trạng thái đơn (`applyStep`, `updateSubcontractState`) |
| G-IMPORT | Trung bình | Nhập chi nhánh | Không giới hạn số dòng/độ dài, chat id thật trong mẫu | zod giới hạn, 500 dòng, kiểm trùng; bảng `chain_branches` |
| G-CARD | Trung bình | Thẻ Telegram | Một thẻ chung: chi nhánh A nhận thì thẻ của chi nhánh C bị sửa, mang link của A | Thẻ riêng từng chi nhánh (`inviteCards`) |
| G-MODE | Cao | Quy trình Chuỗi / 1 cửa hàng | Tiệm tự bật tắt, gói Nghiêm ngặt biến tiệm 1 cửa hàng thành Chuỗi | Theo `organizations.type` Admin SaaS duyệt; tính năng chuỗi trả 409 cho 1 cửa hàng |
| G-CANCEL | Cao | Từ chối đơn | Gửi SMS "đã huỷ" khi đề xuất mới chờ duyệt; vẫn xác nhận được đơn đang chờ huỷ | SMS khi duyệt; xác nhận/nhận đơn trả 409 khi còn đề xuất |
| G-PHOTO | Cao | Khách duyệt ảnh đơn gia công | Khách không thấy ảnh, mốc chờ lấy nhầm số phút nhắc QC, nhập shipper không chờ | Nối vào luồng duyệt ảnh chung; chặn bước shipper khi còn chờ |
| G-COMMIT | Cao | Hết hạn huỷ nhận | Không tự chốt (logic nằm trong bộ lập lịch không được gọi) | Sweep tự chốt dưới khoá dòng, dùng chung use-case với nút Chốt |
| G-UI | Trung bình | Màn chuỗi/gia công | Hiện mã kỹ thuật "Gate", "M2–M4", "POD", "Grace Period" | Thay bằng tiếng Việt |
| G-DEAD | Thấp | Component | 3 component không dùng, 1 bộ lập lịch không được gọi | Đã xoá |
| G-SIZE | Thấp | `coordinator-subcontract-actions-panel.tsx` (519), `chain-dispatch-panel.tsx` (408), `update-brochure-order-status.ts` (399), `process-dispatch-reminders.ts` (364) | Quá 350 dòng | **Hoãn** — PO 22/10/2026: chưa làm |
| G-FEE | Cao | `chain-dispatch` route, route công khai gia công, 4 màn hình Điều phối | "50%" viết cứng ở 6 chỗ với 3 nền giá khác nhau (tổng gồm VAT, tổng trước VAT, đơn giá); không có sàn/trần, phụ cấp, khấu trừ; không theo ngành | Thay bằng `craft-fee-policy.ts` (6 phương án, dùng chung mọi ngành, ngành khai số khởi điểm), cài đặt "Phí gia công", phí gợi ý do máy chủ tính, khấu trừ giao trễ/khiếu nại mặc định 0% (PO 22/10/2026) |

## 4b. Rà soát lại lần 2 (23/10/2026) — bằng chứng theo cụm

Lần 1 kết luận các cụm A, C, D, I, J, K, L chủ yếu qua cổng kiểm tra và tiêu đề commit. Lần 2 đọc mã thật ở bản cuối của các commit chạm backend, và kiểm tra lại bằng lệnh:

| Cụm | Đã đọc | Bằng chứng |
|---|---|---|
| K | `api/health`, `internal/health`, `core/http/cron-auth.ts`, `observability/*`, `workers/media_ai/jobs/worker.py` | Health công khai chỉ trạng thái; cron so khoá thời gian hằng, thiếu khoá production → đóng; mọi route `internal/*` (2) kiểm khoá; worker backoff ≤ 60s, dừng êm khi SIGTERM. Test `health-route`, `internal-health-route`, `cron-auth`, `system-health`, `request-error` |
| J | `scripts/don-tai-khoan.ts`, `scripts/tao-tai-khoan-test.ts`, `platform/infra/account-cleanup.ts`, `qa-accounts.ts`, `apply-industry-mock-data.ts`, route mock-data | Xem trước mặc định, `--xac-nhan` mới ghi, mật khẩu từ biến môi trường ≥ 12 ký tự; chỉ tổ chức dùng thử. Sửa J-KEY. `tests/platform/account-cleanup`, `qa-accounts`, `tests/tenant/mock-data-trial-only` 7/7 |
| D | `prisma/schema.prisma`, `prisma/migrations` | `migrate deploy` lên CSDL trống rồi `migrate diff --from-config-datasource --to-schema` → migration rỗng (schema khớp migration); mọi cột `id` có giá trị mặc định |
| C | `render.yaml`, `.github/workflows/ci.yml` (web, security, worker), `prisma/seed.ts` | Mọi khoá `sync: false`/`generateValue`, không có giá trị bí mật; seed production không chạm tài khoản (sau `SEED_DEV_DATA`); `npm audit --omit=dev --audit-level=high` → 0 lỗ hổng. Ghi nhận C-LRU |
| I | 2 route staff-notifications, `staff-notification-settings.ts`, repository, 5 adapter kênh | F2 cho tiệm, N2 cho chính sách SaaS; khoá kênh mã hoá (`sealSecret`), GET chỉ trả `hasCredentials`; repository lọc `organization_id`; mọi kênh có giới hạn thời gian (eSMS 8s qua circuit breaker). `tests/platform/saas-policy-guard` |
| A | 6 commit chạm backend (`0db182db`, `68bb32d1`, `12aaf9d0`, `7b6d19ca`, `4dba1277`, `38c498d4`); 17 commit còn lại chỉ giao diện | Ngành lấy từ tổ chức phía máy chủ; AI qua `callCapability`. Sửa A-SET, A-IMG. Giao diện: `lint:ux --check` đạt, `check:industry` 5/5, `audit:industry:check` 913 (ratchet) |
| L | Tài liệu, `30a6eacf`, `26e61a49`, `475831a0` | Không còn import Prisma ngoài `infra/` (grep); `check:docs`, `check:template-ssot` đạt. Sửa L-NAME |

Giới hạn còn lại: giao diện 17 commit cụm A được kiểm bằng công cụ, không mở từng màn trên trình duyệt; xem mục 5.

## 5. Chưa xác minh được

- Kênh thật (Telegram, Zalo, nhà cung cấp AI) và dữ liệu production: chỉ kiểm qua code, test, E2E giả lập.
