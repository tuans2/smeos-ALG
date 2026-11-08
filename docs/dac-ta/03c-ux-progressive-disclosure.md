> [!NOTE]
> **VAI TRÒ TÀI LIỆU — CHUẨN PROGRESSIVE DISCLOSURE & ENTERPRISE UX (Level 3, CANONICAL)**
> Phần mở rộng bắt buộc của `docs/dac-ta/03a-ux-constitution.md`. Hai tệp là **một chuẩn duy nhất**; khi khác biệt, 03a thắng trừ các mục 03a được tệp này sửa đổi rõ ràng (§1).
> Hợp nhất từ bộ kit `docs/archive/historical/SMEOS_UX_Progressive_Disclosure_Kit/` (lưu trữ, không còn hiệu lực riêng).
> **Quyết định phê duyệt của Product Owner:** 29/10/2026 (PD1–PD4, toàn bộ đề xuất E1–E16).
> Đặc tả luồng: `docs/dac-ta/ux-patterns/`. Kế hoạch thực thi: `docs/archive/historical/ui-ux-2026-10/PROGRESSIVE_DISCLOSURE_EXECUTION_PLAN.md`.

# 03c — Progressive Disclosure & Enterprise UX

## §1. Phán quyết PD1–PD4 của Product Owner

| Mã | Phán quyết | Ảnh hưởng tới 03a |
|---|---|---|
| **PD1** | Thang phân tầng duy nhất là **L0–L4 của 03a UX-003**. Thêm khái niệm **SYS** (§2) cho phần hệ thống tự xử lý — SYS không phải một tầng hiển thị. Thang L1–L4 của bộ kit không được dùng trong tài liệu hoặc mã. | Mở rộng UX-003 |
| **PD2** | Không tạo `docs/ux-standard/`. Luật nằm ở 03a + 03c; đặc tả luồng ở `docs/dac-ta/ux-patterns/`; bộ kit gốc chuyển về `docs/archive/historical/`. | Mở rộng §0.2 |
| **PD3** | Tài liệu chuẩn gọi sản phẩm theo tên trong 03a; prompt dành riêng công cụ (Antigravity) chỉ là tham khảo lưu trữ. Agent tuân thủ qua `CLAUDE.md`. | — |
| **PD4** | 03c có cùng thứ bậc Level 3 CANONICAL với 03a; pattern specs là Level 3 SUPPORTING; Screen Contract tham chiếu cả hai. | Mở rộng §0.3 |
| **PD5** | (29/10/2026) `FeatureGuidanceCard`: bỏ độ mờ `/60` ở chữ "Xem hướng dẫn"/"Thu gọn" để đạt WCAG AA (audit A15). Cấu trúc, vị trí, hành vi giữ nguyên theo K1 | Bổ sung K1 (03a §0.1) |
| **PD6** | (29/10/2026) Hợp nhất bộ bổ sung MEUX/VDLS: **không** thành chuẩn riêng mang tên MEUX — tích hợp vào 03c (§5b, §5c, §7b, §9) và `ux-patterns/` (`page-archetypes.md`, `visual-review.md`, bảng chọn pattern). Lint giữ PASS/WARNING/FAIL/BLOCKED + ratchet; P0–P3 chỉ cho audit thủ công. Số liệu định lượng của bộ bổ sung là heuristic nội bộ. Bản gốc lưu `docs/archive/historical/SMEOS_MEUX_Supplemental_Kit/` | Mở rộng §35, §40–41 (qua tài liệu SUPPORTING, không sửa thân 03a) |
| **PD7** | (29/10/2026) `TabActionHeader`: huy hiệu tone `accent` chuyển sang cặp token `selected` (2,25:1 → 7,15:1, audit MEUX `/tai-anh`). Cấu trúc, vị trí, quy tắc nút K2 giữ nguyên | Bổ sung K2 (03a §0.1) |
| **PD8** | (29/10/2026) Sau audit sâu: (a) chuẩn Spotlight không làm mờ chữ (`opacity`) — khối chưa chọn chỉ chìm nền/viền; (b) ấn phẩm cho khách (landing, poster, catalog, thẻ) chỉ in ưu đãi tiệm **đang bật** trong Cài đặt → Ưu đãi, không mặc định, AI không tự đặt; (c) không dữ liệu giả (đánh giá, cam kết, đếm ngược, liên hệ, ảnh kho) trên bề mặt khách thấy; (d) Progressive Disclosure là nguyên tắc vận hành của agent: `ux-patterns/OPERATING_PRINCIPLES.md`, trỏ từ `CLAUDE.md` | Bổ sung 03a §0.1, UX-017 |

