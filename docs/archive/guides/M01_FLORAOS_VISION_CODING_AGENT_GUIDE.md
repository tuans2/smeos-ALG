# M01 — FloraOS Vision — Hướng dẫn Đồng bộ cho AI Coding Agent

**Version:** 1.2
**Ngày:** 2026-09-09 (cập nhật: đồng bộ với Kiến trúc V2 — repo core mới, quyết định D5-c và D6-1)
**Module:** **M01 — Product Image Analysis** (một trong 8 module của FloraOS, xem Mục 2 Kiến trúc hệ thống)
**Repo:** `floraos-core` (repo mới — xem `ALG_SAAS_TARGET_ARCHITECTURE_V2.md` mục 2). Repo `FloraOS` cũ đã nghỉ hưu và là **nguồn thu hoạch**, không phải nơi triển khai.

**Tài liệu cấp trên (bắt buộc tuân thủ):** `ALG_SAAS_TARGET_ARCHITECTURE_V2.md` · **Bản đồ thu hoạch:** `HARVEST_MANIFEST.md`
**Tài liệu kiến trúc module:** `ALG_AI_Vision_Architecture_V2_Canonical.md`
**Đối tượng sử dụng:** AI Coding Agent (Claude Code, Cursor, Copilot Agent, hoặc tương đương) khi thực thi task trên codebase `floraos-core`.

---

## 0. Nguyên tắc tổng quát

Tài liệu này **không thay thế** kiến trúc chuẩn — nó là **quy trình vận hành** để đảm bảo mọi thay đổi code do AI agent tạo ra luôn khớp với các tài liệu kiến trúc cấp trên.

### 0.1. Thang bậc tài liệu — tài liệu nào thắng khi mâu thuẫn

```text
CẤP 1 — HỆ THỐNG:  ALG_SAAS_TARGET_ARCHITECTURE_V2.md
   Thắng tuyệt đối về: phân bổ repo, multi-tenant (organization_id), RBAC,
   mô hình GenerationJob, Usage, Asset, Review & Approve, Experience/trial,
   ranh giới TS/Python, thứ tự Phase tổng (P0–P12).
        ↓
CẤP 2 — MODULE:    ALG_AI_Vision_Architecture_V2_Canonical.md   ("Bản Kiến Trúc")
   Thắng về: provider interface, taxonomy, JSON Contract của Vision,
   pipeline nội bộ, ngưỡng kỹ thuật.
        ↓
CẤP 3 — QUY TRÌNH: tài liệu này
   Không bao giờ thắng về nội dung kỹ thuật.
```

Quy tắc cao nhất:

> **Bản Kiến Trúc là nguồn sự thật duy nhất trong phạm vi module M01.**
> Nếu code và Bản Kiến Trúc mâu thuẫn nhau → **code sai, không phải Bản Kiến Trúc sai** — trừ khi con người (product owner) chủ động cập nhật Bản Kiến Trúc trước.
> Agent **không được tự ý diễn giải lại** kiến trúc để "cho tiện code".

> **Nhưng Bản Kiến Trúc module không được ghi đè ràng buộc Cấp 1.** Nếu phát hiện Bản Kiến Trúc (Cấp 2) mâu thuẫn với Kiến trúc V2 (Cấp 1) — ví dụ về tenant, RBAC, trạng thái job, usage — agent **dừng lại và báo product owner**, không tự chọn bên nào. Product owner sửa tài liệu Cấp 1 trước, rồi mới code.

---

## 1. Trước khi bắt đầu bất kỳ task nào

Agent phải thực hiện tuần tự các bước sau, **không được bỏ qua**:

### Bước 1 — Đọc lại đúng phần liên quan trong Bản Kiến Trúc
Không đọc toàn bộ file mỗi lần (tốn context), nhưng bắt buộc đọc:
- Mục 0 và 0.1 (nguyên tắc + decision record) — **luôn đọc, mọi task**.
- Mục tương ứng với phần code sắp sửa/viết (vd: sửa provider → đọc mục 5, 6; sửa API → đọc mục 10; sửa contract → đọc mục 8).

### Bước 2 — Xác định Phase hiện tại (hai trục)

