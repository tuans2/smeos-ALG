# 4. Function Inventory — As-Is (phần A: nền tảng, sản phẩm, AI & nội dung)

Phần B (bán hàng & vận hành): [04b-kiem-ke-chuc-nang-ban-hang.md](04b-kiem-ke-chuc-nang-ban-hang.md).

Quy ước cột: **Input** = trường chính của body/query (từ zod ở route); **Xử lý** = những gì use-case làm; **Luật/Validation** = điều kiện chặn có trong mã; **Lỗi** = mã `AppError` ném ra (map HTTP ở `src/core/http/errors.ts`: `VALIDATION_FAILED` 400, `UNAUTHENTICATED` 401, `CAPABILITY_DENIED`/`ENTITLEMENT_REQUIRED` 403, `NOT_FOUND` 404, `CONFLICT` 409, `QUOTA_EXCEEDED`/`UNPROCESSABLE_ENTITY` 422, `RATE_LIMITED` 429, `INTERNAL` 500). Mọi chức năng có phiên đều qua `requireTenantContext` (401 nếu không có phiên, 409 nếu phiên chưa chọn tổ chức). Bản ghi thuộc tổ chức khác → 404.

## 4.1 Xác thực & tổ chức (MOD-01, MOD-02)

| Chức năng | Thao tác người dùng | Input | Xử lý | Output | Luật / Validation | Lỗi | Phụ thuộc | Status |
|---|---|---|---|---|---|---|---|---|
| Đăng ký | Form "Dùng thử" ở `/dang-nhap` | `email`, `password`, `name?`, `organization_name`, `seed_profile?` | Một giao dịch tạo `users`, `organizations(type=EXPERIENCE, credit_balance=20)`, `workspaces(kind=EXPERIENCE, trial_limit=20)`, dịp mặc định, `memberships(dieu_hanh, ACTIVE)`, `sessions`; tuỳ chọn nạp hồ sơ mẫu | Cookie `floraos_session` + `floraos_sso` | Email đúng dạng; mật khẩu ≥ 10 ký tự; tên tổ chức không rỗng; slug duy nhất | 400, 409 (email đã có), 500 (thiếu vai hệ thống) | bcryptjs, `SESSION_SECRET` | Implemented |
| Đăng nhập | Form `/dang-nhap` | `email`, `password` | So bcrypt; thu hồi mọi phiên còn sống của tài khoản rồi tạo phiên mới gắn membership ACTIVE đầu tiên; ký JWT SSO 15 phút | `{user_id, organization_id}` + 2 cookie | Sai email và sai mật khẩu trả cùng câu | 401 | `SSO_SESSION_SECRET` | Implemented (không có rate limit ở route) |
| Đăng xuất | Menu người dùng | cookie | Ghi `sessions.revoked_at`, xoá cookie | 200 | — | — | — | Implemented |
| Kiểm phiên bị thay | Tự hỏi định kỳ (`SessionTakeoverWatcher`) | cookie | `GET /auth/session-status` | `SESSION_SUPERSEDED` khi phiên bị thay bởi đăng nhập khác | — | 401 | — | Implemented |
| Đổi tổ chức | Không có màn gọi `POST /session/organization` trong repo | `organization_id` | Đối chiếu `memberships` rồi ghi `sessions.organization_id` | 200 | Phải là thành viên | 404 | — | Partially (chỉ API) |
| Sửa tổ chức | `/cai-dat` | `name?`, `settings?` | Hợp nhất nông vào `organizations.settings` | Tổ chức | `F2` | 400, 403 | — | Implemented |
| Mời thành viên | `/cai-dat/thanh-vien` | `email`, `role_id`, `branch_id?` | Tạo user với `password_hash: ""` nếu chưa có + membership `INVITED` | Membership | `F3`; vai phải thuộc tổ chức/hệ thống | 400, 404, 409 | — | Partially (không có bước chấp nhận lời mời, không gửi email) |
| Đổi vai / gỡ thành viên | `/cai-dat/thanh-vien` | `role_id` / — | Cập nhật / xoá membership | — | `F5` / `F4` | 404 | — | Implemented |
| Tạo vai riêng, chỉnh mã của vai | `POST /roles` có màn gọi; `PATCH /roles/:id/capabilities` không có màn gọi | `key`, `name` / danh sách `{code, allowed}` | Ghi `roles` / `capability_overrides` | — | `F5`; mã có trần cứng với vai đó bị từ chối | 400, 404 | — | Partially |
| Chi nhánh, workspace | `GET /branches` có màn gọi | `name`, `code`, `address?` | Ghi `branches` / `workspaces` | — | `F6`/`F7`/`F8`; mã chi nhánh duy nhất trong tổ chức | 409 | — | Partially (sửa chi nhánh, workspace không có màn gọi) |
| Dịp của tổ chức | `/tai-anh`, cài đặt | `code`, `name`, `register`… | CRUD mềm (`is_active`) | — | `F1`/`F2`; không đổi `code` | 400, 409 | — | Implemented |
| Yêu cầu nâng cấp tổ chức | Không có màn gọi (component `experience-grid.tsx`, vốn không được render, ghi "liên hệ quản trị") | `requested_type`, `note?` | Ghi `audit_logs` action `organization.upgrade_requested`; không đổi `type` | `{recorded:true}` | Chỉ khi `type = EXPERIENCE` | 409 | — | Partially |

