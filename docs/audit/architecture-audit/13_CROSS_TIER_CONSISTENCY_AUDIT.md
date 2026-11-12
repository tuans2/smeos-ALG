# 13 — Audit nhất quán xuyên 4 tầng (Giai đoạn 4)

> Câu hỏi: bốn tầng **SaaS Mẹ → SaaS Ngành → ChainOS → StoreOS** có được biểu diễn **cùng một cách** ở mọi trục của hệ thống không, và tầng trên có thực sự quản được tầng dưới như thiết kế (`ALG_4_TIER_ARCHITECTURE_AND_NAVIGATION_SSOT.md`, `.agents/standards/smeos/01-tier-governance.md`) hay không.
> Phương pháp: với mỗi trục, đọc mã nơi tầng được xác định và nơi quyết định được áp; so sánh giữa các trục. Phát hiện mới đánh số `ARC-033…ARC-040` (bổ sung vào `08`).

## 1. Ma trận đối chiếu: tầng × trục

Ký hiệu: ✅ có và áp thật · 🟡 có một phần / chỉ lưu · ❌ không có · ⚠️ có nhưng biểu diễn khác các trục còn lại.

| Trục | Mẹ | Ngành | Chuỗi | Cửa hàng | Bằng chứng |
|---|---|---|---|---|---|
| **Danh tính tầng** (hệ thống biết người/tổ chức thuộc tầng nào) | ✅ `platform_operators` | ❌ không có loại tổ chức / vai | ✅ `organizations.type` | ✅ mặc định | `core/governance/tier-of.ts`, enum `organization_type` |
| **Quan hệ cha–con** | — | ⚠️ chuỗi `settings.industry` (JSON) | ⚠️ 3 mô hình song song (§3) | ⚠️ con qua `chain_partnerships` **hoặc** là dòng `chain_branches` | §3 |
| **RBAC** | ✅ 14 mã `N*` | ❌ | ✅ 163 mã | ✅ 163 mã | `platform-capability-catalog.ts`, `capability-catalog.ts` |
| **Phạm vi quyền** (tổ chức / chi nhánh) | — | — | 🟡 `scope` tính ra rồi **bỏ** | 🟡 như trên | §4 |
| **Gói dịch vụ** | — | — | 🟡 `FLOWER_NETWORK` theo loại tổ chức | 🟡 mặc định `PRO`; **không route nào kiểm** ngoài Tích hợp | §5 |
| **Khoá công cụ** (tầng trên khoá tầng dưới) | — | ❌ | ✅ chuỗi → chi nhánh | ✅ nhận khoá | `tool-route-entitlement.ts` — §6 |
| **Ma trận quản trị** (6 hệ thống) | ✅ `platform_settings` + khoá dựng sẵn | ❌ | ✅ `settings.governance_matrix` | ✅ ghi đè trong giới hạn | `governance-decisions.ts` — 3/6 áp vào luồng tiền |
| **Khoá thông báo** | ✅ `GLOBAL` | ⚠️ `scope_id` = id tổ chức | ✅ id tổ chức chuỗi | ✅ | `notification/domain/cascading-policy.ts` |
| **Khoá tích hợp** | ✅ `GLOBAL` (N16) | ⚠️ `scope_id` = `industry:<key>` | ✅ id tổ chức chuỗi | ✅ | `integration-hub/domain/integration-governance.ts` |
| **Điều hướng** | ✅ `nav-mother.ts` | 🟡 `nav-industry.ts` (chỉ qua xem trước) | ✅ `nav-chain.ts` | ✅ `nav-store.ts` | `components/layout/nav/` — §7 |
| **Trang** | ✅ 22 trang `/van-hanh` | ❌ trang riêng (dùng `/van-hanh/*` của Mẹ) | ✅ `/dieu-phoi/*` | ✅ | §7 |
| **Sự kiện thông báo** | ✅ | ⚠️ gửi tới vai `industry_admin` không tồn tại | 🟡 chưa nối | ✅ 6 sự kiện đơn | `notification/domain/events/*` |
| **Xem trước tầng** | ✅ (cần `N1`) | ✅ khuôn | ✅ khuôn | ✅ khuôn | `platform/domain/tier-preview.ts` |
| **Kiểm thử cách ly** | ✅ `tests/platform` (10) | ❌ | ✅ `chain-*`, `branch-portal`, `partner-tool-unlock` | ✅ 137 tệp tenant | `tests/` |

**Kết luận tổng:** chỉ **Mẹ** và **Cửa hàng** nhất quán trên mọi trục. **Chuỗi** chạy được nhưng quan hệ cha–con và phạm vi chi nhánh không thống nhất. **Ngành** không tồn tại như một tầng thật — mỗi trục mô phỏng nó theo một cách khác nhau (hoặc bỏ qua).

## 2. Định nghĩa tầng: một hàm, hai nguồn dữ liệu