Task phải hợp lệ trên **cả hai** trục Phase, không chỉ trục module.

**Trục module** — Phase của Bản Kiến Trúc (mục 12). Task phải nằm đúng trong checklist của Phase đó.
- Nếu task được giao **không thuộc Phase hiện tại và Phase trước chưa Acceptance** → **dừng lại, báo cho người dùng**, không tự ý làm trước.
- Nếu task rõ ràng thuộc Phase 0/1 nhưng Phase đó đã done → kiểm tra xem có đang sửa lại (regression) hay mở rộng hợp lệ.

**Trục hệ thống** — P0–P12 của Kiến trúc V2 (mục 15). Ánh xạ bắt buộc:

| Phase module M01 | Điều kiện tiên quyết ở `floraos-core` (V2 mục 15) |
|---|---|
| Phase 0 (audit / khảo sát) | Không cần điều kiện |
| Phase 1 trở đi (tạo bảng, route, job thật) | **P1 (Organization · Workspace · Membership · Branch · cách ly tenant) + P2 (RBAC) đã đạt Acceptance** |
| Phase gắn kết quả vào Product Master | **P3 (Asset · GenerationJob · Usage) + P4 (BusinessProfile) đã đạt Acceptance** |
| Phase tính usage/credit | **P3** — Usage đi cùng GenerationJob, không còn là pha riêng ở cuối như bản V1 |

> **Đổi so với V1.1:** bản cũ ánh xạ vào Phase 1/2/7 của tài liệu V1. V2 đánh số lại thành P0–P12 và **gộp Usage vào P3** cùng GenerationJob, vì hạn mức phải kiểm tại điểm tạo job (V2 mục 9).

> **Lý do bắt buộc thứ tự này:** nếu tạo bảng/route trước khi P1 xong, agent sẽ sinh ra schema không có `organization_id` — sau đó phải migration lại toàn bộ khi đã có dữ liệu thật. (Mục 18 của tài liệu V1 từng là chỗ dựa cho lập luận này; V2 đã **bãi bỏ** mục đó, chỗ dựa mới là V2 mục 1.2 luật 1 và mục 5.)

