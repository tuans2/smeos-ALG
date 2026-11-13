# Kế hoạch thực thi — Console Vận hành Nền tảng (P25)

**Ngày lập:** 2026-09-18 · **Cập nhật:** 2026-09-19 · **Trạng thái:** đã chốt đủ, sẵn sàng bắt đầu P25a
**Thiết kế gốc:** `docs/kien-truc/DASHBOARD_VAN_HANH_NEN_TANG.md` (soát 11/09) — tệp này KHÔNG thay thế nó, mà là lớp thực thi: điền các ô CHỐT, sửa ba chỗ thiết kế gốc nói sai so với mã thật, và chia việc thành ba đợt có cổng nghiệm thu.

---

## 0. Tóm tắt

Xây **console vận hành nền tảng** — giao diện xuyên tổ chức cho người vận hành SaaS, thứ `floraos-core` hiện hoàn toàn không có. Hôm nay mọi việc vận hành chạy bằng script tay: `nap-credit`, `hoan-credit`, `them-thanh-vien`, `dat-lai-mat-khau`, `scan-stuck-jobs`; yêu cầu nâng cấp gói chỉ được ghi vào `audit_logs` rồi nằm đó, không ai duyệt được.

Phạm vi chốt: **trọn G1 + G2 + G3**, tám mã năng lực `N1`–`N8`. Ba mã `N9`–`N11` (sổ đăng ký mô hình AI, sổ ngưỡng, báo cáo chi phí theo mô hình) **để lại tuyến AI-1**, không nằm trong P25.

---

## 1. Bốn quyết định đã chốt (18/09/2026)

| # | Nội dung | CHỐT |
|---|---|---|
| D-N4 | Duyệt yêu cầu nâng cấp (N2) có kèm thu phí không | **Không.** Duyệt chỉ đổi `organizations.type` + `workspaces.kind` + ghi `audit_logs`. Nạp credit là thao tác riêng ở N3. Giữ đúng giới hạn PRD mục 4 (billing thật ngoài giai đoạn này) |
| D-N5 | Màn sức khoẻ hệ thống (N5) có nút hành động không | **Không.** Chỉ đọc + cảnh báo. Không nút chạy lại job, không huỷ job, không khởi động lại worker |
| Phạm vi | Đợt đầu build tới đâu | **Trọn G1 + G2 + G3** (`N1`–`N8`), chia ba đợt P25a/P25b/P25c có cổng riêng |
| Lối vào | Người vận hành vào console bằng đường nào | **Ngữ cảnh song song.** `/van-hanh` và `/api/v1/platform/*` tra `platform_operators` theo `user_id`, độc lập hoàn toàn với `sessions.organization_id`. Không đụng `log-in.ts`, không đụng layout `(app)` |

---

## 2. Ba chỗ thiết kế gốc nói sai so với mã thật

Đối chiếu ngày 18/09 trên cây làm việc hiện tại. Không sửa ba chỗ này trước khi viết mã thì đợt build sẽ chết giữa chừng.

### 2.1 Nhánh `organization_id = null` KHÔNG BAO GIỜ chạy cho anh Tony

Thiết kế gốc mục 3 điểm 4 giả định: người vận hành có `sessions.organization_id = null`, `resolveSession` rẽ nhánh đó và trả `PlatformContext`. Mã thật bác bỏ giả định này ở hai chỗ:

- `src/modules/organization/use-cases/log-in.ts` — đăng nhập xong gọi `memberships.findFirstActiveForUser(user.id)` rồi ghi thẳng `organization_id` đó vào phiên. Một tài khoản đồng thời là thành viên AVI GIFT **luôn** có `organization_id` khác null.
- `src/app/(app)/layout.tsx` — `resolveAppSession` trả `null` khi `!resolved.ctx`, và layout `redirect("/dang-nhap")` ngay. Một phiên không tổ chức không vào được bất kỳ trang nào dưới `(app)`.

**Hệ quả kiến trúc (đã chốt):** console **không** nằm dưới `(app)`. Nó có route group riêng `src/app/(platform)/` với layout riêng, giải `PlatformContext` bằng một lượt tra `platform_operators` theo `user_id` — không quan tâm phiên đang gắn tổ chức nào. Anh đang mở AVI GIFT ở một tab vẫn mở được `/van-hanh` ở tab khác.

