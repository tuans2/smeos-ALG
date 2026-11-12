# ALG — Audit toàn diện UI Architecture & Design System (01/11/2026)

> Loại: **AUDIT** (chỉ đọc). Không sửa mã sản phẩm, CSS, token hay kiến trúc. Nhánh `claude/smeos-ui-audit-ecw5lv`, gốc `d4625c98`.
> Trạng thái tài liệu: `DRAFT — chờ PO duyệt`. Không tạo chuẩn mới; mọi đề xuất là đầu vào để PO quyết.

## 1. Kết luận một câu

ALG có **bộ luật UX viết rất dày** (03a/03c, 12 pattern, archetype A–F, OPERATING_PRINCIPLES) và **một số cổng tự động thật** (ux-lint ratchet R1–R16, test cấm `lucide-react`, axe + visual Playwright trên CI), nhưng **Design System và Component System chưa phải SSOT thực thi được**: token bị lách bằng bảng màu đổi tên, preset runtime chỉ phủ một phần, component chuẩn có tỉ lệ dùng thấp, Screen Contract phủ ~57% nhóm tuyến và không có cơ chế kiểm, tài liệu `docs/ui-ux/` mô tả trạng thái không khớp code. **Chưa đạt Enterprise Grade; đạt mức “thương mại có giới hạn” cho StoreOS.**

## 2. Bảng điểm theo miền

Thang 0–3 theo đề bài (0 NOT IMPLEMENTED · 1 INITIAL · 2 PARTIAL · 3 ESTABLISHED). Đề bài bị cắt sau mức 3; mức 4 MANAGED (thực thi + đo bằng cổng tự động) và 5 OPTIMIZED được **suy ra** để giữ thang mở — không miền nào đạt 4.

| Miền | Điểm | Lý do chính (chi tiết trong tệp tương ứng) |
|---|:---:|---|
| A. UI Architecture | **2** | Tách nghiệp vụ tốt; shell 2 khung nhưng `(platform)` thiếu skip-link, live region, đệm BottomNav; tầng SaaS Ngành không có trang riêng; `04-frontend-architecture.md` lỗi thời → `01_UI_ARCHITECTURE.md` |
| B. Design System | **2−** | Token màu/chữ/bo góc tập trung ở `globals.css`, nhưng 2.081 lần dùng bảng màu đổi tên để né R1, 261 tệp còn token shadcn cũ, preset có hai nguồn sự thật và nhiều biến được bơm nhưng không ai đọc, dark mode chỉ là kiểu dữ liệu → `02_DESIGN_SYSTEM.md` |
| C. Component Architecture | **2−** | 43 component `ui/`, nhưng `Table` 0 nơi dùng, `PageHeader` 8/105 trang, 1.078 `<button>` thô, 71 tệp modal tự chế, không Toast/Checkbox/Switch/DatePicker chuẩn → `03_COMPONENT_ARCHITECTURE.md` |
| D. UX Standards | **2** | Luật PD/pattern đầy đủ và một phần có lint (R13–R16); Toast được skill yêu cầu nhưng không tồn tại; form/undo/autosave chưa chuẩn hoá → `04_UX_STANDARDS.md` |
| E. Screen Contract | **2−** | 45 contract; 23/54 nhóm tuyến không có (gồm **toàn bộ ChainOS `/dieu-phoi`** và 11 tuyến khách xem); 6/45 khai Archetype; 0 cơ chế kiểm → `05_SCREEN_CONTRACT_COVERAGE.md` |
| F. Responsive & A11y | **2** | Có skip-link, safe-area, axe trên 13 tuyến (3 trang + 10 công cụ ở 390px); nhưng panel Copilot 380px tràn ở 360/390px, 38 modal tự chế thiếu `role="dialog"`, 2 tệp dùng `motion-reduce` trên 294 lớp `animate-*` → `06_RESPONSIVE_ACCESSIBILITY.md` |
| G. Visual QA & Testing | **2** | CI chặn typecheck/lint/ux-lint/unit/build/E2E UX; visual regression chỉ 2 màn (404, `/vai-tro`); `ux:audit` chỉ chạy tay → `07_UI_QA_GOVERNANCE.md` |
| H. AI Agent Governance | **2** | Hướng dẫn nhiều lớp và có hook; nhưng xung đột (cổng 3100/3200, lucide vs Phosphor, “tự thêm token” vs “hỏi PO”), tài liệu Design System không được trỏ tới → `08_AI_AGENT_GOVERNANCE.md` |
| I. Design Governance | **1** | Không owner riêng cho Design System, không versioning/changelog/`@deprecated`, `docs/ui-ux/*` không có trong REGISTRY → `09_DESIGN_GOVERNANCE.md` |
| J. Actual Screen Compliance | **1** | 6 màn đại diện / 4 tầng: 3 kiểu header khác nhau, override kích thước `Button`, token cũ; **không chạy được app → không có ảnh chụp** → `10_SCREEN_COMPLIANCE.md` |

## 3. Năm phát hiện nghiêm trọng nhất (P1)

