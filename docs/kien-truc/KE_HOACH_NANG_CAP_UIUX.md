# KẾ HOẠCH THỰC THI CHI TIẾT — NÂNG CẤP UI/UX ALG-CORE (bản giao việc cho AI Agent)

**Mã định danh:** `DOC-05-KE-HOACH-NANG-CAP-UIUX` · **Phiên bản:** 2.0 (26/09/2026, thay bản 1.0 cùng ngày)
**Trạng thái:** SUPPORTING (Level 5). PO duyệt từng giai đoạn trước khi agent viết mã.
**Người đọc chính:** AI Coding Agent (Claude Code, Cursor, Antigravity, Codex). Người đọc phụ: PO, người review.
**Đặc tả gốc (tệp này là lớp thực thi, không thay thế):**

| Viết tắt | Tệp | Vai trò |
|---|---|---|
| **03-UX** | `docs/dac-ta/03-ux-architecture.md` | Khung UX, bản đồ màn, trạng thái (§15), mobile-first (§17), Macro→Micro (§18) |
| **03b** | `docs/dac-ta/03b-role-ux.md` | 14 vai trải nghiệm (CANONICAL) |
| **03a** | `docs/archive/drafts/FLORAOS_UX_CONSTITUTION_DRAFT.md`, sẽ thành `docs/dac-ta/03a-ux-constitution.md` ở T0.2 | Chuẩn chất lượng UX toàn cục |
| **Contract** | `docs/kien-truc/ALG_ROLE_UX_EXECUTION_CONTRACT.md` v1.1 | Khung audit theo vai |
| **SSOT-TPL** | `docs/kien-truc/ALG_TEMPLATE_SYSTEM_SSOT.md` | 5 họ template, component dùng chung |
| **AGENTS** | `AGENTS.md` | Quy ước repo, Bẫy |

---

## PHẦN I — CÁCH DÙNG TÀI LIỆU NÀY

### I.1. Cho PO: giao việc thế nào

1. Điền **Bảng quyết định** (Phần II). Việc nào có cột "Cổng" chưa điền thì agent **không được làm**.
2. Giao cho agent **đúng một thẻ việc** (hoặc một nhóm thẻ liền nhau cùng giai đoạn) bằng **Prompt mẫu** ở Phần VI.
3. Agent trả về báo cáo theo mẫu ở Phần VII. PO kiểm theo ô "Tiêu chí xong" của thẻ, rồi mới giao thẻ tiếp theo.

### I.2. Cho Agent: luật vận hành (BẮT BUỘC)

**A. Trước khi bắt đầu một thẻ**
1. Đọc: `docs/00-DOCUMENTATION-CONSTITUTION.md`, `docs/kien-truc/TRANG_THAI.md` mục 1, `AGENTS.md` (mục Quy ước và Bẫy), 03b, và các tệp trong ô **"Đọc trước"** của thẻ.
2. Chạy `git status --short`. Nếu tệp trong ô **"Được sửa"** của thẻ đang có thay đổi chưa commit mà **không phải của bạn** → **DỪNG**, báo PO (có thể một phiên khác đang làm).
3. Kiểm **Cổng quyết định** của thẻ trong Phần II. Ô trống → **DỪNG**, báo PO.
4. Kiểm **Phụ thuộc**: thẻ phụ thuộc phải có trạng thái XONG trong `Checklist_Thuc_Thi.md` mục "UIUX".
5. Ghi baseline: `npx tsc --noEmit 2>&1 | grep "error TS" | sort > /tmp/tsc-before.txt`. Từ khi có T2.x thì chạy thêm `npm run lint:ux -- --json > /tmp/ux-before.json`.

**B. Trong khi làm**
1. **Chỉ sửa tệp trong ô "Được sửa".** Cần sửa tệp ngoài danh sách → dừng và hỏi. Ngoại lệ: tài liệu ở ô "Cập nhật tài liệu".
2. **Không đổi hành vi nghiệp vụ.** Không sửa `src/modules/**/use-cases`, `domain` (trừ khi thẻ ghi rõ), route API, lược đồ Prisma. Thấy lỗi nghiệp vụ → ghi nợ mới, **không sửa**.
3. **Không bịa dữ liệu, không hiện số không đo được** (AGENTS "Bẫy": *"Con số hiển thị cho người dùng phải là số ĐO hoặc không hiển thị"*). API trả 403 → ẩn khối, không hiện 0.
4. **Dùng lại trước, tạo mới sau:** REUSE > EXTEND > COMPOSE > CREATE. Tạo component mới phải ghi lý do theo mẫu 03a §30 vào Screen Contract.
5. **Không thêm dependency npm** trừ khi thẻ ghi rõ. Thư viện đã có sẵn và dùng được: `@radix-ui/react-select`, `@radix-ui/react-tooltip`, `@radix-ui/react-separator`, `@base-ui/react` (đã cài, chưa dùng — có Dialog, Popover, Collapsible), `class-variance-authority`, `lucide-react`, `tw-animate-css`.
6. **Next.js 16 không phải bản bạn nhớ.** Trước khi viết `loading.tsx`, `error.tsx`, `not-found.tsx`, `redirect`, `Link` có kiểu (typed routes), đọc hướng dẫn trong `node_modules/next/dist/docs/`. Typed routes: chuỗi tuyến động thì ép `as never` như cách repo đang dùng.
7. **Tiếng Việt** cho nhãn giao diện, mã nguồn tiếng Anh, tên biến tiếng Việt không dấu được phép (repo đang dùng: `napLai`, `dangTai`…). Nhãn nút mô tả kết quả (03a UX-009): "Tạo đơn", "Chạy lại job" — không dùng "Xử lý", "Tiếp tục", "Submit".
8. **Quy chuẩn PO đã khoá** trong AGENTS.md (FeatureGuidanceCard, Top-Right Action Header, Dẫn chứng video kép Market Intelligence, Atomic Fields) chỉ được đổi đúng như phán quyết K1–K3 ở Phần II.
9. **Không đụng vùng Điều phối** cho tới khi ĐP-4c đóng (xem `TRANG_THAI.md`): `src/components/coordinator/**`, `src/components/templates/coordinator/**`, `src/app/(app)/dieu-phoi/**`, `src/app/(platform)/van-hanh/truong-du-lieu/**`, `src/modules/coordinator/**`, `src/modules/field-platform/**`. Chỉ các thẻ ghi rõ "vùng Điều phối" mới được chạm.

**C. Trước khi báo xong**
1. Chạy **cổng chung** (I.3). Tất cả phải đạt, hoặc ghi rõ cổng nào không chạy được trong môi trường của bạn và vì sao.
2. Cập nhật tài liệu theo ô "Cập nhật tài liệu" của thẻ, cộng: `TRANG_THAI.md` (một đoạn), `Checklist_Thuc_Thi.md` mục "UIUX" (tích ô của thẻ), `TECHNICAL_DEBT.md` (nợ mới, lấy số tiếp theo lớn nhất hiện có).
3. Commit (nếu phiên được phép commit): **mỗi thẻ một commit**, message theo mẫu `ui(<phạm vi>): <mã thẻ> <mô tả ngắn tiếng Việt>`, ví dụ `ui(nav): T3.2 gom điều hướng theo việc`. Không gộp thay đổi của phiên khác.
4. Báo cáo theo Phần VII.

**D. ĐIỀU KIỆN DỪNG (báo PO, không tự quyết)**
- Hai tài liệu cùng cấp mâu thuẫn nhau (Hiến pháp: Zero Guessing Rule).
- Cần sửa tệp ngoài ô "Được sửa", hoặc tệp đó đang có thay đổi của phiên khác.
- Cần một trường dữ liệu, endpoint hay năng lực chưa tồn tại.
- Cổng quyết định chưa điền.
- Thay đổi làm tăng số lỗi `tsc`, lỗi `eslint`, hoặc số vi phạm `lint:ux`.
- Chụp so sánh lệch ngoài phạm vi thẻ (màn không liên quan bị đổi).

Mẫu báo DỪNG:
```yaml
status: BLOCKED
the_viec: T?.?
ly_do:
bang_chung: [tệp:dòng, lệnh + kết quả]
anh_huong:
de_xuat:
```

### I.3. Cổng chung của mọi thẻ

| # | Lệnh | Đạt khi | Ghi chú môi trường |
|---|---|---|---|
| G1 | `npx tsc --noEmit` | Không thêm dòng `error TS` so với `/tmp/tsc-before.txt` | Lỗi "thiếu model Prisma" là lỗi CHỜ `prisma generate` của ĐP-3, không tính |
| G2 | `npx eslint <các tệp đã sửa>` | 0 error (warning có sẵn không tính) | |
| G3 | `npm test` | Xanh | VM cầu nối (device bridge) **không chạy được vitest** (thiếu `@rollup/rollup-linux-arm64-gnu`). Khi đó: chạy test mới của thẻ ở môi trường khác được thì chạy, và ghi "G3 chờ anh Tony chạy trên Mac" |
| G4 | `node scripts/check-docs.mjs` | "✓ Tài liệu khớp mã." | |
| G5 | `npm run check:template-ssot` | Xanh, nếu thẻ chạm `src/components/templates/**` | VM có thể không chạy được (esbuild) — ghi chờ |
| G6 | `npm run lint:ux -- --check` | Không tăng vi phạm (từ khi T2.3 xong) | |
| G7 | Chụp so sánh (từ khi T7.1 xong): `npm run test:e2e -- tests/e2e/ux/visual.spec.ts` | Chỉ lệch ở màn trong phạm vi thẻ. Cập nhật ảnh mốc có chủ đích bằng `--update-snapshots` và nêu trong báo cáo | Cần `npm run dev` |

### I.4. Quy mô và đơn vị

Mỗi thẻ ghi **Quy mô**: S (≤ 1 phiên agent, ≤ 5 tệp), M (1–2 phiên, ≤ 15 tệp), L (2–4 phiên hoặc > 15 tệp — nên chia nhỏ khi giao). "Phiên" là một lượt làm việc liên tục của agent đến khi báo cáo.

---

## PHẦN II — BẢNG QUYẾT ĐỊNH (PO ĐIỀN)

Agent **chỉ đọc** bảng này. Ô "Quyết định PO" trống thì thẻ phụ thuộc bị chặn.