- `tierOf(organizationType, role)` dùng **cả loại tổ chức lẫn khoá vai** (`industry_admin`, `platform_admin`, `flower_network_admin`, `role.group`). Các khoá vai này **không có trong `SYSTEM_ROLES`** và bảng `roles` **không có cột `group`** → ở production, nhánh theo vai chỉ chạy khi có cookie xem trước tầng/dev.
- `organizationTierOf(type)` (dùng cho dữ liệu) chỉ trả `CHAIN`/`STORE`.
- Hệ quả: "tầng" ở giao diện và "tầng" ở dữ liệu là hai khái niệm; khớp nhau với Chuỗi/Cửa hàng, lệch với Ngành và Mẹ (Mẹ đi đường `platform_operators`, không qua `tierOf` ở backend).

## 3. Quan hệ Chuỗi → Cửa hàng: ba mô hình song song — **ARC-034 (P1)**

| Mô hình | Bảng | Cửa hàng là | Dùng cho | Quản trị tầng trên áp được? |
|---|---|---|---|---|
| A. Đối tác là một tenant | `chain_partnerships` (`partnership_type`: SUBCONTRACTOR · FRANCHISE · **BRANCH**) | Tổ chức riêng | Gia công, khoá công cụ, ma trận, khoá thông báo/tích hợp | ✅ (bản ghi ACTIVE **sớm nhất**) |
| B. Chi nhánh là một dòng trong tenant chuỗi | `chain_branches` + `memberships.chain_branch_code` (vai `cua_hang`) | Dòng dữ liệu của tổ chức chuỗi | Điều phối đơn, khu vực giao, Zalo/Telegram chi nhánh, `/cua-hang` | ❌ — không có "tổ chức con" nên không có tầng Cửa hàng để áp khoá/ma trận |
| C. Chi nhánh nội bộ | `branches` + `memberships.branch_id` | Đơn vị con trong một tổ chức | Giá theo chi nhánh, lọc thư viện kho | Không thuộc mô hình tầng |

Rủi ro:
- Cùng chữ "chi nhánh" mang ba nghĩa; `chain_partnerships.partnership_type = "BRANCH"` còn là nghĩa thứ tư.
- Một cửa hàng thuộc mô hình B **không nhận** khoá công cụ, ma trận Chuỗi, khoá thông báo/tích hợp như cửa hàng mô hình A — hành vi quản trị phụ thuộc cách cửa hàng được tạo.
- Đối tác thuộc nhiều chuỗi: cả ba bộ phân giải (`governance-decisions-repository.ts` ×2, `integration-hub/infra/governance-repository.ts`) đều **lặng lẽ chọn chuỗi sớm nhất** — nhất quán nhưng không có quy tắc thành văn, và logic này bị chép ở 3 nơi (**ARC-038**, P2).

## 4. Phạm vi quyền bị bỏ qua — **ARC-035 (P1 cho Chuỗi/Enterprise)**

- Thiết kế: quyền là bộ ba `(vai, mã, phạm vi)`, `CapabilityScope = ORGANIZATION | BRANCH | STORE | FLOWER_NETWORK` (`permission-resolver.ts`; `src/core/rbac/README.md`).
- Thực tế: `resolve-session.ts` dựng `capabilities: new Set(grants.map((grant) => grant.code))` — **phạm vi bị bỏ**. `requireCapability` chỉ kiểm mã. Chuỗi `"BRANCH"` chỉ xuất hiện ở khai báo kiểu.
- Giới hạn theo chi nhánh hiện chỉ có ở những use-case tự đọc `ctx.branchId` (giá, thư viện kho, job) hoặc `chain_branch_code` (cổng `/cua-hang`) — không phải luật chung.
- Hệ quả: nhân viên được gán `branch_id` vẫn có quyền đọc/ghi phạm vi **toàn tổ chức** ở mọi mô-đun không tự lọc (đơn hàng, khách hàng, sản phẩm…). PV — chưa kiểm từng mô-đun.

## 5. Gói dịch vụ không được thực thi — **ARC-033 (P1)**

- `core/entitlements/entitlement-service.ts` định nghĩa 5 gói (`EXPERIENCE`, `STARTER`, `PRO`, `FLOWER_NETWORK`, `ENTERPRISE`) và `requireFeatureAccess()`.
- `grep` toàn `src/`: **không route/use-case nào gọi `requireFeatureAccess` hay `hasPlanEntitlement`**. Chỉ `integration-hub/infra/org-profile.ts` đọc `PLAN_FEATURES` (cho danh mục tích hợp).
- `resolvePlanFromOrg`: tổ chức không có `credit_plan` → **`PRO`** ("Mặc định gói đầy đủ cho các tổ chức cửa hàng chuẩn").
- Hệ quả: ngoài Tích hợp, mọi tính năng trả phí (studio sáng tạo, video, giọng nói, chat AI bán hàng, nghiên cứu thị trường…) chỉ được chặn bởi RBAC và credit — không có phân tầng gói thương mại. Tài liệu (`standards/smeos/01` §3 "Gói dịch vụ ✅") ghi là đã có.

## 6. Khoá công cụ chuỗi → chi nhánh — **ARC-037 (P2)**

