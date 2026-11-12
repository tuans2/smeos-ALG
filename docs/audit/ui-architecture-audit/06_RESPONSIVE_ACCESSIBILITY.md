# F — Responsive & Accessibility Assessment

Điểm miền: **2 / PARTIAL**. **Giới hạn:** không chạy được app (xem `00` §5) → **không có đo thực tế ở 7 khổ**. Mọi dòng dưới đây là phân tích tĩnh mã; ô “Đo thực tế” = **CHƯA KIỂM**. Không suy ra PASS.

## F1. Responsive

### Chuẩn đã ghi
`OPERATING_PRINCIPLES.md` §3 (không cuộn ngang 390px; kiểm 390 + 1280), §6.8 (lưới 2 cột di động), 03a §28, Screen Contract §7 (390/768/1280). **Không** có chuẩn cho 360, 430, 1024, 1440 — các khổ đề bài yêu cầu không được định nghĩa ở đâu.

### Ma trận khổ màn hình

| Khổ | Breakpoint Tailwind gần nhất | Có trong chuẩn? | Có trong test tự động? | Đo thực tế |
|---|---|---|---|---|
| 360 | < sm | Không | Không | CHƯA KIỂM |
| 390 | < sm | Có | `visual.spec.ts` (2 màn), `a11y-done-tools.spec.ts` (10 công cụ), `ux:audit` (tay) | CHƯA KIỂM |
| 430 | < sm | Không | Không | CHƯA KIỂM |
| 768 | md | Contract §7 | Không | CHƯA KIỂM |
| 1024 | lg | Không | Không | CHƯA KIỂM |
| 1280 | xl | Có | `visual.spec.ts` (2 màn), `ux:audit` (tay) | CHƯA KIỂM |
| 1440 | (2xl=1536) | Không | Không | CHƯA KIỂM |

### Rủi ro phát hiện bằng phân tích tĩnh

