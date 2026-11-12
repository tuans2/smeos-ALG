# Sổ phát hiện & việc cần PO quyết — UI Architecture Audit (01/11/2026)

Mức theo `docs/dac-ta/ux-patterns/visual-review.md` §2: P0 an toàn/mất dữ liệu/chặn luồng · P1 khó hoàn thành việc chính, lỗi a11y lớn, rủi ro hệ thống · P2 bất nhất/nhiễu đáng kể · P3 nhỏ. Xác minh: **XÁC NHẬN** (đọc mã/đo trực tiếp) · **KHẢ NĂNG CAO** (phân tích tĩnh, cần ảnh chụp/runtime).

Không có phát hiện P0.

## P1

| ID | Miền | Phát hiện | Bằng chứng chính | Xác minh | Tác động |
|---|---|---|---|---|---|
| UI-B-01 | B/H | Bảng màu thô đổi tên để né R1; ux-lint báo R1 = 0 sai lệch | `globals.css:189-195`; 2.081 lần / 59 tệp | XÁC NHẬN | Theme không áp; chỉ số tuân thủ không đáng tin; tiền lệ lách lint cho agent |
| UI-A-03 | A | UI Studio (đổi preset/density/shadow) hiển thị cho mọi người dùng, mọi trang kể cả trang khách và production | `src/app/layout.tsx:37`; không kiểm vai/env | XÁC NHẬN | Khách cuối/nhân viên thay đổi giao diện; nút nổi chồng lớp |
| UI-B-03 | B | Theme runtime có hai nguồn sự thật; màu trạng thái, radius card/button/dialog, shadow, motion **không áp** | `ui-provider.tsx:72-134`; `globals.css:389-434`; 0 nơi đọc `--radius-card`, `--shadow-*`, `--ui-transition-duration` | XÁC NHẬN | Tính năng preset quảng bá trong `docs/ui-ux` không đúng thực tế |
| UI-E-01 | E | ChainOS (`/dieu-phoi`, `/dieu-phoi/doi-tac`) không có Screen Contract | `docs/dac-ta/screen-contracts/` | XÁC NHẬN | Tầng 3 phát triển không hợp đồng |
| UI-E-02 | E | 11 tuyến khách xem công khai không có contract | như trên | XÁC NHẬN | Bề mặt nhạy cảm (dữ liệu giả, ưu đãi) không có tiêu chí nghiệm thu |
| UI-F-01 | F | Panel Copilot 380×580px cố định tràn ở 360/390px và phủ BottomNav | `alg-global-copilot.tsx` (`fixed bottom-5 right-5 z-50 … w-[380px]`) | KHẢ NĂNG CAO | Mất nội dung/nút trên điện thoại phổ biến |
| UI-F-07 | F | 38 overlay tự chế không có `role="dialog"`/`aria-modal` | `grep -rl "fixed inset-0" … \| xargs grep -L …` | XÁC NHẬN (thiếu thuộc tính); hành vi focus chưa kiểm | Trình đọc màn hình, bẫy focus |
| UI-I-01 | I/H | `docs/ui-ux/*` (24 tệp) ngoài REGISTRY, tự nhận hoàn thành, lệch code; không agent nào được trỏ tới | `FINAL_COMPLETION_REPORT.md:6`; REGISTRY không có `ui-ux/` | XÁC NHẬN | Hai SSOT Design System |
| UI-H-01 | H | Cổng dev 3100 (tài liệu agent) vs 3200 (code) | `CLAUDE.md`, `AGENTS.md:14`, `AGENT_RULES.md:82`, `OPERATING_PRINCIPLES` §5.4 vs `package.json`, `playwright.config.ts:4` | XÁC NHẬN | Agent chạy `ux:audit` sai địa chỉ → bỏ qua kiểm thị giác |
| UI-H-02 | H | “Tự thêm token” vs “đụng token phải hỏi PO” | `AGENTS.md:227`, skill `ui-development:297` vs `03-ux.md` §3.5, `OPERATING_PRINCIPLES` §5.6 | XÁC NHẬN | Token mọc tự phát |
| UI-C-01 | C | Độ phủ component chuẩn thấp: `Table` 0, `PageContainer` 3, `PageHeader` 8/105; 1.078 `<button>`, 654 `<input>`, 200 `<select>/<textarea>`, 1.025 card tự dựng | `03_COMPONENT_ARCHITECTURE.md` | XÁC NHẬN | Thay đổi chung không lan; phân mảnh |

