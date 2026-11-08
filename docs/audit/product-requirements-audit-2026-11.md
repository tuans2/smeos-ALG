# Audit Product Requirements — đối chiếu tài liệu ↔ mã nguồn

**Ngày:** 2026-11-06 · **Mốc mã:** `main` @ `6cc0725` · **Loại:** báo cáo rà soát, không đổi mã
**Người đọc:** Product Owner, kiến trúc sư, trưởng nhóm phát triển

Báo cáo này trả lời bốn câu: yêu cầu nào **thiếu**, yêu cầu nào **mâu thuẫn**, yêu cầu nào **chưa triển khai**, và yêu cầu nào **không kiểm chứng được** — đối chiếu với mã thật, không với checklist.

---

## 1. Phạm vi và phương pháp

**Tài liệu đã soát**

| Vai trò | Tệp | Số yêu cầu có mã |
|---|---|---|
| PRD (mục tiêu, phạm vi, FR, NFR, nghiệm thu) | `docs/dac-ta/00-PRD.md` | 0 — FR ở §7 không có mã |
| SRS / yêu cầu kỹ thuật (FR + NFR có mã) | `docs/dac-ta/01-technical-requirements.md` | 141 mã `YC-*` |
| Từ vựng quyền | `docs/dac-ta/02-function-catalog.md` | — |
| Yêu cầu kiến trúc hệ sinh thái | `docs/spec/requirements.md` + `traceability.md` | 93 mã `REQ-*` |
| Tiêu chí nghiệm thu theo pha | `docs/dac-ta/Checklist_Thuc_Thi.md` | 495 ô đã tích · 134 ô chưa tích |
| Kịch bản nghiệm thu chức năng | `docs/nghiem-thu/CHECKLIST_NGHIEM_THU_123_CHUC_NANG.xlsx` | 123 chức năng · 141 bước |
| Trạng thái | `docs/kien-truc/TRANG_THAI.md` §4–6, `BO_TINH_NANG_HIEN_TRANG.md`, `src/lib/feature-catalog.ts` | — |

**Cách kiểm:** đọc mã thật (`src/core/rbac/capability-catalog.ts`, `prisma/schema.prisma`, route `src/app/api/v1/**`, `render.yaml`, `.github/workflows/ci.yml`), quét tự động mã năng lực được dùng/không dùng, so endpoint đặc tả 06 với route thật, đọc tệp Excel nghiệm thu.

**Không làm:** không chạy ứng dụng, không chạy `test:tenant`/`test:platform` (cần Postgres `_test`), không đo hiệu năng. Mục nào chỉ kiểm được bằng chạy thật được ghi **Chưa kiểm chứng**.

---

## 2. Tóm tắt

| Mức | Số finding | Ý nghĩa |
|---|---|---|
| **Critical** | 3 | Giao diện hoặc tài liệu khẳng định một kiểm soát mà mã không có |
| **High** | 11 | Yêu cầu MUST chưa triển khai, hoặc mã đi ngược yêu cầu |
| **Medium** | 10 | Mâu thuẫn tài liệu, yêu cầu thiếu, không kiểm chứng được |
| **Low** | 5 | Lệch con số, tham chiếu gãy, đặt tên |

Ba nhận định chính:

1. **Không có một bộ yêu cầu duy nhất.** Năm hệ mã song song (`YC-*`, `REQ-*`, pha `P*`/ô checklist, 123 chức năng `1.1…`, `feature-catalog` key) không ánh xạ sang nhau. PRD §7 — phần Functional Requirements — không có mã nào, nên không truy vết được tới test.
2. **PRD mô tả sản phẩm cũ.** PRD vẫn là "FloraOS — cửa hàng hoa, repo `floraos-core`", còn mã là smeOS đa ngành 4 tầng với ~20 khối tính năng không có yêu cầu nào trong PRD/SRS (Thẻ chào, Trung tâm Tích hợp, thông báo 4 tầng, đơn đa nguồn, báo giá, gói dịch vụ…).
3. **Trạng thái tài liệu lệch cả hai chiều.** Có yêu cầu đã làm nhưng checklist chưa tích (P21, P22, `YC-J10`), và có yêu cầu được ghi "xong/available" nhưng mã không có (tìm kiếm ngữ nghĩa, tự duyệt `O7`, vòng học M11).

