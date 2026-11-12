# PRD — `floraos-core`

**Sản phẩm:** ALG SaaS — nền tảng đa tenant cho cửa hàng và chuỗi cửa hàng hoa
**Phạm vi tài liệu:** repo `floraos-core` (Core) và ranh giới của nó với `LocalBudd`, `SocialFlow`
**Cấp tài liệu:** rút gọn từ `ALG_SAAS_TARGET_ARCHITECTURE_V2.md` (Level 1) · `HARVEST_MANIFEST.md` · `M01` · `M04` · `TRANG_THAI.md`
**Ngày:** 2026-09-11

> Khi PRD này và `ALG_SAAS_TARGET_ARCHITECTURE_V2.md` lệch nhau, tài liệu kiến trúc thắng. PRD trả lời *xây cái gì và vì sao*; kiến trúc trả lời *xây thế nào*.

---

## 1. Bài toán

Cửa hàng hoa bán bằng hình ảnh, nhưng ảnh chụp bằng điện thoại không đồng đều, dữ liệu sản phẩm nằm rải rác, và mỗi kênh bán (landing page, catalog, mạng xã hội) lại nhập lại từ đầu. Hệ v1 (`FloraOS`) giải được phần nghiệp vụ nhưng là công cụ desktop khoác giao diện web: Excel là cấu trúc dữ liệu, một khoá ghi toàn cục thuộc về thư mục, trạng thái job giữ trong RAM. Ràng buộc đó không mang sang SaaS được.

`floraos-core` là nền đa tenant để một tổ chức nhập dữ liệu sản phẩm **một lần** và mọi module dùng lại.

Giá trị mà cửa hàng nhận được đo bằng một chuỗi duy nhất: chụp ảnh bó hoa, rồi có sẵn bản ghi sản phẩm, ảnh quảng cáo, video, bài viết, lịch đăng, landing page và catalog. ALG không cạnh tranh với một công cụ thiết kế hay một trợ lý viết bài tổng quát — nó là hệ điều hành của cửa hàng hoa, và điều đó chỉ đúng khi mọi mắt của chuỗi trên đọc cùng một Product Master và cùng một Master Image đã duyệt.

## 2. Người dùng

| Nhóm | Việc chính | Ràng buộc quyền |
|---|---|---|
| Điều hành / Admin | Duyệt kết quả AI, quản lý sản phẩm, giá, chi nhánh | Toàn tổ chức |
| Sale | Chạy phân tích ảnh, tối ưu ảnh, tra cứu giá | Theo chi nhánh |
| Điều phối | Điều phối đơn theo chi nhánh | Theo chi nhánh |
| Thợ cắm | Nhận việc sản xuất được phân công, cập nhật trạng thái sản xuất | Theo chi nhánh |
| Experience User | Dùng thử với dữ liệu mẫu, hạn mức giới hạn | Workspace demo |

Ba hình thái tổ chức: **Experience** (demo tạm) · **Single Shop / Brand** · **Chain** (một tổ chức nhiều chi nhánh, quản lý tập trung).

## 3. Bảy luật sản phẩm

Áp cho mọi module, mọi repo. Vi phạm là lỗi chặn ở review.

| # | Luật |
|---|---|
| 1 | Mọi bản ghi thuộc tenant mang `organization_id`. Không ngoại lệ, kể cả bảng tra cứu và demo workspace |
| 2 | `organization_id` giải từ phiên đăng nhập phía máy chủ, không bao giờ nhận từ client |
| 3 | Đầu ra AI không tự động thành dữ liệu nghiệp vụ chính thức — phải qua Review → Approve |
| 4 | Quyền theo mã năng lực, không theo vai giao diện. Vai trải nghiệm (`03b-role-ux.md`) chỉ quyết định trang chủ, thứ tự điều hướng và ưu tiên thông tin — không mở quyền. Năng lực duyệt tách khỏi năng lực sinh kết quả |
| 5 | Thao tác AI dài chạy bằng job, không chặn HTTP. Trạng thái job ở Postgres, không ở RAM |
| 6 | Asset gốc bất biến. Dẫn xuất là phiên bản mới hoặc asset mới |
| 7 | Tăng cường sản phẩm, không tái sinh sản phẩm. Nhận dạng sản phẩm là bất biến |

## 4. Phạm vi

**Trong phạm vi core**
Organization · Workspace · Membership · Branch · cách ly tenant · RBAC · BusinessProfile · BrandProfile · Product Master · Asset · GenerationJob · Usage · AuditLog · Customer · Order · hồ sơ phong cách · Integration API · M01 · M01b · M02 · M03 · M04a · M09 · M10 · M11.

**Ngoài phạm vi core, có chủ sở hữu khác**
M05 Landing Page thuộc `LocalBudd` (gọi Core qua API). M07 Content & Social Publishing thuộc `SocialFlow` (kèm số liệu hiệu quả gốc). **M04b Marketing Creative, M04c Video Studio và M08 AI Chat Assistant thuộc 100% sở hữu của `floraos-core`** (đã xây dựng hoàn tất ở P16/P24, P17 và P23; SocialFlow đã đóng route M04b cục bộ).

**Không làm ở giai đoạn này**
Thanh toán và xuất hoá đơn — kiến trúc đỡ sẵn, chưa triển khai. Migrate dần từ v1 — cắt sang hệ mới một lần. Khoá nhà cung cấp riêng của từng tổ chức. Bộ chọn chi nhánh trên giao diện.

## 5. Bản đồ module

Mười ba đơn vị triển khai, nhóm theo bốn engine. Engine là cách nhóm năng lực theo chuỗi giá trị của cửa hàng, không phải một tầng triển khai mới; ranh giới sở hữu dữ liệu ở mục 8 không đổi vì cách nhóm này.

| Engine | Câu hỏi engine trả lời | Module |
|---|---|---|
| Vision | Trong ảnh này là sản phẩm gì, gồm những gì, bao nhiêu cành | M01 · M01b |
| Creative | Ảnh và video nào bán được sản phẩm này trên kênh nào | M04a · M04b · M04c |
| Marketing | Viết gì, đăng ở đâu, lúc nào | M07 · M05 · M06 |
| Learning | Bài nào hiệu quả, vì sao, lần sau làm khác thế nào | M11 |
| AI Orchestration | Dùng mô hình nào, khi nào, tốn gì, được chạm dữ liệu nào | tầng dùng chung, mục 7.15 |

