# ALG JOURNEY-FIRST UX — ĐẶC TẢ TẠO LANDING PAGE & CATALOG SỐ

**Mã tài liệu:** `DOC-05-SPEC-JOURNEY-LANDING-CATALOG-REQUIREMENTS` · **Trạng thái:** `CANONICAL` — đặc tả yêu cầu chuẩn (PO chọn 08/11/2026)  
**Bản đồ mã (tệp nào làm phần nào):** [`ALG_JOURNEY_FIRST_UX_LANDING_AND_CATALOG_SPEC.md`](./ALG_JOURNEY_FIRST_UX_LANDING_AND_CATALOG_SPEC.md)  
**Loại tài liệu:** SSOT — Product / UX / AI Agent Implementation Specification  
**Hệ thống:** `floraos-core`  
**Phạm vi:** Tạo Landing Page và Tạo Catalog Số  
**Ngôn ngữ UI/copy:** 100% tiếng Việt  
**Trạng thái:** Final — Execution Ready  
**Mục tiêu:** Cho phép AI Agent hiểu, thiết kế và triển khai đúng UX Journey, business flow và technical boundaries.

---

# 1. MỤC TIÊU

ALG có hai User Goal độc lập:

1. **Tạo Landing Page**
2. **Tạo Catalog Số**

Hai User Goal này là **hai Journey nghiệp vụ riêng biệt**.

Không được gom hai Journey thành một flow chung chỉ vì chúng có một số UI hoặc capability dùng chung.

Mỗi Journey có hai Execution Mode:

- **⚡ AI làm cho tôi** — Autonomous Execution.
- **🛠️ Tôi muốn tự chọn từng bước** — Guided Execution.

Flow chuẩn của mỗi Journey:

```text
USER GOAL
    ↓
CHỌN EXECUTION MODE
    ↓
NHẬP RAW INPUT
    ↓
EXECUTION
    ↓
RESULT
    ↓
REVIEW / EDIT
    ↓
PUBLISH
    ↓
NEXT BEST ACTIONS
```

**Quy tắc bắt buộc:**

> User phải chọn Execution Mode trước khi hệ thống yêu cầu bộ input chính của Journey.

---

# 2. PHẠM VI

## 2.1. In Scope

### Journey A — Tạo Landing Page

Bao gồm:

- Chọn Execution Mode.
- Tiếp nhận raw input.
- Autonomous Execution.
- Guided Execution.
- Phân tích input.
- Tạo nội dung.
- Tạo cấu trúc Landing Page.
- Xử lý media khi cần.
- Preview.
- Review.
- Edit.
- Publish.
- QR.
- Next Best Actions.
- Error / Recovery.
- State management.

### Journey B — Tạo Catalog Số

Bao gồm:

- Chọn Execution Mode.
- Tiếp nhận raw input.
- Autonomous Execution.
- Guided Execution.
- Chọn và tổ chức sản phẩm.
- Tạo cấu trúc Catalog.
- Chọn layout/style.
- Tạo lời giới thiệu và mô tả khi cần.
- Preview.
- Review.
- Edit.
- Publish.
- QR.
- Next Best Actions.
- Error / Recovery.
- State management.

---

# 3. NGOÀI PHẠM VI

Không được tự mở rộng scope sang:

- Quản trị toàn bộ Media Library.
- Quản trị toàn bộ sản phẩm.
- Quản trị chiến dịch Marketing tổng thể.
- Analytics nâng cao sau publish.
- A/B testing.
- AI Learning Engine hoàn chỉnh.
- CRM.
- Order Management.

Các chức năng trên chỉ được gọi khi đã tồn tại và được xác định là dependency.

---

# 4. KIẾN TRÚC TỔNG THỂ

```text
ALG
│
├── USER GOAL A: TẠO LANDING PAGE
│   │
│   ├── ⚡ AUTONOMOUS
│   │   └── Landing Page Autonomous Journey
│   │
│   └── 🛠️ GUIDED
│       └── Landing Page Guided Journey
│
└── USER GOAL B: TẠO CATALOG SỐ
    │
    ├── ⚡ AUTONOMOUS
    │   └── Catalog Autonomous Journey
    │
    └── 🛠️ GUIDED
        └── Catalog Guided Journey
```

