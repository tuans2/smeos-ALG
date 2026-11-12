# Bộ tính năng ALG — đối chiếu với mã thật

> [!NOTE]
> **TÀI LIỆU KHẢO SÁT LỊCH SỬ (HISTORICAL AUDIT SNAPSHOT — 11/09/2026)**  
> Tệp này ghi nhận ảnh chụp hiện trạng đối chiếu tính năng tại thời điểm ngày 11/09/2026 khi tiến hành rà soát 3 repo và mở rộng Tuyến B & Tuyến C.  
> **Nguồn sự thật duy nhất (OSOT)** cho hiện trạng đang chạy thực tế của toàn bộ nền tảng ALG core nằm tại: [`docs/kien-truc/TRANG_THAI.md`](TRANG_THAI.md).

**Cấp:** hồ sơ đối chiếu, phụ trợ cho Level 1. Không thắng về nội dung kỹ thuật.
**Ngày soát:** 2026-09-11
**Căn cứ:** `ALG_SAAS_TARGET_ARCHITECTURE_V2.md` · `../dac-ta/00-PRD.md` · `../dac-ta/02-function-catalog.md` · `../dac-ta/Checklist_Thuc_Thi.md` · `TRANG_THAI.md` · `UNIFIED_SHELL.md` · `DOT_3_NOI_SOCIALFLOW.md` · bản đồ trạng thái tám module ngày 09/11

Tệp này trả lời đúng một câu hỏi: **bộ tính năng hoàn chỉnh cần những gì, phần nào đã nằm trong mã, phần nào còn phải xây.** Nội dung đích của từng hạng mục nằm ở tài liệu kiến trúc và bộ đặc tả; ở đây chỉ có trạng thái và ranh giới.

Ba nhãn dùng xuyên tệp:

| Nhãn | Nghĩa |
|---|---|
| **Đã có** | Có mã chạy được, có đường gọi thật từ giao diện hoặc từ API, đã qua ít nhất một lượt xác minh trên dữ liệu thật |
| **Một phần** | Có mã, nhưng thiếu một mắt trong chuỗi: không có màn hình bắt đầu, chưa nối engine, hoặc chạy bằng chỗ giữ vị trí |
| **Chưa có** | Không có bảng, route, hay màn hình nào |

---

## 1. Năm Engine và mười ba đơn vị triển khai

Bốn engine đầu là **cách nhóm năng lực theo chuỗi giá trị**, không phải một tầng triển khai mới: mỗi engine gồm các module đã có mã module riêng, và ranh giới sở hữu dữ liệu ở PRD mục 8 không đổi. Engine thứ năm khác hẳn — nó là một tầng thật, và bốn engine kia gọi AI qua nó.

| Engine | Câu hỏi engine trả lời | Module |
|---|---|---|
| **Vision Engine** | Trong ảnh này là sản phẩm gì, gồm những gì, bao nhiêu cành | M01 · M01b |
| **Creative Engine** | Ảnh và video nào bán được sản phẩm này trên kênh nào | M04a · M04b · M04c |
| **Marketing Engine** | Viết gì, đăng ở đâu, lúc nào, cho ai | M07 · M05 · M06 |
| **Learning Engine** | Bài nào hiệu quả, vì sao, lần sau làm khác thế nào | M11 |
| **AI Orchestration Engine** | Dùng mô hình nào, khi nào, tốn gì, được chạm dữ liệu nào | tầng dùng chung — mục 3 |

Ba module vận hành không thuộc engine nào vì chúng không sinh nội dung: M02 giá, M03 tra cứu, M09 khách hàng, M10 đơn hàng, M08 hội thoại. Chúng là phần nghiệp vụ mà bốn engine phục vụ.

| Mã | Module | Repo | Trạng thái |
|---|---|---|---|
| M01 | Phân tích ảnh sản phẩm | `floraos-core` | Đã có |
| M01b | Sinh dữ liệu bán hàng của sản phẩm — tên, mô tả, thẻ, dịp, phân khúc giá | `floraos-core` | Chưa có |
| M02 | Giá và chi phí | `floraos-core` | Đã có |
| M03 | Tra cứu sản phẩm | `floraos-core` | Đã có |
| M04a | Tối ưu ảnh sản phẩm — Identity Guard, Master Image | `floraos-core` | Một phần |
| M04b | Ảnh marketing — xoá nền, đổi nền, mở rộng khung, retouch, watermark, biến thể | `SocialFlow` | Chưa có |
| M04c | Video marketing — Reel, TikTok, Story, slideshow, motion quảng cáo | `SocialFlow` | Một phần |
| M05 | Landing page chiến dịch | `LocalBudd` | Đã có |
| M06 | Catalog và QR catalog | `floraos-core` (M06/M05) | Đã hoàn thành (100% Commercial Ready) |
| M07 | Nội dung và đăng bài đa nền tảng | `SocialFlow` | Một phần |
| M08 | Trợ lý hội thoại khách hàng | Chưa có repo | Chưa có |
| M09 | Khách hàng và nhắc mua lại | `floraos-core` | Chưa có |
| M10 | Đơn hàng và vận hành | `floraos-core` | Chưa có |
| M11 | Phân tích hiệu quả và học phong cách | `floraos-core` · `SocialFlow` (số liệu gốc) | Một phần |