Bốn engine đầu là cách nhóm module. Engine thứ năm là một tầng thật: bốn engine kia gọi AI qua nó, và nó là chỗ duy nhất biết mô hình nào đang chạy, tốn bao nhiêu, cho chất lượng nào và được phép chạm dữ liệu nào.

| Mã | Module | Engine | Repo | Nguồn |
|---|---|---|---|---|
| M01 | Product Image Analysis | Vision | `floraos-core` | Hợp đồng AI Vision 40KB + engine đếm, engine màu; bỏ toàn bộ lớp Excel |
| M01b | Product Sales Data | Vision | `floraos-core` | Xây mới; đọc lượt phân tích đã duyệt, sinh tên · mô tả · thẻ · dịp · phân khúc giá |
| M02 | Product Cost & Pricing | — | `floraos-core` | Công thức giá + bất biến làm tròn hai phía; quy tắc giá theo phạm vi tổ chức |
| M03 | Product Search / KB | — | `floraos-core` | Xây trên Postgres, logic lọc lấy từ bộ test có sẵn |
| M04a | Product Image Optimization | Creative | `floraos-core` | Xây mới theo spec; Identity Guard là cổng cứng |
| M04b | Marketing Creative | Creative | `floraos-core` | Chuyển từ `SocialFlow` về Core ở P16/P24: xoá nền, đổi nền, watermark, biến thể |
| M04c | Video Studio | Creative | `floraos-core` | Xây dựng ở P17: 6 khuôn M04c, Storyboard, TTS ducking, 2 cổng duyệt P3/P4 |
| M05 | Landing Page Generator | Marketing | `LocalBudd` | Giữ nguyên; bỏ bảng trùng, đọc core qua API |
| M06 | Catalog Generator & QR | Marketing | `floraos-core` (SSOT) · LocalBudd gọi API | Xây mới; Core làm SSOT duy nhất cho `catalog_links` |
| M07 | Content & Social Publishing | Marketing | `SocialFlow` | Adapter nền tảng và lịch đăng đã chạy; xây chiến lược nội dung ngành hoa và adapter Zalo OA |
| M08 | Customer Chat & Omnichannel | — | `floraos-core` | Xây dựng ở P23: Dual-Intent Copilot + Sales Chat, 5 kênh tiếp xúc |
| M09 | Customer & Repurchase | — | `floraos-core` | Xây mới |
| M10 | Orders & Operations | — | `floraos-core` | Mở rộng luồng chào giá và điều phối của v1; 28 mã `C1`–`C28` đã thu hoạch |
| M11 | Analytics & Learning | Learning | `floraos-core` · số liệu gốc ở `SocialFlow` | Mở rộng số liệu đã có; xây phép nối ROI và vòng học |

M04 tách ba tại Master Image: trước nó là sự thật về sản phẩm, sau nó là sức bán của ảnh và video. Mỗi module chạy được độc lập, nhưng dùng dữ liệu chung khi có sẵn.

## 6. Luồng chính

**Trải nghiệm lần đầu**
```
Vào Experience → nạp workspace demo → tải ảnh → phân tích AI
→ xem kết quả → sửa → duyệt → gợi ý chức năng kế → người dùng chọn
```
Người dùng chỉ cung cấp phần động: ảnh, tên sản phẩm, vài thông tin đơn giản. Không bắt khai báo hồ sơ doanh nghiệp đầy đủ trước khi dùng thử. Không tự động chạy hết mọi chức năng tính phí — mỗi chức năng chọn riêng.

**Phân tích ảnh sản phẩm (M01)**
```
Ảnh → job → phân tích → kết quả (chờ duyệt) → người sửa
                              ↓
                    [Phán quyết]  ← cần product.approve (H3)
                     ├─ duyệt   → ghi Product Master
                     └─ từ chối → đóng bản ghi, KHÔNG chạm Product Master
```
Bộ máy chạy phân tích chọn được ở cấp tổ chức (`H4`, trần cứng Điều hành): Đầy đủ · Gọn · Cục bộ. Cả ba trả cùng một hợp đồng JSON nên phần sau luồng không đổi.

**Tối ưu ảnh sản phẩm (M04a) — hai cổng khác nhau**
```
Ảnh → phân tích chất lượng → tách sản phẩm → tăng cường → bố cục
→ [Cổng 1] Product Identity Guard   ← máy chấm: SAFE / GOOD / WARNING / REJECTED
→ Master Image + các tỷ lệ (Smart Reframe, không chạy lại AI)
→ Before/After, tải về
→ [Cổng 2] Review & Approve         ← người chấm, cần media.approve
→ Master Image thành Asset chính thức của sản phẩm
```
Guard PASS không thay thế Approve. Tải ảnh về không phải là phê duyệt. Ảnh `REJECTED` không được đưa vào luồng duyệt; ảnh `WARNING` duyệt được nhưng giao diện phải cảnh báo trước.

**Từ một bó hoa tới các kênh**
```
Ảnh → M01 phân tích → duyệt → Product Master
                                   │
        ┌──────────────────────────┼───────────────────────────┐
        ↓                          ↓                           ↓
  M01b tên · mô tả          M04a Master Image          M02 giá chào
  thẻ · dịp · phân khúc      + bốn tỉ lệ (duyệt)
        └──────────┬───────────────┘
                   ↓
     M04b biến thể marketing · M04c video  → duyệt từng loại đầu ra
                   ↓
     M07 bài viết theo kênh → duyệt → lịch đăng → đăng
                   ↓
     M05 landing chiến dịch · M06 catalog và QR
                   ↓
     M11 số liệu hiệu quả → hồ sơ phong cách → quay lại M01b, M04b, M07
```
Mỗi mũi tên đi qua một cổng duyệt của riêng nó. Không bước nào tự chạy tiếp sau bước trước: một lượt phân tích được duyệt không tự sinh video, và một bài viết được sinh không tự đăng.

## 7. Yêu cầu chức năng

### 7.1 Nền tảng đa tenant
- Tạo tổ chức, workspace, mời thành viên, gán vai; một tổ chức chứa nhiều chi nhánh.
- Bộ test cách ly tenant chạy trong CI: mỗi endpoint bị thử với ngữ cảnh tổ chức khác và phải trả về không tìm thấy.
- Đường dẫn lưu trữ theo tổ chức: `org/<organization_id>/<product_id>/<asset_id>.<ext>`.
- Không có khoá ghi toàn cục. Đồng thời hoá bằng giao dịch cơ sở dữ liệu.

