# Kế hoạch hoàn thiện kiến trúc CSDL smeOS — Production · Commercial · Enterprise

- Trạng thái: `PROPOSED` — lập 05/11/2026. Chuyển `ACTIVE` khi PO duyệt ADR-012…016 (mục 0).
- Quyết định nền: `docs/adr/ADR-012.md` (mô hình tầng) · `ADR-013.md` (cách ly, toàn vẹn) · `ADR-014.md` (dữ liệu cá nhân) ·
  `ADR-015.md` (vận hành) · `ADR-016.md` (cô lập theo gói).
- Đầu vào: báo cáo "Audit kiến trúc CSDL smeOS 4 tầng" (G1–G17, 05/11/2026) · `docs/audit/architecture-audit/15_PO_DECISION_REGISTER.md`
  · `16_IMPLEMENTATION_PLAN.md` / `18_IMPLEMENTATION_CHECKLIST.md` (các mục P1-01, P1-02, P2-A2…A5, P2-F1…F3, P3-03, P3-09
  được kế hoạch này thay thế hoặc chi tiết hoá — đánh dấu ở cột "Thay").
- Cách giao: mỗi ô checklist một PR (D-42). Mục **[SCHEMA]** cần PO duyệt từng PR (D-29); mục **[VẬN HÀNH]** đổi
  `render.yaml`/gói hạ tầng cần PO duyệt trước (`CLAUDE.md`).

## 1. Định nghĩa "kiến trúc CSDL hoàn thiện"

Chương trình chỉ được báo xong khi **mọi** dòng dưới đây có bằng chứng (đường dẫn test, biên bản, hay lệnh kiểm):

| # | Tiêu chí | Bằng chứng | Khoảng trống |
|---|---|---|---|
| DoD-1 | Cây tổ chức trong CSDL: một bảng chi nhánh, một bảng liên kết tổ chức, một hàm `resolveTierChain`; chỗ cho tầng Ngành | `tests/tenant/tier-consistency.test.ts` xanh; không còn `chain_partnerships`, `chain_branches` | G1, G2 |
| DoD-2 | Một bảng quyết định theo tầng, có lịch sử | Tenant test ma trận + thông báo + tích hợp không đổi kết quả | G3 |
| DoD-3 | RLS bật **chặn thật** trên mọi bảng tenant; 5 tài khoản CSDL; không dịch vụ nào dùng tài khoản chủ | Test "bỏ `scopedWhere` → 0 dòng"; `\du` khớp ADR-013 D-I1 | G4 |
| DoD-4 | Chia sẻ đơn cho đối tác theo tham chiếu, có hạn | Tenant test hết hạn → 404 | G5 |
| DoD-5 | Mọi bảng có trong sổ D-S1; quyết định quản trị và liên hệ/địa chỉ khách không còn nằm trong JSON (tách bảng rộng theo tính năng — ngoài phạm vi, xem mục 5) | Sổ bảng-thuộc-tenant khớp schema trong CI | G6 (một phần) |
| DoD-6 | Một hồ sơ khách mỗi tổ chức; liên hệ khách chỉ ở `customers` + `order_recipients` | Test kiến trúc: không cột liên hệ nào ngoài hai bảng | G7 |
| DoD-7 | Nhật ký bất biến; ghi truy cập của nhân viên nền tảng; ghi nhật ký ở ranh giới route | Test `UPDATE audit_logs` bị từ chối; test kiến trúc ranh giới | G8 |
| DoD-8 | Đối soát số dư hằng đêm, 0 lệch mở quá 7 ngày | Báo cáo `reconciliation_findings` | G9 |
| DoD-9 | Hạn lưu chạy hằng đêm; bảng sự kiện trong ngưỡng ADR-015 D-O6 | Truy vấn kích thước bảng trong biên bản | G10 |
| DoD-10 | Pool, `statement_timeout`, index mọi khoá ngoại | Test CI index FK; cấu hình tài khoản | G11 |
| DoD-11 | Báo cáo không làm p95 request vượt SLO | Biên bản thử tải | G12 |
| DoD-12 | Dữ liệu cá nhân mã hoá cột; xoá/xuất theo yêu cầu chạy được | Dump CSDL không có số điện thoại rõ; tenant test xoá lan sang tổ chức được chia sẻ | G13 |
| DoD-13 | Vùng dữ liệu đã chọn và ghi vào sổ quyết định | D-P7 trong `15_PO_DECISION_REGISTER.md` | G14 |
| DoD-14 | RPO ≤ 15 phút, RTO ≤ 1 giờ có biên bản diễn tập; export ngoài nhà cung cấp 35 ngày | Biên bản quý gần nhất | G15 |
| DoD-15 | Migration ở pre-deploy; CI chặn migration phá dữ liệu | Script expand/contract trong `ci.yml` | G16 |
| DoD-16 | Ba mức cô lập bán được; xuất, nhập, khôi phục riêng một tenant; dựng được một triển khai riêng | Biên bản khôi phục một tenant ≤ 4 giờ; biên bản dựng `DEDICATED` | G17 |
| DoD-17 | Thử tải quy mô mục tiêu đạt SLO | Biên bản ADR-015 D-O7 | — |

