# Kế hoạch sẵn sàng bàn giao — nhóm việc làm ngay

> Phạm vi: các việc thực hiện trước hoặc cùng lúc bàn giao repo ALG cho khách hàng, sau khi PR #107 (khắc phục nhánh Enterprise UI/UX) đã hợp nhất vào `main`.
> Chủ sở hữu: Product Owner. Nhánh thực thi: `claude/zen-carson-os8a8r`, kết thúc bằng một PR vào `main`.
> Hạn bàn giao: 10/11/2026. Thời lượng: 5 ngày làm việc (mục 8). Cách dùng: mỗi commit tick đúng dòng của nó trong cùng commit và điền mã commit vào bảng mục 9.

## 1. Mục tiêu và tiêu chí hoàn tất

1. Gói bàn giao có giấy phép, không chứa tài liệu khách hàng khác, cấu hình agent nội bộ, đường dẫn máy cá nhân hay bí mật.
2. Hiệu năng tải trang có số đo thật, lưu tệp kết quả trong repo.
3. Trợ năng 12 hành trình có kết quả kiểm: phần tự động chạy trong CI, phần trình đọc màn hình có biên bản người kiểm và ngày.
4. Các màn hình chính có ảnh mốc giao diện trong CI.
5. Mọi cổng CI xanh trên PR; `TRANG_THAI.md` và báo cáo `13_RE_AUDIT_ENTERPRISE_REPORT.md` cập nhật theo số đo mới.

Ngoài phạm vi (lộ trình sau bàn giao): trả nợ UX lint 5.491 điểm, tách 87 tệp > 350 dòng, nâng giao diện Thẻ chào.

## 2. Quyết định của PO (03/11/2026)

| # | Nội dung | Quyết định | Việc liên quan |
|---|---|---|---|
| Q1 | Chủ sở hữu và giấy phép | Công ty Cổ phần Công nghệ Avi Lotus Group; giấy phép độc quyền, bảo lưu mọi quyền | H1-1 |
| Q2 | Hạn bàn giao | 10/11/2026; làm đủ H1–H4 theo lịch mục 8 | Toàn bộ |
| Q3 | Kiểm bằng trình đọc màn hình | Không thực hiện trong đợt này; biên bản ghi "Chưa kiểm" | H3-3 |
| Q4 | 4 tài liệu hướng dẫn agent trong `docs/` | Loại khỏi gói bàn giao | H1-3 |
| Q5 | Tệp Excel `*_ALG*.xlsx` trong `docs/Nhập liệu/` | Loại khỏi gói bàn giao | H1-5 |

## 3. H1 — Pháp lý và gói bàn giao (0,5 ngày)

- [x] **H1-1** Tệp `LICENSE` ở gốc repo (song ngữ Việt–Anh) theo Q1; `package.json` có `"license": "UNLICENSED"` (gói `private`, không phát hành npm).
- [ ] **H1-2** Gói bàn giao dựng bằng `git archive` từ tag `handover-<yyyy-mm-dd>` trên `main`. Gói không kèm lịch sử git, nên tài liệu ALG/Avi Florist (đã gỡ khỏi cây thư mục, còn trong lịch sử) không có trong gói. Kiểm: `npm run handover:check <tag>` xanh (chặn cấu hình và tài liệu agent, tệp mang tên khách hàng khác, đường dẫn `file://` tới máy cá nhân — luật ở `scripts/handover-rules.mjs`, test `scripts/handover-rules.test.ts`); không có `.env`; quét bí mật bằng job `security` (gitleaks) của CI; ghi SHA-256 của gói.
- [x] **H1-3** 4 tài liệu agent loại khỏi gói theo Q4 (`.gitattributes` `export-ignore`); `handover:check` chặn thay vì cảnh báo.
- [x] **H1-4** Liên kết `file://` tuyệt đối tới máy cá nhân trong `docs/` (215 liên kết, 22 tệp): 213 đổi thành liên kết tương đối, 2 liên kết tới tệp không còn trong repo giữ lại văn bản. Kiểm: `handover:check` không còn mục "đường dẫn máy cá nhân"; `npm run check:docs` xanh.
- [x] **H1-5** 2 tệp Excel ALG trong `docs/Nhập liệu/` loại khỏi gói theo Q5 (`export-ignore`); không mã nào tham chiếu tới hai tệp này.