## 4.1. Quy tắc kiến trúc

- Landing Page và Catalog là hai business Journey độc lập.
- Không dùng một Wizard chung để điều khiển cả hai.
- Không ép hai Journey có cùng sequence nghiệp vụ.
- Có thể reuse UI components nếu component thực sự generic.
- Có thể reuse AI capabilities nếu capability phù hợp.
- Có thể reuse infrastructure.
- Reuse capability không đồng nghĩa với reuse business Journey.
- Autonomous và Guided dùng chung capability layer khi phù hợp.
- Execution Mode chỉ quyết định **ai điều khiển quá trình thực hiện**.

---

# 5. BẢY NGUYÊN TẮC JOURNEY-FIRST

## J1 — Choose Before Input

User chọn Execution Mode trước khi nhập bộ raw input chính.

UI đầu tiên của mỗi Journey phải hỏi:

> **Bạn muốn thực hiện như thế nào?**

Hai lựa chọn:

### ⚡ AI làm cho tôi

> Bạn đưa những gì đang có. ALG tự thực hiện toàn bộ công việc và đưa cho bạn kết quả hoàn chỉnh để kiểm tra.

### 🛠️ Tôi muốn tự chọn từng bước

> Bạn đưa những gì đang có. Sau đó tự chọn từng việc ALG thực hiện.

---

## J2 — Raw Input First, Detailed Configuration Later

Sau khi chọn Mode, hệ thống yêu cầu user đưa những dữ liệu gốc mà họ đang có.

Không bắt user cấu hình chi tiết trước khi hệ thống có raw input, trừ khi một input là bắt buộc để bắt đầu Journey.

---

## J3 — Progressive Disclosure

Chỉ hiển thị thông tin và thao tác cần thiết ở trạng thái hiện tại.

Không hiển thị toàn bộ cấu hình của Landing Page hoặc Catalog ngay từ đầu.

---

## J4 — Autonomous Execution

Trong Autonomous Mode:

- AI tự xác định các capability cần dùng.
- AI tự quyết định thứ tự.
- AI được phép bỏ qua capability không cần thiết.
- AI được phép retry các bước có thể retry.
- AI tạo output hoàn chỉnh.
- User không phải chọn từng bước.

---

## J5 — Guided Execution

Trong Guided Mode:

- Hệ thống hiển thị capability khả dụng.
- User chọn capability tiếp theo.
- Hệ thống thực hiện capability đó.
- Hệ thống hiển thị kết quả.
- User quyết định bước tiếp theo.
- AI không tự chuyển sang capability tiếp theo nếu chưa có lựa chọn của user.

---

## J6 — Human Review Before Publish

Mọi output phải có trạng thái Review/Edit trước Publish.

Không publish output AI chỉ vì AI đã hoàn thành pipeline.

---

## J7 — Result Leads to Next Action

Sau khi tạo kết quả, hệ thống phải đưa ra các hành động tiếp theo phù hợp.

Ví dụ:

- Chỉnh sửa.
- Xuất bản.
- Copy link.
- Tạo QR.
- Gửi Zalo.
- Kết nối Chatbot.
- Tạo bài đăng.
- Tạo video.

Chỉ hiển thị Next Best Actions thực sự khả dụng.

---

# 6. JOURNEY CONTRACT

Mỗi Journey phải có các thành phần sau:

| Thành phần | Landing Page | Catalog |
|---|---|---|
| User Goal | Tạo Landing Page | Tạo Catalog Số |
| Entry | Marketing → Landing Page | Marketing → Catalog |
| Execution Modes | Autonomous / Guided | Autonomous / Guided |
| Raw Input | Media, text, product, URL, note | Product, media, price/filter, text, note |
| Primary Output | Landing Page | Catalog |
| Review | Có | Có |
| Edit | Có | Có |
| Publish | Có | Có |
| QR | Có | Có |
| Next Actions | Có | Có |
| Management | Journey riêng | Journey riêng |