`TOOL_ROUTE_RULES` (9 công cụ): 4 công cụ khoá cả trang và API (`creative-studio`, `catalog`, `video`, `market-intel`) — 1 công cụ (`system-optimizer`) trỏ tới trang **không tồn tại** — và 4 công cụ **chỉ khoá trang, không khoá API**:

| Công cụ | Trang khoá | API vẫn mở |
|---|---|---|
| `greeting-card` | `/the-chao` | `/api/v1/greeting-card/*` |
| `scan-photo` | `/tai-anh` | `/api/v1/vision/*`, `/api/v1/assets/*` |
| `content` | `/noi-dung` | `/api/v1/content-engine/*` (cố ý — nợ #185c) |
| `templates` | `/kho-templates` | `/api/v1/template-overrides/*` |

Chi nhánh bị khoá vẫn gọi được API trực tiếp. Mức P2 (cần có phiên hợp lệ + mã năng lực; không xuyên tenant).

## 7. Điều hướng ↔ quyền ↔ trang

| Kiểm | Kết quả |
|---|---|
| Liên kết nav trỏ tới trang tồn tại | Mẹ: 1 liên kết hỏng `/van-hanh/san-pham`; Cửa hàng: `/cong-cu/toi-uu-he-thong` hỏng; Chuỗi, Ngành: đủ |
| Nav lọc theo mã quyền | Chuỗi 23, Ngành 18, Cửa hàng 30 mục có `capability`; **Mẹ: 0** — người vận hành chỉ có một phần mã N vẫn thấy mọi mục, bấm vào thì API trả 403 (**ARC-039**, P3) |
| Trang console tự kiểm mã N | 22/22 trang chỉ dựa layout "là người vận hành" + API kiểm mã ở use-case (35/36 route; `platform/notification/events` chỉ cần là người vận hành, dữ liệu tĩnh) — chấp nhận được |
| Nav Ngành | 3 liên kết vào `/van-hanh/*` (nganh, truong-du-lieu, du-lieu) — người dùng tổ chức không phải operator sẽ bị layout `(platform)` đẩy về `/` |

## 8. Tầng Ngành: ba cách biểu diễn — **ARC-036 (P2)**, gộp với ARC-008

| Hệ thống | Ngành được biểu diễn bằng | Ai đặt |
|---|---|---|
| Ma trận quản trị | Không có | — |
| Khoá tích hợp | `scope_id = "industry:<key>"`, khoá ngành = `organizations.settings.industry` | Mẹ (N16) |
| Khoá thông báo | `scope_id` = id tổ chức (không tổ chức nào là Ngành) | Không ai đặt được đúng nghĩa |
| Sự kiện thông báo | `roleKey: "industry_admin"` | Không người nhận |
| Plugin | `organization/domain/industries/*.ts` (thuật ngữ, taxonomy, preset giá) | Mã nguồn |
| Điều hướng | `nav-industry.ts` | Chỉ qua xem trước |

## 9. Tổng hợp phát hiện giai đoạn 4

| ID | Mức | Phát hiện |
|---|---|---|
| ARC-033 | **P1** | Gói dịch vụ không được thực thi ngoài Tích hợp; mặc định `PRO` |
| ARC-034 | **P1** | Ba mô hình Chuỗi → Cửa hàng; mô hình `chain_branches` nằm ngoài quản trị tầng |
| ARC-035 | **P1** | Phạm vi quyền (`BRANCH`…) bị bỏ khi dựng `TenantContext` |
| ARC-036 | P2 | Tầng Ngành biểu diễn khác nhau giữa tích hợp, thông báo, ma trận |
| ARC-037 | P2 | Khoá công cụ chỉ khoá trang với 4 công cụ; 1 công cụ trỏ trang không tồn tại |
| ARC-038 | P2 | Logic "chuỗi cha" chép ở 3 nơi, chọn ngầm chuỗi sớm nhất |
| ARC-039 | P3 | Nav Mẹ không lọc theo mã N; 2 liên kết nav hỏng |
| (ARC-008) | P1 | Đã có — tầng Ngành không có dữ liệu, 3/6 ma trận chưa áp |
| (ARC-016) | P2 | Đã có — hai bộ từ vựng vai |

## 10. Điều kiện để kiến trúc 4 tầng được coi là "nhất quán"

1. Một định nghĩa tầng dựa trên dữ liệu (không dựa khoá vai giao diện).
2. Một mô hình quan hệ cha–con (PO chọn: cửa hàng luôn là tenant, hoặc chính thức hoá "chi nhánh là dòng" kèm cách áp quản trị).
3. Một biểu diễn tầng Ngành dùng chung cho ma trận, thông báo, tích hợp (hoặc bỏ hẳn khỏi cả ba).
4. Phạm vi quyền được mang vào `TenantContext` và kiểm ở repository như `organization_id`.
5. Gói dịch vụ được kiểm ở biên cho mọi tính năng trả phí.
6. Khoá công cụ phủ cả API của công cụ.
7. Bộ test đối chiếu tầng: mỗi trục × mỗi tầng một ca thử.
