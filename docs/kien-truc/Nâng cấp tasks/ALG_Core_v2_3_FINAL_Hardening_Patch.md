# ALG CORE — FINAL HARDENING PATCH (v2.2.0 → v2.3.0 FINAL)

| Mục | Giá trị |
| --- | --- |
| Áp dụng cho | `FloraOS_Core_Dac_ta_kien_truc_v2_2.md` |
| Phiên bản đích | 2.3.0, nhãn `FLORAOS_CORE_ARCHITECTURE_FINAL` khi đạt điều kiện mục 9 |
| Phạm vi FINAL | Core + Release R1. ADR-007 vẫn `BLOCKING` cho WP6b (R2), không nằm trong điều kiện khóa |
| Trạng thái patch | Chờ chủ sở hữu duyệt. Các điểm tôi tự giả định được liệt kê ở mục 10 |

Cách áp dụng: mỗi PATCH ghi rõ mục đích trong v2.2 (thay thế / thêm / sửa). Thứ tự áp dụng: P1 → P2 → P3 → P4 → P5 → Phụ lục D → header.

---

## 1. PATCH P1 — Thay thế mục 11.4 (Journey UX Contract) bằng v2

### 11.4 Journey UX Contract (version 2)

`ux_contract` là phần bắt buộc của mọi Journey Manifest. Nó cố định hành vi giao diện quanh dữ liệu để Agent sinh Journey shell nhất quán.

```yaml
ux_contract:
  version: 2
  execution_mode: {default: manual, allowed: [manual, automatic]}
  entry: {screen: readiness_gate, max_recommendations_shown: 3}
  inputs:                       # thứ tự các bước người dùng thấy
    - {id: <string>, kind: <InputKind>, decision: <decision_id>, required: <bool>, ...tham số theo kind}
  states:
    BLOCKED:                    {screen: gap_resolver, can_run: false, resolve: inline, return_to: journey}
    READY_WITH_RECOMMENDATIONS: {screen: run_panel,    can_run: true,  banner: top_recommendations}
    READY:                      {screen: run_panel,    can_run: true}
  confirmations: [{when: ask_decision == CONFIRM, ui: inline_confirm_chip}]
  result: {show_provenance: true, label_ai_content: true, show_excluded: summary, on_regenerate: reuse_context}
  device: {mobile_first: true}
```

**Thay đổi so với v1 của mục này**

- `states` không còn tên màn hình riêng (`run_with_banner`, `run`). Cả hai trạng thái chạy được dùng chung màn hình `run_panel`; khác biệt là thuộc tính `banner`.
- Thêm `execution_mode` (cấp contract) và `decision` (cấp input).
- Bỏ `mode: auto_with_override` ở input. Chế độ tự động của từng input được **suy ra** từ `execution_mode` và `ownership` của decision (mục 11.5), không khai báo riêng.
- `asset_picker` luôn cho phép ghi đè (`override: true`) và xem trước.

**Tập màn hình chuẩn (đóng, 7 phần tử)**

| screen | Khi nào | Dữ liệu | Ghi chú |
| --- | --- | --- | --- |
| `readiness_gate` | Mở Journey | Readiness + Recommendations | Chạy trước mọi bước nhập |
| `gap_resolver` | Trạng thái `BLOCKED` | Recommendation `BLOCKING` | Liệt kê chính xác mục `hard` còn thiếu kèm CTA (mục 10.2) |
| `input_step` | Mỗi input không phải `asset_picker` | FieldUISchema + Taxonomy | Qua `AskDecision` (FR-J05) |
| `asset_picker` | Input `kind: asset_picker` | `evaluateUsage` + Selector | Tự chọn, cho phép ghi đè, xem trước |
| `inline_confirm_chip` | `AskDecision = CONFIRM` | Fact/Asset hiện có | Xác nhận 1 chạm |
| `run_panel` | `READY*` | Tóm tắt dữ liệu sẽ dùng, banner khuyến nghị nếu có | Nút chạy; hiển thị `execution_mode` hiện hành và cho đổi |
| `result_with_provenance` | Sau khi sinh | `ContextSnapshot` | Dữ liệu đã dùng, phần bị loại, nhãn "AI đề xuất" |

**Tập `InputKind` chuẩn (đóng, 6 phần tử)**

| kind | Tham số bắt buộc | Nguồn dữ liệu | Ghi chú |
| --- | --- | --- | --- |
| `choose_product` | `multi?` | `Product` (status=active) | Giá trị là `product_id` (UUID) |
| `choose_channel` | — | `channels_allowed` của manifest | Chỉ dùng khi manifest khai báo `channel: $channel` |
| `choose_option` | `taxonomy` | `TaxonomyOption` | Hiển thị tooltip (INV-05) |
| `profile_field` | `field_key` | `FieldDefinition` + `FieldUISchema` | Dùng khi cần bổ sung/xác nhận field ngay trong Journey; lưu vào SSOT (FR-J04) |
| `asset_picker` | — | `evaluateUsage` + Asset Selector | `preview: true`, `override: true` |
| `free_text` | `max_length` | Không có | **Chỉ cho phép khi không có taxonomy phù hợp** (INV-04); nội dung chỉ thuộc `JourneyRun.params`, không phải dữ liệu nghiệp vụ (FR-J07) |