---

# 7. JOURNEY A — TẠO LANDING PAGE

## 7.1. User Goal

User muốn tạo một Landing Page có thể sử dụng để giới thiệu hoặc bán sản phẩm/dịch vụ hoa.

Output phải là một Landing Page hoàn chỉnh có thể Preview và Publish.

---

# 8. LANDING PAGE — ENTRY

Khi user mở:

> **Marketing → Landing Page → Tạo mới**

Màn hình đầu tiên:

```text
TẠO LANDING PAGE

Bạn muốn ALG thực hiện như thế nào?

⚡ AI làm cho tôi
Đưa những gì bạn đang có. ALG tự làm toàn bộ.

🛠️ Tôi muốn tự chọn từng bước
Đưa những gì bạn đang có. Sau đó tự chọn từng việc.
```

Không hiển thị form cấu hình Landing Page đầy đủ tại màn hình này.

---

# 9. LANDING PAGE — AUTONOMOUS JOURNEY

## 9.1. Flow

```text
SELECT_AUTONOMOUS
    ↓
COLLECT_RAW_INPUT
    ↓
VALIDATE_INPUT
    ↓
ANALYZE_INPUT
    ↓
PLAN_LANDING_PAGE
    ↓
EXECUTE_REQUIRED_CAPABILITIES
    ↓
COMPOSE_LANDING_PAGE
    ↓
QA
    ↓
SHOW_RESULT
    ↓
REVIEW / EDIT
    ↓
PUBLISH
    ↓
NEXT BEST ACTIONS
```

## 9.2. Raw Input

Có thể nhận:

- Ảnh.
- Video.
- Text.
- URL.
- Sản phẩm có sẵn trong hệ thống.
- Ghi chú.
- File liên quan.

Không bắt buộc user phải cung cấp tất cả.

Hệ thống phải xác định input tối thiểu để bắt đầu.

## 9.3. AI Processing

AI có thể thực hiện:

1. Phân tích ảnh.
2. Nhận diện sản phẩm/hoa.
3. Lấy dữ liệu sản phẩm.
4. Xác định chủ đề/dịp từ input.
5. Đề xuất cấu trúc Landing Page.
6. Tạo headline.
7. Tạo nội dung.
8. Chọn/sắp xếp sản phẩm.
9. Xử lý media.
10. Tạo CTA.
11. Compose Landing Page.
12. QA.

AI không bắt buộc chạy toàn bộ các capability trên.

AI phải chọn capability dựa trên input thực tế.

## 9.4. Output

Output tối thiểu:

```text
LandingPage
├── title
├── hero
├── sections[]
├── products[]
├── media[]
├── CTA
├── metadata
└── publish_config
```

## 9.5. Review

Sau khi hoàn thành, hiển thị:

> **Landing Page đã được tạo**

Cho phép:

- Xem Preview.
- Chỉnh sửa.
- Quay lại input.
- Tạo lại một phần.
- Publish.

---

# 10. LANDING PAGE — GUIDED JOURNEY

## 10.1. Flow

```text
SELECT_GUIDED
    ↓
COLLECT_RAW_INPUT
    ↓
VALIDATE_INPUT
    ↓
SHOW_AVAILABLE_CAPABILITIES
    ↓
USER_SELECTS_CAPABILITY
    ↓
EXECUTE_CAPABILITY
    ↓
SHOW_RESULT
    ↓
USER_REVIEWS
    ↓
USER_SELECTS_NEXT_ACTION
    ↓
...
    ↓
READY_TO_PUBLISH
    ↓
REVIEW / EDIT
    ↓
PUBLISH
```

## 10.2. Capability có thể hiển thị

Tùy input hiện có:

- 🧠 Phân tích sản phẩm.
- 🖼️ Xử lý hình ảnh.
- ✍️ Tạo nội dung.
- 🎨 Chọn phong cách.
- 📄 Tạo Landing Page.
- 🎬 Tạo Video.
- 📣 Tạo bài đăng.

Không hiển thị capability không khả dụng.

## 10.3. Quy tắc

Sau mỗi capability:

```text
RESULT
    ↓
USER REVIEW
    ↓
NEXT ACTION
```

User có quyền:

- Chấp nhận.
- Sửa.
- Tạo lại.
- Bỏ qua.
- Chọn capability tiếp theo.

---

# 11. JOURNEY B — TẠO CATALOG SỐ

## 11.1. User Goal

User muốn tạo một Catalog Số để khách xem và lựa chọn sản phẩm.

Catalog là một sản phẩm khác với Landing Page.

Không reuse Landing Page business flow.

---

# 12. CATALOG — ENTRY

Khi user mở:

> **Marketing → Catalog Số → Tạo mới**

Màn hình đầu tiên:

```text
TẠO CATALOG SỐ

Bạn muốn ALG thực hiện như thế nào?

⚡ AI làm cho tôi

🛠️ Tôi muốn tự chọn từng bước
```

Sau khi chọn Mode mới yêu cầu input.

---

# 13. CATALOG — AUTONOMOUS JOURNEY

## 13.1. Flow

```text
SELECT_AUTONOMOUS
    ↓
COLLECT_RAW_INPUT
    ↓
VALIDATE_INPUT
    ↓
ANALYZE_PRODUCTS
    ↓
PLAN_CATALOG
    ↓
SELECT / GROUP PRODUCTS
    ↓
CREATE_CONTENT_IF_NEEDED
    ↓
SELECT_LAYOUT
    ↓
COMPOSE_CATALOG
    ↓
QA
    ↓
SHOW_RESULT
    ↓
REVIEW / EDIT
    ↓
PUBLISH
    ↓
NEXT BEST ACTIONS
```

## 13.2. Raw Input

Có thể nhận:

- Danh sách sản phẩm.
- Ảnh sản phẩm.
- Giá.
- Nhóm sản phẩm.
- Khoảng giá.
- Dịp bán.
- Text.
- Ghi chú.

Ví dụ:

> “Tạo catalog hoa 20/10 dưới 1 triệu.”

AI có thể suy ra:

- Dịp.
- Bộ lọc giá.
- Nhóm sản phẩm.
- Cách sắp xếp.

Không yêu cầu user nhập lại các thông tin AI đã xác định được từ input nếu không cần thiết.

## 13.3. AI Processing

AI có thể:

1. Phân tích sản phẩm.
2. Lọc sản phẩm.
3. Nhóm sản phẩm.
4. Sắp xếp sản phẩm.
5. Chọn layout.
6. Tạo lời giới thiệu.
7. Tạo mô tả sản phẩm.
8. Xử lý media.
9. Compose Catalog.
10. QA.

---

# 14. CATALOG — GUIDED JOURNEY

Sau raw input, hiển thị capability phù hợp.

Ví dụ:

```text
Bạn muốn làm gì tiếp theo?

📦 Chọn sản phẩm
💰 Lọc theo giá
🗂️ Nhóm sản phẩm
🎨 Chọn phong cách
↕️ Sắp xếp sản phẩm
✍️ Tạo lời giới thiệu
📝 Tạo mô tả
📚 Tạo Catalog
```

User có thể thực hiện theo thứ tự họ muốn nếu dependency cho phép.

Ví dụ:

```text
Chọn sản phẩm
    ↓
Lọc giá
    ↓
Chọn phong cách
    ↓
Tạo Catalog
```

Hoặc:

```text
Chọn sản phẩm
    ↓
Tạo mô tả
    ↓
Nhóm sản phẩm
    ↓
Tạo Catalog
```

Hệ thống phải ngăn những thao tác không thể thực hiện vì thiếu dependency.

---

# 15. CHUYỂN ĐỔI EXECUTION MODE

Hỗ trợ chuyển mode khi trạng thái dữ liệu cho phép.