| ID | Phát hiện | Bằng chứng | Khổ bị ảnh hưởng | Mức |
|---|---|---|---|---|
| UI-F-01 | Panel Copilot rộng cố định 380px, neo `right-5` (20px) | `src/components/chat/alg-global-copilot.tsx` (khối `fixed bottom-5 right-5 z-50 … h-[580px] w-[380px] sm:w-[420px]`) | 360 (tràn trái ~40px), 390 (~10px); cao 580px vượt khung nhìn ngang/thấp; `z-50` phủ lên BottomNav `z-40` | P1 (cần ảnh xác nhận) |
| UI-F-02 | Ba phần tử nổi cùng mép phải không có registry vị trí | Copilot nút `fixed top-1/2 right-3 z-50`; UI Studio `fixed bottom-24 right-6 z-40`; BottomNav `fixed bottom-0 z-40 h-16` + nút giữa nhô `-mt-5` | 360–430 | P2 |
| UI-F-03 | Shell `(platform)` không đệm đáy cho BottomNav | `src/app/(platform)/layout.tsx:50-52` | 360–767 | P2 (cần ảnh xác nhận) |
| UI-F-04 | Bề rộng tối thiểu cố định trong nội dung | `tracking-stepper-view.tsx:61` `min-w-[720px]`; `platform-integrations-matrix.tsx:28` `min-w-[720px]`; 17 chỗ `w-[4xx–9xxpx]` không kèm breakpoint | < 768 (phụ thuộc vùng cuộn bao ngoài) | P3 |
| UI-F-05 | Lưới ≥4 cột không có breakpoint | 7 chuỗi `grid-cols-[4-9]` không kèm `sm:/md:/lg:` | 360–430 | P3 |
| UI-F-06 | Font tải từ Google lúc chạy | `src/app/layout.tsx:27-30` | Mọi khổ — nhảy bố cục (CLS) khi font về; ảnh mẫu visual phụ thuộc mạng (`ci.yml` ghi chú nợ #172) | P3 |

Điểm tốt có bằng chứng: `min-h-dvh` ở shell; Dialog `max-h-[90dvh]`; ép `font-size:16px` cho input ≤767px chống zoom iOS (`globals.css`); `pb-[env(safe-area-inset-bottom)]` ở BottomNav và nội dung `(app)`; 76 vùng `overflow-x-auto`.

## F2. Accessibility (WCAG 2.2 AA)

| Tiêu chí | Chuẩn/cổng hiện có | Bằng chứng mã | Trạng thái |
|---|---|---|---|
| 1.4.3 Tương phản | Tỉ lệ đo bằng công thức cho token chính (`globals.css:58-63`, 03a §5); `OPERATING_PRINCIPLES` §3 cấm `opacity` lên chữ; test 12 phong cách catalog | 2.081 lần dùng thang màu `cool/blush…` không có số đo tương phản; `disabled:opacity-40`; `text-caption` 11px phổ biến | Một phần — axe chỉ chạy trên 13 tuyến |
| 2.1.1 Bàn phím | R5 (`onClick` trên phần tử không tương tác, FAIL với tệp mới) | Chưa kiểm thủ công (`.agents/standards/smeos/03-ux.md` §2 🟡) | Chưa kiểm chứng |
| 2.4.7 / 2.4.11 Focus thấy được, không bị che | `Button` `focus-visible:outline-2` | 336 `outline-none` (cần rà từng chỗ có thay thế); phần tử nổi `fixed` có thể che focus (2.4.11 mới của 2.2) | Chưa kiểm chứng |
| 1.3.1 Ngữ nghĩa | `page-archetypes.md` §1 “một `<h1>`” | 85 tệp tự viết `<h1>`; chưa kiểm số `<h1>` mỗi trang; 44 `<table>` tự viết (chưa rà `<th scope>`) | Một phần |
| 4.1.2 Tên truy cập | R6 (nút icon), R7 (`alt`) — **0 vi phạm** | 502 `aria-label` | Đã triển khai (tự động, phạm vi lint) |
| Screen reader / live region | `LiveRegionProvider` | Có ở `(app)`, **không** ở `(platform)` | Có nhưng bất nhất |
| 2.5.8 Kích thước vùng chạm (≥24px) | `OPERATING_PRINCIPLES` §3 | `Button` nhỏ nhất 32px — đạt; điều khiển tự viết (checkbox, chip, icon 16px) chưa đo | Một phần |
| 3.3.1/3.3.2 Lỗi & nhãn form | Contract `Input` “phải có label” | `Input` không gắn `aria-invalid`/`aria-describedby`; 654 `<input>` thô | Một phần |
| Dialog (4.1.2, 2.4.3 giữ focus) | `ui/dialog.tsx` (base-ui: bẫy focus, Esc) | **38/71** tệp overlay `fixed inset-0` không có `role="dialog"`/`aria-modal`/không dùng `ui/dialog`; panel Copilot không có `role="dialog"` | **UI-F-07 (P1)** |
| 2.3.3 / reduced motion | Không có chuẩn | 294 lớp `animate-*` (`ping`, `pulse`, `spin`, `bounce`); chỉ 2 tệp có `motion-reduce:`; `UiMotionSpeed="reduced"` bơm `--ui-transition-duration` nhưng 0 nơi đọc | **UI-F-08 (P2)** |
| Skip link | Có ở `(app)` | Thiếu ở `(platform)` | Có nhưng bất nhất |
| Ngôn ngữ trang | `<html lang="vi">` | Cố định dù có i18n | Một phần |

### Cổng a11y tự động hiện có (có bằng chứng)

- `tests/e2e/ux/a11y.spec.ts`: axe `wcag2a/2aa/21aa/22aa`, critical+serious = 0, trên `/khong-co-trang-nay` (404), `/`, `/vai-tro`.
- `tests/e2e/ux/a11y-done-tools.spec.ts`: 10 tuyến công cụ ở 390px.
- Job CI `e2e-ux` là điều kiện của `deploy` (`ci.yml` `needs: [web, worker, e2e-ux, security, industry-terms]`).
- `npm run ux:audit` (390/1280 + axe + cuộn ngang) — **chạy tay**, chỉ DB `*_test`, không trong CI.

**Độ phủ:** 13/105 trang có axe tự động (~12%); 0 trang SaaS Mother, 0 trang ChainOS, 0 trang khách xem. Tài liệu tự thừa nhận “axe sạch không đồng nghĩa đạt WCAG” (`OPERATING_PRINCIPLES` §4) — đúng; kiểm thủ công bàn phím/đọc màn hình/zoom 200% **chưa làm**.
