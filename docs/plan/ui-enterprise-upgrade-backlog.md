# Backlog — Nâng cấp UI/UX Enterprise (kèm `ui-enterprise-upgrade.md`)

Cột: **ID** · **Việc** · **Tệp chính** · **Xong khi** (kiểm được) · **Phát hiện** (audit `11_FINDINGS_REGISTER.md`) · **Ước lượng** (ngày-agent) · **Phụ thuộc**.
Gate mặc định mọi việc (không nhắc lại): `npm run typecheck && npm run lint:ratchet`, `npm run lint:ux -- --check`, `npm test`, `npm run check:docs`; chạm `src/app`/`src/components` `.tsx` → thêm `npm run test:e2e:ux`; chạm dữ liệu/quyền → `test:tenant`, `test:platform`.

## GĐ 0 — Quản trị (tuần 1)

| ID | Việc | Tệp chính | Xong khi | Phát hiện | Ước | Phụ thuộc |
|---|---|---|---|---|---|---|
| G0-01 | Thống nhất cổng **3200** trong tài liệu agent | `CLAUDE.md`, `AGENTS.md:14`, `.agents/AGENT_RULES.md:82`, `OPERATING_PRINCIPLES.md` §5.4 | `grep -rn "3100"` trong 4 tệp = 0; `check:docs` thêm kiểm này | UI-H-01 | 0,5 | — |
| G0-02 | Gỡ mâu thuẫn icon & tài liệu kiến trúc frontend | `OPERATING_PRINCIPLES.md` §6.2, `docs/dac-ta/04-frontend-architecture.md` §1–§2 | 04 phản ánh đúng cây thư mục, base-ui, Phosphor, 76 client page (ghi là nợ) | UI-H-04, UI-A-04 | 1 | — |
| G0-03 | Chính sách token: “thêm/sửa token = PR chạm `src/styles/tokens/`, PO duyệt” ở **một** nơi; xoá câu “tự đăng ký trước” | `AGENTS.md:227`, `.claude/skills/ui-development/SKILL.md:297` | Chỉ còn tham chiếu tới `docs/design-system/README.md` | UI-H-02 | 0,5 | G0-05 |
| G0-04 | Thêm dòng §14 “cấm alias để né lint” | `.agents/AGENT_RULES.md` | Có dòng, có ví dụ `globals.css:189` | UI-B-01 | 0,25 | — |
| G0-05 | Tạo `docs/design-system/README.md` (chỉ mục UI SSOT: token, component, layout, responsive, a11y, contract, gate) + đăng ký REGISTRY `CANONICAL` | `docs/design-system/`, `docs/00-DOCUMENTATION-REGISTRY.yaml` | REGISTRY có mục; `CLAUDE.md` trỏ 1 dòng | UI-I-01, UI-H-03 | 1 | — |
| G0-06 | Lưu trữ `docs/ui-ux/*` → `docs/archive/historical/ui-ux-2026-10/`; sửa đường dẫn tham chiếu | `docs/ui-ux/**` | `grep -rn "docs/ui-ux/"` ngoài archive = 0 (trừ nhật ký `MEUX_DEEP_AUDIT.md` → chuyển sang `docs/design-system/audit-log.md`) | UI-I-01 | 0,5 | G0-05 |
| G0-07 | Sửa REGISTRY dòng 620 (đường dẫn sai) | REGISTRY | Mọi `path`/`dependencies` tồn tại — thêm kiểm vào `check:docs` | UI-I-03 | 0,5 | — |
| G0-08 | Thứ tự ưu tiên skill `ui-ux-pro-max` (D-UI-11) | `CLAUDE.md` (Conflicts), `.claude/skills/ui-development/SKILL.md` | Câu cấm “Generate Design System” trong repo | UI-H-05 | 0,25 | — |
| G0-09 | **Hotfix** gate UI Studio (D-UI-01) | `src/app/layout.tsx`, `(app)/layout.tsx`, `(platform)/layout.tsx`, `ui-studio-drawer.tsx` | Test: không render ở production `(app)`, `(auth)`, tuyến công khai | UI-A-03 | 1 | — |
| G0-10 | `CODEOWNERS` + `pull_request_template.md` (mục UI: Screen ID, ảnh 390/1280, gate) | `.github/` | Có tệp; PR mẫu tự điền | UI-G-02 | 0,5 | — |
| G0-11 | Gộp luật UI lặp: `AGENTS.md`, skill `ui-development` chỉ trỏ tới SSOT | 2 tệp trên | Không còn bảng R1/R2/K1 chép lại | UI-H-08 | 1 | G0-05 |

