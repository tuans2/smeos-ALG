# Kiến Trúc AI Creative Studio — SSOT Architecture Document

> **Module:** AI Creative Studio — Chặng 01–14 của hành trình Product-to-Market, gói trong 6 Khu vực tab (A–F)
> **Route:** `/creative-studio`
> **Phiên bản:** 4.4 — 24/09/2026 (khuya) — **Phạm vi sản xuất**: chủ tiệm chọn nền tảng + loại kết quả (content/audio/hình ảnh/video) cuối Chặng 04, chỉ sản xuất phần đã chọn; mỗi khung một bộ ảnh + một video; gói nhiều video; QA `scope_coverage` (§7.3, §8). Bản 4.3 — 24/09/2026 (đêm) — **Kịch bản sản xuất tổng** (Đợt 1–5, quyết định PO): Chặng 05 lên toàn bộ kế hoạch (nền tảng → khung, thời lượng, âm thanh, video, bài đăng, `revision`); B/C/D thực thi; E dựng video từ ảnh D + nguyên bản phối C (`POST /creative-production/video-assembly`); sửa ở Chặng 07 đồng bộ sang video; QA trục đồng nhất. Chi tiết: IO Spec §5.0b, §6, §7. Bản 4.2 — 24/09/2026 (tối) — Khu vực C: bốn tác vụ âm thanh thật, thư viện nhạc có giấy phép, Voice Clone ElevenLabs. Bản 4.1 — 24/09/2026 — Nâng cấp sau chạy thật trên máy anh Tony: kịch bản bối cảnh theo chủ đề sinh ở Chặng 05 dùng chung B/C/D/E; sửa chất lượng ảnh worker (lõi đặc, cổng phủ ≥ 60%); Khu vực E theo kịch bản + giọng đọc + phát video; Chặng 07 xem lại và **sửa tại chỗ** mọi kết quả. (Bản 4.0 — 23/09/2026: đồng bộ 100% theo mã.)
> **Trạng thái:** Đã triển khai trên nhánh `fix/creative-studio-production-ready`. Nghiệm thu trên máy thật còn thiếu: `npm run test:tenant` (cần Postgres), chạy thử worker với `STABILITY_API_KEY` thật, `lint` toàn repo (xem §9).
>
> **Quy tắc đọc:** chi tiết thi công (tên tệp, đường dẫn, method, mã năng lực, enum) lấy mã nguồn làm chuẩn (Hiến pháp Tài liệu §2, quy tắc 2). Tài liệu này mô tả đúng những gì mã đang làm, kể cả giới hạn.

---

## 1. Tổng Quan & Vai Trò

Creative Studio gom hành trình "1 sản phẩm hoa → 1 chiến dịch" vào một màn hình 6 khu vực. Khu vực A là điểm khởi đầu; B–E sản xuất; F đóng gói, kiểm định, duyệt và theo dõi hiệu quả.

| Khu vực | Tab ID | Nhãn | Icon | Chặng | Component | Việc thật mã đang làm |
|---|---|---|---|---|---|---|
| A | `area-a` | Quét theo ảnh sản phẩm | Camera | 01–05 | `<ProductIntelligenceWorkspace />` | Tải ảnh → `assets` (ORIGINAL) · Vision `gpt-4o-mini` bóc tách nguyên tử · Trend Fit (đối chiếu `trend_signals`) · 10 chủ đề (sinh theo luật trong `trend-fit.ts`) · chọn chủ đề + Mode → bàn giao qua URL chỉ mang định danh |
| B | `area-b` | Viết contents | FileText | 06a | `<ContentsWorkspace />` | `POST /creative-production/produce` → 4 bài (Facebook, Instagram, TikTok, Zalo) sinh theo khuôn (`social-post-generator.ts`); cung truyện HIỂN THỊ theo kịch bản bối cảnh của chủ đề (`withScenePlan`); 4 bài **tự lưu** vào `content_drafts` (1,2 giây sau lần sửa cuối) |
| C | `area-c` | Tạo audio | Headphones | 06b | `<AudioWorkspace />` | Bốn tác vụ thật (Voiceover / Music Select / Audio Mix / Voice Clone, `audio-task-rules.ts`) → job `audio.generate` (credit theo bảng giá) → worker TTS + khớp cảnh + sidechain + -14 LUFS, ghi kho → nghe lại qua `GET /audio/jobs/:id`; thư viện nhạc có giấy phép (`music_tracks`) và giọng nhân bản ElevenLabs (`voice_clones`, job `audio.voice_clone`) |
| D | `area-d` | Tạo biến thể ảnh | Wand2 | 06c | `<VariantWorkspace />` | Phân cảnh theo kịch bản bối cảnh của chủ đề (`creative.scene_plan`, CREATIVE 5 / AUTHENTIC 3), mỗi cảnh là một job `media.variant` (Studio cục bộ) hoặc `media.variant.cloud` (hậu cảnh Stability) — Subject Integrity ĐO bởi worker |
| E | `area-e` | Tạo video | Film | 06d | `<VideoWorkspace />` | Storyboard dựng từ kịch bản bối cảnh (số cảnh, phụ đề, lời thoại, chuyển động) + ảnh biến thể cùng cảnh của D (thiếu thì Master); chọn giọng đọc; "Tạo video" lập bản nháp rồi khung `VideoJobLifecycle` làm P3 → render → phát/tải → P4 ngay trong E |
| F | `area-f` | Gói chiến dịch | Package | 07–09 (+10–14) | `<PackageWorkspace />` | Gói lưu ở `campaign_packages`; Chặng 07 hiện đủ tài sản (ảnh theo cảnh, video phát được, âm thanh nghe được, bài đăng) và **sửa tại chỗ** mọi loại, chạy ngầm, tự thay vào gói; QA năm trục phía máy chủ; duyệt `J5` + `audit_logs`; kế hoạch đăng; số liệu thật Chặng 11–14 |