## 15.1. Autonomous → Guided

Ví dụ:

```text
AI đã tạo Landing Page
        ↓
User chọn:
"🛠️ Tự chỉnh từng bước"
        ↓
Hiển thị các capability chỉnh sửa
```

Không được mất dữ liệu.

## 15.2. Guided → Autonomous

Ví dụ:

```text
User đã phân tích sản phẩm
        ↓
User chọn:
"⚡ AI làm tiếp phần còn lại"
        ↓
AI tiếp tục từ current state
```

Không yêu cầu user nhập lại raw input.

---

# 16. COMMON STATE MODEL

Mỗi Journey phải hỗ trợ state rõ ràng.

```text
INIT
  ↓
MODE_SELECTED
  ↓
INPUT_COLLECTING
  ↓
INPUT_READY
  ↓
EXECUTING
  ↓
RESULT_READY
  ↓
REVIEWING
  ↓
EDITING
  ↓
READY_TO_PUBLISH
  ↓
PUBLISHING
  ↓
PUBLISHED
```

## 16.1. Error State

```text
EXECUTING
    ↓
FAILED
    ├── RETRY
    ├── EDIT_INPUT
    ├── SKIP_CAPABILITY
    └── CONTINUE_MANUALLY
```

Không được làm mất:

- Raw input.
- Intermediate result đã hoàn thành.
- User edits.
- Current state.

---

# 17. INPUT CONTRACT

Input object phải có thể lưu và phục hồi.

Ví dụ:

```ts
type RawInput = {
  images: MediaRef[]
  videos: MediaRef[]
  texts: string[]
  urls: string[]
  products: ProductRef[]
  files: FileRef[]
  notes?: string
}
```

Không bắt buộc tất cả field phải có dữ liệu.

---

# 18. EXECUTION CONTEXT

Mỗi Journey phải có Execution Context.

```ts
type ExecutionContext = {
  journeyType: "landing_page" | "catalog"
  executionMode: "autonomous" | "guided"
  rawInput: RawInput
  currentState: JourneyState
  completedCapabilities: CapabilityResult[]
  currentOutput?: unknown
}
```

`journeyType` là bắt buộc.

Không được dùng một context mơ hồ cho cả Landing Page và Catalog.

---

# 19. CAPABILITY CONTRACT

Mỗi capability phải định nghĩa:

```text
Capability
├── id
├── name
├── purpose
├── requiredInputs
├── optionalInputs
├── output
├── dependencies
├── supportedJourneys
├── failureStates
└── retryPolicy
```

Ví dụ:

```text
Capability:
product_analysis

Supported:
- landing_page
- catalog

Input:
- image
- product data

Output:
- identified components
- product attributes
- confidence
```

Capability chỉ được gọi khi Journey hiện tại hỗ trợ capability đó.

---

# 20. HUMAN-IN-THE-LOOP

AI phải phân biệt:

### AI-generated data

Dữ liệu do AI tạo.

### User-confirmed data

Dữ liệu user đã xác nhận.

### User-edited data

Dữ liệu user đã chỉnh sửa.

### System data

Dữ liệu lấy từ hệ thống.

Không ghi đè `user-edited` bằng AI output nếu không có hành động xác nhận của user.

---

# 21. AI CONFIDENCE

Nếu AI phân tích dữ liệu có độ chắc chắn thấp, hệ thống phải đánh dấu để user review.

Ví dụ:

```text
Hoa hồng đỏ — 98% ✓
Lily trắng — 94% ✓
Eucalyptus — 67% ⚠
```

Không coi kết quả confidence thấp là dữ liệu đã được user xác nhận.

---

# 22. ERROR / RECOVERY

## 22.1. AI không nhận diện được

Hiển thị:

> Không thể xác định chính xác nội dung trong ảnh.

Actions:

- Thử lại.
- Upload ảnh khác.
- Tiếp tục thủ công.

## 22.2. AI generation thất bại

Actions:

- Retry.
- Chỉnh input.
- Bỏ qua capability.
- Chuyển sang Guided.

## 22.3. Publish thất bại

Không mất draft.

Actions:

- Retry.
- Save Draft.
- Edit.

---

# 23. REVIEW / EDIT

Review phải cho phép user kiểm tra output trước Publish.

Landing Page:

- Hero.
- Content.
- Product.
- Media.
- CTA.
- Sections.

Catalog:

- Title.
- Intro.
- Product list.
- Group.
- Layout.
- Product descriptions.
- Media.

User có thể chỉnh từng phần mà không cần tạo lại toàn bộ sản phẩm.

---

# 24. PUBLISH

Publish chỉ khả dụng khi:

- Output hợp lệ.
- Required fields đầy đủ.
- Không có blocking error.
- User đã qua Review.

Sau publish:

```text
PUBLISHED
    ↓
PUBLIC URL
    ↓
QR
    ↓
NEXT BEST ACTIONS
```

---

# 25. NEXT BEST ACTIONS

## Landing Page

Có thể:

- Copy link.
- Tạo QR.
- Gửi Zalo.
- In QR.
- Kết nối Chatbot.
- Tạo bài đăng.
- Tạo video.

## Catalog

Có thể:

- Copy link.
- Tạo QR.
- Gửi Zalo.
- In QR.
- Kết nối Chatbot.
- Tạo bài đăng.
- Tạo Landing Page từ Catalog nếu capability này được hỗ trợ.

Không hiển thị action không khả dụng.

---

# 26. UI COMPONENT ARCHITECTURE

Shared components được phép reuse:

```text
ExecutionModeSelector
RawInputDropzone
InputSummary
ProcessingState
CapabilitySelector
ResultPreview
ReviewPanel
EditPanel
PublishPanel
NextBestActions
ErrorRecovery
```

Các component riêng:

```text
LandingPageJourney
LandingPageAutonomousFlow
LandingPageGuidedFlow

CatalogJourney
CatalogAutonomousFlow
CatalogGuidedFlow
```

Không tạo một component kiểu:

```text
UniversalMarketingWizard
```

nếu component này khiến business logic của hai Journey bị trộn.

---

# 27. TECHNICAL ARCHITECTURE

Kiến trúc đề xuất:

```text
USER
 ↓
JOURNEY UI
 ↓
JOURNEY ORCHESTRATOR
 ├── LandingPageJourney
 │    ├── AutonomousFlow
 │    └── GuidedFlow
 │
 └── CatalogJourney
      ├── AutonomousFlow
      └── GuidedFlow
 ↓
CAPABILITY LAYER
 ├── Image Analysis
 ├── Product Analysis
 ├── Content Generation
 ├── Media Processing
 ├── Catalog Generation
 ├── Landing Page Generation
 ├── QR Generation
 └── Publishing
 ↓
DATA / STORAGE / EXTERNAL SERVICES
```

---

# 28. ORCHESTRATOR RULES

## Autonomous Orchestrator

Có quyền:

- đọc Execution Context;
- xác định capability;
- tạo execution plan;
- thực hiện chain;
- xử lý retry;
- kiểm tra dependency;
- tạo output.

## Guided Orchestrator

Có quyền:

- đọc Execution Context;
- xác định capability khả dụng;
- hiển thị lựa chọn;
- thực hiện capability user chọn;
- cập nhật state;
- chờ user quyết định tiếp.

Không tự tạo execution chain hoàn chỉnh.

---

# 29. DATA SAFETY RULES

AI Agent phải:

1. Không xóa raw input.
2. Không ghi đè user-edited data bằng AI output.
3. Không mất intermediate results khi một capability thất bại.
4. Lưu current state.
5. Cho phép resume Journey.
6. Không yêu cầu nhập lại dữ liệu đã có.
7. Giữ lịch sử thay đổi quan trọng nếu hệ thống hỗ trợ versioning.

---

# 30. ACCEPTANCE CRITERIA

## General

