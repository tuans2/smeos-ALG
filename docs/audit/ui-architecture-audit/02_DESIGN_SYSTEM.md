# B — Design System Assessment

Điểm miền: **2− / PARTIAL (cận dưới)**. Nguồn token thật: `src/app/globals.css` (466 dòng) + `src/lib/ui-system/{presets,tokens,types,ui-provider}.ts(x)`. Tài liệu mô tả: `docs/ui-ux/DESIGN_TOKENS.md`, `THEME_PRESET_MECHANISM.md`, `DESIGN_STYLE_PROPOSAL.md`, 03a §0.5.

## B1. Triết lý thiết kế

| Hạng mục | Trạng thái | Bằng chứng | Khoảng trống |
|---|---|---|---|
| Visual identity | Đã triển khai | `globals.css:4-19` (bộ nhận diện “Mộc Lan”, font Be Vietnam Pro), `DESIGN_STYLE_PROPOSAL.md` | Nhận diện gắn với **ngành hoa**; chưa tách “nhận diện ALG (nền tảng)” khỏi “nhận diện ngành/tiệm”. |
| Design principles / direction | Đã triển khai (tài liệu) | `page-archetypes.md` (“Clean SaaS Dashboard”), `OPERATING_PRINCIPLES.md` §6 (“Thoáng – Ít chữ – Icon lớn”) | Hai định hướng song song: §6 “thoáng, icon 64px” vs archetype B/C/D “mật độ hữu ích”. Không có quy tắc khi nào áp dụng cái nào ngoài “màn tổng quan/lưới thẻ”. |
| Visual hierarchy, whitespace | Một phần | §6.3–6.4 (padding ≥20px, gap ≥16/24px, giữa khu ≥32px) | Không có **token khoảng cách** — chỉ số đo bằng class Tailwind; không kiểm tự động. |
| Information density | Có nhưng bất nhất | `DESIGN_TOKENS.md` §5 ma trận density; `globals.css:436-452` `[data-density]` → `--table-py`, `--card-padding` | **0 component đọc `--table-py`/`--card-padding`**; `DENSITY_CONFIG` (`tokens.ts`) 0 nơi dùng ngoài `ui-system`. Density là tính năng chết. |
| Yêu cầu theo sản phẩm/tầng | Không triển khai | `presets.ts` có trường `scope: "saas-mother" \| "chain-store" \| "all"`; `ui-provider.tsx:195-204` ghi “scope chỉ là gợi ý, không ẩn preset” | Không có preset mặc định theo tầng; tầng không đổi theme. |

## B2. Design Tokens