### 7.2 Phân quyền
- Từ vựng quyền chia theo dải: A–E thu hoạch nguyên vẹn từ v1, F–L là nền tảng và bộ module lõi, N là vận hành nền tảng với phạm vi `PLATFORM`, O–T là bộ tính năng hoàn chỉnh (O nội dung và đăng bài · P ảnh và video marketing · Q khách hàng · R đơn hàng · S phân tích và học · T hội thoại). Số lượng mã và số mã có trần cứng sinh từ `capability-catalog.ts`, ghi ở đặc tả 02 mục 3 và mục 7 — tài liệu khác dẫn chiếu, không chép lại.
- Ba lớp cắt: mặc định theo vai → bảng công tắc → trần cứng cắt sau cùng.
- Quyền là bộ ba `(vai, mã, phạm vi)` với phạm vi ∈ {organization, branch}.
- Vai là bản ghi, không phải enum. Vai tối thiểu: Experience User · Admin/Điều hành · Sale · Điều phối · Thợ cắm. Tổ chức thêm vai riêng được mà không sửa lược đồ.
- Mỗi vai phân quyền gắn tối đa một trong 14 **vai trải nghiệm** (Role UX, `03b-role-ux.md`, PO 26/09/2026): `dieu_hanh` → Quản lý cửa hàng, `sale` → Bán hàng, `dieu_phoi` → Điều phối; 10 vai còn lại hiện ở trạng thái "Đang phát triển". "Quản trị nền tảng" (`platform_admin`) là người vận hành Console, không phải vai của tổ chức.
- Cặp năng lực tách bắt buộc, một cặp cho mỗi loại đầu ra AI: `vision.analyze` ↔ `product.approve` · `product.copy.generate` ↔ `product.copy.approve` · `media.optimize` ↔ `media.approve` · `creative.compose` ↔ `creative.approve` · `video.generate` ↔ `video.approve` · `content.generate` ↔ `content.approve` · `catalog.create` ↔ `catalog.publish` · `landing.create` ↔ `landing.publish`.

### 7.3 Job
Ba trục tách rời, không gộp thành một enum:

| Trục | Phạm vi | Giá trị |
|---|---|---|
| `status` | Toàn hệ thống | PENDING → PROCESSING → COMPLETED / FAILED / CANCELLED |
| `stage` | Theo module | M04a: ANALYZING · DETECTING · ISOLATING · ENHANCING · BACKGROUND · COMPOSING · VERIFYING · GENERATING_OUTPUTS |
| `result` | Phán quyết nghiệp vụ | M04a: SAFE · GOOD · WARNING · REJECTED |

`COMPLETED + result=REJECTED` không phải `FAILED`. `FAILED` chỉ dành cho hỏng kỹ thuật: timeout, crash, lỗi nhà cung cấp. Gộp hai thứ này làm retry chạy lại vô ích và kế toán sử dụng sai lệch.
`CANCELLED` bắt buộc: người dùng huỷ được job còn `PENDING`. Nhật ký tiến trình theo dòng qua SSE, đọc lại được từ vị trí bất kỳ.

### 7.4 Asset
Một bảng `assets` cho mọi loại: ảnh gốc · ảnh đã phân tích · ảnh đã tăng cường · Master Image · ảnh marketing · ảnh catalog · ảnh landing page · ảnh và video social.
Metadata bắt buộc mỗi bản ghi: `organization_id` · `parent_asset_id` · `version` · `provider` · `model` · `model_version` · `pipeline_version` · `parameters` · `prompt` · `sha256` vào/ra · `quality_score` · `identity_score` · `generated_flags` · `cost_usd`.
`generated_flags` không bao giờ mặc định ngầm: ảnh phải dùng generative fill vì chất lượng quá kém được đánh dấu rõ ở cả metadata và giao diện.

### 7.5 Usage
Một bảng `usage` duy nhất cho toàn hệ thống, phân biệt bằng `feature`. Không repo nào dựng bảng usage hay credit riêng.
Hạn mức kiểm tại **điểm tạo job phía core**, trước khi bản ghi vào `generation_jobs`. Module vượt hạn mức không bao giờ tới được worker. Worker không ghi usage.
Hạn mức Experience cấu hình được: `trial_count` · `trial_limit` · `trial_reset_at` · `trial_status`.

### 7.6 Integration API
Core phơi ra qua `/api/v1/`: BusinessProfile · BrandProfile · Product Master · Asset (gồm Master Image) · GenerationJob · Usage · kiểm quyền. Xác thực máy-máy theo tổ chức; engine ngoài không bao giờ tự khai `organization_id` và không giữ bản sao entity lõi.

### 7.7 Dữ liệu bán hàng của sản phẩm — M01b
Từ một lượt phân tích **đã duyệt**, hệ thống sinh tên sản phẩm, mô tả bó hoa, danh sách thẻ, tone màu dạng nhãn, dịp phù hợp và phân khúc giá gợi ý. Hai trường `phong_cach` và `dip_su_dung` thêm vào hợp đồng Vision theo luật chỉ-thêm-trường. Phần câu chữ là đầu ra AI, nên nó lưu ở `product_copies` với `raw` và `edited` tách rời, và chỉ vào Product Master sau khi được duyệt. Phân khúc giá gợi ý không thay `quotePrice` — nó là một nhãn bán hàng, còn giá chào vẫn tính từ công thức và quy tắc giá của tổ chức.

### 7.8 Ảnh và video marketing — M04b, M04c
Biến thể marketing là tổ hợp nền, bố cục, khung, chữ chồng và watermark áp lên **cùng một Master Image đã duyệt**. Chúng không gọi lại lớp tăng cường và không đổi nhận dạng sản phẩm; một thay đổi chạm vào chính bó hoa là một lượt M04a mới, có Identity Guard và cổng duyệt riêng.
Video dựng trên Master Image và các tỉ lệ đã sinh: chuyển cảnh, zoom, nhạc, phụ đề, giọng đọc, CTA, logo. Khung đầu và khung cuối luôn là ảnh đã duyệt; mô hình video không nhận lệnh tạo hình bó hoa. Sáu khuôn đầu ra: Reel 15s, TikTok 30s, Story, slideshow catalog, video sản phẩm cho landing page, motion quảng cáo.
Creative và video đã hoàn tất đăng ký về `assets` của core, mang `parent_asset_id` trỏ về Master Image.

