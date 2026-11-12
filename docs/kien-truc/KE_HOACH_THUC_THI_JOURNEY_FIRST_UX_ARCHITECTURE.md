# ĐÁNH GIÁ TƯƠNG THÍCH & KẾ HOẠCH THỰC THI: Journey-First UX Architecture

> **Mã kế hoạch:** `PLAN-2026-JOURNEY-UX-01`  
> **Ngày phê duyệt PO:** 30/09/2026  
> **Tài liệu nguồn:** [`ALG_CORE_JOURNEY_FIRST_UX_ARCHITECTURE_FINAL.md`](../ALG_CORE_JOURNEY_FIRST_UX_ARCHITECTURE_FINAL.md)  
> **Hệ thống đích:** `floraos-core` — Next.js 15 + Prisma/PostgreSQL + Clean Architecture  
> **Trạng thái hệ thống tại thời điểm phân tích:** 1.348/1.348 test xanh · 283/283 tenant test xanh · tsc sạch 100%

---

## PHẦN A — PHÂN TÍCH TÍNH ĐỒNG BỘ VÀ TƯƠNG THÍCH

### 1. TÓM TẮT TÀI LIỆU ĐẦU VÀO

Tài liệu `ALG_CORE_JOURNEY_FIRST_UX_ARCHITECTURE_FINAL.md` đề xuất một **triết lý UX Journey-First** thống nhất cho cả 3 role cấp cao (`Platform Admin`, `Store Admin`, `Điện hoa Admin`) với các nguyên tắc cốt lõi:

| # | Nguyên tắc | Mô tả |
|---|---|---|
| **J1** | Journey-first | Trang chủ hỏi "Bạn muốn làm gì?" — không lấy module làm trung tâm |
| **J2** | Progressive Disclosure | Chỉ hiển thị lựa chọn phù hợp bước hiện tại |
| **J3** | Kết quả → Việc tiếp theo | Mỗi kết quả luôn có Next Actions |
| **J4** | AI trong hành trình | AI nằm trong chức năng, không tách riêng |
| **J5** | UX ≠ Quyền | `role_ux` không tự mở quyền, RBAC vẫn kiểm soát |
| **J6** | Action Contract 7 bước | Chọn → Input → Xác nhận → Tiến hành → Xử lý → Kết quả → Tiếp theo |
| **J7** | Journey Engine chung | Cả 3 role dùng cùng mô hình dữ liệu journey |

---

### 2. ĐÁNH GIÁ TƯƠNG THÍCH VỚI HỆ THỐNG HIỆN TẠI

#### 2.1. ✅ CÁC ĐIỂM TƯƠNG THÍCH CAO (Không xung đột)

| Điểm | Hiện trạng hệ thống | Đánh giá |
|---|---|---|
| **Mô hình 3 Role cấp cao** | Đã có: `platform_admin`, `store_admin`, `flower_network_admin` (`src/modules/organization/domain/role-ux-catalog.ts`) | ✅ **Khớp 100%** — tài liệu Journey-First dùng cùng 3 role đã triển khai |
| **Scope PLATFORM/STORE/FLOWER_NETWORK** | Đã có trong `prisma/schema.prisma` enum `organization_type` và `capability_scope` | ✅ **Khớp 100%** — đã migrate xong 30/09 |
| **UX ≠ Quyền (§2.5)** | Nguyên tắc kế thừa `03b-role-ux.md` §2.2: "Vai trải nghiệm ≠ Vai phân quyền ≠ Quyền" | ✅ **Khớp 100%** — đã là luật bất biến |
| **Trang chủ theo vai** | `src/app/(app)/page.tsx`: switch `roleUx?.homepage` → component tương ứng | ✅ **Tương thích** — cơ chế routing đã sẵn sàng, chỉ cần đổi component |
| **Điều hướng theo vai** | `src/components/layout/nav-model.ts`: `buildNav(can, roleUx)`, `navPriority` per role | ✅ **Tương thích** — engine điều hướng đã hỗ trợ vai, cần mở rộng |
| **16 vai chuyên môn bảo tồn (§12)** | 16 vai trong `ROLE_UX_CATALOG` — 8 AVAILABLE, 8 IN_DEVELOPMENT | ✅ **Khớp** — tài liệu nói rõ "Các role chuyên môn không bị loại bỏ" |
| **Entitlement Gateway (§15)** | `src/core/entitlements/entitlement-service.ts`: `requireFeatureAccess()` 2 lớp | ✅ **Đã xây** — phân tách Authorization vs Entitlement |
| **Compatibility Bridge** | `src/modules/organization/domain/role-compatibility.ts`: alias `ONE_STORE↔STORE`, `CHAIN↔FLOWER_NETWORK`, `store_manager↔store_admin` | ✅ **Đã xây** — tương thích ngược không gián đoạn |