| Mã | Câu hỏi | Bằng chứng hiện trạng | Phương án đề xuất | Quyết định PO | Chặn thẻ |
|---|---|---|---|---|---|
| **K1** | Khối hướng dẫn `FeatureGuidanceCard` | **Đính chính so với đánh giá trước:** component ĐÃ tự thu gọn sau lần xem đầu (`localStorage` khoá `floraos_guidance_seen_<id>`, `templates/shared/feature-guidance-card.tsx`). Vấn đề còn lại: (1) màu `red-*` thô ngoài token; (2) nhiều màn đặt **3 khối** cùng lúc (`/khach-hang`, `/hoi-thoai`, `/tri-thuc`, `/ho-so`) — trái 03a UX-008/§43; (3) chưa giới hạn độ dài mô tả/mẹo | (a) Giữ nguyên cấu trúc, vị trí, hành vi thu gọn. (b) Màu chuyển sang token `--color-guidance-*` với **giá trị giữ nguyên** như hiện tại (không đổi thị giác). (c) **Tối đa 1 khối mỗi màn/tab.** (d) Mô tả ≤ 3 dòng ở 390px, ≤ 3 mẹo | ☑ **ĐỒNG Ý (a–d)** (PO duyệt 26/09/2026) | T4.6, T5.x có khối hướng dẫn |
| **K2** | Thanh nút góc phải (Top-Right Action Header) | AGENTS.md cho "nhiều nút 1-chạm hiển thị trực tiếp"; `TabActionHeader` nhận mảng `primaryActions` không giới hạn; `/dieu-phoi` có 2 nút ngang hàng | Giữ vị trí góc phải. **Tối đa 1 nút biến thể `primary`** + tối đa 2 nút `outline/secondary` + menu `…` cho phần còn lại. `TabActionHeader` cảnh báo ở môi trường dev khi có > 1 `primary` | ☑ **ĐỒNG Ý** (PO duyệt 26/09/2026) | T5.x, T1.10 |
| **K3** | Dẫn chứng video kép Market Intelligence | AGENTS.md bắt buộc cặp thumbnail TikTok + YouTube trên **mọi** thẻ cơ hội/xu hướng; `market-intelligence` có 1.476 lớp màu thô, 33 tệp | Giữ bắt buộc dẫn chứng. Thẻ **danh sách** chỉ hiện chỉ báo gọn ("2 video dẫn chứng" + 2 biểu tượng nền tảng); cặp thumbnail đầy đủ ở **lớp chi tiết** (drawer/modal) | ☑ **ĐỒNG Ý** (PO duyệt 26/09/2026) | T5.C1 |
| **K4** | Vị trí Constitution | Hiến pháp tài liệu: SSOT ở `docs/dac-ta/` + REGISTRY | `docs/dac-ta/03a-ux-constitution.md`, Level 3 CANONICAL; bản DRAFT → ARCHIVED | ☑ **ĐỒNG Ý** (PO duyệt 26/09/2026) | T0.2 |
| **K5** | Nhóm điều hướng theo việc | 22 mục / 4 nhóm theo module (`desktop-nav.tsx`) | Xem T3.2 (6 nhóm) | ☑ **ĐỒNG Ý tên nhóm T3.2** (PO duyệt 26/09/2026) | T3.2 |
| **K6** | Trình tự thực hiện | — | UX-0 → (UX-1 ∥ UX-2 ∥ UX-3) → UX-5 đợt A (+UX-4 theo thư mục) → B → C → D; UX-6 theo cổng dữ liệu | ☑ **ĐỒNG Ý** (PO duyệt 26/09/2026) | Mọi thẻ UX-1+ |
| **D-RU4** | Đa vai / chuyển vai | `memberships @@unique([organization_id, user_id])` | Hoãn (nợ #162) | ☑ **HOÃN** (PO xác nhận 26/09/2026) | T6.9 |
| **Q-TC** | Thợ cắm vào danh mục vai trải nghiệm? | Có trong PRD §152, chưa có vai hệ thống; lát cắt xưởng đã có trong M10 | Thêm vai 15 `florist` trạng thái "Đang phát triển" | ☑ **THÊM** (PO duyệt 26/09/2026, nợ #169) | T6.13 |
| **Q-MO** | Thứ tự mở vai | Xem UX-6 | `product_manager` → `marketing` + `lead_marketing` → `crm` → `customer_service` → (chờ ĐP-4) `finance_accounting`, `quality_control`, `partner_manager` → `ceo`/`manager` | ☑ **ĐỒNG Ý** (PO duyệt 26/09/2026) | T6.1–T6.8 |
| **Q-E2E** | Tài khoản mẫu cho E2E theo vai | Chưa có | Seed 3 tài khoản trong DB test: `e2e-dieu-hanh@floraos.test`, `e2e-sale@…`, `e2e-dieu-phoi@…` (mật khẩu lấy từ biến môi trường `E2E_PASSWORD`) | ☑ **ĐỒNG Ý** (PO duyệt 26/09/2026) | T7.2 |

---

## PHẦN III — HIỆN TRẠNG ĐO ĐƯỢC (26/09/2026)

Agent dùng số liệu này làm mốc, **không cần đo lại** trước khi bắt đầu (T2.x sẽ đo lại tự động).

### III.1. Quy mô giao diện
- 25 tuyến trong `src/app/(app)` (kể cả `vai-tro` mới), 6 tuyến Console trong `src/app/(platform)/van-hanh`, 233 tệp `.tsx` trong `src/app` + `src/components`. Tất cả trang `(app)` là client component (`"use client"`).
- Tuyến lớn nhất (tổng dòng `.tsx` trong thư mục tuyến): `tai-anh` 2.128 · `kho-templates` 1.046 · `san-pham` 902 · `noi-dung` 660 · `hoi-thoai` 656 · `lich-dang` 525 · `creative-studio` 489 · `video` 472 · `gia` 471 · `duyet` 431.

### III.2. Vi phạm theo thư mục `src/components`

| Thư mục | Tệp | Màu thô | `text-[Npx]` | `aria-*` |
|---|---|---|---|---|
| market-intelligence | 33 | **1.476** | 256 | 3 |
| templates | 68 | 692 | 371 | 8 |
| creative-studio | 22 | 302 | 327 | 12 |
| catalog | 10 | 201 | 32 | 0 |
| chat | 5 | 77 | 24 | 2 |
| coordinator | 2 | 66 | 6 | 2 |
| ui | 14 | 55 | 16 | 3 |
| orders | 2 | 51 | 2 | 0 |
| storage | 2 | 38 | 42 | 0 |
| profiles | 4 | 37 | 9 | 0 |
| crm / sales / layout / organization / knowledge-base / video-studio / dashboard | — | 29 / 29 / 25 / 22 / 19 / 19 / 9 | 5 / 31 / 22 / 4 / 8 / 19 / 79 | 0 / 0 / 8 / 0 / 0 / 0 / 14 |

Toàn repo (`src/app` + `src/components`): màu thô **2.211**, `text-[Npx]` **1.596**, mã hex trong `.tsx` **103**, `aria-*` **54**, `focus-visible` ở 1 tệp (thêm `Button` ngày 26/09).

### III.3. Trạng thái và tương tác
- `loading.tsx` / `error.tsx` / `not-found.tsx` cấp tuyến: **0**.
- Khung xám `animate-pulse` tự vẽ ở **21 tệp**: `(app)/video/page.tsx`, `(app)/tai-anh/page.tsx`, `(app)/noi-dung/page.tsx`, `video-studio/{video-rendering-progress,video-job-list}.tsx`, `coordinator/control-tower-dashboard.tsx`, `chat/{alg-global-copilot,public-storefront-chat-widget}.tsx`, `catalog/landing-templates/{landing-template-hero,landing-template-products}.tsx`, `dashboard/{store-manager-dashboard,sales-workspace}.tsx`, `market-intelligence/{timeframe-distribution-bar,executive-summary-cards,research-status-banner,research-runs-table}.tsx`, `templates/social-publishing/post-status-report-card.tsx`, `templates/content-engine/{social-post-preview,multichannel-post-card}.tsx`, `upload/upload-wizard.tsx`, `flow/flow-steps.tsx`.
- Chữ "Đang tải…" thay cho khung xám ở **21 chỗ**: `(app)/bo-may/page.tsx:124`, `(app)/san-pham/page.tsx:88`, `(app)/job/[id]/page.tsx:124`, `(app)/job/page.tsx:91`, `(app)/duyet/page.tsx:212`, `(platform)/van-hanh/{to-chuc/[id]:54, to-chuc:41, muc-dung:38, nhat-ky:42, suc-khoe:39, page:59}`, `(platform)/van-hanh/truong-du-lieu/_components/*` (4 chỗ — vùng Điều phối, để sau), `organization/occasions-settings-form.tsx:183`, `creative-studio/voice-clone-panel.tsx:72`, `crm/customer-detail-modal.tsx:101`, `templates/coordinator/sales-order-intake-modal.tsx:752` (vùng Điều phối), `orders/order-detail-modal.tsx:162`, `profiles/greeting-line-override-form.tsx:148`.
- `onClick` trên phần tử không tương tác: `(app)/duyet/page.tsx:370` (div), `creative-studio/video-workspace.tsx:254` (div), `catalog/catalog-management-tab.tsx:129` (Card), `catalog/catalog-storefront.tsx:158` (div). Các lớp phủ `fixed inset-0 … onClick={close}` là nền modal — xử lý ở T1.8 (Dialog), không tính.
- **Modal tự dựng không có component chung: 33 tệp** dùng `fixed inset-0` (không bẫy focus, phần lớn không đóng bằng Esc, không `aria-modal`). Danh sách ở T1.8.
- Nút icon `size="icon"`: 5 chỗ, kích thước `h-9 w-9` (36px < 44px của 03-UX §17).

### III.4. Điều hướng
- `desktop-nav.tsx`: 22 mục trong 4 nhóm "Hành Trình Giá Trị / Tài Sản & Tri Thức / Công Cụ Độc Lập / Vận Hành Tiệm". Chỉ `/cai-dat-ai` (`U1`) và `/audit` (`A4`) gác theo năng lực. Badge kỹ thuật: "M01b", "Khu vực A-F", "SSOT", "Tháp Vận Hành", "Xu hướng & Từ khóa", "Đa Kênh". Có popover "Tất cả phân hệ" lặp lại toàn bộ danh sách. Có nhóm "Việc chính · <vai>" (Role UX 26/09). 3 mục "Sắp có" vô hiệu.
- `bottom-nav.tsx`: Trang chủ · [ô theo vai] · Duyệt/Job của tôi · Tải ảnh (nút giữa nổi) · Thêm.
- Mục đang chọn dùng `bg-red-50 text-red-700` (màu thô), không dùng token.

### III.5. Component có sẵn (REUSE trước)
- `src/components/ui/`: `badge`, `button` (cva: `primary|secondary|outline|ghost|warning`, size `default h-12 | sm h-11 | icon h-9`), `card`, `feature-guidance-card` (re-export), `flower-placeholder`, `global-image-zoom`, `inline-source-picker`, `input`, `progress`, `select` (Radix), `separator` (Radix), `stage-gate-approval-bar`, `tab-header` (`TabActionHeader`: `tabs`, `primaryActions[]`, `overflowActions[]`), `tooltip` (Radix).
- `src/components/templates/`: 14 thư mục họ template (SSOT-TPL), `shared/feature-guidance-card.tsx`.
- `src/components/flow/flow-steps.tsx` (checklist theo bước), `src/components/result/*`, `src/components/upload/upload-wizard.tsx`.

### III.6. Năng lực dùng để gác điều hướng (đã xác minh trong `capability-catalog.ts`)

| Tuyến | Mã | Tên năng lực | Mặc định có ở |
|---|---|---|---|
| `/san-pham` | `L1` | product.read | dieu_hanh, dieu_phoi, sale |
| `/gia` | `L6` | *(trang đang gác `can("L6")`)* | xem catalog |
| `/don-hang` | `R1` | order.read | cả 3 |
| `/khach-hang` | `Q1` | crm.customer.read | cả 3 |
| `/hoi-thoai` | `T1` | chat.conversation.read | cả 3 |
| `/market-intelligence` | `V2` | market_intel.opportunity.read | cả 3 |
| `/dieu-phoi` | `C23` | pricing_card.dispatch_board.view | dieu_hanh, dieu_phoi |
| `/tai-anh` | `H1` | vision.analyze | xem catalog |
| `/kho-du-lieu` | `G1` | asset.read | cả 3 |
| `/job` | `G4` | job.read | cả 3 |
| `/cai-dat-ai` | `U1` | ai.policy.read | dieu_hanh, dieu_phoi |
| `/so-lieu` | `U3` hoặc `G8` | ai.request.read / usage.read | dieu_hanh |
| `/bo-may` | `H4` | *(trang đang gác `can("H4")`)* | xem catalog |
| `/catalog` | `J1` | catalog.create | dieu_hanh, dieu_phoi |
| `/creative-studio` | `I1` | media.optimize | xem catalog |
| `/creative-studio?tab=area-d` | `I4` | media.variant.run | xem catalog |
| `/ho-so` | `F1` | org.read | cả 3 |
| `/video`, `/noi-dung`, `/lich-dang`, `/kho-templates`, `/tri-thuc`, `/ket-noi` | **chưa xác minh** | — | T3.3 bước 1 xác minh bằng cách đọc `requireCapability` trong route GET chính mà trang gọi |

---

## PHẦN IV — THẺ VIỆC

Bản đồ phụ thuộc:

```text
UX-R (XONG 26/09)
   │
UX-0  T0.1 → T0.2 → T0.3 → T0.4 → T0.5 → T0.6
   │
   ├── UX-1  T1.1 … T1.10      (trạng thái, component nền, trợ năng)
   ├── UX-2  T2.1 … T2.6       (UX Lint, ratchet)
   └── UX-3  T3.1 … T3.9       (điều hướng)
           │
           ▼
UX-5  SOP + đợt A (T5.A1–A6) → đợt B (T5.B1–B8) → đợt C (T5.C1–C6) → đợt D (T5.D1–D12)
UX-4  T4.1–T4.3 (token) trước đợt A; T4.4 codemod; T4.5.x chạy từng thư mục ĐI KÈM đợt UX-5 tương ứng
UX-6  T6.1–T6.13 theo cổng dữ liệu (độc lập với UX-5 đợt C/D)
UX-7  T7.1–T7.3 sau UX-1; T7.4 sau T7.1–T7.3; T7.5 cuối cùng
```

---

### UX-R — Role UX nền (XONG 26/09/2026, chỉ kiểm lại)

**TR.1 — Kiểm Role UX trên máy thật** · Quy mô S · Người làm: anh Tony hoặc agent có Postgres + trình duyệt
1. Chạy `npm test`. Ca `src/modules/organization/domain/role-ux-catalog.test.ts` (11 ca) phải xanh.
2. `npm run dev`, đăng nhập lần lượt bằng tài khoản vai `dieu_hanh`, `sale`, `dieu_phoi`:
   - `dieu_hanh`: `/` hiện `StoreManagerDashboard`, khối đầu là "Cần can thiệp" (hoặc "Không có việc cần can thiệp").
   - `sale`: `/` hiện `SalesWorkspace` gồm nút "Tạo đơn" + khối "Khách cần liên hệ" + khối "Đơn nháp cần chốt".
   - `dieu_phoi`: `/` chuyển sang `/dieu-phoi`, góc phải có menu tài khoản.
   - Cả ba vai: menu tài khoản → "Vai trò" → `/vai-tro` hiện 14 vai, 10 vai mờ đi với nhãn "Đang phát triển".
   - Desktop: nhóm "Việc chính · <vai>" đứng đầu thanh bên; 3 mục "Sắp có" không bấm được.
3. Lỗi thì ghi nợ và giao lại, kèm ảnh chụp.

**Tiêu chí xong:** ☐ `npm test` xanh ☐ 3 vai đúng trang chủ ☐ `/vai-tro` đúng ☐ không lỗi console.

---

### UX-0 — Quản trị và phán quyết

#### T0.1 — Ghi quyết định PO vào tài liệu
- **Quy mô:** S · **Phụ thuộc:** PO đã điền Phần II · **Cổng:** K1–K6, D-RU4, Q-TC, Q-MO
- **Được sửa:** `docs/kien-truc/KE_HOACH_NANG_CAP_UIUX.md` (Phần II: chép quyết định vào cột "Quyết định PO"), `docs/dac-ta/03b-role-ux.md` §1 (thêm D-RU4 chính thức nếu PO trả lời, Q-TC).
- **Các bước:**
  1. Chép nguyên văn quyết định của PO vào Phần II, ghi ngày.
  2. Nếu D-RU4 = "Hoãn": 03b §1 đổi D-RU4 từ "*(mặc định, chờ PO xác nhận)*" thành "PO xác nhận <ngày>".
  3. Nếu Q-TC = "Thêm": **không sửa mã ở thẻ này**, tạo nợ mới "Vai trải nghiệm `florist` chưa thêm vào danh mục", để T6.13 làm.
- **Tiêu chí xong:** ☐ Phần II không còn ô trống ở các mã đã được trả lời ☐ `check-docs` xanh.

#### T0.2 — Nâng UX Constitution thành 03a CANONICAL
- **Quy mô:** S · **Phụ thuộc:** T0.1 · **Cổng:** K4 (và K1–K3 để ghi mục "Áp dụng")
- **Đọc trước:** `docs/archive/drafts/FLORAOS_UX_CONSTITUTION_DRAFT.md`, `docs/00-DOCUMENTATION-CONSTITUTION.md` §3.
- **Được sửa:** tạo `docs/dac-ta/03a-ux-constitution.md`; sửa `docs/00-DOCUMENTATION-REGISTRY.yaml`; sửa đầu tệp DRAFT.
- **Các bước:**
  1. Tạo `03a-ux-constitution.md` = khối `[!NOTE]` "VAI TRÒ TÀI LIỆU" (Level 3, CANONICAL, quan hệ với 03-UX và 03b) + mục mới **"§0. Áp dụng trong floraos-core"** + nguyên văn Constitution v1.0 (bỏ khối cảnh báo DRAFT ở đầu).
  2. §0 gồm:
     - (a) Bảng K1–K3 đã phán quyết, mỗi dòng trỏ tới mục Constitution bị điều chỉnh (UX-008/§43 cho K1; UX-010/UX-011 cho K2; §41/UX-005 cho K3).
     - (b) Vị trí tài liệu thay §52: `docs/dac-ta/03a…`, `docs/dac-ta/03b…`, `docs/dac-ta/screen-contracts/`.
     - (c) Thứ bậc khi xung đột: 03a §49 áp dụng; Hiến pháp tài liệu vẫn thắng về tầng thẩm quyền.
     - (d) Các chuẩn nội bộ đã chặt hơn Constitution thì giữ: vùng bấm 44px (03-UX §17) > WCAG 2.2 24px.
  3. REGISTRY: thêm mục
     ```yaml
     - id: "DOC-03-UX-CONSTITUTION"
       path: "docs/dac-ta/03a-ux-constitution.md"
       title: "ALG UX Constitution — Chuẩn chất lượng UX toàn cục"
       domain: "UX/UI"
       layer: "Level 3"
       purpose: "Chuẩn chất lượng UX toàn cục: thứ bậc thông tin L0–L4, mật độ, content budget, trạng thái, WCAG 2.2, Screen Contract, UX Lint, định nghĩa Production/Commercial-ready"
       status: "CANONICAL"
       authority: "Level 3"
       canonical: true
       ssot: true
       owner: "Product Owner"
       dependencies: ["docs/dac-ta/03-ux-architecture.md", "docs/dac-ta/03b-role-ux.md"]
       supersedes: ["docs/archive/drafts/FLORAOS_UX_CONSTITUTION_DRAFT.md"]
     ```
     Mục `DOC-ARC-UX-CONSTITUTION-DRAFT` đổi `status: "ARCHIVED"`, purpose "Đã nâng thành DOC-03-UX-CONSTITUTION ngày …". Tăng `total_documents` lên 1; cập nhật `updated_at`.
  4. Đầu tệp DRAFT: thay khối `[!WARNING]` bằng "ARCHIVED — đã nâng thành `docs/dac-ta/03a-ux-constitution.md`".
- **Tiêu chí xong:** ☐ YAML hợp lệ (`python3 -c "import yaml;yaml.safe_load(open('docs/00-DOCUMENTATION-REGISTRY.yaml'))"`) ☐ `check-docs` xanh ☐ 03a có §0.

#### T0.3 — Thư mục và mẫu Screen Contract
- **Quy mô:** S · **Phụ thuộc:** T0.2
- **Được sửa:** tạo `docs/dac-ta/screen-contracts/_TEMPLATE.md`, `docs/dac-ta/screen-contracts/README.md`; REGISTRY.
- **Các bước:**
  1. `_TEMPLATE.md` = nguyên văn **Phụ lục A** của tệp này.
  2. `README.md`:
     - Quy ước tên tệp theo tuyến: `/` → `trang-chu-<khuôn>.md` (vd `trang-chu-store-manager.md`); `/san-pham/[id]` → `san-pham-chi-tiet.md`; điều hướng → `_dieu-huong.md`; Console → `van-hanh-<trang>.md`.
     - Khi nào bắt buộc: màn **mới**, hoặc màn bị sửa bố cục/thứ bậc/luồng. Sửa chính tả, token thuần thì không bắt buộc.
     - Ai được sửa: agent sửa khi làm thẻ; mục `qa_matrix` chỉ ghi kết quả đã đo.
  3. REGISTRY: một mục `DOC-03-SCREEN-CONTRACTS` (path = README, SUPPORTING, Level 3). Từng Screen Contract **không** cần mục REGISTRY riêng — README là chỉ mục; ghi luật này trong purpose.
- **Tiêu chí xong:** ☐ 2 tệp tồn tại ☐ `check-docs` xanh.

#### T0.4 — Sửa AGENTS.md theo 03a và K1–K3
- **Quy mô:** S · **Phụ thuộc:** T0.2 · **Cổng:** K1, K2, K3
- **Được sửa:** `AGENTS.md`.
- **Các bước (sửa tối thiểu, giữ nguyên các câu không liên quan):**
  1. Mục "Tiêu chuẩn hóa khối hướng dẫn thao tác": thêm các gạch đầu dòng theo K1 — "Tối đa **một** `<FeatureGuidanceCard />` mỗi màn/tab", "Mô tả ≤ 3 dòng ở khổ 390px, ≤ 3 mẹo", "Màu đi qua token `--color-guidance-*` (T4.6); giá trị màu không đổi". Giữ nguyên câu cấm đổi cấu trúc/vị trí.
  2. Mục "Tiêu chuẩn hóa vị trí nút tác vụ chung": thay ý "Nút tác vụ chính 1-chạm (Primary Visible Buttons)" bằng "**Một** nút chính (`variant: "primary"`) + tối đa **hai** nút phụ (`outline`/`secondary`) hiển thị trực tiếp; mọi tác vụ còn lại vào menu `…`" (K2).
  3. Mục "Dẫn chứng Video Kép": thêm câu theo K3 — "Thẻ danh sách hiện chỉ báo gọn; cặp thumbnail đầy đủ ở lớp chi tiết".
  4. Mục "Quy ước": thêm gạch đầu dòng **"Chuẩn UX toàn cục (03a)"**: màn mới hoặc màn sửa bố cục phải có Screen Contract ở `docs/dac-ta/screen-contracts/` + chạy QA Matrix 03a §34 + `npm run lint:ux -- --check` không tăng (từ T2.3).
  5. "Chín câu hỏi trước khi viết mã": thêm câu **12**: "Nếu hạng mục có giao diện: vai trải nghiệm nào (03b), việc chính và câu hỏi chính của màn là gì, đã có Screen Contract chưa?"
- **Tiêu chí xong:** ☐ Không còn câu nào trong AGENTS.md mâu thuẫn 03a §0 ☐ PO đọc lại mục 1–3.

#### T0.5 — Nối 03-UX với 03a
- **Quy mô:** S · **Phụ thuộc:** T0.2
- **Được sửa:** `docs/dac-ta/03-ux-architecture.md`.
- **Các bước:**
  1. Khối `[!NOTE]` đầu tệp: thêm dòng dẫn chiếu 03a (chuẩn chất lượng) và 03b (theo vai).
  2. §15 bảng trạng thái: thêm 2 dòng — **Dữ liệu một phần** ("Hiện phần có được, ghi rõ phần nào chưa tải được, nút tải lại phần đó") và **Thành công** ("Xác nhận ngắn tại chỗ + thông báo cho trình đọc màn hình; không chặn bằng hộp thoại"). Sửa dòng "Không đủ quyền": thêm "Riêng lộ trình (vai/mục chưa xây) hiện vô hiệu kèm lý do — 03b §6".
  3. §18.3: thêm "Phân lớp L0–L4 theo 03a §04: khung nhìn đầu tiên chỉ L0 + L1".
- **Tiêu chí xong:** ☐ `check-docs` xanh.

#### T0.6 — Mục theo dõi trong Checklist
- **Quy mô:** S · **Phụ thuộc:** T0.1
- **Được sửa:** `docs/dac-ta/Checklist_Thuc_Thi.md`.
- **Các bước:** thêm mục `## UIUX — Nâng cấp theo 03a/03b (kế hoạch DOC-05-KE-HOACH-NANG-CAP-UIUX)`, liệt kê **mọi mã thẻ** của Phần IV dạng `- [ ] T1.1 — <tên>`, TR.1 và T0.x đã xong thì tích.
- **Tiêu chí xong:** ☐ Có đủ mã thẻ.

---

### UX-1 — Trạng thái, component nền, trợ năng nền

#### T1.1 — `loading.tsx`, `error.tsx`, `not-found.tsx` cấp nhóm tuyến
- **Quy mô:** S · **Phụ thuộc:** T0.x
- **Đọc trước:** `node_modules/next/dist/docs/` (các mục loading UI, error handling, not-found), `src/app/(app)/layout.tsx`, `src/app/(platform)/layout.tsx`, 03-UX §15–§16.
- **Được sửa:** tạo `src/app/(app)/loading.tsx`, `src/app/(app)/error.tsx`, `src/app/(app)/not-found.tsx`, cùng bộ ba tệp cho `src/app/(platform)/`.
- **Các bước:**
  1. `loading.tsx`: dùng `Skeleton` (T1.2). Bố cục khung: một thanh đầu trang cao 64px + 3 khối chữ nhật bo `rounded-2xl`, cao 96px, cách 14px. Có `role="status"` + `aria-label="Đang tải"` + chữ ẩn `sr-only`. **Không** dùng con quay giữa màn.
  2. `error.tsx` (client component, theo đúng chữ ký Next 16 trong docs):
     - Hiện tiêu đề "Chưa tải được trang này" + một dòng "Dữ liệu bạn nhập chưa bị mất. Thử tải lại, nếu vẫn lỗi hãy báo người điều hành tiệm." + nút chính "Tải lại trang" (gọi hàm reset/retry theo docs) + nút phụ "Về trang chủ".
     - **Không hiện** `error.message` hay mã lỗi cho người dùng (03-UX §16). Ghi `console.error(error)`.
  3. `not-found.tsx`: "Không tìm thấy trang" + nút "Về trang chủ". Bản `(platform)`: nút "Về Console" → `/van-hanh`.
  4. Kiểm: tuyến `(app)` không tồn tại (vd `/khong-co`) hiện `not-found`; tạm ném lỗi trong một trang ở dev → hiện `error.tsx`. **Gỡ mã ném lỗi thử trước khi báo xong.**
- **Test:** `tests/e2e/ux/route-states.spec.ts` (chạy ở T7.x): truy cập `/khong-co-trang-nay` → thấy chữ "Không tìm thấy trang".
- **Tiêu chí xong:** ☐ 6 tệp ☐ G1–G4 ☐ không lộ mã lỗi.

#### T1.2 — Component `Skeleton` + thay các chỗ "Đang tải…" (ngoài vùng Điều phối)
- **Quy mô:** M · **Phụ thuộc:** —
- **Đọc trước:** 3 cách vẽ khung xám đang có: `components/dashboard/store-manager-dashboard.tsx` (`KhungCho`), `components/dashboard/sales-workspace.tsx`, `components/video-studio/video-job-list.tsx`.
- **Được sửa:** tạo `src/components/ui/skeleton.tsx` (+ `skeleton.test.tsx` nếu repo đã có test component; nếu chưa, test ở T7.1); sửa các tệp ở danh sách "Đang tải…" của III.3, **trừ** vùng Điều phối (`truong-du-lieu/_components/*`, `templates/coordinator/sales-order-intake-modal.tsx`) và trừ Console nếu T5.D10 chưa tới — Console làm luôn ở thẻ này được vì chỉ thay chuỗi.
- **Mã mẫu:**
  ```tsx
  // src/components/ui/skeleton.tsx
  import { cn } from "@/lib/utils"
  export function Skeleton({ className }: { className?: string }) {
    return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-surface-alt", className)} />
  }
  /** Khối nhiều dòng giữ chỗ + một nhãn cho trình đọc màn hình. */
  export function SkeletonBlock({ lines = 3, label = "Đang tải" }: { lines?: number; label?: string }) {
    return (
      <div role="status" className="flex flex-col gap-2">
        <span className="sr-only">{label}</span>
        {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} className="h-4" />)}
      </div>
    )
  }
  ```
- **Các bước:** (1) tạo component; (2) thay `KhungCho` trong 2 tệp dashboard bằng `SkeletonBlock`; (3) thay từng chỗ `Đang tải…` bằng `SkeletonBlock` có số dòng gần với nội dung thật (danh sách 5 dòng → `lines={5}`); (4) **không** động vào 21 tệp đang tự vẽ `animate-pulse` khác — chúng được gom dần ở UX-5 theo màn.
- **Tiêu chí xong:** ☐ `grep -rn "Đang tải…" src --include=*.tsx` chỉ còn các chỗ vùng Điều phối ☐ G1–G4.

#### T1.3 — Component `EmptyState`
- **Quy mô:** S · **Phụ thuộc:** —
- **Được sửa:** tạo `src/components/ui/empty-state.tsx`.
- **Đặc tả:** props `{ title: string; reason?: string; action?: { label: string; onClick?: () => void; href?: string }; icon?: LucideIcon }`. Bố cục: icon 20px `text-text-muted` · tiêu đề `font-semibold` · lý do `text-text-muted` 1 dòng · nút `Button size="sm" variant="outline"` (hoặc `Link` cùng kiểu). Theo 03a §26: nói cái gì rỗng, vì sao, làm gì tiếp. **Không** ảnh minh hoạ trang trí.
- **Các bước:** tạo component; áp vào 2 chỗ trong `store-manager-dashboard.tsx` ("Chưa có sản phẩm nào." + nút "Thêm sản phẩm") và `sales-workspace.tsx` (2 khối rỗng) để làm mẫu. Các màn khác áp dần ở UX-5.
- **Tiêu chí xong:** ☐ Component + 2 nơi dùng ☐ G1–G4.

#### T1.4 — Component `InlineError`
- **Quy mô:** S · **Phụ thuộc:** —
- **Được sửa:** tạo `src/components/ui/inline-error.tsx`; áp vào `store-manager-dashboard.tsx` và `sales-workspace.tsx` (thay khối `role="alert"` tự viết).
- **Đặc tả:** props `{ message: string; onRetry?: () => void; retryLabel?: string }`; `role="alert"`; nền `bg-danger-bg`, chữ `text-danger`, viền `border-danger/30`, nút "Tải lại" (`Button size="sm" variant="ghost"`). Thông điệp nói việc người dùng làm được (03-UX §16).
- **Tiêu chí xong:** ☐ Component + 2 nơi dùng ☐ G1–G4.

#### T1.5 — Vùng thông báo cho trình đọc màn hình
- **Quy mô:** S · **Phụ thuộc:** —
- **Được sửa:** tạo `src/components/ui/live-region.tsx`; `src/app/(app)/layout.tsx` (gắn provider).
- **Đặc tả:** `LiveRegionProvider` + hook `useAnnounce()` trả hàm `announce(text: string, tone?: "polite" | "assertive")`. Render hai `div` `sr-only` với `aria-live="polite"` và `aria-live="assertive"`. Để trình đọc đọc lại cùng một câu, xoá nội dung rồi đặt lại trong `requestAnimationFrame`. Không phụ thuộc thư viện ngoài.
- **Áp mẫu:** `store-manager-dashboard.tsx` → sau "Chạy lại job" thành công gọi `announce("Đã gửi chạy lại job")`.
- **Tiêu chí xong:** ☐ Provider bọc trong `(app)/layout.tsx` ☐ 1 nơi dùng ☐ G1–G4.

#### T1.6 — `focus-visible` và vùng bấm cho component gốc
- **Quy mô:** S · **Phụ thuộc:** —
- **Được sửa:** `src/components/ui/{input,select,tab-header,tooltip,badge}.tsx`, `src/components/ui/button.tsx` (size `icon`).
- **Các bước:**
  1. Chuỗi focus chuẩn, dùng giống hệt `Button`: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`. Áp cho: `Input`, trigger của `Select`, từng tab + nút trong `TabActionHeader`, trigger của `Tooltip` nếu là phần tử tự vẽ.
  2. `Button` size `icon`: `h-9 w-9` → `h-11 w-11` (44px, 03-UX §17). Tìm 5 chỗ dùng `size="icon"`; chỗ nào vỡ bố cục thì ghi vào báo cáo, **không** thu nhỏ lại dưới 44px.
  3. **Không** đổi màu, bo góc hay khoảng cách khác.
- **Tiêu chí xong:** ☐ Tab qua các control thấy viền focus ☐ G1–G4.

#### T1.7 — Sửa phần tử không tương tác mà có `onClick`
- **Quy mô:** S · **Phụ thuộc:** —
- **Được sửa:** `src/app/(app)/duyet/page.tsx` (dòng ~370), `src/components/creative-studio/video-workspace.tsx` (~254), `src/components/catalog/catalog-management-tab.tsx` (~129), `src/components/catalog/catalog-storefront.tsx` (~158).
- **Các bước:** đổi phần tử có `onClick` thành `<button type="button">` giữ nguyên `className` (thêm `text-left w-full` nếu cần) và chuỗi focus chuẩn. `Card` bấm được: bọc nội dung trong `<button>`, hoặc chuyển `Card` sang render `button` qua prop `asChild` nếu T1.8 có sẵn. Nút chọn/bỏ chọn thêm `aria-pressed={selected}`.
- **Tiêu chí xong:** ☐ 4 chỗ ☐ chọn được bằng bàn phím (Tab + Enter/Space) ☐ G1–G4.

#### T1.8 — Component `Dialog` dùng chung và chuyển modal
- **Quy mô:** L (chia 3 lượt: T1.8a component + 3 modal mẫu; T1.8b các modal ngoài vùng Điều phối; T1.8c vùng Điều phối — sau ĐP-4c)
- **Đọc trước:** `node_modules/@base-ui/react` (Dialog: cấu trúc, tên export, props), 2 modal mẫu `components/crm/create-customer-modal.tsx`, `components/orders/create-order-modal.tsx`.
- **Được sửa:** tạo `src/components/ui/dialog.tsx`; T1.8a: `crm/create-customer-modal.tsx`, `crm/customer-detail-modal.tsx`, `layout/user-menu.tsx` (menu tài khoản: chuyển sang Popover của base-ui hoặc thêm Esc + trả focus).
- **Đặc tả `Dialog`:** bọc Dialog của `@base-ui/react` (đã cài, **không** thêm Radix Dialog). Props `{ open, onOpenChange, title, description?, children, footer?, size?: "sm" | "md" | "lg" }`. Hành vi:
  - bẫy focus, đóng bằng Esc, trả focus về nút mở, `aria-modal`, tiêu đề gắn `aria-labelledby`;
  - trên 390px chiếm toàn chiều rộng, cuộn nội dung bên trong, chân dính dưới (nút chính trong tầm ngón cái — 03-UX §17);
  - `footer` tuân K2: 1 nút chính + ≤ 2 nút phụ.
- **Danh sách modal cần chuyển ở T1.8b** (ngoài vùng Điều phối): `kho-templates/template-preview-modal.tsx`, `video-studio/video-create-modal.tsx`, `chat/channel-config-modal.tsx`, `catalog/{share-catalog-modal,product-detail-modal,catalog-link-widgets}.tsx`, `crm/*` (nếu T1.8a chưa làm), `dashboard/FeaturePicker.tsx`, `market-intelligence/{opportunity-detail-drawer,saas-admin-criteria-modal,product-upload-card,feature-settings-modal,custom-research-modal,creative-handoff-modal,video-preview-modal}.tsx`, `templates/platform-connections/connect-account-modal.tsx`, `templates/social-publishing/schedule-confirm-modal.tsx`, `orders/{order-detail-modal,create-order-modal}.tsx`, `ui/global-image-zoom.tsx`. Tệp `kho-templates/preview-*` là dữ liệu xem trước — chỉ chuyển nếu chúng render modal thật.
- **T1.8c (vùng Điều phối, sau ĐP-4c):** `templates/coordinator/{order-closure,partner-assignment,production-update,order-planning,sales-order-intake,ai-qc-inspection,delivery-dispatch}-modal.tsx`, `coordinator/control-tower-dashboard.tsx`. Chạm `templates/*` → cập nhật SSOT-TPL + G5.
- **Tiêu chí xong (mỗi lượt):** ☐ modal mở/đóng bằng bàn phím, Esc đóng, focus trở lại ☐ hành vi nghiệp vụ không đổi (cùng API, cùng dữ liệu gửi) ☐ G1–G5.

#### T1.9 — Liên kết "Bỏ qua tới nội dung" và mốc trang
- **Quy mô:** S · **Phụ thuộc:** —
- **Được sửa:** `src/app/(app)/layout.tsx`, `src/components/layout/desktop-nav.tsx`, `src/components/layout/bottom-nav.tsx`.
- **Các bước:** thêm `<a href="#noi-dung-chinh" className="sr-only focus:not-sr-only …">Bỏ qua tới nội dung</a>` đầu layout; vùng nội dung `<div id="noi-dung-chinh" tabIndex={-1}>`; `aside` desktop có `aria-label="Điều hướng chính"`; `nav` mobile có `aria-label="Điều hướng nhanh"`; mục đang chọn ở mobile thêm `aria-current="page"`.
- **Tiêu chí xong:** ☐ Tab đầu tiên trên mọi trang là liên kết bỏ qua ☐ G1–G4.

#### T1.10 — `TabActionHeader` tuân K2
- **Quy mô:** S · **Phụ thuộc:** — · **Cổng:** K2
- **Được sửa:** `src/components/ui/tab-header.tsx`.
- **Các bước:** đếm `primaryActions` có `variant === "primary"` (hoặc không khai `variant`, nếu mặc định là primary — đọc mã để biết). Nếu > 1 và `process.env.NODE_ENV !== "production"` → `console.warn("[TabActionHeader] Hơn 1 nút chính — vi phạm K2/03a UX-010", tabIds)`. Tổng nút hiển thị > 3 → cảnh báo tương tự. **Không** tự đổi biến thể hay tự dồn nút vào menu ở thẻ này (tránh đổi giao diện hàng loạt); từng màn sửa ở UX-5.
- **Tiêu chí xong:** ☐ Cảnh báo xuất hiện ở dev với `/duyet` nếu vi phạm ☐ G1–G4.

---

### UX-2 — UX Lint v0

#### T2.1 — Lõi `scripts/ux-lint.ts`
- **Quy mô:** M · **Phụ thuộc:** —
- **Đọc trước:** `scripts/check-template-ssot.ts`, `scripts/check-docs.mjs` (khuôn script đang có), `package.json`, Phụ lục B.
- **Được sửa:** tạo `scripts/ux-lint.ts`, `scripts/ux-lint/rules.ts`, `scripts/ux-lint/report.ts`.
- **Thiết kế:**
  - Chạy bằng `tsx` như các script khác. Dùng **TypeScript compiler API** (`typescript` đã có trong devDependencies) để parse `.tsx` → duyệt JSX. Không dùng regex thô cho luật về phần tử/thuộc tính. Regex chỉ dùng cho chuỗi lớp CSS **sau khi** đã lấy được giá trị `className` (chuỗi literal, template literal, đối số của `cn()`/`cva()`).
  - Phạm vi mặc định: `src/app/**/*.tsx`, `src/components/**/*.tsx`. Loại trừ `src/generated/**`, `**/*.test.tsx`, `src/app/(app)/kho-templates/preview-data/**` (dữ liệu xem trước).
  - Mỗi vi phạm: `{ rule: "R1", file, line, column, snippet, message }`.
  - Đầu ra: bảng tổng theo luật × thư mục cấp 2 (vd `components/market-intelligence`), và `--json` in toàn bộ danh sách.
  - Luật R1–R12 theo Phụ lục B. Mỗi luật là một hàm thuần `(sourceFile, context) => Violation[]`, để test được.
- **Tiêu chí xong:** ☐ `npx tsx scripts/ux-lint.ts` in bảng ☐ số R1/R2/R3 xấp xỉ mốc III.2 (lệch ±5% do cách đếm AST — ghi số mới làm mốc).

#### T2.2 — Allowlist
- **Quy mô:** S · **Phụ thuộc:** T2.1
- **Được sửa:** tạo `scripts/ux-lint-allow.json`.
- **Định dạng:**
  ```json
  { "entries": [
    { "rule": "R1", "path": "src/components/templates/shared/feature-guidance-card.tsx", "reason": "K1 — màu hướng dẫn giữ nguyên tới T4.6", "until": "T4.6" },
    { "rule": "R1", "pathGlob": "src/components/market-intelligence/**", "match": "(tiktok|youtube)", "reason": "Màu nhận diện nền tảng TikTok/YouTube (AGENTS.md Dẫn chứng Video Kép)" },
    { "rule": "R3", "path": "src/lib/mock-data.ts", "reason": "Màu dữ liệu mẫu của hoa" }
  ]}
  ```
  Mỗi mục bắt buộc có `reason`. `until` (tuỳ chọn) là mã thẻ phải gỡ mục đó.
- **Tiêu chí xong:** ☐ Lint đọc allowlist, vi phạm được miễn không tính vào tổng.

#### T2.3 — Baseline và chế độ ratchet
- **Quy mô:** S · **Phụ thuộc:** T2.2
- **Được sửa:** tạo `scripts/ux-lint-baseline.json`; `package.json` (script `"lint:ux": "tsx scripts/ux-lint.ts"`).
- **Ngữ nghĩa:**
  - `npm run lint:ux`: in bảng, thoát 0.
  - `npm run lint:ux -- --check`: so từng ô (luật × thư mục cấp 2) với baseline. **Bất kỳ ô nào tăng → thoát 1** và in ô tăng. Ô giảm → in gợi ý "chạy `--update-baseline`".
  - `npm run lint:ux -- --update-baseline`: ghi baseline mới. **Chỉ cho phép khi không ô nào tăng.**
  - `npm run lint:ux -- --json`: in JSON.
  - Luật mức **FAIL với mã mới** (R5, R6, R7, R11): trong `--check`, vi phạm ở tệp **mới tạo** so với `git merge-base HEAD origin/main` → thoát 1 kể cả khi tổng ô không tăng. Không có git remote → bỏ qua phần này và in cảnh báo.
- **Tiêu chí xong:** ☐ Ba chế độ chạy đúng ☐ baseline ghi vào repo.

#### T2.4 — Test cho lint
- **Quy mô:** S · **Phụ thuộc:** T2.1
- **Được sửa:** tạo `scripts/ux-lint/rules.test.ts` + thư mục mẫu `scripts/ux-lint/__fixtures__/`. Nếu `vitest.config.ts` không bao `scripts/**`, thêm `"scripts/**/*.test.ts"` vào `include`.
- **Nội dung:** mỗi luật ≥ 2 ca (vi phạm / không vi phạm), kèm 1 ca allowlist miễn và 1 ca ratchet tăng → thoát 1.
- **Tiêu chí xong:** ☐ Test xanh (hoặc ghi G3 chờ Mac).

#### T2.5 — Chạy trong CI
- **Quy mô:** S · **Phụ thuộc:** T2.3
- **Được sửa:** `.github/workflows/ci.yml`.
- **Các bước:** trong job web, ngay sau bước `npm run lint`, thêm `- run: npm run lint:ux -- --check`. Không cần database.
- **Tiêu chí xong:** ☐ CI xanh trên nhánh.

#### T2.6 — Tài liệu cho lint
- **Quy mô:** S · **Phụ thuộc:** T2.3
- **Được sửa:** `AGENTS.md` (bảng Lệnh: `npm run lint:ux`; Bản đồ: `scripts/ux-lint*`), `docs/dac-ta/03a-ux-constitution.md` §0 (bảng luật R1–R12 = Phụ lục B, kèm mức hiện hành).
- **Tiêu chí xong:** ☐ `check-docs` xanh.

---

### UX-3 — Kiến trúc thông tin và điều hướng

#### T3.1 — Mô hình điều hướng một nguồn (`nav-model.ts`)
- **Quy mô:** M · **Phụ thuộc:** —
- **Đọc trước:** `src/components/layout/{desktop-nav,bottom-nav}.tsx`, `src/app/(app)/them/page.tsx`, `src/modules/organization/domain/role-ux-catalog.ts` (`orderByRolePriority`), 03-UX §3, 03b §5.
- **Được sửa:** tạo `src/components/layout/nav-model.ts` và `nav-model.test.ts`.
- **Thiết kế (luật thuần, không React, không import icon — icon gắn ở tầng hiển thị qua khoá `iconKey`):**
  ```ts
  export type NavGroupKey = "viec-chinh" | "ban-hang" | "san-pham" | "noi-dung" | "van-hanh" | "thiet-lap"
  export interface NavEntry {
    href: string
    label: string            // nhãn người bán hoa hiểu — KHÔNG mã kỹ thuật
    group: Exclude<NavGroupKey, "viec-chinh">
    iconKey: string          // tra bảng icon ở desktop-nav/bottom-nav
    capability?: string      // mã năng lực đọc; thiếu = luôn hiện
    status?: "READY" | "COMING_SOON"
    mobileLabel?: string     // nhãn ngắn cho thanh dưới (≤ 10 ký tự)
  }
  export const NAV_ENTRIES: readonly NavEntry[] = [ /* T3.2 + T3.3 */ ]
  export interface NavView { groups: { key: NavGroupKey; label: string; entries: NavEntry[] }[] }
  /** Lọc theo năng lực → gom "Việc chính" theo vai (03b §5) → trả nhóm, không trùng mục. */
  export function buildNav(can: (code: string) => boolean, role: RoleUxDefinition | null): NavView
  /** Ô thứ hai của thanh dưới (thay logic đang nằm trong bottom-nav.tsx). */
  export function mobileSecondSlot(can: (code: string) => boolean, role: RoleUxDefinition | null): NavEntry
  ```
- **Test bắt buộc:**
  1. `can = () => true` + `role = null` → đủ 6 nhóm trừ "viec-chinh", không mục trùng.
  2. Vai `sales` với năng lực mặc định của `sale` (lấy từ `CAPABILITY_CATALOG` theo `defaultRoles` chứa `"sale"`) → không có `/dieu-phoi`, không có `/cai-dat-ai`; nhóm "viec-chinh" bắt đầu bằng `/`, rồi `/khach-hang`.
  3. Vai `coordinator` → ô thứ hai mobile là `/dieu-phoi`.
  4. Mục `COMING_SOON` luôn có mặt (để hiện vô hiệu) nhưng không bao giờ vào "viec-chinh".
  5. Mỗi `href` có mặt đúng một lần trong kết quả.
- **Tiêu chí xong:** ☐ Test xanh (hoặc G3 chờ Mac) ☐ chưa đổi giao diện (T3.4 mới nối).

#### T3.2 — Nhóm theo việc
- **Quy mô:** S · **Phụ thuộc:** T3.1 · **Cổng:** K5
- **Được sửa:** `nav-model.ts` (điền `NAV_ENTRIES`).
- **Nội dung đề xuất (K5):**

| Nhóm (`group`) | Nhãn nhóm | Mục (`href` → nhãn) |
|---|---|---|
| — | **Việc chính · <vai>** | Tự sinh: `/` + `navPriority` của vai |
| `ban-hang` | Bán hàng & Khách | `/khach-hang` → Khách hàng · `/don-hang` → Đơn hàng · `/hoi-thoai` → Hội thoại · `/catalog` → Catalog & QR |
| `san-pham` | Sản phẩm | `/san-pham` → Sản phẩm & Giá · `/tai-anh` → Quét ảnh hoa · `/kho-du-lieu` → Kho dữ liệu · `/gia` → Tính giá |
| `noi-dung` | Nội dung & Tiếp thị | `/market-intelligence` → Nghiên cứu thị trường · `/creative-studio` → Creative Studio · `/creative-studio?tab=area-d` → Ảnh marketing · `/video` → Video · `/noi-dung` → Viết nội dung · `/lich-dang` → Lịch đăng · `/kho-templates` → Kho mẫu |
| `van-hanh` | Vận hành | `/dieu-phoi` → Điều phối · `/job` → Job · `/duyet` → Hàng chờ duyệt · `/so-lieu` → Số liệu · `/muc-dung` → Mức dùng (`COMING_SOON`) · `/audit` → Nhật ký kiểm toán (`COMING_SOON`, `A4`) |
| `thiet-lap` | Thiết lập | `/ho-so` → Hồ sơ cửa hàng · `/tri-thuc` → Tri thức · `/cai-dat-ai` → Chính sách AI · `/ket-noi` → Kết nối kênh · `/bo-may` → Bộ máy phân tích ảnh · `/cai-dat` → Cài đặt (`COMING_SOON`) |

  Ghi chú: `/vai-tro` không vào thanh bên (lối vào ở menu tài khoản). `/them` chỉ là trang của mobile.
- **Tiêu chí xong:** ☐ Mọi tuyến `(app)` đang có trong `desktop-nav.tsx` cũ đều có mặt, trừ khi PO bỏ ☐ nhãn không chứa mã kỹ thuật (R8).

#### T3.3 — Gác theo năng lực
- **Quy mô:** S · **Phụ thuộc:** T3.2
- **Được sửa:** `nav-model.ts`.
- **Các bước:**
  1. Với 6 tuyến "chưa xác minh" ở III.6 (`/video`, `/noi-dung`, `/lich-dang`, `/kho-templates`, `/tri-thuc`, `/ket-noi`): mở `page.tsx` → tìm lời gọi `fetch("/api/v1/...")` **đầu tiên khi trang nạp** → mở `src/app/api/v1/.../route.ts` tương ứng → lấy mã trong `requireCapability(ctx, "X")` của handler GET. Trang gọi nhiều API → lấy mã của API nạp dữ liệu chính. Không có `requireCapability` → không gác (ghi "không gác — route chỉ cần đăng nhập").
  2. Điền `capability` cho mọi mục theo III.6 + kết quả bước 1.
  3. Ghi bảng ánh xạ cuối cùng (tuyến → mã → nguồn `route.ts:dòng`) vào Screen Contract `_dieu-huong.md` (T3.9).
- **Nguyên tắc:** gác điều hướng chỉ để ẩn/hiện. Máy chủ vẫn kiểm quyền. **Không** thêm `requireCapability` mới vào route ở thẻ này.
- **Tiêu chí xong:** ☐ 100% mục có `capability` hoặc ghi chú "không gác" có nguồn.

#### T3.4 — Nối `desktop-nav.tsx` vào `nav-model`
- **Quy mô:** M · **Phụ thuộc:** T3.3, T1.9
- **Được sửa:** `src/components/layout/desktop-nav.tsx`.
- **Các bước:**
  1. Xoá 4 mảng `OUTCOME_ITEMS/IDENTITY_ITEMS/TOOL_ITEMS/OPERATION_ITEMS` và logic `pinned`; thay bằng `buildNav(can, roleUx)`.
  2. Bảng `ICONS: Record<string, LucideIcon>` giữ đúng icon cũ cho từng tuyến.
  3. Bỏ mọi badge kỹ thuật. Badge duy nhất được phép: số việc chờ **đo được** (chưa có nguồn → không hiện) và "Sắp có" cho `COMING_SOON`.
  4. Mục đang chọn: bỏ `bg-red-50 text-red-700 / text-red-600`, dùng token `bg-selected text-selected-text` (tạo ở T4.2). T4.2 chưa xong thì dùng tạm `bg-surface-alt text-primary font-bold`.
  5. Khối logo: bỏ gradient `from-red-600 to-rose-700` (03a §40), thay bằng `bg-primary`. Dòng phụ "SaaS Operations SSOT" (nhãn kỹ thuật) → tên tổ chức (`orgName` từ `useSession`).
  6. Nút Copilot ở chân: giữ chức năng, màu đổi sang token (`bg-surface-alt`, icon `bg-primary`).
- **Tiêu chí xong:** ☐ Không còn chuỗi "M01b", "Khu vực A-F", "SSOT", "Tháp Vận Hành" trong tệp ☐ `lint:ux` R1/R8 của `components/layout` giảm ☐ G1–G4, G6.

#### T3.5 — Nhóm thu gọn, nhớ trạng thái
- **Quy mô:** S · **Phụ thuộc:** T3.4
- **Được sửa:** `desktop-nav.tsx`.
- **Các bước:** nhóm "Việc chính" luôn mở, không thu gọn được. Các nhóm khác có nút tiêu đề `<button aria-expanded>`; mặc định **mở** nhóm chứa tuyến hiện tại, **đóng** các nhóm còn lại. Mục tiêu: ≤ 8 mục hiển thị khi mới vào. Nhớ trạng thái trong `localStorage` khoá `floraos_nav_groups_v1` (JSON `Record<NavGroupKey, boolean>`), mọi lần đọc/ghi bọc `try/catch`, lỗi thì dùng mặc định.
- **Tiêu chí xong:** ☐ Vào `/` với vai `sale`: ≤ 8 mục mở sẵn ☐ G1–G4.

#### T3.6 — Thay popover "Tất cả phân hệ" bằng ô lọc nhanh
- **Quy mô:** S · **Phụ thuộc:** T3.4
- **Được sửa:** `desktop-nav.tsx`.
- **Các bước:** gỡ nút hamburger và popover (trùng danh sách — 03a UX-014). Thêm `Input` nhỏ "Tìm chức năng" dưới khối logo. Gõ → lọc `buildNav` theo nhãn, bỏ dấu tiếng Việt (tái dùng hàm bỏ dấu có sẵn, vd `toStableId` trong `feature-guidance-card.tsx` — nếu cần dùng chung thì chuyển sang `src/lib/utils.ts`), hiện danh sách phẳng; Enter mở mục đầu; Esc xoá. Phím tắt `/` để focus (không đè `⌘K` của Copilot).
- **Tiêu chí xong:** ☐ Gõ "khach" ra "Khách hàng" ☐ G1–G4.

#### T3.7 — Nối `bottom-nav.tsx` và trang `/them`
- **Quy mô:** S · **Phụ thuộc:** T3.3
- **Được sửa:** `src/components/layout/bottom-nav.tsx`, `src/app/(app)/them/page.tsx`.
- **Các bước:**
  1. `bottom-nav`: ô 2 lấy từ `mobileSecondSlot(can, roleUx)`; xoá `MUC_THEO_VAI` và `DA_CO_TREN_THANH` cục bộ. Giữ nút giữa "Tải ảnh" nhưng **gác `H1`**: không có `H1` → ô giữa là "Việc chính" đầu tiên của vai (hoặc "Sản phẩm").
  2. `/them`: giữ phần "tạo sản phẩm thủ công" đang có (`L2`). Thêm phía dưới danh sách nhóm từ `buildNav` (bỏ nhóm "viec-chinh" và các mục đã có trên thanh dưới), mỗi mục là hàng cao ≥ 44px, thứ tự theo chuỗi giá trị (03-UX §3). Mục `COMING_SOON` hiện vô hiệu, nhãn "Sắp có".
- **Tiêu chí xong:** ☐ Mobile vai `sale` không thấy "Tải ảnh" nếu không có `H1` ☐ `/them` đủ mục ☐ G1–G4.

#### T3.8 — Test hiển thị điều hướng
- **Quy mô:** S · **Phụ thuộc:** T3.4–T3.7
- **Được sửa:** `src/components/layout/nav-model.test.ts` (bổ sung); `tests/e2e/ux/navigation.spec.ts` (chạy ở T7.4).
- **E2E:** đăng nhập `e2e-sale` → thanh bên không có "Điều phối", có "Việc chính · Bán hàng"; gõ "don" vào ô lọc → "Đơn hàng".
- **Tiêu chí xong:** ☐ Test viết xong.

#### T3.9 — Screen Contract điều hướng + sửa 03-UX §3
- **Quy mô:** S · **Phụ thuộc:** T3.4–T3.7
- **Được sửa:** tạo `docs/dac-ta/screen-contracts/_dieu-huong.md`; sửa `docs/dac-ta/03-ux-architecture.md` §3 (sơ đồ điều hướng theo 6 nhóm; ô 2 và ô giữa của thanh dưới theo vai/năng lực); `docs/dac-ta/03b-role-ux.md` §5 (trỏ tới `nav-model.ts` thay cho mô tả trong `desktop-nav`).
- **Tiêu chí xong:** ☐ `check-docs` xanh.

---

### UX-4 — Token và cỡ chữ

#### T4.1 — Đo tần suất cỡ chữ và màu
- **Quy mô:** S · **Phụ thuộc:** T2.1
- **Được sửa:** tạo `scripts/ux-lint/measure-tokens.ts` (hoặc thêm cờ `--measure` vào `ux-lint.ts`).
- **Đầu ra:** hai bảng Markdown in ra stdout: (1) mỗi giá trị `text-[Npx]` → số lần + 3 tệp dùng nhiều nhất; (2) mỗi lớp màu thô (`bg-red-50`, `text-amber-700`…) → số lần, tách theo tiền tố (`bg/text/border/from/to/via/ring`).
- **Tiêu chí xong:** ☐ Dán hai bảng vào báo cáo (dùng cho T4.2).

#### T4.2 — Khai token cỡ chữ và token ngữ nghĩa
- **Quy mô:** S · **Phụ thuộc:** T4.1
- **Đọc trước:** `src/app/globals.css` (khối `@theme` và chú thích đối chiếu WCAG), tài liệu Tailwind v4 về theme variables trong `node_modules/tailwindcss` (cú pháp `--text-<tên>` và `--text-<tên>--line-height`).
- **Được sửa:** `src/app/globals.css`.
- **Các bước:**
  1. Chốt thang cỡ chữ từ bảng T4.1. Mỗi nhóm giá trị gần nhau gộp về một token, lệch tối đa 0.5px. Khung đề xuất (sửa theo số đo):
     ```css
     --text-caption: 11px;    --text-caption--line-height: 1.35;
     --text-meta: 12px;       --text-meta--line-height: 1.4;
     --text-body-sm: 13px;    --text-body-sm--line-height: 1.5;
     --text-body: 13.5px;     --text-body--line-height: 1.5;
     --text-title-sm: 14.5px; --text-title-sm--line-height: 1.4;
     --text-title: 17px;      --text-title--line-height: 1.3;
     --text-display: 20px;    --text-display--line-height: 1.25;
     ```
     Kèm bảng ánh xạ `px → token` trong chú thích CSS (đây là đầu vào cho codemod T4.4).
  2. Token màu ngữ nghĩa bổ sung, mỗi token có chú thích tỉ lệ tương phản đã **tính thật** (công thức luminance, như chú thích có sẵn):
     - `--color-selected` (nền mục đang chọn) + `--color-selected-text` (chữ trên nền đó, ≥ 4.5:1);
     - `--color-info` + `--color-info-bg`;
     - `--color-guidance`, `--color-guidance-bg`, `--color-guidance-border`, `--color-guidance-text` — **giá trị lấy đúng từ màu `red-*` đang dùng** trong `feature-guidance-card.tsx` (K1: không đổi thị giác).
  3. **Không** đổi giá trị token cũ.
- **Tiêu chí xong:** ☐ `npm run build` (hoặc `next dev`) không lỗi CSS ☐ các lớp `text-body-sm`, `bg-selected` sinh được CSS (kiểm bằng một phần tử thử, gỡ trước khi báo xong).

#### T4.3 — Cập nhật 03a với thang token
- **Quy mô:** S · **Phụ thuộc:** T4.2
- **Được sửa:** `docs/dac-ta/03a-ux-constitution.md` §0: bảng token cỡ chữ + màu ngữ nghĩa + luật "dùng token nào khi nào" (tiêu đề trang `text-title`; tiêu đề khối `text-title-sm`; chữ thường `text-body`; phụ `text-meta`; nhãn huy hiệu `text-caption`).

#### T4.4 — Codemod an toàn
- **Quy mô:** M · **Phụ thuộc:** T4.2
- **Được sửa:** tạo `scripts/codemod-ux-tokens.ts` + test.
- **Luật thay (chỉ ánh xạ một-một, không mơ hồ):**
  - `text-[Npx]` → token theo bảng `px → token` của T4.2. Giá trị không có trong bảng → **không thay**, in ra danh sách.
  - Màu **chức năng rõ nghĩa** (chỉ khi lớp nằm trong phần tử có ngữ cảnh lỗi/cảnh báo/thành công: `role="alert"`, tên biến chứa `loi|error|danger|warning|success`, hoặc cùng `className` với icon `AlertTriangle|XCircle|CheckCircle2`):
    - `text-red-600/700` → `text-danger`, `bg-red-50` → `bg-danger-bg`, `border-red-200/300` → `border-danger/30`;
    - `text-amber-600/700` → `text-warning`, `bg-amber-50` → `bg-warning-bg`;
    - `text-emerald-600/700` hoặc `text-green-600/700` → `text-success`, `bg-emerald-50` hoặc `bg-green-50` → `bg-success-bg`.
  - Màu **thương hiệu** (đỏ/hồng dùng làm điểm nhấn không phải lỗi) → **không thay tự động**; in danh sách để người xem quyết (T4.5.x).
  - `slate/gray/zinc/neutral` chữ phụ → `text-text-muted` **chỉ khi** là `-400/-500`; nền `-50/-100` → `bg-surface-alt`.
- **Chế độ:** `--dry-run` (mặc định, in diff), `--write`, `--dir <thư mục>`. Mỗi lần chạy in số lượng theo luật.
- **Test:** ≥ 10 ca, gồm ca "đỏ trong nút thương hiệu → không thay" và ca "đỏ trong `role="alert"` → thay".
- **Tiêu chí xong:** ☐ Dry-run trên `src/components/ui` cho diff hợp lý.

#### T4.5.x — Chạy codemod theo thư mục (mỗi dòng là một thẻ, một commit)
- **Quy mô:** mỗi thẻ S–M · **Phụ thuộc:** T4.4 + T7.1 (có ảnh mốc) · **Chạy kèm** đợt UX-5 dùng thư mục đó.
- **Quy trình mỗi thẻ:**
  1. `npx tsx scripts/codemod-ux-tokens.ts --dir <thư mục> --dry-run` → xem diff.
  2. `--write`.
  3. Xử lý tay các mục "không thay tự động" của thư mục. Mỗi lớp màu thương hiệu → `primary`/`primary-dark`/`accent`/`selected`, hoặc giữ nguyên và thêm vào allowlist kèm lý do.
  4. G1–G7. Chụp so sánh chỉ được lệch ≤ 1px ở cỡ chữ; lệch màu chỉ ở chỗ đã chủ đích đổi (nêu trong báo cáo).
  5. `npm run lint:ux -- --update-baseline`.

| Thẻ | Thư mục | Màu thô / `text-[px]` (mốc) | Đi kèm |
|---|---|---|---|
| T4.5.1 | `src/components/ui` | 55 / 16 | trước đợt A |
| T4.5.2 | `src/components/layout` | 25 / 22 | T3.4 |
| T4.5.3 | `src/components/dashboard` | 9 / 79 | đợt A |
| T4.5.4 | `src/app/(app)/{tai-anh,duyet,job,vai-tro}` + `src/components/{upload,flow,result,sales}` | đo ở T4.1 | đợt A |
| T4.5.5 | `src/components/templates/shared` + `templates/product-analysis` | đo ở T4.1 | đợt A (G5) |
| T4.5.6 | `src/components/{catalog,crm,orders,chat,storage,profiles,organization}` + `templates/{catalog,crm,orders,chat-assistant}` | 201+29+51+77+38+37+22 / … | đợt B (G5) |
| T4.5.7 | `src/components/creative-studio` + `templates/creative-studio` | 302 / 327 | đợt C |
| T4.5.8 | `src/components/{video-studio,knowledge-base}` + `templates/{video-studio,content-engine,social-publishing,platform-connections,analytics}` | … | đợt C (G5) |
| T4.5.9 | `src/components/market-intelligence` | **1.476** / 256 | đợt C, **sau K3** — chia 3 commit theo nhóm tệp (workspace / cards / modals) |
| T4.5.10 | `src/app/(platform)/**` (trừ `truong-du-lieu`) | … | đợt D |
| T4.5.11 | Vùng Điều phối: `components/coordinator`, `templates/coordinator`, `(app)/dieu-phoi`, `truong-du-lieu` | 66 / 6 + … | đợt D, **sau ĐP-4c** |

#### T4.6 — Token hoá màu `FeatureGuidanceCard`
- **Quy mô:** S · **Phụ thuộc:** T4.2 · **Cổng:** K1
- **Được sửa:** `src/components/templates/shared/feature-guidance-card.tsx`; SSOT-TPL (mục họ Guidance); `scripts/ux-lint-allow.json` (gỡ mục `until: "T4.6"`).
- **Các bước:** thay `border-red-300` → `border-guidance-border`, `bg-red-50/70` → `bg-guidance-bg/70`, `bg-red-100 text-red-700` → `bg-guidance-bg text-guidance`… **giữ nguyên** cấu trúc, vị trí, hành vi thu gọn, độ mờ. Chụp so sánh phải **không lệch** (giá trị token = giá trị cũ).
- **Tiêu chí xong:** ☐ 0 lớp `red-*` trong tệp ☐ ảnh so sánh không lệch ☐ G5.

#### T4.7 — Hex trong `.tsx`
- **Quy mô:** S · **Phụ thuộc:** T4.2
- **Các bước:** `npm run lint:ux -- --json` lọc R3 → từng hex: màu thương hiệu/chức năng → token; màu dữ liệu (màu hoa, màu nền tảng TikTok/YouTube) → allowlist có lý do. Ví dụ đã biết: `FlowerPlaceholder color="#5F9670"` trong `store-manager-dashboard.tsx` → token `secondary` hoặc allowlist.
- **Tiêu chí xong:** ☐ R3 chỉ còn allowlist.

---

### UX-5 — Chuẩn hoá màn theo Screen Contract

#### T5.SOP — Quy trình chuẩn cho MỌI thẻ T5.x (agent làm đủ 10 bước, theo thứ tự)

1. **Audit (không sửa mã):**
   - Đọc trang + mọi component nó import.
   - Lập danh sách: API được gọi (endpoint + mã năng lực trong `route.ts`), trạng thái đang có (tải/rỗng/lỗi/không quyền/một phần), số khối, số nút chính, `FeatureGuidanceCard` (số lượng), modal.
   - Chạy `npm run lint:ux -- --json` lọc theo tệp của màn.
   - Chụp màn hiện tại ở khổ 390px và 1280px.
2. **Viết Screen Contract** `docs/dac-ta/screen-contracts/<tên>.md` theo `_TEMPLATE.md`:
   - Điền phần "Hiện trạng" từ bước 1.
   - Điền "Mục tiêu" theo thẻ việc + 03a + 03b.
   - Mỗi thay đổi dự định ghi thành một dòng `Hiện tại → Mục tiêu → Quyết định (KEEP/MODIFY/ADD/REMOVE/RESTRUCTURE) → Lý do → Bằng chứng`.
3. **Kiểm dữ liệu trước UX** (Contract §31): thông tin mục tiêu cần trường/endpoint chưa có → phân loại `DATA GAP`, ghi nợ, **không** dựng giả, bỏ khỏi phạm vi thẻ.
4. **Thứ bậc L0–L4:** khung nhìn đầu tiên ở 390px chỉ chứa L0 + L1 (trạng thái chính + việc cần làm). L2 mở rộng tại chỗ. L3 vào chi tiết/drawer. L4 (dữ liệu thô, nhật ký, mã kỹ thuật) sau "Xem thêm" hoặc chỉ ở vai `platform_admin`.
5. **Content budget** (03a §07): workspace ≤ 5 khối chính, ≤ 3 nút hành động nổi; trang chi tiết ≤ 7 nhóm thông tin; modal 1 nút chính + ≤ 2 nút phụ. Vượt ngân sách thì ghi lý do trong Screen Contract.
6. **Hành động (K2):** đúng 1 nút `primary` cho việc chính; ≤ 2 nút phụ hiện ra; phần còn lại vào menu `…` của `TabActionHeader`. Nhãn nút mô tả kết quả.
7. **Trạng thái:**
   - tải → `SkeletonBlock`;
   - rỗng → `EmptyState` (nói vì sao + nút đi tiếp);
   - lỗi → `InlineError` có "Tải lại";
   - 403 → ẩn khối; cả màn không có quyền → một `EmptyState` "Tài khoản chưa được cấp quyền… liên hệ người điều hành";
   - một phần → hiện phần có + `InlineError` cho phần lỗi;
   - thành công → `announce()`.
8. **Responsive + trợ năng:**
   - 390px: một cột, bảng thành thẻ, nút chính ở nửa dưới;
   - 768px: hai cột nếu hợp lý;
   - 1280px: thêm cột/bảng/thao tác hàng loạt, không thêm chức năng mà điện thoại không có (03-UX §17);
   - modal dùng `Dialog` (T1.8);
   - mọi phần tử tương tác đi được bằng Tab, có focus thấy được, có nhãn.
9. **Token + lint:** màu/cỡ chữ theo token (nếu T4.5.x của thư mục chưa chạy thì chạy luôn trong thẻ, **tách commit**). `lint:ux --check` không tăng; R5/R6/R7/R11 của màn = 0.
10. **QA Matrix 03a §34** (14 chiều) ghi PASS/WARNING/FAIL vào Screen Contract. Không còn FAIL mới được báo xong. Chụp so sánh; cập nhật ảnh mốc có chủ đích.

**Tiêu chí xong chung của thẻ T5.x:** ☐ Screen Contract đủ mục, QA Matrix không FAIL ☐ G1–G7 ☐ không đổi API/dữ liệu gửi đi ☐ nợ mới đã ghi.

---

#### Đợt A — màn dùng hằng ngày của 3 vai đang dùng được

**T5.A1 — Trang chủ Quản lý cửa hàng (`/`, `StoreManagerDashboard`)** · M
- **Tệp:** `src/components/dashboard/store-manager-dashboard.tsx`. Screen Contract: `trang-chu-store-manager.md`.
- **Câu hỏi chính:** "Hôm nay cửa hàng cần tôi can thiệp ở đâu?" · **Việc chính:** xử lý mục cần can thiệp.
- **Hiện trạng (26/09):** khối P0 "Cần can thiệp" (job lỗi / chờ duyệt / đơn nháp), P1 job · sản phẩm · mức dùng, P2 lối tắt 2 nút. Chưa có ngoại lệ Điều phối (#163a), chưa có khối đội.
- **Làm:**
  - (1) thay `KhungCho`/khối lỗi bằng `SkeletonBlock`/`InlineError`/`EmptyState` (nếu T1.x chưa thay);
  - (2) hàng "Job lỗi" bấm vào → cuộn tới khối job **và** chuyển focus vào khối đó (`tabIndex={-1}` + `focus()`);
  - (3) khối "Sản phẩm mới" giới hạn 5 dòng + liên kết "Xem tất cả" → `/san-pham`;
  - (4) đơn nháp: hiện tối đa 3 mã đơn ngay trong P0 (đã có `GET /orders?status=DRAFT`, chỉ tăng `limit` từ đáp ứng hiện có);
  - (5) 1280px: P0 bên trái (chiếm 2/3), P1 xếp cột phải.
- **Không làm:** ngoại lệ Điều phối, thông báo — chờ #163.

**T5.A2 — Trang chủ Bán hàng (`/`, `SalesWorkspace`)** · S
- **Tệp:** `src/components/dashboard/sales-workspace.tsx`. Screen Contract: `trang-chu-sales.md`.
- **Câu hỏi chính:** "Khách nào cần tôi liên hệ hôm nay?"
- **Làm:**
  - (1) component trạng thái chung;
  - (2) dòng khách: "Tạo đơn cho khách này" hiện dạng nút phụ trên từng dòng **chỉ khi** `/don-hang` nhận được tham số khách — kiểm `src/app/(app)/don-hang/page.tsx` và `components/orders/create-order-modal.tsx`. Chưa nhận → **không thêm** tham số, ghi nợ "mở modal tạo đơn với khách chọn sẵn";
  - (3) 1280px: hai khối P0 cạnh nhau;
  - (4) dòng "Pipeline cơ hội … đang phát triển" giữ nguyên (DATA GAP #164).

**T5.A3 — Danh mục vai (`/vai-tro`)** · S
- **Tệp:** `src/app/(app)/vai-tro/page.tsx`. Screen Contract: `vai-tro.md`.
- **Làm:**
  - (1) đảm bảo vai `IN_DEVELOPMENT` không nhận focus bàn phím nhưng trình đọc vẫn đọc được "Đang phát triển";
  - (2) 1280px: 3 nhóm thành 3 cột;
  - (3) không thêm mô tả dài — mỗi vai ≤ 2 dòng (03a UX-008).

**T5.A4 — Quét ảnh hoa (`/tai-anh`)** · **L** (chia a/b/c)
- **Tệp:** `src/app/(app)/tai-anh/page.tsx` (1.865 dòng), `components/{upload/upload-wizard,flow/flow-steps,result/result-card,sales/sales-pitch-card,storage/account-storage-hub}.tsx`, `templates/product-analysis/*`. Screen Contract: `tai-anh.md`.
- **Bắt buộc đọc:** AGENTS.md mục "Quy tắc Hành trình Sản phẩm ra Thị trường" — **cấm thêm/bớt chặng của hành trình 14 bước**. Thẻ này chỉ đổi trình bày. Muốn đổi luồng chặng → DỪNG, hỏi PO.
- **Hiện trạng:** 4 tab `m01a | m01b | m01c | storage` (nhãn mã kỹ thuật); pha `upload → …`; job theo 4 bước (Nhận diện cấu phần / Đếm / Màu / Phong cách); gác `H1 H2 H3 H5 H6`.
- **T5.A4a — Cấu trúc:**
  - Nhãn tab bỏ mã kỹ thuật: "Nhận diện ảnh" / "Nội dung bán hàng" / "…" (đọc mã để đặt đúng nghĩa từng tab, PO duyệt nhãn trong Screen Contract).
  - Mỗi tab một nút chính (K2).
  - Tiến trình job dùng `flow-steps` dạng checklist theo bước (03-UX §1); nhật ký chỉ mở khi bấm.
- **T5.A4b — Kết quả + duyệt:** kết quả hiện L0 (tên sản phẩm, loại, số cành chính, màu chính) trước, L2–L3 (đủ trường nguyên tử) sau "Xem chi tiết". Nút "Duyệt" và "Không đạt" đặt cạnh nhau (03-UX §1 "Duyệt tại chỗ"). Giữ nguyên luật Atomic Fields của AGENTS.md.
- **T5.A4c — Trạng thái + mobile:** upload nén ở client (đã có? kiểm; chưa có → nợ, không làm ở thẻ này); vùng thả ảnh ≥ 44px; toàn luồng làm được một tay ở 390px; lỗi job nói bước nào hỏng + "Chạy lại".
- **Chia file (tuỳ chọn, chỉ khi cần):** tách component con vào `src/components/upload/` hoặc `templates/product-analysis/` theo SSOT-TPL. **Không** đổi hành vi, không đổi state machine.

**T5.A5 — Hàng chờ duyệt (`/duyet`)** · M
- **Tệp:** `src/app/(app)/duyet/page.tsx`. Screen Contract: `duyet.md`.
- **Câu hỏi chính:** "Kết quả nào đang chờ tôi duyệt?"
- **Hiện trạng:** 3 tab "Phân tích ảnh (M01a)" / "Ảnh tối ưu (M04a)" / "Dữ liệu bán hàng (M01b)"; action "Làm mới hàng đợi", overflow "Tải CSV", "Chuyển tới Kho", "Chuyển tới Tải ảnh"; `Đang tải…` (dòng 212); `div onClick` (dòng 370).
- **Làm:**
  - (1) bỏ mã khỏi nhãn tab, thêm số đếm vào `badge` của tab (đếm từ dữ liệu đã tải);
  - (2) mỗi mục: nút chính "Duyệt", nút phụ "Không đạt" ngay cạnh; thao tác hàng loạt chỉ ở 1280px (03-UX §17);
  - (3) "Làm mới hàng đợi" chuyển thành nút `outline` (không phải việc chính);
  - (4) trạng thái rỗng từng tab có nút đi tiếp (vd "Tải ảnh để phân tích");
  - (5) sau duyệt → `announce("Đã duyệt <tên>")`, mục rời danh sách, focus chuyển sang mục kế tiếp.

**T5.A6 — Job (`/job`, `/job/[id]`)** · S
- **Tệp:** `src/app/(app)/job/page.tsx`, `src/app/(app)/job/[id]/page.tsx`. Screen Contract: `job.md`.
- **Làm:**
  - (1) danh sách: nhóm theo trạng thái — Lỗi (trên cùng) → Đang chạy → Xong; tên tính năng theo nhãn tiếng Việt (bảng `NHAN_TINH_NANG` — gom về một chỗ dùng chung với dashboard, vd `src/lib/feature-labels.ts`, nếu chưa có);
  - (2) chi tiết: checklist theo bước là chính, nhật ký mở khi cần (03-UX §1); không hiện `stage` dạng mã thô → map sang nhãn, thiếu nhãn thì hiện "Đang xử lý";
  - (3) "Chạy lại" (có sẵn API retry) là nút chính của job lỗi.

---

#### Đợt B — bán hàng và vận hành cửa hàng

| Thẻ | Màn / tệp | Câu hỏi chính → Nút chính | Việc cụ thể đã biết |
|---|---|---|---|
| **T5.B1** (M) | `/san-pham` (`san-pham/page.tsx`, 902 dòng tuyến) + `/san-pham/[id]` | "Sản phẩm nào cần tôi xử lý?" → "Thêm sản phẩm" | `Đang tải…` dòng 88 → Skeleton; danh sách 390px dạng thẻ, 1280px dạng bảng; chi tiết ≤ 7 nhóm thông tin; trạng thái Nháp/Đang bán/Lưu trữ bằng chữ + màu (không chỉ màu — 03a §08) |
| **T5.B2** (M) | `/don-hang` (`orders/{create-order-modal,order-detail-modal}`, `templates/orders/order-guidance-card`) | "Đơn nào cần tôi làm tiếp?" → "Tạo đơn" | Kanban 4 cột → 390px thành danh sách có bộ lọc trạng thái; `order-detail-modal` dòng 162 "Đang tải…"; 2 modal chuyển `Dialog` (nếu T1.8b chưa); ngoại lệ/SLA trễ lên đầu (03a UX-012) — chỉ nếu dữ liệu SLA có trong `OrderRecord` |
| **T5.B3** (M) | `/khach-hang` (`crm/*`) | "Khách nào cần chăm sóc?" → "Thêm khách" | **3 `FeatureGuidanceCard`** → còn 1 (K1); `customer-detail-modal` dòng 101 "Đang tải…"; phân hạng RFM hiện bằng chữ + màu; dịp kỷ niệm sắp tới lên L1 |
| **T5.B4** (M) | `/hoi-thoai` + `/hoi-thoai/kenh-tich-hop` (`chat/*`) | "Hội thoại nào đang chờ trả lời?" → "Trả lời" | **3 `FeatureGuidanceCard`** → 1; `channel-config-modal` → `Dialog`; 390px: danh sách hội thoại → chạm vào mở toàn màn |
| **T5.B5** (S) | `/catalog` (`catalog/*`, `templates/catalog/catalog-guidance-card`) | "Catalog nào cần cập nhật/chia sẻ?" → "Chia sẻ catalog" | `Card onClick` (T1.7); `share-catalog-modal`, `product-detail-modal` → `Dialog`; `catalog-storefront` là trang công khai — **không** đổi giao diện công khai trong thẻ này (thẻ riêng nếu PO muốn) |
| **T5.B6** (S) | `/gia` (gác `L6`) | "Giá sản phẩm này tính ra bao nhiêu?" → "Lưu quy tắc giá" | số tiền định dạng `vi-VN`; lỗi kiểm giá nói trường nào sai |
| **T5.B7** (S) | `/them` | — | Đã đổi ở T3.7; chỉ QA Matrix + Screen Contract |
| **T5.B8** (S) | Menu tài khoản + `/ho-so` (`profiles/*`, `organization/occasions-settings-form`) | "Thông tin cửa hàng đã đủ chưa?" → "Lưu hồ sơ" | **3 `FeatureGuidanceCard`** → 1; `occasions-settings-form` dòng 183, `greeting-line-override-form` dòng 148 "Đang tải…"; 5 form thành tab rõ ràng, mỗi tab một nút "Lưu" |

---

#### Đợt C — nội dung và tiếp thị (cổng K3 cho C1)

| Thẻ | Màn / tệp | Câu hỏi chính → Nút chính | Việc cụ thể đã biết |
|---|---|---|---|
| **T5.C1** (L, chia theo workspace) | `/market-intelligence` (33 tệp `components/market-intelligence`, 1.476 màu thô) | "Cơ hội nội dung nào đáng làm ngay?" → "Tạo nội dung từ cơ hội này" | K3: thẻ danh sách chỉ báo "2 video dẫn chứng", thumbnail đầy đủ ở `opportunity-detail-drawer`; giữ luật "Cấm tràn từ khóa thô" + `getOpportunityHeadline()`; **2 `FeatureGuidanceCard`** → 1; 7 modal/drawer → `Dialog`; T4.5.9 chạy kèm |
| **T5.C2** (L) | `/creative-studio` (22 tệp `components/creative-studio`, Khu vực A–F) | theo từng Khu vực: một Khu vực = một việc chính | nhãn "Khu vực A–F" → tên việc (vd "Tối ưu ảnh", "Biến thể marketing", "Âm thanh", "Video", "Nội dung", "Đóng gói"); `video-workspace.tsx:254` `div onClick` (T1.7); `voice-clone-panel.tsx:72` "Đang tải…"; **không** đổi luồng 14 chặng (AGENTS Journey) và luật nhà cung cấp |
| **T5.C3** (M) | `/video` (`video-studio/*`) | "Video nào đang dựng/cần duyệt?" → "Tạo video" | **2 `FeatureGuidanceCard`** → 1; `video-create-modal` → `Dialog`; tiến trình render theo bước (đã có khung xám riêng → gom về `Skeleton`) |
| **T5.C4** (M) | `/noi-dung` (`templates/content-engine`) | "Bài nào cần viết/duyệt?" → "Viết bài mới" | khung xám riêng → `Skeleton`; bài của Content Engine: điểm Critic hiện ở L2, không lên L0 |
| **T5.C5** (M) | `/lich-dang` (`templates/social-publishing`) | "Hôm nay đăng gì, bài nào lỗi?" → "Lên lịch bài" | bài lỗi đăng lên đầu (03a UX-012); `schedule-confirm-modal` → `Dialog` |
| **T5.C6** (M) | `/kho-templates` (+ `preview-data/*`, `template-preview-modal`) | "Chọn mẫu nào?" → "Dùng mẫu này" | **2 `FeatureGuidanceCard`** → 1; `preview-data/*` là dữ liệu xem trước — không tính lint (đã loại trừ ở T2.1); modal xem trước → `Dialog` |

---

#### Đợt D — thiết lập, số liệu, Console, Điều phối

| Thẻ | Màn / tệp | Việc cụ thể đã biết |
|---|---|---|
| **T5.D1** (S) | `/so-lieu` (gác `U2`, `U3`) | số liệu phải là số đo (Bẫy); biểu đồ có bảng số thay thế cho trình đọc |
| **T5.D2** (S) | `/ket-noi` (`templates/platform-connections`) | **2 `FeatureGuidanceCard`** → 1; `connect-account-modal` → `Dialog`; trạng thái kết nối bằng chữ + màu |
| **T5.D3** (S) | `/cai-dat-ai` (gác `U1`, `U2`) | **2 `FeatureGuidanceCard`** → 1; mật độ EXPERT được phép (03a UX-005) nhưng phạm vi thay đổi phải rõ (03a IA-005) |
| **T5.D4** (S) | `/bo-may` (gác `H4`) | dòng 124 "Đang tải…"; đổi bộ máy = hành động tác động lớn → xác nhận nói rõ ảnh hưởng (03a §22) |
| **T5.D5** (S) | `/tri-thuc` (`knowledge-base/*`) | **3 `FeatureGuidanceCard`** → 1; thanh tiến trình onboarding giữ |
| **T5.D6** (S) | `/kho-du-lieu` (`storage/account-storage-hub`) | 39 dòng tuyến; chủ yếu QA Matrix + token |
| **T5.D7** (M) | **Mới:** `/muc-dung` tenant (gỡ `COMING_SOON`) | dùng `GET /api/v1/usage/summary` + `GET /api/v1/usage` (kiểm `G8`); ghi đặc tả 06 nếu thêm trang gọi endpoint mới — **không thêm endpoint**; đóng một phần nợ #167 |
| **T5.D8** (M) | **Mới:** `/audit` tenant (gác `A4`/`G9` — đọc mã route `GET /api/v1/audit-logs` để chọn đúng mã) | bảng nhật ký có lọc; 390px thành thẻ; đóng một phần #167 |
| **T5.D9** (M) | **Mới:** `/cai-dat` tenant | **DỪNG hỏi PO phạm vi** trước khi làm (chưa có đặc tả "Cài đặt tiệm"); nếu PO chỉ muốn trang mục lục trỏ tới `/ho-so`, `/cai-dat-ai`, `/ket-noi`, `/bo-may` → S |
| **T5.D10** (M) | Console `/van-hanh` + `to-chuc`, `to-chuc/[id]`, `muc-dung`, `nhat-ky`, `suc-khoe` | khuôn `platform_admin` (03b §4.1): phạm vi thao tác luôn hiện (tổ chức nào / mọi tổ chức); 6 chỗ "Đang tải…"; T4.5.10 |
| **T5.D11** (L) | **Vùng Điều phối** `/dieu-phoi` + `control-tower-dashboard.tsx` + 7 modal `templates/coordinator/*` — **sau ĐP-4c** | câu hỏi chính "Đơn nào đang có rủi ro ngay lúc này?"; ngoại lệ + rủi ro SLA lên đầu, KPI xuống dưới (03b §4.4, 03a UX-012); nút chính duy nhất "Tiếp nhận đơn mới" (K2: "Làm mới" → `outline`); T1.8c + T4.5.11; gộp nợ #166 |
| **T5.D12** (M) | **Vùng Điều phối** Console `/van-hanh/truong-du-lieu` — **sau ĐP-3 đóng hẳn** | 4 chỗ "Đang tải…"; mật độ EXPERT; phạm vi ghi đè (mọi tổ chức / tổ chức chọn) luôn hiện rõ |

---

### UX-6 — Mở khoá vai và các lớp liên vai

#### T6.SOP — Quy trình mở khoá MỘT vai (mọi thẻ T6.1–T6.8, T6.13)

1. **Audit** theo Contract §26–§31, ghi vào `docs/dac-ta/screen-contracts/trang-chu-<vai>.md`, mục "Audit vai":
   - **Dữ liệu:** thực thể + trường cần cho P0/P1 của vai (03b §3 và bảng Contract §07) → CÓ/THIẾU, trỏ tới `prisma/schema.prisma` và đặc tả 07.
   - **Luồng:** việc chính của vai đã có màn/API chưa.
   - **Quyền:** bộ mã năng lực vai cần (đọc + hành động).
   - Bất kỳ ô THIẾU nào thuộc P0 → **DỪNG**, báo PO kèm đề xuất (thẻ dữ liệu riêng). Không mở vai khi P0 thiếu dữ liệu.
2. **Vai phân quyền:** thêm vào `src/modules/organization/domain/system-roles.ts` (`{ key, name }`), khoá `snake_case` tiếng Anh hoặc theo quy ước vai sẵn có — **hỏi PO khoá cuối cùng**.
3. **Năng lực mặc định:** trong `src/core/rbac/capability-catalog.ts`, thêm khoá vai mới vào `defaultRoles` của từng mã cần. **Không** thêm vào `hardCap` trừ khi PO duyệt. Sửa `capability-catalog.test.ts` (đếm số mã theo vai nếu test có đếm).
4. **Nạp:** kiểm `ensureSystemRoles` / `prisma/seed.ts` tự nạp vai mới (vai là bản ghi). Ghi "anh Tony chạy `npm run db:seed`" vào báo cáo.
5. **Trang chủ vai:** component mới `src/components/dashboard/<vai>-workspace.tsx`, ghép từ component có sẵn (REUSE). Áp T5.SOP bước 4–10.
6. **Danh mục:** `role-ux-catalog.ts` → `status: "AVAILABLE"`, `homepage` (thêm giá trị union mới nếu cần), `systemRoleKeys`, `entryHref`, `navPriority`. Sửa `role-ux-catalog.test.ts` (ca "đúng N vai đang dùng được"). `src/app/(app)/page.tsx` thêm nhánh `switch`.
7. **Test cách ly tenant:** nếu thêm năng lực cho vai mới → thêm ca vào `tests/tenant/` kiểm vai mới không đọc được dữ liệu tổ chức khác qua endpoint của trang chủ (theo khuôn test sẵn có).
8. **Tài liệu:** 03b §3 (bảng) + §4 (hồ sơ vai mới), đặc tả 02 (bảng vai × mã nếu có), PRD §152 (danh sách vai tối thiểu nếu PO muốn), `TECHNICAL_DEBT.md` (đóng phần của vai trong #165 bằng dòng "ĐÃ TRẢ một phần <ngày>: <vai>").
9. Cổng: G1–G7 + `npm run test:tenant` (anh Tony chạy trên Mac).

#### Thẻ mở vai

| Thẻ | Vai | Cổng dữ liệu | P0 dự kiến (kiểm lại ở bước 1) | Trang chủ ghép từ |
|---|---|---|---|---|
| **T6.1** | `product_manager` | Có: `products`, `product_variants`, `product_images`, `product_analyses`, `pricing_rules`, catalog. **Cần luật thuần mới** `computeProductReadiness(product)` trong `src/modules/products/domain/` (có test), chỉ dùng trường có thật: có ảnh chính đã duyệt? có giá? có mô tả? trạng thái ACTIVE? | Sản phẩm chưa sẵn sàng bán + lý do thiếu | danh sách `/san-pham` + `EmptyState` + nút "Hoàn thiện sản phẩm" |
| **T6.2** | `marketing` + `lead_marketing` | Có: Creative Studio (job 14 chặng), Content Engine, Lịch đăng, Market Intelligence. **Cần** gộp "nội dung cần xử lý" từ các API có sẵn (job chờ duyệt `P3/P4/I2/I5`, bài chờ duyệt, bài đăng lỗi) — không tạo bảng mới | Nội dung chờ duyệt, bài đăng lỗi, cơ hội mới | thẻ từ `templates/content-engine`, `templates/social-publishing`, `market-intelligence` |
| **T6.3** | `crm` | Có: Customer Master Index, RFM, dịp, consent. **Thiếu** trạng thái vòng đời tường minh (Acquire → Grow) → luật thuần suy từ RFM + đơn gần nhất, **PO duyệt luật** trước khi code | Khách sắp rời, khách cần kích hoạt lại, dịp sắp tới | `crm/*`, khối "Khách cần liên hệ" của `SalesWorkspace` (tách thành component dùng chung) |
| **T6.4** | `customer_service` | Có: `/hoi-thoai` (P23). Thiếu: ngữ cảnh khách + đơn cạnh hội thoại | Hội thoại chờ trả lời, khách + đơn liên quan | `chat/*`, `crm/customer-detail-modal` |
| **T6.5** | `finance_accounting` | **Chờ ĐP-4a** (sổ thu D2: Tổng số / Đã thu / Còn phải thu). Đối soát/tất toán chưa có | Khoản còn phải thu, giao dịch bất thường | chờ |
| **T6.6** | `quality_control` | **Chờ ĐP-4b/4c** (`QC_RECORD`, `ai-qc-inspection-modal`) | Lỗi chất lượng chờ xác minh | chờ |
| **T6.7** | `partner_manager` | Có: đối tác Điều phối. **Chờ ĐP-4c**: hiệu suất/chất lượng/SLA đối tác | Đối tác rủi ro, đối tác tăng trưởng | chờ |
| **T6.8** | `ceo` + `manager` | Chờ tổ chức `CHAIN` thật + số liệu đa chi nhánh; tách khuôn `dieu_hanh` theo `organizationType` trong `resolveRoleUx` (#163d) | KPI chiến lược, điểm nghẽn vận hành | chờ |

#### T6.9 — Đa vai / chuyển vai (#162) · L · **Cổng:** D-RU4 = "Làm ngay"
- **Được sửa:** `prisma/schema.prisma` (bảng `membership_roles` hoặc cột phiên `active_role_id` — **đề xuất phương án trong báo cáo, chờ PO chọn trước khi viết migration**), `src/modules/organization/**` (resolve session, `resolveGrants` hợp các vai), đặc tả 07 + 06, `tests/tenant/*`.
- **Luật bất biến:** Permission > Scope > Active Role > UX (Contract §15). Đổi vai **không** nhân bản khách/đơn/sản phẩm. Năng lực hiệu lực = hợp các vai (hoặc chỉ vai đang hoạt động — PO chọn).
- **UI:** bộ chọn vai trong menu tài khoản; `useSession().roleUx` theo vai đang hoạt động.

#### T6.10 — AI theo vai (#168) · M · **Phụ thuộc:** đợt A xong
- **Đọc trước:** `src/components/chat/alg-global-copilot.tsx`, `src/modules/chat-assistant/**`, AGENTS.md (cổng AI `callCapability`, D15, sàn quyền riêng tư).
- **Các bước:**
  1. Phía **máy chủ**, lấy `roleKey` + `organizationId` từ phiên (**không nhận từ client** — quy ước AGENTS).
  2. Thêm vào ngữ cảnh lời nhắc của copilot một khối "Vai người dùng: <label>, câu hỏi chính: <primaryQuestion>, hành động chính: <dominantActions>" (lấy từ `role-ux-catalog.ts`).
  3. Luật AI MUST NOT của Contract §11 thành câu chỉ dẫn trong lời nhắc hệ thống.
  4. Test: ca thuần cho hàm dựng ngữ cảnh (vai `sales` → có "Khách nào cần tôi liên hệ hôm nay?"); ca kiểm không nhận `roleKey` từ body request.
- **Không làm:** tự động hành động thay người dùng.

#### T6.11 — Ngoại lệ và thông báo P0–P3 (#166, #163a) · L · **Phụ thuộc:** ĐP-4c
- **Làm theo thứ tự:** đặc tả trường (`ALG_COORDINATOR_FIELD_SPEC.md`) → đặc tả 07 → lược đồ → API `GET /coordinator/exceptions` (danh sách, lọc theo trạng thái) → khối "Ngoại lệ đang mở" ở P0 của `store_manager` + Control Tower. Bảng thông báo: đặc tả riêng, PO duyệt.
- **Chỉ trường có trong Master Index** (Contract §13).

#### T6.12 — Pipeline Sales (#164) · L · **Cổng:** PO duyệt thiết kế dữ liệu
- (a) Thiết kế thực thể cơ hội (Lead → Qualify → Opportunity → Follow-up → Convert) trong đặc tả 07 + Master Index, trình PO trước khi code.
- (b) **Làm được ngay, tách thẻ nhỏ T6.12b (S):** `projectOccasionReminder` trả `suggestedFlower`/`suggestedTone` = `null` khi khách chưa khai sở thích (bỏ "Hoa hồng thiết kế"/"Pastel dịu ngọt" bịa). Sửa `tests/unit/crm/crm-rules.test.ts`. Kiểm mọi nơi đọc hai trường (grep) hiển thị "chưa có" khi `null`.

#### T6.13 — Vai `florist` (Thợ cắm) · M · **Cổng:** Q-TC = "Thêm"
- Thêm vai 15 vào `role-ux-catalog.ts` với `status: "IN_DEVELOPMENT"`, nhóm `ONE_STORE`, triết lý "Production Queue", câu hỏi chính "Hôm nay tôi cắm những đơn nào, theo thứ tự nào?". Sửa test (15 vai), 03b §3, `/vai-tro` tự hiện. Mở khoá sau theo T6.SOP, ghép từ "lát cắt Thợ cắm" của M10 (giấu 100% giá — giữ luật đó).

---

### UX-7 — Nghiệm thu liên tục và khoá tài liệu

#### T7.1 — Chụp so sánh giao diện
- **Quy mô:** M · **Phụ thuộc:** T1.1, Q-E2E
- **Đọc trước:** `playwright.config.ts`, `tests/e2e/creative-studio.spec.ts`, `tests/e2e/fixtures/*`.
- **Được sửa:** tạo `tests/e2e/ux/visual.spec.ts`, `tests/e2e/ux/helpers.ts` (đăng nhập theo vai qua `POST /api/v1/auth/login`, lưu `storageState` mỗi vai).
- **Các bước:**
  1. Danh sách tuyến chụp: mọi tuyến `(app)` + `/van-hanh` (tài khoản vận hành nền tảng, nếu có).
  2. Mỗi tuyến 2 khổ: `{ width: 390, height: 844 }` và `{ width: 1280, height: 800 }`.
  3. Trước khi chụp: chờ mạng rảnh; tắt hiệu ứng (`animations: "disabled"`); che vùng động (thời gian, số credit) bằng `mask`.
  4. `expect(page).toHaveScreenshot(\`<tuyen>-<kho>.png\`, { maxDiffPixelRatio: 0.01 })`.
  5. Ảnh mốc lưu cạnh spec (`__screenshots__`), commit vào repo.
- **Tiêu chí xong:** ☐ Chạy 2 lần liên tiếp không lệch (ổn định) ☐ hướng dẫn chạy ghi trong AGENTS.md bảng Lệnh.

#### T7.2 — E2E theo vai
- **Quy mô:** M · **Phụ thuộc:** T7.1, Q-E2E
- **Được sửa:** tạo `tests/e2e/ux/role-homepage.spec.ts`, `tests/e2e/ux/navigation.spec.ts` (từ T3.8), `tests/e2e/ux/route-states.spec.ts` (từ T1.1); fixture seed 3 tài khoản (`scripts/them-thanh-vien.ts` đã có — dùng lại, hoặc fixture trong `tests/e2e/fixtures/`).
- **Ca bắt buộc:**
  1. `e2e-dieu-hanh`: `/` có tiêu đề khối "Cần can thiệp" hoặc "Không có việc cần can thiệp".
  2. `e2e-sale`: `/` có nút "Tạo đơn" (nếu có `R2`) và khối "Khách cần liên hệ".
  3. `e2e-dieu-phoi`: `/` → URL `/dieu-phoi`.
  4. Cả ba: `/vai-tro` có đúng 10 dòng `aria-disabled="true"` (hoặc 11 nếu T6.13).
  5. `/khong-co-trang-nay` → "Không tìm thấy trang".
  6. Mục "Sắp có" không điều hướng khi bấm.

#### T7.3 — Quét trợ năng tự động
- **Quy mô:** S · **Phụ thuộc:** T7.1 · **Cho phép thêm devDependency:** `@axe-core/playwright`
- **Được sửa:** `package.json`, tạo `tests/e2e/ux/a11y.spec.ts`.
- **Các bước:** mỗi tuyến **đã chuẩn hoá** (danh sách lấy từ Screen Contract có QA Matrix không FAIL) → `new AxeBuilder({ page }).withTags(["wcag2a","wcag2aa","wcag21aa","wcag22aa"]).analyze()` → không có vi phạm `impact` = `critical` hoặc `serious`. Tuyến chưa chuẩn hoá: chạy chế độ báo cáo (không làm test đỏ), ghi số vào báo cáo.

#### T7.4 — CI cho UX
- **Quy mô:** S · **Phụ thuộc:** T7.1–T7.3
- **Được sửa:** `.github/workflows/ci.yml`.
- **Các bước:** job mới `e2e-ux`: Postgres service (như job web) → `npm ci` → `npx prisma generate && npx prisma db push` → seed + 3 tài khoản E2E → `npm run build` → `E2E_WEB_COMMAND="npm run start" npx playwright test tests/e2e/ux` (Chromium, không cần worker Python). Lỗi thì tải `trace` và ảnh diff làm artifact.
- **Tiêu chí xong:** ☐ Job xanh trên nhánh.

#### T7.5 — Khoá tài liệu (khi đợt D xong)
- **Quy mô:** S
- **Các bước:**
  - `lint:ux --check`: luật R1, R2, R5, R6, R7, R11 chuyển từ ratchet sang **chặn tuyệt đối** (0 ngoài allowlist).
  - 03a §0 + 03b §3–4: "Hiện trạng" → "Đã đạt <ngày>".
  - `Checklist_Thuc_Thi.md` mục UIUX tích đủ.
  - Kế hoạch này chuyển `status: "ARCHIVED"` trong REGISTRY.
  - `TRANG_THAI.md` ghi mốc.

---

## PHẦN V — THƯỚC ĐO VÀ CỔNG GIAI ĐOẠN

| Chỉ số | Mốc 26/09 | Cổng sau UX-1/2/3 | Cổng sau đợt A | Cổng sau đợt B | Cổng sau đợt C | Đích (T7.5) |
|---|---|---|---|---|---|---|
| Màu thô (R1) | 2.211 | ≤ 2.150 | ≤ 1.950 | ≤ 1.500 | ≤ 300 | < 150 (allowlist) |
| `text-[Npx]` (R2) | 1.596 | ≤ 1.560 | ≤ 1.300 | ≤ 900 | ≤ 200 | 0 ngoài allowlist |
| Hex trong tsx (R3) | 103 | — | ≤ 80 | ≤ 50 | ≤ 20 | allowlist |
| R5/R6/R7/R11 (tương tác, nhãn, alt, nút chết) | chưa đo (T2.1 đo) | mã mới = 0 | màn đợt A = 0 | màn đợt B = 0 | màn đợt C = 0 | 0 toàn repo |
| `loading/error/not-found` cấp tuyến | 0 | 6 | 6 | 6 | 6 | 6 + màn nặng |
| Modal dùng `Dialog` | 0/33 | 3/33 | 3/33 | ≥ 18/33 | ≥ 25/33 | 33/33 |
| Màn có Screen Contract (QA không FAIL) | 0 | 1 (`_dieu-huong`) | 7 | 15 | 21 | 31 + Console |
| axe critical/serious trên màn đã chuẩn hoá | chưa đo | — | 0 | 0 | 0 | 0 |
| Mục điều hướng mở sẵn mỗi vai | 22 | ≤ 8 | ≤ 8 | ≤ 8 | ≤ 8 | ≤ 8 |
| `FeatureGuidanceCard` > 1 trên một màn | 7 màn | 7 | 7 | ≤ 3 | ≤ 1 | 0 |
| Vai `AVAILABLE` | 4/14 | 4 | 4 | 4–5 | theo UX-6 | theo cổng dữ liệu |

Cổng giai đoạn: **PO chỉ giao đợt kế tiếp khi cột của đợt trước đạt** (đo bằng `npm run lint:ux`, đếm Screen Contract, báo cáo T7.3).

---

## PHẦN VI — PROMPT MẪU GIAO VIỆC CHO AI AGENT

Chép nguyên khối dưới, thay phần trong `<>`.

```text
Bạn là AI Coding Agent làm việc trong repo floraos-core.

NHIỆM VỤ: Thực hiện thẻ việc <T?.?> (<tên thẻ>) trong
docs/kien-truc/KE_HOACH_NANG_CAP_UIUX.md, Phần IV.

BẮT BUỘC TRƯỚC KHI LÀM:
1. Đọc Phần I (luật vận hành), Phần II (bảng quyết định), Phần III (hiện trạng)
   của kế hoạch, và ô "Đọc trước" của thẻ.
2. Đọc docs/00-DOCUMENTATION-CONSTITUTION.md, docs/kien-truc/TRANG_THAI.md mục 1,
   AGENTS.md (Quy ước + Bẫy), docs/dac-ta/03b-role-ux.md.
3. Chạy `git status --short`. Tệp trong ô "Được sửa" đang có thay đổi của phiên khác
   → DỪNG và báo.
4. Kiểm cổng quyết định và phụ thuộc của thẻ. Chưa đạt → DỪNG và báo theo mẫu BLOCKED.

KHI LÀM:
- Chỉ sửa tệp trong ô "Được sửa" (+ tài liệu trong ô "Cập nhật tài liệu").
- Không đổi hành vi nghiệp vụ, không đổi API, không đổi lược đồ (trừ khi thẻ ghi rõ).
- Không bịa dữ liệu; API 403 → ẩn khối.
- REUSE > EXTEND > COMPOSE > CREATE. Không thêm dependency trừ khi thẻ cho phép.
- Next.js 16: đọc node_modules/next/dist/docs/ trước khi dùng API của Next.
- Nếu là thẻ T5.x: làm đủ 10 bước của T5.SOP, có Screen Contract.

TRƯỚC KHI BÁO XONG:
- Chạy cổng chung G1–G7 (Phần I.3); cổng nào không chạy được trong môi trường
  của bạn thì ghi rõ lý do.
- Cập nhật TRANG_THAI.md, Checklist_Thuc_Thi.md (mục UIUX), TECHNICAL_DEBT.md (nếu có nợ mới).
- <Commit theo quy ước `ui(<phạm vi>): <mã thẻ> <mô tả>` | KHÔNG commit, để tôi xem trước>.
- Báo cáo đúng mẫu Phần VII.

PHẠM VI BỔ SUNG / GHI CHÚ CỦA PO: <nếu có>
```

**Prompt giao nhiều thẻ liền nhau** (chỉ khi cùng giai đoạn, không có cổng quyết định mở):
```text
Thực hiện lần lượt các thẻ <T1.2, T1.3, T1.4> theo cùng luật trên. Mỗi thẻ một commit
và một mục báo cáo riêng. Thẻ nào DỪNG thì dừng tại đó, không làm thẻ sau.
```

---

## PHẦN VII — MẪU BÁO CÁO CỦA AGENT

```text
THẺ: T?.? — <tên>
TRẠNG THÁI: XONG | XONG MỘT PHẦN | BLOCKED
ĐẦU VÀO ĐÃ KIỂM: <tài liệu đã đọc, quyết định PO áp dụng (K?)>
THAY ĐỔI:
  - <tệp>: <thay đổi cụ thể, vì sao — trỏ tới luật 03a/03b/AGENTS>
  Ví dụ đúng: "duyet/page.tsx: 'Làm mới hàng đợi' từ primary → outline vì K2 (1 nút chính);
  nút chính là 'Duyệt' trên từng mục (việc chính của màn theo Screen Contract duyet.md)."
  Ví dụ SAI (không được viết): "Cải thiện UX", "Làm đẹp dashboard".
SCREEN CONTRACT: <đường dẫn, QA Matrix: số PASS/WARNING/FAIL>
CỔNG:
  G1 tsc: <không thêm lỗi | +N lỗi (liệt kê)>
  G2 eslint: <0 error>
  G3 npm test: <xanh | chờ Mac vì …>
  G4 check-docs: <xanh>
  G5 template-ssot: <xanh | không áp dụng | chờ>
  G6 lint:ux: <trước → sau theo luật>
  G7 chụp so sánh: <không lệch ngoài phạm vi | lệch có chủ đích ở …>
NỢ MỚI: <#số — nội dung>
VIỆC ANH TONY CẦN LÀM TAY: <db:seed, xem trực quan tuyến …, chạy test …>
THẺ TIẾP THEO ĐỀ XUẤT: <T?.?>
```

---

## PHỤ LỤC A — MẪU SCREEN CONTRACT (`docs/dac-ta/screen-contracts/_TEMPLATE.md`)

```markdown
# Screen Contract — <tên màn>

**Tuyến:** `<route>` · **Tệp chính:** `<đường dẫn>` · **Cập nhật:** <ngày> · **Thẻ:** <T?.?>

## 1. Vai và mục đích
- Vai chính (03b): <khoá> · Vai phụ: <…>
- Phạm vi: organization | branch | platform
- Việc chính: <một câu>
- Câu hỏi chính: <một câu hỏi>
- Mật độ: LOW | MEDIUM | HIGH | EXPERT (lý do)

## 2. Hiện trạng (audit)
- API: <METHOD /api/v1/… → mã năng lực (route.ts:dòng)>
- Khối: <n> · Nút primary: <n> · FeatureGuidanceCard: <n> · Modal: <danh sách>
- Trạng thái có sẵn: tải ☐ rỗng ☐ lỗi ☐ không quyền ☐ một phần ☐ thành công ☐
- lint:ux trước: R1=… R2=… R3=… R5=… R6=… R7=… R11=…

## 3. Thứ bậc thông tin
| Lớp | Nội dung | Vị trí hiển thị |
|---|---|---|
| L0 Thiết yếu | | khung nhìn đầu |
| L1 Hành động | | khung nhìn đầu |
| L2 Ngữ cảnh | | mở rộng tại chỗ |
| L3 Chi tiết | | trang chi tiết / drawer |
| L4 Nâng cao | | "Xem thêm" / chỉ platform_admin |

## 4. Hành động
- Chính (1): <nhãn> → <kết quả>
- Phụ (≤ 2): <…>
- Menu `…`: <…>

## 5. Content budget
nút nổi: <n>/3 · khối chính: <n>/5 · nhóm thông tin (trang chi tiết): <n>/7 · lý do vượt (nếu có)

## 6. Trạng thái (mô tả cụ thể nội dung hiển thị)
tải: … · rỗng: … · lỗi: … · không quyền: … · một phần: … · thành công: …

## 7. Responsive
390px: … · 768px: … · 1280px: …

## 8. Trợ năng
bàn phím: … · focus: … · nhãn: … · vùng thông báo: … · axe: <kết quả>

## 9. AI
gợi ý: … · tự động: không · cần duyệt: …

## 10. Dữ liệu và quyền
nguồn sự thật: … · trường dùng: … · năng lực: …

## 11. Component
dùng lại: … · mở rộng: … · tạo mới (kèm lý do 03a §30): …

## 12. Ma trận quyết định
| Hiện tại | Mục tiêu | Quyết định | Lý do | Bằng chứng |
|---|---|---|---|---|

## 13. QA Matrix (03a §34)
| Chiều | Kết quả | Ghi chú |
|---|---|---|
| Vai · Việc · IA · Mật độ · Thứ bậc · CTA · Luồng · Trạng thái · Responsive · Trợ năng · Dữ liệu · Quyền · AI · Nhất quán | PASS/WARNING/FAIL | |

## 14. Kết quả
lint:ux sau: … · nợ mở: … · ảnh mốc: …
```

---

## PHỤ LỤC B — ĐẶC TẢ LUẬT UX LINT v0

| Mã | Luật | Cách phát hiện (AST) | Mức ban đầu | Nguồn |
|---|---|---|---|---|
| R1 | Lớp màu Tailwind thô | Lấy mọi chuỗi trong `className` (literal, template, đối số `cn()`/`cva()`/`clsx()`); tách token; khớp `^(hover:|focus:|group-hover:|md:|…)*(bg|text|border|from|to|via|ring|fill|stroke|outline|divide|shadow)-(red|rose|pink|fuchsia|purple|violet|indigo|blue|sky|cyan|teal|emerald|green|lime|yellow|amber|orange|slate|gray|zinc|neutral|stone)-\d{2,3}(/\d+)?$` | Ratchet | 03a §31 |
| R2 | Cỡ chữ tuỳ ý | Token khớp `text-\[\d+(\.\d+)?px\]` | Ratchet | 03a §31 |
| R3 | Mã hex trong giao diện | Chuỗi `#[0-9a-fA-F]{3,8}` trong `className`, `style`, hoặc prop màu (`color=`, `fill=`, `stroke=`) của phần tử JSX | Ratchet | 03a §31 |
| R4 | Hơn 1 nút chính | Trong một tệp màn/modal: đếm `<Button>` không có `variant` hoặc `variant="primary"` ở cùng một khối JSX cha gần nhất cấp đầu trang **và** phần tử `primaryActions` có `variant: "primary"` của `TabActionHeader`; > 1 → cảnh báo | WARNING | 03a UX-010, K2 |
| R5 | `onClick` trên phần tử không tương tác | Phần tử `div/span/li/tr/td/img/Card` có `onClick` mà thiếu `role` **hoặc** `tabIndex` **hoặc** `onKeyDown`. Miễn: lớp phủ nền modal (có `fixed inset-0` và `aria-hidden` hoặc nằm trong `Dialog`) | FAIL với tệp mới | WCAG 2.1.1 |
| R6 | Nút chỉ có icon thiếu nhãn | `<button>`/`<Button>` mà con chỉ là phần tử icon (tên bắt đầu bằng chữ in hoa từ `lucide-react`) và không có `aria-label`/`aria-labelledby`/`title` | FAIL với tệp mới | WCAG 4.1.2 |
| R7 | Ảnh thiếu `alt` | `<img>` hoặc `<Image>` (next/image) không có prop `alt` | FAIL với tệp mới | WCAG 1.1.1 |
| R8 | Mã kỹ thuật trong nhãn | Chuỗi JSX text hoặc prop `label/title/badge` khớp `\bM\d{2}[a-z]?\b|Khu vực [A-F](-[A-F])?|\bSSOT\b|Chức năng \d+|\bP\d{2}\b` | WARNING | 03a §39 |
| R9 | "Đang tải" dạng chữ | JSX text khớp `^Đang tải(…|\.\.\.)?$` | WARNING | 03-UX §15 |
| R10 | Thiếu nhánh rỗng/lỗi | Tệp có `fetch(` hoặc hook dữ liệu **và** không có ít nhất một: `EmptyState`, `InlineError`, `length === 0`, `catch`, `role="alert"` | WARNING | 03a §24 |
| R11 | Nút không làm gì | `<button>`/`<Button>` không có `onClick`, không `type="submit"`, không nằm trong `<form>`, không bọc bởi `<Link>`/`<a>`, không phải trigger của Radix/base-ui (`asChild`) | FAIL với tệp mới | 03a §22 |
| R12 | Component trùng | Tệp mới trong `src/components/**` có tên export trùng hoặc khoảng cách Levenshtein ≤ 2 với export của `src/components/ui/**` hoặc `templates/shared/**` | WARNING | 03a §30 |

---

## PHỤ LỤC C — BẢNG THẺ TỔNG HỢP (để PO theo dõi)

| Giai đoạn | Thẻ | Quy mô | Cổng | Phụ thuộc |
|---|---|---|---|---|
| UX-R | TR.1 | S | — | — |
| UX-0 | T0.1 · T0.2 · T0.3 · T0.4 · T0.5 · T0.6 | S×6 | K1–K6, D-RU4, Q-TC, Q-MO | TR.1 |
| UX-1 | T1.1 S · T1.2 M · T1.3 S · T1.4 S · T1.5 S · T1.6 S · T1.7 S · T1.8a/b/c L · T1.9 S · T1.10 S | | K2 (T1.10) | T0.x |
| UX-2 | T2.1 M · T2.2 S · T2.3 S · T2.4 S · T2.5 S · T2.6 S | | — | T0.x |
| UX-3 | T3.1 M · T3.2 S · T3.3 S · T3.4 M · T3.5 S · T3.6 S · T3.7 S · T3.8 S · T3.9 S | | K5 | T0.x, T1.9 |
| UX-4 | T4.1 S · T4.2 S · T4.3 S · T4.4 M · T4.5.1–T4.5.11 · T4.6 S · T4.7 S | | K1 (T4.6), K3 (T4.5.9) | T2.1, T7.1 |
| UX-5 A | T5.A1 M · T5.A2 S · T5.A3 S · T5.A4 L · T5.A5 M · T5.A6 S | | K2 | UX-1, UX-3, T4.5.1–5 |
| UX-5 B | T5.B1–B8 | S–M | K1, K2 | đợt A |
| UX-5 C | T5.C1–C6 | M–L | K1, K2, K3 | đợt B |
| UX-5 D | T5.D1–D12 | S–L | K2; D9 hỏi PO; D11/D12 sau ĐP-4c/ĐP-3 | đợt C |
| UX-6 | T6.1–T6.13 (+T6.12b) | M–L | Q-MO, D-RU4, Q-TC, dữ liệu | đợt A (T6.10) |
| UX-7 | T7.1 M · T7.2 M · T7.3 S · T7.4 S · T7.5 S | | Q-E2E | T1.1 |
