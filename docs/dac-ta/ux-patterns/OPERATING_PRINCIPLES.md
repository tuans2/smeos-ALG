# Nguyên tắc vận hành UX — Progressive Disclosure

> Level 3 SUPPORTING · `CANONICAL` cho agent (PO 29/10/2026, PD8) · nạp qua `CLAUDE.md`.
 Mọi màn/công cụ mới hoặc sửa giao diện **phải** theo cơ chế dưới đây. Đây là bản tóm tắt bắt buộc; luật đầy đủ ở SSOT, khi lệch thì SSOT thắng:
`docs/dac-ta/03a-ux-constitution.md` · `docs/dac-ta/03c-ux-progressive-disclosure.md` (PD1–PD8, UX-015…UX-028, DoD §9) · `docs/dac-ta/ux-patterns/` (UX-P01…P12, `page-archetypes.md`, `visual-review.md`) · nhật ký audit `docs/design-system/audit-log.md`.

## 1. Cơ chế (làm theo thứ tự)
1. **Phân loại trang** theo archetype A–F (`page-archetypes.md`) và khai trong Screen Contract.
2. **Phân tầng** mọi trường/nút theo L0–L4 + SYS (03a UX-003, 03c §2): L0 việc chính luôn thấy; tùy chọn ít dùng vào `Disclosure` (UX-P03); phần hệ thống tự làm (SYS) không hỏi người dùng.
3. **Chọn đúng cách hiển thị thêm** (03c §5b): Disclosure / Drawer / Modal / Tab / Wizard / Tooltip — không wizard cho việc làm xong trong một màn, không tooltip cho thông tin bắt buộc.
4. **Không dùng disclosure để giấu** (UX-017): lỗi, chi phí, điều kiện, rủi ro, quyền luôn hiện.
5. **Trường theo ngữ cảnh** (UX-027): chỉ hiện cấu hình của chế độ đang chọn; đổi chế độ giữ dữ liệu đã nhập.
6. **Mức rủi ro hành động** (UX-015): R3 (xuất bản link công khai, xoá, gửi khách) qua `ConfirmDialog` (`useConfirmPublish` cho link); R2 có hoàn tác hoặc xem trước chi phí.
7. **Tác vụ nền** (UX-016): trạng thái lấy từ backend qua `TaskStatus` + `task-state.ts`, không giả lập tiến trình.
8. **Dùng component chuẩn**, không tự viết: `FeatureGuidanceCard` (K1), `TabActionHeader` (K2), `EmptyState`, `InlineError` (có thử lại), `ResultPanel`, `ConfirmDialog`. K1/K2/shell là UX khoá — đổi phải PO duyệt.

## 2. Nguyên tắc nội dung (bài học audit sâu 29/10/2026)
- **Không dữ liệu giả** trên bề mặt khách thấy: không đánh giá/sao/lượt thích bịa, không cam kết (giao 2h, tươi 5 ngày, 100%…), không đồng hồ đếm ngược, không số điện thoại/địa chỉ mẫu, không ảnh kho (Unsplash) thay ảnh sản phẩm. Thiếu dữ liệu thật → ẩn khối hoặc nhắc người dùng nhập.
- **Ưu đãi chỉ từ Cài đặt → Ưu đãi** (ưu đãi đang bật, đọc ở máy chủ qua `listActiveShopPromotions`). Không mặc định %, AI không tự đặt ưu đãi/thời hạn, không nhận % từ trình duyệt.
- **Thông tin tiệm** (tên, hotline, địa chỉ, logo) lấy từ Hồ sơ tiệm; sản phẩm/giá/ảnh lấy từ dữ liệu sản phẩm thật.
- **Không tự xuất bản**: AI soạn xong → người dùng xem trước → xác nhận mới tạo link.
- **Chữ tiếng Việt tự nhiên**; không mã kỹ thuật (`#01`, `M01a`, tên model AI, "Fallback", "Critic") hay tên mẫu tiếng Anh trên màn hình.
- Ảnh/tệp xuất ra **đúng kích thước ghi trên nhãn**.

## 3. Trợ năng & thị giác (bắt buộc, không chỉ "đẹp")
- Tương phản chữ ≥ 4,5:1: dùng token `*-text` (`text-warning-text`, `text-danger-text`, `text-accent-text`…), không dùng `opacity` lên chữ (kể cả Spotlight), không `text-accent`/`text-warning` trên nền nhạt.
- Mọi ô nhập/nút có nhãn truy cập; vùng bấm ≥ 24px (di động ưu tiên 32–44px); nhóm nút chọn dùng `aria-pressed`, chỉ dùng `role="tab"` khi có tabpanel; không lồng nút trong nút.
- Không cuộn ngang ở 390px; kiểm cả 390px và 1280px.