### 1.1. Downstream (Chặng 10 → 14) — `<PackageDownstreamCard />`

Chỉ hiện sau khi gói ở trạng thái `APPROVED`. Mọi số liệu đọc từ `GET /creative-production/packages/:id/performance`:

- **10 LAUNCH** — lưu kế hoạch đăng (kênh, giờ) và **mã bài đã đăng** (`PUT /packages/:id/launch`). Việc đăng/lên lịch thật diễn ra ở **Lịch đăng** (`/lich-dang`, SocialFlow M07) — Creative Studio không tự đăng bài.
- **11 SELL** — số hội thoại mới (`chat_conversations`) kể từ ngày duyệt (toàn tiệm).
- **12 MEASURE** — đơn và doanh thu của **sản phẩm trong gói** kể từ ngày duyệt (`orders`/`order_items`, bỏ `DRAFT`/`CANCELLED`) + tổng `content_metrics` của các mã bài đã gắn. Chưa quy được đơn về từng bài đăng — giao diện ghi rõ.
- **13 LEARN** — so doanh thu trung bình theo góc tiếp cận chủ đề, preset Cảnh 2, có/không video trên các gói đã duyệt của tiệm; **chỉ kết luận khi ≥ 3 gói**, và chỉ khi có ≥ 2 nhóm để so.
- **14 NEXT BEST ACTION** — luật dựa trên dữ kiện thật (chưa gắn bài, chưa có video, 7 ngày không đơn, có hội thoại chưa chốt, góc thắng của tiệm, dịp cố định trong 30 ngày tới: 14/2, 8/3, 20/10, 20/11, 24/12).

---

## 2. Nguyên Tắc Thiết Kế Bất Biến

### 2.1. Khu vực A là điểm khởi đầu, không bao giờ bị chặn
`ValidationScreen` chỉ hiện khi vào B–F mà `validateTransition()` báo thiếu. Khu vực A không bao giờ bị chặn. Người dùng có thể bấm "tiếp tục" để bỏ qua màn cảnh báo (không chặn cứng).

### 2.2. Cổng chuyển tiếp `validateTransition()`
Tám trường bắt buộc: `topicId`, `mode`, `sourceImageUrl`, `productName`, `assetId`, `commercialPassport.category`, `commercialPassport.style`, `commercialPassport.components`, `commercialPassport.colors` (tệp `src/modules/creative-production/domain/validate-transition.ts`). Từ 23/09/2026 trang **không còn bịa** passport dự phòng ("Hoa tươi thiết kế", "Tone màu hài hòa") — thiếu dữ liệu thật thì cổng báo thiếu. `category` là hình dáng (`attributes.shape`), không phải phân khúc giá.

### 2.3. `assetId` bất biến, URL chỉ mang định danh (chống lỗi 431)
- Ảnh tải lên: `POST /api/v1/assets/upload-url` → `PUT` lên kho → `POST /api/v1/assets` (đăng ký `ORIGINAL`). Từng bước kiểm `res.ok`; lỗi thì dừng, không gán `assetId`.
- `buildHandoffSearchParams()` (`build-handoff-url.ts`) chỉ cho phép định danh; `isSafeHandoffQueryString()` kiểm lại. Ảnh luôn ký lại qua `GET /api/v1/assets/:id/view-url`.
- Định danh sinh ở C/E cũng đi qua URL: `audioJobId`, `videoJobId` — Khu vực F đọc lại qua API.
- `scenePlanId` (job `creative.scene_plan`, hoặc `rule` với kịch bản cơ bản) do Chặng 05 đặt lên URL; B/C/D/E/F chỉ TRA kịch bản, không tự tạo (trừ nút viết ở D cho lối vào không qua Chặng 05).
- Làm lại ở khu vực gốc từ Chặng 07 mang `returnTo=f` (+ `focusScene`, `videoJobId`, `audioJobId`); trang hiện thanh "← Quay lại gói (Chặng 07)".