### 2.2 Con số năng lực trong tài liệu đã cũ

`AGENTS.md` và thiết kế gốc ghi **143 mã / 39 trần cứng**. Đo lại 18/09 từ `src/core/rbac/capability-catalog.test.ts`: **146 mã / 41 trần cứng**. Lược đồ cũng không còn 27 bảng như `AGENTS.md` ghi — `prisma/schema.prisma` hiện có **60 model**. Mọi con số trong kế hoạch này là số đo lại, không chép.

### 2.3 Cổng `check:docs` bốn trục sẽ chặn mọi bảng/route mới

`scripts/check-docs.mjs` (sinh ở lượt rà soát RS-2, 18/09) đối chiếu tài liệu với mã và **thoát mã lỗi** khi lệch. Bốn trục:

1. Mọi `export GET/POST/...` trong `src/app/api/v1/**/route.ts` phải có dòng tương ứng trong `docs/dac-ta/06-api-specification.md`, và ngược lại.
2. Mọi `model` trong `prisma/schema.prisma` phải được khai trong `docs/dac-ta/07-database-specification.md`, và ngược lại.
3. Mọi `enum` phải khớp **từng giá trị** giữa hai nơi — thêm `PLATFORM` vào `capability_scope` mà quên sửa đặc tả 07 là CI đỏ.
4. Mọi bảng có `organization_id` phải có ca thử cách ly + có tên trong `TENANT_TABLES` của `tests/helpers/database.ts`.

Hai bảng mới của console **không có** `organization_id` nên không dính trục 3–4 (giống `ai_capabilities`/`ai_models`, ngoại lệ có chủ đích của Luật 1). Nhưng chúng dính trục 2, và mọi route mới dính trục 1. **Quy tắc thi hành: tài liệu đặc tả sửa trong CÙNG commit với mã, không để sau.**

### 2.4 `prisma generate` không chạy được qua cầu nối máy

Bẫy đã ghi trong `AGENTS.md`: `prisma generate` tải nhị phân từ `binaries.prisma.sh`, host đó trả 403 qua proxy của VM `device_bash`. Hệ quả: ngay khi thêm model vào `schema.prisma`, `npx tsc --noEmit` sẽ báo `Property 'platform_operators' does not exist on type 'DbClient'` cho tới khi **anh Tony chạy tay trên Terminal Mac**. Đây là lỗi CHỜ, không phải lỗi mã. Mỗi đợt dưới đây có một bước "anh chạy tay" đứng đúng chỗ.

---

## 3. D-N6 — ĐÃ CHỐT 19/09: tách hẳn (phương án A)

**Từ vựng năng lực nền tảng dùng chung bảng `roles`/`role_capabilities` của tenant, hay tách hẳn?**

Thiết kế gốc mục 3 chọn **dùng chung**: thêm một dòng `roles` với `key = "van_hanh_nen_tang"`, năng lực của nó nằm trong `role_capabilities` với `scope = PLATFORM`. Chính thiết kế gốc mục 7 xếp rủi ro đi kèm là **High**: *"vai vận hành nền tảng vô tình có luôn quyền tenant vì dùng chung bảng `roles`"*, và chặn bằng một bộ test.

Đọc mã thật cho thấy phương án dùng chung còn đắt hơn mô tả:

- `SystemRoleKey` (`src/modules/organization/domain/system-roles.ts`) là union bốn khoá. Thêm khoá thứ năm làm rộng kiểu này, và `CapabilityDefinition.defaultRoles`/`hardCap` đều typed theo nó — mọi định nghĩa năng lực tenant chịu ảnh hưởng kiểu.
- `capability-catalog.test.ts` đang khoá `defaultCodesForSystemRole("dieu_hanh").length === ALL_CAPABILITY_CODES.length - 1` (điều hành có mọi mã trừ `K1`). Thêm tám mã `N` mà điều hành **không** được có là ca thử này đỏ, phải viết lại thành "trừ `K1` và trừ toàn dải `N`" — một luật khoá bị nới lỏng để chiều một tính năng khác.
- `CapabilityScope` ở `permission-resolver.ts` là union `"ORGANIZATION" | "BRANCH"`. Thêm `PLATFORM` chạm vào hàm mà **mọi** lời gọi quyền tenant đi qua.