## 4. H2 — Hiệu năng tải trang (1 ngày)

- [x] **H2-1** Script `scripts/measure-web-vitals.ts` đo bằng Playwright và `PerformanceObserver` của Chromium — không thêm thư viện. Đo LCP, CLS, TBT; INP qua Event Timing với một tương tác chuẩn mỗi tuyến. Hai cấu hình: di động (390×844, CPU chậm 4×, mạng 4G mô phỏng qua CDP) và máy tính (1280×800). Mỗi tuyến 3 lần, lấy trung vị.
- [x] **H2-2** Đo 6 tuyến của `12_PERFORMANCE_REPORT.md` (`/`, `/san-pham`, `/dieu-phoi`, `/so-lieu`, `/b/[sendCode]`, `/van-hanh`) trên bản build production, database đã seed. Lưu JSON vào `docs/audit/ui-architecture-audit/perf/<ngày>/`; cập nhật báo cáo với số đo và đường dẫn tệp. Số liệu ghi là số đo phòng thí nghiệm (lab), không phải số đo người dùng thật.
- [x] **H2-3** Tuyến vượt ngưỡng (LCP > 2,5 s, CLS > 0,1, INP > 200 ms): sửa trong đợt này nếu nguyên nhân rõ và sửa ≤ 0,5 ngày; còn lại ghi vào lộ trình kèm số đo. Kết quả 04/11: 6/6 tuyến đạt LCP, CLS, INP sau khi `/san-pham` render trang đầu phía máy chủ (5,3 s → 1,72 s, `12_PERFORMANCE_REPORT.md` §2).

## 5. H3 — Trợ năng 12 hành trình (2–4 ngày)

- [x] **H3-1** `tests/e2e/ux/a11y-journeys.spec.ts`: 12 hành trình của `docs/design-system/accessibility-audit-12-journeys.md`, mỗi hành trình chạy:
  - quét axe theo WCAG 2.2 AA, chặn mọi vi phạm `critical`/`serious`;
  - chỉ bàn phím: đi hết phần tử tương tác bằng `Tab`, mỗi phần tử có vòng tiêu điểm nhìn thấy và không bị header/thanh đáy che (2.4.7, 2.4.11);
  - phóng 200%: không cuộn ngang (1.4.4, 1.4.10);
  - `prefers-reduced-motion: reduce`: không còn hiệu ứng chạy (2.3.3);
  - tương phản trên 3 preset `moc-lan`, `modern-slate`, `pure-swiss`, chế độ sáng và tối.
  Tuyến cần dữ liệu (`/b/[sendCode]`, `/c/[slug]`, `/g/[id]`, `/subcontract/[orderCode]`) lấy mã từ dữ liệu seed; thiếu dữ liệu thì bổ sung vào seed E2E, không dùng dữ liệu giả trong mã sản phẩm.
- [x] **H3-2** Sửa lỗi `critical`/`serious` mà H3-1 tìm ra, trong khung 1 ngày; lỗi còn lại ghi vào lộ trình kèm mức độ và tuyến.
- [ ] **H3-3** Kiểm trình đọc màn hình theo Q3: phiếu kiểm từng hành trình (nhãn nút, thứ tự đọc, thông báo trạng thái, lỗi biểu mẫu) do người kiểm điền trên VoiceOver và NVDA.
- [x] **H3-4** Điền bảng kết quả của `accessibility-audit-12-journeys.md`: từng hành trình, từng phép kiểm, người kiểm, ngày, tệp kết quả (báo cáo Playwright, phiếu kiểm). Phép chưa kiểm ghi "Chưa kiểm".