## P2

| ID | Phát hiện | Bằng chứng |
|---|---|---|
| UI-A-01 | 76/105 `page.tsx` là client component, trái 04 §3 | lệnh ở `01` |
| UI-A-02 | `(platform)` shell thiếu skip-link, `LiveRegionProvider`, đệm BottomNav (F-03 KHẢ NĂNG CAO) | `(platform)/layout.tsx:44-58` |
| UI-A-04 | `04-frontend-architecture.md` lỗi thời (cây thư mục, lucide, base-ui) | §1–§2 |
| UI-A-05 | Menu tầng Ngành trỏ tới `/van-hanh/*` chỉ cho platform operator (KHẢ NĂNG CAO) | `nav-industry.ts`, `resolve-platform-session.ts:40-59` |
| UI-A-06 | `check:layers` không trong CI; UI import type từ `infra/` | `business-profile-form.tsx:6` |
| UI-B-02 | 261 tệp còn token shadcn cũ (tăng từ 203) | `02` B2 |
| UI-B-04 | Bo góc preset không áp cho Button/Card/Dialog | `button.tsx:6`, `card.tsx:20`, `dialog.tsx:47` |
| UI-B-05 | `text-primary-fg` dùng 11 chỗ nhưng token không tồn tại | `grep -rn text-primary-fg src` |
| UI-B-06 | Hai thang cỡ chữ song song; tiêu đề trang mâu thuẫn giữa 03a §5 và `DESIGN_TOKENS.md` §3 | `02` B3 |
| UI-B-07 | Không token spacing, shadow, z-index, motion; density chết | `02` B2 |
| UI-B-08 | Theme lưu `localStorage` theo trình duyệt, nháy giao diện khi tải | `ui-provider.tsx:37-55` |
| UI-C-02 | Thiếu primitive: Checkbox, Radio, Switch, Textarea, Avatar, DropdownMenu, DatePicker, Drawer, Toast, FormField | `03` C1–C2 |
| UI-C-03 | Badge: hex cứng, `success` dùng `text-primary`, API lệch tài liệu | `badge.tsx:9-11` |
| UI-C-04 | 54 tệp `.tsx` > 350 dòng | `find … awk '$1>350'` |
| UI-C-05 | Không test cho Button/Card/Dialog/Input/Select/TabActionHeader | `src/components/ui/__tests__/` |
| UI-D-01 | Toast được yêu cầu nhưng không tồn tại | skill §7 |
| UI-D-02 | Ngưỡng vùng chạm 24 / 32 / 44–48px mâu thuẫn | `04` D2 |
| UI-E-03 | Contract trôi so với trang; không có cổng kiểm | `05` E4–E5 |
| UI-E-04 | 6/45 contract khai Archetype; nhiều contract rút gọn 3–4 mục | `05` E3 |
| UI-F-02 | Không registry vị trí/z-index cho phần tử nổi | `06` F1 |
| UI-F-08 | Reduced motion: 2 tệp tôn trọng / 294 lớp animate | `06` F2 |
| UI-G-01 | Visual regression chỉ 2 màn; `ux:audit` không trong CI; axe 13/105 trang | `07` |
| UI-G-02 | Không `CODEOWNERS`, PR template, ESLint `jsx-a11y` | `.github/`, `eslint.config.mjs` |
| UI-G-03 | R1 không quét object literal (màu thô trong map trạng thái) | `platform-records-viewer.tsx:34-38` |
| UI-H-05 | Skill `ui-ux-pro-max` (“Generate Design System REQUIRED”, base 16px) chưa được xếp thứ tự ưu tiên so với chuẩn dự án | `08` |
| UI-H-06 | Luật UI lặp ở ≥4 nơi, đã lệch (icon, cổng) | `08` |
| UI-I-02 | Không versioning/CHANGELOG/`@deprecated` | `09` |
| UI-I-03 | REGISTRY trỏ phụ thuộc tới tệp không tồn tại | REGISTRY dòng 620 |
| UI-J-01…06 | Bất nhất màn thực tế (header, h1, `UserMenu` lặp, override Button, `roleKey`, trạng thái ChainOS) | `10` |

