# Kế hoạch nâng cấp UI/UX SMEOS lên Enterprise Grade, Commercial & Production Ready

- Trạng thái: `ACTIVE` — lập 01/11/2026 · Quyết định nền: `docs/adr/ADR-011.md` · Đầu vào: `docs/audit/ui-architecture-audit/`.
- Danh sách việc chi tiết (ID, tệp, gate, tiêu chí xong): `docs/plan/ui-enterprise-upgrade-backlog.md`.
- Thời lượng dự kiến: **12 tuần**, 6 giai đoạn, chạy song song theo 5 luồng (lane). Ước lượng tính theo ngày-agent; có buffer 20%.

## 1. Mục tiêu đo được (Definition of Done của cả chương trình)

| # | Chỉ số | Hiện tại (audit 01/11) | Đích Commercial/Production (hết GĐ 3, tuần 6) | Đích Enterprise (hết GĐ 6, tuần 12) |
|---|---|---|---|---|
| K1 | Vi phạm R1 thật (gồm 12 thang đổi tên + object literal) | ~2.200 | ≤ 1.000, 0 ở tệp mới | **0**; 12 thang bị xoá khỏi CSS |
| K2 | Tệp dùng token shadcn cũ (R17) | 261 | 0 (codemod) | 0, alias bị xoá |
| K3 | Điều khiển thô ngoài `ui/` (R18: `<button> <input> <select> <textarea> <table>`) | ~2.000 | 0 ở tệp mới; −40% | ≤ allowlist có lý do (< 30) |
| K4 | Overlay tự chế (R19) | 71 tệp | 0 ở luồng chính | 0 |
| K5 | Trang dùng `PageHeader`/`PageLayout` | 8/105 | 100% trang StoreOS lõi + ChainOS | 100% trang nội bộ |
| K6 | Trang có Screen Contract v2 đạt `check:screen-contracts` | 0 (v1: ~33/54 nhóm) | 100% trang lõi (≈40) | 100% `page.tsx` (hoặc trong `_exemptions.yaml`) |
| K7 | Trang có ảnh mốc visual 390+1280 trong CI | 2 | 25 | 100% trang có contract |
| K8 | Trang có axe (critical/serious = 0) trong CI | 13 | 40 | 100% |
| K9 | Kiểm thủ công WCAG 2.2 AA (bàn phím, đọc màn hình, zoom 200%) | 0 | 5 hành trình chính | 12 hành trình chính, có biên bản |
| K10 | Biến token “bơm mà không ai đọc”, mã chết theme | ≥ 8 nhóm | 0 | 0 |
| K11 | Tệp nguồn > 350 dòng | 74 (05/11) | 0 trong `ui/`, `layout/`; không tệp nào dài thêm | Ratchet chỉ giảm; tệp dữ liệu thuần miễn trừ có lý do (`docs/plan/k11-file-size-policy.md`, PO 05/11/2026) |
| K12 | Xung đột trong hướng dẫn agent | 8 (UI-H-01…08) | 0 | 0 + test `check:docs` chặn tái phát |
| K13 | Design System có phiên bản + CHANGELOG | Không | `1.0.0` | `1.x`, quy trình deprecation chạy thật ≥ 1 lần |

“Commercial & Production Ready” = đạt cột giữa **và** không còn P1 mở trong `11_FINDINGS_REGISTER.md`. “Enterprise Grade” = đạt cột phải.

## 2. Nguyên tắc thực thi

1. **Chặn chảy máu trước, di trú sau:** cổng ratchet (GĐ 1) bật trước khi migrate hàng loạt, để code mới luôn sạch.
2. **Nền trước, màn sau:** token → primitive → shell/layout → màn.
3. **Mỗi PR một mục đích**, ≤ ~400 dòng diff logic (codemod cơ học được ngoại lệ, tách theo thư mục).
4. **Không đổi hành vi nghiệp vụ.** Mỗi PR di trú màn: ảnh mốc trước/sau 390/1280 + `ux:audit` của màn đó + gate `CLAUDE.md`.
5. **Không schema, không dependency mới** (ADR-011). Gặp nhu cầu ngoài phạm vi → ghi `docs/plan/questions.md`, không tự làm.
6. Thay đổi thị giác có chủ đích (preset theo tầng, h1 20px, nút 44px di động) phải nằm trong PR riêng có nhãn `visual-change` + ảnh mốc cập nhật.