| Phương án | Ưu | Nhược |
|---|---|---|
| **A — Tách hẳn (khuyến nghị)** | Từ vựng `N1`–`N8` nằm ở `src/core/platform/platform-capability-catalog.ts`, bảng gán riêng `platform_role_capabilities`. `SystemRoleKey`, `CAPABILITIES`, `capability_scope`, `permission-resolver.ts` **không đổi một dòng**. Rủi ro High ở mục 7 thiết kế gốc bị **loại bỏ theo cấu trúc**, không phải canh bằng test: một mã `N` không thể lọt vào bảng công tắc tenant vì nó không tồn tại trong từ vựng tenant, và ngược lại | Hai từ vựng năng lực song song, phải nhớ có hai nơi. Thêm một bảng nữa |
| **B — Dùng chung (như thiết kế gốc)** | Một từ vựng, một bảng công tắc, một màn quản trị vai | Nới một ca thử đang khoá luật; rộng ba kiểu dùng chung toàn hệ thống; rủi ro rò quyền chuyển từ "không thể" sang "có test canh" |

**CHỐT 19/09: phương án A — tách hẳn.** Kéo theo: D-N1 (`ALTER TYPE` trên enum `capability_scope`) **không còn cần thiết** — không đụng enum đó, không đụng `SYSTEM_ROLES`, không đụng `capability-catalog.ts` (giữ nguyên 146 mã), không sửa `capability-catalog.test.ts`. Phần dưới giữ lại để ghi lý do, không phải để chọn lại. Nếu về sau đổi sang B thì phần khác đi là: bỏ `platform_role_capabilities`, thêm `PLATFORM` vào enum `capability_scope`, thêm `van_hanh_nen_tang` vào `SYSTEM_ROLES`, sửa `capability-catalog.test.ts`, và gộp `N1`–`N8` vào `capability-catalog.ts` (146 → 154 mã). Ba đợt và thứ tự việc giữ nguyên.

---

## 4. Kiến trúc chốt

### 4.1 Lược đồ — ba bảng mới, không bảng nào có `organization_id`

```
platform_operators
  id, user_id, granted_by, created_at, revoked_at?
  @@unique([user_id])

platform_role_capabilities          (phương án A)
  id, operator_id, capability_code   -- N1 … N8
  @@unique([operator_id, capability_code])

platform_audit_logs
  id, user_id, action, entity_type, entity_id, before?, after?, ip?, user_agent?, created_at
  @@index([created_at]) @@index([entity_type, entity_id])
```

Ba bảng là **ngoại lệ có chủ đích của Luật 1**, cùng hạng với `ai_capabilities`/`ai_models`. Ghi rõ điều đó trong `docs/dac-ta/07-database-specification.md` ngay lượt khai, kèm một câu lý do — nếu không, lượt rà soát sau sẽ gắn cờ chúng là bảng thiếu `organization_id`.

**Chia nhật ký làm hai, vì `audit_logs.organization_id` là `NOT NULL`:**

- Hành động chạm một tổ chức cụ thể (nạp credit, duyệt nâng cấp, tạo token) → ghi `audit_logs` hiện có, `organization_id` của tổ chức đó, `user_id` của người vận hành. Không bảng mới.
- Hành động không thuộc tổ chức nào (xem sức khoẻ hệ thống, gán/thu vai vận hành) → `platform_audit_logs`.

### 4.2 Lõi — `PlatformContext` là KIỂU KHÁC HẲN `TenantContext`

```
src/core/platform/platform-context.ts     -- thuần, không import Prisma
  export type PlatformContext = {
    readonly userId: string
    readonly capabilities: ReadonlySet<string>   -- N1 … N8
  }
```

Cố ý **không có** trường `organizationId`. Nhờ vậy `tsc` tự chặn mọi lời gọi truyền nhầm: `scopedWhere(pctx, …)` không biên dịch được, `requireCapability(pctx, "L1")` không biên dịch được.

```
src/core/platform/platform-capabilities.ts
  hasPlatformCapability(pctx, code) / requirePlatformCapability(pctx, code)
src/core/platform/platform-capability-catalog.ts
  N1 … N8 — tám định nghĩa, tách khỏi CAPABILITIES của tenant
```