**AC-01**  
Mỗi Journey hiển thị Execution Mode trước Raw Input.

**AC-02**  
Có đúng hai lựa chọn chính:

- ⚡ AI làm cho tôi.
- 🛠️ Tôi muốn tự chọn từng bước.

**AC-03**  
Landing Page và Catalog có Journey riêng.

**AC-04**  
Hai Journey không chia sẻ business flow một cách máy móc.

**AC-05**  
Có thể reuse shared UI/infrastructure khi không làm thay đổi business logic.

---

## Autonomous

**AC-06**  
AI có thể hoàn thành toàn bộ Journey mà user không cần chọn từng capability.

**AC-07**  
AI có thể bỏ qua capability không cần thiết.

**AC-08**  
AI có thể retry lỗi có thể retry.

**AC-09**  
Output cuối được đưa vào Review.

---

## Guided

**AC-10**  
User nhìn thấy capability khả dụng sau khi input sẵn sàng.

**AC-11**  
User chọn capability tiếp theo.

**AC-12**  
Hệ thống không tự chuyển capability nếu chưa được user chọn.

**AC-13**  
User có thể review từng kết quả.

---

## Review / Publish

**AC-14**  
User có thể edit output.

**AC-15**  
Publish bị chặn nếu có blocking error.

**AC-16**  
Publish không làm mất draft.

**AC-17**  
Sau publish có Next Best Actions phù hợp.

---

## State

**AC-18**  
Journey có state rõ ràng.

**AC-19**  
Có thể resume sau lỗi.

**AC-20**  
Raw input không bị mất.

**AC-21**  
User edits không bị AI ghi đè ngoài ý muốn.

---

## Mode Switching

**AC-22**  
Autonomous → Guided không làm mất dữ liệu.

**AC-23**  
Guided → Autonomous tiếp tục từ current state.

**AC-24**  
Không yêu cầu nhập lại raw input khi chuyển mode.

---

# 31. EDGE CASES

AI Agent phải kiểm tra tối thiểu:

- Không có input.
- Chỉ có ảnh.
- Chỉ có text.
- Chỉ có sản phẩm.
- Có input không hợp lệ.
- Ảnh chất lượng thấp.
- AI không nhận diện được sản phẩm.
- Có sản phẩm trùng.
- Không có sản phẩm phù hợp.
- Capability phụ thuộc capability khác.
- Capability thất bại.
- Publish thất bại.
- User rời Journey giữa chừng.
- User quay lại draft.
- User chuyển Mode.
- User sửa AI output.
- User muốn tạo lại một section.
- User muốn giữ output cũ và tạo version mới.

---

# 32. KHÔNG ĐƯỢC LÀM

AI Agent không được:

- Gộp Landing Page và Catalog thành một Journey.
- Tạo một Wizard chung chứa business logic của cả hai.
- Bắt user cấu hình chi tiết trước khi chọn Execution Mode.
- Bắt user nhập lại dữ liệu đã có.
- Tự động thực hiện bước tiếp theo trong Guided Mode.
- Publish mà bỏ qua Review.
- Xóa raw input khi execution thất bại.
- Ghi đè user edits bằng AI output không có xác nhận.
- Tạo UI chỉ dựa trên cấu trúc database.
- Dùng số lượng dòng file làm tiêu chí duy nhất để xác định SRP.

---

# 33. SRP / FILE STRUCTURE

SRP phải được xác định theo **trách nhiệm UX hoặc nghiệp vụ**, không chỉ theo số dòng.

Một file/component nên có một trách nhiệm chính.

Ví dụ:

```text
landing/
├── landing-page-journey.tsx
├── landing-page-autonomous-flow.tsx
├── landing-page-guided-flow.tsx
├── landing-page-input.tsx
├── landing-page-preview.tsx
├── landing-page-review.tsx
└── landing-page-publish.tsx

catalog/
├── catalog-journey.tsx
├── catalog-autonomous-flow.tsx
├── catalog-guided-flow.tsx
├── catalog-input.tsx
├── catalog-preview.tsx
├── catalog-review.tsx
└── catalog-publish.tsx

shared/
├── execution-mode-selector.tsx
├── raw-input-dropzone.tsx
├── processing-state.tsx
├── review-panel.tsx
├── publish-panel.tsx
├── next-best-actions.tsx
└── error-recovery.tsx
```