**Thực thể `JourneyRun` (thay thế)**

```text
JourneyRun: journey_run_id, shop_id, journey_type, status(draft|running|completed|failed),
  execution_mode(manual|automatic),            # chế độ thực tế đã chạy
  params, degraded_steps[],                    # input tự động nhưng phải chuyển sang hiển thị (FR-J09)
  decisions[]{decision_id, ownership, decided_by, outcome},   # mục 11.5, FR-D05
  context_id?, output_refs[], created_by, created_at
```

**Yêu cầu (thêm sau FR-J08)**

- **FR-J09 (`execution_mode`).**
  - `manual`: mọi input hiển thị thành một bước, thu gọn khi `AskDecision = SKIP` (FR-J05).
  - `automatic`: sau khi qua `readiness_gate` với trạng thái khác `BLOCKED`, input có decision `ownership ∈ {SYSTEM, SHARED}` được hệ thống tự giải quyết bằng giá trị mặc định và **không hiển thị**; kết quả hiện trong panel provenance kèm nút đổi (ghi đè). Input có decision `ownership = USER` vẫn xử lý theo `AskDecision`: `SKIP` thu gọn, `CONFIRM` hiện chip, `ASK` hiện ô nhập.
  - Input `required: true` thuộc `SHARED` mà hệ thống không giải quyết được (ví dụ Selector trả rỗng) → chuyển sang hiển thị thành bước thủ công và ghi vào `degraded_steps`. Input `required: false` không giải quyết được → bỏ qua.
  - `automatic` MUST NOT: (a) vượt qua `BLOCKED` (FR-J02); (b) bỏ qua `CONFIRM`; (c) tự phát hành/đăng output (D-PUBLISH-OUTPUT là USER, mục 11.5); (d) nới bất kỳ decision `locked` nào.
  - Người dùng đổi mode ở `run_panel`; giá trị mặc định lấy từ `execution_mode.default`; chỉ được chọn trong `allowed`.
- **FR-J10.** `screen` trong `states` và `entry` MUST thuộc tập màn hình chuẩn ở trên; Agent không tự thêm màn hình.
- **FR-J11.** `inputs[].kind` MUST thuộc tập `InputKind` chuẩn; mỗi kind MUST có đủ tham số bắt buộc. `inputs[].id` duy nhất trong manifest.
- **FR-J12.** Mỗi input MUST khai báo `decision` tham chiếu một `decision_id` có trong Decision Registry (mục 11.5). Không có decision, không có input.
- **FR-J13 (tham số hóa).** Yêu cầu có `$param` (ví dụ `permission.channel: $channel`) chỉ được nằm trong `soft_requirements`; MUST NOT xuất hiện trong `hard_requirements`. Tại `readiness_gate`, yêu cầu tham số hóa được đánh giá trên tập giá trị cho phép (đạt nếu ít nhất một giá trị đạt) và đánh giá lại ngay sau khi người dùng chọn giá trị thật. Hệ quả: tham số chưa chọn không bao giờ làm Journey `BLOCKED`.
- **FR-J08 (bổ sung):** lint CI thêm: `screen` ∈ tập chuẩn (FR-J10); `kind` ∈ `InputKind` và đủ tham số (FR-J11); `decision` tồn tại (FR-J12); `$param` không nằm trong hard (FR-J13); `execution_mode.default ∈ allowed`; `choose_channel` chỉ khi manifest có `channel: $channel`.

---

## 2. PATCH P2 — Thêm mục 11.5 (Decision Ownership) và sửa Audit

### 11.5 Decision Ownership

Mỗi quyết định có thể do người dùng, hệ thống hoặc cả hai đưa ra. Việc ai sở hữu quyết định được khai báo **một lần ở Core** trong Decision Registry (danh mục đóng). Journey chỉ tham chiếu `decision_id`.

```text
DecisionOwnership: USER | SYSTEM | SHARED
Thứ tự chặt chẽ: SYSTEM < SHARED < USER   (USER = quyền kiểm soát của người dùng cao nhất)

DecisionDefinition: decision_id, ownership(USER|SYSTEM|SHARED), locked(bool), description(vi), spec_ref
```

- **USER:** chỉ người dùng (đúng vai trò) quyết định. Hệ thống không được đặt giá trị thay.
- **SYSTEM:** hệ thống quyết định theo quy tắc xác định; người dùng không phải tham gia (nhưng có thể thấy kết quả và lý do).
- **SHARED:** hệ thống (hoặc AI) **đề xuất và đặt giá trị mặc định**; người dùng có thể xác nhận hoặc ghi đè. Nếu người dùng không can thiệp, mặc định có hiệu lực (trừ khi decision `locked`, khi đó SHARED không được phép; xem FR-D03).

**Decision Registry (mặc định R1; Agent không tự thêm dòng)**