### Bước 3 — Kiểm tra vùng cấm
Trước khi tạo/sửa file, agent tự hỏi:
- **`vision_legacy/` không tồn tại ở `floraos-core`.** Luật thay thế: mã lấy từ repo `FloraOS` cũ chỉ được đưa vào khi đã có **hạng thu hoạch** (REUSE/EXTEND/ADAPTER) ghi trong `HARVEST_MANIFEST.md`. Chép mã cũ sang mà không xếp hạng → **dừng lại**.
- File này có làm thay đổi JSON Contract (mục 8) theo hướng xóa/đổi field cũ không? → **Nếu có, dừng lại**, chỉ được thêm field mới.
- Thay đổi này có khiến Orchestrator phụ thuộc trực tiếp vào một model/provider cụ thể (phá nguyên tắc #2, #3 mục 3) không? → Nếu có, phải refactor qua cổng `VisionAnalyzer` trước (V2 mục 17.1).
- **Thay đổi này có tạo bảng, route, job hoặc đường dẫn storage mới mà KHÔNG có `organization_id` không?** → **Nếu có, dừng lại.** V2 mục 4 và mục 5 bắt buộc mọi bản ghi thuộc tenant phải gắn tổ chức. Không có ngoại lệ, kể cả bảng tạm hay bảng phụ trợ.
- **Thay đổi này có tạo bảng usage/credit riêng cho Vision không?** → **Nếu có, dừng lại.** Usage dùng chung bảng `usage` của hệ thống (V2 mục 9), phân biệt bằng `feature`.

---

## 2. Checklist đồng bộ theo loại thay đổi

### A. Khi viết/sửa một Provider (`vision/providers/*.py`)

> **Đổi so với V1.1:** bản cũ khai interface ba method `detect()/segment()/recognize()` và chốt `OpenSourceProvider` làm Primary Provider. Quyết định **D5-c** ngày 09/09 (V2 mục 17.1) bãi bỏ cả hai: cổng đặt ở mức hợp đồng JSON, và không provider nào được chốt cứng trong tài liệu. Mục này viết theo cổng hiện hành.

- [ ] Class hiện thực đúng giao thức `VisionAnalyzer` (`providers/base.py`): thuộc tính `name`, `model_version`, và một method `analyze(image, context) -> dict`. Không có `detect`/`segment`/`recognize` — cổng không ở mức đó.
- [ ] `analyze()` trả `dict` đúng hình dạng `Schema.json`, đủ mọi trường bắt buộc. Trường provider không biết thì khai `null`, không khai chuỗi rỗng: `null` nói "máy không biết", chuỗi rỗng nói "máy biết là không có", và hai điều đó khác nhau ở màn duyệt.
- [ ] Ba tổng đếm cộng bằng `dem_tong(ket_qua)` trước khi trả, không hỏi mô hình. Mọi adapter phải cho ra cùng một nghĩa ở cùng một trường.
- [ ] Provider mới đăng ký vào `providers/registry.py`, và khoá đăng ký phải **khớp từng chữ** với `VISION_ENGINES` ở `src/modules/products/domain/vision-engine.ts`. Hai bên không có nguồn sự thật chung nào khác — có một ca thử khoá đúng ba khoá này, cùng khuôn với `notify_channel_for`.
- [ ] Provider mới cũng phải có một mục trong `MO_TA_BO_MAY` phía TS: tên hiển thị, mô tả cách chạy, `trang_thai`, và `gui_anh_ra_ngoai`. `trang_thai` không phải nhãn tiếp thị — nó nói bộ đó đã đo trên bộ ảnh vàng hay chưa.
- [ ] Nạp trọng số hoặc dựng client **một lần** lúc dựng provider, không nạp lại mỗi job. Sổ đăng ký dựng lười và giữ lại đúng vì lý do này.
- [ ] Không gọi thẳng API bên ngoài (OpenAI, HuggingFace…) ở bất kỳ đâu ngoài tệp provider tương ứng.
- [ ] Phần dùng chung giữa các adapter — thu nhỏ ảnh, đặt hạn gọi, đọc đáp ứng phòng thủ — để ở `providers/chung.py`, không chép sang từng lớp.

### B. Khi sửa phần điều phối (`jobs/worker.py`)
- [ ] Worker **không import lớp provider nào**. Nó lấy khoá bộ máy từ `payload.engine` của dòng job và hỏi `registry.lay_provider()`.
- [ ] Bộ máy lấy từ chính dòng job, cùng luật với `organization_id` — không tra lại cấu hình tổ chức lúc nhận việc. Tổ chức đổi bộ máy giữa lúc một lô đang xếp hàng thì lô đó vẫn chạy bằng bộ đã chốt lúc tạo job.
- [ ] Khoá lạ rơi về mặc định, không ném lỗi: một dòng job cũ ghi tên bộ máy đã bỏ vẫn phải chạy được. Cùng luật với `resolveVisionEngine` phía TS.

### C. Khi sửa JSON Contract / Schema (`vision/contracts/schema.py`)
- [ ] Đối chiếu mục 8 — mọi field hiện có phải giữ nguyên tên, kiểu dữ liệu, ý nghĩa.
- [ ] Field mới phải có giá trị mặc định hợp lý (`null`/optional) để không phá dữ liệu cũ đã lưu.
- [ ] Nếu cần đổi cấu trúc field cũ (breaking change) → **không tự làm**, phải dừng và hỏi người dùng, vì đây là thay đổi ở cấp quyết định sản phẩm.

### D. Khi sửa API (`api/vision_v2.py`, `router/feature_flag_router.py`)
- [ ] Route mới nằm dưới `/api/v1/vision/*`. **Đổi so với V1.1:** bản cũ ghi `/api/v2/` để né route legacy — `floraos-core` không có legacy, và V2 mục 3 chốt quy ước `/api/v1/` (thu hoạch từ LocalBudd).
- [ ] Không thay đổi input/output contract của endpoint đã có nếu frontend đang dùng, trừ khi mở rộng thêm field optional.
- [ ] Feature flag logic phải cho phép rollback tức thời (mục 15) — kiểm tra có test rollback không.
- [ ] **Tenant check phía server:** endpoint phải giải `organization_id` từ phiên đăng nhập/token, **không bao giờ lấy từ body/query do client gửi** (V2 mục 5: không bao giờ tin ID tổ chức do client gửi).
- [ ] **Truy vấn phải lọc theo tổ chức:** mọi câu đọc dữ liệu Vision (analysis, product, asset) đều có điều kiện `organization_id = <tenant hiện tại>`. Không có route nào trả dữ liệu xuyên tổ chức.
- [ ] **Permission theo capability, không theo vai trò UI** (V2 mục 6): endpoint chạy phân tích yêu cầu `vision.analyze`; endpoint duyệt kết quả yêu cầu `product.approve`. Không hard-code kiểm tra "nếu là Admin".

### D2. Khi làm phần Experience / Demo (V2 mục 11.1)

M01 là **bước đầu tiên người dùng mới chạm vào** trong luồng Experience (`Upload Product Image → AI Product Analysis → Show Result → Review → Approve`). Vì vậy:

- [ ] Phân tích ảnh phải chạy được trong demo workspace với **mock Business Profile / mock Product Master** — không được yêu cầu người dùng khai báo hồ sơ doanh nghiệp đầy đủ trước khi dùng thử.
- [ ] Trước khi tạo job, **gọi service quota/trial dùng chung** để kiểm tra `trial_count` / `trial_limit` / `trial_status`. Nếu vượt hạn mức → không đưa job vào queue, trả lỗi rõ ràng.
- [ ] **Không tự viết bộ đếm trial riêng cho Vision.** Hạn mức là mối quan tâm xuyên suốt, thuộc tầng Usage (V2 mục 9), không thuộc module.
- [ ] Dữ liệu Experience phải gắn `organization_id` của demo workspace như mọi tổ chức khác — demo không phải ngoại lệ của tenant isolation.

### D3. Khi làm phần Review & Approve (V2 mục 10)

V2 mục 12 (M01) ghi rõ: *"Analysis result must be reviewable and editable. Approved results can update Product Master."* Kết quả AI **không tự động** trở thành dữ liệu nghiệp vụ chính thức.

```text
Ảnh → Phân tích → KẾT QUẢ (trạng thái: generated)
                       ↓
                 Người dùng xem / sửa
                       ↓
                  APPROVE  ← cần quyền product.approve
                       ↓
              Ghi vào Product Master
```

- [ ] Kết quả phân tích lưu ở trạng thái chờ duyệt, **không ghi thẳng** vào Product Master.
- [ ] Có `approved_by` + `approved_at` trên bản ghi kết quả.
- [ ] Người dùng sửa được kết quả trước khi duyệt (số lượng, thành phần, nhãn) — bản sửa của người phải lưu **tách biệt** với dự đoán gốc của AI, phục vụ training data về sau.
- [ ] Quyền chạy phân tích (`vision.analyze`) tách khỏi quyền duyệt (`product.approve`) — trong mô hình Chain, Sale chạy nhưng Điều hành duyệt.

### E. Khi thao tác Component Taxonomy (`vision/taxonomy.py`)
- [ ] Không xóa canonical_component đã tồn tại (có thể đang được BOM/Product Master tham chiếu).
- [ ] Thêm mapping mới (`ai_label` → `canonical_component`) phải kèm theo category đúng (flower/foliage/accessory/packaging) như mục 2 V1.

### F. Khi viết Job/Queue/Worker (`vision/jobs/*.py`)
- [ ] Không inference trực tiếp trong HTTP handler (nguyên tắc #8 mục 3).
- [ ] Model load một lần lúc worker start, không load lại mỗi job (nguyên tắc #9 mục 3).
- [ ] **Trạng thái job dùng chuẩn `generation_jobs` của hệ thống (V2 mục 7), ba trục tách rời:**

```text
status  (chuẩn hệ thống, mọi module giống nhau)
    PENDING → PROCESSING → COMPLETED / FAILED / CANCELLED

stage   (chi tiết riêng M01, chỉ để hiển thị tiến độ)
    ví dụ: DETECTING | SEGMENTING | RECOGNIZING | MAPPING_TAXONOMY

result  (phán quyết nghiệp vụ, nếu có)
    ví dụ: OK | LOW_CONFIDENCE
```

  Trạng thái `processing / completed / failed` ở bản cũ ánh xạ vào `status`. **Không tự tạo enum riêng** — màn hình theo dõi job và bộ tính usage của toàn hệ thống chỉ đọc `status`.
- [ ] **Hỗ trợ `CANCELLED`:** người dùng huỷ được job còn ở `PENDING`.
- [ ] **Worker giữ tenant context:** worker Python lấy `organization_id` **chỉ từ dòng job**, không suy từ dữ liệu ảnh, không lấy từ tham số client (V2 mục 3.1 luật 1).
- [ ] **Cơ chế lấy việc (D6-1):** worker đọc `generation_jobs` bằng `SELECT … FOR UPDATE SKIP LOCKED`, đánh thức bằng `LISTEN/NOTIFY`. **Không gọi qua HTTP, không dùng `subprocess`** (V2 mục 3.1 luật 5, 6).
- [ ] **Ghi Usage ở phía core tại điểm tạo job**, không ghi ở worker — hạn mức phải chặn **trước khi** job vào bảng (V2 mục 3.1 luật 3, mục 9). `feature = "vision.analyze"`. Không tạo bảng usage riêng cho Vision.
- [ ] **Storage tenant-scoped:** `org/<organization_id>/<product_id>/<asset_id>.<ext>` (V2 mục 5).

---

## 3. Quy tắc xử lý khi có mâu thuẫn hoặc thiếu thông tin

Agent thường gặp tình huống Bản Kiến Trúc không nói rõ chi tiết implementation (vd: tên biến, thư viện cụ thể, cách xử lý lỗi). Quy tắc ưu tiên xử lý:

1. **Có nói rõ trong Bản Kiến Trúc** → làm đúng theo đó, không tự sáng tạo thêm.
2. **Không nói rõ nhưng có nguyên tắc liên quan (mục 3)** → suy ra theo nguyên tắc, ưu tiên phương án giữ khả năng thay thế provider/model.
3. **Không có căn cứ nào trong tài liệu, và quyết định này có thể ảnh hưởng đến kiến trúc lâu dài (vd: đổi cấu trúc thư mục, đổi tên field JSON Contract, đổi thứ tự Phase)** → **dừng lại, hỏi người dùng**, không tự quyết.
4. **Không có căn cứ, nhưng chỉ là chi tiết kỹ thuật cục bộ không ảnh hưởng kiến trúc (vd: đặt tên hàm nội bộ, cách format log)** → agent tự quyết theo best practice, không cần hỏi.

**Không được** lấy lý do "để đơn giản hóa" hoặc "để nhanh hơn" làm căn cứ đi ngược nguyên tắc ở mục 3 của Bản Kiến Trúc.

---

## 4. Quy trình review trước khi coi một task hoàn thành

Trước khi báo cáo "đã xong" cho một task, agent tự chạy qua checklist sau (self-review, không cần người dùng nhắc):

```text
--- Cấp module (Bản Kiến Trúc V2) ---
[ ] Code có nằm đúng thư mục theo mục 13 (cấu trúc chuẩn) không?
[ ] Có import chéo giữa vision/ và vision_legacy/ không? (bắt buộc = KHÔNG có)
[ ] Có sửa file nào trong vision_legacy/ mà không được yêu cầu tường minh không?
[ ] JSON output có đúng 100% shape ở mục 8 không (kể cả field null hợp lệ)?
[ ] Provider mới (nếu có) có hiện thực đủ `VisionAnalyzer`, có đăng ký `registry.py` không?
[ ] Khoá bộ máy mới có khớp từng chữ với `VISION_ENGINES` phía TS, và có mục trong `MO_TA_BO_MAY` không?
[ ] Worker có đang import thẳng một lớp provider không? (bắt buộc = KHÔNG)
[ ] `analyze()` có cộng ba tổng đếm bằng `dem_tong` trước khi trả không?
[ ] Task này thuộc Phase nào (mục 12)? Đã đánh dấu đúng checklist item chưa?
[ ] Nếu task này hoàn thành một Phase → đã đối chiếu đủ Acceptance Criteria của Phase đó chưa (mục 12 + mục 15)?

--- Cấp hệ thống (Kiến trúc V2) ---
[ ] Bảng/route/job/storage path mới có organization_id chưa? (V2 mục 4, 5)
[ ] Truy vấn đọc dữ liệu có lọc theo organization_id chưa? Có route nào trả dữ liệu xuyên tổ chức không?
[ ] organization_id có được lấy từ phiên đăng nhập phía server, không phải từ client gửi lên?
[ ] Trạng thái job có dùng chuẩn status/stage/result (V2 mục 7), không tự tạo enum riêng?
[ ] Usage có ghi ở phía core tại điểm enqueue, feature = "vision.analyze" (V2 mục 9)?
[ ] Có kiểm tra trial/quota trước khi đưa job vào queue (V2 mục 11.1, 9)?
[ ] Kết quả AI có đi qua Review/Approve trước khi ghi Product Master, không ghi thẳng? (V2 mục 10)
[ ] Mọi tác nghiệp trên kết quả — sửa, duyệt, từ chối — có ghi `audit_logs` không?
[ ] Bộ máy có chốt vào `payload` lúc tạo job, không tra lại lúc worker nhận việc?
[ ] Endpoint có kiểm tra capability (vision.analyze / product.approve), không hard-code vai trò UI? (V2 mục 6)
[ ] Task có nằm sau đúng Phase tiên quyết (V2 mục 15, P0–P12)? Xem bảng ánh xạ ở mục 1 Bước 2.
[ ] Provider Vision có đi qua cổng VisionAnalyzer, không gọi thẳng API nhà cung cấp? (V2 mục 17.1)
```

Nếu bất kỳ mục nào không chắc chắn → agent nêu rõ trong báo cáo, không im lặng bỏ qua.

---

## 5. Định dạng báo cáo tiến độ (để đồng bộ với người dùng)

Sau mỗi task, agent nên báo cáo theo format ngắn gọn sau, giúp người dùng đối chiếu nhanh với Bản Kiến Trúc mà không cần đọc lại toàn bộ code:

```text
Task: <mô tả ngắn>
Module: M01 — Product Image Analysis
Phase module: <Phase 0-5, theo mục 12 Bản Kiến Trúc>
Phase hệ thống: <P0–P12 V2, mục 15 — điều kiện tiên quyết đã đạt chưa>
Mục tham chiếu: <số mục Bản Kiến Trúc + số mục Kiến trúc V2 đã áp dụng>
Thay đổi: <file/module đã tạo/sửa>
Không đụng: vision_legacy/ ✅ (hoặc ghi rõ nếu có ngoại lệ)
Contract: JSON Contract không đổi ✅ / có thêm field mới: <tên field>
Tenant: mọi bảng/route/storage mới đều có organization_id ✅
Job: dùng chuẩn status/stage/result ✅
Usage: đã ghi feature = "vision.analyze" ✅ / không phát sinh usage
Approve: kết quả không ghi thẳng Product Master ✅
Bộ máy: <khoá adapter đã đụng tới, hoặc "không đụng">
Cần xác nhận thêm: <nếu có điểm mơ hồ cần người dùng quyết định>
```

---

## 6. Khi phát hiện Bản Kiến Trúc có lỗi hoặc chưa tính đến trường hợp thực tế

Trong quá trình code, nếu agent phát hiện:
- Một interface thiếu field cần thiết,
- Một nguyên tắc kiến trúc không khả thi về mặt kỹ thuật,
- Một Phase bị thiếu bước trung gian,

→ Agent **không tự sửa Bản Kiến Trúc**. Agent phải:
1. Dừng việc implement phần liên quan.
2. Báo cáo rõ vấn đề phát hiện được, kèm đề xuất điều chỉnh cụ thể.
3. Chờ người dùng (product owner) xác nhận cập nhật Bản Kiến Trúc chính thức trước khi code tiếp.

Điều này đảm bảo Bản Kiến Trúc luôn là tài liệu **sống nhưng có kiểm soát** — không bị trôi dạt (drift) âm thầm qua từng lần agent tự quyết.

---

## 7. Tóm tắt quy tắc bất di bất dịch (không cần đọc lại toàn bộ mỗi lần)

1. Không sửa `vision_legacy/` trừ khi được yêu cầu rõ ràng bằng tên file.
2. Mọi provider phải qua cổng `VisionAnalyzer` và đăng ký ở `providers/registry.py`; không module nào gọi thẳng API nhà cung cấp, và không module nào import thẳng một lớp provider.
3. JSON Contract chỉ được thêm field, không xóa/đổi field cũ.
4. **Cổng Vision đặt ở mức Hợp đồng JSON, không ở mức `detect/segment/recognize`.** Cổng là `VisionAnalyzer.analyze(image, context) -> ProductAnalysis` (mục 8). Ba adapter cùng tồn tại — `openai_structured` (Đầy đủ) · `openai_direct` (Gọn) · `local_cv` (Cục bộ) — và tổ chức chọn dùng bộ nào qua `H4`. Bộ **mặc định** chỉ đổi **bằng số đo trên bộ ảnh vàng**, không chốt cứng trong tài liệu và không đổi bằng lập luận.
   *(Thay quy tắc 4 của V1.1 — "Primary Provider = Florence-2 + SAM2, không phải OpenAI" — theo quyết định D5-c ngày 09/09, V2 mục 17.1. Lý do đổi: quy tắc cũ được viết trước khi biết hợp đồng GPT-4o 40KB trong `analyzer/` là tài sản đã chạy thật trên ảnh hoa của AVI GIFT; và hai hình dạng không cắm được vào cùng một interface ba method.)*
5. Không inference trực tiếp trong HTTP request — luôn qua Job/Queue/Worker.
6. Model load một lần, giữ trong memory/GPU, không load lại mỗi request.
7. Làm đúng thứ tự Phase (mục 12), không nhảy cóc khi Phase trước chưa đạt Acceptance.
8. Mọi quyết định ảnh hưởng kiến trúc lâu dài → hỏi người dùng, không tự quyết.
9. Báo cáo tiến độ theo format mục 5 sau mỗi task.

**Bổ sung từ Kiến trúc V2 (Cấp 1 — thắng tuyệt đối khi mâu thuẫn với 9 quy tắc trên):**

10. **Mọi bản ghi, route, job và đường dẫn storage đều gắn `organization_id`.** Không có ngoại lệ, kể cả demo workspace.
11. `organization_id` luôn giải từ phía server; **không bao giờ tin ID tổ chức do client gửi**.
12. Trạng thái job dùng chuẩn `status` / `stage` / `result` (V2 mục 7) — không tự tạo enum riêng.
13. Usage ghi vào bảng `usage` dùng chung **ở phía core, tại điểm tạo job**, `feature = "vision.analyze"` — không tạo bảng usage riêng, không ghi ở worker.
14. Kiểm tra trial/quota **trước khi** đưa job vào queue, qua service dùng chung.
15. Kết quả AI **không tự động** thành dữ liệu nghiệp vụ: phải qua Review → Approve mới ghi Product Master.
16. Quyền theo capability (`vision.analyze`, `product.approve`), không hard-code theo vai trò UI.
17. Không bắt đầu tạo bảng/route thật trước khi **P1 (tenant) và P2 (RBAC)** đạt Acceptance (V2 mục 15).
18. Nếu Bản Kiến Trúc module mâu thuẫn Kiến trúc V2 → **dừng, báo product owner**, không tự chọn bên nào.
19. **Worker Python lấy việc từ `generation_jobs` bằng `SKIP LOCKED` + `LISTEN/NOTIFY`** (D6-1, V2 mục 3.1). Cấm `subprocess.Popen` + parse stdout; cấm chạy job qua HTTP.
20. **Mã lấy từ repo `FloraOS` cũ phải có hạng thu hoạch** (REUSE/EXTEND/ADAPTER) ghi trong `HARVEST_MANIFEST.md`, và **luật nghiệp vụ phải đi kèm test khoá nó**, test xanh trên core mới thì mới coi là chuyển xong (V2 mục 1.2 luật 1).
21. **Bộ ảnh vàng 8 ảnh gán nhãn là điều kiện nghiệm thu của P5.** Không có nó thì không đổi được provider và không hồi quy được phần thu hoạch (V2 mục 17.1).