---

## 3. Findings

Mỗi finding có mã `PRA-xx`. Bằng chứng ghi dạng `tệp:dòng` tại mốc `6cc0725`.

### 3.1 Critical

**PRA-01 · Công tắc "Tự duyệt theo thời hạn" là giao diện giả** — `YC-C3`, `YC-C4`, `YC-C5`, D11
- Bằng chứng: `src/app/(app)/lich-dang/page.tsx:46` giữ trạng thái bằng `useState(false)`; `:515-518` bật/tắt chỉ đổi state cục bộ — không API, không lưu, không ghi `audit_logs`. Tab "Tự Duyệt" (`:388`) hiện cho mọi người dùng vào được trang, trong khi `src/components/templates/social-publishing/auto-approve-panel.tsx:27` ghi "chỉ ai có quyền Điều hành mới thấy và cấu hình được". Mã năng lực `O7` không tồn tại trong `capability-catalog.ts`.
- Tác động: người dùng tin rằng đã bật/tắt một kiểm soát xuất bản; F5 là mất. Vi phạm luật sản phẩm 3 (không đầu ra AI nào tự thành dữ liệu chính thức nếu không qua kiểm soát có trách nhiệm).
- Khắc phục: ẩn tab tới khi có mã thật, **hoặc** làm đủ: mã `O7` trần cứng Điều hành, lưu ở `organizations.settings`, ghi `audit_logs` với người bật là người chịu trách nhiệm, test khoá "tắt ⇒ hết hạn quay về hàng chờ".

**PRA-02 · `feature-catalog` gác tính năng bằng 7 mã năng lực không tồn tại** — `YC-Q6`, `YC-Q7`, PRD §7.2
- Bằng chứng: `src/lib/feature-catalog.ts:279-340` (`P1`/`P2`), `:484-515` (`O1`/`O3`), mục `learning.pattern` (`S2`/`S4`), cộng `S1`. Quét `capability-catalog.ts`: không có `O*`, `P1`, `P2`, `S*`. `isCapabilityCode()` trả `false` cho cả 7 mã.
- Tác động: cặp tách "sinh ↔ duyệt" mà PRD §7.2 bắt buộc cho creative, content, học không có trong RBAC. Nơi nào gọi `requireCapability` với các mã này sẽ ném lỗi hoặc từ chối hết.
- Khắc phục: PO chốt mã thật cho từng cặp (xem PRA-05), sửa `feature-catalog.ts`, thêm test kiến trúc: mọi `rbacRun`/`rbacApprove` phải là `isCapabilityCode`.

**PRA-03 · Xuất danh sách khách hàng không gác bằng trần cứng `Q5`** — `YC-K6`
- Bằng chứng: `src/app/api/v1/crm/customers/export/route.ts:23` gọi `requireCapability(ctx, "R13")`; `R13` (`capability-catalog.ts:245`) **không có trần cứng** và mặc định cấp cho `ke_toan`. `Q5` (`:270`, trần cứng Điều hành) không được route nào dùng. Chú thích đầu tệp (`:10`) vẫn ghi "Q1 hoặc Q5".
- Tác động: Điều hành cấp được quyền xuất toàn bộ dữ liệu cá nhân khách hàng cho vai khác, trái `YC-K6` và trần cứng là điểm "không vai nào vượt được". Có ghi `recordDataExport` (phần audit đạt).
- Khắc phục: PO chọn một trong hai — (a) quay về `Q5` trần cứng, (b) sửa `YC-K6` theo quyết định 14/10/2026 và ghi lý do vào sổ quyết định. Sửa chú thích route.

### 3.2 High — yêu cầu MUST chưa triển khai hoặc đi ngược