| decision_id | ownership | locked | Mô tả | Tham chiếu |
| --- | --- | --- | --- | --- |
| `D-PERM-GRANT` | USER | ✔ | Cấp/đổi quyền dùng asset theo `(channel, purpose)` | FR-A04, FR-A05 |
| `D-VERIFY-FACT` | USER | ✔ | Chuyển Fact sang `VERIFIED` (owner/admin) | 9.2, INV-09 |
| `D-APPROVE-PUBLIC` | USER | ✔ | Phê duyệt Claim cho kênh công khai | 9.2, AI-02 |
| `D-REVOKE-MANUAL` | USER | ✔ | Thu hồi `APPROVED` | 9.2 |
| `D-REVOKE-EXPIRY` | SYSTEM | ✔ | Thu hồi khi hết `effective_until` | 9.2 |
| `D-RESOLVE-CONFLICT` | USER | ✔ | Giải quyết `ConflictTicket` (owner/admin) | 5.6, 9.3 |
| `D-EVALUATE-USAGE` | SYSTEM | ✔ | Kết quả `evaluateUsage()` (fail-closed) | FR-A08, INV-13 |
| `D-PUBLISH-OUTPUT` | USER | ✔ | Phát hành/đăng output ra ngoài | INV-09 |
| `D-COMPUTE-READINESS` | SYSTEM | ✔ | Tính readiness, xếp hạng Recommendation | 10, FR-R01 |
| `D-DEDUP-DETECT` | SYSTEM | — | Phát hiện asset trùng theo hash | 8.5 |
| `D-CLASSIFY-ASSET` | SHARED | — | Phân loại asset (R1: không có đề xuất AI nên người dùng nhập; R2: AI đề xuất, người dùng xác nhận) | 8.4, INV-08 |
| `D-LINK-ASSET` | SHARED | — | Gắn asset với entity (product, occasion…) | FR-A12 |
| `D-PROMOTE-FACT` | SHARED | — | Đưa Fact INDEPENDENT (DERIVED/OBSERVED) thành `ProfileValue` | FR-K05 |
| `D-CONFIRM-DERIVED` | SHARED | — | Dùng giá trị suy ra an toàn và xác nhận nhẹ | 11.3 mục 3 |
| `D-CONFIRM-EXPIRING` | USER | — | Xác nhận thông tin sắp hết hạn/`NEEDS_REVIEW` | 11.3 mục 2 |
| `D-CHOOSE-PRODUCT` | USER | — | Chọn sản phẩm làm chủ đề cho Journey | 11.4 |
| `D-CHOOSE-CHANNEL` | USER | — | Chọn kênh khi manifest dùng `$channel` | 11.1 |
| `D-CHOOSE-OPTION` | SHARED | — | Chọn option taxonomy cho Journey (mặc định: không đặt; người dùng chọn nếu muốn) | 11.4 |
| `D-SELECT-ASSETS` | SHARED | — | Chọn asset cho output (lọc bằng `evaluateUsage`, xếp hạng Selector) | 11.1, FR-A12 |

**Yêu cầu**

- **FR-D01.** Decision Registry là danh mục đóng thuộc Core. Journey Manifest chỉ tham chiếu `decision_id`, không định nghĩa decision mới.
- **FR-D02 (chỉ siết, không nới).** Manifest MAY khai báo `ownership_override: {<decision_id>: <ownership>}` chỉ khi giá trị mới **cao hơn** trong thứ tự `SYSTEM < SHARED < USER`. Nới (ví dụ USER → SHARED) bị lint từ chối.
- **FR-D03 (`locked`).** Decision `locked: true` MUST NOT bị override, MUST NOT bị bỏ qua bởi `execution_mode: automatic`, và MUST NOT được người dùng "ủy quyền ngầm" qua cấu hình mặc định.
- **FR-D04 (bất biến).** Mọi decision làm thay đổi `verification`, `publication`, quyền sử dụng asset, hoặc phát hành output MUST có `ownership = USER`, hoặc `SYSTEM` chỉ khi hệ thống đang **thu hẹp** (`D-REVOKE-EXPIRY`, `D-EVALUATE-USAGE` trả `DENY`). Lint CI từ chối registry vi phạm. Đây là hiện thực hóa INV-09, AI-02, INV-13.
- **FR-D05 (audit).** Mỗi quyết định ghi AuditEvent có `decision_id`, `ownership`, `decided_by ∈ {user_override, user_confirm, system_default, system_rule}`. Với `SHARED` có đề xuất, MUST có hai sự kiện: **đề xuất** (`actor_type = ai|system`) và **quyết định** (`actor_type = user` hoặc `system` nếu mặc định có hiệu lực).
- **FR-D06 (ánh xạ).** `ownership` là khai báo thiết kế; `actor_type` (`user|ai|system`, mục 5.7) là sự thật lúc chạy. Hệ thống MUST NOT ghi `actor_type=user` cho quyết định do mặc định hệ thống có hiệu lực.

**Sửa mục 5.7 AuditEvent:** thêm trường tùy chọn `decision_id?, ownership?, decided_by?`.

---

## 3. PATCH P3 — Fact: projection và independent

**Vấn đề trong v2.2:** FR-K01 coi Fact của `ProfileValue` là projection chỉ đọc, nhưng mục 5.6 và 9.2 cho thao tác trạng thái trực tiếp trên Fact; `ProfileValue` không có trường `publication`; mục 5.10 tạo `Fact` giá từ `Product` (không phải `ProfileValue`).