## 6. H4 — Ảnh mốc giao diện (2–3 ngày)

- [x] **H4-1** `tests/e2e/ux/visual-journeys.spec.ts`: 11 màn chính của 12 hành trình (`/dang-nhap`, `/`, `/san-pham`, `/san-pham/tao-moi`, `/don-hang`, `/khach-hang`, `/dieu-phoi`, `/so-lieu`, `/cai-dat`, `/uu-dai`, `/van-hanh`), khổ 390 và 1280. Ổn định bằng tổ chức và người dùng tên cố định, dữ liệu rỗng, đồng hồ trình duyệt cố định, tắt chuyển động. Trang công khai có dữ liệu chờ seed như H3-1.
- [x] **H4-2** Sinh ảnh mốc Linux (khớp runner CI — đã xác nhận ở PR #107); CI xác nhận trên PR.
- [ ] **H4-3** Ảnh mốc `-darwin` (gồm `/vai-tro`): người dùng máy Mac chạy `npx playwright test tests/e2e/ux/visual.spec.ts --update-snapshots` và commit.

## 7. H5 — Đóng đợt

- [x] **H5-1** Chạy đủ cổng của `CLAUDE.md`, gồm `test:e2e:ux`; mở PR vào `main`; CI xanh.
- [x] **H5-2** Cập nhật `13_RE_AUDIT_ENTERPRISE_REPORT.md` (miền F, G; chỉ số K7–K9), `12_PERFORMANCE_REPORT.md`, `TRANG_THAI.md` §6.
- [x] **H5-3** Dựng gói bàn giao cuối theo H1-2 từ `main` sau khi PR hợp nhất; bàn giao kèm SHA-256 và danh sách phần còn trong lộ trình.

## 7a. Tích hợp đợt giảm nợ UI của nhánh Enterprise (04/11/2026)

Nhánh `Hoan_Thien_Kien_Truc_He_Thong_UI_UX_Tieu_Chuan_Enterprise` có 6 commit giảm nợ UI (`45479a96` … `4e9f9876`, 362 tệp) dựng trên nền trước PR #107. Đợt này đưa phần đúng vào `main` qua nhánh thực thi:

- [x] **I-1** Hợp nhất, giải 20 xung đột giữ các bản sửa của PR #107 (`PageHeader`/`ToolHero`, `<h1>` trang công khai, UI Studio chỉ khi shell có gắn, tuyến báo giá `bg/[token]`).
- [x] **I-2** Không nhận thay đổi ở vùng PO khoá khi chưa có biên bản duyệt: 53 tệp Catalog, 1 tệp Thẻ chào (`subcontract/[orderCode]`), `FeatureGuidanceCard` (K1).
- [x] **I-3** 191 chỗ `<div role="button|menuitem…" tabIndex onKeyDown>` trả về `<button type="button">` (giữ `disabled` khi `tabIndex` có điều kiện); 6 tệp đổi radio thành nút bấm: 5 tệp giữ bản `main`, `campaign-create-modal.tsx` dùng `RadioGroup`. R18 bắt cả phần tử gắn `role` điều khiển (test trong `rules-enterprise.test.ts`); `AGENT_RULES.md` §14 #20.
- [x] **I-4** 8 tệp > 350 dòng bị phình giữ bản `main`. Baseline UX lint 5.491 → 3.945 (gồm 45 điểm R18 mới bắt trên mã có sẵn).
- [x] **I-5** Hàng nút đầu trang `/san-pham` xuống dòng ở khổ 390 thay vì bị cắt. 5 vùng có `div role="button"` chứa điều khiển lồng nhau: vùng tải ảnh (`auto-generate-panel`, `photo-upload-panel`) là `<button>` với ô chọn tệp tách ra ngoài; thẻ chọn tính năng (`optimization-mode-selector`) là `<label>` của ô chọn; thẻ ngành (`industry-select-section`) và thẻ bài lên lịch (`schedule-post-item-card`) dùng nút chính phủ cả thẻ, điều khiển phụ nằm trên lớp phủ.

## 7b. Tích hợp đợt giảm nợ UI thứ hai của nhánh Enterprise (05/11/2026)

Nhánh có thêm 4 commit (`06a9821a` Creative Studio, `85b80546`, `5a3353c2`, `c40c1a26` Thẻ chào) dựng trên nền `4e9f9876`, chưa có các bản sửa của PR #107/#109. Rà soát 05/11: không merge nguyên trạng (lặp lỗi §14 #18, #20; xem #21). PO 05/11/2026 duyệt: dựng lại phần đúng trên nền `main`; Creative Studio chỉ sửa giao diện, không đổi luồng 14 chặng, API hay nghiệp vụ; Thẻ chào được nâng giao diện ở PR riêng có E2E.

- [x] **J-1** Creative Studio (nhánh `claude/vibrant-goodall-qpf2wh`): nhận phần tách tệp và token của `06a9821a`, áp lại thay đổi của `main` (icon theo module, nhãn và cỡ nút ở cài đặt nhà cung cấp). Sửa thêm: 12 `div role="button|radio"` → `Button`/`RadioGroup`; nhóm chọn khung ảnh dùng `aria-pressed` (nhánh làm mất `aria-selected`); mã màu cứng → token; khôi phục các dòng gợi ý bị cắt (gồm phí credit khi xuất 2×); bỏ `useEffect` đồng bộ trạng thái thừa; `use-package-workspace.ts` 539 → 308 dòng (tách `package-workspace-model.ts`, `use-package-sources.ts`, `use-post-rewrite.ts`, `use-video-ratio.ts`); gộp 3 bản `postJson` vào `revise-client.ts`; ngày giờ qua `formatDateTime`. Test mới: `tests/unit/creative-studio/package-workspace-model.test.ts`, `revise-client.test.ts`.
- [x] **J-2** Thẻ chào (PR #122, nhánh `claude/the-chao-ui-j2`; PO duyệt 05/11/2026, chỉ giao diện): làm trên bản `main` hiện hành của từng tệp, không lấy commit của nhánh Enterprise. J-2.1 token cũ R17 689 → 0 (bí danh tương đương, không đổi hiển thị). J-2.2 27 overlay tự chế → `Dialog`/`Drawer`/`BottomSheet`/`DropdownMenu`; không đóng được khi đang gửi. J-2.3 443 điều khiển thô → `Input`/`Textarea`/`Checkbox`/`RadioGroup`/`NativeSelect`/`Button` (nút không ghi `type` giữ `type="submit"`; chip có nền giữ màu nền khi rê chuột). J-2.4 R23 96 → 0 (`motion-reduce`), R13 9 `window.confirm` → `useConfirmDialog`, R15 6 `<details>` → `Disclosure`, R21 9 cỡ chữ → thang hệ thống, `branch-portal` dùng `PageHeader`. Còn lại có lý do (32 điểm): `<h1>` trang khách công khai (7, như quyết định PO 03/11), R14 trạng thái bước quy trình (6, không phải trạng thái tác vụ — đổi phép so sánh chỉ để né lint), R1 màu vai trò nhãn nhân sự và thẻ kanban (9, cần quyết định bảng màu), 10 ô `input` đặc biệt (thanh trượt, kiểu động, ô bẫy chống bot). Mốc `the-chao-freeze` cập nhật kèm ngày duyệt. Chưa kiểm tay trên app thật: CI `e2e-ux` là kiểm tự động.

## 8. Lịch thực hiện

| Ngày | Việc |
|---|---|
| 03–04/11 | H1; H2-1, H2-2 |
| 05/11 | H2-3; H3-1 |
| 06/11 | H3-1 (tiếp), H4-1 |
| 09/11 | H3-2, H4-2, H3-4; H5-1, H5-2 |
| 10/11 | Hợp nhất PR; H5-3 dựng gói và bàn giao |

## 9. Bảng theo dõi

| Việc | Trạng thái | Commit | Cổng đã chạy | Ghi chú |
|---|---|---|---|---|
| H1-1 | Xong | `git log --grep "H1-1"` | `npm test`, `check:docs` | |
| H1-2 | Chưa làm | | | |
| H1-3 | Xong | `git log --grep "H1-3"` | `handover:check`, `npm test` | |
| H1-4 | Xong | `git log --grep "H1-3"` | `check:docs`, `handover:check` | Cùng commit với H1-3 |
| H1-5 | Xong | `git log --grep "H1-3"` | `handover:check` | Cùng commit với H1-3 |
| H2-1 | Xong | `git log --grep "H2-1"` | typecheck, ESLint | |
| H2-2 | Xong | `git log --grep "H2-2"` | build | 5/6 tuyến; `/b/[sendCode]` chờ seed |
| H2-3 | Xong | `git log --grep "H2-2"` | — | `/san-pham` LCP vào lộ trình |
| H3-1 | Xong | `git log --grep "H3-1"` | `test:e2e:ux` 23/23 | Trang công khai Thẻ chào và gia công mới kiểm trạng thái không tìm thấy |
| H3-2 | Xong | `git log --grep "H3-2"` | `test:e2e:ux`, typecheck, lint | 6 tuyến có lỗi đã sửa hết |
| H3-3 | Không thực hiện | | | Theo Q3 |
| H3-4 | Xong | `git log --grep "H3-4"` | `check:docs` | Trình đọc màn hình: Chưa kiểm |
| H4-1 | Xong | `git log --grep "H4-1"` | `test:e2e:ux` | Ổn định qua 3 lần chạy |
| H4-2 | Xong | `git log --grep "H4-1"` | `test:e2e:ux` | 22 ảnh `-linux` |
| H4-3 | Chưa làm | | | Cần máy Mac |
| H5-1 | Xong | PR #112 (`7dce8e53`) | CI `main`: web, worker, e2e-ux, security, industry-terms, CodeQL, deploy — đạt | |
| H5-2 | Xong | `git log --grep "H5-2"` | `check:docs` | |
| H5-3 | Xong | `7dce8e53` | `handover:check origin/main` (6.548 mục) | `smeos-handover-2026-11-04-7dce8e53.tar.gz`, SHA-256 `2d4ad3359181452c5836e5bc706b10783f324ad66491cbc36c95668618813107` |

## 10. Rủi ro và kiểm soát

| # | Rủi ro | Mức | Kiểm soát |
|---|---|---|---|
| R1 | Không kiểm bằng trình đọc màn hình (Q3) | Cao | Biên bản ghi "Chưa kiểm"; phần tự động (H3-1) làm bằng chứng; phiếu kiểm để sẵn cho đợt sau |
| R2 | Số đo hiệu năng trong môi trường sandbox khác thiết bị thật | Trung bình | Ghi rõ là số đo lab, nêu cấu hình mô phỏng; lặp lại trên máy chủ staging khi có |
| R3 | Seed thiếu dữ liệu cho tuyến công khai cần mã/token | Trung bình | Bổ sung seed E2E; không thêm dữ liệu giả vào mã sản phẩm |
| R4 | Ảnh mốc mới chập chờn do dữ liệu/thời gian | Trung bình | Dữ liệu và thời gian cố định, che vùng động, ngưỡng 5% như hiện hành |
| R5 | H3-1 phát hiện nhiều lỗi hơn khung sửa 1 ngày | Trung bình | Sửa `critical` trước; phần còn lại ghi vào lộ trình kèm tuyến và mức độ, không che bằng allowlist |
| R6 | Liên kết `file://` trỏ tới tệp không còn | Thấp | Bỏ phần đường dẫn, giữ văn bản liên kết; `handover:check` chặn tái phát |
