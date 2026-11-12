# 05 — Audit bảo mật và phân quyền

> Phạm vi: xác thực, phiên, phân quyền 4 tầng, bí mật, mã hoá, kiểm đầu vào, nhật ký kiểm toán, rò rỉ tenant, leo thang quyền. Chỉ phân tích tĩnh + kết quả CI thật; **không** kiểm thử xâm nhập.

## 1. Phát hiện bảo mật

| ID | Mức | Phát hiện | Bằng chứng | Trạng thái |
|---|---|---|---|---|
| ARC-001 | **P0** | Cổng `test:tenant` / `test:platform` (cổng duy nhất chặn lỗi cách ly) bị SKIP trên HEAD `main`, trong khi `main` tự deploy | CI run #292 job `web`: bước 15 "Thuật ngữ ngành hardcode" `failure`, bước 16–20 `skipped`; `render.yaml` `autoDeploy: true` | V |
| ARC-002 | **P0** | Tài khoản production (gồm superadmin nền tảng) dùng mật khẩu seed nằm trong lịch sử repo công khai; mật khẩu CSDL lộ qua ảnh chụp — chưa xoay | `docs/kien-truc/HO_SO_BAN_GIAO.md` §6 (ô chưa tích) | NV (cần PO xác nhận) |
| ARC-003 | P1 | `requirePlatformContext` cấp `N1…N8, N12` cho user có email đuôi `@dev.com`, hoặc cho bất kỳ ai gửi cookie `smeos_dev_role` chứa `platform_admin`, khi `NODE_ENV !== "production"`. Đăng ký tài khoản là công khai | `src/modules/platform/use-cases/resolve-platform-session.ts` dòng 41–63; `src/app/api/dev/role-override/route.ts` | V (production an toàn vì `render.yaml` đặt `NODE_ENV=production`) |
| ARC-004 | P1 | Build production bỏ qua lỗi TypeScript | `next.config.ts` `ignoreBuildErrors: true` | V |
| ARC-022 | ~~P2~~ **Đã đóng 12/11/2026** (kiểm Origin 11/11; CSP nonce chặn thật — D-68) | ~~CSP chỉ `Report-Only`~~; không có token CSRF hay kiểm `Origin` cho request ghi (dựa vào `SameSite=Lax` + JSON) | `next.config.ts`; grep `csrf`/`sec-fetch-site` không ra cơ chế | V |
| ARC-009 | P1 | Worker Python gọi thẳng OpenAI/fal/Stability/Replicate → sàn riêng tư, lọc giấy phép của cổng AI không áp | `workers/media_ai/providers/*`, `workers/vision/providers/openai_*.py` | PV (chưa đọc hết logic chính sách trong worker) |
| ARC-011 | P1 | Chưa có cơ chế đồng ý, hạn lưu, xoá dữ liệu cá nhân khách cuối (Nghị định 13/2023); `staff_notifications.recipient_info` không hạn lưu | TRANG_THAI §5 D13; HO_SO_BAN_GIAO §6 | V (theo tài liệu) |
| ARC-025 | P2 | Route `content-engine/rewrite` chưa gác mã năng lực (nợ #170); 3 route chat nội bộ gác bằng "là người tham gia" trong use-case | `tests/unit/architecture/route-capability-guard.test.ts` `NO_CAPABILITY_GUARD` | V |
| ARC-031 | P3 | `xlsx` cài từ tarball CDN, ngoài tầm Dependabot | `package.json` | V |
| — | Thông tin | Không pentest độc lập | HO_SO_BAN_GIAO §6 | V |

## 2. Kiểm soát đã có (Verified)

| Lớp | Cơ chế | Vị trí |
|---|---|---|
| Phiên | Token ngẫu nhiên, lưu **băm** (`hashSessionToken`); kiểm `isUsable` + thu hồi; báo "đăng nhập nơi khác" | `organization/use-cases/resolve-session.ts`, `infra/session-token.ts` |
| Thành viên | Kiểm `memberships.status = ACTIVE` mỗi request → gỡ thành viên mất quyền ngay | `tenantContextFor` |
| Duyệt tài khoản | Tài khoản chưa duyệt/bị từ chối không dùng được phiên nào | `canSignIn(user.approval_status)` |
| Mật khẩu | bcrypt cost 12 | `organization/infra/password-hasher.ts` |
| Cookie | HttpOnly, SameSite=Lax, Secure (production) | `src/core/http/cookies.ts` |
| Tenant | `organization_id` chỉ từ phiên; `scopedWhere` ném lỗi nếu `where` tự khai; `ownedByTenant` trả `null` → 404 | `src/core/tenancy/tenant-context.ts` |
| Đổi tổ chức | Chỗ duy nhất client nêu tên tổ chức, đối chiếu `memberships` | `api/v1/session/organization` |
| Lỗi | `CAPABILITY_DENIED`/`ENTITLEMENT_REQUIRED` → 403, `NOT_FOUND` → 404; không lộ stack | `src/core/http/errors.ts` |
| Bí mật DB | AES-256-GCM, khoá HKDF theo mục đích từ `INTEGRATION_TOKEN_SECRET` | `src/core/security/secret-box.ts`, `integration-hub/infra/credential-vault.ts` |
| Cron | `x-cron-secret` so sánh thời gian hằng; production thiếu khoá → đóng | `src/core/http/cron-auth.ts` |
| Webhook | HMAC Facebook (`X-Hub-Signature-256`), chữ ký Zalo theo OA + chống phát lại (`isFreshEvent`) | `src/core/http/webhook-signature.ts`, `chat/webhooks/zalo/route.ts` |
| URL ký kho tệp | HMAC theo key + hạn + phương thức, khoá `STORAGE_SIGNING_SECRET` | `assets/infra/storage-signing.ts` |
| Link công khai gia công | Token HMAC theo tổ chức/mã đơn/chi nhánh, hạn 14 ngày | `tests/tenant/subcontract-public-link.test.ts` |
| Rate limit | Redis (Lua INCR+PEXPIRE), băm IP, `x-forwarded-for` theo số hop tin cậy; 40/44 route công khai + auth | `src/core/http/rate-limit.ts` |
| Tải lên | Kiểm MIME thật + kích thước, đọc thân có trần | `assets/domain/upload-content-rules.ts`, `api/v1/storage/[...key]` |
| SQL thô | 40 lời gọi `$queryRaw`/`$executeRaw` (tham số hoá theo tagged template); 2 `Unsafe` với chuỗi hằng | grep |
| Nhật ký kiểm toán | `audit_logs` (tenant), `platform_audit_logs` (nền tảng); `recordAuditLog` khi ghi quyết định quản trị | `src/modules/audit/`, `governance-matrix.ts` |
| Chuỗi cung ứng | gitleaks toàn lịch sử (có SHA256 pin), `npm audit` high, CodeQL JS/TS + Python | `.github/workflows/ci.yml`, `codeql.yml` |
| Header | HSTS 1 năm, nosniff, Referrer-Policy, X-Frame SAMEORIGIN, `poweredByHeader: false` | `next.config.ts` |

## 3. Kiến trúc phân quyền 4 tầng

| Tầng | Định danh thật | Kho quyền | Cổng kiểm | Trạng thái |
|---|---|---|---|---|
| 1. SaaS Mother (nền tảng) | Bản ghi `platform_operators` theo `user_id` (độc lập tổ chức) | 14 mã `N1–N8`, `N12–N17` (`platform-capability-catalog.ts`); `N9–N11` giữ chỗ | `requirePlatformContext` + `requirePlatformCapability` | Thực thi; 10 test `tests/platform` |
| 2. SaaS Ngành | Không có trong dữ liệu (không có `organization_type = INDUSTRY`, không có vai `industry_admin`) | Plugin code `organization/domain/industries/*` (thuật ngữ, taxonomy, preset) | — | **Không có quyền riêng**; chỉ tồn tại qua xem trước tầng/dev override (ARC-008) |
| 3. ChainOS | `organizations.type ∈ {CHAIN, FLOWER_NETWORK}`; quan hệ với cửa hàng qua `chain_partnerships` (ACTIVE) | Cùng 163 mã tổ chức; khoá công cụ chuỗi → chi nhánh (`tool-route-entitlement.ts`) | `requireTenantContext` (gồm `assertToolUnlocked`) + `requireCapability` | Thực thi; test `chain-*`, `branch-portal`, `partner-tool-unlock`, `coordinator-subcontract-*` |
| 4. StoreOS | Mọi tổ chức còn lại (`EXPERIENCE`, `SINGLE`, `STORE`) | 163 mã, 9 vai hệ thống + vai riêng | như trên | Thực thi |

Ba trục tách biệt đúng thiết kế: **RBAC** (mã năng lực) · **Entitlement** (gói, khoá công cụ — `core/entitlements`, `ENTITLEMENT_REQUIRED`) · **Governance** (ma trận quyết định, `layered-resolver`).

Thứ tự cắt quyền tổ chức (`src/core/rbac/permission-resolver.ts`):

```
role_capabilities (mặc định vai)  →  capability_overrides (ngoại lệ tổ chức)  →  TRẦN CỨNG (hằng trong mã, cắt sau cùng)
```

Vai riêng của tổ chức không bao giờ mở được mã có trần cứng (trần gọi tên vai hệ thống cụ thể).

## 4. Ma trận phân quyền toàn cục (Global Permission Matrix)

### 4.1 Tầng tổ chức — số mã mặc định theo nhóm × vai hệ thống

Sinh tự động từ `src/core/rbac/capability-catalog.ts` (163 mã). Ô = số mã của nhóm mà vai có ở lớp một (trước ngoại lệ tổ chức). Cột "Trần" = số mã có trần cứng.

| Nhóm | Mã | Trần | dieu_hanh | dieu_phoi | sale | product_manager | marketing | crm | customer_service | experience_user | cua_hang |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| access | 7 | 5 | 7 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| vision_run | 16 | 0 | 16 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| pricing_card | 28 | 3 | 28 | 26 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| config | 17 | 3 | 17 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| system | 8 | 7 | 8 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| org_member | 9 | 7 | 9 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| asset_job | 9 | 2 | 9 | 5 | 4 | 0 | 5 | 0 | 0 | 0 | 0 |
| vision | 6 | 3 | 6 | 3 | 1 | 0 | 3 | 0 | 0 | 0 | 0 |
| media | 7 | 3 | 7 | 4 | 3 | 0 | 4 | 0 | 0 | 0 | 0 |
| channel | 7 | 0 | 7 | 4 | 1 | 0 | 5 | 0 | 1 | 0 | 0 |
| product_pricing | 6 | 2 | 6 | 4 | 3 | 4 | 1 | 1 | 0 | 0 | 0 |
| ai_policy | 4 | 2 | 4 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| experience | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| order_operations | 16 | 5 | 16 | 9 | 5 | 0 | 0 | 1 | 2 | 0 | 1 |
| crm | 9 | 2 | 9 | 7 | 5 | 0 | 0 | 7 | 7 | 0 | 0 |
| ai_chat | 4 | 1 | 4 | 3 | 3 | 0 | 0 | 1 | 3 | 0 | 0 |
| market_intelligence | 3 | 1 | 3 | 2 | 1 | 0 | 2 | 0 | 0 | 0 | 0 |
| integration | 5 | 3 | 5 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Tổng** | **163** | **49** | **162** | **100** | **37** | **4** | **20** | **10** | **13** | **2** | **1** |

Trần cứng: 47 mã chỉ `dieu_hanh`; 1 mã `dieu_hanh + dieu_phoi`; 1 mã `dieu_hanh + cua_hang`.

Nhận xét:
- `dieu_hanh` có 162/163 mã — gần như siêu quản trị tổ chức; không có vai "chỉ đọc kiểm toán" tách riêng.
- `product_manager` chỉ 4 mã, toàn nhóm giá sản phẩm — vai gần như rỗng so với tên (ARC-016).
- `crm` và `customer_service` trùng nhãn "Chăm sóc khách hàng", quyền khác nhau (10 vs 13) (ARC-016).
- Sáu cặp chạy/duyệt tách rời (`SPLIT_CAPABILITY_PAIRS`) có test khoá bất biến.

### 4.2 Tầng nền tảng

| Mã | Tên | Người có |
|---|---|---|
| N1 | Xem mọi tổ chức (gồm xem trước tầng) | `platform_operators` được cấp bằng script `gan-van-hanh-nen-tang` |
| N2 | Duyệt yêu cầu nâng cấp | như trên |
| N3 | Nạp/hoàn credit | như trên |
| N4 | Usage & chi phí toàn hệ thống | như trên |
| N5 | Sức khoẻ hệ thống | như trên |
| N6 | Nhật ký xuyên tổ chức | như trên |
| N7 | Tạo tổ chức | như trên |
| N8 | Token tích hợp theo tổ chức | như trên |
| N12–N17 | Trường dữ liệu, duyệt đăng ký, legal hold, hàng đợi lỗi, khoá tích hợp theo tầng, chợ đối tác | như trên |

Theo HO_SO_BAN_GIAO §6: production chỉ có **một** người vận hành (`tuans2@dev.com`) giữ toàn bộ mã N — không có tách nhiệm vụ, không có tài khoản dự phòng (rủi ro "bus factor", ARC-002 liên quan).

### 4.3 Tầng chuỗi → cửa hàng

| Hành động của chuỗi trên cửa hàng | Cơ chế | Bằng chứng |
|---|---|---|
| Giao đơn gia công cho đối tác | `chain_partnerships` ACTIVE + module coordinator/greeting-card | `tests/tenant/coordinator-subcontract-guards.test.ts`, `subcontract-claim-race.test.ts` |
| Khoá/mở công cụ của chi nhánh | `settings` của tổ chức con, kiểm ở server (403 `ENTITLEMENT_REQUIRED`) | `partner-tool-unlock.test.ts`, `tool-route-entitlement.test.ts` |
| Khoá ma trận quản trị | `governance_matrix.locks`, `upperLockFor` | `tests/tenant/governance-matrix.test.ts` |
| Tạo tài khoản đối tác | Mật khẩu một lần ngẫu nhiên (AUD-009 đã sửa) | `docs/audit/08` §3 |

Đánh giá: PV — có test cách ly, nhưng chưa có đặc tả hình thức "chuỗi được đọc gì của cửa hàng" ở một chỗ; logic nằm rải trong coordinator/greeting-card.

## 5. So sánh quyền frontend và backend

| Khía cạnh | Frontend | Backend | Đánh giá |
|---|---|---|---|
| Khuôn/tầng | `tierOf()` dựa `organization_type` + khoá vai `platform_admin`/`industry_admin`/`flower_network_admin` | Không dùng khoá vai để cấp quyền | An toàn nhưng **không khớp từ vựng** — khoá vai UI không có trong `SYSTEM_ROLES` |
| Hiện/ẩn mục điều hướng | `nav-matrix.ts`, `nav-store.ts`… + `feature-locked-guard.tsx`, `tool-lock-guard.tsx` | `requireCapability` + `assertToolUnlocked` | Backend là chốt chặn thật — đúng nguyên tắc J5 |
| So khoá vai trong mã client | 35 chỗ `roleKey ===` (đa số badge/nametag/dev; `use-market-intelligence-data.ts` so `dieu_hanh` và **mặc định `true` khi lỗi mạng**) | API MI gác `V1`/`V2` | Không leo thang được (backend chặn), nhưng vi phạm luật #3 ở UI và fail-open hiển thị |
| Dev override | Cookie `smeos_dev_role` đổi khuôn UI (chỉ dev) | Ở `requirePlatformContext`: **cấp quyền thật** (chỉ dev) | ARC-003 |
| Xem trước tầng | Cookie `smeos_tier_preview`, cần `N1`, kiểm lại mỗi request | Chỉ đổi khuôn, không đổi quyền | Đúng thiết kế |

## 6. Đường truy cập trái phép / leo thang tiềm năng

| # | Kịch bản | Điều kiện | Kết luận |
|---|---|---|---|
| 1 | Người lạ đăng ký email `x@dev.com` → vào `/van-hanh`, đọc mọi tổ chức, nạp credit | Môi trường chạy `NODE_ENV ≠ production` và truy cập được từ Internet | **Có thể** — ARC-003 |
| 2 | Người lạ tự đặt cookie `smeos_dev_role={"roleKey":"platform_admin"}` | Như trên + có phiên đăng nhập bất kỳ | **Có thể** — ARC-003 |
| 3 | Đăng nhập bằng tài khoản seed công khai | Mật khẩu chưa xoay trên production | **Có thể** nếu ARC-002 chưa xử lý |
| 4 | Lỗi cách ly mới lọt lên production | CI đỏ trước bước tenant + autoDeploy | **Có thể** — ARC-001 |
| 5 | Client gửi `organization_id` trong body | — | Không thấy (grep chỉ ra `session/organization`, có kiểm thành viên) |
| 6 | Truy cập bản ghi tổ chức khác lộ tồn tại qua 403 | — | Không thấy (404 qua `ownedByTenant`); 403 chỉ dùng cho thiếu năng lực/gói |
| 7 | Gắn asset của tổ chức khác vào sản phẩm | — | Đã sửa (AGENT_RULES §14 #9; `product-image-asset-isolation.test.ts`) |
| 8 | Webhook giả mạo kích hoạt AI | — | Đã sửa (AUD-028) |

## 7. Khuyến nghị bảo mật (thứ tự)

1. ARC-001: chặn deploy khi CI đỏ; ruleset `main` bắt buộc 4 job.
2. ARC-002: xoay mật khẩu seed + CSDL, xác nhận; tạo tài khoản vận hành thứ hai, tách mã N theo nhiệm vụ.
3. ARC-003: xoá nhánh `@dev.com`/cookie trong `requirePlatformContext`, hoặc gác bằng cờ tường minh `ALLOW_DEV_PLATFORM_BYPASS=true` kèm kiểm `NODE_ENV === "development"`; thêm test platform cho cả hai đường.
4. ARC-004: bỏ `ignoreBuildErrors`.
5. ~~ARC-022: chuyển CSP sang chặn; thêm kiểm `Origin` cho route ghi có cookie~~ — xong 11–12/11/2026 (`origin-guard.ts`, `csp.ts`).
6. ARC-009: đưa lời gọi nhà cung cấp của worker qua một chính sách chung (đọc `ai_policies`/giấy phép từ DB trước khi gọi, hoặc proxy qua cổng TS).
7. Thuê pentest độc lập trước khi ký khách (đã có trong HO_SO_BAN_GIAO).