| Mã | Yêu cầu | Hiện trạng trong mã | Bằng chứng |
|---|---|---|---|
| **PRA-04** | `YC-V1` consent dữ liệu huấn luyện cấp tổ chức, "sẵn sàng trước go-live" | Không có cột/bảng/route nào. `ai_policies` chỉ có `privacy_floor` | `prisma/schema.prisma` (`grep -i train` = 0) |
| **PRA-05** | Cặp tách bắt buộc PRD §7.2 (8 cặp) / đặc tả 02 §5 (9 cặp) | `SPLIT_CAPABILITY_PAIRS` chỉ có **6** cặp; `video.generate↔video.approve`, `creative.compose↔creative.approve`, `content.generate↔content.approve` không có. Content dùng `I1` (`media.optimize`) để sinh và `J5` (`social.publish`) để duyệt | `capability-catalog.ts:333-343`; `api/v1/content-engine/generations/route.ts:40`, `[id]/approve/route.ts:16` |
| **PRA-06** | `YC-K5` luồng xoá theo yêu cầu của chính khách hàng cuối; tiêu chí "Dữ liệu cá nhân" PRD §11 | Chỉ có xoá do tổ chức thực hiện (`Q4`). Không có luồng chủ thể dữ liệu. D13 vẫn mở | `api/v1/crm/customers/[id]/route.ts:46` |
| **PRA-07** | `YC-K2` + checklist P21: `customer_consents` **chèn-chỉ**, rút lại là một dòng mới | Bảng có `@@unique([customer_id, channel])`, `revoked_at`, `updated_at` ⇒ ghi đè tại chỗ, mất lịch sử đồng ý | `schema.prisma:2194-2209` |
| **PRA-08** | M11 học: `learning_profiles`, `YC-L3`, `YC-L4`, `YC-L6`; tiêu chí "Học" PRD §11 | Không có bảng `learning_profiles`; route `/learning-profile`, `/integration/learning-profile`, `/analytics/*` là **CHƯA XÂY** trong đặc tả 06 | `schema.prisma` (149 model, không có); `06-api-specification.md` |
| **PRA-09** | `YC-L1`/`YC-L5` số liệu nội dung mang cột nguồn và cờ kế thừa | `content_metrics` không có `source`, không có `is_legacy` | `schema.prisma:1429` |
| **PRA-10** | AI-3, `YC-E7`, `YC-E9` tri thức `knowledge_chunks` + `pgvector`; M03 tìm kiếm ngữ nghĩa | Không có bảng `knowledge_chunks`, không có cột vector, `EmbeddingProvider` không có adapter nào dùng. Nhưng `feature-catalog` ghi `search.semantic` = `available` | `src/core/ports/embedding-provider.ts`; `feature-catalog.ts:718` |
| **PRA-11** | `YC-M9` chi phí video trong dải 0,05–5 USD, chặn tại điểm tạo | Chỉ tính credit (`calculateVideoCreditCost`), không ước lượng USD, không chặn theo dải | `src/modules/video-studio/domain/video-pricing-guard.ts` |
| **PRA-12** | `YC-M8` watermark và thư viện nền cấu hình cấp tổ chức, gác bằng `P5` + `I4` | `P5` không tồn tại; `creative.watermark` = `coming_soon`; bối cảnh nền là hằng chung (checklist P16 tự ghi "chưa có mã") | `feature-catalog.ts`; `Checklist_Thuc_Thi.md:327-329` |
| **PRA-13** | `YC-H3`/`YC-H4`: `T4` gác chuyển người thật, `T3` trần cứng bật/tắt trả lời tự động | Trong mã `T3` = `chat.order.create` (không trần cứng), `T4` = `chat.config.manage`. Nghĩa mã lệch hoàn toàn so với SRS | `capability-catalog.ts:278-279` |
| **PRA-14** | `YC-G14` engine ngoài đọc chính sách AI qua Integration API | `GET /integration/ai-policy` và `/integration/ai-requests` **CHƯA XÂY** | `06-api-specification.md:363` |

### 3.3 Medium — mâu thuẫn, thiếu yêu cầu, không kiểm chứng được

