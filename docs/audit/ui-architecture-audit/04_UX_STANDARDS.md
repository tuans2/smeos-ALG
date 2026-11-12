# D — UX Architecture & Interaction Standards Assessment

Điểm miền: **2 / PARTIAL**. Đây là miền **mạnh nhất về tài liệu**: `docs/dac-ta/03a-ux-constitution.md` (2.101 dòng), `03c-ux-progressive-disclosure.md`, `03b-role-ux.md`, 12 pattern `ux-patterns/p01…p12`, `OPERATING_PRINCIPLES.md`. Điểm bị kéo xuống vì **component và cổng kiểm không theo kịp luật**.

## D1. UX Principles

| Nguyên tắc | Định nghĩa | Thực thi | Trạng thái |
|---|---|---|---|
| User-centered / Journey-first | 03a UX-001 “One Screen, One Primary Job”; 03b 14 vai; `AGENTS.md` Journey-First J1–J7 | `src/components/journey/*` (9 component có thật), trang chủ theo vai | Đã triển khai (một phần) |
| Consistency | 03a §30–31, R1–R3, R12 | ux-lint ratchet | Có nhưng bất nhất — R1 bị lách (B2), R12 chỉ bắt trùng tên |
| Simplicity / density | Content budget (Screen Contract §5), `OPERATING_PRINCIPLES` §6 | Thủ công | Một phần |
| Progressive Disclosure | 03c PD1–PD8, L0–L4/SYS, UX-P03 | `Disclosure` (15 tệp), R15 (10 vi phạm còn lại) | Đã triển khai (một phần) |
| Feedback | UX-016 tác vụ nền, `TaskStatus` + `task-state.ts` | R14 (16 vi phạm còn), `task-state.test.ts` | Đã triển khai (một phần) |
| Error prevention | UX-015 mức rủi ro R1–R3, UX-P07 | `ConfirmDialog` (22 tệp), R13 (21 `window.confirm` còn) | Một phần |
| Recognition over recall | 03a, icon + nhãn ≤5 từ (§6.1) | Thủ công | Một phần |
| Efficient workflows | `NextActions`, UX-P05 | Chỉ trong luồng journey | Một phần |

## D2. Interaction Standards

| Trạng thái | Chuẩn | Hiện thực | Trạng thái |
|---|---|---|---|
| Hover | §6.7 “mọi thẻ có hover/focus nhìn thấy” | Có trong `Button`, `Card interactive` | Một phần — không token |
| Focus | 03a §32; `Button` `focus-visible:outline-2 outline-primary` | 442 `focus-visible:` nhưng **336 `outline-none`** (nhiều chỗ kèm `focus:ring`) | Có nhưng bất nhất — chưa đo focus thấy được trên mọi phần tử tuỳ biến |
| Active / pressed | `aria-pressed` cho nhóm nút chọn (§3) | Không có token/variant `pressed` | Một phần |
| Disabled | `disabled:opacity-40` | Không có quy định tương phản khi disabled; không quy định giải thích lý do khoá (trừ UX-P11) | Một phần |
| Loading | `Skeleton` cho bố cục đã biết, spinner cho thao tác ngắn (skill §6), R9 | `Button` **không có trạng thái loading** → mỗi nơi tự làm | Có nhưng bất nhất |
| Success | UX-P05 `ResultPanel` (2 tệp) | Không có Toast | Một phần |
| Error | UX-P06, `InlineError` có `role="alert"` + nút thử lại | 58 tệp | Đã triển khai |
| Confirmation | UX-P07, `useConfirmDialog`, `useConfirmPublish` | 22 tệp; R13 ratchet | Đã triển khai (còn nợ) |
| Undo | 03c: “R2 có hoàn tác **hoặc** xem trước chi phí” | 7 tệp nhắc “hoàn tác/undo”; **không có cơ chế undo dùng chung** | Không triển khai (cơ chế) |
| Keyboard | 03a §32, R5 | Có phím tắt `/`, `⌘B`, `⌘K` trong nav/copilot; chưa kiểm thủ công (`.agents/standards/alg/03-ux.md` §2: 🟡) | Chưa kiểm chứng |
| Touch | `OPERATING_PRINCIPLES` §3 “vùng bấm ≥ 24px (di động ưu tiên 32–44px)” vs `COMPONENT_CONTRACTS` “`default` h-12 Touch Target chuẩn” vs `Button size="xs"` 32px | Ba con số khác nhau | Có nhưng bất nhất |

## D3. Form Standards

