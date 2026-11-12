# Kế hoạch thực thi — Nâng cấp kiến trúc UX Progressive Disclosure & Enterprise

> Trạng thái: **ĐÃ DUYỆT** (PO, 29/10/2026) · Nhánh: `NangcapkientrucUX_progressiveDisclosure`
> Chuẩn: `docs/dac-ta/03a-ux-constitution.md` + `docs/dac-ta/03c-ux-progressive-disclosure.md` · Pattern: `docs/dac-ta/ux-patterns/`
> Đánh giá gốc: `docs/ui-ux/PROGRESSIVE_DISCLOSURE_KIT_ASSESSMENT.md`

## 0. Nguyên tắc thực thi
- **Không vẽ lại giao diện thị giác.** Preset `moc-lan`/`modern-slate`/`pure-swiss`, token, `FeatureGuidanceCard`, `TabActionHeader` giữ nguyên.
- **Chỉ ánh xạ ở tầng UI.** Không đổi giá trị trạng thái trong schema/API.
- **Mỗi bước một PR**, không tăng baseline lint, không có lỗi gate mới so với `main` (CLAUDE.md DoD).
- **Cờ tính năng** cho mọi màn nâng cấp (E9) — tắt được theo tổ chức.
- Mục ghi **[PO]** phải dừng lại xin duyệt trước khi làm.

## Giai đoạn 0 — Chuẩn & tài liệu ✅ (nhánh này)
| Việc | Đầu ra | Trạng thái |
|---|---|---|
| Phán quyết PD1–PD4, UX-015…026, R13–R16, DoD | `docs/dac-ta/03c-ux-progressive-disclosure.md` | Xong |
| Thư viện pattern P01–P12, từ điển, sổ ngoại lệ | `docs/dac-ta/ux-patterns/` | Xong |
| Screen Contract thêm §15 | `docs/dac-ta/screen-contracts/_TEMPLATE.md` | Xong |
| Trỏ 03a §0.2 sang 03c; REGISTRY | `03a`, `00-DOCUMENTATION-REGISTRY.yaml` | Xong |
| Lưu trữ bộ kit gốc | `docs/archive/historical/SMEOS_UX_Progressive_Disclosure_Kit/` | Xong |

**Exit gate:** `npm run check:docs` xanh.

## Giai đoạn 1 — Audit toàn bộ (chỉ đọc, ~84 màn `page.tsx`)
| Việc | Đầu ra |
|---|---|
| 1.1 Inventory màn × pattern × component đang dùng | `docs/ui-ux/PD_AUDIT_INVENTORY.md` |
| 1.2 Bảng phân tầng L0–L4/SYS cho trường/nút chính từng màn | §15 trong Screen Contract của màn đã có; màn chưa có → danh sách cần tạo |
| 1.3 Gắn mức rủi ro R1–R3 cho mọi hành động có hậu quả; liệt kê 28 điểm `confirm()` trong 25 tệp | Issue register |
| 1.4 Liệt kê giá trị trạng thái tác vụ theo từng API/worker → bảng ánh xạ | Đầu vào cho `task-state.ts` |
| 1.5 Kiểm tra E5: khóa `localStorage`/cache không gắn tổ chức (bắt đầu từ `smeos_ui_config`) | Issue register (P0 nếu rò chéo tổ chức) |
| 1.6 Baseline: lint:ux, axe trên luồng cốt lõi, web-vitals nếu đo được | Số liệu nền |
| 1.7 Xếp hạng màn: P0/P1/P2 + đề xuất thứ tự rollout | Báo cáo audit |

**Exit gate:** báo cáo có bằng chứng file/line; **[PO]** duyệt thứ tự rollout.

## Giai đoạn 2 — Nền tảng component & công cụ (không đổi màn nào)
| Việc | Tệp | Test |
|---|---|---|
| 2.1 Máy trạng thái + hàm ánh xạ backend→UI | `src/lib/ui-system/task-state.ts` | Unit: mọi giá trị backend từ 1.4 |
| 2.2 `TaskStatus` | `src/components/ui/task-status.tsx` | Unit + `aria-live` |
| 2.3 `ConfirmDialog` (dựa `dialog.tsx`) | `src/components/ui/confirm-dialog.tsx` | Unit: Esc, focus, chống bấm kép |
| 2.4 `Disclosure` | `src/components/ui/disclosure.tsx` | Unit: bàn phím, giữ giá trị |
| 2.5 `ResultPanel` | `src/components/ui/result-panel.tsx` | Unit |
| 2.6 `EntitlementGate`, `CostPreview` (P11, P12) | `src/components/ui/` | Unit; dữ liệu quota/capability lấy từ API sẵn có |
| 2.7 Lint R13–R16 dạng ratchet, khóa baseline | `scripts/ux-lint.ts` | Unit cho từng luật |
| 2.8 axe trong E2E luồng cốt lõi (E8, PO V5) | `tests/e2e/` | Mở rộng `tests/e2e/ux/a11y.spec.ts` (đã có `@axe-core/playwright`) |
| 2.9 Cờ tính năng theo tổ chức (E9) | `platform_settings` khóa `ux_rollout_flags` (§V4) | Unit: off/allowlist/all, cô lập tổ chức |
| 2.10 Sửa sớm A01 (tiến độ giả ở `/video`) | `src/components/video-studio/video-rendering-progress.tsx` | Unit |