**PRA-15 · PRD mô tả sản phẩm và phạm vi đã cũ.** `00-PRD.md:3-4` "FloraOS SaaS — cửa hàng hoa", repo `floraos-core`; mã là `smeos` với 7 Industry Plugin (`src/modules/organization/domain/industries/`) và mô hình 4 tầng (`CONTEXT.md` §2). PRD không có yêu cầu nào cho đa ngành, 4 tầng governance, ChainOS/`organization_links`.

**PRA-16 · Phạm vi "Trong / Ngoài" mâu thuẫn với mã.**
- `00-PRD.md:52` M05 Landing Page thuộc `LocalBudd`, M07 thuộc `SocialFlow` — nhưng core có `src/modules/landing-page/`, `content-engine/`, `/landing-page`, `/lich-dang`, bảng `landing_pages`, `content_generations`.
- `00-PRD.md:55` và `01-technical-requirements.md` §21 "Thanh toán và xuất hoá đơn: ngoài phạm vi" — mã có `subscriptions`, `subscription_invoices`, `order_payments`, `credit_transactions`, SePay (`api/v1/billing/sepay`, `public/payments/sepay`).
- `01-technical-requirements.md:15` "Không thêm Redis" — `render.yaml:79-85` khai `smeos-redis` (dùng cho rate-limit, `src/core/cache/redis-client.ts`).
- Khắc phục: PO viết lại §4 PRD và §1, §21 của 01 theo phạm vi thật.

**PRA-17 · Tính năng có trong mã nhưng không có yêu cầu (thiếu FR + AC).** Không có `YC-*`, không có tiêu chí nghiệm thu trong PRD cho: Thẻ chào / brochure (module lớn nhất, 15 bảng `greeting_*`), Trung tâm Tích hợp + kênh bán (`integration_*`, `sales_channel_*`), thông báo 4 tầng (7 bảng `notification_*`), đơn đa nguồn + lead + duyệt giao trước (`leads`, `order_approval_requests`), báo giá (`quotations*`), Market Intelligence, chat nội bộ, SSO, gói dịch vụ/entitlement, marketplace đối tác, tên miền riêng, Kho dữ liệu v2 (thùng rác, legal hold), i18n. Một số có đặc tả kiến trúc (`20-`, `21-`, `22-*.md`, `NOTIFICATION_SYSTEM_ARCHITECTURE.md`) nhưng **0 mã yêu cầu** và gần như không có mục nghiệm thu.

**PRA-18 · `docs/spec/` là bộ yêu cầu mồ côi, mâu thuẫn kiến trúc thật.**
- Không có trong `00-DOCUMENTATION-REGISTRY.yaml`. Mô tả Mother Monorepo `apps/` `modules/` `packages/` (`00-overview.md`), mã không có các thư mục đó.
- `traceability.md`: 3/93 yêu cầu DONE, 90 TODO — kể cả những mục đã có bằng chứng (`check:layers` chạy trong CI cho `REQ-ARCH-003/009`, `test:tenant` cho `REQ-SEC-005`, `npm audit` cho `REQ-SEC-007`).
- Tự mâu thuẫn: `00-overview.md:51` "ADR-D1 CHƯA chốt", `requirements.md:113` "ADR-D3 chưa chốt" — cả hai đã chốt 25/10/2026.
- ADR-D3 hứa "cấu hình Database URL riêng theo tenant" — không có mã nào hỗ trợ.
- Mother Connector (`REQ-CON-*`, outbox sự kiện, Ingestion API) chưa có một dòng mã; chỉ có `docs/spec/contracts/event-envelope.schema.json`.
- Khắc phục: PO quyết định `docs/spec/` là định hướng dài hạn (đánh dấu `DRAFT`/`TARGET`, đăng ký vào registry) hay lưu trữ.