---

## 2. Mười nhóm tính năng, đối chiếu từng mục

### 2.1 Phân tích sản phẩm bằng AI — M01, M01b

| Tính năng | Trạng thái | Nằm ở đâu trong mã |
|---|---|---|
| Tải một hoặc nhiều ảnh, một lượt phân tích cho cả lô | Đã có | `POST /vision/analyses` nhận `asset_ids[]`, `/tai-anh` nối đủ upload → job → duyệt |
| Nhận diện loại hoa, đếm số lượng từng loại | Đã có | Hợp đồng `PhanTichSanPhamHoa`, `count_engine.py`, ba tổng đếm cộng tại chỗ từ `bom` |
| Phát hiện lá, phụ kiện, giấy gói, nơ | Đã có | Khối `bom` của hợp đồng, bốn nhóm cấu phần |
| Màu sắc chủ đạo | Đã có | `color_engine.py` |
| Phong cách thiết kế, dịp phù hợp | Một phần | Hợp đồng có `identity` (phân loại, hình dáng, hướng nhìn, vật chứa); phong cách và dịp chưa là trường của hợp đồng |
| Tên sản phẩm, mô tả bó hoa | Chưa có | Duyệt phân tích ghi Product Master bằng dữ liệu cấu trúc; không có bước sinh câu chữ |
| Thẻ phân loại, tone màu dạng nhãn bán hàng | Chưa có | — |
| Phân khúc giá gợi ý | Chưa có | `quotePrice` tính giá theo công thức và quy tắc; không suy phân khúc từ thành phần |

**Việc còn lại:** M01b. Nó đọc một lượt phân tích **đã duyệt** và sinh phần câu chữ bán hàng. Đầu ra của nó là kết quả AI, nên nó đi qua đúng cổng Review → Approve như M01, bằng cặp năng lực `H5` ↔ `H6`. Hai trường `phong_cach` và `dip_su_dung` thêm vào hợp đồng Vision theo luật chỉ-thêm-trường (`YC-N3`), không đổi trường đã có.

### 2.2 AI Creative Studio — M04a, M04b