## 2. Giai đoạn và phụ thuộc

```
GĐ0 Quyết định ─► GĐ1 Nền nhanh ─► GĐ2 Mô hình tầng ─┬─► GĐ3 Cách ly & toàn vẹn ─┐
                                                      └─► GĐ4 Dữ liệu cá nhân ────┼─► GĐ6 Bật enterprise & chứng minh
                                     GĐ1 ─────────────────► GĐ5 Cô lập theo gói ──┘
```

GĐ3 và GĐ4 chạy song song sau GĐ2. GĐ5 cần sổ bảng (GĐ1) và nhật ký/`smeos_system` (GĐ3). GĐ6 cần tất cả.

## 3. Checklist

Ký hiệu: **[SCHEMA]** đổi schema · **[VẬN HÀNH]** hạ tầng/`render.yaml` · **[PO]** quyết định của PO · **B5** chạm Thẻ chào,
cần test khoá hành vi trước.

### GĐ0 — Quyết định (trước mọi PR)

- [ ] PO duyệt ADR-012 (✓ 06/11/2026), ADR-013 (✓ 06/11/2026), ADR-014, ADR-015, ADR-016 (đổi trạng thái thành `ĐÃ CHỐT`)
- [x] ADR-012 §6: (1) nhượng quyền không xem báo cáo chuỗi — D-53 · (2) không làm công cụ tách chi nhánh — D-54 · (3) `FLOWER_NETWORK` chỉ là nhãn, gộp về `CHAIN` — D-55
- [x] ADR-013 §6: chủ tổ chức xem nhật ký truy cập trong ứng dụng — D-60 (có) · mốc bật RLS chặn thật — D-61 (theo khách enterprise đầu tiên)
- [x] ADR-014 §6: tìm theo 4 số cuối (D-49) · hạn lưu mức thường dùng (D-50) · vùng dữ liệu B (D-51)
- [ ] Kế toán/pháp lý xác nhận bảng hạn lưu D-50 trước khi cam kết với khách
- [x] ADR-015 §6: gói CSDL theo giai đoạn + kênh cảnh báo (D-52)
- [ ] PO duyệt con số chi phí giai đoạn G-a; cho email + nhóm Telegram nhận cảnh báo; xác nhận quy mô thử tải (D-40)
- [ ] ADR-016 §6: gói nào được `SHARED_PLUS` / `DEDICATED`? hạn giữ dữ liệu sau khi khách rời?
- [ ] Ghi mọi câu trả lời vào `15_PO_DECISION_REGISTER.md` (mã D-49 trở đi)

### GĐ1 — Nền nhanh (không đổi mô hình; phần lớn không chạm schema)

