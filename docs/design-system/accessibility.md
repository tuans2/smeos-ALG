# Trợ năng — chuẩn WCAG 2.2 AA trong mã và cổng kiểm

> Thuộc Design System SSOT (`README.md`). **Code là nguồn sự thật**; tệp này là chỉ mục. Quy trình và kết quả kiểm 12 hành trình nằm ở [`accessibility-audit-12-journeys.md`](accessibility-audit-12-journeys.md) — không chép lại ở đây.
> Đối chiếu mã ngày 07/11/2026.

## 1. Cơ chế dựng sẵn

| Cơ chế | Mã |
|---|---|
| Thông báo cho trình đọc màn hình | `LiveRegionProvider` + `useAnnounce()` (`src/components/ui/live-region.tsx`), tông `polite`/`assertive`; gắn trong `AppShell` |
| Bỏ qua điều hướng | Liên kết "Bỏ qua tới nội dung" → `<main id="noi-dung-chinh" tabIndex={-1}>` (`src/components/layout/app-shell.tsx`) |
| Tiêu điểm không bị che (2.4.11) | `scroll-padding-bottom` trong `src/app/globals.css`; đệm đáy `<main>` dưới `md` |
| Hành vi bàn phím, focus trong hộp thoại, menu, tab | Thành phần trong `src/components/ui/` dựng trên `@base-ui/react` (ADR-011 D-UI-06) |
| Vùng chạm | Xem [`responsive.md`](responsive.md) §3 |
| Tương phản | Giá trị màu ở `src/styles/tokens/color.css` và `themes.css`; ghi chú tỉ lệ đo ngay cạnh token. Lịch sử chỉnh ở `CHANGELOG.md` (1.3.1) |
| Giảm chuyển động (2.3.3) | Mọi `animate-*` phải kèm `motion-reduce:` (lint R23) |

## 2. Cổng kiểm tự động

| Cổng | Kiểm gì |
|---|---|
| `npm run test:e2e:ux` (job `e2e-ux` trong `ci.yml`) | axe WCAG 2.2 AA — vi phạm `critical`/`serious` là lỗi (`tests/e2e/ux/a11y*.spec.ts`); 12 hành trình: bàn phím, phóng 200%, giảm chuyển động, tương phản trên 3 preset (`a11y-journeys.spec.ts`) |
| `npm run lint:ux -- --check` | R18 điều khiển thô, R19 overlay tự chế, R20 `<h1>` ngoài `PageHeader`, R23 chuyển động |

## 3. Chưa kiểm

- Trình đọc màn hình (VoiceOver, NVDA): chưa thực hiện.
- Tuyến ngoài bộ E2E UX chỉ có kiểm qua lint, không có quét axe — xem phần "Chưa kiểm" của từng Screen Contract.