| Mã | Tên | Việc |
|---|---|---|
| `N1` | `platform.organizations.read` | Danh sách & chi tiết mọi tổ chức |
| `N2` | `platform.upgrade_requests.manage` | Hàng đợi yêu cầu nâng cấp: duyệt / từ chối |
| `N3` | `platform.credit.manage` | Nạp / hoàn credit cho một tổ chức |
| `N4` | `platform.usage.read` | Usage & chi phí tổng hợp toàn hệ thống |
| `N5` | `platform.health.read` | Sức khoẻ hệ thống (chỉ đọc) |
| `N6` | `platform.audit.read` | Nhật ký xuyên tổ chức |
| `N7` | `platform.organizations.create` | Tạo tổ chức mới |
| `N8` | `platform.integration_tokens.manage` | Token tích hợp theo tổ chức |

### 4.3 Module — `src/modules/platform/` đủ bốn thư mục

```
domain/       platform-rules.ts (thuần: luật duyệt nâng cấp, ngưỡng job treo, luật hoàn credit)
use-cases/    resolve-platform-session.ts  ← requirePlatformContext(request)
              list-organizations.ts · get-organization.ts
              summarize-usage.ts · read-system-health.ts · list-platform-audit.ts
              list-upgrade-requests.ts · approve-upgrade.ts · reject-upgrade.ts
              top-up-credit.ts · refund-credit.ts
              create-organization.ts · list-org-tokens.ts · revoke-org-token.ts
infra/        platform-operator-repository.ts
              platform-audit-repository.ts
              platform-query.ts   ← lớp truy vấn RIÊNG, xem 4.4
adapters/     (rỗng đợt này)
```

### 4.4 Lớp truy vấn riêng — điều quan trọng nhất của cả đợt

Rủi ro **Critical** duy nhất trong thiết kế gốc: tái dùng repository tenant rồi bỏ lọc `organization_id` bằng tay. `src/core/tenancy/tenant-context.ts` hiện bảo vệ bằng `scopedWhere`/`scopedData` — cả hai **bắt buộc** một `TenantContext` và **ném `TenantScopeViolation`** nếu `where` tự khai `organization_id`. Không có nhánh nào để bỏ lọc, và không được thêm nhánh đó.

**Luật của đợt này:** `src/modules/platform/infra/platform-query.ts` là chỗ **duy nhất** trong repo được phép truy vấn nhiều tổ chức. Nó gọi thẳng `prisma`, không đi qua bất kỳ repository tenant nào, và mọi hàm của nó nhận `PlatformContext` làm tham số đầu. Không repository tenant nào mọc thêm cờ `skipTenantFilter` — thêm cờ đó là lỗi chặn ở review.

### 4.5 API — `/api/v1/platform/*`, một bộ gác duy nhất

Mọi route bắt đầu bằng đúng hai dòng, không ngoại lệ:

```ts
const pctx = await requirePlatformContext(request)
requirePlatformCapability(pctx, "N4")
```

`requirePlatformContext` **không bao giờ** dựng `TenantContext`; `requireTenantContext` **không bao giờ** đọc `platform_operators`. Hai đường danh tính không gặp nhau ở bất kỳ điểm nào.

### 4.6 Giao diện — route group riêng

```
src/app/(platform)/layout.tsx      -- giải PlatformContext; không có → redirect /
src/app/(platform)/van-hanh/page.tsx
  + to-chuc/ · to-chuc/[id]/ · nang-cap/ · muc-dung/ · suc-khoe/ · nhat-ky/ · token/
```

Trang chủ `/van-hanh`: danh sách tổ chức (N1) + ba thẻ số đếm nổi — job đang treo (N5), yêu cầu nâng cấp đang chờ (N2), tổ chức mới trong 7 ngày (N1). Dùng lại đúng khuôn thẻ số đếm mà `admin-dashboard.tsx` đang dùng cho "Hàng chờ duyệt".

Khối hướng dẫn thao tác của mọi tab theo chuẩn `<FeatureGuidanceCard />` (`src/components/templates/shared/feature-guidance-card.tsx`), nút tác vụ chung đặt góc trên bên phải — luật `AGENTS.md` mục Quy ước áp cho console như mọi tab khác.