## GĐ 1 — Token, theme, cổng (tuần 2–3)

| ID | Việc | Tệp chính | Xong khi | Phát hiện | Ước | Phụ thuộc |
|---|---|---|---|---|---|---|
| F1-01 | Tách token sang `src/styles/tokens/*.css`; `globals.css` chỉ `@import` + base | `src/app/globals.css` | Diff CSS sinh ra giống hệt (so `next build` output) | UI-B-07 | 1 | G0 |
| F1-02 | Token mới: z-index, shadow, motion, control-height, layout-max, chart-1…8, spacing ngữ nghĩa (`--space-section`, `--space-card`) | `src/styles/tokens/` | Có trong `tokens.md` sinh tự động | UI-B-07, UI-F-02 | 1,5 | F1-01 |
| F1-03 | Theme máy chủ: `resolveUiTheme(session)` → `data-theme`, `data-density`, biến brand inline trên `<html>` từ Server Component | `src/lib/ui-system/`, `src/app/(app)/layout.tsx`, `(platform)/layout.tsx` | Không nháy (test E2E: màu `--color-primary` ở first paint = theme tầng) | UI-B-08 | 2 | F1-01 |
| F1-04 | Brand tổ chức: đọc/ghi `organizations.settings.ui_brand`, kiểm tương phản 4,5:1 (422) qua use-case + API có `requireCapability` | `src/modules/organization/{domain,use-cases,infra}`, `src/app/api/v1/organization/brand` | Unit test luminance; tenant test cách ly; route-capability-guard | UI-B-03 | 3 | F1-03 |
| F1-05 | Prune: 5 preset thử nghiệm, trục chết, `spacious`, `dark:` (105 lớp), inline-style injection | `src/lib/ui-system/*`, 11 tệp `dark:` | Grep 0; K10 = 0 | UI-B-03 | 1,5 | F1-03 |
| F1-06 | Component nền đọc token: `Button` `--radius-button`, `Card` `--radius-card`, `Dialog` `--radius-dialog`, shadow token | `src/components/ui/{button,card,dialog}.tsx` | Đổi preset đổi bo góc/bóng (ảnh mốc 3 preset ở catalog) | UI-B-04 | 1 | F1-02 |
| F1-07 | Định nghĩa token còn thiếu bị dùng (`--color-primary-fg` → alias hoặc thay 11 chỗ) | `ui-studio-drawer.tsx`… | R22 = 0 | UI-B-05 | 0,25 | F1-01 |
| F1-08 | `next/font` thay `<link>` Google | `src/app/layout.tsx` | Ảnh mốc ổn định 3 lần chạy | UI-F-06 | 0,5 | — |
| F1-09 | `prefers-reduced-motion` toàn cục | `src/styles/tokens/motion.css` | E2E `reducedMotion: reduce` → không animation | UI-F-08 | 0,5 | F1-01 |
| F1-10 | ux-lint: R1 mở rộng (12 thang + object literal), R17–R23; chế độ đo 1 tuần → ratchet theo tệp | `scripts/ux-lint/rules*.ts`, baseline | `rules.test.ts` có ca dương/âm cho từng luật | UI-B-01, UI-G-03 | 3 | — |
| F1-11 | Bật luật `jsx-a11y` (có sẵn qua `eslint-config-next`) vào ratchet | `eslint.config.mjs` | `lint:ratchet` xanh, baseline mới | UI-G-02 | 0,5 | — |
| F1-12 | `check:layers` quét `src/components` + vào CI | `scripts/check-layer-boundaries.ts`, `ci.yml` | `business-profile-form.tsx:6` hết import `infra` | UI-A-06 | 1 | — |
| F1-13 | Codemod token shadcn cũ → ngữ nghĩa (bg-background→bg-bg, text-foreground→text-text, text-muted-foreground→text-text-muted, border-input→border-border, bg-card/bg-popover→bg-surface, bg-muted→bg-surface-alt); xoá alias | `scripts/codemods/legacy-tokens.ts`, 261 tệp | K2 = 0; ảnh mốc không đổi | UI-B-02 | 1,5 | F1-10 |
| F1-14 | Sinh `docs/design-system/tokens.md` + kiểm khớp CI | `scripts/gen-design-tokens-doc.ts` | `check:design-tokens` trong `ci.yml` | UI-I-02 | 1 | F1-02 |

## GĐ 2 — Component (tuần 3–6)

Mỗi việc C2-xx gồm: component trên `@base-ui/react` (trừ ghi chú) · contract `docs/design-system/components/<tên>.md` (11 trường) · unit test (variants, states, keyboard, aria) · mục catalog có ảnh mốc 390/1280 · ghi CHANGELOG.