| Tính năng | Trạng thái | Ghi chú ranh giới |
|---|---|---|
| Phân tích chất lượng ảnh, tách sản phẩm | Đã có | `StudioEnhancer` micro-pipeline: `RembgSegmenter` (bria-rmbg) → `EdgeDefringer` → `StudioBackdropEngine` |
| Tăng cường ảnh sản phẩm — sáng, màu, nét | Đã có | P13. Đa provider qua `enhancement/router.py`: studio (mặc định), openai, gemini, replicate, realesrgan, pil |
| Master Image và các tỉ lệ 1:1, 4:5, 9:16, 16:9 | Đã có | `SmartReframe` sinh 4 tỷ lệ từ Master MỘT LẦN; ghi 1 `MASTER` (`PENDING`) + 4 `RATIO` |
| Identity Guard | Đã có | `workers/media_ai/guard/`, 19 ca thử, ngưỡng 0,95 / 0,90 |
| Cổng duyệt ảnh, tải về tách khỏi duyệt | Đã có | `I3` tải, `I2` duyệt, có ca thử khoá "tải về xong ảnh vẫn chờ duyệt" |
| Xoá nền ra PNG trong suốt | Đã có | P24. `media.variant` → `variant_worker.py`, ghi `assets` `kind = MARKETING` |
| Đổi nền — studio, phòng khách, khách sạn, lễ cưới | Đã có | P24. Sáu bối cảnh, dựng trên Master Image đã duyệt; thư viện dùng chung mọi tổ chức (nợ #77) |
| Watermark logo cửa hàng | Đã có | P24. `brand_profiles.logo_asset_id`, lùi về `organizations.name` khi chưa có logo |
| Cổng toàn vẹn cho biến thể | Đã có | P24. Subject Integrity đo tỷ lệ điểm ảnh lõi chủ thể trùng khít Master; `REJECTED` không ghi asset nào |
| Mở rộng khung ảnh, banner ngang | Chưa có | Nợ #78. `_dong_khung` đệm về đúng tỷ lệ, không sinh thêm hậu cảnh — outpainting là `AIC-13`, cần `protectMask` |
| Sinh 20–50 biến thể từ một ảnh gốc | Một phần | Một lượt sinh tối đa ba biến thể (tách nền · bối cảnh · đóng dấu) ở một tỷ lệ. Chạy nhiều lượt thì ra nhiều biến thể, nhưng chưa có đường chạy lô |

**Luật giữ nguyên:** một bó hoa chỉ được tăng cường **một lần** ra Master Image. Biến thể không gọi lại AI tăng cường và không đổi nhận dạng sản phẩm. Đường nào sinh ra pixel mới trên chính bó hoa đều thuộc M04a và phải qua Identity Guard, kể cả khi người dùng bấm nút trong màn Creative Studio.

**Luật đó nay được ĐO, không chỉ được phát biểu (P24).** Vì lõi chủ thể phải giữ nguyên từng điểm ảnh, worker M04b đo tỷ lệ điểm ảnh lõi còn trùng khít với Master Image sau khi ghép bối cảnh (mặt nạ co biên, nên phần viền làm mềm có chủ đích không tính là sai lệch). Dưới 0,99 thì không biến thể nào được ghi. Bản trước hiển thị `100% / 99% / 98%` — ba hằng số gõ tay trong mã giao diện, không phép đo nào chạy.

### 2.3 AI Video Studio — M04c

| Tính năng | Trạng thái | Nằm ở đâu |
|---|---|---|
| Hạ tầng job video, 2 cổng duyệt (Script & Output) | **Đã có** | Module `src/modules/video-studio/`, bảng `video_jobs` có `organization_id`, kết nối `generation_jobs` SSE real-time |
| Kiến trúc Provider cắm rút (Pluggable Architecture) | **Đã có** | `workers/media_ai/video/providers/`: Phương án A `LocalCinematicProvider` (mặc định, 0 credit, ~0.45s/cảnh) & Phương án B Standby `GoogleVeoProvider`, `HeyGenProvider` (kích hoạt theo nhu cầu qua `.env`) |
| 6 khuôn đầu ra chuẩn (Reel, TikTok, Story, Slideshow, Product, Ad) | **Đã có** | `VIDEO_FORMAT_SPECS`, hỗ trợ phân cảnh linh hoạt từ 2 đến 15 cảnh, tự động cân bằng thời lượng |
| Chuyển động máy quay điện ảnh Ken Burns | **Đã có** | `slideshow_engine.py` (Zoom In, Zoom Out, Pan Lên, Pan Ngang, Cảnh tĩnh) luân phiên mượt mà 30fps |
| Âm thanh & Phụ đề đa phong cách | **Đã có** | TTS lồng tiếng, ducking nhạc nền tự động, 4 phong cách phụ đề (Modern Badge, Minimal, Highlight Box, Bottom Banner) khớp 100% lời thoại |
| Báo usage và chi phí về core | **Đã có** | `calculateVideoCreditCost`, trừ credit theo khuôn và thời lượng, hoàn trả tự động nếu lỗi |

Video Studio (P17, M04c) đã nghiệm thu hoàn thành 100%, chuyển trạng thái sang **Hoạt động** trên Dashboard và sẵn sàng sử dụng.

### 2.4 AI Content Engine — M07

**Quyết định PO 25/09/2026 (P27):** bảng dưới đây mô tả pipeline 6 agent (`scout/planner/creator/reviewer/publisher/analyst`) của `SocialFlow` — đây là pipeline đăng tin công nghệ (HackerNews/GitHub → LinkedIn/X/Discord/Reddit) thừa kế từ dự án gốc, **không đọc Product Master, không có logic ngành hoa, không dùng chung với `/api/m07/generate`**. FloraOS sẽ KHÔNG nâng cấp pipeline này cho hoa; việc sinh nội dung ngành hoa được xây mới trong `floraos-core` (chuỗi Strategist→Writer→Critic→Rewriter, đọc Product Master/Master Image/kịch bản Chặng 05 thật) — xem `docs/kien-truc/ALG_SAAS_TARGET_ARCHITECTURE_V2.md` mục 12 (dòng M07) và kế hoạch project claude.ai `claude/ke-hoach-content-engine-core-25-09-2026.md`. `SocialFlow` giữ lại phần đăng bài (§2.5) và chỉ nhận bài đã duyệt từ core.

| Tính năng | Trạng thái | Nằm ở đâu |
|---|---|---|
| Sinh nội dung theo giọng thương hiệu | Một phần | `creator.py` đọc `brand_config`; `brand_config` đã một hàng mỗi tổ chức |
| Facebook post, Instagram caption và hashtag, kịch bản TikTok | Một phần | Sáu agent sinh nội dung, nhưng nguồn đề tài là tin công nghệ (HackerNews, GitHub) — di sản repo gốc |
| Nội dung Zalo OA | Chưa có | Không có adapter Zalo |
| Tiêu đề, mô tả SEO, hashtag, nội dung quảng cáo | Một phần | Sinh được dạng văn bản, chưa gắn vào sản phẩm của Product Master |
| Kịch bản livestream, tin nhắn bán hàng | Chưa có | — |
| Nội dung sinh từ **một bó hoa cụ thể** | Chưa có | Đây là mắt thiếu quan trọng nhất: engine nội dung chưa đọc Product Master lẫn Master Image của core |

**Việc còn lại:** chiến lược nội dung ngành hoa (thay nguồn đề tài công nghệ bằng sản phẩm, dịp, mùa vụ của chính cửa hàng), adapter Zalo OA, và đường đọc Product Master + Master Image đã duyệt qua Integration API.

### 2.5 Social Publishing — M07

| Tính năng | Trạng thái | Nằm ở đâu |
|---|---|---|
| Đăng đa nền tảng | Đã có | `publisher.py`, automation Playwright, 14 nền tảng khai |
| Lịch đăng bài, hẹn giờ | Đã có | Bốn job `APScheduler`, `run_scheduled_cycle()` chạy lô song song theo tổ chức |
| Chỉnh sửa trước khi đăng | Đã có | `posts` có trạng thái duyệt, route `approve`/`reject` |
| Quản lý thư viện nội dung | Một phần | `content_queue`, `assets` nội bộ; không có màn thư viện |
| Auto approval sau 24h | Chưa có | Va vào Luật 3 — xem mục 4.2 |
| Repost nội dung cũ thông minh | Chưa có | Cần Learning Engine để chọn bài đáng đăng lại |
| Xác thực người gọi, ranh giới tổ chức trên toàn bộ route | Một phần | `sso_auth.py` và `org_context.py` chạy trên ~50 route; 52 route chưa nhắc `organization_id` ở lượt kiểm kê 09/10 |
| Facebook Graph theo tổ chức | Chưa có | Còn dùng một Page token chung; Đợt 3 mục E6 |

### 2.6 Catalog và Website — M05, M06

| Tính năng | Trạng thái | Nằm ở đâu |
|---|---|---|
| Landing page theo chiến dịch | Đã có | `floraos-core` M05/M06: tab Landing page, 4 Archetypes (Minimal Luxury, Pastel Romantic, Festive Sale, Modern Split), Live preview Mobile/Desktop, Lead CTA form |
| Landing page dựng từ hồ sơ thương hiệu của core | Đã có | `brand_profiles` + `business_profiles` (logo, màu chủ đạo, số điện thoại, địa chỉ), áp dụng trực tiếp lên `/c/[slug]` |
| Catalog số — danh mục, giá, dịp, màu, loại hoa, bộ sưu tập | Đã có | Tuyến `/catalog` quản trị + storefront công khai `/c/[slug]`, tìm kiếm, lọc dịp, giá, modal chi tiết sản phẩm và nút Zalo 1-chạm |
| QR catalog tại cửa hàng | Đã có | `src/core/media/qr-engine.ts`, tải PNG sắc nét 500px 1-chạm phục vụ in ấn và đặt tại bàn |
| Khuôn chiến dịch theo mùa — 20/10, Valentine, 8/3, Ngày của Mẹ, Khai trương, Hoa cưới | Đã có | `CAMPAIGN_OCCASIONS` & `CAMPAIGN_ARCHETYPES` tại `landing-campaign-constants.ts` |
| Chia sẻ đa nền tảng & Cầu nối M07 Content Engine | Đã có | Modal chia sẻ Facebook, Zalo, Copy caption; tích hợp 2 chiều sang `/noi-dung?catalog_slug=...` tự gắn link đặt hoa vào bài viết social |

### 2.7 CRM và khách hàng — M09

Chưa có gì. Không bảng, không route, không màn hình. `customers` và họ hàng của nó thuộc core vì đơn hàng, hội thoại, chiến dịch nhắc mua và phân tích hiệu quả đều đọc chúng.

Nhóm này mang dữ liệu cá nhân của người mua — khác về bản chất với mọi dữ liệu core đang giữ. Ràng buộc bắt buộc ghi ở mục 4.3.

### 2.8 Đơn hàng và vận hành — M10

| Tính năng | Trạng thái | Ghi chú thu hoạch |
|---|---|---|
| Từ vựng quyền cho luồng chào giá và điều phối | Đã có | 28 mã `C1`–`C28` thu hoạch nguyên vẹn từ v1, nằm trong `capability-catalog.ts` |
| Thẻ chào giá, xuất PNG/PDF A6, kịch bản Zalo | Chưa có | Luồng chưa xây — nợ #26 |
| Quản lý đơn hàng, trạng thái sản xuất | Chưa có | — |
| Phân công thợ cắm, theo dõi giao hàng, SLA | Chưa có | — |
| In phiếu đơn, lời nhắn thiệp | Chưa có | v1 có phần xuất thẻ; logic định mức tiền công theo độ khó (`D16`) cũng đã có mã |

M10 là module có tỷ lệ thu hoạch cao nhất trong phần chưa xây: giao diện v1 đã chạy thật cho AVI GIFT hằng ngày, và 28 mã năng lực cùng bảng nghiệm thu `BAN_GIAO.md` mô tả đúng luồng đó.

### 2.9 AI Chat Assistant — M08

Chưa có repo. Điều kiện để nó trả lời đúng: đọc được Product Master, giá đã duyệt, tồn trạng thái sản phẩm, và vùng giao hàng của tổ chức. Ba thứ đầu đã có trong core; vùng giao hàng thuộc M10.

Ranh giới bắt buộc: trợ lý trả lời bằng **catalog của chính cửa hàng**, không bằng kiến thức chung của mô hình. Câu trả lời về giá đọc từ `quotePrice` chứ không để mô hình tự tính.

### 2.10 Analytics và Learning — M11

| Chỉ số | Trạng thái | Nằm ở đâu |
|---|---|---|
| Reach, engagement, top post | Một phần | `post_metrics`, `weekly_metrics`, `analytics_store.py` của `SocialFlow` |
| Inbox — số khách hỏi | Chưa có | Cần M08 hoặc webhook nền tảng |
| Conversion — chuyển thành đơn | Chưa có | Cần `orders` của M10; không có đường nối bài đăng với đơn |
| Top product — bó hoa bán tốt | Chưa có | Cần `orders` |
| ROI campaign | Chưa có | Phép nối giữa chi phí (`usage`, `cost_usd`) và doanh thu (`orders`) |
| Học phong cách của cửa hàng sau khoảng 20 bài | Chưa có | `content_insights` có bảng, chưa có vòng học |

**Ranh giới sở hữu:** số liệu gốc từng nền tảng thuộc `SocialFlow`. Phép nối ROI và hồ sơ học phong cách thuộc core, vì cả M01b, M04b và M07 đều đọc hồ sơ đó — theo đúng luật cắt "core sở hữu entity nhiều hơn một module đọc".

---

## 3. Nền AI — đối chiếu

Nền AI không thêm tính năng nào. Nó đặt lại cách mười ba đơn vị triển khai gọi mô hình, và phần lớn giá trị của nó là phần chưa có: hôm nay chỉ module phân tích ảnh có cổng, và chỉ nó có sổ đăng ký — dưới dạng một tệp mã, không phải một bảng.

| Thành phần | Trạng thái | Nằm ở đâu trong mã |
|---|---|---|
| Cổng ở mức hợp đồng JSON cho thị giác | Đã có | `VisionAnalyzer`, ba adapter sau cổng, `registry.py` |
| Bộ máy chốt vào `payload` lúc tạo job, worker không tra lại | Đã có | Đúng ràng buộc thứ ba của bộ định tuyến, đã làm từ D5-d |
| Chọn bộ máy ở cấp tổ chức, có màn hình, có nhật ký kiểm toán | Đã có | `organizations.settings.bo_may_phan_tich`, `H4`, màn `/bo-may` |
| Bộ tách thực thể và bộ gọi tên trọng số mở | Đã có | SAM2 + Florence-2 trong `local_cv`, đã chạy thật trên máy Apple Silicon |
| Ba kênh đếm | Một phần | `count_engine.chot()` có đủ ba kênh; đường chạy mới nối kênh mô hình thị giác |
| Danh mục loài | Một phần | `species_catalog.json` 86 loài kèm alias, so **chữ** chứ không nhìn lại ảnh; 63 cặp dễ nhầm chưa dùng; chưa là bảng, chưa có vector |
| Chấm điểm đầu ra | Một phần | `identity_score`/`quality_score` là cột; Identity Guard có 19 ca thử; `local_cv` trần `confidence` 55. Không có bảng `ai_evaluations`, không có ngưỡng theo năng lực |
| Sổ chi phí | Một phần | `usage.cost_credit` theo `feature`, `assets.cost_usd` theo tài sản. Không có số đo theo **mô hình**: không độ trễ, không giây GPU, không điểm chất lượng |
| Sàn quyền riêng tư | Một phần | `local_cv` không gửi ảnh ra ngoài và màn `/bo-may` nói rõ bộ nào gửi ảnh đi. Nhưng lời gọi không mang mức quyền riêng tư, nên không có gì cưỡng chế |
| Sổ đăng ký mô hình | Một phần | `registry._dung_local_cv` là sổ trong **mã**. Không có bảng, không có bốn ô giấy phép, không bật tắt được mà không sửa mã |
| Sổ đăng ký năng lực | Chưa có | — |
| Cổng AI: giải năng lực, kiểm chính sách, kiểm lược đồ đầu ra, ghi sổ | Chưa có | Mỗi worker tự gọi adapter của nó |
| Chín cổng còn lại (ảnh, video, tiếng nói, embedding, tách nền) | Chưa có | Phần tách nền có mã thật nhưng nằm **trong** adapter `local_cv`, không đứng sau cổng riêng |
| Bộ định tuyến | Chưa có | Lựa chọn hiện là tĩnh theo tổ chức — đúng và an toàn, nhưng không có trục chi phí, độ trễ, hay sức khoẻ nhà cung cấp |
| Thác nghiệm và chuỗi dự phòng | Chưa có | `registry.lay_provider` ném lỗi cho **mọi** job khi môi trường worker thiếu trọng số — đây đúng là chỗ chuỗi dự phòng phải có mặt (nợ #61) |
| Truy hồi tri thức, `pgvector` | Chưa có | Tra cứu sản phẩm hiện là lọc SQL |
| Sự kiện miền | Chưa có | `job_events` là nhật ký một job, `audit_logs` là nhật ký hành động người — không cái nào là sự kiện miền |
| Đặc trưng nội dung cho vòng học | Chưa có | `content_insights` của engine ngoài có bảng, chưa có vòng học |
| Ma trận chọn công nghệ kèm ô giấy phép | Chưa có | Là mục còn mở duy nhất khác của P5, cùng với bộ ảnh vàng |

### 3.1 Bốn chỗ tài liệu nền AI va vào quyết định đã chốt

Bốn chỗ dưới đây là khuyến nghị hợp lý ở mức tổng quát nhưng va vào một quyết định đã chốt của ALG. Cả bốn xử theo quyết định đã chốt, và lý do ghi lại ở đây để không ai mở lại mà không biết vì sao.

| Khuyến nghị | Va vào | Xử |
|---|---|---|
| Hàng đợi Redis hoặc dịch vụ hàng đợi quản lý | D6-1 — Postgres làm hàng đợi | Giữ `generation_jobs`. Một hàng đợi thứ hai là một nguồn sự thật thứ hai về trạng thái job, và trạng thái job là thứ đã hỏng một lần ở hệ v1 vì nằm trong bộ nhớ tiến trình |
| Dựng `flora-ai-gateway` thành một dịch vụ riêng | D6-1 cấm job qua HTTP; Đường A giữ ba repo | Cổng AI là một **lớp** trong core (`src/core/ai/`, `workers/ai/`). Một dịch vụ đứng giữa core và worker sẽ là đúng đường HTTP bị cấm, hoặc một hàng đợi thứ hai. Ghi thành D16 |
| Bộ định tuyến tự chọn mô hình theo chi phí và chất lượng | D5-c, D5-d — đổi bộ máy chỉ bằng số đo trên bộ ảnh vàng; `H4` là quyền của tổ chức | Bộ định tuyến bị bó năm ràng buộc: chỉ chọn trong số đã đo, chính sách tổ chức là trần, chốt vào payload, thác chỉ leo lên, sàn quyền riêng tư cắt sau cùng. Ghi thành D17 |
| Lược đồ đầu ra thị giác mới, khoá tiếng Anh | `YC-N3` — hợp đồng chỉ được thêm trường; ba bộ máy trả cùng một hình dạng | Hợp đồng `PhanTichSanPhamHoa` giữ nguyên là hình dạng duy nhất. Lược đồ trong tài liệu nền AI đọc như **hình chiếu** của nó, không phải lược đồ thứ hai. Hai trường `phong_cach` và `dip_su_dung` vào bằng cách thêm trường |

Một chỗ thứ năm nhỏ hơn nhưng dễ lọt: mặc định của tự duyệt sau 24 giờ. Tài liệu nền AI vẽ đường `24h timer → auto_approve → publish` với một ngoại lệ theo điểm rủi ro. D11 đã chốt ngược lại — công tắc **tắt** theo mặc định, chỉ áp cho nội dung đăng bài, và hết thời hạn mà công tắc tắt thì bài quay về hàng chờ. Điểm rủi ro được nhận vào như một lớp chặn **thêm** bên trong ngoại lệ đó, không phải như đường mặc định: đổi giá, khuyến mại, khẳng định pháp lý hoặc y tế, độ tin cậy thấp, sản phẩm không còn — năm loại này không bao giờ tự duyệt, kể cả khi công tắc bật.

## 4. Bốn luật không đổi khi mở rộng

Bộ tính năng hoàn chỉnh thêm mười ba đơn vị triển khai. Bốn luật dưới đây là điều kiện để việc thêm đó không làm vỡ nền. Bốn luật của nền AI nằm ở đặc tả 10 mục 1 và không thay bốn luật này — chúng nói về cách gọi mô hình, còn bốn luật dưới đây nói về cách dữ liệu đi qua hệ thống:

1. **Một bảng `assets` cho mọi loại** — ảnh gốc, ảnh phân tích, ảnh tăng cường, Master Image, ảnh marketing, ảnh catalog, ảnh landing, ảnh và video social. Engine ngoài không dựng bảng asset thứ hai làm nguồn sự thật; bản ghi làm việc cục bộ của engine đăng ký về core khi thành tài sản chính thức của sản phẩm.
2. **Một bảng `usage` cho mọi module**, phân biệt bằng `feature`. Mọi lượt sinh ảnh, sinh video, sinh nội dung, sinh trang đều ghi vào đây và kiểm hạn mức tại điểm tạo job phía core.
3. **Đầu ra AI không tự thành dữ liệu nghiệp vụ chính thức.** Mỗi loại đầu ra mới mang theo đúng một cặp năng lực chạy ↔ duyệt.
4. **Nhận dạng sản phẩm là bất biến.** Mọi module dựng trên Master Image đã duyệt; không module nào ngoài M04a được sinh pixel mới trên chính bó hoa.

---

## 5. Ba chỗ bộ tính năng va vào luật hiện hành

### 4.1 Biến thể ảnh

"Từ một ảnh gốc tạo 20–50 biến thể" đọc như sinh lại sản phẩm. Cách thi hành: biến thể là tổ hợp **nền · bố cục · khung · chữ chồng · watermark** áp lên cùng một Master Image đã duyệt, chạy ở M04b, không gọi lại lớp tăng cường và không qua Identity Guard lần nữa (vì chính sản phẩm không đổi). Một biến thể muốn sửa ánh sáng hay hình dáng bó hoa là một lượt M04a mới, có Guard và có cổng duyệt riêng.

### 4.2 Tự duyệt sau 24 giờ

Luật 3 nói đầu ra AI phải qua Review → Approve. "Auto approval sau 24h" là ngoại lệ theo thời gian, nên nó bị bó lại ba lớp:

- Chỉ áp cho **nội dung đăng bài** (M07). Không áp cho kết quả phân tích sản phẩm, Master Image, giá, hay dữ liệu khách hàng.
- Là công tắc cấp tổ chức, gác bằng `O7` với trần cứng Điều hành, tắt theo mặc định.
- Mỗi lượt tự duyệt ghi `audit_logs` với người chịu trách nhiệm là người bật công tắc, không phải "hệ thống".

Ngoài ba lớp đó, hết thời hạn mà không ai duyệt thì bài hết hiệu lực và quay về hàng chờ, không tự đăng.

### 4.3 Dữ liệu cá nhân của người mua

M09 và M10 mang tên, số điện thoại, địa chỉ, ngày kỷ niệm của khách hàng cuối — dữ liệu cá nhân, không phải dữ liệu sản phẩm. Ba điều kiện chặn go-live của hai module này:

- Cơ sở pháp lý và cơ chế đồng ý cho việc thu thập, lưu, và dùng để nhắc mua; tách khỏi cơ chế consent dữ liệu huấn luyện đã có.
- Xoá theo yêu cầu của chính khách hàng cuối, không chỉ theo yêu cầu của tổ chức.
- Số điện thoại và địa chỉ không đi qua nhà cung cấp AI nào. Nội dung nhắc mua sinh từ dịp và sản phẩm; phần định danh ghép ở tầng gửi.

---

## 6. MVP — bảy module và điều kiện đạt

| # | Module | Trạng thái | Điều kiện còn lại để đạt |
|---|---|---|---|
| 1 | M01 Vision | Đã có | Bộ ảnh vàng có nhãn thật; ma trận chọn công nghệ |
| 2 | M01b Product AI | Chưa có | Hai trường hợp đồng mới; cặp năng lực `H5`/`H6`; bảng `product_copies` |
| 3 | M04a Image Studio | Một phần | Tăng cường thật thay `PassthroughEnhancer`; Smart Reframe cho bốn tỉ lệ; màn bắt đầu một lượt tối ưu |
| 4 | M04b Creative Studio | Chưa có | Xoá nền, đổi nền, mở rộng khung, watermark, biến thể; đường đọc Master Image đã duyệt |
| 5 | M04c Video Studio | Một phần | Sáu khuôn đầu ra; lớp dựng cảnh; `organization_id` trên `video_jobs`; usage về core |
| 7 | M06 Catalog & Website | Đã hoàn thành | E-Catalog trực tuyến (/catalog & /c/[slug]), bộ lọc dịp/giá, Landing Page chiến dịch, QR marketing 1-chạm, chia sẻ Facebook/Zalo, cầu nối M07 |


Bốn nhóm còn lại — M09 khách hàng, M10 đơn hàng, M08 hội thoại, M11 phân tích nâng cao — mở sau MVP. Riêng phần phân tích cơ bản (reach, engagement, top post) dùng được ngay từ số liệu `SocialFlow` đã có.

---

## 7. Điểm lệch giữa tài liệu và mã

| # | Điểm lệch | Trạng thái |
|---|---|---|
| 1 | `F9` (`integration.token.manage`) có trong mã từ P7 nhưng không có dòng nào trong bảng của đặc tả 02 — bảng liệt kê ít hơn mã nguồn đúng một dòng | Đã đóng — thêm vào nhóm `F` của đặc tả 02 |
| 2 | Con số danh mục năng lực nằm rải nhiều tệp với ba giá trị: 113 sau P2, 114 / 31 sau `F9` ở P7, 115 / 32 sau `H4` theo D5-d. Giá trị đúng tại 09/11 là **115 mã / 32 trần cứng**; hai giá trị kia là trạng thái của các mốc trước | Đã đóng — con số đọc từ `capability-catalog.ts`; đặc tả 02 mục 4 nói rõ mã nào đã có trong mã nguồn và mã nào vào ở pha nào. Danh mục đích khi cả Tuyến B và Tuyến C xong: 159 mã / 48 trần cứng |
| 3 | "Video ngoài phạm vi bản này" ở PRD mục 4 và ở mục "ngoài phạm vi" của yêu cầu kỹ thuật (nay là mục 21) | Đã đóng theo D10 — video vào MVP, hai mục đã sửa |
| 4 | "Marketing Creative Engine ngoài phạm vi" | Đã đóng theo D8 — M04b vào MVP |
| 5 | `D1` mang hai nghĩa ở hai chỗ: worker đơn tenant (Level 1, PRD, lộ trình) và đa tenant thật (đặc tả 08, Unified Shell, mã đã chạy) | Đã đóng — giữ nghĩa đa tenant thật, ghi thành D1-b ở Level 1, PRD, `Roadmap.md`, `TRANG_THAI.md` |
| 6 | `UNIFIED_SHELL.md` mục B3 ghi SSO SocialFlow "chưa bắt đầu"; mã thật đã có `sso_auth.py` chạy trên hơn 50 route với 32/32 test qua | Đã đóng — B3 sửa theo mã, phần còn lại trỏ về Đợt 3 nhóm E |
| 7 | `M04` (Level 2) xếp Giai đoạn 2 Video vào M04a trong core; phân bổ hiện hành đặt video ở `SocialFlow` thành M04c | Đã đóng — mục A của `M04_ALG_PRODUCT_IMAGE_OPTIMIZER_FULL.md` ghi phân bổ ba đơn vị; nội dung kỹ thuật Giai đoạn 2 giữ nguyên và đọc như đặc tả M04c |
| 8 | Integration API chỉ có đường đọc; bốn bảng còn lại của `LocalBudd` chặn vì thiếu đường ghi | Còn mở — ba đường ghi đã đặc tả (D12), chưa có mã. P15 |
| 9 | `Roadmap.md` ghi "P0 xong, đang ở trước P1" trong khi P8 đã xong và P9 đợt một đã nghiệm thu | Đã đóng — trạng thái sửa theo `Checklist_Thuc_Thi.md` |
| 10 | `HARVEST_MANIFEST.md` còn ghi câu hỏi D1 là câu hỏi mở | Đã đóng — đánh dấu đã chốt, giữ câu hỏi gốc làm hồ sơ |
| 11 | Engine thứ năm có ở Level 1 nhưng chưa lên PRD: bảng engine, phạm vi, lộ trình, sổ quyết định và bảng rủi ro đều còn bốn engine | Đã đóng — PRD mục 5, 7.15, 10, 12, 13 sửa theo |
| 12 | Tám bảng của nền AI có trong đặc tả 07 nhưng không có dòng nào trong bảng sở hữu dữ liệu ở Level 1 mục 2.1, PRD mục 8 và đặc tả 08 mục 1 | Đã đóng — thêm vào cả ba, kèm câu nói rõ vì sao sổ đăng ký thuộc core và vì sao `flower_taxonomy` là ngoại lệ của Luật 1 |
| 13 | Endpoint chính sách AI có ở đặc tả 06 mục 18 nhưng không có màn hình ở đặc tả 03 và không có tuyến ở đặc tả 04 | Đã đóng — đặc tả 03 mục 6.2, tuyến `cai-dat-ai` ở đặc tả 04, và chính sách của workspace trải nghiệm ở đặc tả 09 mục 6b |
| 14 | Bản sao tài liệu trong project Claude cũ hơn bản trên máy (`DASHBOARD_VAN_HANH_NEN_TANG.md`, `UNIFIED_SHELL.md` đã sửa trên máy mà chưa đồng bộ lên) | Đã đóng — cả bốn tệp trong project ghi lại từ bản trên máy |

Hai việc còn mở không phải điểm lệch tài liệu mà là quyết định của chủ sản phẩm, theo dõi ở `../dac-ta/TECHNICAL_DEBT.md`: bảng giá credit cho biến thể, video, nội dung (nợ #64, D14) · cơ sở đồng ý cho dữ liệu cá nhân khách hàng cuối (nợ #65, D13). Danh mục dịp (nợ #63) đã trả bằng bảng `occasions` ở đặc tả 07 mục 9.
