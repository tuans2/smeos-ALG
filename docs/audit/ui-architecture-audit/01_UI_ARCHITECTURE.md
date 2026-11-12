# A — UI Architecture Assessment

Điểm miền: **2 / PARTIAL**. Trạng thái dùng: Không triển khai · Một phần · Có nhưng bất nhất · Đã triển khai & kiểm chứng · Không áp dụng.

## A1. Định nghĩa kiến trúc UI

| Hạng mục | Trạng thái | Bằng chứng | Khoảng trống / tác động |
|---|---|---|---|
| Tài liệu kiến trúc UI tổng thể | Có nhưng bất nhất | `docs/dac-ta/04-frontend-architecture.md` (REGISTRY dòng 158) và `docs/ui-ux/UI_FOUNDATION_ARCHITECTURE.md` (mô hình 6 lớp L1–L6) | Hai tài liệu không tham chiếu nhau; `UI_FOUNDATION_ARCHITECTURE.md` không có trong REGISTRY. Agent đọc 04 sẽ không biết lớp L1–L6. |
| Quan hệ UI ↔ nghiệp vụ ↔ dữ liệu | Đã triển khai (một phần kiểm chứng) | 04 §3–§5: Server Component đọc qua use-case, client chỉ ẩn/hiện theo `can()`; `CLAUDE.md` NN#4 (domain không import Prisma) | Kiến trúc backend có cổng (`test:tenant`, route-capability-guard). Phía UI **không có cổng tương đương** (xem A1-c). |
| Server Component là mặc định | Có nhưng bất nhất | 04 §3 “Server Component là mặc định”; thực tế **76/105 `page.tsx` bắt đầu bằng `"use client"`**; 149 tệp `.tsx` gọi `fetch("/api…")` | Lệch chuẩn đã ghi; dữ liệu đi vòng qua HTTP, nhân bản trạng thái loading/lỗi ở từng màn. |
| Không hard-code vai trong UI | Có nhưng bất nhất | 04 §5 “Không hard-code `role === 'dieu_hanh'`”; `src/app/(app)/san-pham/page.tsx:56-60` dùng `session.roleKey === "dieu_hanh" \|\| "store_admin"`; `src/app/(app)/page.tsx:51` | Vi phạm luật đã ghi (và tinh thần `CLAUDE.md` NN#3). Ảnh hưởng: vai mới/khác ngành không thấy chức năng dù có capability. |
| Ranh giới import của UI | Một phần | `scripts/check-layer-boundaries.ts` tồn tại nhưng **không có trong `ci.yml`** và không quét `src/components`; `src/components/profiles/business-profile-form.tsx:6` import type từ `@/modules/profiles/infra/...` | Rò kiểu dữ liệu từ `infra/` lên UI; đổi repository có thể vỡ UI. |
| Mẫu kiến trúc frontend thống nhất | Có nhưng bất nhất | 04 §2 cây thư mục liệt kê `anh-marketing/`, `components/job/`, `components/product/`, `lib/api-client.ts`, `lib/use-job-stream.ts` | Các đường dẫn này **không tồn tại** (thực tế: `src/lib/api.ts`, 40+ thư mục component theo module). Tài liệu SSOT lỗi thời. |
| Nền công nghệ đã ghi | Có nhưng bất nhất | 04 §1: “shadcn trên `@base-ui/react`”, “Biểu tượng `lucide-react`” | Thực tế trộn `@base-ui/react` (Dialog) + `@radix-ui/react-select/-tooltip/-separator`; icon là **Phosphor**, `lucide-react` bị **cấm** bởi `tests/unit/architecture/icon-library.test.ts` nhưng vẫn nằm trong `package.json` dependencies. |

## A2. Application Shell

| Thành phần | `(app)` — StoreOS/ChainOS/SaaS Ngành | `(platform)` — SaaS Mother | Ghi chú |
|---|---|---|---|
| Shell gốc | `src/app/(app)/layout.tsx:44-73` | `src/app/(platform)/layout.tsx:44-58` | Hai bản viết tay, **không có `AppShell` dùng chung** — mỗi bản tự lắp `MobileNavDrawer` + `DesktopNav` + `BottomNav`. |
| Header toàn cục | Không có (mỗi trang tự dựng) | Không có | Xem A3: ≥3 kiểu header khác nhau. |
| Sidebar desktop | `DesktopNav` (326 dòng) | `DesktopNav` | Dùng chung — tốt. |
| Bottom nav di động | `BottomNav` `fixed bottom-0 z-40 h-16` + safe-area | `BottomNav` | Dùng chung. |
| Đệm nội dung trên BottomNav | `pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0` | **Thiếu** — `<main className="h-full overflow-auto">` | Trên di động, đáy nội dung `/van-hanh/*` có thể bị BottomNav che (cần xác minh bằng ảnh chụp). |
| Skip-link “Bỏ qua tới nội dung” | Có (`layout.tsx:46-51`) | **Thiếu** | Bất nhất a11y giữa hai shell. |
| `LiveRegionProvider`, `GlobalImageZoom`, `SessionTakeoverWatcher` | Có | **Thiếu** | Thông báo cho trình đọc màn hình không hoạt động ở Console Mẹ. |
| Giới hạn rộng | `w-full` | `max-w-md … md:max-w-none` | Khác nhau không có lý do ghi lại. |
| Footer | Không áp dụng (SaaS nội bộ) | Không áp dụng | — |
| Phần tử nổi | `AlgGlobalCopilot` (nút `fixed top-1/2 right-3 z-50`, panel `fixed bottom-5 right-5 z-50 w-[380px] h-[580px]`) + `UiStudioDrawer` (`fixed bottom-24 right-6 z-40`) | `UiStudioDrawer` | Không có registry z-index/vị trí cho phần tử nổi; 3 lớp nổi cùng góc phải dưới trên di động. |
| Overlay toàn cục | `UiStudioDrawer` render ở **root** `src/app/layout.tsx:37` — kể cả `/dang-nhap` và trang khách `/c/…`, `/g/…` | — | **UI-A-03 (P1)**: công cụ đổi giao diện nội bộ lộ cho khách cuối và mọi nhân viên ở production, không kiểm capability. |

**Kết luận A2:** shell có nền dùng chung (nav) nhưng **lắp ráp trùng lặp** và **bất nhất về a11y** giữa SaaS Mother và các tầng còn lại. Tầng 2 (SaaS Ngành) không có shell/trang riêng: `nav-industry.ts` trỏ tới `/van-hanh/du-lieu`, `/van-hanh/nganh`, `/van-hanh/truong-du-lieu` — các tuyến nằm trong `(platform)` vốn chỉ cho `platform_operators` (`resolve-platform-session.ts:40-59`). Nếu `industry_admin` không đồng thời là platform operator, 3 mục menu sẽ chuyển về `/` (**PLAUSIBLE — cần xác minh runtime**, UI-A-05).

## A3. Layout Architecture

| Layout | Chuẩn ghi ở đâu | Component chuẩn | Mức dùng thực tế | Trạng thái |
|---|---|---|---|---|
| Page (khung trang) | `COMPONENT_CONTRACTS.md` §5 “Page Layout chuẩn mọi màn hình” | `PageContainer` | **3 tệp** import | Có nhưng bất nhất |
| Page header | Như trên + `page-archetypes.md` §1 (một `<h1>`) | `PageHeader` / `TabActionHeader` (K2) | `PageHeader` **8 tệp**, `TabActionHeader` **11 tệp**; 85 tệp tự viết `<h1>` | Có nhưng bất nhất |
| Dashboard (A) | `page-archetypes.md` §3 | Không có template | Mỗi vai một workspace riêng (`src/app/(app)/page.tsx` 8 component) | Một phần |
| Listing (B) | §3 + UX-P09/P10 | Không có `DataTable`/`ListLayout` | `ui/table.tsx` **0 nơi dùng**; 44 tệp tự viết `<table>` | Không triển khai (component) |
| Detail (C) | §3 | Không có | — | Một phần (chỉ luật) |
| Form (D) | §3 + UX-P02 | Không có `FormField`/`FormLayout` | 654 `<input>` thô vs 118 `<Input>` | Một phần |
| Settings (F) | §3 + UX-P03 | `Disclosure` | `/cai-dat/page.tsx` 349 dòng tự lắp | Một phần |
| Empty state | UX-P08, `OPERATING_PRINCIPLES` §6.7 | `EmptyState` | 37 tệp | Đã triển khai (chưa phủ hết) |
| Error state | UX-P06 | `InlineError`, `error.tsx` | `error.tsx` chỉ ở `(app)` và `(platform)` gốc | Một phần |
| Loading | 03a §24, R9 | `Skeleton`, `SkeletonBlock` | 90 tệp | Đã triển khai |

Độ rộng vùng làm việc: `page-archetypes.md` §3 quy định D/F `max-w-3xl…4xl`, B/E `max-w-6xl`; `/dieu-phoi` dùng `max-w-7xl` (`page.tsx:23`), `/don-hang` không giới hạn — **không có token/biến cho độ rộng**, chỉ heuristic.

## A4. Navigation Architecture

| Hạng mục | Trạng thái | Bằng chứng | Khoảng trống |
|---|---|---|---|
| Điều hướng toàn cục theo tầng | Đã triển khai | `src/components/layout/nav/index.ts` `buildNav()` → `nav-mother/industry/chain/store.ts`, tầng từ `core/governance/tier-of.ts` | Tốt: một hàm xác định tầng. `nav-store.ts` 458 dòng **vượt trần 350** (`CLAUDE.md` NN#7). |
| Ẩn/hiện theo quyền | Đã triển khai | `capability:` trên mục nav: Store 30/35, Chain 23/28, Industry 18/26, Mother 0/21 (cả shell đã chặn bằng `platform_operators`) | Ẩn mục không thay kiểm quyền máy chủ — đúng theo 04 §5. Có test `nav-labels.test.ts`, `nav-integrations.test.ts`; **không có test ma trận vai × mục nav**. |
| Module navigation / Tabs | Có nhưng bất nhất | `TabActionHeader` (11 tệp); 7 tệp tự viết `role="tablist"` | Hai cách làm tab. |
| Breadcrumb | Không triển khai (thực tế) | `PageHeader` nhận `breadcrumbs` dạng chuỗi; chỉ 2 tệp chứa “breadcrumb” | Không có component breadcrumb, không có quy tắc khi nào dùng. |
| Bottom navigation | Đã triển khai | `bottom-nav.tsx` 5 khe, safe-area | Va chạm với phần tử nổi (A2). |
| Contextual navigation | Một phần | `NextActions` (journey kit) | Chỉ dùng trong luồng journey. |
| Đồng bộ nav ↔ cây tuyến | Một phần | `_dieu-huong.md` (contract điều hướng) cập nhật 26/09/2026 | Không có test đối chiếu `href` trong nav với `page.tsx` tồn tại. |

## Tác động tổng hợp

- Thiếu `AppShell`/`PageLayout` dùng chung làm mọi thay đổi khung (đệm, a11y, header) phải sửa nhiều nơi — đã dẫn tới lệch giữa `(app)` và `(platform)`.
- Không có layout chuẩn cho Listing/Form nên 4 tầng sẽ tiếp tục phân mảnh khi thêm module.

## Lệnh tái lập

```bash
for f in $(find src/app -name page.tsx); do head -3 "$f" | grep -q '"use client"' && echo "$f"; done | wc -l
grep -rl "ui/page-container" src --include=*.tsx | wc -l
grep -rl "ui/page-header" src --include=*.tsx | wc -l
grep -rl "ui/table\"" src --include=*.tsx | wc -l
```