## §2. Ánh xạ tầng và khái niệm SYS (PD1)

| Bộ kit (lưu trữ) | Chuẩn hiện hành | Hiển thị mặc định |
|---|---|---|
| L1 Essential | **L0 Essential + L1 Actionable** | Có, viewport đầu tiên |
| L2 Contextual | **L2 Context** | Chỉ khi điều kiện xảy ra |
| L3 Advanced | **L3 Detail / L4 Advanced** | Sau nhãn rõ nghĩa ("Tùy chỉnh thêm", "Xem chi tiết") |
| L4 System-managed | **SYS** | Không hiển thị cơ chế; **chỉ hiển thị** trạng thái, lỗi, yêu cầu xác nhận và kết quả có ý nghĩa |

Ví dụ SYS: kiểm tra file, tạo job, xếp hàng, retry có giới hạn, áp dụng preset, kiểm tra quyền.

## §3. UX-015 — Hành động theo mức rủi ro

Mọi hành động có hậu quả MUST được gắn một mức rủi ro trong Screen Contract.

| Mức | Ví dụ | Yêu cầu tối thiểu |
|---|---|---|
| **R1 Thấp** | Tạo bản nháp ảnh, đổi bộ lọc | Không xác nhận; có hoàn tác hoặc tạo lại |
| **R2 Trung bình** | Tạo nhiều biến thể tốn quota, ghi đè nháp | Xem trước chi phí/ảnh hưởng (UX-019); **ưu tiên Hoàn tác** hơn hộp xác nhận |
| **R3 Cao** | Thanh toán, xóa, xuất bản công khai, gửi ra ngoài, đổi quyền | `ConfirmDialog` nêu rõ hành động + hậu quả; ghi nhật ký (UX-020) |

- Cấm `window.confirm()`, `window.alert()`, `window.prompt()` trong mã mới (lint R13) — dùng `ConfirmDialog`, `useToast()`, `usePromptDialog()`.
- Không thêm hộp xác nhận cho thao tác R1.
- Tự động hóa (SYS) không được tự thực hiện hành động R3 khi chưa có ủy quyền.

## §4. UX-016 — Trạng thái tác vụ nền là sự thật từ backend

Từ vựng UI duy nhất (định nghĩa tại `src/lib/ui-system/task-state.ts`):

```text
idle → validating → submitting → queued → running → succeeded
                                                 ↘ failed (retryable | needs_action)
                                                 ↘ canceled
```

| Trạng thái UI | Nhãn hiển thị | Quy tắc |
|---|---|---|
| `queued` | "Đang chờ xử lý" | Backend đã nhận |
| `running` | "Đang xử lý" | Chỉ hiện % khi backend trả tiến độ thật |
| `succeeded` | "Đã xong" | Chỉ khi backend xác nhận |
| `failed` | "Chưa xong được" + lý do | Phân biệt *thử lại được* và *cần làm việc khác* |
| `canceled` | "Đã hủy" | Nếu luồng hỗ trợ |

- Giá trị backend hiện có (`pending`, `processing`, `done`, `completed`, `error`, `cancelled`…) **giữ nguyên** trong schema/API; chỉ ánh xạ ở tầng UI qua một hàm duy nhất, có test cho từng giá trị.
- Không suy ra thành công từ timeout hay phản hồi mơ hồ. Không giả lập phần trăm.
- Chống bấm trùng: nút gửi khóa khi `submitting`; tác vụ tạo mới gửi idempotency key khi API hỗ trợ (E10).
- Rời màn/reload phải khôi phục được tác vụ nếu luồng cần; tác vụ xong khi người dùng ở nơi khác → trung tâm thông báo (UX-024).

## §5. UX-017 — Không dùng disclosure để giấu

Không được ẩn vào tầng L2–L4: giá, phí, quota còn lại, điều khoản, quyền riêng tư, trạng thái thanh toán, hậu quả không hoàn tác, lý do một nút bị khóa. Ẩn nâng cao ≠ không tìm thấy: mọi vùng mở rộng có nhãn rõ, giữ giá trị khi đóng/mở, dùng được bằng bàn phím (`Disclosure`, lint R15).

## §5b. Chọn đúng cách hiển thị thêm

