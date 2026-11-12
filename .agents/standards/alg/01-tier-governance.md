# ALG · 01 · Quản trị 4 tầng (đối chiếu code 30/10/2026)

Áp dụng của [universal/01](../universal/01-tiered-saas-governance.md). Nguồn quyết định: PO 27/10/2026 (`f56024c`, `99db1df`), lưu ma trận `a96d224`, áp vào bán hàng `f2905fe`, khoá công cụ `3b11d05`, xem trước tầng `01203b9`.

## 1. Bốn tầng trong code

| Tầng | Nhận diện thật | Điều hướng | Trang |
|---|---|---|---|
| 1 · SaaS Mother | vai `platform_admin` / nhóm `PLATFORM` (không phải `organization_type`) | `components/layout/nav/nav-mother.ts` | `/van-hanh/*` |
| 2 · SaaS Ngành | `tierOf()`: vai `industry_admin` (kiểm trước Mẹ); **không có tổ chức loại INDUSTRY** trong enum `organization_type` | `nav-industry.ts` | — |
| 3 · ChainOS | `organization_type` `CHAIN` hoặc `FLOWER_NETWORK`, hoặc nhóm vai `CHAIN`/`FLOWER_NETWORK` (`isChainOrganization`) | `nav-chain.ts` | `/dieu-phoi/*` |
| 4 · StoreOS | mọi trường hợp còn lại (`EXPERIENCE`, `SINGLE`, `STORE`) | `nav-store.ts` | — |

Quan hệ Chuỗi → Cửa hàng: bảng `organization_links` (cạnh chính `is_primary` = liên kết chuỗi ACTIVE **sớm nhất**; đọc qua `resolveTierChain`) — không phải `parent_id`.

**Ngành** tác động qua **plugin trong code**, không qua dữ liệu: `src/modules/organization/domain/industries/*.ts` theo `industry-plugin-contract.ts` (thuật ngữ, taxonomy, preset giá, `craftFee`…). Thêm ngành = thêm file plugin + đăng ký registry (`npm run check:industry` kiểm).

## 2. Động cơ đang chạy — dùng cái này

`src/modules/organization/domain/governance-decisions.ts` (thuần):
- 6 hệ thống: `PROMOTIONS`, `COMMITMENTS`, `POLICIES`, `PAYMENTS`, `CRAFT_FEES`, `TEMPLATES`.
- Lưu ở `organizations.settings.governance_matrix[system] = { overrides, locks }`; tầng Mẹ ở `platform_settings`.
- `effectiveDecision()`, `validateDecisions()`, `upperLockFor()`; khoá bất biến `BUILT_IN_MOTHER_LOCKS` (vd. `MAX_DISCOUNT_PERCENT` với `PLATFORM_MAX_DISCOUNT_PERCENT = 50`) luôn đứng đầu qua `withBuiltInLocks()`.
- Use-case `organization/use-cases/governance-matrix.ts`: kiểm vi phạm → 422 `UNPROCESSABLE_ENTITY` kèm `violations`, ghi `recordAuditLog`.
- Tầng trên thật: **Mẹ (+ khoá dựng sẵn) → Chuỗi**. Luồng công khai dùng `loadPolicyGovernance()` (2 truy vấn, lỗi → `{}` nhưng vẫn áp khoá dựng sẵn).
- UI dùng chung: `src/components/governance/` (`use-governance-matrix.ts`, `apply-governance-decisions.ts`, `governance-scope-note.tsx`).
- API: `/api/v1/platform/governance-matrix`, `/api/v1/organizations/current/governance-matrix`.

**Lõi chung (30/10/2026, PO phương án 2):** `src/core/governance/layered-resolver.ts` — `resolveLayered` (khoá tầng cao nhất thắng → ghi đè cụ thể nhất → mặc định), `winningLock`, `isAbove`, `GOVERNANCE_TIERS`. `governance-decisions.ts` và `notification/domain/cascading-policy.ts` đều gọi lõi này. `cascading-resolver.ts` + 4 tệp `cascading-*` đã gỡ (nợ #193 ✅).

## 3. Trạng thái

| Mục | Trạng thái | Bằng chứng |
|---|---|---|
| Ghi đè + khoá, tầng trên thắng | ✅ | `governance-decisions.test.ts`, `tests/tenant/governance-matrix.test.ts` |
| Khoá bất biến nền tảng | ✅ | `BUILT_IN_MOTHER_LOCKS` |
| Áp vào trang khách, báo giá, đặt đơn: Ưu đãi / Cam kết / Chính sách | ✅ | `resolveAppliedPolicies` — `active-shop-promotions.ts`, `brochure-quote.ts`, `place-brochure-order.ts` |
| Áp: Thanh toán, Phí gia công, Mẫu | 🟡 chỉ lưu + khoá; UI ghi rõ (`GovernanceScopeNote`) | nợ #185 |
| Tầng Ngành trong ma trận | 🔴 không có dữ liệu; `governanceTierOf()` chỉ trả `CHAIN`/`STORE` | nợ #185, #195 |
| Một hàm xác định tầng | ✅ `src/core/governance/tier-of.ts` (`tierOf`, `isChainTier`, `organizationTierOf`) — 3 nơi cũ gọi lại | `tier-of.test.ts` |
| Một kiểu Tier | ✅ `GovernanceTier` (lõi); `GovernanceLayerTier`, `PlatformTier`, `GovernanceViewerTier` là alias; `NotificationTier` riêng có chủ đích (hợp đồng độc lập) | tsc |
| Khoá công cụ chuỗi → chi nhánh ở server | ✅ trang + API của công cụ: `organization/domain/tool-route-entitlement.ts`, `layout/tool-lock-guard.tsx`; `null` = không giới hạn, mảng (kể cả rỗng) = chỉ công cụ trong danh sách | `tool-route-entitlement.test.ts`, `require-tenant-tool-lock.test.ts` |
| API dùng chung nhiều công cụ | Cố ý **không** khoá (vd. `content-engine/generations`) | nợ #185 (c) |
| Gói dịch vụ | ✅ `core/entitlements/entitlement-service.ts` (`PLAN_FEATURES`), tách khỏi RBAC | `entitlement-service.test.ts` |
| Thông báo 4 tầng | ✅ bảng riêng `notification_hard_locks`, `notification_event_visibility`, `notification_org_policies` — động cơ riêng của module notification | — |
| Xem trước tầng | ✅ cookie `smeos_tier_preview`, capability `N1`, chỉ đổi khuôn | `tests/unit/platform/tier-preview.test.ts` |

## 4. Quy tắc cho agent

1. Hệ thống quản trị mới → thêm vào `GOVERNANCE_SYSTEMS` và dùng `governance-decisions.ts`; hệ thống có cấu trúc riêng (như thông báo) → gọi thẳng `resolveLayered`. Không viết resolver mới.
2. Cần biết tầng → `tierOf()` (trải nghiệm) hoặc `organizationTierOf()` (dữ liệu tổ chức) ở `core/governance/tier-of.ts`; **không** viết thêm phép so `organization_type`/vai mới.
3. Hệ thống mới mà luồng thật chưa áp → bắt buộc `GovernanceScopeNote` nói "đã lưu, chưa áp dụng".
4. Thuật ngữ ngành: `getIndustryPlugin(industryKey).terminology` / `ti.*` — không hardcode (ratchet `npm run audit:industry:check`).
5. Đổi luật bất biến (`BUILT_IN_MOTHER_LOCKS`, trần 50%) hoặc thêm tầng Ngành vào dữ liệu = **hỏi PO** (đụng schema/tenancy).