---

## 4.7 Chốt 19/09 — thứ tự và số người vận hành

- **Thứ tự:** P25 làm TRƯỚC các pha tính năng đang dở (P13 tăng cường ảnh, P16 ảnh marketing, P18 nội dung đăng bài). Lý do: càng thêm khách thật thì năm script vận hành chạy tay và hàng đợi nâng cấp không ai duyệt được càng đau.
- **Số người vận hành: một (anh Tony).** Giữ cách cấp quyền bằng `scripts/gan-van-hanh-nen-tang.ts` chạy tay một lần; **KHÔNG làm màn cấp/thu quyền vận hành** trong P25, không thêm mã năng lực cho việc đó. Khi có người vận hành thứ hai thì mở nợ kỹ thuật mới — đừng dựng trước một màn chưa ai dùng.

## 5. P25a — G1 chỉ đọc

**Mục tiêu:** người vận hành đăng nhập, mở `/van-hanh`, nhìn thấy mọi tổ chức, usage tổng hợp, sức khoẻ hệ thống và nhật ký xuyên tổ chức. Chưa ghi được gì.

| # | Việc | Tệp |
|---|---|---|
| a1 | Ba bảng mới | `prisma/schema.prisma` |
| a2 | **Anh Tony chạy tay:** `npx prisma generate && npx prisma db push` trên Terminal Mac | — |
| a3 | Khai ba bảng + ghi rõ ngoại lệ Luật 1 | `docs/dac-ta/07-database-specification.md` |
| a4 | `PlatformContext` thuần + test thuần | `src/core/platform/platform-context.ts` `.test.ts` |
| a5 | Từ vựng `N1`–`N8` + cổng năng lực nền tảng | `src/core/platform/platform-capability-catalog.ts` · `platform-capabilities.ts` (+ test) |
| a6 | Khai `N1`–`N8` | `docs/dac-ta/02-function-catalog.md` |
| a7 | Repository người vận hành + nhật ký nền tảng | `src/modules/platform/infra/platform-operator-repository.ts` · `platform-audit-repository.ts` |
| a8 | `requirePlatformContext` | `src/modules/platform/use-cases/resolve-platform-session.ts` |
| a9 | Lớp truy vấn xuyên tổ chức | `src/modules/platform/infra/platform-query.ts` |
| a10 | Bốn use-case chỉ đọc | `list-organizations` · `get-organization` · `summarize-usage` · `read-system-health` · `list-platform-audit` |
| a11 | Năm route | `GET /platform/organizations` · `/organizations/:id` · `/usage` · `/health` · `/audit-logs` |
| a12 | Khai năm route | `docs/dac-ta/06-api-specification.md` |
| a13 | Script gán vai lần đầu (D-N2 thiết kế gốc: chạy tay, không có UI tự gán) | `scripts/gan-van-hanh-nen-tang.ts` |
| a14 | Layout + trang chủ + bốn trang con chỉ đọc | `src/app/(platform)/**` |
| a15 | **Bộ test cách ly nền tảng** — xem 5.1 | `tests/platform/cach-ly-platform.test.ts` |
| a16 | Lệnh `test:platform` + gắn vào CI | `package.json` · `.github/workflows/` |

### 5.1 Bộ test cách ly nền tảng — điều kiện nghiệm thu P25a

Song song với `test:tenant`, không gộp vào nó. Bốn ca tối thiểu, mỗi ca gọi **route thật**:

1. Người dùng thường (có phiên tenant hợp lệ, **không** có dòng `platform_operators`) gọi `GET /api/v1/platform/organizations` → **403**, và thân đáp ứng không lộ tên tổ chức nào.
2. Người vận hành nền tảng gọi route tenant thường (`GET /api/v1/products`) → bị chặn **y như một người không có `membership`**. Có vai nền tảng không tự nhiên có quyền tenant.
3. Người vận hành chỉ được cấp `N1` gọi `GET /api/v1/platform/usage` (`N4`) → **403**. Năng lực gác từng route, không gác theo "đã là người vận hành".
4. `GET /platform/organizations` của một người vận hành trả **đủ cả hai** tổ chức trong fixture — xác nhận đường đọc xuyên tổ chức thật sự hoạt động, không phải lọt qua vì rỗng.