### 7.9 Nội dung và đăng bài — M07
Nội dung sinh ra gắn với một bản ghi Product Master và một Master Image đã duyệt, không gắn với một chủ đề rời. Đầu ra theo kênh: bài Facebook, caption và hashtag Instagram, kịch bản TikTok, nội dung Zalo OA, tiêu đề, mô tả SEO, nội dung quảng cáo, kịch bản livestream, tin nhắn bán hàng.
Đăng bài gồm lịch đăng, hẹn giờ, đăng nhiều nền tảng trong một lượt, sửa trước khi đăng, thư viện nội dung, và đăng lại nội dung cũ theo số liệu hiệu quả.
Tự duyệt theo thời hạn chỉ áp cho nội dung đăng bài: công tắc cấp tổ chức, gác bằng `O7` trần cứng Điều hành, tắt theo mặc định, mỗi lượt ghi `audit_logs` với người bật công tắc là người chịu trách nhiệm. Công tắc tắt thì hết thời hạn bài quay về hàng chờ, không tự đăng.

### 7.10 Catalog và trang chiến dịch — M06, M05
Catalog số liệt kê sản phẩm theo danh mục, giá, dịp sử dụng, màu sắc, loại hoa và bộ sưu tập, lấy dữ liệu từ Product Master và ảnh đã duyệt. Liên kết catalog thuộc core (`catalog_links`) vì nhiều module đọc nó; trang catalog thuộc `LocalBudd`. Mỗi liên kết sinh được một mã QR để khách quét tại cửa hàng.
Landing page dựng theo chiến dịch và theo dịp — 20/10, Valentine, 8/3, Ngày của Mẹ, khai trương, hoa cưới. Danh mục dịp là dữ liệu cấu hình cấp tổ chức, không phải hằng số trong mã.

### 7.11 Khách hàng và nhắc mua lại — M09
Hồ sơ khách hàng, lịch sử mua, ngày đặc biệt (sinh nhật, kỷ niệm, lễ cưới), nhắc mua lại đúng thời điểm, và voucher cho khách thân thiết.
Dữ liệu cá nhân của khách hàng cuối là một lớp riêng, chịu ba ràng buộc mà dữ liệu sản phẩm không chịu: cơ sở đồng ý riêng ở `customer_consents`, tách khỏi consent dữ liệu huấn luyện; quyền xoá thuộc về chính khách hàng cuối, không chỉ thuộc tổ chức; và không trường định danh nào — tên, số điện thoại, địa chỉ — đi qua nhà cung cấp AI. Nội dung nhắc mua sinh từ dịp và sản phẩm, phần định danh ghép ở tầng gửi.

### 7.12 Đơn hàng và vận hành — M10
Quản lý đơn hàng, trạng thái sản xuất, phân công thợ cắm, theo dõi giao hàng, SLA giao đúng giờ, in phiếu đơn, và quản lý lời nhắn thiệp. Luồng chào giá, bắn đơn cho đối tác và bảng điều phối trong ngày thu hoạch từ v1 — 28 mã `C1`–`C28` đã nằm trong danh mục năng lực, và bảng nghiệm thu của `BAN_GIAO.md` mô tả đúng luồng đang chạy hằng ngày ở AVI GIFT.

### 7.13 Phân tích hiệu quả và học — M11
Chỉ số theo dõi: reach, engagement, số khách hỏi, tỷ lệ chuyển thành đơn, bài hiệu quả nhất, sản phẩm bán tốt nhất, hiệu quả từng chiến dịch.
Số liệu gốc của từng nền tảng thuộc `SocialFlow`; phép nối ROI thuộc core vì nó cần `orders`. `campaign_rollups` của core là bộ nhớ đệm dựng lại được, mang cột nguồn, và không bao giờ là nguồn sự thật của số liệu nền tảng.
Sau khoảng hai mươi bài có số liệu, hồ sơ phong cách của tổ chức (`learning_profiles`) đổi tham số soạn nội dung cho các lượt sau. Mỗi thay đổi của hồ sơ truy được về số liệu đã sinh ra nó; hồ sơ thuộc core vì M01b, M04b và M07 đều đọc nó.

### 7.14 Trợ lý hội thoại — M08
Trợ lý trả lời bằng catalog của chính cửa hàng: giá, vùng giao hàng, mẫu tương tự, sản phẩm còn theo tone màu, phương án trong một khoảng ngân sách. Câu trả lời về giá đọc từ engine giá, không để mô hình tự tính. Đường chuyển cho người thật luôn có, và mọi hội thoại thuộc phạm vi tổ chức.

### 7.15 Nền AI
Mã nghiệp vụ gọi một **năng lực** đã đăng ký, không gọi tên một nhà cung cấp. Mọi lời gọi AI đi qua cổng AI — không route, use-case, agent hay script nào gọi thẳng SDK nhà cung cấp, và SDK chỉ xuất hiện trong `adapters/`. Mô hình là cấu hình trong sổ đăng ký, không phải mã: đổi mô hình cho một năng lực là một hàng trong sổ đăng ký cộng một lần đo.
Ba mức triển khai, thứ tự không đảo được: API là mặc định để ra sản phẩm · trọng số mở là lớp tối ưu khi khối lượng, chi phí, độ trễ hay quyền riêng tư đủ lớn · đường lai là kiến trúc đích. Tinh chỉnh mô hình là bước cuối và chỉ sau khi đã biết mô hình hiện tại sai ở đâu.
Không mô hình nào vào production khi thiếu một trong bốn ô: giấy phép, được dùng thương mại, lãnh thổ, phạm vi sử dụng cho phép.
Mỗi lời gọi mang một mức quyền riêng tư suy từ loại dữ liệu, và **sàn quyền riêng tư cắt sau cùng** — không đường nào, kể cả bước dự phòng, mở được một lời gọi chạm dữ liệu cá nhân khách hàng ra nhà cung cấp bên ngoài.
Đầu ra AI được máy chấm điểm trước khi thành dữ liệu; điểm chất lượng không thay Identity Guard và không thay Review → Approve. Ba cổng, không cổng nào thay cổng nào.
Đặc tả đầy đủ ở `10-ai-orchestration.md`; phần thắng tuyệt đối ở `../kien-truc/ALG_SAAS_TARGET_ARCHITECTURE_V2.md` mục 19.