**PRA-19 · Ba nơi cùng nhận là nguồn sự thật của trạng thái.** `docs/dac-ta/README.md:28` "trạng thái chỉ có ở `BO_TINH_NANG_HIEN_TRANG.md`"; chính tệp đó tự ghi là ảnh chụp lịch sử 11/09, OSOT là `TRANG_THAI.md`; `CONTEXT.md:65` trỏ `BO_TINH_NANG_HIEN_TRANG.md` + `production-feature-map/`. Thêm `feature-catalog.ts` mang `status` riêng.

**PRA-20 · `feature-catalog` lệch trạng thái thật.** 29/46 mục `coming_soon`, gồm cả 6 khuôn video (`:385…`) trong khi checklist ghi "P17 M04c — HOÀN TẤT 09/16" và có `video_jobs`, `video-studio`; `landing.generate` = `coming_soon` (`:686`) trong khi `/api/v1/content-engine/landing-generate` đang chạy. Ngược lại `search.semantic` = `available` mà không có mã (PRA-10).

**PRA-21 · Checklist nghiệm thu trễ hơn mã (chiều "đã làm, chưa tích").** Ví dụ đã kiểm:
- `YC-J10` (`Checklist_Thuc_Thi.md:127` chưa tích, ghi "chưa gắn cron thật") — `render.yaml:302` cron `smeos-cron-dispatch-sweep` đã dọn job treo.
- P22 `YC-W1` (3 trục `status`/`production_status`/`delivery_status` có ở `model orders`), `YC-W5` (`pricing_rule_ref`), `YC-W6` (`cancel-order.ts:24-69`: `R6` + lý do + audit) — cả nhóm `:420-428` chưa tích.
- P21 `YC-K1` (`customers`, `customer_consents`… có `organization_id` + index) — chưa tích.
- P25b/c (`:650-667`) — `manage-credits.ts`, `create-organization.ts`, `request-organization-upgrade.ts` đã có.
- Khắc phục: một lượt tích lại có bằng chứng `tệp:dòng`/test cho từng ô; ô nào không chứng minh được thì giữ trống.

**PRA-22 · Không có bằng chứng nghiệm thu chức năng.** Tệp Excel 123 chức năng: 141 bước, **0 bước có kết quả** (cột "Kết quả" trống toàn bộ). 123 mã chức năng `1.1…` không ánh xạ tới `YC-*` hay PRD. Tiêu chí PRD §11 "Chuyển đổi" và §7.12 dẫn chiếu `BAN_GIAO.md` — tệp không có trong repo.

**PRA-23 · NFR không kiểm chứng được.**

| Mã | Yêu cầu | Vì sao chưa kiểm được | Đề xuất |
|---|---|---|---|
| `YC-P1` | 100–500 người dùng đồng thời | Không có kịch bản tải (k6/artillery…) trong repo | Thêm kịch bản tải + ngưỡng p95/lỗi, chạy trước release |
| `YC-P2` | 10–30 s mỗi job ảnh | Không có số đo; `ai_requests.latency_ms` có nhưng không có ngưỡng/cảnh báo | Báo cáo p50/p95 theo năng lực từ `ai_requests` |
| `YC-P4` | 0,01–0,20 USD/ảnh | Không có kiểm tra theo dải | Truy vấn `cost_usd` + cảnh báo vượt dải |
| `YC-P5`, `YC-P6` | < 3 s trên 4G; JS < 200 KB/tuyến | Có số đo phòng lab 6 tuyến (`docs/audit/ui-architecture-audit/12_PERFORMANCE_REPORT.md`) nhưng không có cổng CI cho ngân sách gói | Thêm budget check vào CI |
| Thứ tự "Accuracy > Quality > Cost > Speed > Simplicity" | Nguyên tắc, không phải yêu cầu | Giữ ở PRD như nguyên tắc, bỏ khỏi bảng NFR |
| "dùng được trên màn hẹp", "không treo", "chạy độc lập" | Không có tiêu chí đo | Viết lại có điều kiện đo (khổ 360 px, timeout, test cô lập) |