Bảng chọn pattern (accordion/Disclosure, drawer, modal, tab, wizard, tooltip, tùy chỉnh thêm) ở `ux-patterns/README.md`. Tooltip không bao giờ là nơi duy nhất chứa thông tin thiết yếu (bổ sung UX-017).

## §5c. UX-027 — Trường theo ngữ cảnh

Khi một lựa chọn (chế độ AI/thủ công, loại sản phẩm, kênh…) làm đổi các trường phía sau:
- **MUST:** Screen Contract §15 khai cho mỗi trường/nhóm: điều kiện hiện, điều kiện khóa, mặc định, **xử lý giá trị cũ khi điều kiện đổi** (giữ / xóa có cảnh báo / hỏi người dùng).
- **MUST:** đổi chế độ không âm thầm xóa dữ liệu đã nhập; không giữ được thì cảnh báo và xin xác nhận (`ConfirmDialog` nếu mất dữ liệu đáng kể).
- **SHOULD:** báo ngắn điều vừa thay đổi ("Đã chuyển sang tự thiết kế — giữ lại ảnh và ghi chú").
- **MUST:** trường bị ẩn vẫn không được gửi lên nếu không còn hợp lệ với chế độ mới.

## §6. Chuẩn Enterprise (E1–E16)

### 6.1. Bắt buộc từ đầu
- **UX-018 — Hiển thị theo quyền và gói (E1).** Chức năng ngoài quyền/gói không biến mất âm thầm: hiển thị trạng thái khóa + lý do ("Cần quyền quản lý đơn", "Có trong gói …") + đường đi tiếp (xin quyền/nâng gói), trừ khi bản thân sự tồn tại của tài nguyên là thông tin chéo tổ chức (khi đó giữ quy tắc 404). Quyết định hiển thị dựa trên capability, không dựa `roleKey`.
- **UX-019 — Minh bạch chi phí AI (E2).** Trước tác vụ tốn quota: hiển thị số credit dự kiến và số credit còn lại ở L0/L1 (`CostPreview`); vượt hạn mức → chặn trước khi gửi, kèm hướng xử lý.
- **UX-020 — Nhật ký & mã tham chiếu (E3).** Hành động R3 được ghi nhật ký (ai, khi nào, đối tượng). Thông báo lỗi kèm **mã tham chiếu** an toàn để CSKH tra cứu; không lộ stack trace, ID nội bộ nhạy cảm, dữ liệu khách hàng.
- **UX-021 — Hoàn tác & tự lưu nháp (E4).** Ưu tiên Hoàn tác/soft delete cho R2; form dài và trình soạn tự lưu nháp; không báo "đã lưu" trước khi server xác nhận.
- **UX-022 — Cô lập tổ chức trên client (E5).** Không lưu cache, `localStorage`, nháp hay trạng thái tác vụ dùng chung giữa các tổ chức; khóa lưu trữ phải gắn organization; đổi tổ chức → xóa trạng thái cũ.
- **Kiểm thử chuẩn UX (E8).** E2E cho luồng cốt lõi chạy kiểm tra trợ năng tự động (axe) và ảnh so sánh cho component dùng chung, ở khổ 390px và 3 preset giao diện.
- **Rollout bằng cờ tính năng (E9).** Màn nâng cấp bật dần theo tổ chức, tắt được ngay khi có sự cố.

### 6.2. Song song với pilot
- **Ngân sách hiệu năng (E6).** Mỗi màn có ngưỡng LCP ≤ 2,5s, INP ≤ 200ms, CLS ≤ 0,1 (p75, mobile) — mặc định đề xuất, hiệu chỉnh sau khi có baseline.
- **Đo hành vi (E7).** Mỗi pattern có bộ sự kiện chuẩn: `started`, `submitted`, `succeeded`, `failed`, `abandoned`, `retried`; không thu dữ liệu cá nhân.
- **Mạng yếu (E10).** Banner mất kết nối; giữ dữ liệu nhập an toàn; idempotency cho tác vụ tạo.