### 5.6 Fact & Claim (thay thế khối Fact)

```text
Fact: fact_id, shop_id, kind(PROJECTED|INDEPENDENT),
      subject, predicate, object(jsonb),
      origin(DECLARED|OBSERVED|DERIVED|IMPORTED),
      verification(UNVERIFIED|SELF_DECLARED|VERIFIED|REJECTED),
      publication(NOT_APPROVED|APPROVED|REVOKED), confidence, source_ref,
      effective_from, effective_until?, version,
      projection_of?{source_kind(profile_value|product), source_id}   # NOT NULL khi kind=PROJECTED

Claim (INDEPENDENT, kế thừa Fact): claim_text, claim_type(quality|service|brand|price|guarantee),
      basis_fact_id?, approved_channels[], evidence_asset_ids[], approved_by, approved_at, review_due_at
```

**Sửa mục 5.2 (ProfileValue):** thêm enum `source_type(user_input|import|ai_inferred|observed)` và ràng buộc `verification_status` dùng cùng enum với `Fact.verification`.

| | PROJECTED | INDEPENDENT |
| --- | --- | --- |
| Nơi lưu | **Không có bảng.** View tính khi đọc từ `ProfileValue` hoặc `Product` | Bảng `facts` của Knowledge Service |
| `fact_id` | Xác định: `uuid5(ns, source_kind + source_id)` | UUID sinh khi tạo |
| Bản ghi gốc | `ProfileValue` / `Product` (INV-10) | Chính nó |
| Ghi trực tiếp qua Knowledge API | Không (409 `PROJECTED_READ_ONLY`) | Có, theo quyền 9.2 |
| Ví dụ | `phone`, `operating_hours`, giá/`availability` của Product | Claim, Fact `OBSERVED` từ phân tích ảnh (R2), `IMPORTED`, `DERIVED` |

**Quy tắc ánh xạ PROJECTED**

| Thuộc tính Fact | Nguồn |
| --- | --- |
| `origin` | từ `source_type`: `user_input`→`DECLARED`, `import`→`IMPORTED`, `ai_inferred`→`DERIVED`, `observed`→`OBSERVED`. Với Product: `DECLARED` |
| `verification` | `ProfileValue.verification_status` (Product: `SELF_DECLARED`) |
| `publication` | tính theo `publication_policy`: `public_on_declare` → `APPROVED` khi `verification ∈ {SELF_DECLARED, VERIFIED}`, ngược lại `NOT_APPROVED`; `claim_required`, `guidance`, `internal_only` → luôn `NOT_APPROVED` (dùng công khai cần Claim, mục 9.4) |
| `effective_*`, `confidence`, `version` | từ nguồn |
| Phạm vi từ Product | chỉ `price` và `availability`; các thuộc tính khác Context Builder đọc trực tiếp từ `Product` (FR-C09) |

### 9.4 (thêm sau FR-K01)

- **FR-K02.** Mọi mutation lên Fact `PROJECTED` đi qua API của nguồn (Profile/Product), không qua Knowledge API. Chuyển trạng thái `DERIVED → VERIFIED` (9.2) trên dữ liệu có `ProfileValue` được thực hiện bằng cách ghi `ProfileValue.verification_status` (decision `D-VERIFY-FACT`, USER).
- **FR-K03.** Không có AuditEvent riêng cho Fact `PROJECTED`; AuditEvent của `ProfileValue`/`Product` là bản ghi duy nhất (INV-10, INV-12).
- **FR-K04.** Claim luôn là `INDEPENDENT`. Khi Claim có `basis_fact_id` trỏ tới Fact `PROJECTED` và nguồn đổi giá trị (ProfileValue mới thay thế hoặc Product đổi giá), Claim MUST chuyển `NEEDS_REVIEW` (9.4) và sinh Recommendation `factual_safety`.
- **FR-K05.** Fact `INDEPENDENT` có `origin ∈ {DERIVED, OBSERVED, IMPORTED}` MUST NOT ghi đè `ProfileValue`. Muốn đưa vào hồ sơ, hệ thống tạo Recommendation; người dùng chấp nhận (decision `D-PROMOTE-FACT`) thì tạo `ProfileValue` mới với `source_type` giữ nguyên nguồn gốc.
- **FR-K06 (xung đột, sửa mục 9.3).** `ConflictTicket` chỉ tạo khi hai Fact cùng `subject+predicate` khác giá trị **và không bên nào là `DERIVED/OBSERVED` đối đầu `PROJECTED`**. Cụ thể: (a) `PROJECTED` vs `INDEPENDENT` `DERIVED/OBSERVED` → không tạo ticket, Context Builder dùng `PROJECTED`, hệ thống sinh Recommendation đề xuất rà soát (FR-K05); (b) `PROJECTED` vs `INDEPENDENT` `IMPORTED`, hoặc `INDEPENDENT` vs `INDEPENDENT` → áp dụng quy tắc ưu tiên 9.3 rồi tạo ticket nếu chưa phân định được. R1 chưa có Fact INDEPENDENT ngoài Claim, nên chưa phát sinh ticket (WP7b thuộc R2).
- **FR-K07.** Consumer (AskDecision, Context Builder, Readiness) đọc Fact qua một giao diện `FactReader` duy nhất trả về cả hai loại; consumer chỉ được phân biệt `kind` để hiển thị provenance.