Thiếu NFR hẳn: độ sẵn sàng/SLA uptime, RPO/RTO (có `VAN_HANH_SU_CO_VA_SAO_LUU.md` nhưng không thành yêu cầu), trợ năng (WCAG level), trình duyệt/thiết bị hỗ trợ, thời hạn lưu dữ liệu, dung lượng tệp tối đa, i18n/l10n.

**PRA-24 · Experience Mode (P10) chưa xong nhưng yêu cầu vẫn ghi như đã có.** `trial_reset_at` có ở `organizations` nhưng không mã nào đọc/ghi ⇒ `YC-U6` "đặt lại được" chưa có. `K1`/`K2` không được dùng ở đâu; chuyển đổi tổ chức dùng `F2` (`organizations/current/upgrade-request/route.ts:22`). Checklist P10 (`:223-227`) cả 5 ô trống.

### 3.4 Low

- **PRA-25 · Con số cứng trái luật "con số sinh từ mã".** Mã: **174 mã, 51 trần cứng** (`capability-catalog.test.ts:29,68`). Tài liệu: "146 mã" (`TRANG_THAI.md:1016`), "119 mã / 34" và "đích 159 / 48" (`02-function-catalog.md:439-441` — đích đã bị vượt), `AGENTS.md` theo `TRANG_THAI.md:1181` ghi 143/39.
- **PRA-26 · 71 mã năng lực không được dùng ở đâu** ngoài danh mục (chủ yếu dải thu hoạch `A`–`E`; đáng chú ý `J3`/`J4` landing, `J6`, `K1`/`K2`, `R8` lời nhắn thiệp, `U4`). Với `J3`/`J4`: landing page sinh và lưu bằng `J7` mà không có bước phát hành gác `J4` — cặp tách `J3↔J4` trong `SPLIT_CAPABILITY_PAIRS` không có hiệu lực thực tế.
- **PRA-27 · Hàng chờ duyệt gộp chưa đủ nguồn.** `/approvals` **CHƯA XÂY**; `/duyet` chỉ gom phân tích ảnh, tối ưu ảnh, câu chữ sản phẩm — không có biến thể (`I5`), video (`P4`), nội dung (`J5`).
- **PRA-28 · Tham chiếu gãy.** `docs/dac-ta/README.md:18` trỏ `09-du-lieu-mau-experience.md` (đã chuyển `docs/archive/historical/`); `README.md` dòng cuối trỏ `RA_SOAT_THU_HOACH.md` (đã chuyển `docs/archive/audit-logs/`); PRD dẫn `BAN_GIAO.md` (không có).
- **PRA-29 · Trùng tiền tố mã.** Mã năng lực `M1`–`M5` (`capability-catalog.ts`) trùng kiểu đặt tên với mã module `M01`–`M11`; `YC-T5` đòi khoá `org/<id>/…` nhưng video dùng `videos/<id>/…` (`src/modules/assets/domain/payload-deletion.ts:28`).

---

## 4. Ma trận trạng thái yêu cầu `YC-*` đã đối chiếu

Ký hiệu: **Đạt** có mã + bằng chứng · **Một phần** · **Chưa** không có mã · **Lệch** mã làm khác yêu cầu · **CKC** chưa kiểm chứng trong lượt này.

