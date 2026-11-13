# Responsive — khổ màn hình, điểm ngắt và vùng chạm

> Thuộc Design System SSOT (`README.md`). **Code là nguồn sự thật**; tệp này ghi lại mã đang làm gì và cổng nào kiểm. Con số chuẩn (khổ hỗ trợ, vùng chạm) quyết định ở ADR-011 D-UI-05.
> Đối chiếu mã ngày 07/11/2026.

## 1. Điểm ngắt

Repo **không ghi đè** điểm ngắt: không có `--breakpoint-*` trong `src/styles/tokens/`, nên dùng mặc định Tailwind v4:

| Tiền tố | Từ | Dùng chính trong shell |
|---|---|---|
| `sm` | 640px | Đệm trang `p-4` → `p-6` (`PageLayout`) |
| `md` | 768px | Đổi thanh đáy (`BottomNav`) sang thanh bên (`DesktopNav`) — `app-shell.tsx` |
| `lg` | 1024px | — |
| `xl` | 1280px | — |
| `2xl` | 1536px | — |

Thêm điểm ngắt riêng = thêm token → PR chạm `src/styles/tokens/`, PO duyệt (CODEOWNERS).

## 2. Khổ hỗ trợ

ADR-011 D-UI-05: 360, 390, 768, 1024, 1280, 1440px (430 coi như 390).

| Khổ | Kiểm tự động ở đâu |
|---|---|
| 390×844 | `tests/e2e/ux/visual*.spec.ts`, `a11y-done-tools.spec.ts` |
| 1280×800 | `tests/e2e/ux/visual*.spec.ts`, `a11y-journeys.spec.ts` |
| 640×400 | Phép phóng 200% trong `a11y-journeys.spec.ts` |
| 360, 768, 1024, 1440 | **Chưa có ca kiểm tự động** |

**Lệch đã biết:** ADR-011 D-UI-07 hẹn `ui-weekly.yml` chạy đủ 6 khổ, nhưng workflow này chạy lại cùng bộ `npm run test:e2e:ux` nên thực tế chỉ có 390 và 1280.

## 3. Vùng chạm

- Sàn 24px (WCAG 2.5.8); điều khiển chính và mọi điều khiển trên con trỏ thô ≥ 44px (ADR-011 D-UI-05).
- Mã: `Button` cỡ `xs` và `icon-sm` tự nâng lên 44px khi `@media (pointer: coarse)` (`src/components/ui/button.tsx`). Density (`src/styles/tokens/density.css`) chỉ đổi đệm bảng, thẻ và khoảng cách trường — không đổi chiều cao nút.
- Điều khiển HTML thô ngoài `src/components/ui/` bị lint R18 chặn tăng, vì chúng không thừa hưởng quy tắc trên.

## 4. Chi tiết di động khác

- iOS Safari: ô nhập dưới 768px cỡ chữ 16px để không tự phóng (`src/app/globals.css`).
- Thanh đáy và nút nổi: `scroll-padding-bottom` và đệm `<main>` chừa chỗ để tiêu điểm không bị che (xem [`accessibility.md`](accessibility.md)).
