# Bố cục — AppShell, PageLayout và phần tử nổi

> Thuộc Design System SSOT (`README.md`). **Code là nguồn sự thật**; tệp này chỉ là chỉ mục và hợp đồng. Luật chọn loại trang (bắt buộc/tránh, ví dụ) viết **một nơi** ở [`docs/dac-ta/ux-patterns/page-archetypes.md`](../dac-ta/ux-patterns/page-archetypes.md) (ADR-011 D-UI-11) — không chép lại ở đây.
> Đối chiếu mã ngày 07/11/2026.

## 1. Khung ứng dụng (`AppShell`)

Mã: `src/components/layout/app-shell.tsx` — dùng chung cho `(app)` và `(platform)` (ADR-011 D-UI-09).

| Thành phần | Vai trò |
|---|---|
| `LiveRegionProvider` | Vùng thông báo cho trình đọc màn hình — xem [`accessibility.md`](accessibility.md) |
| `ToastProvider` | Thông báo nổi thay `alert()` (lint R13) |
| Liên kết "Bỏ qua tới nội dung" | Nhảy tới `<main id="noi-dung-chinh">` |
| `data-theme` / `data-density` | Gắn trên khung shell theo theme máy chủ phân giải (`resolveUiTheme`) |
| `DesktopNav` / `BottomNav` / `MobileNavDrawer` | Điều hướng: thanh bên từ `md` trở lên, thanh đáy dưới `md` |
| `FloatingLayerProvider` | Điều phối mọi phần tử nổi (mục 3) |

`<main>` chừa đệm đáy `4.5rem + safe-area` dưới `md` để thanh đáy không che nội dung.

## 2. Sáu loại trang (`PageLayout`)

Mã: `src/components/layout/page-layout/` — `PageLayout` chọn bố cục theo `archetype`. Tiêu đề `<h1>` đi qua `PageHeader` (`src/components/ui/page-header.tsx`; lint R20).

| Mã | Thành phần | Độ rộng tối đa trong mã |
|---|---|---|
| A — Tổng quan | `DashboardLayout` | `max-w-7xl` |
| B — Danh sách | `ListLayout` | `max-w-7xl` |
| C — Chi tiết | `DetailLayout` | `max-w-6xl` |
| D — Biểu mẫu | `FormLayout` | `max-w-3xl` (`width="narrow"`) hoặc `max-w-4xl` |
| E — Builder | `BuilderLayout` | `max-w-7xl`, hai cột cấu hình / xem trước |
| F — Cài đặt | `SettingsLayout` | `max-w-5xl` |

Mọi bố cục dùng đệm `p-4 sm:p-6`. Screen Contract khai `archetype` trong front-matter (`check:screen-contracts` kiểm A–F).

**Lệch đã biết:** bảng độ rộng ở ADR-011 D-UI-05 (A/C `max-w-5xl`, B/E `max-w-6xl`) khác mã. Theo nguyên tắc "code là nguồn sự thật", bảng trên phản ánh mã; muốn theo ADR thì phải đổi mã và cập nhật bảng này cùng commit (cần PO duyệt — vùng `src/components/layout/` thuộc CODEOWNERS).

## 3. Phần tử nổi và lớp z-index

Mã: `src/components/layout/floating-layer.tsx` (`useFloatingLayer().registerItem`) và token `src/styles/tokens/z-index.css`:

`--z-base` 0 · `--z-sticky` 20 · `--z-nav` 30 · `--z-floating` 40 · `--z-overlay` 50 · `--z-toast` 60 · `--z-tooltip` 70.

Overlay toàn màn (`fixed inset-0`) phải đi qua `Dialog`/`Drawer`/`BottomSheet` của `src/components/ui/` (lint R19; ngoại lệ có lý do trong `scripts/ux-lint-allow.json`).

## 4. Cổng kiểm

- `npm run lint:ux -- --check` — R19 (overlay tự chế), R20 (`<h1>` ngoài `PageHeader`).
- `npm run check:screen-contracts -- --check` — mọi `page.tsx` có contract v2 khai archetype (job `web` của `ci.yml`).