| ID | Component | Ghi chú bắt buộc | Phát hiện | Ước |
|---|---|---|---|---|
| C2-00 | Trang catalog `/van-hanh/thu-vien-giao-dien` + spec visual tự lặp qua catalog | Chỉ platform operator | UI-G-01 | 1,5 |
| C2-01 | `Button` | `loading` (`aria-busy`, khoá double-submit), `asChild` cho link, `xs` ≥ 44px khi `pointer: coarse` | UI-D-02 | 1 |
| C2-02 | `Field`/`FormField`, `Input`, `Textarea`, `Label`, `RequiredMark` | Tự gắn `aria-invalid`, `aria-describedby` tới `InlineError`; quy ước bắt buộc/tuỳ chọn | UI-C-02, UI-F-07 | 2 |
| C2-03 | `Select` (base-ui) thay Radix | API tương thích bản cũ | UI-C-02 | 1 |
| C2-04 | `Checkbox`, `Radio`/`RadioGroup`, `Switch` | — | UI-C-02 | 1,5 |
| C2-05 | Lõi overlay: `Dialog`, `Drawer`, `BottomSheet`, `ConfirmDialog` | Bẫy focus, Esc, trả focus, `max-h-[90dvh]`, safe-area | UI-F-07 | 2 |
| C2-06 | `Toast` + `useToast` | Đi qua `LiveRegion`; thay 4 toast tự viết | UI-D-01 | 1 |
| C2-07 | `DropdownMenu`; `TabActionHeader` (K2) dùng nó cho menu `…` | Giữ API K2 | UI-C-02 | 1 |
| C2-08 | `Tabs` (base-ui) dưới `TabActionHeader`; thay 7 tablist tự viết | Giữ API K2 | UI-C-02 | 1 |
| C2-09 | `DataTable` (sort, chọn hàng UX-P10, density, xếp chồng thẻ < sm) + `Pagination` | Đọc `--table-py/px` | UI-C-01 | 3 |
| C2-10 | `SearchFilterBar` (UX-P09: 2–3 lọc + Disclosure, đếm lọc, “Xoá bộ lọc”, giữ trạng thái URL) | — | UI-C-02 | 1,5 |
| C2-11 | `EmptyState` 4 biến thể (UX-P08) | `kind: "none" \| "filtered" \| "forbidden" \| "error"` | — | 0,5 |
| C2-12 | `StatusBadge` + registry trạng thái nghiệp vụ (đơn, sản phẩm, job, duyệt) dùng token | Thay map màu tự định nghĩa (5 tệp) | UI-C-03 | 1,5 |
| C2-13 | `Badge` sửa: bỏ hex, `success` dùng `text-success-text` | — | UI-C-03 | 0,25 |
| C2-14 | `KpiTile` (thay `stat-tile`; deprecate `stat-tile` theo D-UI-12) | Số `text-display`, ẩn/hiện số nhạy cảm | — | 1 |
| C2-15 | `Avatar`, `DateField`, `InfoTip`/`Tooltip` phân vai rõ | — | UI-C-02 | 1 |
| C2-16 | Gỡ `@radix-ui/*`, `lucide-react`, `ui/table.tsx` cũ, `inline-source-picker.tsx` (0 dùng) | `package.json` | 0 import; build xanh | P3 | 0,5 |
| C2-17 | Phát hành Design System `1.0.0` | `docs/design-system/CHANGELOG.md` | K13 | UI-I-02 | 0,25 |

## GĐ 3 — Shell & layout (tuần 5–7)

| ID | Việc | Tệp chính | Xong khi | Phát hiện | Ước |
|---|---|---|---|---|---|
| S3-01 | `AppShell` dùng chung (skip-link, live region, main landmark, đệm BottomNav, `SessionTakeoverWatcher`) | `src/components/layout/app-shell.tsx`, 2 layout | `(platform)` có đủ; E2E skip-link cho `/van-hanh` | UI-A-02, UI-F-03 | 2 |
| S3-02 | `PageLayout` A–F + `PageHeader` v2 (h1 20px, breadcrumb, actions K2) | `src/components/layout/page-layout/*` | Contract component + catalog | UI-J-01/02 | 2 |
| S3-03 | `FloatingLayer` + đăng ký Copilot, UI Studio, StageGateApprovalBar | `src/components/layout/floating-layer.tsx` | Không chồng ở 360/390 (ảnh mốc) | UI-F-02 | 1,5 |
| S3-04 | Copilot: BottomSheet < sm, `role="dialog"`, panel desktop co theo viewport | `alg-global-copilot.tsx` | Ảnh 360/390/1280 không tràn | UI-F-01 | 1,5 |
| S3-05 | Nav: test mọi `href` theo tầng mở được; ẩn mục không vào được của `nav-industry.ts`; tách `nav-store.ts` | `src/components/layout/nav/*` | Test vai × tầng xanh; tệp < 350 dòng | UI-A-05 | 2 |
| S3-06 | Bỏ hard-code `roleKey` trong UI → capability | `(app)/san-pham/page.tsx:56-60`, `(app)/page.tsx:51` | `grep "roleKey ==="` trong `src/app` = 0 (trừ chọn khuôn trang chủ có ghi lý do) | UI-J-05 | 1 |