## 8. Sở hữu dữ liệu

> Core sở hữu entity mà nhiều hơn một module đọc. Engine sở hữu entity chỉ module của nó đọc.

| `floraos-core` | `LocalBudd` | `SocialFlow` |
|---|---|---|
| `organizations` · `workspaces` · `memberships` · `roles` · `branches` | `pages` · `page_versions` · `layouts` | `content_queue` · `posts` |
| `business_profiles` · `brand_profiles` | `design_directions` · `design_contracts` | `campaigns` · `signals` · `content_plans` |
| `products` · `product_variants` · `product_analyses` · `pricing_rules` | `publish_records` | `post_metrics` · `weekly_metrics` · `content_insights` |
| `assets` · `generation_jobs` · `usage` · `audit_logs` | | `social_accounts` · `video_jobs` |
| `product_copies` · `occasions` · `customers` · `customer_occasions` · `customer_consents` · `vouchers` | | |
| `orders` · `order_items` · `order_assignments` · `order_events` | | |
| `learning_profiles` · `campaign_rollups` · `catalog_links` · `conversations` · `conversation_messages` | | `post_metrics` *(số liệu gốc từng nền tảng)* |
| `ai_capabilities` · `ai_models` · `ai_policies` · `ai_requests` · `ai_evaluations` | | |
| `flower_taxonomy` · `knowledge_chunks` · `content_features` | | |

Hệ quả có tên trong lộ trình (P7): `LocalBudd` bỏ `products`, `product_assets`, `media_assets`, `generation_jobs`, `projects` khỏi lược đồ của nó và đọc core qua API.

## 9. Yêu cầu phi chức năng

| Nhóm | Yêu cầu |
|---|---|
| Đồng thời | 100–500 người dùng đồng thời |
| Thời gian xử lý | 10–30 giây mỗi job ảnh, tuỳ loại xử lý; người dùng tiếp tục dùng webapp trong lúc chờ |
| Chi phí | ~$0.01–0.20 mỗi ảnh; ~$0.05–5 mỗi video (giai đoạn video) |
| Thứ tự ưu tiên khi đánh đổi | Accuracy > Quality > Cost > Speed > Simplicity |
| Nhà cung cấp AI | Chỉ gọi qua mười cổng (`VisionAnalyzer`, `LLMProvider`, `StorageProvider`, `QueueProvider`, `PublisherProvider`, `SegmentationProvider`, `ImageProvider`, `VideoProvider`, `SpeechProvider`, `EmbeddingProvider`), và qua cổng AI. Không module nào gọi thẳng API nhà cung cấp |
| Giấy phép mô hình | Bốn ô bắt buộc có giá trị trước khi một mô hình bật được: giấy phép, được dùng thương mại, lãnh thổ, phạm vi sử dụng cho phép |
| Hỏng nhà cung cấp | Nhà cung cấp mặc định sập thì tính năng chạy bằng đường dự phòng, hoặc dừng sạch với credit hoàn lại — không treo |
| Soát cách ly tenant ở tầng nhà cung cấp | Bắt buộc trong ma trận chọn công nghệ: rò dữ liệu qua cache còn nóng, phiên bền, lịch sử prompt, hay mặc định dùng dữ liệu để huấn luyện |
| Quyền riêng tư | Dữ liệu dùng để huấn luyện có cơ chế consent cấp tổ chức, sẵn sàng trước go-live. Xoá dữ liệu khi người dùng yêu cầu |
| Truy vết | Metadata đầy đủ mỗi job phục vụ gỡ lỗi, tái lập, đối soát chi phí, so sánh mô hình |

## 10. Lộ trình

Hai tuyến. **Tuyến A** dựng nền đa tenant và bộ module lõi; nó chặn mọi thứ khác. **Tuyến B** dựng bộ tính năng hoàn chỉnh trên nền đó. Bảng pha đầy đủ ở `../kien-truc/ALG_SAAS_TARGET_ARCHITECTURE_V2.md` mục 15.

### Tuyến A — nền tảng và module lõi

| Pha | Nội dung | Phụ thuộc | Ước lượng |
|---|---|---|---|
| P0 | Dựng `floraos-core` theo khuôn kiến trúc | — | 1 tuần |
| P1 | Organization · Workspace · Membership · Branch · cách ly tenant | P0 | 2–3 tuần |
| P2 | RBAC — thu hoạch 76 mã, phạm vi org/branch, vai thành bản ghi, tách `*.approve` | P1 | 1–2 tuần |
| P3 | Asset + GenerationJob + Usage trong một đợt | P1 | 2–3 tuần |
| P4 | BusinessProfile + BrandProfile | P1 | 1 tuần |
| P5 | M01 — hợp đồng AI, engine đếm, engine màu | P3 | 2–3 tuần |
| P6 | M02 + M03 — giá kèm bất biến; tìm kiếm trên Postgres | P5 | 2 tuần |
| P7 | Integration Layer; LocalBudd bỏ bảng trùng; adapter SocialFlow | P3, P4 | 2–3 tuần |
| P8 | Nhập dữ liệu AVI GIFT một chiều từ Excel | P4, P5, P6 | 1 tuần |
| P9 | M04a — Identity Guard, chạy song song với P7/P8 | P3, P5 | 3–4 tuần |
| P10 | Experience Mode | P2, P3 | 2 tuần |
| P11 | Cắt sang hệ mới; `FloraOS` v1 ngừng | P8, P10 | 1 tuần |
| P12 | Hardening — bảo mật, observability, hiệu năng, hồi quy | tất cả | 2 tuần |

Tổng thô Tuyến A 5–6 tháng với một đội nhỏ, P9 chạy song song.

### Tuyến B — bộ tính năng hoàn chỉnh

Bảy pha đầu là MVP: chủ cửa hàng chụp ảnh bó hoa và nhận về catalog, ảnh quảng cáo, video, bài viết, lịch đăng, landing page.