| Nhóm | Định nghĩa tập trung | Mức tiêu thụ | Trạng thái |
|---|---|---|---|
| Màu ngữ nghĩa | `@theme` `globals.css:64-139` (~60 token: primary, bg, surface, text, *-bg/-text/-border, guidance, tone-*) | Rộng (Badge, Button, Card…) | Đã triển khai |
| Màu legacy shadcn | `globals.css:141-155` alias (`--color-background`→`--color-bg`…) | **1.091 lần / 261 tệp** còn dùng `bg-background`, `text-foreground`, `text-muted-foreground`, `border-input`, `bg-muted`… | Có nhưng bất nhất — hai bộ tên cho cùng ý nghĩa; `UI_ARCHITECTURE_READINESS.md` §4 ghi “203 file” cần dọn: con số đã **tăng**. |
| Bảng màu “đổi tên” | `globals.css:189-387`: 12 thang × 11 bậc (`cool`, `blush`, `alert`, `mint`, `sand`, `orchid`, `ocean`, `azure`, `navy`, `petal`, `aqua`, `lagoon`) | **2.081 lần / 59 tệp** | **UI-B-01 (P1)** — chú thích tại chỗ: “Token name ≠ Tailwind palette name → không bị R1 regex flag”. Đây là màu thô cố định, không ngữ nghĩa, không đổi theo preset; ux-lint R1 báo 0 nên số liệu tuân thủ bị **sai lệch có hệ thống**. |
| Màu thương hiệu bên thứ ba | `--color-zalo`, `--color-facebook`… | Hợp lý | Đã triển khai |
| Token màu chưa khai báo | — | `text-primary-fg` dùng ở **11 chỗ** (vd. `ui-studio-drawer.tsx`); chỉ có `--color-primary-foreground` | **UI-B-05 (P2)** — class không sinh CSS, chữ rơi về màu kế thừa. |
| Hex trong `.tsx` | — | 156 lần / 33 tệp (một phần hợp lệ trong allowlist: SVG minh hoạ, dữ liệu mẫu) | Một phần; `ui/badge.tsx:11` `accent: "bg-[#FBEAEC]"` nằm **ngay trong component nền**. |
| Typography | `globals.css:21-57` (4 font, 9 cỡ + line-height) | Xem B3 | Có nhưng bất nhất |
| Spacing | **Không có token** | Class Tailwind mặc định | Không triển khai |
| Sizing (chiều cao control) | Không có token; quy ước trong `button.tsx` (h-8/11/12/14) | `/dieu-phoi/page.tsx:58` override `h-9 text-xs` trên `<Button>` | Không triển khai |
| Radius | `globals.css:158-164` (`--radius-sm…3xl`) | Preset chỉ ghi đè `sm/md/lg` (`ui-provider.tsx:94-99`); `Button` `rounded-xl`, `Card`/`Dialog` `rounded-2xl` **không đổi theo preset**; 2.298 lần `rounded-xl/2xl/3xl` vs 1.246 `rounded-sm/md/lg` | Có nhưng bất nhất (**UI-B-04**) |
| Shadow / elevation | Không có trong `@theme`; preset bơm `--shadow-subtle/card/dialog` | **0 nơi đọc** các biến này; component dùng `shadow-xs…2xl` mặc định | Không triển khai (thực tế) |
| Z-index | Không có token | `z-10/20/40/50` rải rác; Dialog `z-50`, Copilot `z-50`, BottomNav `z-40`, UI Studio `z-40` | Không triển khai — rủi ro chồng lớp (F). |
| Breakpoint | Mặc định Tailwind (sm 640 / md 768 / lg 1024 / xl 1280) | Dùng rộng | Đã triển khai nhưng **không ghi** trong tài liệu nào; yêu cầu kiểm 360/430/1440 không có breakpoint tương ứng. |
| Motion | Không có token; preset bơm `--ui-transition-duration` | **0 nơi đọc**; 294 lớp `animate-*` | Không triển khai |

## B3. Typography

| Hạng mục | Trạng thái | Bằng chứng / số đo | Ghi chú |
|---|---|---|---|
| Font family | Đã triển khai | `--font-sans` Be Vietnam Pro; `--font-serif`, `--font-display` (Fraunces), `--font-cursive` (Caveat) | Tải bằng `<link>` Google Fonts trong `src/app/layout.tsx:27-30`, **không dùng `next/font`** → phụ thuộc mạng lúc chạy; `ci.yml` ghi chú ảnh mẫu visual lệch vì font tải từ Google. `font-cursive` 0 nơi dùng. |
| Thang cỡ chữ | Có nhưng bất nhất | Token: `text-caption` 3.473 · `text-body-sm` 1.577 · `text-meta` 254 · `text-title(-sm)` ~377 · `text-display*` 43. **Song song** thang Tailwind gốc: `text-xs` 1.340 · `text-sm` 336 · `text-base` 78 · `text-lg/xl/2xl/3xl` 91 | Hai thang cùng tồn tại; R2 chỉ cấm `text-[Npx]` (đạt 0) nhưng không cấm `text-xs/sm/lg`. |
| Heading hierarchy | Có nhưng bất nhất | 03a §5: `text-title` = “Tiêu đề màn hình chính”; `DESIGN_TOKENS.md` §3: `text-display` = “Tiêu đề trang chính”. Thực tế: `/don-hang` h1 `text-title`, `/dieu-phoi` h1 `text-xl`, `/san-pham` h1 `text-title text-primary` | **UI-B-06 (P2)** — hai SSOT mâu thuẫn, ba màn ba kiểu. |
| Body text | Rủi ro | Body chuẩn 13.5px, phổ biến nhất là **11px** (`text-caption`, 3.473 lần) | 11px cho tiếng Việt có dấu trên di động khó đọc; 03a không đặt cỡ tối thiểu cho nội dung. |
| Weight | Bất nhất | `font-extrabold` 552, `font-black` 135 | Không có token weight; không quy định dùng 800/900. |
| Letter spacing / line-height | Một phần | line-height gắn từng cỡ; `tracking-*` 363 lần tự do | Không có token tracking. |
| Truncation | Một phần | `truncate` 320, `line-clamp` 85 | Không có quy tắc chung (khi nào cắt, có tooltip đầy đủ không). |
| Đa ngôn ngữ | Một phần | `ALG_I18N_STANDARD.md`, `useI18n()`; `<html lang="vi">` cố định (`layout.tsx:23`) | Không có kiểm độ dài chuỗi/tràn khi đổi ngôn ngữ. |