Tên file thực tế có thể khác nếu codebase hiện tại đã có convention tốt hơn.

Không được đổi tên hoặc di chuyển file chỉ để đáp ứng tài liệu này nếu làm hỏng dependency hiện có.

---

# 34. IMPLEMENTATION ORDER

AI Agent nên triển khai theo thứ tự:

```text
1. Inspect existing codebase
       ↓
2. Identify current Landing Page flow
       ↓
3. Identify current Catalog flow
       ↓
4. Identify reusable components/services
       ↓
5. Define Journey state
       ↓
6. Implement Execution Mode selection
       ↓
7. Implement Landing Page Autonomous
       ↓
8. Implement Landing Page Guided
       ↓
9. Implement Catalog Autonomous
       ↓
10. Implement Catalog Guided
       ↓
11. Implement Review/Edit
       ↓
12. Implement Publish
       ↓
13. Implement Error/Recovery
       ↓
14. Implement Next Best Actions
       ↓
15. Run acceptance tests
```

Không rewrite toàn bộ codebase nếu không cần thiết.

Ưu tiên:

> **Wrap existing capability → orchestration → UX improvement**

thay vì:

> **Replace existing system.**

---

# 35. DEFINITION OF DONE

Feature chỉ được coi là hoàn thành khi:

- [ ] Landing Page là một Journey độc lập.
- [ ] Catalog là một Journey độc lập.
- [ ] Cả hai có Autonomous Mode.
- [ ] Cả hai có Guided Mode.
- [ ] Execution Mode xuất hiện trước Raw Input.
- [ ] Raw Input được lưu và phục hồi.
- [ ] Autonomous có thể tự thực hiện chain.
- [ ] Guided để user quyết định từng capability.
- [ ] Có Review/Edit.
- [ ] Có Publish.
- [ ] Có Error/Recovery.
- [ ] Có State rõ ràng.
- [ ] Có Next Best Actions.
- [ ] Không mất user edits.
- [ ] Không yêu cầu nhập lại dữ liệu khi chuyển Mode.
- [ ] Không trộn business logic Landing Page và Catalog.
- [ ] Shared components không làm mất tính độc lập của Journey.
- [ ] Acceptance Criteria được kiểm thử.
- [ ] Không có blocking error trước khi bàn giao.

---

# 36. TÓM TẮT KIẾN TRÚC CHỐT

```text
                    ALG
                       │
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
       TẠO LANDING PAGE      TẠO CATALOG
             │                   │
       ┌─────┴─────┐       ┌─────┴─────┐
       ▼           ▼       ▼           ▼
   ⚡ AI        🛠️ User   ⚡ AI       🛠️ User
   làm hết     tự chọn    làm hết    tự chọn
       │           │       │           │
       └─────┬─────┘       └─────┬─────┘
             │                   │
             ▼                   ▼
        LANDING PAGE          CATALOG
          RESULT              RESULT
             │                   │
             ▼                   ▼
        REVIEW / EDIT       REVIEW / EDIT
             │                   │
             ▼                   ▼
          PUBLISH             PUBLISH
             │                   │
             ▼                   ▼
       NEXT ACTIONS         NEXT ACTIONS
```

**Nguyên tắc cuối cùng:**

> **Hai User Goal khác nhau → hai Journey khác nhau.**
>
> **Mỗi Journey có hai Execution Mode.**
>
> **Execution Mode được chọn trước Raw Input.**
>
> **Autonomous = AI quyết định cách thực hiện.**
>
> **Guided = User quyết định bước tiếp theo.**
>
> **Capability có thể dùng chung; Business Journey không được gộp.**
>
> **Output luôn đi qua Review/Edit trước Publish.**