## 4.2 Hồ sơ, mẫu ghi đè (MOD-03, MOD-28)

| Chức năng | Thao tác | Input | Xử lý | Output | Luật | Status |
|---|---|---|---|---|---|---|
| Hồ sơ kinh doanh | `/ho-so` tab hồ sơ | `display_name`, `legal_name`, `phone`, `email`, `address`, `website`, `social_links`, `tax_code`, `description`, `operating_hours` | PUT thay toàn bộ (`business_profiles`, 1/tổ chức) | Bản ghi hoặc `null` | `F1` đọc, `F2` ghi | Implemented |
| Hồ sơ thương hiệu | `/ho-so` tab thương hiệu | màu, font, `logo_asset_id`, `tone_of_voice`, `hashtags`, `cta_templates`, `default_offers`, `forbidden_styles`, `brand_assets` | PUT thay toàn bộ (`brand_profiles`) | Bản ghi hoặc `null` | `F1`/`F2` | Implemented |
| Ghi đè mẫu | `/tai-anh` | `templateKey`, `fieldKey`, `value` | Upsert/xoá `template_overrides` | — | `F1`/`F2`; chỉ field nằm trong danh sách hỗ trợ (`template-override-rules.ts:80`) | Implemented |

## 4.3 Sản phẩm, giá, phân tích ảnh, dữ liệu bán hàng (MOD-04 → MOD-06)

| Chức năng | Thao tác | Input | Xử lý | Output | Luật / Validation | Lỗi | Status |
|---|---|---|---|---|---|---|---|
| Tạo sản phẩm | `/san-pham/tao-moi` | `code`, `name`, `category?`, `attributes?`… | Ghi `products(status=DRAFT)` | Sản phẩm | `L2`; `code` duy nhất trong tổ chức | 409 | Implemented |
| Sửa / ngừng kinh doanh | `/san-pham/[id]` | trường sản phẩm, `status` | Cập nhật | — | `L3`; sang `ARCHIVED` cần thêm `L4` | 403, 404 | Implemented |
| Tra cứu sản phẩm | `/san-pham` | `branch_id`, `status`, `category`, con trỏ | Mặc định ẩn `ARCHIVED`; khối `pricing` chỉ trả khi có `L5` | Danh sách | `L1` | — | Implemented |
| Nhập hàng loạt | `/san-pham/nhap-hang-loat` | Excel + ảnh | `POST /products/batch-import` | Kết quả từng dòng | `L2` | 400 | Implemented |
| Quy tắc giá | `/gia` | `key`, `value`, `branch_id?` | Chèn dòng mới (`pricing_rules`), đọc giá hiệu lực đã hợp nhất mặc định/tổ chức/chi nhánh | Cấu hình hiệu lực | `L5` đọc, `L6` ghi; chi nhánh phải thuộc tổ chức | 400, 404 | Implemented |
| Yêu cầu phân tích ảnh | `/tai-anh` tải ảnh | `asset_ids`, `product_id?`, `Idempotency-Key` | Kiểm asset thuộc tổ chức → `enqueueJob(feature="vision.analyze")` (1 credit) | Job + usage | `H1`; hạn mức credit/trial; trần tần suất | 404, 422, 429 | Implemented |
| Xử lý phân tích (worker) | — | dòng `generation_jobs` | `workers/vision/jobs/worker.py` chọn bộ máy theo `payload.engine` (có dự phòng), ghi `product_analyses.raw`, cập nhật `stage/result/status`, `job_events` | Phân tích `PENDING` | — | Job `FAILED` | Implemented (chạy thật NOT VERIFIED) |
| Sửa kết quả phân tích | `/tai-anh`, `/duyet` | `edited` | Ghi `product_analyses.edited`, không đụng `raw` | — | `H2`; không sửa được bản `APPROVED` | 409 | Implemented |
| Duyệt / từ chối phân tích | `/duyet`, `/tai-anh` | `id` | Duyệt: ghi Product Master (tạo `products` nếu `product_id` null) + `APPROVED` + audit trong 1 giao dịch. Từ chối: `REJECTED` + audit | — | `H3` (trần cứng ĐH) | 404, 409 | Implemented |
| Xuất phân tích | `/duyet` | — | CSV UTF-8 có BOM, có trần số dòng | Tệp CSV | `H3` | — | Implemented |
| Chọn bộ máy phân tích | `/bo-may` | `engine ∈ {openai_structured, openai_direct, local_cv}` | Ghi `organizations.settings` + audit | — | Đọc `H1`, ghi `H4` | 400 | Implemented |
| Sinh dữ liệu bán hàng | `/tai-anh`, `/san-pham/[id]/tinh-nang` | `analysis_id`, `Idempotency-Key` | `enqueueJob("product.copy.generate", 1 credit)` → gọi cổng AI `AIC-04` tại chỗ → `product_copies.raw` | Bản nháp | `H5`; phân tích phải `APPROVED`; kiểm từ cấm | 404, 409, 422 | Implemented |
| Sửa / duyệt / từ chối dữ liệu bán hàng | trang product-copy | `edited` / `reason` | Duyệt ghi Product Master + audit | — | Sửa `H5` khi `PENDING`; duyệt/từ chối `H6` | 404, 409 | Implemented |