## 3. Luồng công việc & quyền sở hữu tệp (cho nhiều agent song song)

| Lane | Phạm vi | Tệp **độc quyền** (chỉ lane này sửa) | Ghi chú tuần tự hoá |
|---|---|---|---|
| L1 Foundation | Token, theme, font | `src/styles/tokens/**`, `src/app/globals.css`, `src/lib/ui-system/**`, `src/app/layout.tsx` | Một agent tại một thời điểm |
| L2 Components | Primitive & composite | `src/components/ui/**`, `docs/design-system/components/**` | Mỗi component một PR; khoá theo tệp |
| L3 Shell & Layout | Shell, nav, layout, phần tử nổi | `src/components/layout/**`, `src/app/(app)/layout.tsx`, `src/app/(platform)/layout.tsx`, `src/components/chat/alg-global-copilot.tsx` | — |
| L4 Governance & QA | Lint, CI, script kiểm, tài liệu agent | `scripts/ux-lint/**`, `scripts/check-*`, `.github/**`, `tests/e2e/ux/**`, `CLAUDE.md`, `AGENTS.md`, `.agents/**`, `.claude/skills/ui-development/**`, `docs/design-system/README.md` | Đổi `CLAUDE.md` cần PO duyệt PR |
| L5 Migration | Di trú màn theo module | `src/app/<tuyến>/**`, `src/components/<module>/**`, `docs/dac-ta/screen-contracts/<tuyến>.md` | Mỗi agent nhận **một module**; không chạm L1–L3 — thiếu gì thì mở yêu cầu cho lane đó |

Quy tắc phối hợp: nhánh `ui/<lane>/<id>`; PR nêu ID backlog; baseline ux-lint chỉ được L4 cập nhật (`--update-baseline` sau merge), lane khác không tự cập nhật baseline.

## 4. Giai đoạn

### GĐ 0 — Ổn định quản trị (tuần 1) · lane L4 (+L1 cho UI Studio)
Mục tiêu: hết xung đột hướng dẫn, một nguồn sự thật, tắt rủi ro production nhanh.
- Sửa cổng 3200, icon, token-policy, Toast trong mọi tài liệu agent (UI-H-01/02/04/06).
- Tạo `docs/design-system/README.md` (chỉ mục UI SSOT) + đăng ký REGISTRY; lưu trữ `docs/ui-ux/*`; sửa REGISTRY dòng 620.
- `CLAUDE.md`: một dòng trỏ Design System + thứ tự ưu tiên skill (D-UI-11).
- Gate UI Studio theo D-UI-01 (**hotfix production**).
- Thêm `CODEOWNERS`, PR template.
**Cổng ra:** `check:docs` có kiểm mới “không còn `3100`/`lucide` trong tài liệu agent”; P1 UI-A-03, UI-H-01, UI-H-02, UI-I-01 đóng.

### GĐ 1 — Nền token, theme & cổng ratchet (tuần 2–3) · L1 + L4
- Tách token sang `src/styles/tokens/` (`color.css`, `typography.css`, `radius.css`, `shadow.css`, `z-index.css`, `motion.css`, `density.css`, `spacing.css`) — `globals.css` chỉ import.
- Token mới: `--z-*`, `--shadow-*` (theme hoá), `--duration-*/--ease-*`, `--control-h-*`, `--color-chart-1…8`, `--layout-max-*`.
- Theme phân giải máy chủ (D-UI-03): preset theo tầng + `ui_brand` của tổ chức; bỏ inline style; prune 5 preset & trục chết; gỡ `dark:`.
- `next/font` cho Be Vietnam Pro (+ Fraunces nếu còn dùng).
- `prefers-reduced-motion` toàn cục trong `motion.css`.
- Bật ux-lint R1 mở rộng, R17–R23 ở chế độ ratchet theo tệp; `jsx-a11y`; `check:layers` vào CI.
- Codemod cơ học token shadcn cũ → token ngữ nghĩa (K2 = 0), tách PR theo thư mục.
- Sinh `docs/design-system/tokens.md` từ CSS + kiểm khớp trong CI.
**Cổng ra:** K2 = 0, K10 = 0, ảnh mốc 2 màn hiện có cập nhật có chủ đích; P1 UI-B-01 (cổng), UI-B-03 đóng.