| ☐ | Mục | ADR | Thay | Gate thêm |
|---|---|---|---|---|
| [x] | O-1 [SCHEMA] Index cột con của 34 khoá ngoại + test CI "FK phải có index" (làm 61 khoá: gồm cả khoá cũ thiếu index — PR #135) | 015 | P2-F3 (một phần) | `migrate diff` sạch |
| [x] | O-2 Khai `max` pool từng dịch vụ (web, 3 worker, cron) | 015 | — | Bảng tổng kết nối trong runbook — PR #135 |
| [ ] | O-3 [VẬN HÀNH] Nâng gói CSDL (I-7) + `pg_stat_statements` + cảnh báo D-O8 | 015 | P1-02 | Cảnh báo thử tới người nhận I-5 |
| [x] | O-4 [VẬN HÀNH] Migration ở pre-deploy; production chỉ seed hệ thống | 015 | P1-01 | Build không chạm CSDL — PR #135; còn: export nhanh trước migration (cùng O-6) |
| [x] | O-5 Script CI kiểm expand/contract trên `migration.sql` mới | 015 | — | Ca thử: `DROP COLUMN` không chú thích → đỏ — PR #135 |
| [ ] | O-6 [VẬN HÀNH] Export đêm ra kho ngoài nhà cung cấp, giữ 35 ngày + 12 tháng | 015 | — | 7 bản liên tiếp |
| [ ] | O-7 [VẬN HÀNH] Diễn tập PITR lần đầu + biên bản | 015 | P1-02 | RTO đo được ≤ 1 giờ |
| [ ] | Dọn khoá `NOT VALID` còn sót của PR #127 (`VAN_HANH_CAP_NHAT_CSDL.md` §7) | 015 | — | 0 dòng `NOT convalidated` |
| [x] | S-1 Sổ bảng-thuộc-tenant sinh từ schema; `TENANT_TABLES` đọc sổ | 016 | — | `check:docs` + test sổ khớp schema — PR #135 |
| [x] | P-1 Nhãn `@pii` + `pii-registry` + test CI | 014 | — | Cột cá nhân không nhãn → đỏ |
| [x] | T-1 `resolveTierChain` trên bảng hiện tại; thay 4 bản tra chuỗi cha (CRUD quan hệ, kiểm liên kết, danh sách đối tác chuyển ở T-3) | 012 | P2-A2 (phần hàm) | Tenant test khoá công cụ, ma trận, thông báo — PR #135 |
| [x] | I-3 Job đối soát `paid_vnd` (PR #135); `credit_balance` để sau P2-B5 vì chưa có sổ nạp credit | 013 | — | Tenant test dữ liệu lệch được phát hiện |

### GĐ2 — Mô hình tầng (ADR-012)

| ☐ | Mục | Thay | Gate thêm |
|---|---|---|---|
| [x] | T-2 [SCHEMA] `organization_links` + backfill + ghi kép + `is_primary` (giữ bằng trigger ràng buộc — Prisma không khai được index riêng phần) | P2-A2 | Tenant test đối tác hai chuỗi: cạnh chính đúng, tạm ngưng thì chuyển — `tests/tenant/organization-links-sync.test.ts` |
| [x] | T-3a Mọi đọc sang `organization_links` (lọc cạnh chuỗi); bỏ `BRANCH` ở API; ghi kép giữ để quay lui được | P2-A2 | `test:tenant`, `test:platform` |
| [x] | T-3b [SCHEMA] Ghi thẳng `organization_links`; contract: xoá `chain_partnerships` — PO duyệt 06/11/2026 (trang đối tác, chat nội bộ còn khoá "Sắp ra mắt" trên production; migration có chốt dừng khi dữ liệu chưa khớp) | P2-A2 | `test:tenant`, `test:platform`; `check:migrations` (`-- contract:`) |
| [x] | T-4a [SCHEMA] **B5** Thêm cột điều phối vào `branches`, chép `chain_branches` (D-57), `memberships.branch_id` (D-56), `orders.branch_id` cho đơn đã nhận; ghi kép | P2-A3 | Giá theo chi nhánh, `/cua-hang`, điều phối không đổi; `tests/tenant/branches-merge.test.ts` |
| [x] | T-4b Mọi đọc chi nhánh điều phối / trang cửa hàng sang `branches` (`accepts_dispatch`, `memberships.branch_id`) | P2-A3 | Như trên |
| [x] | T-4c [SCHEMA] Ghi thẳng `branches`; contract: xoá `chain_branches`, `memberships.chain_branch_code` (PO duyệt 06/11/2026; migration có chốt dừng khi dữ liệu chưa khớp) | P2-A3 | `check:migrations` (`-- contract:`) |
| [x] | T-5 `grants` có phạm vi trong `TenantContext` (`branchScopeFor`); đợt 1: `customers.branch_id` (D-58), khách lọc theo chi nhánh khi tổ chức bật cờ `branch_scope.wave1` (D-59); đơn, điều phối đã lọc từ trước | P2-A4, P2-A5 | `tests/tenant/branch-scope-customers.test.ts` |
| [x] | T-5b Phạm vi chi nhánh đợt 2 (sản phẩm/giá, kho, báo cáo) và đợt 3: vá đường ghi + tra theo id (sản phẩm, thùng rác, nhập Excel, quy tắc giá); đợt 3 không còn bảng mang `branch_id` chưa lọc | P2-A5 | `tests/tenant/branch-scope-products.test.ts` |
| [x] | T-6a [SCHEMA nhỏ] `industries` (seed 7 ngành plugin) + `organizations.industry_key` (khoá ngoại), chép từ `settings.industry`, trigger đồng bộ; `resolveTierChain` đọc cột | P2-A1 (xem ghi chú) | `npm run check:industry`; `tests/tenant/industries.test.ts` |
| [x] | T-6b Ngành đọc từ cột ở `OrganizationRepository` + `getShopProfile` (`withIndustryKey`); khoá phạm vi dạng `platform · industry: · org: · branch:` (`notification_hard_locks`, `integration_governance`) — các `select` lồng còn lại liệt kê ở đặc tả 07 §43 | P2-A1 | Ma trận thông báo, tích hợp không đổi kết quả; `tests/tenant/scope-keys.test.ts` |
| [x] | T-6c-1 Đọc ngành từ cột ở mọi `select` lồng, ghi settings tách `industry` ra cột `industry_key` (đặc tả 07 §43) | — | `organization-industry-read.test.ts`, `industries.test.ts` |
| [x] | T-6c-2 [SCHEMA] Contract: xoá `settings.industry` còn lại, bỏ trigger đồng bộ và dự phòng đọc settings (PO duyệt 06/11/2026, sau khi #161 đã chạy trên production; migration `20261106110000_industry_contract`, đặc tả 07 §43) | — | `check:migrations`; `industries.test.ts` |
| [x] | T-7a [SCHEMA] `governance_decisions` + chép từ ba nơi lưu + ghi kép cùng giao dịch; chặn ghi thẳng `settings.governance_matrix` qua PATCH (PO duyệt 06/11/2026; đặc tả 07 §45) | — | `tests/tenant/governance-decisions.test.ts` (bảng mới khớp nơi lưu cũ); `check:migrations` |
| [x] | T-7b Chuyển đọc ma trận (kể cả quyết định riêng của tiệm ở luồng Thẻ chào), thông báo, tích hợp sang `governance_decisions`; nơi lưu cũ chỉ còn ghi kép (đặc tả 07 §45). Gộp sau khi T-7a (#162) đã chạy trên production | — | `governance-decisions-read.test.ts`, `tier-consistency.test.ts`, ma trận, thông báo, tích hợp không đổi kết quả |
| [x] | T-7c [SCHEMA] Contract: bỏ `settings.governance_matrix`, khoá `governance_matrix:*` của `platform_settings`, `notification_hard_locks`, `notification_event_visibility`, `integration_governance` (PO duyệt 06/11/2026 sau khi #165 chạy ổn; migration `20261106120000_governance_decisions_contract` chốt đối chiếu trước khi xoá; đặc tả 07 §45) | — | `check:migrations` (`-- contract:`); `governance-decisions.test.ts` |
| [x] | T-8a Đổi dữ liệu `organization_type.FLOWER_NETWORK` → `CHAIN` (kể cả yêu cầu đổi mô hình đang chờ); mọi đường ghi lưu `CHAIN` (D-55) | — | Chuỗi cũ loại `FLOWER_NETWORK` vẫn vào đúng ChainOS |
| [x] | T-8b [SCHEMA] Contract: bỏ giá trị enum `FLOWER_NETWORK` và các nhánh so loại tổ chức này (PO duyệt 06/11/2026) | — | `check:migrations`; tier-of, điều hướng, ma trận không đổi kết quả |
| [x] | `tests/tenant/tier-consistency.test.ts`: mỗi trục × Mẹ / Chuỗi / Cửa hàng (danh tính tầng + chuỗi cha, ma trận, tích hợp, thông báo, khoá công cụ + điều hướng). Vá kèm: khoá cứng thông báo của chuỗi nay áp xuống cửa hàng đối tác (PO 06/11/2026, chỉ khoá — chính sách tổ chức giữ nguyên) | P2-A11 | Xanh trong CI |

Ghi chú P2-A1 (Ngành chỉ là plugin, D-01): vẫn gỡ phần **mô phỏng** tầng Ngành đang không có dữ liệu; tầng Ngành quay
lại có chủ đích qua T-6 và ADR affiliate sau này (D-48).

### GĐ3 — Cách ly và toàn vẹn (ADR-013)

| ☐ | Mục | Gate thêm |
|---|---|---|
| [ ] | I-1 [VẬN HÀNH] 5 tài khoản CSDL; mỗi dịch vụ một chuỗi kết nối | Không dịch vụ nào dùng tài khoản chủ |
| [ ] | O-8 [VẬN HÀNH] `statement_timeout`, `idle_in_transaction_session_timeout` theo tài khoản | Truy vấn 20 s bị huỷ ở `smeos_app` |
| [x] | I-2a [SCHEMA] Nhật ký bất biến (trigger trên `audit_logs`, `platform_audit_logs`, `order_events`, `job_events`, `usage`) + đường xoá `app.purge_reason` (`setPurgeReason`); thu quyền UPDATE/DELETE ở `create-roles.sql` (đặc tả 07 §46) | `tests/tenant/append-only-logs.test.ts`: `UPDATE audit_logs` bị từ chối; xoá ngoài đường purge bị từ chối |
| [x] | I-2b [SCHEMA] `platform_access_logs` (D-I5) + ghi mỗi lần nhân viên nền tảng truy cập dữ liệu một tổ chức (16 handler Console) + tab "Truy cập của nền tảng" trong `/audit` cho chủ tổ chức (D-60, G9) — đặc tả 07 §47 | `tests/tenant/platform-access-isolation.test.ts`: truy cập Console → một dòng; chủ tổ chức thấy, tổ chức khác không; `platform-access-guard.test.ts` |
| [x] | I-7 Test kiến trúc: route ghi có tenant phải ghi `audit_logs` hoặc có trong danh sách miễn — `tests/unit/architecture/audit-boundary.test.ts`; 123 route cũ chưa ghi vào tệp nợ chỉ co lại (nợ #204) | Test xanh |
| [ ] | I-4 Client extension đặt `app.org_id` theo giao dịch; worker đặt ngữ cảnh job; đo p95 | p95 tăng ≤ 10% |
| [ ] | I-5 [SCHEMA] RLS chế độ ghi nhận trên CSDL khôi phục; chạy toàn bộ test + e2e — **07/11/2026, phần test:** `DB_RLS_MODE=audit` + `DB_RLS_AUDIT_FILE` chạy toàn bộ `test:tenant` (195 tệp, 884 ca) + `test:platform` (14 tệp, 43 ca): lần đầu 54 sự kiện `pending` (52 URL giả trong test, 2 route Console `saas-policy` xếp nhầm) → sửa `db-context.ts` + test kiến trúc mọi route `requirePlatformContext` chạy quyền hệ thống; chạy lại **0 sự kiện**. Còn thiếu: CSDL khôi phục từ production + e2e | 0 vi phạm ghi nhận |
| [x] | Ghi dòng mới `AGENT_RULES.md` §14: bộ quét liên tenant phải chạy bằng quyền hệ thống (`asSystemDb` trong ứng dụng, `smeos_system` cho script) — dòng 15 | — |

### GĐ4 — Dữ liệu cá nhân (ADR-014)

| ☐ | Mục | Thay | Gate thêm |
|---|---|---|---|
| [x] | P-2 [SCHEMA] **B5** `customers.status PROSPECT`; `customer_id` trên `leads` (đã có), `greeting_sessions`; backfill; ghi kép — PO duyệt 07/11/2026, phương án A: PROSPECT chỉ là người nhận link Thẻ chào có SĐT chưa đặt đơn, lead vẫn tạo khách thường (đặc tả 07 §48) | — | `tests/tenant/customer-prospects.test.ts`: link/lead/đơn trỏ đúng khách cùng tổ chức; PROSPECT không hiện ở danh sách/xuất; backfill |
| [x] | P-3a [SCHEMA] **B5** `order_recipients` (người nhận + VAT) + backfill + ghi kép ở 6 đường ghi; đọc chưa đổi — PO duyệt 07/11/2026 (D-63), đặc tả 07 §49 | — | `tests/tenant/order-recipients.test.ts`: mọi đường ghi; backfill khớp `recipientFromDeliveryAddress` |
| [x] | P-3b **B5** Chuyển đọc người nhận/địa chỉ/VAT sang `order_recipients`: query extension của client Prisma cho mọi `orders.find*` + 4 chỗ chọn đơn lồng; `address_parts` giữ nguyên khoá địa chỉ (chép lại từ JSON) — đặc tả 07 §49 | — | `order-recipients.test.ts`: xoá phần cá nhân khỏi nơi cũ, màn hình vẫn đủ; `order-recipient-reads.test.ts` |
| [x] | P-3c [SCHEMA] contract: bỏ người nhận/địa chỉ khỏi `orders.delivery_address`, bỏ cột `orders.vat_*` — PO duyệt 07/11/2026; migration chốt khớp rồi mới xoá (đặc tả 07 §49) | — | `order-recipients.test.ts`: JSON chỉ còn khoá vận hành, màn hình đủ; lệch → dừng không xoá; bỏ PII đúng `stripRecipientPii` |
| [x] | P-4 [SCHEMA] `shared_order_access`; gia công dùng chia sẻ — PO duyệt 07/11/2026 (D-64): 7 ngày sau khi đơn đóng, chi nhánh được mời mất quyền ngay, tin mời chỉ ghi khu vực (đặc tả 07 §50) | — | `tests/tenant/shared-order-access.test.ts`: thu hồi / hết hạn → 404 |
| [x] | P-5a [SCHEMA] Mã hoá cột dữ liệu cá nhân khách cuối (expand): `tenant_data_keys`, cột `*_enc` + `phone_hash`/`phone_last4`, ghi kép qua extension Prisma, job mã hoá dữ liệu cũ — PO duyệt 07/11/2026 (D-65), đặc tả 07 §51 | — | `tests/tenant/pii-encryption.test.ts` |
| [ ] | P-5b Đọc từ bản mã (giải mã ở extension), tra cứu theo `phone_hash`, tìm theo 4 số cuối/đủ số (D-49), sửa SQL thô; `PII_ENCRYPTION_KEY` bắt buộc | — | Màn hình không đổi; tìm theo phần giữa số không còn |
| [ ] | P-5c [SCHEMA] contract: bỏ cột rõ, duy nhất theo `(organization_id, phone_hash)` | — | Dump không có số rõ |
| [ ] | P-6 [SCHEMA] `retention_policies` + job hạn lưu (cần I-2) | P2-F2 | Dòng quá hạn xử lý; legal hold giữ |
| [ ] | P-7 [SCHEMA] `data_subject_requests` + xoá/xuất | P2-F1 | Xoá lan sang tổ chức được chia sẻ |
| [ ] | P-8 [PO] Chọn vùng dữ liệu; đổi mặc định `data_region` theo quyết định | — | Ghi sổ quyết định |

### GĐ5 — Cô lập theo gói và vòng đời tenant (ADR-016)

| ☐ | Mục | Gate thêm |
|---|---|---|
| [ ] | S-2 Xuất/nhập tenant theo sổ; thay `scripts/handover-backup-engine.ts` | Vòng tròn xuất → nhập khớp từng dòng |
| [ ] | S-3 [SCHEMA nhỏ] `lifecycle_status`; tạm ngưng/rời/xoá; thay `handover-clean-tenant.ts`, `clean-siin-store-orders.ts` | Xoá không chạm tổ chức khác |
| [ ] | S-4 [VẬN HÀNH] Runbook + diễn tập khôi phục riêng một tenant | Biên bản ≤ 4 giờ |
| [ ] | S-5 [SCHEMA nhỏ] `isolation_tier` gắn gói | Gói không cho phép → 422 |
| [ ] | S-6 [VẬN HÀNH] Mẫu triển khai `DEDICATED` + dựng thử một lần + sổ triển khai | Biên bản dựng từ đầu |

### GĐ6 — Bật enterprise và chứng minh

| ☐ | Mục | Gate thêm |
|---|---|---|
| [ ] | I-6 [SCHEMA] Bật RLS chặn thật trên production (mốc theo câu trả lời ADR-013 §6) | Test "bỏ `scopedWhere` → 0 dòng" chạy trên CSDL thật |
| [ ] | O-9 [VẬN HÀNH] Thử tải quy mô mục tiêu trên CSDL khôi phục PITR | Biên bản p95 đạt SLO |
| [ ] | O-10 Dọn `generation_jobs` cũ; bản sao đọc / phân vùng nếu chạm ngưỡng | Theo ngưỡng ADR-015 D-O6 |
| [x] | P3-03 ERD theo miền sinh từ schema (`npm run gen:erd` → `docs/kien-truc/ERD_THEO_MIEN.md`, 10 miền), kiểm trong CI qua `npm test` | `tests/unit/architecture/erd.test.ts`: tệp sinh khớp schema, mỗi model đúng một miền |
| [ ] | [PO] Quyết định lại kiểm thử bảo mật bên ngoài (D-26 hiện "không làm") cho khách enterprise | Ghi sổ quyết định |
| [ ] | Gói bằng chứng: điền cột "Bằng chứng" của mục 1 cho DoD-1 → DoD-17 | PO ký nhận |

## 4. Cổng kiểm cho mọi PR của chương trình

Theo bảng "Definition of done" trong `CLAUDE.md`, thêm:

- [SCHEMA]: migration viết tay theo expand/contract, chạy trong một giao dịch, thử trên CSDL có dữ liệu bẩn (cách đã dùng
  ở PR #127); `npx prisma migrate diff --exit-code` sạch; `test:tenant` + `test:platform` xanh; so với `main` chỉ báo lỗi mới.
- Chạm Thẻ chào: B5 — test khoá hành vi cho đường sắp sửa có trước, test cũ xanh (`KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md` §0).
- [VẬN HÀNH]: runbook cập nhật cùng PR (`VAN_HANH_SU_CO_VA_SAO_LUU.md`, `VAN_HANH_CAP_NHAT_CSDL.md`).
- Mỗi PR đánh dấu ô của mình ở tệp này và ghi số PR bên cạnh.

## 5. Ma trận phủ khoảng trống

| Khoảng trống | Bước |
|---|---|
| G1 cây tổ chức · G2 bốn biểu diễn chi nhánh | T-1 … T-6 |
| G3 quyết định theo tầng | T-6, T-7 |
| G4 cách ly ở CSDL | I-1, I-4, I-5, I-6 |
| G5 sao chép dữ liệu khách sang đối tác | P-4 |
| G6 ranh giới domain, bảng rộng, JSON | S-1, P-3, T-7 (JSON quản trị), P-1 |
| G7 khách ở nhiều nơi | P-2, P-3 |
| G8 nhật ký | I-2, I-7 |
| G9 số dư | I-3 |
| G10 bảng tăng không giới hạn | P-6, O-10 |
| G11 pool, timeout, index | O-1, O-2, O-8 |
| G12 báo cáo trên CSDL chính | O-9, O-10 |
| G13 dữ liệu cá nhân | P-1, P-5, P-6, P-7 |
| G14 vùng dữ liệu | P-8, S-6 |
| G15 HA, sao lưu | O-3, O-6, O-7 |
| G16 migration, staging | O-4, O-5 |
| G17 cô lập theo gói | S-1 … S-6 |

G6 chỉ được xử lý một phần ở kế hoạch này (tách `orders`/`order_coordinations` theo domain là việc của từng tính năng
khi chạm vào, theo D-45). Mọi khoảng trống khác có ít nhất một bước có điều kiện xong đo được.