## 4.4 Asset, job, mức dùng, kiểm toán (MOD-07 → MOD-10)

| Chức năng | Input | Xử lý | Luật | Status |
|---|---|---|---|---|
| Xin URL tải lên | `product_id?`, `mime_type` | Sinh `asset_id` và `storage_key = org/<org>/<product>/<asset>.<ext>`; URL ký sẵn | `G2`; client không chọn đường dẫn | Implemented |
| Đăng ký asset | `asset_id`, `kind`, kích thước, `generated_flags`… | Ghi `assets` (gốc bất biến; dẫn xuất là bản ghi mới nối `parent_asset_id`) | `G2` | Implemented |
| Xem/xoá asset | `id` | URL ký có hạn; xoá | `G1` / `G3` (trần cứng ĐH) | Implemented |
| Thùng rác | `id`, `type ∈ {RAW_ASSET, APPROVED_ANALYSIS, PRODUCT}` | Chuyển `ARCHIVED` + ghi `trashed_at` vào metadata/attributes; khôi phục; xoá vĩnh viễn; mục quá 30 ngày bị xoá vĩnh viễn khi danh sách được mở (`trash-repository.ts:50,90`) | Một trong `G3/L4/A3/B6` | Implemented |
| Đọc tệp qua URL ký | `key`, chữ ký | `GET/PUT /storage/[...key]` kiểm chữ ký HMAC (`verifyStorageSignature`) | Không cần phiên | Implemented |
| Danh sách / chi tiết job | lọc | `G4` chỉ job của mình; thêm `G5` thấy toàn tổ chức | `G4`, `G5` | Implemented |
| Huỷ / chạy lại job | `id` | Huỷ chỉ khi `PENDING`; chạy lại chỉ khi `FAILED` (COMPLETED/REJECTED → 409) | `G6` / `G7` | Implemented |
| Quét job treo | — | `PROCESSING` quá 15 phút → `FAILED` (script `npm run quet-job-treo`; lịch cron trong `cron-job-entry.txt` trỏ đường dẫn máy cá nhân) | — | Implemented (lịch chạy production NOT VERIFIED) |
| Mức dùng | khoảng thời gian | Liệt kê `usage`, tổng hợp | `G8` | Implemented |
| Hoàn credit | — | `refundJob` (hoàn toàn phần, dòng `REFUNDED`), `refundPartial` (dòng `PARTIAL_REFUND` âm) gọi khi đọc kết quả media/video; `refundUsage` (không có nơi gọi) đã xoá 07/11/2026 | — | Implemented |
| Nhật ký kiểm toán | lọc | Đọc `audit_logs` | `G9` (trần cứng ĐH) | Implemented |

## 4.5 Ảnh, video, âm thanh (MOD-11 → MOD-13)