| Nhóm | Đạt | Một phần / Lệch / Chưa | CKC |
|---|---|---|---|
| T — đa tenant | T1–T4, T6, T9, T10 (CI chạy `test:tenant`) | T5 Lệch nhẹ (PRA-29) | T7, T8 |
| Q — quyền | Q1–Q5, Q7–Q9 | Q6 Một phần (PRA-05) | — |
| J — job | J1, J5–J9, J10 (cron) | — | J2–J4 |
| U — mức dùng | U3, U5, U7 (`enqueue-job.ts:56` bắt buộc khoá) | U6 Chưa (PRA-24) | U1, U2, U4 |
| S — bảo mật | S1 (`core/http/cookies.ts`), S3 (`lib/env.ts` zod), S5 (đăng nhập + `enqueue-job`), S6 | — | S2, S4, S7 |
| V — riêng tư | — | V1 Chưa (PRA-04); V2 Một phần (có `export-org-data-zip` và script vận hành `handover:clean`, chưa có luồng xoá theo yêu cầu tổ chức trong sản phẩm) | V3 (ngoài mã) |
| M — creative/video | M6 | M8, M9 Chưa (PRA-11, -12) | M1–M5, M7 |
| C — nội dung | C7, C8 (luật chung) | C2 Lệch, C3–C5 Chưa (PRA-01, -05) | C1, C6, C9 |
| K — khách hàng | K1, K6-audit | K2 Lệch (PRA-07), K5 Chưa, K6-quyền Lệch (PRA-03), K7 mở (D13) | K3, K4 |
| W — đơn hàng | W1, W5, W6 | — | W2–W4 |
| L — học | — | L1, L3–L6 Chưa (PRA-08, -09) | L2 |
| H — hội thoại | — | H3, H4 Lệch (PRA-13) | H1, H2 |
| G — cổng AI | G2 (`tests/unit/architecture/no-direct-ai-provider.test.ts`), G5 (`ai_models` đủ 4 ô), G9 (`ai_requests`) | G14 Chưa (PRA-14) | còn lại |
| E — chấm điểm/tri thức | E1 (`ai_evaluations`) | E7, E9 Chưa (PRA-10) | còn lại |
| P — hiệu năng | — | — | P1–P6 (PRA-23) |

`REQ-*` (`docs/spec/`): Mother Connector, outbox sự kiện, Edition/Industry Pack theo `apps/`/`packages/` — **Chưa** toàn bộ; xem PRA-18.

---

## 5. Danh sách cần khắc phục

Thứ tự ưu tiên. Cột "Cần PO" = phải có quyết định của Product Owner trước khi làm (theo `CLAUDE.md`, mục "Stop and ask").