#### 2.2. ⚠️ CÁC ĐIỂM CẦN MỞ RỘNG / NÂNG CẤP (Tương thích nhưng chưa đủ)

| # | Yêu cầu Journey-First | Hiện trạng | Đánh giá | Mức độ tác động |
|---|---|---|---|---|
| **G1** | Trang chủ phải là "Bạn muốn làm gì?" — ChoiceGrid (§5.3, §7, §10) | Dashboard hiện tại là KPI/command center (store-growth-center, flower-network-command-center, sales-workspace…) | ⚠️ **Cần đổi triết lý trang chủ** — từ dashboard-first sang journey-first | **CAO** |
| **G2** | Journey Engine + Journey State Machine (§17, §18) | **Không tồn tại** — chưa có model/component/state nào cho journey step tracking | ⚠️ **Cần xây mới hoàn toàn** — core domain mới | **CAO** |
| **G3** | Store Action Workspace thống nhất (§8) | Mỗi module có workspace riêng (`SalesWorkspace`, `CrmWorkspace`…), không theo mẫu 7 bước | ⚠️ **Cần wrapper unifying** — bọc các workspace hiện có vào Action Contract | **TRUNG BÌNH** |
| **G4** | Combo chức năng + AI Workflow đề xuất (§7.2, §7.3) | Creative Studio có chuỗi 14 chặng, nhưng không có combo framework chung | ⚠️ **Cần xây mới** — workflow composition engine | **CAO** |
| **G5** | Next Actions trên mọi kết quả (§2.3) | Một số nơi có (Creative Studio chặng → chặng), nhưng không nhất quán | ⚠️ **Cần bổ sung** — component `NextActions` chuẩn hóa | **TRUNG BÌNH** |
| **G6** | Shell giao diện chung (§4) — Journey Workspace thay vì module layout | Hiện tại là sidebar-first: `desktop-nav.tsx` + content area | ⚠️ **Cần đổi** — sidebar thành lớp hỗ trợ, workspace thành lớp chính | **TRUNG BÌNH** |
| **G7** | Platform Admin Journey home (§5.3) — 10 lựa chọn ChoiceGrid | Console `/van-hanh` hiện là dashboard vận hành đơn giản | ⚠️ **Cần xây** — Platform Journey Home | **TRUNG BÌNH** |
| **G8** | Điện hoa Admin 8 lựa chọn (§11) + Sales/Coordination Workspace (§12, §13) | `FlowerNetworkCommandCenter` hiện là 4-tier dashboard | ⚠️ **Cần refactor** — thêm lớp ChoiceGrid trước dashboard | **TRUNG BÌNH** |

#### 2.3. 🔴 CÁC ĐIỂM XUNG ĐỘT CẦN GIẢI QUYẾT