| Hạng mục | Chuẩn | Thực tế | Trạng thái |
|---|---|---|---|
| Validation, inline error | UX-P02 “Validation gần trường”; `Input.hasError` + `InlineError` | Không có `FormField` gắn kết; `Input` không đặt `aria-invalid` | Một phần |
| Required / optional | UX-P02 “Đánh dấu trường bắt buộc rõ ràng” | Không có quy ước hiển thị (dấu `*`? chữ “bắt buộc”?); ~51 chỗ tự vẽ `*` | Có nhưng bất nhất |
| Default values | UX-P02 “Ưu tiên giá trị đã lưu hợp lệ”; `OPERATING_PRINCIPLES` §2 cấm mặc định % ưu đãi | Thủ công | Một phần |
| Autosave | Không có chuẩn | — | Không triển khai |
| Submission feedback | UX-P05 / skill §7 Toast | Không Toast | Một phần |
| Form persistence | UX-027 “đổi chế độ giữ dữ liệu đã nhập” | Không có cảnh báo rời trang (`beforeunload` 0 tệp), không cơ chế nháp chung | Một phần |
| Multi-step | UX-P02, 03c §5b “không wizard cho việc làm xong trong một màn” | `JourneyShell`/`JourneyProgress`, `upload-wizard.tsx` (1.458 dòng) | Một phần |

## D4. Feedback Standards

| Kênh | Component | Trạng thái |
|---|---|---|
| Toast | **Không có** (skill `ui-development` §7 yêu cầu) | Không triển khai — **UI-D-01 (P2)**: hướng dẫn trỏ tới thứ không tồn tại |
| Notification (in-app) | `src/components/notification/*` + skill `notifications` | Đã triển khai |
| Alert inline | `InlineError`, `FeatureGuidanceCard` (K1), `PreviewNotice` (0 nơi dùng) | Một phần |
| Confirmation dialog | `ConfirmDialog` | Đã triển khai |
| Loading indicator | `TaskStatus`, `Progress` (7 tệp) | Đã triển khai |
| Skeleton | `Skeleton`, `SkeletonBlock` (90 tệp) | Đã triển khai |
| Empty state | `EmptyState` (37 tệp); UX-P08 phân biệt 4 loại rỗng | Một phần — component không có prop phân loại (chưa có/lọc rỗng/không quyền/lỗi) |
| Error state | `error.tsx` 2 nhóm route + `global-error.tsx`; `InlineError` | Một phần |
| Success state | `ResultPanel` (2 tệp) | Một phần |
| Live region | `LiveRegionProvider` (chỉ shell `(app)`) | Một phần (thiếu ở `(platform)`) |

## D5. Responsive UX

Chuẩn: 03a §28 (“đổi thứ tự ưu tiên, không chỉ thu nhỏ”), `OPERATING_PRINCIPLES` §3 (“Không cuộn ngang ở 390px; kiểm 390 và 1280”), §6.8 (lưới 2 cột di động). Thực thi tự động: `ux:audit` (390/1280, chỉ chạy tay), E2E UX (390/1280 cho 2 màn). Chi tiết đo ở `06_RESPONSIVE_ACCESSIBILITY.md`.

| Hạng mục | Trạng thái |
|---|---|
| Mobile-first | Một phần — tài liệu có, nhiều trang dựng desktop trước (`fixed w-[400px+]` 17 chỗ) |
| Touch target | Có nhưng bất nhất (D2) |
| Safe area | Một phần — BottomNav và `(app)` content có; `(platform)` content, Copilot, UI Studio không |
| Bottom navigation | Đã triển khai |
| Mobile form | Một phần — `globals.css` ép 16px cho input ≤767px để tránh iOS zoom (`!important`) |
| Mobile table | Có nhưng bất nhất — `Table` có `overflow-x-auto` nhưng không ai dùng; 76 chỗ `overflow-x-auto` tự đặt |
| Keyboard overlap | Một phần — Dialog `max-h-[90dvh]`; không có chuẩn chung |
| Floating element collision | **Không triển khai** — không registry vị trí/z-index (xem F) |

## Mâu thuẫn trong bộ luật (cần PO quyết)

1. Ngưỡng vùng chạm: 24px (`OPERATING_PRINCIPLES` §3) · 44–48px (`COMPONENT_CONTRACTS` §1) · `xs` 32px trong bảng.
2. Icon: `OPERATING_PRINCIPLES` §6.2 “cùng một bộ icon (lucide)” mâu thuẫn §6.11 “Bộ icon chuẩn: Phosphor… Cấm import `lucide-react`” — **cùng một tệp**.
3. Hai cơ chế giải thích: `InfoTip` (bắt buộc §6.1) vs `Tooltip` Radix — không có quy tắc chọn.
4. 03c §5b cho phép “Drawer” nhưng không có component Drawer chuẩn.