| # | Việc | Finding | Loại | Cần PO | Gợi ý nghiệm thu |
|---|---|---|---|---|---|
| 1 | Ẩn hoặc làm thật công tắc Tự duyệt (`O7`, lưu, audit) | PRA-01 | Mã | Có (RBAC mới) | Test: tắt ⇒ không đường nào tự đăng; bật ⇒ một dòng `audit_logs` |
| 2 | Chốt cặp sinh↔duyệt cho creative/video/content; sửa `feature-catalog`; test "mọi mã tham chiếu phải tồn tại" | PRA-02, -05 | Mã + tài liệu | Có | `capability-catalog.test.ts` + test kiến trúc mới xanh |
| 3 | Quyết định `Q5` hay `R13` cho xuất khách hàng; sửa mã hoặc `YC-K6` | PRA-03 | Quyết định | Có (trần cứng) | Test: vai ngoài Điều hành bị 403 (nếu chọn `Q5`) |
| 4 | Chốt D13 rồi làm luồng chủ thể dữ liệu tự xoá + `customer_consents` chèn-chỉ | PRA-06, -07 | Mã + schema | Có (schema, pháp lý) | Test tenant: xoá theo yêu cầu khách không mở bằng mã năng lực nào |
| 5 | Consent dữ liệu huấn luyện cấp tổ chức trước go-live | PRA-04 | Mã + schema | Có | Cờ mặc định tắt; cổng AI từ chối dùng dữ liệu cho huấn luyện khi tắt |
| 6 | Viết lại PRD §1–5, §21 của 01 theo smeOS đa ngành, 4 tầng, phạm vi thật (landing, content, thanh toán, Redis) | PRA-15, -16 | Tài liệu | Có (PRD là SSOT) | PRD mới được PO ký, registry cập nhật |
| 7 | Bổ sung FR có mã (`YC-*` mới) + AC cho ~15 khối chưa có yêu cầu | PRA-17 | Tài liệu | Có | Mỗi khối ≥ 1 nhóm mã + tiêu chí đo được |
| 8 | Đặt mã cho FR ở PRD §7 và lập **một** ma trận truy vết `YC-* → test/route → ô checklist → bước Excel` | PRA-22, nhận định 1 | Tài liệu | Không | Ma trận sinh được bằng script, chạy trong `check:docs` |
| 9 | Chạy vòng nghiệm thu 123 chức năng trên staging, ghi kết quả + bằng chứng | PRA-22 | Kiểm thử | Không | 141/141 bước có kết quả |
| 10 | Tích lại Checklist theo bằng chứng (P21, P22, P25b/c, `YC-J10`) | PRA-21 | Tài liệu | Không | Mỗi ô tích có `tệp:dòng` hoặc tên test |
| 11 | Đồng bộ `feature-catalog.status` với mã thật; chọn một nguồn trạng thái duy nhất | PRA-19, -20 | Mã + tài liệu | Có (chọn SSOT) | Test: `available` ⇒ có route/use-case tương ứng |
| 12 | Quyết định số phận `docs/spec/` (đích dài hạn hay lưu trữ); sửa ADR-D1/D3 bị ghi "chưa chốt"; cập nhật `traceability.md` theo bằng chứng hiện có | PRA-18 | Tài liệu | Có | Registry có mục cho `docs/spec/` với trạng thái rõ |
| 13 | M11: `learning_profiles`, cột nguồn + `is_legacy` cho `content_metrics`, route `/analytics/*` — hoặc đưa M11 ra khỏi phạm vi hiện tại | PRA-08, -09 | Mã + schema | Có | Tiêu chí "Học" PRD §11 chạy được |
| 14 | Tri thức + tìm kiếm ngữ nghĩa (AI-3) — hoặc đổi `search.semantic` về `coming_soon` ngay | PRA-10 | Mã | Có (pgvector = schema) | — |
| 15 | Chặn video theo dải USD; watermark/nền cấp tổ chức | PRA-11, -12 | Mã | Có (`P5` mới) | Test tạo job vượt dải ⇒ 422 trước khi gọi nhà cung cấp |
| 16 | Sửa nghĩa `T3`/`T4` hoặc sửa `YC-H3`/`YC-H4`; đánh dấu rõ tin trả lời tự động | PRA-13 | Quyết định | Có | — |
| 17 | `GET /integration/ai-policy` (+ cache phía engine ngoài) | PRA-14 | Mã | Không | Test hợp đồng 08 |
| 18 | Viết lại NFR thành chỉ tiêu đo được, thêm kịch bản tải và budget gói JS vào CI; bổ sung NFR thiếu | PRA-23 | Tài liệu + CI | Có (đổi CI) | Mỗi NFR có lệnh đo + ngưỡng |
| 19 | Experience Mode: đặt lại hạn mức, dùng `K1`/`K2` hoặc bỏ hai mã | PRA-24, -26 | Mã | Có | Ô P10 tích được |
| 20 | Gỡ con số cứng (146/119/159), sửa tham chiếu gãy, dọn mã năng lực chết | PRA-25, -26, -28 | Tài liệu | Không | `check:docs` thêm luật cấm con số năng lực |

---

## 6. Tái lập bằng chứng

```bash
# Mã năng lực được feature-catalog dùng nhưng không tồn tại
grep -oE 'rbac(Run|Approve): "[A-Z][0-9]+"' src/lib/feature-catalog.ts | grep -oE '[A-Z][0-9]+' | sort -u
# Số mã và trần cứng hiện hành
grep -n "toBe(" src/core/rbac/capability-catalog.test.ts | head
# Endpoint đặc tả 06 chưa xây
grep -n "CHƯA XÂY" docs/dac-ta/06-api-specification.md
# Kết quả nghiệm thu trong Excel (cột H của 'Kịch bản')
python3 -c "import openpyxl;ws=openpyxl.load_workbook('docs/nghiem-thu/CHECKLIST_NGHIEM_THU_123_CHUC_NANG.xlsx',read_only=True)['Kịch bản'];print(sum(1 for r in ws.iter_rows(min_row=2,values_only=True) if len(r)>7 and r[7]))"
```

Báo cáo này không sửa mã hay tài liệu nguồn. Mọi việc ở mục 5 có cột "Cần PO = Có" chờ PO quyết trước khi thực thi.