### 2.4. Subject Integrity (M04b)
- Worker đo tỷ lệ điểm ảnh LÕI chủ thể trùng khít TUYỆT ĐỐI với Master Image trên mặt nạ co biên. Độ sâu co biên = `StudioBackdropEngine.LIGHT_WRAP_DEPTH_PX + 1` = 5px (sửa 23/09/2026 — trước đó 3px < light wrap 4px nên mọi biến thể hợp lệ bị đo ~0,96).
- Ngưỡng (`variant-rules.ts`): `≥ 0,999` SAFE · `≥ 0,99` WARNING · `< 0,99` REJECTED.
- **Thân sản phẩm đặc (24/09/2026):** sau khi tách nền, `_lam_dac_chu_the` coi alpha ≥ 128 là thân sản phẩm, co vào 4px → alpha 255 và điểm ảnh lấy NGUYÊN từ Master; chỉ dải viền ngoài giữ alpha mềm. `EdgeDefringer` chỉ khử màu trong dải 6px sát nền. Lý do: `bria-rmbg` trả ~75% đầu hoa ở alpha 128–244 và lõi ≈ 254 — trước đó defringer tô đè cả đầu hoa ("xoá nhoà"), phông lọt qua thân, và mọi ảnh thật bị đo ~0,82.
- **Cổng không được mù:** lõi đo phải phủ ≥ 60% thân sản phẩm (`TY_LE_PHU_LOI_TOI_THIEU`), không đủ thì trả chính tỷ lệ phủ → REJECTED. Ảnh giỏ hoa thật sau sửa: phủ 93%, integrity 1,00.
- **REJECTED thì không ghi asset nào** (job `COMPLETED` + `result = REJECTED`). Nhánh "vẫn ghi, dán nhãn WARNING" đã gỡ 23/09/2026.

### 2.5. Tenant Isolation
`organization_id` chỉ từ phiên máy chủ. `POST /creative-production/produce` không còn nhận `organizationId` trong body (23/09/2026). Bảng mới `campaign_packages` và `content_drafts` (24/09) là TENANT, đi qua `scopedWhere`/`scopedData`. Ảnh ký URL chỉ trong khoá của đúng tổ chức (`videoViewUrl` chỉ ký `videos/<tổ chức của phiên>/`).

### 2.6. Biến thể chỉ dựng từ MASTER đã duyệt
Cả hai nhánh M04b kiểm `kind = MASTER && approval_state = APPROVED` phía TS (`requestVariants`/`requestCloudVariant`, trả `409`) và kiểm lại ở worker. Ảnh ORIGINAL từ Khu vực A đi qua "Skip — Dùng ảnh gốc" (`POST /media/promote-to-master`, `I2`) — hàm này nay tìm đúng MASTER con của ảnh gốc để không tạo trùng.