| # | Xung đột | Chi tiết | Đề xuất giải pháp |
|---|---|---|---|
| **C1** | **Dashboard-first vs Journey-first** | Tài liệu §22.1 cấm "Dashboard-first" nhưng hệ thống đã xây 7 dashboard (StoreGrowthCenter, FlowerNetworkCC, SalesWorkspace, CrmWorkspace, ProductManagerWorkspace, MarketingWorkspace, CustomerServiceWorkspace). Xóa hết sẽ phá vỡ PO decisions đã phê duyệt. | **Giải pháp hòa giải:** Thêm lớp **Journey Selection** TRƯỚC dashboard. Dashboard trở thành một "workspace" trong journey, không phải điểm bắt đầu. Khi user đã chọn "Xem tình hình cửa hàng" → mới mở dashboard. |
| **C2** | **Sidebar navigation hiện tại** | Tài liệu §21 nói sidebar là "lớp hỗ trợ", không phải cách sử dụng chính. Nhưng `nav-model.ts` với 27 entries + 6 nhóm K5 đã qua PO duyệt (UX-0, K5). | **Giải pháp:** Sidebar giữ nguyên cho power users. Journey home là entry point MẶC ĐỊNH cho user mới. Cho phép toggle giữa 2 mode. |
| **C3** | **store_admin homepage conflict** | Tài liệu Journey-First gọi là "Store Admin" → ChoiceGrid (§7). Kế hoạch Role Capability đã xây `StoreGrowthCenter` (PO duyệt 30/09). | **Giải pháp:** ChoiceGrid là WRAPPER — "Bạn muốn làm gì?" → chọn "Xem tình hình" → StoreGrowthCenter. Chọn "Ra mắt sản phẩm" → combo workflow. |
| **C4** | **RoleUxHomepage enum** | Tài liệu yêu cầu homepage mới kiểu `JOURNEY_SELECTION`. Enum hiện tại chỉ có dashboard-specific values. | **Giải pháp:** Thêm giá trị `STORE_JOURNEY_HOME`, `NETWORK_JOURNEY_HOME`, `PLATFORM_JOURNEY_HOME` vào enum. |
| **C5** | **Bảo toàn 12 specialist workspaces (KE_HOACH §1.2 mục 4)** | Kế hoạch Role Capability cam kết "bảo tồn 100% các vai chuyên môn" nhưng Journey-First muốn đổi triết lý workspace. | **Giải pháp:** Specialist workspaces giữ nguyên là DESTINATION trong journey. Journey engine WRAP chúng, không thay thế. |

---

### 3. MA TRẬN TƯƠNG THÍCH TỔNG HỢP

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    MỨC ĐỘ TƯƠNG THÍCH TỔNG THỂ                      │
│                                                                      │
│  ✅ KHỚP HOÀN TOÀN (Nền tảng đã sẵn sàng):                         │
│     • 3 Top-Level Roles + 16 vai chuyên môn                         │
│     • Scope PLATFORM/STORE/FLOWER_NETWORK                           │
│     • UX ≠ Quyền, RBAC capabilities                                 │
│     • Entitlement Gateway 2 lớp                                      │
│     • Compatibility Bridge tương thích ngược                         │
│     • Routing theo vai (page.tsx switch)                              │
│     • Điều hướng theo vai (nav-model.ts)                             │
│                                                                      │
│  ⚠️ CẦN MỞ RỘNG (Tương thích nhưng thiếu):                         │
│     • Journey Engine (domain + state machine)                        │
│     • Journey Home ChoiceGrid components                             │
│     • Action Contract 7 bước (wrapper components)                    │
│     • Combo/AI Workflow composition                                  │
│     • NextActions chuẩn hóa                                          │
│     • Platform Admin Journey                                         │
│                                                                      │
│  🔴 XUNG ĐỘT CẦN HÒA GIẢI:                                        │
│     • Dashboard-first vs Journey-first                               │
│     • Sidebar navigation role                                        │
│     • Homepage enum extension                                        │
│                                                                      │
│  ĐÁNH GIÁ: 65% tương thích — 25% cần xây thêm — 10% cần hòa giải   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## PHẦN B — CHIẾN LƯỢC HÒA GIẢI KIẾN TRÚC

### Nguyên tắc vàng: **WRAP, không REPLACE**