| Chức năng | Input | Xử lý | Luật | Status |
|---|---|---|---|---|
| Tối ưu ảnh (M04a) | `asset_id`, bộ máy, `Idempotency-Key` | Job `media.optimize` (2 credit; nhà cung cấp 3) → worker `media_ai` (enhancer chain: Real-ESRGAN/passthrough/Photoroom/fal/OpenAI/Gemini/Imagen/Replicate; Identity Guard) | `I1`; asset thuộc tổ chức | Implemented |
| Duyệt ảnh tối ưu → MASTER | `id` | Đặt asset `APPROVED`, audit; `REJECTED` không vào luồng duyệt | `I2` (trần cứng ĐH) | Implemented |
| Nâng ảnh gốc thành MASTER | `asset_id` | Sao bản ghi asset `kind=MASTER, APPROVED`, audit | `I2`; chỉ từ `ORIGINAL` | Implemented |
| Tải ảnh | `id` | Tải về không phải duyệt | `I3` | Implemented |
| Biến thể marketing (M04b) | master đã duyệt, preset, `autoEnhance?` | Job `media.variant` (1) / `.cloud` (2), có nhóm lô `job_group_id`; worker `variant_worker.py` (cổng toàn vẹn sản phẩm) | `I4`; duyệt từng tấm `I5` | Implemented |
| Video job (M04c) | `title`, `format`, cảnh, nhạc, giọng | Tạo `video_jobs`/`video_scenes`; sửa storyboard (không khi `RENDERING`); duyệt kịch bản → render job `video.render` (5 credit) → duyệt video | `I1`, `P3`, `P4` | Implemented |
| Âm thanh | cảnh, giọng, nhạc, chất lượng | Job `audio.generate` (credit theo tham số); worker phối TTS (OpenAI / ElevenLabs / MiniMax / Edge TTS — `workers/media_ai/audio/tts_engine.py`) + nhạc | `I1` | Implemented |
| Thư viện nhạc | tệp, `license_type`, `license_source`, cam kết | Lưu `music_tracks` (xoá mềm `deleted_at`); nhạc hệ thống trong `workers/media_ai/video/assets/music/` | `I1` | Implemented |
| Nhân bản giọng | mẫu giọng, `consent_text` | Job `audio.voice_clone` (5 credit) → ElevenLabs `voices/add`, ghi `provider_voice_id`; xoá mềm | `I1`; cam kết bắt buộc | Implemented |

## 4.6 Creative Studio, nội dung, catalog, AI (MOD-14 → MOD-16, MOD-23)

| Chức năng | Input | Xử lý | Luật | Status |
|---|---|---|---|---|
| Kế hoạch cảnh | `asset_id`, `topic`, `mode` | `enqueueJob("creative.scene_plan")` rồi gọi cổng AI tại chỗ | `I1` | Implemented |
| Sửa cảnh / viết lại bài | cảnh, chỉ dẫn | Job `creative.scene_revise` / `creative.content_rewrite` + cổng AI | `I1` | Implemented |
| Gói chiến dịch | master, mode, bài, video | `DRAFT → QA_* → APPROVED`; kế hoạch đăng; hiệu quả (đọc đơn hàng) | Tạo/sửa `I1`; duyệt/launch `J5`; hiệu quả `R1` | Implemented |
| Sinh nội dung đa kênh (M07) | `asset_id`, `topic_id`, `mode`, `channels` | Job `content.generate` (2 credit); chuỗi AIC-37 → AIC-23 → kiểm tất định → AIC-24 → viết lại tối đa `MAX_REWRITE_ROUNDS` → `content_generations(DRAFT)` | `I1`; duyệt `J5` (+ audit) | Implemented |
| Sinh nội dung catalog/landing, viết lại | sản phẩm, brief | Cổng AI (AIC-25/26) | Chỉ `requireTenantContext` (nợ #170) | Implemented |
| Kiểm từ cấm | `text` | `flower-content-guard` với `flower-content-banned-lexicon.json` | Chỉ cần phiên | Implemented |
| Catalog link | `slug`, `name`, `filters` | Ghi `catalog_links`; trang `/c/[slug]` ký lại URL ảnh; lead công khai | Tạo `J1`; thu hồi `J2` | Implemented / Partial (sửa/thu hồi không có màn) |
| Chính sách AI | `capability_code`, `allowed_models`, `quality_target`, `cost_ceiling`, `privacy_floor` | Ghi `ai_policies` + audit; đổi `AIC-01` đòi thêm `H4` | Đọc `U1`, ghi `U2` | Implemented |
| Sổ lời gọi AI | lọc | Đọc `ai_requests`, tổng hợp theo năng lực × mô hình; soát (approve/reject/modify) | `U3` | Implemented (tổng hợp/soát không có màn) |
| Thứ tự nhà cung cấp | danh sách | Ghi thứ tự theo tổ chức + audit | Đọc `I1`, ghi `U2` | Implemented |