1. **Né luật bằng bảng màu đổi tên** — `src/app/globals.css:189-195` tự ghi “Token name ≠ Tailwind palette name → không bị R1 regex flag”; 12 thang màu (`cool`, `blush`, `mint`…) được dùng **2.081 lần / 59 tệp**. ux-lint báo R1 = 0 nhưng thực chất màu thô vẫn lan rộng và **không đổi theo preset**. (UI-B-01)
2. **Theme runtime chỉ hoàn thiện một phần** — 8 preset (`src/lib/ui-system/types.ts:10-18`) được bơm màu nền tảng bằng inline style sau khi hydrate (`ui-provider.tsx:72-104`), song song với khối CSS `[data-theme]` cho 2 preset trong `globals.css:389-434` (**hai nguồn sự thật**). Màu trạng thái (danger/success/warning/info) có trong `presets.ts` nhưng **không được bơm**; `--radius-card/button/dialog`, `--shadow-*`, `--ui-border-width`, `--ui-transition-duration` được bơm nhưng **0 nơi đọc**; `Button/Card/Dialog` dùng `rounded-xl/2xl` cố định nên bo góc preset không áp; `data-color-mode`, `data-layout-mode` không có CSS tiêu thụ. (UI-B-03, UI-B-04)
3. **UI Studio (đổi giao diện) hiện với mọi người dùng, mọi trang, cả production** — `src/app/layout.tsx:37` render `<UiStudioDrawer />` ở root, không kiểm vai/môi trường; nút nổi `fixed bottom-24 right-6 z-40` chồng lên vùng BottomNav/Copilot. (UI-A-03)
4. **Screen Contract không bao phủ ChainOS và trang khách xem**, không có trình kiểm; nhiều contract cũ hơn mã trang (vd. `san-pham`: contract 23/10, trang đổi 4 commit sau). (UI-E-01…03)
5. **Tài liệu Design System (`docs/ui-ux/`) không phải nguồn sự thật**: tự nhận “Hoàn thành xuất sắc cả 4 Giai đoạn” (`FINAL_COMPLETION_REPORT.md:6`) trong khi `Table` 0 nơi dùng, Badge contract lệch API thật, 8 tệp then chốt không có trong `00-DOCUMENTATION-REGISTRY.yaml` và không agent nào được yêu cầu đọc. (UI-I-01, UI-H-03)

Danh sách đầy đủ, mức P0–P3 và việc cần PO quyết: `11_FINDINGS_REGISTER.md`.

## 4. Phương pháp

- Đọc: `CLAUDE.md`, `AGENTS.md`, `.agents/AGENT_RULES.md`, `.agents/standards/alg/01,03`, skill `ui-development`, `tier-governance`; `docs/dac-ta/03a`, `03c`, `04`, `ux-patterns/*`, `screen-contracts/*`; toàn bộ `docs/ui-ux/*.md` liên quan.
- Mã: `src/app/globals.css`, `src/lib/ui-system/*`, `src/components/ui/*`, `src/components/layout/**`, 6 trang đại diện, `scripts/ux-lint*`, `tests/e2e/ux/*`, `.github/workflows/ci.yml`.
- Đo: `grep`/`find` trên 935 tệp `.tsx` của `src/app` + `src/components` (lệnh tái lập ở phụ lục mỗi tệp); chạy thật `npx tsx scripts/ux-lint.ts` và `--check`.
- Phân loại trạng thái: **Không triển khai · Một phần · Có nhưng bất nhất · Đã triển khai & kiểm chứng · Không áp dụng**. Thiếu bằng chứng ≠ PASS.

## 5. Giới hạn (không suy diễn kết quả)

| Hạng mục | Tình trạng |
|---|---|
| Chạy app, chụp ảnh 360–1440px | **KHÔNG làm được**: `npm ci` lỗi 403 khi tải `xlsx` từ `cdn.sheetjs.com` (chính sách mạng sandbox). Không có ảnh chụp; mọi kết luận responsive là **phân tích tĩnh**. |
| `typecheck`, `npm test`, E2E, axe | Không chạy (thiếu dependency). Không khẳng định đạt/không đạt. |
| `lint:ux` | **Đã chạy** (cài riêng `tsx` + `typescript` ngoài repo): 119 vi phạm (R13 21 · R14 16 · R15 10 · R16 72), R1–R12 = 0; `--check` ĐẠT (120 → 119). |
| Đếm bằng regex | Là chỉ báo, có thể dư/thiếu vài trường hợp (vd. `<label>` bọc input không cần `htmlFor`). Ghi rõ ở từng chỗ. |
| Bàn phím, đọc màn hình, zoom 200% | Chưa kiểm thủ công. |

## 6. Mức sẵn sàng theo mục tiêu đề bài

| Mục tiêu | Đánh giá |
|---|---|
| Commercial Ready (StoreOS, 1 ngành hoa) | **Có điều kiện** — luồng chính có luật UX và cổng CI; rủi ro thị giác/nhất quán chưa được cổng chặn. |
| Production Ready | **Có điều kiện** — cần gỡ UI Studio khỏi người dùng cuối, sửa tràn Copilot di động. |
| Enterprise Grade | **Chưa** — thiếu governance Design System, versioning, a11y có kiểm, visual regression diện rộng. |
| Multi-product SaaS (4 tầng) | **Chưa** — shell dùng chung nhưng không có contract/theme theo tầng; SaaS Ngành không có bề mặt UI. |
| Nhiều AI agent song song | **Rủi ro cao** — hướng dẫn xung đột và có tiền lệ lách lint (mục 3.1). |