### 6.3. Sau pilot
- **UX-023 — Lần dùng đầu (E11).** Mỗi công cụ có dữ liệu/kết quả mẫu để thấy giá trị trước khi đưa dữ liệu thật.
- **UX-024 — Trung tâm thông báo (E12).** Mọi tác vụ nền hoàn tất/thất bại báo về một nơi; không tự chế toast riêng cho từng công cụ.
- **UX-025 — Trợ giúp tại chỗ (E13).** Liên kết "Cách dùng" và kênh hỗ trợ kèm mã tham chiếu, gắn vào `FeatureGuidanceCard` **không đổi cấu trúc** (PO K1).
- **UX-026 — Từ điển thuật ngữ (E14).** Một khái niệm một cách gọi: `docs/dac-ta/ux-patterns/glossary.md`; lint R16 cảnh báo từ cấm.

### 6.4. Quản trị
- **Bảng điểm UX từng màn (E15).** CI xuất: pattern dùng, vi phạm lint R1–R16, ngoại lệ còn hạn, trạng thái nâng cấp.
- **Phiên bản component dùng chung (E16).** Đổi API public của component trong `src/components/ui/` = MAJOR, kèm hướng dẫn chuyển đổi và audit nơi sử dụng.

## §7. Luật UX Lint bổ sung (ratchet, chỉ chặn vi phạm mới)

| Mã | Luật | Nguồn |
|---|---|---|
| R13 | `confirm(`/`alert(`/`prompt(` (cả dạng `window.`) trong `.tsx` → `ConfirmDialog` / `useToast()` / `usePromptDialog()` | UX-015 |
| R14 | Chuỗi trạng thái tác vụ ngoài từ vựng chuẩn trong component → dùng `task-state.ts` | UX-016 |
| R15 | `<details>` tự viết cho cài đặt → dùng `Disclosure` | UX-017 |
| R16 | Từ cấm theo từ điển thuật ngữ trong nhãn UI (Worker, render, job, P\d) | UX-026 |

## §7b. Audit thủ công và review thị giác

Mã IA-01…VD-05, thang P0–P3 và quy đổi sang PASS/WARNING/FAIL/BLOCKED, mẫu finding, checklist so sánh tham chiếu: `ux-patterns/visual-review.md`. Mẫu bố cục theo loại trang A–F và quy tắc bề mặt (UX-028): `ux-patterns/page-archetypes.md`. Không biến heuristic thị giác thành lint khi chưa đo tỉ lệ báo sai.

## §8. Sổ ngoại lệ UX

Ngoại lệ ghi tại `docs/dac-ta/ux-patterns/exceptions.md`, mỗi dòng: ID, ngày, luật/pattern, lý do, tác động, giảm thiểu, người duyệt (PO), hạn xem lại. Không có ngoại lệ cho: bảo mật, tenancy, quyền, trợ năng, trạng thái giao dịch, UX-017.

## §9. Definition of Done cho mọi công cụ/màn mới hoặc nâng cấp

- [ ] Screen Contract khai báo pattern (`ux-patterns/`), bảng phân tầng L0–L4/SYS cho trường/nút chính, mức rủi ro R1–R3 từng hành động (template §15).
- [ ] Tác vụ chạy lâu dùng `TaskStatus` + `task-state.ts`, có test ánh xạ trạng thái backend.
- [ ] Hành động R3 dùng `ConfirmDialog` và ghi nhật ký; R2 có hoàn tác hoặc xem trước chi phí.
- [ ] Không tăng baseline UX Lint R1–R16; không lỗi axe mới trong E2E.
- [ ] Đạt ngân sách hiệu năng hoặc ghi ngoại lệ.
- [ ] Sự kiện đo của pattern được phát.
- [ ] Ngoại lệ (nếu có) ghi vào sổ, có hạn.
- [ ] Screen Contract khai archetype A–F; trường theo ngữ cảnh có bảng UX-027 (nếu có).
- [ ] Màn mới hoặc đổi bố cục: review `visual-review.md` ở 390px và 1280px, không còn P0/P1; ảnh trước/sau khi đổi bố cục màn có sẵn.
- [ ] Không tuyên bố "đạt WCAG" chỉ dựa trên axe — ghi rõ kiểm tra thủ công đã làm/chưa làm.
- [ ] Đổi shell hoặc component dùng chung: thí điểm một màn và PO duyệt trước khi áp rộng.
- [ ] Audit sâu **mọi trạng thái** (rỗng, đang chạy, có kết quả, lỗi, hộp thoại mở/đóng, trang khách) — không chỉ màn đầu (PD8).

## §10. Thứ bậc khi xung đột
An toàn dữ liệu & tenancy → quyền → UX-017 (không giấu) → công việc chính → trợ năng → nhất quán design system → thẩm mỹ (bổ sung 03a §49).