**Exit gate:** typecheck, lint:ratchet, lint:ux --check, `npm test` xanh; không đổi API public component cũ.

## Phán quyết PO vòng 2 (29/10/2026)

| # | Phán quyết | Áp dụng |
|---|---|---|
| V1 | **Rollout theo trạng thái công cụ** trong `src/modules/toolkit/domain/toolkit-catalog.ts`: **Hoàn thiện (DONE) trước, Đang phát triển (IN_PROGRESS) sau**; ưu tiên tốc độ đưa vào sử dụng | Giai đoạn 3–4 dưới đây |
| V2 | Công cụ #00 "Chế tác tự động trọn gói" (`/creative-studio`, hành trình 14 chặng) chuyển **DONE → IN_PROGRESS** ("Đang hoàn thiện", 80%) | Đã sửa trong `toolkit-catalog.ts` |
| V3 | Chặng nào chạy trong pilot/rollout: agent quyết theo tính chất từng chặng | Bảng §V3 |
| V4 | Cờ tính năng: phương án tối ưu đạt chuẩn enterprise | §V4 |
| V5 | Mở rộng axe (`@axe-core/playwright` đã có) ra luồng cốt lõi | Giai đoạn 2.8 |

### §V3. Quyết định theo tính chất từng chặng (journey `docs/dac-ta/ALG_CREATIVE_STUDIO_JOURNEY.md`)