**Sửa WP7a (mục 18):** thay "projection từ ProfileValue" bằng "`FactReader` + view PROJECTED (ProfileValue, Product) + bảng `facts` chỉ cho Claim/INDEPENDENT; không migration bảng cho PROJECTED". Tiêu chí hoàn tất: mục 9.2, 9.4, FR-K01..K07.

---

## 4. PATCH P4 — Hai `ux_contract` hoàn chỉnh (thay `{ ... }` trong 11.1)

### 4.1 `landing_page`

```yaml
ux_contract:
  version: 2
  execution_mode: {default: manual, allowed: [manual, automatic]}   # trang công khai: mặc định để người dùng xem từng bước
  entry: {screen: readiness_gate, max_recommendations_shown: 3}
  inputs:
    - {id: pick_products, kind: choose_product, decision: D-CHOOSE-PRODUCT, multi: true, required: true}
    - {id: pick_occasion, kind: choose_option,  decision: D-CHOOSE-OPTION,  taxonomy: occasion, required: false}
    - {id: pick_assets,   kind: asset_picker,   decision: D-SELECT-ASSETS,  required: true, preview: true, override: true}
  states:
    BLOCKED:                    {screen: gap_resolver, can_run: false, resolve: inline, return_to: journey}
    READY_WITH_RECOMMENDATIONS: {screen: run_panel,    can_run: true,  banner: top_recommendations}
    READY:                      {screen: run_panel,    can_run: true}
  confirmations: [{when: ask_decision == CONFIRM, ui: inline_confirm_chip}]
  result: {show_provenance: true, label_ai_content: true, show_excluded: summary, on_regenerate: reuse_context}
  device: {mobile_first: true}
```

### 4.2 `social_post`

```yaml
ux_contract:
  version: 2
  execution_mode: {default: automatic, allowed: [manual, automatic]}   # bài ngắn, tạo nhanh; vẫn không tự đăng (D-PUBLISH-OUTPUT)
  entry: {screen: readiness_gate, max_recommendations_shown: 3}
  inputs:
    - {id: pick_channel,       kind: choose_channel, decision: D-CHOOSE-CHANNEL, required: true}
    - {id: pick_product,       kind: choose_product, decision: D-CHOOSE-PRODUCT, multi: false, required: false}
    - {id: pick_occasion,      kind: choose_option,  decision: D-CHOOSE-OPTION,  taxonomy: occasion,      required: false}
    - {id: pick_content_style, kind: choose_option,  decision: D-CHOOSE-OPTION,  taxonomy: content_style, required: false}
    - {id: pick_assets,        kind: asset_picker,   decision: D-SELECT-ASSETS,  required: false, preview: true, override: true}
  states:
    BLOCKED:                    {screen: gap_resolver, can_run: false, resolve: inline, return_to: journey}
    READY_WITH_RECOMMENDATIONS: {screen: run_panel,    can_run: true,  banner: top_recommendations}
    READY:                      {screen: run_panel,    can_run: true}
  confirmations: [{when: ask_decision == CONFIRM, ui: inline_confirm_chip}]
  result: {show_provenance: true, label_ai_content: true, show_excluded: summary, on_regenerate: reuse_context}
  device: {mobile_first: true}
```

**Kiểm chứng hành vi `automatic` trên `social_post`** (thử nghiệm cho FR-J09 và FR-J13)

1. Mở Journey: `readiness_gate` đánh giá yêu cầu `$channel` trên `[facebook, instagram, tiktok]` (FR-J13); thiếu `display_name` hoặc `business_types` → `BLOCKED` (hard).
2. `pick_channel` (USER) vẫn hiển thị dù đang `automatic`.
3. `pick_product`, `pick_occasion`, `pick_content_style`, `pick_assets` (SHARED): hệ thống tự giải quyết hoặc bỏ qua (optional không có mặc định); không hiện bước.
4. Selector trả rỗng và `pick_assets` là `required: false` → bỏ qua, bài chỉ gồm chữ, trạng thái `READY_WITH_RECOMMENDATIONS` (khớp mục 11.1).
5. Kết quả hiển thị trong `result_with_provenance` cùng nút ghi đè cho các lựa chọn tự động. Đăng bài là việc của người dùng.

---

## 5. PATCH P5 — Ghi chú tương thích cho các mục đã có