### GĐ 2 — Thư viện component (tuần 3–6) · L2 (+L4 test)
Thứ tự theo mức dùng/rủi ro: `Button` (loading, `asChild`, vùng chạm) → `Field/FormField` + `Input` (`aria-invalid`, `aria-describedby`) + `Textarea` → `Select` (base-ui) → `Checkbox/Radio/Switch` → `Dialog`, `Drawer`, `BottomSheet`, `ConfirmDialog` dựng lại trên một lõi → `Toast` + `useToast` → `DropdownMenu` → `Tabs` (gộp với `TabActionHeader` K2, giữ API K2) → `Table/DataTable` (sort, density, mobile-stack) + `Pagination` → `SearchFilterBar` (UX-P09) → `EmptyState` (4 loại UX-P08) → `Avatar`, `DateField`, `StatusBadge` (một bảng trạng thái nghiệp vụ dùng chung), `KpiTile` (thay `stat-tile`).
Mỗi component: contract `docs/design-system/components/<tên>.md` theo 11 trường audit C4, unit test (props/states/a11y), mục trong **trang catalog** `src/app/(platform)/van-hanh/thu-vien-giao-dien` (chỉ vận hành nền tảng truy cập) có ảnh mốc 390/1280 trong CI.
Gỡ `@radix-ui/*`, `lucide-react` khi 0 import.
**Cổng ra:** Design System `1.0.0`; K13; P1 UI-C-01 (phần nền) đóng.

### GĐ 3 — Shell, layout, phần tử nổi (tuần 5–7) · L3
- `AppShell` dùng chung; `(platform)` có skip-link, live region, đệm BottomNav.
- `PageLayout` A–F + `PageHeader` (h1 20px, breadcrumb thật, actions theo K2).
- `FloatingLayer` + z-index token; Copilot thành BottomSheet trên di động; UI Studio vào FloatingLayer.
- Nav: test `href` mở được theo tầng; tách `nav-store.ts` < 350 dòng; sửa `nav-industry.ts` (D-UI-10).
**Cổng ra:** P1 UI-F-01 đóng (có ảnh 360/390), UI-A-02/05 đóng. **= mốc Commercial & Production Ready** khi kết hợp GĐ 0–2 và đợt 1 của GĐ 4.

### GĐ 4 — Screen Contract v2 & di trú màn theo tầng (tuần 6–11) · L4 dựng công cụ, L5 di trú
- L4 (tuần 6): mẫu v2 + front-matter YAML, `scripts/check-screen-contracts.ts`, `_exemptions.yaml`, sinh danh sách màn cho `e2e-ux` (visual + axe) từ contract.
- L5 theo đợt (mỗi màn: contract v2 → di trú sang `PageLayout`/primitive → thay thang màu đổi tên → trạng thái tải/rỗng/lỗi/không quyền → ảnh mốc + axe → `ux:audit`):
  - **Đợt 1 (tuần 6–7) StoreOS lõi:** `/`, `/don-hang`, `/san-pham` (+`[id]`, `tao-moi`), `/khach-hang`, `/cong-cu/*`, `/the-chao`, `/cai-dat`.
  - **Đợt 2 (tuần 8) ChainOS:** `/dieu-phoi` (tách `control-tower-dashboard.tsx` 983 dòng), `/dieu-phoi/doi-tac`, các module coordinator, `sales-order-intake-modal.tsx`.
  - **Đợt 3 (tuần 9) Khách xem công khai:** `/c`, `/ch`, `/g`, `/b`, `/bst`, `/s`, `/chia-se`, `/subcontract`, `/xem-truoc-trang`, `/dang-nhap`.
  - **Đợt 4 (tuần 10) SaaS Mother:** 19 trang `/van-hanh/*` (dùng `modern-slate`).
  - **Đợt 5 (tuần 10–11) StoreOS còn lại:** market-intelligence (nhiều thang màu đổi tên nhất), creative-studio, tinh-gia, noi-dung, video, lich-dang, tri-thuc, kho-*, tich-hop, tin-nhan, chat, uu-dai, bao-gia…