| Chặng | Tính chất | Rủi ro | Pattern | Quyết định |
|---|---|---|---|---|
| 01 BRING | Tải ảnh, lưu kho, kiểm tra file | R1 | P01, SYS | **Chạy** trong pilot và mọi công cụ ảnh DONE |
| 02 UNDERSTAND | Vision AI bóc tách, người dùng sửa được | R2 (tốn lượt) | P02, P12 | **Chạy** — thêm xem trước lượt |
| 03 DISCOVER · 04 IDEATE · 05 CHOOSE | Phân tích thị trường, chọn chủ đề, kịch bản (tốn lượt) | R2 | P02, P03, P12 | **Hoãn** — chỉ có trong Creative Studio (đang hoàn thiện) |
| 06a–06d (tạo nội dung/âm thanh/ảnh/video) | Tác vụ nền tạo kết quả | R2 | P01, P04, P05, P12 | **Chạy** phần tương đương trong công cụ DONE (#01, #02, #05: bước "Tạo ảnh"); phần trong Creative Studio hoãn |
| 07 PACKAGE · 08 QA | Gom tài sản, kiểm tra máy chủ | R1–R2 | P05, P06 | **Hoãn** (Creative Studio) |
| 09 APPROVE | Duyệt, ghi nhật ký, khóa gói | R3 | P07, UX-020 | **Hoãn** (Creative Studio) |
| 10 LAUNCH | Đăng/lên lịch ra kênh ngoài | R3 | P07 | **Hoãn** (Lịch đăng đang phát triển) |
| 11–14 SELL · MEASURE · LEARN · NEXT | Chỉ đọc số liệu, gợi ý | R1 | P08 (chưa có số liệu) | **Hoãn**, rủi ro thấp |

→ Pilot chỉ đụng **Chặng 01, 02 và bước tạo ảnh** của công cụ DONE; không đụng luồng 14 chặng.

### §V4. Cờ tính năng — phương án chọn
- Lưu ở bảng `platform_settings` **đã có** (khóa `ux_rollout_flags`), cùng cơ chế với `src/modules/platform/infra/nav-matrix-store.ts` (cache 30 giây, ghi `updated_by` làm vết kiểm toán). **Không đổi `prisma/schema.prisma`, không migration.**
- Mỗi cờ: `off` · `allowlist` (danh sách `organization_id`) · `all`. Đọc ở server qua `requireTenantContext()`; client chỉ nhận kết quả bật/tắt, không nhận danh sách tổ chức.
- Quản trị nền tảng bật/tắt ở Console `/van-hanh` (capability nền tảng); tắt có hiệu lực ≤ 30 giây.
- Lý do chọn: không có rủi ro migration, cô lập tổ chức đúng chuẩn, có vết kiểm toán, rollback tức thì — đạt E9 mà không tăng bề mặt hạ tầng.

## Giai đoạn 3 — Pilot: Tạo ảnh sản phẩm chuyên nghiệp (`/cong-cu/anh-san-pham`, công cụ #01, DONE)
- Lý do chọn: công cụ DONE, đúng nguyên mẫu P01 (tải ảnh → tạo → kết quả), nhỏ (7 tệp, ~980 dòng) nên nhanh; kết quả nhân bản ngay sang #02, #05.
- Phạm vi: Chặng 01 + 02 + bước tạo ảnh (§V3); P01 + P04 + P05 + P06 + P12; tạo Screen Contract (đang thiếu — A07).
- Đo trước/sau (E7): tỷ lệ hoàn thành, bỏ ngang, thời gian hoàn thành, retry, lỗi axe, LCP/INP/CLS.
- Bật bằng cờ `ux_pd_anh_san_pham` cho 1–2 tổ chức thử.

**Exit gate:** acceptance criteria P01 đạt; E2E UX xanh; báo cáo `docs/ui-ux/PD_PILOT_REPORT.md`; **[PO]** quyết rollout / sửa / dừng.

## Giai đoạn 4 — Rollout (mỗi đợt một PR, có cờ)

**Đợt A — công cụ Hoàn thiện (đưa vào dùng sớm nhất)**
1. #02 Bộ ảnh sản phẩm (`/cong-cu/bo-anh-san-pham`) · #05 Poster & banner (`/cong-cu/poster-banner`) — dùng lại kết quả pilot
2. #03 Thẻ chào sản phẩm (`/tai-anh?tab=m01c`)
3. #04 Nội dung bán hàng (`/noi-dung`)
4. #14 Catalog bán hàng theo nhu cầu (`/the-chao?quick=true`)
5. #49 Xu hướng thị trường (`/market-intelligence`)
6. Nền dùng chung mọi công cụ: Cài đặt / Thành viên / Kết nối (R3 → `ConfirmDialog`, A04)

**Đợt B — công cụ Đang phát triển** (áp chuẩn ngay khi phát triển tiếp, theo DoD 03c §9)
1. #06 Video (`/video`) — kèm sửa A01 (đã làm sớm ở Giai đoạn 2)
2. #08 Landing page · #09 Catalog · #12 QR
3. #22 Chiến dịch (`/lich-dang`)
4. #32–#34 Giá nguyên liệu / giá vốn / giá bán (`/san-pham`, `/bao-gia`)
5. #39–#41 Đơn hàng & giao hàng (`/don-hang`)
6. #00 Creative Studio 14 chặng — **cuối cùng**, khi hoàn thiện; áp các chặng đã hoãn ở §V3
7. Nền tảng `/van-hanh/*` và trang công khai

Mỗi đợt: Screen Contract §15 → áp component → xóa vi phạm R13–R15 → hạ baseline lint → E2E + axe → bật cờ dần.

## Giai đoạn 5 — Enterprise bổ sung & quản trị
| Việc | Đề xuất | Ghi chú |
|---|---|---|
| Nhật ký hành động R3 + mã hỗ trợ | E3 / UX-020 | **[PO]** nếu cần bảng audit mới |
| Trung tâm thông báo cho tác vụ nền | E12 / UX-024 | Tận dụng `src/components/notification/` |
| Dữ liệu/kết quả mẫu lần dùng đầu | E11 / UX-023 | |
| Trợ giúp tại chỗ trong `FeatureGuidanceCard` | E13 / UX-025 | Không đổi cấu trúc (K1) |
| Lint R16 theo `glossary.md` | E14 / UX-026 | |
| Bảng điểm UX từng màn trong CI | E15 | **[PO]** — thay đổi CI |
| Quy trình phiên bản component dùng chung | E16 | |
| Lịch audit lại hàng quý | 03c §8, kit §8.6 | |

## Theo dõi
| Giai đoạn | Trạng thái | PR |
|---|---|---|
| 0 Chuẩn & tài liệu | Xong | nhánh `NangcapkientrucUX_progressiveDisclosure` |
| 1 Audit | Xong — `PD_AUDIT_REPORT.md`, `PD_AUDIT_INVENTORY.md`; chờ PO duyệt §7 | nhánh này |
| 2 Nền tảng | Xong phần mã (2.1–2.7, 2.9, 2.10); 2.8 có baseline axe (A15–A18), spec vào CI khi từng màn hết lỗi; trang quản trị cờ ở `/van-hanh` làm đầu Giai đoạn 3 | nhánh này |
| 3 Pilot | Đã triển khai sau cờ `ux_pd_anh_san_pham`; axe 0 lỗi; sửa lỗi hợp đồng API; trang cờ `/van-hanh/cau-hinh`. Chờ PO bật cho tổ chức thật để đo E7 — `PD_PILOT_REPORT.md` | nhánh này |
| 4 Rollout | **Đợt A xong — 7/7 công cụ Hoàn thiện** đạt axe 0 lỗi ở 390px (`a11y-done-tools.spec.ts`). A-1: Tạo ảnh & Bộ ảnh (cờ), Poster. A-2…A-5: Thẻ chào, Nội dung, Catalog theo nhu cầu, Xu hướng thị trường (sửa trợ năng, `ConfirmDialog` cho R2/R3, trạng thái thật). Tiếp theo: đợt B | nhánh này |
| 4b #08–#09 | PO 29/10/2026 chuyển Landing page & Catalog sang Hoàn thiện; áp chuẩn: bỏ bước/khoảng chờ giả, không bịa link khi xuất bản lỗi, báo khi dùng nội dung mẫu, `<h1>`, bỏ mã kỹ thuật; axe 9/9 công cụ Hoàn thiện | nhánh này |
| 5 Enterprise & quản trị | — | — |