- **Mục 0, quy tắc 7:** thêm "Journey shell chỉ dùng màn hình trong tập chuẩn (FR-J10) và `InputKind` chuẩn (FR-J11); quyền quyết định theo Decision Registry (11.5)".
- **Mục 3:** không thêm INV mới; FR-D04 là phép kiểm thử cụ thể của INV-09/INV-13.
- **Mục 11.3 (AskDecision):** thêm một dòng "`CONFIRM` thuộc `D-CONFIRM-EXPIRING` (USER) hoặc `D-CONFIRM-DERIVED` (SHARED); cả hai không bị bỏ qua bởi `execution_mode: automatic` ở trạng thái `locked`" — lưu ý cả hai decision này hiện `locked: false`, nên `D-CONFIRM-DERIVED` có thể tự áp dụng mặc định trong `automatic` còn `D-CONFIRM-EXPIRING` thì không (USER).
- **WP8:** thêm vào Tiêu chí: FR-J09..J13, FR-D01..D06, Decision Registry seed + lint.
- **WP10:** Journey shell sinh từ `ux_contract` v2; thêm bộ chuyển `manual/automatic` ở `run_panel`.
- **Mục 5.10:** sửa câu "Giá khi user nhập tạo `Fact(...)`" thành "Giá của Product được chiếu thành Fact `PROJECTED` (mục 5.6); dùng công khai qua Claim `INDEPENDENT` (`claim_type=price`)".
- **Mục 14 và ADR-007:** rà lại các tham chiếu pháp lý (xem ADR-006, mục 7.3).

---

## 6. Kịch bản Gherkin bổ sung (thêm vào mục 17)

```gherkin
@R1
Scenario: Chế độ automatic không vượt qua BLOCKED
  Given Shop thiếu field hard "business_types"
  And user chọn execution_mode = automatic cho Journey "social_post"
  When user mở Journey
  Then readiness = BLOCKED và hiển thị gap_resolver
  And hệ thống không tự giải quyết bất kỳ input nào

@R1
Scenario: Automatic vẫn hỏi quyết định thuộc USER
  Given Journey "social_post" ở execution_mode = automatic
  When user vào Journey
  Then bước "pick_channel" được hiển thị
  And "pick_assets" không hiển thị mà được tự chọn

@R1
Scenario: Không tự phát hành output
  Given Journey đã sinh xong nội dung ở chế độ automatic
  Then hệ thống KHÔNG đăng lên kênh nào cho đến khi user thực hiện D-PUBLISH-OUTPUT
  And AuditEvent của lần đăng có decided_by = user_confirm

@R1
Scenario: Ghi đè quyết định SHARED được audit đúng
  Given hệ thống tự chọn 4 asset cho "pick_assets"
  When user thay 1 asset
  Then có AuditEvent đề xuất (actor_type = system) và AuditEvent quyết định (actor_type = user, decided_by = user_override)

@R1
Scenario: Manifest không được nới quyền
  Given manifest khai báo ownership_override {D-PERM-GRANT: SHARED}
  When chạy lint CI
  Then lint thất bại với lỗi FR-D02/FR-D03

@R1
Scenario: Fact PROJECTED chỉ đọc
  Given ProfileValue "phone" đã có
  When client gọi Knowledge API sửa Fact của "phone"
  Then nhận 409 PROJECTED_READ_ONLY
  When user sửa "phone" qua Profile API
  Then Fact PROJECTED phản ánh giá trị mới
  And chỉ có AuditEvent của ProfileValue

@R1
Scenario: Công bố công khai theo publication_policy
  Given "phone" có publication_policy = public_on_declare và verification = SELF_DECLARED
  And "guarantees" có publication_policy = claim_required
  When buildContext cho kênh facebook
  Then "phone" nằm trong khối business
  And "guarantees" chỉ vào approved_claims khi có Claim APPROVED

@R1
Scenario: Claim cũ khi nguồn đổi giá
  Given Claim giá có basis_fact_id trỏ tới giá PROJECTED của Product P
  When user đổi giá của P
  Then Claim chuyển NEEDS_REVIEW và sinh Recommendation factual_safety

@R2
Scenario: Fact DERIVED không gây ticket đối đầu ProfileValue
  Given ProfileValue "business_types" khác Fact INDEPENDENT DERIVED cùng predicate
  When buildContext
  Then Context dùng ProfileValue
  And không tạo ConflictTicket
  And sinh Recommendation đề xuất rà soát (D-PROMOTE-FACT)

@R1
Scenario: Tham số $channel không gây BLOCKED
  Given Journey "social_post" chưa chọn kênh
  When mở Journey
  Then yêu cầu soft liên quan $channel được đánh giá trên facebook, instagram, tiktok
  And readiness không bao giờ là BLOCKED vì lý do này
```

---

## 7. ADR — hồ sơ quyết định (cho mục 19)

### 7.1 ADR-001 — Một Tenant có nhiều Shop

| Mục | Nội dung |
| --- | --- |
| Trạng thái | **PROPOSED** (khuyến nghị DECIDED). Chủ sở hữu ký: `[tên / ngày]` |
| Quyết định đề xuất | **Có.** `tenant_id` và `shop_id` là hai khóa tách biệt trên mọi bảng nghiệp vụ |
| Lý do | Chi phí khi làm ngay gần bằng 0; đổi sau (thêm `shop_id`, sửa phạm vi RBAC, sửa khóa duy nhất) rất đắt và ảnh hưởng dữ liệu đã có |
| Hệ quả cho R1 | UI chỉ cần một Shop mặc định; schema, API, `Audit`, `evaluateUsage` đều mang `shop_id` |
| Quy tắc kèm theo | (1) Asset, Fact, ProfileValue thuộc đúng một Shop; **không chia sẻ chéo Shop** ở R1 (thư viện chung cho chuỗi là FUTURE). (2) Vai trò `owner/admin` gán theo `(tenant_id, shop_id | *)`; `*` = toàn Tenant. (3) Taxonomy dùng chung toàn hệ thống (không thuộc Shop). (4) Test cross-tenant và cross-shop (WP1) |
| Điều kiện đảo ngược | Khó. Chỉ chấp nhận ADR mới kèm kế hoạch migration |
| Tác động lên | WP1 (hết bị chặn), WP4, WP6a, WP7a |