## 4. Kiểm chứng trước khi báo xong
- Công cụ: `npm run ux:audit -- <kịch bản | /đường-dẫn>` (`scripts/ux-audit/`, chỉ chạy trên database `*_test`) — chụp 390/1280px, axe, cuộn ngang, cảnh báo nội dung; báo cáo ở `ux-audit-output/report.md`, lỗi → mã thoát 1.
- Audit **mọi trạng thái**: rỗng, có dữ liệu, đang chạy, có kết quả, lỗi, hộp thoại mở/đóng, trang khách xem — chụp 390/1280px + axe (critical/serious = 0) + soát nội dung giả/ưu đãi/mã kỹ thuật.
- Gate: `npm run lint:ux -- --check` (ratchet, không tăng R1–R16), typecheck, `npm test`, `check:docs`; ghi kết quả vào nhật ký audit. axe sạch **không** đồng nghĩa đạt WCAG — ghi rõ phần kiểm thủ công chưa làm.
- Finding mức P0/P1 phải sửa trước khi báo xong; đụng UX khoá/token/quy tắc nghiệp vụ → hỏi PO, ghi vào mục "Cần PO quyết".

## 5. Quy trình khi được yêu cầu "nâng cấp trang X"
Làm đủ, đúng thứ tự; báo cáo theo mẫu ở cuối.

1. **Đọc**: Screen Contract của trang (`docs/dac-ta/screen-contracts/`), mã trang + component + test, mục liên quan trong 03a/03c. Xác định archetype A–F và việc chính (L0).
2. **Kiểm kê trạng thái**: liệt kê mọi trạng thái người dùng gặp — rỗng, có dữ liệu, đang chạy, kết quả, lỗi, từng bước wizard, hộp thoại mở/đóng, chế độ AI/thủ công, trang khách xem (link công khai).
3. **Kịch bản audit**: viết/cập nhật `scripts/ux-audit/scenarios/<trang>.mjs` đi qua đủ các trạng thái ở bước 2 (xem kịch bản mẫu `the-chao`, `landing-page`, `poster-banner`, `tinh-gia`).
4. **Audit trước khi sửa**: chạy dev server với database `*_test`, rồi
   `DATABASE_URL=…_test UX_AUDIT_BASE_URL=http://localhost:3200 npm run ux:audit -- <trang>`
   (thiếu kịch bản thì `npm run ux:audit -- /đường-dẫn` để có điểm khởi đầu). Đọc **từng ảnh** trong `ux-audit-output/` — công cụ chỉ bắt axe, cuộn ngang và dấu hiệu nội dung; bố cục, phân tầng, dữ liệu giả, ưu đãi, chữ tiếng Anh/mã kỹ thuật phải soát bằng mắt theo §1–§3 và `visual-review.md`.
5. **Ghi findings** vào `docs/design-system/audit-log.md` (bảng ID · mức P0–P3 · finding · đã làm) — mức theo `visual-review.md` §2.
6. **Phân loại**: P0/P1 và lỗi trợ năng → sửa ngay. Đụng UX khoá (K1, K2, shell, Spotlight), token, quy tắc nghiệp vụ, schema, dependency → **dừng, hỏi PO** (liệt kê ở mục "Cần PO quyết"). Ngoài phạm vi trang → chỉ ghi lại.
7. **Sửa** theo §1–§3, giữ ≤ 350 dòng/tệp (tệp đã vượt thì không làm dài thêm); quy tắc nghiệp vụ hoặc bug mới kèm test; cập nhật Screen Contract/đặc tả trong cùng commit.
8. **Audit lại** cùng kịch bản đến khi không còn ✗ (hoặc ✗ còn lại đã ghi là cần PO); kiểm gate: `typecheck`, `lint:ratchet`, `lint:ux -- --check`, `npm test`, `check:docs` (+ gate khác theo `CLAUDE.md`).
9. **Commit** (Conventional Commits, code + test + tài liệu cùng commit); không tạo PR/merge khi PO chưa cho phép.

Mẫu báo cáo cho PO (tiếng Việt): trang · các trạng thái đã kiểm · findings đã sửa (P0–P3) · kết quả audit lại + gate · phần **chưa** kiểm (bàn phím, zoom, đọc màn hình) · **Cần PO quyết**.