### 2.7. Không chạy mô hình trong request HTTP
Mọi lượt dựng ảnh/âm thanh/video đi qua `enqueueJob` (hạn mức → trừ credit → `usage` → `generation_jobs` → `NOTIFY` trong một giao dịch, `Idempotency-Key` bắt buộc). Phía TS không còn adapter nhà cung cấp ảnh nào (gỡ 25/09, nợ #152): nhà cung cấp ảnh và Studio Backdrop Engine chỉ chạy trong worker Python (`workers/media_ai/providers/`).

Lượt LLM văn bản ngắn (người dùng đứng chờ vài giây) chạy **tại chỗ nhưng vẫn có sổ**: `enqueueJob` → `startInline` → `callCapability` qua cổng AI → `finishInline(output)`; hỏng thì `FAILED` + `refundJob`. Gồm `creative.scene_plan`, `creative.scene_revise` (AIC-18) và `creative.content_rewrite` (AIC-23) — cùng khuôn `product.copy.generate`.

---

## 3. Cấu Trúc Thư Mục

```
src/app/(app)/creative-studio/page.tsx          # Shell 6 khu vực + CreativeStudioContext (~470 dòng)

src/components/creative-studio/
├── contents-workspace.tsx        # B
├── creative-result-viewer.tsx    # B — 4 bài, cung truyện theo kịch bản, tự lưu `content_drafts`, "Lưu bài vào gói"
├── audio-workspace.tsx           # C — 4 tác vụ, chọn giọng, lời thoại, tạo job + chờ + nghe lại
├── music-library-panel.tsx       # C — thư viện nhạc: nghe thử, giấy phép, tiệm tự tải
├── voice-clone-panel.tsx         # C — giọng nhân bản (tải mẫu + cam kết, trạng thái, xoá)
├── audio-library-client.ts       # C — gọi API music-tracks / voice-clones
├── variant-workspace.tsx         # D — phân cảnh theo kịch bản của chủ đề, mỗi cảnh một job thật
├── scene-plan-client.ts          # C/D — tra/viết kịch bản bối cảnh (`/creative-production/scene-plans`)
├── source-picker.tsx             # D — chọn Master / Skip dùng ảnh gốc
├── video-workspace.tsx           # E — storyboard theo kịch bản, chọn giọng, khung job
├── video-storyboard-builder.ts   # E — dựng storyboard từ kịch bản + ảnh D (thuần, có test)
├── video-job-lifecycle.tsx       # E/F — P3 → render (hỏi lại 3 giây) → phát/tải → P4
├── package-workspace.tsx         # F — Chặng 07/08/09, tự lưu khi sửa tại chỗ, AI viết lại bài
├── package-review-section.tsx    # F — ảnh theo cảnh / video / âm thanh: xem, duyệt, sửa tại chỗ
├── package-revise-panels.tsx     # F — sửa cảnh + sinh lại ảnh, phối lại âm thanh, sửa video → P3 → render
├── package-qa-card.tsx           # F — hiển thị báo cáo QA thật
├── package-downstream-card.tsx   # F — Chặng 10–14
├── package-client.ts             # F/B/E — helper gọi API gói chiến dịch
├── validation-screen.tsx         # cổng chuyển tiếp B–F
├── use-creative-studio-data.ts   # state + API M04a/M04b dùng chung
├── types.ts
├── optimize-workspace.tsx        # M04a — CHƯA gắn vào Studio (M04a chạy ở /tai-anh)
└── asset-picker-grid.tsx         # chỉ optimize-workspace dùng

src/components/market-intelligence/
├── product-intelligence-workspace.tsx   # A — Chặng 01–05
├── creative-handoff-modal.tsx           # A — Chặng 05 CHOOSE, bàn giao
└── product-topics-list.tsx              # A — 10 chủ đề + video tham khảo (nhãn "ước tính" khi không phải số liệu thật)

src/modules/creative-production/
├── domain/  production-types · validate-transition · build-handoff-url · content-brief-builder ·
│            social-post-generator · topic-to-{audio,content,media,video}-bridge ·
│            campaign-package-rules (QA, duyệt, số đo, mẫu thắng, đề xuất) ·
│            scene-plan-rules (kịch bản bối cảnh theo chủ đề) · revision-rules (sửa cảnh / viết lại bài) — 24/09/2026
├── adapters/  scene-plan-ai-adapter (AIC-18) · revision-ai-adapter (AIC-18, AIC-23) · narrative-ai-adapter (cũ, chưa dùng)
├── use-cases/  produce-creative · produce-authentic · plan-narrative-arc · dispatch-production-jobs ·
│               package-campaign (ước tính, không lưu) · manage-campaign-package · get-campaign-performance ·
│               generate-scene-plan (job `creative.scene_plan`) · revise-assets (scene_revise, content_rewrite) · content-draft
└── infra/   campaign-package-repository · content-draft-repository (Prisma) · creative-production-repository (port in-memory cũ, chưa dùng)

src/modules/media/
├── domain/variant-rules.ts                 # feature, preset, ratio, ngưỡng, cổng Master
├── use-cases/request-variants.ts           # requestVariants · requestVariantBatch · requestCloudVariant
├── use-cases/get-variant-job.ts            # trả thêm engine / scene_index / cloud_fallback
└── adapters/README.md                      # trống — adapter ảnh TS đã gỡ (nợ #152), nhà cung cấp ảnh chỉ ở worker Python

src/modules/audio-studio/  domain/audio-task-rules (4 tác vụ, giá, cam kết) · use-cases/create-audio-job · get-audio-job ·
                           music-tracks · voice-clones · infra/{audio-job,music-track,voice-clone}-repository
src/modules/video-studio/  use-cases/get-video-job (`videoViewUrl` — URL ký có hạn) · dispatch-video-render (mã asset → `storage_key`, chặn cảnh thiếu ảnh)

workers/media_ai/
├── jobs/worker.py              # một vòng claim: media.optimize → media.variant → media.variant.cloud → audio.generate → audio.voice_clone → video.render
├── jobs/variant_worker.py      # M04b cả hai nhánh (local + cloud)
├── providers/background/stability_background.py   # hậu cảnh trống do Stability sinh
├── providers/segmentation/rembg_segmenter.py
├── image/studio_backdrop.py    # StudioBackdropEngine (composite(backdrop_image=...))
├── image/defringe.py           # EdgeDefringer — chỉ khử viền trong dải 6px sát nền
├── video/audio_engine.py       # giọng đọc từng cảnh + nhạc nền (sửa thứ tự tham số pad/silence 24/09)
├── video/providers/local_cinematic.py  # Ken Burns ffmpeg — không còn ảnh mẫu dự phòng
├── audio/audio_worker.py       # process_audio_generation_job — rẽ nhánh theo taskType
├── audio/voice_clone_worker.py # audio.voice_clone — ElevenLabs Instant Voice Clone
├── audio/mixing_engine.py      # fit_voice_to_scene · mix_audio (sidechain, -14 LUFS) · measure_loudness
└── generate_scene.py           # CLI đo tốc độ cho dev — KHÔNG nằm trên đường chạy production
```

---

## 4. Luồng 6 Khu Vực

```
A (01–05) ──05: AI viết kịch bản bối cảnh (scenePlanId)──▶ B · C · D · E (06a–06d, thứ tự tự do, cùng một kịch bản)
                                         │  B tự lưu bài; C/E mang audioJobId/videoJobId qua URL
                                         ▼
                                F: 07 PACKAGE (xem + sửa tại chỗ, chạy ngầm) ─▶ 08 QA (máy chủ) ─▶ 09 APPROVE (J5 + audit)
                                         ▼
                   10 LAUNCH (kế hoạch + mã bài) ─▶ 11–12 số liệu thật ─▶ 13 mẫu thắng ─▶ 14 đề xuất
```

---

## 5. API Contracts (đầy đủ ở `06-api-specification.md` §8, §19, §22, §23)

| Khu vực | Method · Path | Năng lực |
|---|---|---|
| A | `POST /assets/upload-url` · `POST /assets` · `GET /assets/:id/view-url` | `G2` · `G2` · `G1` |
| A | `POST /market-intelligence/vision-extract` · `POST /market-intelligence/product-intelligence` | `V1` · `V1` |
| A | `GET /product-intelligence/:id` | `V2` |
| B | `POST /creative-production/produce` · `/plan` · `/package` (ước tính) | `I1` |
| C | `POST /audio/jobs` (Idempotency-Key) · `GET /audio/jobs/:id` · `GET·POST /audio/music-tracks` · `DELETE /audio/music-tracks/:id` · `GET /audio/music-tracks/system/:trackId` · `GET·POST /audio/voice-clones` · `GET·DELETE /audio/voice-clones/:id` | `I1` |
| C · D | `POST·GET /creative-production/scene-plans` · `GET /creative-production/scene-plans/:id` (kịch bản bối cảnh, 24/09/2026) | `I1` |
| B · F | `GET·PUT /creative-production/content-drafts` (bài B tự lưu) | `I1` |
| F | `POST /creative-production/scene-revisions` (AI sửa một cảnh, 1 credit) · `POST /creative-production/content-rewrites` (AI viết lại một bài, 1 credit) | `I1` |
| D | `POST /media/variants` (`engine` local/cloud, `scene_index` 1–5, `scene_plan_id`, Idempotency-Key) · `GET /media/variants/:id` | `I4` |
| D | `POST /media/variants/:id/approve` · `GET /media/variants` | `I5` |
| D | `POST /media/promote-to-master` | `I2` |
| D | `GET /assets?kind=MARKETING&parent_asset_id=` (lọc theo Master — thêm 23/09/2026) | `G1` |
| E | `GET·POST /video/jobs` (`GET /:id` kèm `final_video_view_url`) · `PATCH /video/jobs/:id/storyboard` · `POST /video/jobs/:id/render` | `I1` |
| E | `POST /video/jobs/:id/approve-script` · `approve-video` | `P3` · `P4` |
| F | `POST·GET /creative-production/packages` | `I1` · `G1` |
| F | `GET·PATCH /creative-production/packages/:id` | `G1` · `I1` |
| F | `POST /creative-production/packages/:id/qa` | `I1` |
| F | `POST /creative-production/packages/:id/approve` · `PUT …/launch` | `J5` |
| F | `GET /creative-production/packages/:id/performance` | `R1` |

---

## 6. Năng Lực (theo `src/core/rbac/capability-catalog.ts`)

| Mã | Tên trong catalog | Dùng ở Creative Studio | Trần cứng |
|---|---|---|---|
| `G1`/`G2` | `asset.read` / `asset.upload` | đọc/tải ảnh, đọc gói | — |
| `V1` | `market_intel.research.run` | Vision + Product Intelligence (A) | — |
| `V2` | `market_intel.opportunity.read` | đọc lại report (A) | — |
| `I1` | `media.optimize` | produce/plan (B), audio (C), video (E), tạo/sửa/QA gói (F) — ⚠ dùng chung, xem nợ #121 | — |
| `I2` | `media.approve` | Skip — promote ORIGINAL → MASTER | **Có** |
| `I4` | `media.variant.run` | biến thể (D) | — |
| `I5` | `media.variant.approve` | duyệt biến thể (D) | **Có** |
| `P3` | `video.approve_script` | duyệt kịch bản video | — |
| `P4` | `video.approve_final` | duyệt video thành phẩm | **Có** |
| `J5` | `social.publish` | duyệt gói (09) + kế hoạch đăng (10) | — (chờ PO, nợ #121) |
| `R1` | `order.read` | số liệu Chặng 11–14 | — |

---

## 7. Khu vực D — Phân cảnh theo kịch bản bối cảnh của chủ đề

**Quyết định PO 24/09/2026:** bối cảnh ảnh phải đi theo kịch bản của CHỦ ĐỀ đã chọn ở Chặng 04–05, số cảnh theo kịch bản (CREATIVE 5: `SETUP → RISING → CLIMAX → RESOLUTION → CTA`; AUTHENTIC 3: `SETUP → CLIMAX → CTA`), kịch bản do AI viết qua job. Khuôn 4 cảnh viết cứng trước đó (studio trắng → một bối cảnh chọn theo `angleCategory` → bàn gỗ → PNG) đã gỡ — nó không đọc dịp hay tông màu nên chủ đề "sinh nhật tone vàng" ra "sảnh khách sạn".

### 7.0. Kịch bản bối cảnh (`creative.scene_plan`)

- Domain thuần: `modules/creative-production/domain/scene-plan-rules.ts` — hợp đồng `ScenePlan`/`ScenePlanScene`, lời nhắc, `normalizeAiScenePlan` (nhịp do mode quyết, sai số cảnh hoặc thiếu bối cảnh → loại cả lượt), `buildRuleScenePlan` (kịch bản cơ bản theo dịp + tông màu, không AI).
- Use-case `generate-scene-plan.ts`: `enqueueJob` (feature `creative.scene_plan`, 1 credit, khoá `scene-plan:<asset>:<topic>:<mode>`) → `startInline` → `callCapability("video_storyboard")` (`AIC-18`, `OpenAILLMProvider`) → kịch bản ghi vào `generation_jobs.output`. Hỏng → `FAILED` + hoàn credit. Mở lại C/D tra theo khoá (`GET /creative-production/scene-plans?…`) — không tạo job, không trừ credit. "AI viết lại" dùng khoá mới; `scenePlanId` mang qua URL.
- Mỗi cảnh: `title`, `setting` (tiếng Việt, hiển thị), `lighting`, `palette`, `purpose`, `backgroundPrompt` (tiếng Anh, CHỈ không gian — lọc từ hoa/người/chữ, ≤ 600 ký tự; worker còn nối "no flowers, no people, no text"), `localBackdrop` (1 trong 5 phông cục bộ), `voiceScript`, `textOverlay`, `motionEffect`.
- **Sinh ở Chặng 05:** `creative-handoff-modal.tsx#handleStart` gọi `writeScenePlan` (khoá cố định ảnh + chủ đề + mode) TRƯỚC khi chuyển sang Creative Studio và đặt `scenePlanId` lên URL. B (`contents-workspace.tsx#withScenePlan` — thay cung truyện theo luật của `produce` bằng kịch bản này), C, D, E chỉ TRA kịch bản, không tự tạo. D còn nút viết cho lối vào không qua Chặng 05.
- AI lỗi: người dùng tự chọn "Dùng kịch bản cơ bản (miễn phí)" — `source: "rule"`, ref `rule:<topic>:<mode>`, giao diện ghi rõ.

### 7.0.1. Sinh ảnh từng cảnh

| Nguồn hậu cảnh | Khi nào | Job |
|---|---|---|
| Stability theo `backgroundPrompt` của cảnh | CREATIVE + người dùng bật + cảnh không phải phông trắng | `media.variant.cloud` (2 credit), `preset = localBackdrop` làm phông dự phòng |
| Phông Studio cục bộ `localBackdrop` | AUTHENTIC, hoặc người dùng chọn cục bộ, hoặc cảnh phông trắng | `media.variant` (1 credit) |

- **Khu vực E (24/09/2026):** `video-workspace.tsx` dựng storyboard bằng `video-storyboard-builder.ts#buildStoryboardFromPlan` — số cảnh/phụ đề/lời thoại/chuyển động theo kịch bản, ảnh = biến thể cùng `scene_plan_id` + `scene_index`, thiếu thì Master. Bỏ ảnh mẫu Unsplash ở `storyboard-editor.tsx` và `create-video-job.ts`; repository lưu mã asset trước URL; `dispatch-video-render.ts` đổi mã asset → `storage_key` của đúng tổ chức và chặn render khi cảnh thiếu ảnh; worker `local_cinematic.py` bỏ "ảnh mẫu dự phòng" và từ chối dựng khi không đọc được ảnh một cảnh.
- Payload mang `scene_index` (1–5) + `scene_plan_id`; worker ghi cả hai vào `assets.metadata`. Giao diện chỉ nạp lại ảnh có `scene_plan_id` = kịch bản đang mở; Khu vực E gắn ảnh theo cùng `scenePlanId`.
- Mỗi job luôn ghi kèm bản PNG tách nền (`variant_key = transparent`) — thay cho "Cảnh 4 PNG" cũ; watermark (nếu bật) cho bản `branded`, thẻ cảnh ưu tiên bản `branded`.
- Màn cấu hình: xem trước các cảnh của kịch bản, nguồn hậu cảnh, tỉ lệ, watermark; "Sinh trọn bộ N phân cảnh" hoặc "Sinh từng cảnh". Không còn bộ chọn tay 6 bối cảnh.
- Số toàn vẹn hiển thị là `subject_integrity.subject_pixel_identity` của job hoặc `assets.identity_score`. Duyệt từng cảnh: `POST /media/variants/:job_id/approve` (`I5`).

### 7.1. Nhánh Cloud (`media.variant.cloud`)
1. TS `requestCloudVariant` → `enqueueJob` (2 credit — giá tạm, nợ #64).
2. Worker: `StabilityBackgroundProvider.sinh_hau_canh()` gọi `POST https://api.stability.ai/v2beta/stable-image/generate/core` với lời nhắc **chỉ mô tả không gian**, luôn nối "no flowers, no people, no text…".
3. Tách chủ thể (rembg + defringe, cache đĩa theo `master_asset_id` tại `var/storage/cache/m04b_segmentation/`), `StudioBackdropEngine.composite(backdrop_image=…)` dán nguyên khối bó hoa, đổ bóng, light wrap.
4. Đo Subject Integrity → quyết định ghi asset. Asset ghi `provider=stability_ai`, `metadata.engine=cloud_provider`.
5. Nhà cung cấp lỗi (thiếu `STABILITY_API_KEY`, 402/403/429, mạng, không phải ảnh) → lùi về phông cục bộ của preset, ghi `cloud_fallback=true` + lý do vào asset, sự kiện job và `ai_requests` (`outcome=FAILED`).

### 7.3. Phạm vi sản xuất (PO 24/09/2026 tối)

- Chọn ở cuối Chặng 04 (`production-scope-picker.tsx`, state ở `product-intelligence-workspace.tsx`), sửa tiếp ở đầu Chặng 05 (modal, điều khiển từ ngoài). Mặc định mỗi lần mở: TikTok + Reels 9:16, đủ 4 loại; "Tất cả" = `"all"`.
- Luật thuần ở `publishing-rules.ts#resolvePublishing`: `produce = outputs ∪ derivedOutputs` (video ⇒ ảnh + âm thanh); `ratios` = mọi khung của nền tảng đã chọn; `videoVariants` = một video mỗi khung (khuôn ngắn nhất của các nền tảng cùng khung); `postChannels` chỉ khi có content. Kịch bản lưu phạm vi trong `publishing`; kịch bản cũ được suy phạm vi khi đọc.
- Mang qua URL `/creative-studio?platforms=&outputs=` (`build-handoff-url.ts`). Tab khu vực ghi "ngoài phạm vi" / "cần cho video" (`areaScopeStatus`).
- D: tab theo khung, sinh từng khung hoặc "Sinh đủ N khung" (credit × số khung); ảnh ghi `metadata.ratio`, ảnh cũ không có khung tính là khung chính. C: một bản phối dùng chung. E: `video-assembly` nhận `ratio`, kịch bản nhiều khung thì không mượn ảnh khung khác.

### 7.2. Tốc độ
Con số "~0,46s / ảnh 2048×2048" là đo bằng CLI dev `generate_scene.py` khi đã có cache mặt nạ; chưa có phép đo chính thức trên worker production. Không dùng làm cam kết SLA.

---

## 8. Khu vực F — Gói chiến dịch

- Bảng `campaign_packages` (đặc tả 07 §23). Trạng thái: `DRAFT → QA_PASSED | QA_NEEDS_REVIEW | QA_REJECTED → APPROVED`. Sửa gói chưa duyệt → về `DRAFT`, xoá QA cũ.
- **QA (08)** — `evaluateCampaignQa()`: (1) toàn vẹn sản phẩm theo số đo từng ảnh; (2) cổng duyệt từng tài sản (I5, P4, audio hoàn tất); (3) chuẩn tỷ lệ theo kênh (TikTok cần 9:16); (4) nội dung — đủ bài, giới hạn ký tự (FB 63.206, IG 2.200, TikTok 2.200, Zalo 2.000), biến `{{…}}` chưa điền, ≤ 30 hashtag IG, từ điển ngành hoa + `brand_profiles.forbidden_styles` (`checkFlowerContent`); (5) thương hiệu — có logo, có ảnh đóng dấu. Phán quyết xấu nhất thắng.
- **Nhiều video (24/09/2026 khuya)** — `campaign_packages.video_job_ids[]` (mỗi khung một video, `video_job_id` = video chính). Chặng 07 có tab "Video theo khung"; tạo gói đề xuất ảnh mỗi cảnh × mỗi khung và một video mỗi khung. QA duyệt/đồng nhất từng video; trục **`scope_coverage`** "Đủ phạm vi đã chọn" đọc phạm vi của kịch bản: thiếu bài theo kênh, âm thanh, ảnh hoặc video của một khung → `REJECTED`; loại không chọn thì không đòi.
- **Duyệt (09)** — `canApprovePackage()`: chỉ sau QA; `QA_REJECTED` không duyệt được; `QA_NEEDS_REVIEW` cần xác nhận. Ghi `audit_logs` cùng giao dịch, chốt chặn đua bằng `updateMany where status = <đã đọc>`.
- Bài đăng: bài B tự lưu (`content_drafts`) được đưa sẵn vào gói khi tạo; sau đó đề xuất "Dùng bài của Khu vực B" khi bài tự lưu khác bài trong gói. Vẫn soạn trực tiếp ở F được.

### 8.1. Xem lại & sửa tại chỗ ở Chặng 07 (quyết định PO 24/09/2026)

Người dùng ở nguyên Chặng 07: gõ yêu cầu → bấm Sửa → hệ thống gọi ĐÚNG backend của khu vực gốc (cùng cổng integrity, trừ credit, nhật ký) và chạy ngầm; có kết quả thì hiện ngay, **tự thay vào gói và lưu** (`PATCH`, gói về `DRAFT`). Tài sản đang chọn đọc thẳng qua `GET /video/jobs/:id` và `GET /audio/jobs/:id` (không phụ thuộc bản chụp trong gói).

| Tài sản | Xem / duyệt tại chỗ | Sửa tại chỗ | Backend | Credit |
|---|---|---|---|---|
| Ảnh từng cảnh | ảnh, bối cảnh, % lõi, *Duyệt ảnh* (I5) | ô yêu cầu → *Sửa cảnh*: AI sửa cảnh (ghi vào kịch bản dùng chung) → sinh ảnh mới | `scene-revisions` → `media/variants` | 1 + 2 (Stability) hoặc 1 + 1 (cục bộ) |
| Bài đăng | 4 kênh | sửa tay (miễn phí) hoặc *AI viết lại* theo yêu cầu, chặn từ cấm | `content-rewrites` | 1 |
| Âm thanh | trình nghe | *Sửa âm thanh*: lời thoại từng cảnh + nhạc → phối lại | `audio/jobs` | `audio.generate` |
| Video | trình phát, storyboard từng cảnh, *Duyệt video* (P4) | *Sửa video*: thời lượng, chuyển động, ảnh, phụ đề, lời thoại, giọng → bản sửa → **P3 riêng** (theo PO) → render | `video/jobs` + `approve-script` + `render` | 5 |

Nút "Mở Khu vực B/C/D/E" vẫn còn (mang `returnTo=f`), về gói thì đề xuất tài sản mới ("Có ảnh mới hơn cho cảnh này", "Có video mới…", "Có bản phối mới…").

---

## 9. Giới hạn & nợ còn mở (chi tiết ở `TECHNICAL_DEBT.md`)

- **#119** — Khuôn bài đăng (`social-post-generator.ts`) còn câu cam kết dịch vụ chung ("giao 2 giờ", "tặng thiệp", "freeship nội thành") không lấy từ hồ sơ tiệm — chủ tiệm phải sửa trước khi đăng; QA không bắt được.
- **#120** — ĐÃ TRẢ 25/09/2026: nhánh cloud của **M04a** (`POST /media/optimizations`, `engine=cloud_provider`) vào hàng đợi `media.optimize` như nhánh cục bộ; `executeCloudCreative` đã gỡ; Photoroom/fal có adapter ở worker (`workers/media_ai/providers/enhancement/`). Khu vực A của Creative Studio gọi chính route này.
- **#121** — Năng lực: B/C/E/F dùng chung `I1`; duyệt gói dùng `J5` (không trần cứng). Chờ PO quyết thêm mã riêng.
- **#122** — 10 chủ đề của Chặng 04 là khuôn theo luật; "video tham khảo" là danh mục tuyển chọn (metrics ước tính, TikTok là trang tìm kiếm) — giao diện đã gắn nhãn; chưa có nguồn video thời gian thực.
- **#123** — Video E đọc lại lời thoại bằng giọng chọn ở E (khớp từng cảnh), chưa dùng bản phối đã tạo ở Khu vực C.
- **#125** — Bài đăng B vẫn sinh theo khuôn `social-post-generator.ts` (phía máy chủ `produce` dùng `planNarrativeArc` theo luật); chỉ phần hiển thị cung truyện theo kịch bản bối cảnh.
- **#126** — `workers/.venv` phải là Python ≥ 3.11 (Python 3.9 của Command Line Tools dùng LibreSSL, không TLS 1.3 → Stability từ chối bắt tay). Worker cảnh báo khi khởi động.
- **#128** — 4 bài nhạc hệ thống (từ P17) chưa có hồ sơ nguồn/giấy phép: giao diện gắn nhãn "Chưa xác minh bản quyền", cần thay bằng bài có giấy phép thương mại (quy trình thêm bài ở đầu `music-catalog.ts`). Giá `audio.voice_clone` = 5 credit là tạm (#64). Voice Clone dùng chung `I1` (#121).
- Hậu cảnh Stability lỗi (hết credit, mạng) → worker lùi về phông cục bộ nhưng job `media.variant.cloud` vẫn trừ 2 credit — chờ PO quyết hoàn chênh lệch (nợ #127).
- **#124** — `npm run lint` toàn repo còn 235 lỗi (src) + 31 (tests) ngoài phạm vi Creative Studio (CI đỏ ở bước lint); phạm vi Creative Studio đã 0 lỗi.
- Chưa quy được đơn hàng về từng bài đăng (không có mã theo dõi); Chặng 11–12 tính theo sản phẩm kể từ ngày duyệt.