### 7.2 ADR-006 — Vùng lưu trữ dữ liệu

| Mục | Nội dung |
| --- | --- |
| Trạng thái | **PROPOSED**. Chủ sở hữu ký: `[tên / ngày]`. Pháp chế xác nhận: `[tên / ngày]` |
| Quyết định đề xuất | **Phương án A cho R1:** dữ liệu gốc (CSDL, object storage, backup, log có dữ liệu cá nhân) đặt tại nhà cung cấp có trung tâm dữ liệu tại Việt Nam: `[điền nhà cung cấp / vùng]` |
| Phạm vi "xử lý" | ADR bao gồm cả **nơi xử lý** của mọi bên thứ ba (quét virus, CDN, email/SMS, AI provider), không chỉ nơi lưu |
| Quy tắc kèm theo | (1) Worker quét/trích xuất của WP4 chạy trong vùng. (2) CDN cho asset công khai: cấu hình không cache ra ngoài vùng khi asset có chủ thể; asset chỉ nội bộ không qua CDN. (3) **Không có tiến trình nào gửi dữ liệu cá nhân hoặc ảnh ra ngoài vùng** cho tới khi có Addendum (7.3). (4) `tenant.data_region` là cấu hình và lớp truy cập lưu trữ là adapter, để đổi vùng không phải viết lại |
| Hệ quả cho R1 | R1 không có phân tích AI (WP5), nên R1 chỉ cần quyết định vùng lưu và xử lý nội bộ |
| Addendum bắt buộc trước WP5 (R2) | Vị trí AI provider và việc gửi ảnh/văn bản ra khỏi vùng: chọn **A** (provider trong nước) hoặc **B** (ngoài nước kèm hồ sơ đánh giá tác động chuyển dữ liệu xuyên biên giới). Mặc định deny cho asset có `AssetSubject` |
| Điều kiện đảo ngược | Tốn kém (di chuyển dữ liệu) |
| Tác động lên | WP4 (hết bị chặn), NFR, SEC |

### 7.3 Việc pháp chế cần xác nhận (không thuộc phạm vi kiến trúc)

Theo thông tin công khai, Luật Bảo vệ dữ liệu cá nhân có hiệu lực từ 01/01/2026 và đã có nghị định hướng dẫn (Nghị định 356/2025/NĐ-CP); đồng thời nghĩa vụ lưu trữ dữ liệu người dùng dịch vụ internet tại Việt Nam theo Nghị định 53/2022 vẫn là một căn cứ cần xét. Tài liệu hiện viện dẫn NĐ 13/2023 trong ADR-007 và mục 14. Cần pháp chế xác nhận: (1) văn bản hiện hành áp dụng; (2) có thuộc diện bắt buộc lưu trong nước hay không; (3) hồ sơ đánh giá tác động chuyển dữ liệu xuyên biên giới khi dùng nhà cung cấp ngoài nước; (4) cập nhật tham chiếu ở ADR-007, mục 14 và Phụ lục. Tôi không phải luật sư; nội dung ở đây không thay thế ý kiến pháp lý.

### 7.4 Bảng mục 19 (thay thế)

Thêm cột `Status`. Dòng thay đổi:

| ADR | Câu hỏi | Class | Chặn | Status | Giả định mặc định | Đảo ngược |
| --- | --- | --- | --- | --- | --- | --- |
| ADR-001 | Một Tenant có nhiều Shop? | BLOCKING | WP1 | `PROPOSED` → `DECIDED` khi ký | Có (mục 7.1) | Khó |
| ADR-006 | Vùng lưu trữ và xử lý dữ liệu | BLOCKING | WP4 | `PROPOSED` → `DECIDED` khi ký + pháp chế xác nhận | Phương án A (mục 7.2) | Tốn kém |
| ADR-007 | Phạm vi áp dụng luật bảo vệ dữ liệu cá nhân với ảnh khách/nhân viên/trẻ em; consent | BLOCKING | WP6b (R2) | `OPEN` (rà lại tham chiếu pháp lý, 7.3) | Core fail-closed (INV-13); `consent-vn` thận trọng, `minor_policy=deny_public` | Khó |

Các ADR còn lại giữ nguyên, thêm `Status = DECIDED` cho nhóm NON_BLOCKING đã có giả định mặc định và `FUTURE` cho ADR-005, ADR-008.

**Điều kiện khóa FINAL (thay thế):** ADR-001 và ADR-006 `DECIDED`; tất cả mục ở mục 9 của patch này đạt.

---

## 8. Phụ lục D — Nhật ký thay đổi v2.2 → v2.3 (FINAL)