**Cổng ra:** K1, K3–K8 đạt cột Enterprise; 12 thang màu bị xoá khỏi CSS.

### GĐ 5 — Kiểm chứng Enterprise & bàn giao (tuần 11–12) · L4 + PO
- Kiểm thủ công WCAG 2.2 AA 12 hành trình (biên bản `docs/design-system/accessibility-audit-<ngày>.md`).
- Workflow tuần 6 khổ chạy xanh 2 lần liên tiếp.
- Đo CLS/LCP màn lõi (không tệ hơn baseline tuần 1).
- Chạy lại toàn bộ audit (`docs/audit/ui-architecture-audit/` → bản 2) — đích mọi miền ≥ 3, A/B/C/G/H ≥ 4.
- Diễn tập quy trình deprecation một component (vd. `stat-tile` → `KpiTile`).

## 5. Lịch tóm tắt

| Tuần | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GĐ 0 Quản trị | ■ | | | | | | | | | | | |
| GĐ 1 Token/theme/cổng | | ■ | ■ | | | | | | | | | |
| GĐ 2 Component | | | ■ | ■ | ■ | ■ | | | | | | |
| GĐ 3 Shell/layout | | | | | ■ | ■ | ■ | | | | | |
| GĐ 4 Contract + di trú | | | | | | ■ | ■ | ■ | ■ | ■ | ■ | |
| GĐ 5 Kiểm chứng | | | | | | | | | | | ■ | ■ |
| Mốc | | | | | | | **Commercial/Production** | | | | | **Enterprise** |

## 6. Rủi ro & giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Di trú làm đổi hình ảnh ngoài ý muốn | Cao | Ảnh mốc trước/sau mỗi PR; codemod chỉ ánh xạ tương đương tuyệt đối; thay đổi có chủ đích tách PR `visual-change` |
| Xung đột merge khi nhiều agent | Cao | Quyền sở hữu tệp theo lane (§3); baseline do L4 cập nhật; mỗi agent L5 một module |
| Lint mới báo sai hàng loạt | Trung bình | Bật ở chế độ đo 1 tuần (in báo cáo, không fail) → ratchet; test cho từng luật (`rules.test.ts`) |
| Theme máy chủ làm chậm render | Thấp | Đọc từ phiên đã giải (`resolveAppSession`), không thêm truy vấn; cache theo tổ chức |
| Màu thương hiệu tổ chức kém tương phản | Trung bình | Kiểm tương phản phía máy chủ khi lưu (422); test đơn vị công thức luminance |
| Đụng UX khoá K1/K2 | Trung bình | Giữ API `FeatureGuidanceCard`, `TabActionHeader`; chỉ đổi nội bộ dựa trên primitive mới; PR có PO review (CODEOWNERS) |
| Thiếu môi trường chạy cho agent (như audit này) | Trung bình | Ghi rõ “chưa kiểm” — không báo xong; CI là nơi kiểm cuối |
| `next/font` cần mạng lúc build | Thấp | CI đã có mạng; nếu lỗi → tự host tệp font trong `public/fonts` (không dependency) |

## 7. Báo cáo tiến độ

Mỗi tuần L4 cập nhật bảng K1–K13 vào `docs/design-system/CHANGELOG.md` (mục “Chỉ số”) bằng `npx tsx scripts/ux-lint.ts --json` + `check:screen-contracts --json`. Không tự khai PASS khi chưa có số đo.