## GĐ 4 — Contract v2 & di trú (tuần 6–11)

| ID | Việc | Xong khi | Phát hiện | Ước |
|---|---|---|---|---|
| M4-00 | Mẫu contract v2 (front-matter YAML: `id`, `tier`, `module`, `route`, `archetype`, `snapshots`, `acceptance`) + `check:screen-contracts` + `_exemptions.yaml` + sinh danh sách màn cho `e2e-ux` | Script trong CI; báo % phủ | UI-E-03/04 | 3 |
| M4-01 | Đợt 1 StoreOS lõi (≈10 màn) | Mỗi màn: contract v2, `PageLayout`, primitive, 0 R1/R17–R21 trong thư mục, đủ 6 trạng thái, ảnh mốc + axe, `ux:audit` sạch | UI-C-01, UI-J | 8 |
| M4-02 | Đợt 2 ChainOS (`/dieu-phoi`, `/doi-tac`, coordinator; tách `control-tower-dashboard.tsx`, `sales-order-intake-modal.tsx`) | Như trên; bỏ `UserMenu` lặp | UI-E-01, UI-J-03/04/06 | 6 |
| M4-03 | Đợt 3 Khách xem công khai + `/dang-nhap` (11+1 tuyến) | Như trên + soát “không dữ liệu giả” (§2 OPERATING) | UI-E-02 | 6 |
| M4-04 | Đợt 4 SaaS Mother (19 trang) | Như trên, theme `modern-slate` | — | 6 |
| M4-05 | Đợt 5 StoreOS còn lại (market-intelligence trước) | Như trên; đếm thang màu đổi tên = 0 → xoá 12 thang khỏi CSS | UI-B-01 | 12 |
| M4-06 | Tách 54 tệp > 350 dòng gặp trên đường di trú | K11 | UI-C-04 | (gộp trong đợt) |

## GĐ 5 — Kiểm chứng (tuần 11–12)

| ID | Việc | Xong khi | Ước |
|---|---|---|---|
| V5-01 | Workflow `ui-weekly.yml`: visual + axe 6 khổ cho mọi màn có contract | 2 lần xanh liên tiếp | 1 |
| V5-02 | Kiểm thủ công WCAG 2.2 AA 12 hành trình (bàn phím, NVDA/VoiceOver, zoom 200%, 2.4.11 focus không bị che) | Biên bản + finding đã xử lý | 4 |
| V5-03 | Đo CLS/LCP màn lõi so với tuần 1 | Không xấu đi | 1 |
| V5-04 | Audit lại theo bộ `docs/audit/ui-architecture-audit/` (bản 2) | Mọi miền ≥ 3; A/B/C/G/H ≥ 4 | 2 |
| V5-05 | Diễn tập deprecation `stat-tile` → `KpiTile` theo D-UI-12 | CHANGELOG có minor `@deprecated` + major gỡ | 0,5 |

## Tổng ước lượng

GĐ 0 ≈ 7 · GĐ 1 ≈ 18 · GĐ 2 ≈ 21,5 · GĐ 3 ≈ 10 · GĐ 4 ≈ 41 · GĐ 5 ≈ 8,5 → **≈ 106 ngày-agent** (+20% buffer ≈ 128). Với 3–4 agent song song theo lane ở §3 của kế hoạch → 12 tuần lịch.

## Truy vết: mọi P1 của audit đều có việc

UI-B-01 → G0-04, F1-10, M4-05 · UI-A-03 → G0-09 · UI-B-03 → F1-03…06 · UI-E-01 → M4-02 · UI-E-02 → M4-03 · UI-F-01 → S3-04 · UI-F-07 → C2-05, M4-* · UI-I-01 → G0-05/06 · UI-H-01 → G0-01 · UI-H-02 → G0-03 · UI-C-01 → C2-*, M4-*.