Ca số 4 quan trọng không kém ba ca chặn: một bộ test cách ly xanh vì **không trả gì cả** là bộ test vô giá trị.

**Cổng P25a:** `npx tsc --noEmit` sạch · `npm test` xanh · `npm run test:tenant` xanh (**không suy giảm** — console không được làm đỏ bất kỳ ca cách ly tenant nào) · `npm run test:platform` xanh · `npm run check:docs` **0 lỗi cả bốn trục**.

---

## 6. P25b — G2 hành động trên một tổ chức

**Mục tiêu:** bỏ được `scripts/nap-credit.ts` và `scripts/hoan-credit.ts`; xử lý được hàng đợi yêu cầu nâng cấp.

| # | Việc | Ghi chú |
|---|---|---|
| b1 | Luật duyệt nâng cấp thuần | `domain/platform-rules.ts` — chỉ `EXPERIENCE` mới duyệt được, đích chỉ `SINGLE`/`CHAIN`; đối xứng với `request-organization-upgrade.ts` đang có |
| b2 | `list-upgrade-requests` | Đọc `audit_logs` `action = "organization.upgrade_requested"`, trừ đi những cái đã có `organization.upgraded`/`organization.upgrade_rejected` sau nó |
| b3 | `approve-upgrade` | **Theo D-N4: chỉ đổi `organizations.type` + `workspaces.kind`**, ghi `audit_logs` (`organization.upgraded`). KHÔNG cộng credit, KHÔNG chạm billing. Một giao dịch |
| b4 | `reject-upgrade` | Ghi `audit_logs` (`organization.upgrade_rejected`) kèm lý do |
| b5 | `top-up-credit` / `refund-credit` | **Bọc `OrganizationRepository.topUpCredit` đã có**, không viết lại luật. Giữ nguyên việc ghi `audit_logs` mà `scripts/nap-credit.ts` đang làm |
| b6 | Bốn route | `GET /platform/upgrade-requests` · `POST /platform/upgrade-requests/:id/approve` · `.../reject` · `POST /platform/organizations/:id/credit` |
| b7 | Hai trang | `(platform)/van-hanh/nang-cap` · khối credit trong `to-chuc/[id]` |
| b8 | Đặc tả 06 + ca thử | Bốn route mới; thêm ca: người vận hành thiếu `N3` gọi route credit → 403; duyệt một tổ chức **không** ở trạng thái `EXPERIENCE` → 409 |

**Cổng P25b:** như P25a, cộng một ca thử chứng minh `organizations.credit_balance` đổi đúng số sau một lượt nạp và một lượt hoàn, đọc lại từ CSDL chứ không tin đáp ứng API.

---

## 7. P25c — G3 vận hành sâu

**Mục tiêu:** tạo tổ chức mới và quản token tích hợp không cần chạm Terminal. Mặt tác động rộng nhất — làm sau cùng, có chủ đích.

| # | Việc | Ghi chú |
|---|---|---|
| c1 | `create-organization` | Gói một luồng: `organizations` + `workspaces` + thành viên điều hành đầu tiên. **Không tái dùng `signUp`** — hàm đó cố định `EXPERIENCE` + trial. Lấy khuôn từ `avi-gift-import/use-cases/bootstrap-avi-gift-organization.ts`, vốn đã giải đúng bài này cho tổ chức `SINGLE` |
| c2 | `list-org-tokens` / `revoke-org-token` | Bọc `src/modules/integration/use-cases/*` đã có (`F9`), gác lại bằng `N8` thay vì `F9` |
| c3 | Ba route | `POST /platform/organizations` · `GET /platform/organizations/:id/tokens` · `POST /platform/organizations/:id/tokens/:tokenId/revoke` |
| c4 | Hai trang | Nút "Tạo tổ chức" ở `/van-hanh/to-chuc` · khối token trong `to-chuc/[id]` |
| c5 | Ca thử | Tổ chức vừa tạo phải có **đúng một** thành viên điều hành và **không** dữ liệu của tổ chức nào khác lọt vào |