> Tài liệu Journey-First là **triết lý UX cấp cao**. Hệ thống hiện tại đã xây **cơ sở hạ tầng vững chắc** (1.348 tests, RBAC, tenant isolation, 8 dashboards, 16 vai). Cách tiếp cận an toàn nhất là:
>
> **Journey Engine BỌC các module hiện có → Dashboard trở thành một workspace trong journey → Sidebar giữ nguyên cho power users → ChoiceGrid là entry point mới.**

```text
TRƯỚC (Dashboard-first):
  Login → Vai → Dashboard → Sidebar → Module → Chức năng

SAU (Journey-first + bảo toàn hệ thống):
  Login → Vai → Journey Home ("Bạn muốn làm gì?")
                 ├── "Xem tình hình" → Dashboard hiện có
                 ├── "Ra mắt sản phẩm" → Combo Workflow
                 ├── "Tạo đơn hàng" → Single Action
                 ├── "Upload ảnh" → AI Workflow đề xuất
                 └── Sidebar vẫn truy cập trực tiếp ✓
```

---

## PHẦN C — KẾ HOẠCH THỰC THI CHI TIẾT

### TỔNG QUAN 7 GIAI ĐOẠN

- **GĐ-0:** Phê duyệt PO & Khóa hợp đồng kiến trúc (Đã được PO phê duyệt 30/09/2026)
- **GĐ-1:** Journey Engine — Domain & Components Kit
- **GĐ-2:** Journey Home cho 3 Role (Store Admin, Điện hoa Admin, Platform Admin)
- **GĐ-3:** Action Contract 7 bước & NextActions
- **GĐ-4:** Combo Workflow & AI Suggest
- **GĐ-5:** Shell & Navigation Upgrade
- **GĐ-6:** Kiểm thử toàn diện & Hoàn thiện tài liệu

---

### GĐ-0: PHÊ DUYỆT PO & KHÓA HỢP ĐỒNG KIẾN TRÚC (ĐÃ XONG)

PO đã chốt các phương án giải quyết 6 câu hỏi:
- **Q-JF1:** WRAP — dashboard trở thành workspace trong journey.
- **Q-JF2:** Có toggle "Chế độ chuyên gia" lưu `localStorage`.
- **Q-JF3:** Client-side state machine cho MVP, không cần migration CSDL.
- **Q-JF4:** ChoiceGrid là entry point mặc định, "Xem tình hình" mở dashboard.
- **Q-JF5:** Platform Admin Journey Home xây 10 ô kết nối route `/van-hanh/*`.
- **Q-JF6:** Áp dụng theo các giai đoạn kiểm soát chặt chẽ với test đầy đủ.

---

### GĐ-1: JOURNEY ENGINE — DOMAIN & COMPONENTS KIT

1. **Domain Layer:**
   - `src/modules/journey/domain/journey-model.ts`: Định nghĩa `JourneyDefinition`, `JourneyStepDefinition`, `JourneyStepStatus`, `JourneyInputType`.
   - `src/modules/journey/domain/journey-state.ts`: State machine thuần (`advanceStep`, `retryStep`, `skipStep`, `resetJourney`).
   - `src/modules/journey/domain/journey-catalog.ts`: Danh mục tĩnh `STORE_JOURNEYS`, `PLATFORM_JOURNEYS`, `NETWORK_JOURNEYS`.
   - Unit tests: `journey-model.test.ts`, `journey-state.test.ts`, `journey-catalog.test.ts`.

2. **Components Kit (`src/components/journey/`):**
   - `choice-grid.tsx`: Lưới lựa chọn "Bạn muốn làm gì?".
   - `action-card.tsx`: Thẻ hành động icon + nhãn + mô tả + tag combo/AI.
   - `journey-header.tsx`: Header có nút "← Quay lại trang chủ" + breadcrumb.
   - `journey-progress.tsx`: Thanh tiến trình step-by-step.
   - `journey-shell.tsx`: Bọc layout không gian làm việc hành trình.
   - `next-actions.tsx`: Khối "Việc bạn có thể làm tiếp theo".
   - `workflow-preview.tsx`: Xem trước các bước của Combo.

---

### GĐ-2: JOURNEY HOME CHO 3 ROLE