## P3

UI-F-04 (`min-w-[720px]` cố định), UI-F-05 (lưới ≥4 cột không breakpoint), UI-F-06 (font Google lúc chạy), `lucide-react` còn trong dependencies dù bị cấm, `font-cursive` không dùng, `inline-source-picker.tsx` 0 nơi dùng, `nav-store.ts` 458 dòng.

## Cần PO quyết (không tự làm — theo `CLAUDE.md` “Stop and ask”)

> **Cập nhật 01/11/2026:** cả 8 mục đã được quyết theo uỷ quyền của PO — xem `docs/adr/ADR-011.md`; kế hoạch thực thi: `docs/plan/ui-enterprise-upgrade.md`.

1. **UI Studio**: giữ cho ai (chỉ dev? platform_admin? tắt ở production?) — UI-A-03.
2. **Thang màu đổi tên** (`cool/blush/…`): coi là vi phạm R1 và lập kế hoạch thay bằng token ngữ nghĩa, hay hợp thức hoá có điều kiện? Đồng thời mở rộng R1 — UI-B-01, UI-G-03.
3. **Mục tiêu theme**: preset theo người dùng, theo tổ chức (brand), hay theo tầng? Có cần dark mode? (quyết định này quyết định giữ hay bỏ 6 preset và các biến chết) — UI-B-03, UI-B-08.
4. **SSOT Design System**: đưa `docs/ui-ux/DESIGN_TOKENS.md`/`COMPONENT_CONTRACTS.md` vào REGISTRY (sau khi sửa cho khớp code) hay lưu trữ (HISTORICAL) và coi `globals.css` + 03a là SSOT — UI-I-01.
5. **Chuẩn hoá con số**: cổng dev (3100/3200), ngưỡng vùng chạm, cỡ chữ tiêu đề trang — UI-H-01, UI-D-02, UI-B-06.
6. **Bổ sung primitive** (Checkbox, Switch, Toast, Drawer, DatePicker, FormField…): có thêm dependency (Radix/base-ui) không — cần PO theo `CLAUDE.md`.
7. **Cưỡng chế Screen Contract** (script kiểm tồn tại + ngày cập nhật) và **mở rộng visual regression/axe vào CI** — thay đổi CI cần PO.
8. **Thứ tự ưu tiên của skill `ui-ux-pro-max`** so với chuẩn dự án — UI-H-05.

## Đề xuất thứ tự xử lý (để PO cân nhắc — không phải chuẩn mới)

1. Quyết định 1, 2, 4, 5 (rẻ, gỡ xung đột cho agent ngay).
2. Một trang “UI SSOT index” duy nhất được `CLAUDE.md` trỏ tới; xoá bản lặp ở `AGENTS.md`/skill.
3. Vá lỗ lint (R1 alias + object literal), thêm cổng Screen Contract.
4. `AppShell` dùng chung cho `(app)`/`(platform)`; registry phần tử nổi + z-index.
5. Bổ sung primitive thiếu, rồi migrate theo module có nhiều agent làm nhất (market-intelligence, coordinator, greeting-card).
6. Mở rộng visual/axe theo từng tầng (Mother, Chain, Store, khách xem) ở 390/768/1280.