## 6. Phong cách hiển thị "Thoáng – Ít chữ – Icon lớn" (PO duyệt 30/10/2026, mẫu chuẩn `/cong-cu`)
Áp dụng cho màn tổng quan, lưới thẻ, trang chủ công cụ; không thay §1–§3 (khi lệch, §1–§3 thắng).
1. **Nhãn ≤ 5 từ** (tiêu đề thẻ, nút, chỉ số). Câu giải thích, mục đích, cách tính → đưa vào `InfoTip` (`src/components/ui/info-tip.tsx`, icon "?" cạnh nhãn). **Ngoại lệ:** lỗi, chi phí, điều kiện, rủi ro, quyền vẫn phải hiện trực tiếp (UX-017) — không giấu vào "?".
2. **Icon lớn làm điểm nhìn**: thẻ điều hướng dùng ô icon 64px trên máy tính, 48px trên điện thoại (`w-12 h-12 sm:w-16 sm:h-16`) trên nền `bg-primary-muted`; mỗi thẻ đúng 1 icon, cùng một bộ icon chuẩn Phosphor (bọc trong `@/components/ui/icons`), icon chỉ trang trí thì `aria-hidden`.
3. **Nổi khối nội dung chính**: nền trang `bg-bg`, khối chính `bg-surface` + `shadow-sm` + `rounded-2xl`; không kẻ viền dày, không nhiều lớp khung lồng nhau. Mỗi màn chỉ 1 khối nhấn mạnh (màu `bg-primary`) cho việc chính L0.
4. **Khoảng trống**: padding thẻ ≥ 20px (`p-5`, desktop `p-6`), khoảng cách lưới ≥ 16px (desktop 24px), giữa các khu ≥ 32px. Một khu = một ý.
5. **Tooltip dùng được trên điện thoại**: chạm mở/đóng, vùng bấm ≥ 32px, có nhãn truy cập "Giải thích: …"; không lồng `InfoTip` trong nút — thẻ bấm được dùng nút phủ `after:absolute after:inset-0`.
6. **Số liệu**: con số to (`text-display`), nhãn nhỏ phía trên, đơn vị rõ; dữ liệu nhạy cảm (số dư, doanh thu) có nút ẩn/hiện.
7. **Chuẩn thương mại**: mọi thẻ có trạng thái hover/focus nhìn thấy; trạng thái rỗng dùng `EmptyState` (icon lớn + 1 câu + 1 nút); khung xương (`Skeleton`) khi tải; kiểm 390/1280px, cả chế độ màu của ngành.
8. **Điện thoại**: lưới thẻ 2 cột (`grid-cols-2`), không để một thẻ chiếm gần hết màn hình; nhãn không xuống quá 2 dòng.
9. **Tên công cụ**: dùng tên ngắn từ `src/modules/toolkit/domain/tool-short-names.ts`; tên đầy đủ đưa vào `InfoTip`. Không hiện nhãn vô nghĩa với khách (vd. "Cả hai") hay mã số (`#01`, "Công cụ 01").
10. **Đầu trang công cụ**: dùng `ToolHero` (`src/components/ui/tool-hero.tsx`) — icon 64px, tên ≤ 5 từ, giải thích trong "?". Giữ nguyên K1 `FeatureGuidanceCard` và K2 `TabActionHeader`.
11. **Bộ icon chuẩn: Phosphor** qua `AppIcon`/`IconTile` (`src/components/ui/app-icon.tsx`) — không import icon thư viện khác cho icon mới ở nội dung chính. Kiểu `duotone` (ô nhạt, `variant="soft"`) là mặc định; ô đặc `fill` trắng trên nền màu (`variant="solid"`) **chỉ** cho lưới điều hướng chính và icon đầu trang. Màu nhóm dùng token `--color-tone-*` (10 màu, mỗi bước một màu — `MODULE_TONES`); nơi khác dùng màu chính. Icon nhỏ trong nút/menu/bảng: import trực tiếp từng icon từ `@/components/ui/icon-set/<ten>` (vd `import { Camera } from "@/components/ui/icon-set/camera"`; tên kiểu lucide, vẽ bằng Phosphor; `weight="fill"` cho mục đang chọn) — barrel `@/components/ui/icons` kéo cả bộ icon vào trang (test `tests/unit/architecture/icon-imports.test.ts`). Cấm import `lucide-react` (test `tests/unit/architecture/icon-library.test.ts`). Sidebar: icon 20px, mục đang chọn dùng icon đặc. Trang chủ: `ActionCard` dùng ô đặc theo `toneFor(id)`.