## B4. Color System

Có đủ nhóm primary/secondary/accent/bg/surface/border/text/semantic (`globals.css:64-126`), có ghi tỉ lệ tương phản đo bằng công thức (`globals.css:58-63`, 03a §5) — **điểm mạnh**. Khoảng trống:

- **Semantic không nhất quán trong component nền**: `ui/badge.tsx:9` `success: "bg-success-bg text-primary"` (chữ màu thương hiệu, không phải màu thành công).
- **Badge contract lệch**: `COMPONENT_INVENTORY.md` ghi Badge có 6 variant `primary/secondary/outline/success/warning/danger`; code chỉ có prop `tone` với `success/warning/danger/accent/neutral`.
- **Trạng thái tương tác** (hover/active/selected/disabled) không có token riêng ngoài `primary-dark` và `selected`; `disabled:opacity-40` trên Button có thể hạ tương phản dưới 3:1 (chưa đo).
- **Màu trạng thái không đổi theo preset**: `presets.ts` khai `danger/success…` cho từng preset nhưng `ui-provider.tsx` không bơm (0 lần “danger”) → bảng màu trạng thái luôn là Mộc Lan.

## B5. Theme Architecture

| Năng lực | Trạng thái | Bằng chứng |
|---|---|---|
| Global theme | Đã triển khai | `@theme` + `UiSystemProvider` ở root `layout.tsx:35` |
| Product/tier theme | Không triển khai | `scope` chỉ là nhãn gợi ý (`ui-provider.tsx:203`) |
| Brand/tenant theme | Không triển khai | Lựa chọn lưu ở `localStorage` khoá `smeos_ui_config` theo **trình duyệt**, không theo tổ chức; không có cột/setting tenant. |
| Light/Dark | Không triển khai | `UiColorMode` có `dark/system`; không có CSS nào cho `data-color-mode`; 105 lớp `dark:` rải trong 11 tệp không có cơ chế kích hoạt (mã chết). |
| Theme extension | Có nhưng bất nhất | `THEME_PRESET_MECHANISM.md` §4 hướng dẫn thêm preset qua **3 nơi** (`types.ts`, `presets.ts`, `globals.css`) — thực tế 6 preset mới chỉ ở `presets.ts` và vẫn chạy nhờ inline style → hướng dẫn sai và có hai nguồn sự thật. |
| Override governance | Không triển khai | Bất kỳ người dùng nào cũng đổi preset/density/shadow qua UI Studio (A2); không audit log, không giới hạn quyền. |
| Không nháy giao diện (FOUC) | Không đạt | Preset đọc từ `localStorage` **sau** lượt render đầu (`ui-provider.tsx:37-55`) → trang hiện Mộc Lan rồi mới đổi; `UI_ARCHITECTURE_READINESS.md` §2.2 khẳng định “không gây hydration mismatch vì server đọc cookie” — **không có cookie nào được đọc**. |

## Lệnh tái lập

```bash
grep -rEo "\b(bg|text|border|from|to|via|ring|fill|stroke)-(cool|blush|alert|mint|sand|orchid|ocean|azure|navy|petal|aqua|lagoon)-[0-9]{2,3}\b" src --include=*.tsx --include=*.ts | wc -l
grep -rlE "\b(bg-background|text-foreground|text-muted-foreground|border-input|bg-card|bg-muted|bg-popover)\b" src/app src/components --include=*.tsx | wc -l
grep -rn -e "radius-card" -e "shadow-card" -e "ui-transition-duration" src --include=*.tsx --include=*.css | grep -v globals.css
grep -rn "text-primary-fg" src | wc -l
```