| # | Thay đổi | Mục |
| --- | --- | --- |
| 1 | Thêm `execution_mode: manual \| automatic` vào `ux_contract`; bỏ `mode: auto_with_override`; FR-J09 | 11.4 |
| 2 | Thêm Decision Ownership `USER/SYSTEM/SHARED`, Decision Registry, FR-D01..D06; mở rộng AuditEvent | 11.5, 5.7 |
| 3 | Làm rõ Fact `PROJECTED` vs `INDEPENDENT`; view không bảng; FR-K02..K07; ProfileValue có `source_type` | 5.6, 5.2, 9.3, 9.4 |
| 4 | Vá `ux_contract`: hợp nhất tên màn hình (`run_panel`), định nghĩa `InputKind`, FR-J10..J13 | 11.4 |
| 5 | Điền `ux_contract` đầy đủ cho `landing_page` và `social_post` | 11.1 |
| 6 | ADR-001 và ADR-006 có hồ sơ quyết định; thêm cột `Status`; ADR-006 mở rộng sang nơi xử lý | 19 |
| 7 | Gherkin bổ sung cho các thay đổi trên | 17 |

**Mâu thuẫn đã xử lý**

| # | Mâu thuẫn trong v2.2 | Cách xử lý |
| --- | --- | --- |
| 1 | `states` dùng tên màn hình không có trong tập chuẩn | Hợp nhất thành `run_panel` + `banner` |
| 2 | FR-J08 cần "tập chuẩn" `inputs[].kind` nhưng chưa định nghĩa | Thêm `InputKind` đóng |
| 3 | `ux_contract: { ... }` trong hai manifest MVP | Điền đầy đủ (mục 4) |
| 4 | FR-K01 nói Fact là projection chỉ đọc nhưng 9.2 thao tác trên Fact | `kind` + FR-K02 |
| 5 | Giá Product tạo Fact nhưng Product không phải ProfileValue | `projection_of.source_kind` có `product` |
| 6 | `$channel` chưa có quy tắc đánh giá lúc mở Journey | FR-J13 |
| 7 | ADR-006 chỉ nói lưu trữ, bỏ sót nơi xử lý (AI/CDN) | Mở rộng phạm vi |

**Header thay đổi:** `Phiên bản: 2.3.0`; `Trạng thái: FINAL khi ADR-001 và ADR-006 DECIDED` (đổi từ "RELEASE CANDIDATE 3").

---

## 9. Checklist khóa FINAL

- [ ] P1–P5 và Phụ lục D đã gộp vào file chính; số thứ tự mục/FR không trùng.
- [ ] Hai manifest MVP qua lint FR-J08 mở rộng (FR-J09..J13, FR-D02).
- [ ] Decision Registry seed qua lint FR-D04 (không có decision đổi verification/publication/permission/phát hành mà không phải USER).
- [ ] Các kịch bản Gherkin ở mục 6 đã được thêm vào mục 17 và R1 đạt/kiểm thử được.
- [ ] ADR-001 `DECIDED` (có chữ ký).
- [ ] ADR-006 `DECIDED` (có chữ ký chủ sở hữu và xác nhận pháp chế; điền nhà cung cấp/vùng).
- [ ] Tham chiếu pháp lý trong ADR-007 và mục 14 đã được rà (7.3), hoặc ghi rõ là việc tồn đọng của R2.
- [ ] Tạo tag `FLORAOS_CORE_ARCHITECTURE_FINAL` (v2.3.0). Từ đây: thay đổi Core chỉ qua ADR mới, không nâng version kiến trúc.

---

## 10. Giả định tôi đã đặt (cần chủ sở hữu duyệt hoặc sửa)

1. **`execution_mode` nghĩa là gì:** `automatic` = hệ thống tự giải quyết các input thuộc SYSTEM/SHARED, người dùng chỉ trả lời quyết định USER. Nếu bạn muốn nghĩa khác (ví dụ chạy hoàn toàn không tương tác), P1 cần sửa.
2. **Mặc định mode:** `landing_page` = manual, `social_post` = automatic. Đây là lựa chọn sản phẩm, đổi dễ.
3. **Xung đột PROJECTED vs DERIVED/OBSERVED:** dùng Recommendation, không dùng `ConflictTicket` (FR-K06). Đây là hướng tôi đã nêu trong tin nhắn trước.
4. **`source_type` enum** `(user_input|import|ai_inferred|observed)` là giả định vì v2.2 chưa có enum này.
5. **RBAC theo `(tenant_id, shop_id | *)`** trong ADR-001 là đề xuất; v2.2 chưa nói phạm vi vai trò.
6. **`choose_product multi: true` ở landing_page chưa có giới hạn số lượng.** Nếu cần `max`, hãy thêm.
7. **Danh mục Decision Registry** (mục 2) là bản tôi suy ra từ các quy tắc đã có; một số dòng (`D-CHOOSE-OPTION`, `D-LINK-ASSET`, `D-PROMOTE-FACT`) là mới.
8. **ADR-006 phương án A và nhà cung cấp/vùng:** tôi không chọn được nhà cung cấp thay bạn; trường `[điền]` để trống có chủ ý.