| Pha | Nội dung | Phụ thuộc | Ước lượng | MVP |
|---|---|---|---|---|
| P13 | M04a đợt hai — tăng cường ảnh thật, Smart Reframe bốn tỉ lệ, màn bắt đầu một lượt tối ưu | P9 | 3–4 tuần | ✓ |
| P14 | M01b — tên, mô tả, thẻ, dịp, phân khúc giá; cổng duyệt riêng | P5 | 2 tuần | ✓ |
| P15 | Ba đường ghi của Integration API — đăng ký asset dẫn xuất, số liệu nội dung, mức dùng | P7, P13 | 1–2 tuần | ✓ |
| P16 | M04b — xoá nền, đổi nền, mở rộng khung, retouch, watermark, biến thể | P13, P15 | 3–4 tuần | ✓ |
| P17 | M04c — sáu khuôn video, lớp dựng cảnh, usage về core | P15, P16 | 3–4 tuần | ✓ |
| P18 | M07 cho ngành hoa — nội dung từ sản phẩm thật, Zalo OA, lịch đăng, thư viện nội dung | P15, P16 | 3–4 tuần | ✓ |
| P19 | M06 — catalog số, bộ lọc, bộ sưu tập, liên kết và QR | P15 | 2–3 tuần | ✓ |
| P20 | M11 — số liệu về core, phép nối ROI, hồ sơ phong cách và vòng học | P18, P19, P22 | 3 tuần | |
| P21 | M09 — khách hàng, ngày đặc biệt, nhắc mua lại, voucher, cơ chế đồng ý | P2, P3 | 3 tuần | |
| P22 | M10 — đơn hàng, sản xuất, phân công, giao hàng và SLA, in phiếu, lời nhắn thiệp | P6, P21 | 4–5 tuần | |
| P23 | M08 — trợ lý hội thoại trên catalog của chính cửa hàng | P19, P21, P22 | 3–4 tuần | |

**Điều kiện chặn thứ tự của Tuyến B:** không module nào của Creative Engine hay Marketing Engine sinh nội dung từ một ảnh chưa qua Identity Guard và chưa được duyệt. P13 vì vậy đứng trước P16 và P17.

### Tuyến C — nền AI

Bốn đợt, cắt ngang hai tuyến kia nên không đánh số theo dải P.

| Đợt | Nội dung | Phụ thuộc | Ước lượng | Chặn |
|---|---|---|---|---|
| AI-1 | Cổng AI, sổ đăng ký năng lực và mô hình, chính sách theo tổ chức, mười cổng, bộ định tuyến, sổ chi phí lời gọi | P3, P5 | 3–4 tuần | P16 · P17 · P18 |
| AI-2 | Chấm điểm theo năng lực, thác nghiệm, chuỗi dự phòng | AI-1 | 2–3 tuần | Go-live P16–P18 |
| AI-3 | Danh mục loài và truy hồi tri thức trên `pgvector` | P5 | 2–3 tuần | P23 |
| AI-4 | Sự kiện miền, đặc trưng nội dung, bốn pha học | AI-1, P20 | 2 tuần | — |

AI-1 đứng trước P16 vì P16 là lần đầu hệ thống gọi một loại nhà cung cấp mới. Để tên nhà cung cấp đi vào mã của engine ngoài trước khi có cổng thì rút ra sau đó đắt hơn đặt đúng chỗ ngay từ đầu.

**Điều kiện chặn thứ tự:** không tạo bảng, route, job hay đường dẫn lưu trữ thật của bất kỳ module nào trước khi P1 và P2 đạt nghiệm thu. Làm ngược sẽ sinh ra lược đồ không có `organization_id` và phải migration lại khi đã có dữ liệu thật.

**Việc chạy song song, không chặn ai:** bộ ảnh vàng 8 ảnh sản phẩm thật có nhãn số lượng đúng (đã chốt 09/12, trước đó 50–100 ảnh). Đây là điều kiện nghiệm thu P5 và là thứ duy nhất cho phép so sánh hai provider Vision.

## 11. Tiêu chí nghiệm thu

**SaaS** — nhiều tổ chức dùng đồng thời · dữ liệu cách ly, có bộ test CI chứng minh · quyền đúng theo phạm vi · một tổ chức chứa nhiều chi nhánh.

**Experience** — bắt đầu với thông tin tối thiểu · dữ liệu demo có sẵn · đi hết chức năng lõi qua các bước dẫn dắt · hạn mức có giới hạn và đặt lại được.

**Dữ liệu** — BusinessProfile nhập một lần · Product Master dùng lại xuyên module · kết quả AI cập nhật được dữ liệu đã duyệt · không repo nào giữ bản sao entity lõi.

**Module** — cả mười ba đơn vị chạy độc lập · M04a chặn được một thay đổi sản phẩm mô phỏng, ảnh gốc được giữ · M04b và M04c soạn trên Master Image đã duyệt mà không đổi nhận dạng sản phẩm.

**AI/Job** — thao tác dài dùng job · trạng thái quan sát được trên ba trục · job lỗi retry an toàn · `COMPLETED/REJECTED` không bị coi là lỗi · kết quả được lưu.

**Chuyển đổi** — AVI GIFT vận hành được trên core theo đúng bảng nghiệm thu của `BAN_GIAO.md` · dữ liệu Excel nhập đủ · `FloraOS` v1 ngừng mà không mất việc nào.

**Bộ tính năng hoàn chỉnh** — một chủ cửa hàng tải lên ảnh một bó hoa và, không rời shell, nhận về: bản ghi sản phẩm có tên và mô tả · Master Image cùng bốn tỉ lệ · ít nhất một bộ biến thể marketing · một video ngắn · bài viết cho ba kênh · một mục trong lịch đăng · một trang catalog có QR. Mỗi bước sinh một mục chờ duyệt thật, không bước nào chạy tự động sau bước trước.

**Học** — sau hai mươi bài đăng có số liệu, hồ sơ phong cách của tổ chức đổi được ít nhất một tham số soạn nội dung, và đổi đó truy được về số liệu đã sinh ra nó.

**Dữ liệu cá nhân** — khách hàng cuối xoá được dữ liệu của mình; không lời gọi nhà cung cấp AI nào mang tên, số điện thoại hay địa chỉ khách hàng.

## 12. Sổ quyết định

**Đã chốt**