- `src/components/dashboard/store-journey-home.tsx`: Bố cục 12 ô lựa chọn cho cửa hàng, tích hợp "Xem tình hình" bọc `StoreGrowthCenter`.
- `src/components/dashboard/network-journey-home.tsx`: Bố cục 8 ô lựa chọn cho điện hoa, tích hợp bọc `FlowerNetworkCommandCenter`.
- `src/components/dashboard/platform-journey-home.tsx`: Bố cục 10 ô lựa chọn cho Console Vận hành.
- Sửa `role-ux-catalog.ts` và `src/app/(app)/page.tsx` để điều hướng chuẩn xác.

---

### GĐ-3: ACTION CONTRACT & NEXT ACTIONS

- `src/components/journey/action-contract-wrapper.tsx`: Wrapper 7 bước (Chọn → Nhập → Xác nhận → Tiến hành → Xử lý → Kết quả → Tiếp theo).
- `src/modules/journey/domain/next-actions-registry.ts`: Đăng ký các Next Action cho từng đầu ra nghiệp vụ.

---

### GĐ-4: COMBO WORKFLOW & AI SUGGEST

- `src/modules/journey/domain/workflow-composer.ts`: Hợp nhất các bước đơn thành chuỗi combo.
- `src/modules/journey/domain/ai-journey-suggest.ts`: AI đề xuất lộ trình xử lý khi người dùng tải ảnh/nhập dữ liệu.

---

### GĐ-5: SHELL & NAVIGATION UPGRADE

- Nâng cấp `src/app/(app)/layout.tsx` và `src/components/layout/nav-model.ts` hỗ trợ thu gọn sidebar khi ở trong Journey flow và lưu trạng thái chuyển đổi chế độ chuyên gia.

---

### GĐ-6: KIỂM THỬ TOÀN DIỆN & TÀI LIỆU (ĐÃ XONG)

- [x] Kiểm thử Unit (`npm test`): **1.367 / 1.367 tests xanh** (167/167 files).
- [x] Kiểm thử Cách ly Tenant (`npm run test:tenant`): **283 / 283 tests xanh** (36/36 files).
- [x] Kiểm tra TypeScript Typecheck (`npx tsc --noEmit`): **Sạch 100%** (0 lỗi).
- [x] Kiểm chuẩn UX Lint (`npm run lint:ux -- --check`): **0 vi phạm**.
- [x] Đồng bộ tài liệu SSOT (`npm run check:docs`): **Khớp 100%**.
- [x] Cập nhật SSOT `03b-role-ux.md`, `TRANG_THAI.md`, `00-DOCUMENTATION-REGISTRY.yaml`, `AGENTS.md`, Screen Contracts README.

---

## PHẦN D — KẾT QUẢ NGHIỆM THU TOÀN DIỆN (100% HOÀN TẤT)

| Giai đoạn | Nội dung thực thi | Trạng thái | Kiểm chứng |
|---|---|:---:|---|
| **GĐ-0** | Phê duyệt PO & Khóa hợp đồng kiến trúc | **XONG** | PO duyệt 30/09/2026 (`D-JUX`) |
| **GĐ-1** | Journey Engine Domain & Bộ UI Kit | **XONG** | 28/28 unit tests xanh, 0 UX lint |
| **GĐ-2** | 3 Trang chủ Journey Home (Store, Network, Platform) | **XONG** | `page.tsx` + `role-ux-catalog.ts` |
| **GĐ-3** | Action Contract 7 bước & NextActions Registry | **XONG** | `ActionContractWrapper` + registry |
| **GĐ-4** | Combo Workflow & AI Suggest (luật tham vấn PO) | **XONG** | `WorkflowPreview` + composer |
| **GĐ-5** | Nâng cấp Shell & Chế độ Chuyên gia linh hoạt | **XONG** | `localStorage` persistence |
| **GĐ-6** | Kiểm thử Toàn diện & Đồng bộ Tài liệu SSOT | **XONG** | 1.367 tests xanh, 283 tenant test xanh |