**Cổng P25c:** như trên, cộng một lượt chạy thật: tạo một tổ chức qua console, đăng nhập bằng tài khoản điều hành vừa tạo, xác nhận nó **không** thấy dữ liệu tổ chức khác.

---

## 8. Việc anh Tony phải làm tay

Cầu nối máy không chạy được ba việc này:

1. **`npx prisma generate && npx prisma db push`** sau a1 (và sau mọi lượt đổi lược đồ). Trước khi chạy: `echo "[$DATABASE_URL]"` phải **rỗng**, và nhìn dòng `Datasource "db"` Prisma in ra — bẫy `DATABASE_URL` rò từ repo `LocalBudd` đã suýt xảy ra một lần ngày 09/10.
2. **`npm run db:test:setup`** một lần, nếu `floraos_test` chưa có — `test:platform` và `test:tenant` đều cần nó.
3. **Chạy `scripts/gan-van-hanh-nen-tang.ts`** để tự cấp cho mình vai vận hành đầu tiên. Trước bước này console không có ai vào được, đúng như thiết kế (không có UI tự gán).

Còn treo từ lượt rà soát 18/09: thư mục nối vào phiên Claude vẫn là `~/Projects/floraos-core` (rỗng); repo thật ở `~/ORGANIZED/02_PROJECTS/Active/floraos-core`. Đổi trong app Claude desktop để khỏi phải xin quyền thư mục mỗi phiên.

---

## 9. Rủi ro và cách chặn

| Rủi ro | Mức | Cách chặn trong kế hoạch này |
|---|---|---|
| Rò dữ liệu xuyên tổ chức qua lớp truy vấn console | **Critical** | Mục 4.4: `platform-query.ts` là chỗ duy nhất truy vấn nhiều tổ chức; cấm thêm cờ bỏ lọc vào repository tenant. Ca thử số 4 của 5.1 chứng minh đường đọc chạy thật |
| Vai nền tảng vô tình có quyền tenant | High | Phương án A ở mục 3 loại bỏ theo cấu trúc (hai từ vựng rời). Nếu chọn B thì rơi lại về canh bằng ca thử số 2 của 5.1 |
| `PlatformContext` bị truyền nhầm vào hàm tenant | Medium | Mục 4.2: hai kiểu không tương thích, `tsc` chặn ở biên dịch |
| N4 bị hiểu là hệ thống thanh toán thật | Medium | Nhãn giao diện ghi rõ "usage / credit", không dùng chữ "hoá đơn". D-N4 đã tách duyệt nâng cấp khỏi thu tiền |
| Tài liệu lệch mã ngay khi vừa xây xong | Medium | Trục 1–2 của `check:docs` là cổng CI; đặc tả 06/07 sửa trong cùng commit (mục 2.3) |
| Thêm bảng xong `tsc` đỏ hàng loạt, tưởng lỗi mã | Thấp | Mục 2.4: đó là lỗi CHỜ `prisma generate`, phân loại trước khi đi sửa |

---

## 10. Không làm trong P25 — có chủ đích

- **`N9`–`N11`** (sổ đăng ký mô hình AI, sổ ngưỡng năng lực, báo cáo chi phí theo mô hình) — thuộc tuyến AI-1, đi cùng đợt nền AI.
- **Thanh toán / xuất hoá đơn thật** — PRD mục 4 đã loại khỏi giai đoạn này.
- **Khởi động lại worker, thao tác hạ tầng** — ngoài quyền của một webapp (và D-N5 đã chốt N5 chỉ đọc).
- **Giao diện riêng cho tổ chức CHAIN** (bộ chọn chi nhánh, view tổng hợp nhiều chi nhánh) — đây là khoảng trống của **Dashboard Điều hành cấp tổ chức**, không phải của console nền tảng. Đừng gộp hai việc.

---

## 11. Kết thúc mỗi đợt — bắt buộc

Theo `AGENTS.md` mục "Kết thúc mỗi việc", trong cùng một lần:

1. Tích ô trong `docs/dac-ta/Checklist_Thuc_Thi.md` mục P25.
2. Ô cuối của một đợt → cập nhật `docs/kien-truc/TRANG_THAI.md` mục 1, mục 6, thêm một dòng mục 8.
3. Commit mã và tài liệu **trong cùng một commit**.