| # | Nội dung | Ngày |
|---|---|---|
| Đường A | Dựng repo core mới, thu hoạch từ ba repo, giữ tách ba repo. `FloraOS` v1 nghỉ hưu, không migrate dần | 09/09 |
| D5-c | Cổng Vision ở mức hợp đồng JSON: `VisionAnalyzer.analyze → ProductAnalysis`. Adapter GPT-4o trước, Florence-2 + SAM2 sau, chỉ đổi khi thắng trên bộ ảnh vàng | 09/09 |
| D5-d | Ba adapter cùng tồn tại sau cổng — Đầy đủ · Gọn · Cục bộ — và tổ chức chọn dùng bộ nào qua `H4`. Cổng nghiệm thu để đổi bộ MẶC ĐỊNH giữ nguyên: tự chọn là để thử, không thay phép đo trên bộ ảnh vàng. **Phạm vi (RS-6, 18/09):** cổng này chỉ bắt buộc khi đổi làm HẠ mặc định (về bộ rẻ/yếu hơn) — hướng có thể âm thầm giảm chất lượng cho mọi tổ chức mà không ai biết. Đổi làm NÂNG mặc định (lên bộ mạnh/đắt hơn) không bắt buộc qua cổng này, vì hướng đó không cần chứng minh "không tệ đi" | 09/11 |
| D5-e | Bộ MẶC ĐỊNH nền tảng đổi từ Đầy đủ sang Cục bộ — ghi đè có chủ đích cổng D5-d, chốt qua AskUserQuestion với chủ sản phẩm, KHÔNG dựa trên đo bộ ảnh vàng (`golden/labels/` vẫn 0/100). Lý do: Cục bộ vừa chạy thử thật thành công (nợ #55) và không gửi ảnh ra ngoài; chưa có worker thật nào đang chạy tại thời điểm đổi (nợ #61) | 09/11 |
| D3-b | Hoàn credit mở rộng thành ba diện: Guard từ chối · job bị huỷ khi còn chờ · job hỏng vì lỗi kỹ thuật. `COMPLETED` kèm `LOW_CONFIDENCE` không hoàn — đó là kết quả thật kèm cảnh báo | 09/11 |
| D7 | Ba bộ máy thu cùng `vision.analyze = 1` credit, dù chi phí thật chênh nhau nhiều lần. Bảng giá theo bộ máy chờ mô hình bán hàng thật | 09/11 |
| D6-1 | Postgres làm hàng đợi. Worker Python lấy việc bằng `SELECT … FOR UPDATE SKIP LOCKED` + `LISTEN/NOTIFY`. Cấm `subprocess` + parse stdout, cấm chạy job qua HTTP | 09/09 |
| D1-b | `SocialFlow` là đa tenant thật — `organization_id` có mặt trên mọi bảng nó sở hữu, sáu agent lọc theo tổ chức, điều phối chạy lô song song theo tổ chức. Ghi đè cách hiểu "worker đơn tenant" của bản chốt 09/09 | 09/10 |
| D8 | Bộ tính năng hoàn chỉnh là phạm vi sản phẩm: mười ba đơn vị triển khai, nhóm theo bốn engine. Đóng băng tính năng của D4 áp cho `FloraOS` v1, không áp cho core | 09/11 |
| D9 | MVP là bảy pha P13–P19, theo đúng chuỗi "chụp ảnh → catalog, ảnh, video, bài viết, lịch đăng, landing" | 09/11 |
| D10 | Video vào MVP. Ghi đè có chủ đích hai câu "ngoài phạm vi" trước đó — video và Marketing Creative Engine. Căn cứ: `video_jobs`, adapter nhà cung cấp và chi phí thật đã có ở `SocialFlow` | 09/11 |
| D11 | Tự duyệt theo thời hạn chỉ áp cho nội dung đăng bài, qua công tắc cấp tổ chức gác bằng `O7`, tắt theo mặc định, mỗi lượt ghi nhật ký kiểm toán với người bật công tắc là người chịu trách nhiệm | 09/11 |
| D12 | Integration API mở đúng ba đường ghi: đăng ký asset dẫn xuất, số liệu hiệu quả nội dung, mức dùng. Mọi đường khác vẫn là đọc | 09/11 |
| D15 | Năng lực trước, mô hình sau. Mọi lời gọi AI đi qua cổng AI; mô hình là cấu hình trong sổ đăng ký, không phải mã | 09/12 |
| D16 | Cổng AI là một lớp trong `floraos-core`, không phải dịch vụ thứ tư. Engine ngoài giữ cổng của riêng nó, đọc cùng sổ đăng ký và cùng chính sách qua Integration API | 09/12 |
| D17 | Bộ định tuyến bị bó năm ràng buộc: chỉ chọn trong số mô hình đã đo · chính sách tổ chức là trần · mô hình chốt vào `payload` lúc tạo job · thác nghiệm chỉ leo lên · sàn quyền riêng tư cắt sau cùng. D5-c không đổi | 09/12 |
| D18 | Không mô hình nào vào production khi thiếu một trong bốn ô giấy phép; áp cả cho thành phần không phải mô hình | 09/12 |
| D19 | Không thêm hạ tầng cho nền AI: `pgvector` trên Postgres đang dùng, hàng đợi vẫn là `generation_jobs`, kho tệp vẫn tương thích S3 | 09/12 |

**Còn mở**

| # | Nội dung | Chặn |
|---|---|---|
| D13 | Cơ sở pháp lý và hình dạng cơ chế đồng ý cho dữ liệu cá nhân của khách hàng cuối, gồm quyền xoá thuộc về chính khách hàng | Go-live của M09 và M10, không chặn việc dựng lược đồ |
| D14 | Bảng giá `cost_credit` cho các `feature` mới — biến thể ảnh, video, nội dung. Chi phí thật của một video chênh hai bậc so với một ảnh, nên D7 không mở rộng sang được — **CHỐT v1 25/09/2026** (PO giao agent đề xuất): định giá tương đối theo bốn nguyên tắc ở `src/modules/usage/domain/pricing.ts` — 1 credit ≈ một lượt gọi một mô hình; đường nhà cung cấp ảnh = cục bộ + 1; thu theo đường thật đã chạy (lùi cục bộ → hoàn chênh); một lần bấm = một lần thu. Tỷ giá credit ↔ VND vẫn thuộc D2; xem lại con số sau 30 ngày có `cost_usd` thật (nợ #151) | — (đã chốt v1) |
| D20 | Ngưỡng chấp nhận của từng năng lực ngoài Identity Guard. Ngưỡng Guard đã chốt; các năng lực còn lại chưa có dữ liệu có đáp án nên chạy bằng giá trị tạm có ghi nợ | AI-2 |

## 13. Rủi ro

| Rủi ro | Mức | Cách chặn |
|---|---|---|
| AI thay đổi nhận dạng sản phẩm — số lượng, màu, hình dạng | Critical | Product Identity Guard là cổng cứng bắt buộc, không phải tuỳ chọn |
| Generative fill dùng mà không đánh dấu | High | `flags.generative_fill_used` bắt buộc trong hợp đồng JSON |
| Sinh lược đồ thiếu `organization_id` do làm sai thứ tự pha | High | Chặn cứng: không tạo bảng/route thật trước khi P1 và P2 nghiệm thu |
| Dữ liệu dùng để huấn luyện khi chưa có consent | High | Cơ chế policy/consent cấp tổ chức, sẵn sàng trước go-live |
| Rò dữ liệu giữa tổ chức qua worker và GPU dùng chung | High | Cột soát cách ly tenant bắt buộc trong ma trận chọn công nghệ |
| Thu hoạch mã cũ làm mất luật nghiệp vụ không ai viết ra | High | Mọi luật thu hoạch đi kèm test khoá nó; test xanh trên core mới thì mới coi là chuyển xong |
| Chạy song song hai hệ kéo dài | Medium | Đồng bộ một chiều Excel → core, cắt một lần, không ghi ngược |
| Tăng cường chạy lại cho từng tỷ lệ, tốn GPU | Medium | Master Image + Smart Reframe: enhancement chạy một lần |
| Nhà cung cấp AI ngừng hỗ trợ | Medium | Mọi provider nằm sau cổng; đổi provider là thay adapter |
| Engine marketing sinh nội dung từ ảnh chưa duyệt, cổng duyệt thành trang trí | Critical | Đường đọc ảnh của engine ngoài chỉ trả asset `APPROVED`; P13 đứng trước P16/P17 |
| Biến thể ảnh và video âm thầm đổi nhận dạng sản phẩm | High | Biến thể dựng trên Master Image đã duyệt, không gọi lại lớp tăng cường; khung đầu và khung cuối của video là ảnh đã duyệt |
| Dữ liệu cá nhân khách hàng cuối đi qua nhà cung cấp AI | High | Nội dung nhắc mua sinh từ dịp và sản phẩm; phần định danh ghép ở tầng gửi; `customer_consents` là điều kiện go-live |
| Tự duyệt theo thời hạn lan sang dữ liệu sản phẩm hoặc giá | High | Công tắc `O7` chỉ đọc được ở luồng nội dung đăng bài; ba luồng duyệt còn lại không có nhánh theo thời gian |
| Số liệu hiệu quả của thương hiệu kế thừa trộn vào số của tổ chức thật | Medium | Mốc dữ liệu kế thừa ghi rõ trong nợ kỹ thuật; báo cáo phân biệt trước và sau mốc |
| Chi phí video vượt xa dải chi phí ảnh, credit tính sai | Medium | D14 chặn go-live của P17 |
| Tên nhà cung cấp nằm rải trong mã nghiệp vụ của mười ba đơn vị ở ba repo | High | Mọi lời gọi qua cổng AI; SDK chỉ trong `adapters/`, có lượt quét chặn trong CI; AI-1 đứng trước P16 |
| Nhà cung cấp mặc định sập, tính năng sập theo | High | Chuỗi dự phòng ở AI-2. Hiện chưa có: mặc định là bộ cục bộ và môi trường worker thiếu trọng số làm mọi lượt phân tích hỏng (nợ #70) |
| Mô hình trọng số mở vào production với giấy phép không cho phép dùng thương mại, hoặc giới hạn lãnh thổ | High | Bốn ô giấy phép bắt buộc trong sổ đăng ký; mô hình thiếu một ô không bật được |
| Dữ liệu cá nhân khách hàng đi ra nhà cung cấp bên ngoài qua bước dự phòng | High | Sàn quyền riêng tư cắt sau cùng, kể cả ở bước dự phòng; hết đường thì job `FAILED` và hoàn credit |
| Mô hình tự quyết giá trị đi vào cơ sở dữ liệu | High | Nhãn mô hình tra qua danh mục loài; không tra được thì để trống cho người soát, giữ nguyên nhãn gốc |

## 14. Luật thu hoạch

Thang ưu tiên: **REUSE > EXTEND > ADAPTER > BUILD**. Mọi hạng mục xếp hạng trước khi viết dòng mã đầu tiên. Xếp hạng BUILD cho thứ đã tồn tại ở một trong ba repo là lỗi chặn ở review; xếp hạng REUSE cho thứ thật ra là EXTEND là lỗi tốn kém nhất.

Chín câu hỏi phải trả lời trước mỗi hạng mục: hạng thu hoạch · nguồn ở repo và tệp nào · test nào khoá luật và đã chép chưa · entity thuộc core hay engine · đã có `organization_id` chưa · thao tác có phải job không · có ghi usage không · kết quả có cần duyệt không · năng lực nào gác, năng lực duyệt có tách riêng không.

---

## Phụ lục — cột dự kiến cho bản Excel

| Cột | Nguồn trong PRD |
|---|---|
| Mã hạng mục | Mục 5, 7 |
| Tên hạng mục | Mục 5, 7 |
| Module / Pha | Mục 5, 10 |
| Repo sở hữu | Mục 5, 8 |
| Hạng thu hoạch | Mục 14 |
| Phụ thuộc | Mục 10 |
| Ước lượng | Mục 10 |
| Tiêu chí nghiệm thu | Mục 11 |
| Năng lực gác | Mục 7.2 |
| Trạng thái | — |

Giá trị đưa lên Master Index: ngưỡng đồng thời 100–500 · SLA 10–30 giây · dải chi phí ảnh 0,01–0,20 USD và video 0,05–5 USD · kích thước bộ ảnh vàng 8 ảnh · mười ba đơn vị triển khai, bốn engine · dải mã năng lực A–T · tổng thời lượng Tuyến A 5–6 tháng · bảy pha MVP của Tuyến B (P13–P19).

Số lượng mã năng lực và số mã có trần cứng không đưa lên Master Index dưới dạng hằng số: chúng sinh từ `capability-catalog.ts` và chỉ đọc ở đặc tả 02 mục 3.
