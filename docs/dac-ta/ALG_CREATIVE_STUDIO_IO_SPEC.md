# Input/Output Specification — Creative Studio (Chặng 01–14)

> **Mục đích:** Chuẩn hoá đầu vào/đầu ra THẬT của từng chặng trong `/creative-studio`, đúng tên trường và kiểu như mã nguồn.
> **Phiên bản:** 4.7 — 25/09/2026. §4 nhà cung cấp trước (PO): giọng theo thứ tự tiệm (`providerOrder`), nhạc nền AI ElevenLabs Music (`musicProvider`, bài thư viện là dự phòng), hoàn chênh lúc đọc. Bản 4.6 — 25/09/2026. §5.1 thêm `style`, `variant_count` (Đợt 2 nâng cấp chất lượng ảnh — nhiều phương án một cảnh, cùng `job_group_id`); đầu ra thêm `job_group_id`, `candidates[]`. Bản 4.5 — 25/09/2026. §5.1 chỉ đạo khung hình biến thể (Đợt 1 nâng cấp chất lượng ảnh): `fill_mode` (mặc định `full_frame`), `composition`, `lighting`, `palette`, `seed`. Bản 4.4 — 24/09/2026 (khuya). §5.0c phạm vi sản xuất (nền tảng + loại kết quả chọn cuối Chặng 04), mỗi khung một bộ ảnh + một video, gói nhiều video, QA `scope_coverage`. Bản 4.3 — 24/09/2026 (khuya). Thêm §0: hợp đồng input/output 14 chặng bằng zod + JSON Schema sinh tự động. Bản 4.2 — 24/09/2026 (tối). Viết lại §4 Khu vực C: bốn loại tác vụ thật, thư viện nhạc có giấy phép, Voice Clone ElevenLabs. Bản 4.1 — 24/09/2026. Bổ sung: kịch bản bối cảnh sinh ở Chặng 05 (§5.0), bài B tự lưu `content-drafts` (§3), `final_video_view_url` (§6), sửa tại chỗ ở Chặng 07 — `scene-revisions` / `content-rewrites` (§7.1), DTO video của gói. (Bản 4.0 — 23/09/2026: viết lại toàn bộ: bản 3.0 mô tả một schema không tồn tại trong mã (vd. `foliageComponents`, `greetingCards`, `trendScore`, `videoEvidences`, `TopicProductionBrief` phẳng).
> **Nguồn sự thật:** `src/modules/market-intelligence/domain/product-intelligence-types.ts`, `src/modules/creative-production/domain/{production-types,validate-transition,build-handoff-url,campaign-package-rules}.ts`, `src/modules/media/domain/variant-rules.ts`, `src/modules/audio-studio/domain/audio-types.ts`, `src/modules/video-studio/domain/video-types.ts`, các `route.ts` tương ứng. Lệch với tài liệu này thì mã thắng (Hiến pháp §2 quy tắc 2) — và tài liệu phải sửa trong cùng commit.


> **Hợp đồng máy đọc được:** `src/modules/creative-production/contracts/` (zod — **nguồn chuẩn**) → `docs/dac-ta/schemas/creative-studio/*.schema.json` (sinh tự động). Xem §0.

---

## 0. Hợp đồng input/output chuẩn (zod + JSON Schema, 24/09/2026)

Quyết định PO (24/09/2026): mỗi chặng 01–14 có **một schema đầu vào và một schema đầu ra** làm mẫu chuẩn; muốn đổi input/output của chặng nào thì sửa **zod** của chặng đó. Tệp JSON Schema chỉ để đọc/chia sẻ — không sửa tay.

| Chặng | Tệp nguồn (zod) | Lời gọi chính | Năng lực |
|---|---|---|---|
| 01 BRING | `stage-01-bring.ts` | `POST /assets` | G2 |
| 02 UNDERSTAND | `stage-02-understand.ts` | `POST /market-intelligence/vision-extract` (asset_id bắt buộc, 1 credit — 25/09/2026) | V1 |
| 03 DISCOVER | `stage-03-discover.ts` | `POST /market-intelligence/product-intelligence` | V1 |
| 04 IDEATE | `stage-04-ideate.ts` | `GET /product-intelligence/:id` | V2 |
| 05 CHOOSE | `stage-05-choose.ts` (+ hợp đồng phụ `handoff`: query `/creative-studio`) | `POST /creative-production/scene-plans` | I1 |
| 06a CREATE · B | `stage-06a-content.ts` | `PUT /creative-production/content-drafts` | I1 |
| 06b CREATE · C | `stage-06b-audio.ts` | `POST /audio/jobs` | I1 |
| 06c CREATE · D | `stage-06c-media.ts` | `POST /media/variants` | I4 |
| 06d CREATE · E | `stage-06d-video.ts` | `POST /video/jobs` | I1 |
| 07 PACKAGE | `stage-07-package.ts` | `POST /creative-production/packages` | I1 |
| 08 QA | `stage-08-qa.ts` | `POST /creative-production/packages/:id/qa` | I1 |
| 09 APPROVE | `stage-09-approve.ts` | `POST /creative-production/packages/:id/approve` | J5 |
| 10 LAUNCH | `stage-10-launch.ts` | `PUT /creative-production/packages/:id/launch` | J5 |
| 11–14 SELL · MEASURE · LEARN · NEXT BEST ACTION | `stage-11-sell.ts` … `stage-14-next-best-action.ts` (lát cắt của cùng một đầu ra) | `GET /creative-production/packages/:id/performance` | R1 |

Khối dùng chung: `common.ts`, `product-intelligence.ts` (02–04), `scene-plan.ts` (ScenePlan v2), `campaign-package.ts` (07–14). Mỗi tệp JSON có `examples` (một mẫu đầy đủ để điền) và `x-floraos` (chặng, endpoint, tệp nguồn); `index.json` liệt kê cả bộ.

**Đổi input/output của một chặng:**
1. Sửa zod trong `contracts/stage-XX-*.ts` (hoặc khối dùng chung). Route nhập chính schema này nên máy chủ đổi theo ngay.
2. `npm run typecheck` — `contracts/conformance.ts` khoá zod với kiểu domain/use-case; đỏ nghĩa là mã và hợp đồng lệch, sửa bên còn lại.
3. `npm run gen:schemas:creative` để sinh lại JSON; commit cùng lần với thay đổi zod và mục tương ứng của tài liệu này.
4. `npm test` — `stage-contracts.test.ts` chặn khi: thiếu chặng, ví dụ sai schema, tệp JSON cũ, hoặc route không dùng hợp đồng. `npm run check:schemas:creative` kiểm riêng phần JSON.

Giới hạn đã biết: `refine` (vd. "mỗi kênh một bài", `scene_index` 1..5) không biểu diễn được trong JSON Schema — máy chủ vẫn kiểm; bản ghi `assets`/`video_jobs` dùng `looseObject` (cột phụ của bảng đi qua nguyên vẹn).

---

## 1. Khu vực A — Chặng 01 → 05

### 1.1. Chặng 01 — BRING

| Bước | Gọi | Vào | Ra |
|---|---|---|---|
| Xin URL | `POST /api/v1/assets/upload-url` (`G2`) | `{ mime_type, product_id? }` | `{ upload_url, asset_id, storage_key }` |
| Tải lên | `PUT upload_url` | byte ảnh | 2xx (kiểm `res.ok`) |
| Đăng ký | `POST /api/v1/assets` (`G2`) | `{ asset_id, kind: "ORIGINAL", storage_key, mime_type, file_size }` | asset |
| Xem | `GET /api/v1/assets/:id/view-url` (`G1`) | — | `{ url }` ký có hạn |

`storage_key` = `org/<organization_id>/<product_id | "unfiled">/<asset_id>.<ext>` (`buildStorageKey`). Máy chủ chưa giới hạn dung lượng tệp.

### 1.2. Chặng 02 — UNDERSTAND

`POST /api/v1/market-intelligence/vision-extract` (`V1`), thân `{ asset_id, product_title? }` (`asset_id` BẮT BUỘC từ 25/09/2026; `image_url` bị bỏ qua — máy chủ đọc ảnh từ kho của đúng tổ chức), mô hình `gpt-4o-mini`. Thu `product.vision_extract` = 1 credit qua `enqueueJob` khi mô hình thật sự đọc ảnh (khoá `vision-extract:<asset_id>` — cùng ảnh bấm lại không thu lần hai; hỏng thì job FAILED + hoàn credit); ảnh đã có kết quả M01 thì dùng lại miễn phí. Đáp ứng thêm `source` (`vision_ai` | `m01`) và `usage`. Trường mô hình không trả để TRỐNG / 0 — không điền giá trị mặc định. Trả các khối dưới (người dùng sửa được từng trường nguyên tử):

`ProductFlowerComponent`: `{ id?, flowerType: string, quantityEstimate: number, unit: string, role: "dominant" | "supporting" | "foliage", color? }` — lá/cành đệm là `role: "foliage"`, không có mảng riêng.

`ProductVisualAttributes`: `{ mainColors: string[], secondaryColors: string[], style, shape, sizeEstimate }`.

`ProductPackaging`: `{ wrappingMaterial, wrappingColor, ribbon, accessories: string[], card?: { hasCard, cardType?, printedText? (OCR), color? }, ribbonDetail?: { ribbonColor?, ribbonMaterial?, bowStyle? }, otherAccessories?: { name, quantity, unit, color?, note? }[] }`.

`ProductInferredContext`: `{ likelyOccasions: string[], likelyAudience, suggestedPrice: number, confidence: number }`.

### 1.3. Chặng 03 + 04 — DISCOVER + IDEATE

`POST /api/v1/market-intelligence/product-intelligence` (`V1`), thân gồm `product_name`, `asset_id` (BẮT BUỘC), `components`, `attributes`, `packaging`, `context`, `commercial_passport?`. Lưu mỗi lượt vào `product_analysis_runs`. Trả `ProductIntelligenceReport`:

| Trường | Kiểu |
|---|---|
| `id` | id lượt phân tích (`product_analysis_runs.id`) |
| `trendFitScore`, `audienceFitScore`, `contentFitScore` | `number` 0–100 |
| `overallFit` | `"HIGH" \| "MEDIUM" \| "LOW"` |
| `trendFitMatrix` | `{ attribute, productValue, marketSignal, matchStatus: "MATCH"\|"PARTIAL"\|"MISMATCH", lifecycle, note }[]` |
| `improvements` | `{ keep: string[], improve: string[], test: string[] }` |
| `commercialPassport?` | `{ suggestedName, shortHeadline, description, style, tags[], seoKeywords[], occasions[], targetAudience: { recipient, buyerPersona }, flowerMeaningStory, keySellingPoints[], cardMessageSuggestions, careInstructions[], priceSegment: "budget"\|"standard"\|"premium"\|"luxury", priceRange: { minPrice, targetPrice, maxPrice }, recommendedUpsells[] }` |
| `topics` | `ConcreteTopic[]` — 10 phần tử |
| `readiness` | `ProductContentReadiness` |

`ConcreteTopic`: `{ id, title, angleCategory: "EMOTIONAL"|"PROBLEM_SOLUTION"|"PRODUCT_SHOWCASE"|"EDUCATIONAL"|"TREND"|"PRICE_VALUE", hook, format: "REELS_TIKTOK_9_16"|"CAROUSEL_PHOTO_1_1"|"STORY_DAILY", cta, evidenceNote, referenceUrl?, platform?, dualVideoEvidence?: { youtube, tiktok } }`. Mỗi video: `{ thumbnailUrl, videoUrl, title, author, metrics, alt?, isLiveEvidence? }`. `isLiveEvidence = false` nghĩa là danh mục tham khảo (metrics ước tính, TikTok là trang tìm kiếm) — giao diện phải ghi "ước tính".

Đọc lại: `GET /api/v1/product-intelligence/:id` (`V2`) → `{ report }`.

### 1.4. Chặng 05 — CHOOSE và bàn giao

`buildHandoffSearchParams(HandoffUrlInput)` → query của `/creative-studio`:

| Param | Nguồn | Ghi chú |
|---|---|---|
| `topic` | `report.id` (hoặc id topic khi không qua Product Intelligence) | bắt buộc |
| `selectedTopic` | `ConcreteTopic.id` | |
| `mode` | `"CREATIVE" \| "AUTHENTIC"` | bắt buộc |
| `source` | `"image" \| "video" \| "both"` | |
| `assetId` | asset đã lưu kho | bắt buộc — thiếu thì ném `MissingAssetIdError` |
| `area` | `a..f` | tab mở ra |
| `productName`, `productId` | | tuỳ chọn |
| `audioJobId`, `videoJobId` | ghi thêm bởi Khu vực C/E | tuỳ chọn |

Cấm `imageUrl`/Data URL/blob; tổng query ≤ 2.000 ký tự (`isSafeHandoffQueryString`).

---

## 2. Cổng chuyển tiếp & ngữ cảnh

### 2.1. `validateTransition(TransitionInput)`
Bắt buộc: `topicId`, `mode`, `sourceImageUrl`, `productName`, `assetId`, `commercialPassport.category`, `.style`, `.components`, `.colors`. Tuỳ chọn (cảnh báo): `sourceVideoUrl`, `commercialPassport.priceRange/targetAudience/suggestedOccasions`, `productId`, `hasReport`, `hasTopics`, `voiceId`, `musicMood`. Trả `{ valid, fields[], errors[], warnings[], completionPercent }`.

### 2.2. `CreativeStudioContext` (page.tsx)
`{ topicId, mode, sourceImageUrl (ký lại từ assetId), sourceVideoUrl?, productName, productId?, assetId?, voiceId?, musicMood?, report, topics, selectedTopic, commercialPassport? }`. `commercialPassport` dựng CHỈ từ report thật: `category = attributes.shape || passport.tags[0]`, `style`, `components = components[].flowerType`, `colors = main + secondary`, `priceRange = "min – max VNĐ"`, `targetAudience = buyerPersona`, `suggestedOccasions = occasions`.

### 2.3. `TopicProductionBrief` (đầu vào `POST /creative-production/produce`)
```ts
{
  organizationId: string            // máy chủ gán từ phiên — client KHÔNG gửi
  productId?: string
  mode: "AUTHENTIC" | "CREATIVE"
  productContext: {
    sourceImageUrl: string
    sourceImageStorageKey?: string
    commercialPassport: { productName, category, style, components: string[], colors: string[],
                          priceRange?, targetAudience?, suggestedOccasions?: string[] }
    sourceVideoUrl?: string
    sourceVideoDurationSeconds?: number
  }
  selectedTopics: { topicId, topicTitle, topicAngle, topicCategory, topicHook, topicCta,
                    topicEmotionalTone, researchKeywords?, trendScore? }[]   // 1–3
  voiceId?: string
  musicMood?: string
  targetVideoDurationSeconds?: number
}
```
Brief không mang `assetId` — ảnh được neo ở gói chiến dịch (Chặng 07) qua `master_asset_id`.

---

## 3. Khu vực B — Chặng 06a

`POST /api/v1/creative-production/produce` (`I1`) `{ brief }` → `produceCreative` (CREATIVE) / `produceAuthentic` (AUTHENTIC). Kết quả gồm `topicResults[]` (mỗi phần tử có `arc: NarrativeArcOutput` và `briefs.contentBrief` — `captionRequests[]`, `hashtagSuggestions[]`) và `totalEstimatedCredits`.

`NarrativeArcOutput`: `{ topicId, topicTitle, mode, emotionalTone, narrativeReasoning, scenes: NarrativeSceneSpec[] (3–5), totalDurationSeconds }`; `NarrativeBeat` = `SETUP | RISING | CLIMAX | RESOLUTION | CTA`.

4 bài đăng (Facebook, Instagram, TikTok, Zalo) sinh phía trình duyệt bằng `generateAllPlatformPosts()`; thiếu giá thật thì ghi "Liên hệ tiệm để nhận báo giá" (không còn giá bịa). Nút "Lưu bài vào gói chiến dịch" → `PackagePost[]` vào gói (§7).

**Tự lưu (24/09/2026)** — `PUT /api/v1/creative-production/content-drafts` (`I1`) `{ asset_id (uuid, thuộc tổ chức), topic_id, mode, topic_title?, posts: PackagePost[] }` → `{ draft }`, ghi đè bản cũ cùng khoá (bảng `content_drafts`, duy nhất theo tổ chức + ảnh + chủ đề + mode); trình duyệt gọi 1,2 giây sau lần sửa cuối. `GET …/content-drafts?asset_id&topic_id&mode` → `{ draft | null }`; Chặng 07 đọc để đưa sẵn bài vào gói.

---

## 4. Khu vực C — Chặng 06b

> **Viết lại 24/09/2026** sau rà soát (project claude.ai `claude/ra-soat-khu-vuc-c-audio-24-09-2026.md`): trước ngày này worker không đọc `taskType` — bốn nút cùng ra một bản TTS + nhạc, Voice Clone không nhân bản gì mà vẫn trừ credit, credit bị tính mặc định 1 bất kể bảng ước tính. Luật của bốn loại nằm ở `src/modules/audio-studio/domain/audio-task-rules.ts`.

### 4.1. Bốn loại tác vụ

| `taskType` | Giọng | Nhạc | Kết quả (`output`) | Credit |
|---|---|---|---|---|
| `VOICEOVER` | bắt buộc ≥ 1 cảnh có lời | không | `voice_only` | theo bảng nhà cung cấp × chất lượng × số cảnh có lời |
| `MUSIC_SELECT` | không (không gọi TTS) | bắt buộc | `music_only` — cắt/lặp đủ `totalDurationSeconds`, fade | 0 |
| `AUDIO_MIX` | bắt buộc | bắt buộc | `voice_and_music` — sidechain ducking, `amix normalize=0` | như VOICEOVER |
| `VOICE_CLONE` | bắt buộc, giọng nhân bản `READY` | tuỳ chọn | `voice_and_music` | ElevenLabs (standard 2/cảnh, premium 3/cảnh) |

Bảng giá (`audio-pricing-guard.ts`, quyết định PO 24/09 "theo bảng ước tính"): OpenAI standard 1/cảnh (trần 10), HD 2/cảnh (trần 20); ElevenLabs 2–3/cảnh; MiniMax 1–2; Edge TTS 0. Số này truyền vào `enqueueJob({ costCredit })` — trừ đúng số hiển thị trên nút. Mọi bản ra đều AAC 192k stereo 44,1kHz, chuẩn độ to **-14 LUFS / -1,5 dBTP** (`loudnorm`).

### 4.2. `POST /api/v1/audio/jobs` (`I1`, `Idempotency-Key` bắt buộc)

| Trường | Kiểu / luật |
|---|---|
| `taskType?` | bỏ trống: có nhạc → `AUDIO_MIX`, không → `VOICEOVER` |
| `scenes` | ≤ 12 × `{ sceneIndex, voiceScript (≤ 600 ký tự), targetDurationSeconds (≤ 60) }`; bỏ qua với `MUSIC_SELECT` |
| `totalDurationSeconds?` | ≤ 300; mặc định = tổng cảnh |
| `voiceId?` | 6 giọng của `voice-catalog.ts`; mặc định `flora-nu-truyen-cam` |
| `voiceCloneId?` | uuid giọng `READY` của tổ chức — bắt buộc với `VOICE_CLONE` (khác tổ chức → 404, chưa sẵn sàng → 409) |
| `providerKey?` | `openai \| elevenlabs \| minimax \| edge_tts`; `google_cloud`/`local_fallback` → 422. Bỏ trống (25/09/2026) = bên đầu trong thứ tự tiệm (`creative_providers.voice`, mặc định `elevenlabs → openai → minimax → edge_tts`) |
| `qualityTier?` | `standard \| hd \| premium` |
| `musicTrackId?` | `trackId` hệ thống hoặc `org:<uuid>` (bài tiệm tải, kiểm thuộc tổ chức) |
| `musicMood?` | chỉ để tự chọn bài khi không có `musicTrackId`; `none` = không nhạc. Mood không có bài → không tự thay bài khác |
| `topicAngleCategory?` | gợi ý mood (và gợi ý cho lời nhắc sinh nhạc) |
| `musicProvider?` | 25/09/2026: `elevenlabs_music \| library`. Bỏ trống = nhạc AI theo thứ tự tiệm (`creative_providers.music`), bài `musicTrackId` (tự chọn theo mood nếu vắng) là DỰ PHÒNG; `library` = chỉ bài thư viện (0 credit phần nhạc). Giá nhạc AI: 2 credit / 30 giây (`MUSIC_GENERATION_CREDIT_PER_30S`, bảng giá v1) |
| `scenePlanId?`, `scenePlanRevision?` | kịch bản sản xuất tổng mà bản âm thanh thực thi (Đợt 2, 24/09) — `GET` trả `scene_plan_id`, `scene_plan_revision`; video E dùng đúng bản này |

Ra (201): `{ jobId, generationJobId, taskType, creditsCost, voiceDisplayName, providerKey, musicProvider, musicTrackName, musicLicenseVerified, usage: { costCredit, balanceAfter }, deduped }`.

Payload worker thêm: `output`, `providerVoiceMap` (mã CÙNG một giọng ở mọi nhà cung cấp — lùi nhà cung cấp vẫn đúng giọng nam/nữ), `strictProvider` (giọng nhân bản: không lùi), `musicTrackId` | `musicStorageKey`, `musicTrackRef`, `musicTrackName`; từ 25/09/2026 `providerOrder` (thứ tự lùi TTS của tiệm), `musicProviderOrder`, `musicPromptHint`, `cost_plan` (phần giọng / phần nhạc — hoàn chênh lúc đọc).

Worker: TTS từng cảnh → **khớp cảnh** (`fit_voice_to_scene`: nhanh tối đa 1,1×, dài hơn thì kéo dài cảnh — trước đây tua tới 2× rồi cắt đuôi) → nối → phối. Một cảnh có lời mà không đọc được → cả job `FAILED`. Chuỗi lùi: bên đã chọn → `providerOrder` của tiệm → `openai → elevenlabs → minimax → edge_tts` (không còn `say` của macOS). Nhạc AI sinh SAU giọng đọc (đúng thời lượng thật, nhạc không lời); mọi bên lỗi → bài dự phòng, ghi `music_fallback_reason`. ElevenLabs: tên giọng được đổi sang `voice_id` qua `GET /v1/voices`.

`generation_jobs.output = { audio_storage_key, voice_only_storage_key, mime_type, task_type, output, total_duration_seconds, loudness_lufs, provider_used, has_voice, has_music, music_provider_used, music_fallback, music_fallback_reason, scenes: [{ sceneIndex, targetDurationSeconds, actualDurationSeconds, extended, providerUsed }] }`.

`GET /api/v1/audio/jobs/:id` (`I1`) → `{ job_id, stage, task_type, voice_id, voice_display_name, voice_clone_id, provider_key, provider_used, provider_fallback, quality_tier, music_track_id, music_track_name, music_mood, music_provider, music_provider_used, music_fallback, music_fallback_reason, has_voice, total_duration_seconds, loudness_lufs, scenes, audio_url, audio_storage_key, voice_only_url, voice_only_storage_key, credits_cost, refunded, error, created_at }`. `FAILED` → hoàn credit ngay ở lần đọc này (idempotent). `COMPLETED` mà nhạc lùi thư viện / giọng lùi sang bên rẻ hơn → hoàn chênh (`audioJobRefund`, dòng `PARTIAL_REFUND`, idempotent).

### 4.3. Thư viện nhạc

`GET /audio/music-tracks` → `{ tracks: [{ track_id, title, mood, duration_seconds, source: "system"|"org", license_type, license_source, license_verified, preview_url }] }`. Hệ thống: `music-catalog.ts` (4 bài từ P17 đang `licenseVerified: false` — chưa có hồ sơ nguồn, nợ #128). Tiệm tải: `POST /audio/music-tracks` multipart `{ file, title, mood, license_type, license_source, license_note?, attest=true }` → bảng `music_tracks` (đặc tả 07 §25); `DELETE /audio/music-tracks/:id`; nghe thử bài hệ thống `GET /audio/music-tracks/system/:trackId`.

### 4.4. Giọng nhân bản (Voice Clone)

`POST /audio/voice-clones` multipart `{ name, sample, consent=true }` (`Idempotency-Key`) → lưu mẫu `org/<org>/audio/voice-samples/<id>.<ext>` + dòng `voice_clones` (`PENDING`, lưu nguyên văn cam kết) → job `audio.voice_clone` (5 credit, giá tạm #64). Worker: mẫu ≥ 20 giây, ≤ 10 phút → ElevenLabs `POST /v1/voices/add` → `READY` + `provider_voice_id`; lỗi → `FAILED` + lý do (401 khoá, 402/429 hạn mức, 403 gói không có IVC). `GET /audio/voice-clones` (tự hoàn credit giọng `FAILED`), `GET /audio/voice-clones/:id` (kèm URL nghe mẫu), `DELETE /audio/voice-clones/:id` (gỡ trên ElevenLabs + `DELETED`). Cần `ELEVENLABS_API_KEY` ở web (xoá) và worker (nhân bản, đọc).

---

## 5. Khu vực D — Chặng 06c

### 5.0. Kịch bản bối cảnh (24/09/2026)

`POST /api/v1/creative-production/scene-plans` (`I1`, `Idempotency-Key` bắt buộc, feature `creative.scene_plan`, 1 credit):

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `mode` | `CREATIVE \| AUTHENTIC` | 5 hoặc 3 cảnh |
| `asset_id?` · `product_id?` | uuid | khoá tra lại `scene-plan:<asset>:<topic>:<mode>` |
| `product` | `{ name, category?, style?, colors[], components[], occasions[], target_audience?, price_range? }` | từ Chặng 01–03 |
| `topic` | `{ id, title, angle_category?, hook?, cta?, format? }` | chủ đề Chặng 05 |

Ra: `{ job_id, status, error, plan, deduped, usage }`. `plan = { version: 1, source: "ai"|"rule", mode, topicId, topicTitle, emotionalTone, reasoning, scenes[] }`, mỗi cảnh `{ sceneIndex, beat, title, setting, lighting, palette[], purpose, backgroundPrompt, localBackdrop, voiceScript, textOverlay, motionEffect }`. Tra không tạo job: `GET /creative-production/scene-plans?asset_id&topic_id&mode`, `GET /creative-production/scene-plans/:id`. Sinh ở Chặng 05 khi bấm "Bắt đầu sáng tạo" (`creative-handoff-modal.tsx`); URL Creative Studio mang `scenePlanId` (job id hoặc `rule`), B/C/D/E chỉ tra.

### 5.0b. Kịch bản sản xuất tổng — v2 (24/09/2026, quyết định PO)

Chặng 05 lên TOÀN BỘ kế hoạch sản xuất; B/C/D/E chỉ thực thi. `plan` (version 2) thêm vào v1:

| Phần | Trường |
|---|---|
| `revision` | số nguyên ≥ 1, tăng mỗi lần sửa (`PATCH`, "Sửa cảnh" ở Chặng 07) |
| `story` | `hook`, `cta`, `logline` |
| `publishing` | phạm vi sản xuất (§5.0c): `platforms[]`, `allPlatforms`, `outputs[]`, `allOutputs`, `derivedOutputs[]`, `produce[]`, `ratios[]`, `videoVariants[{ ratio, videoFormat, targetSeconds, platforms[] }]`, `aspectRatio` (khung chính), `otherRatios[]` (giữ tương thích, luôn rỗng) |
| `video` | `format` (theo nền tảng), `totalDurationSeconds`, `captionStyle`, `hasSubtitle`, `hasWatermark`, `coverSceneIndex`, `endCardText` |
| `audio` | `voiceId` (6 giọng `voice-catalog.ts`), `qualityTier`, `musicMood`, `pacing` |
| `content` | `posts[{ channel, text, hashtags }]` cho kênh của nền tảng đã chọn (qua giới hạn kênh + từ cấm; rỗng = B dùng khuôn dự phòng), `videoCaption{ text, hashtags }` |
| `scenes[]` thêm | `durationSeconds` (tổng ≈ mục tiêu nền tảng, cao trào dài hơn, ≥ số giây đọc trọn lời ~14 ký tự/giây, 1,5–15s), `transition`, `shot` (`close\|medium\|wide`), `musicCue` |

Bảng nền tảng (`publishing-rules.ts`): TikTok 9:16 `TIKTOK_30S` ~20s · Instagram/Facebook Reels 9:16 `REEL_15S` 15s · YouTube Shorts 9:16 · Zalo Video 9:16 `STORY_15S` · YouTube 16:9 `SLIDESHOW` · Facebook/Instagram Feed 4:5 `SLIDESHOW`. Trộn tỉ lệ → sinh ĐỦ mọi khung (mỗi khung một bộ ảnh + một video); khung chính là 9:16 nếu có. Worker video dựng được 9:16, 16:9, 1:1, 4:5.

### 5.0c. Phạm vi sản xuất (PO 24/09/2026 tối)

Chủ tiệm chọn **nền tảng đăng** và **loại kết quả** (`content | audio | image | video`) ở cuối Chặng 04 (`ProductionScopePicker` trên `product-intelligence-workspace.tsx`), sửa tiếp được ở đầu Chặng 05 (modal). Hệ thống chỉ sản xuất đúng phần đã chọn.

| Luật (`resolvePublishing`) | Kết quả |
|---|---|
| Không truyền | TikTok + Reels (9:16), đủ 4 loại — mặc định mỗi lần mở |
| `"all"` hoặc mảng rỗng | mọi nền tảng / mọi loại |
| Nhiều khung | mỗi khung một bộ ảnh (D) + một video (E) — credit ảnh/video × số khung; âm thanh C dùng chung |
| Chọn `video` | tự thêm `image` + `audio` (`derivedOutputs`) |
| Bài đăng | chỉ khi có `content`, cho kênh của nền tảng đã chọn (`postChannels`) |

Mang qua: thân `POST /scene-plans` và `PATCH /scene-plans/:id` nhận `platforms: "all" | PublishPlatform[]`, `outputs: "all" | ProductionOutput[]`; query bàn giao `/creative-studio` mang `platforms`, `outputs` (`a,b,c` hoặc `all`, `encodeScopeParam`/`decodeScopeParam`). Cùng ảnh + chủ đề + mode đã có kịch bản mà phạm vi khác → `writeScenePlan` sửa phạm vi tại chỗ (miễn phí). Tab Khu vực B–E ghi "ngoài phạm vi" / "cần cho video" (`areaScopeStatus`). Khu vực D có tab theo khung; `POST /creative-production/video-assembly` nhận `ratio` (mỗi khung một video, khuôn theo `videoVariants`; nhiều khung thì không mượn ảnh khung khác, thiếu thì chặn "chưa có ảnh khung X").

**Phụ đề = lời thoại (PO 24/09/2026 tối):** `scenes[].textOverlay` luôn bằng `voiceScript` (chuẩn hoá khi sinh, khi đọc bản cũ, khi sửa, khi "Sửa cảnh"); `normalizeScenes` của video cũng ép `textOverlay = voiceScript`. Không còn ô phụ đề riêng ở xem trước Chặng 05, storyboard E, "Sửa video" Chặng 07. Worker chia lời thoại thành đoạn ≤ 60 ký tự (`split_subtitle_chunks`), mỗi đoạn là một lớp RGBA ghép theo thời gian (`subtitle_timeline`: cảnh bắt đầu ở tổng thời lượng các cảnh trước, đoạn chia theo số ký tự) — không in chết vào ảnh; chuyển cảnh bù phần chồng xfade để mốc cảnh trùng mốc âm thanh.

### 5.1. Biến thể từng cảnh

`POST /api/v1/media/variants` (`I4`, header `Idempotency-Key` bắt buộc):

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `master_asset_id` | string | Master `APPROVED` — ngược lại `409` |
| `engine` | `"local_studio" \| "cloud_provider"` | mặc định `cloud_provider` từ 25/09/2026 (PO: nhà cung cấp trước, cả CREATIVE lẫn AUTHENTIC — AUTHENTIC chỉ dựng nền + ánh sáng); `local_studio` chỉ khi chọn đích danh. `provider_key` ∈ `fal \| stability \| imagen` thử trước, còn lại theo thứ tự ưu tiên của tiệm (`payload.provider_order`) |
| `preset` | `transparent \| studio_white \| wedding \| living_room \| wood_minimal \| luxury_hotel` | bắt buộc |
| `ratio` | `1:1 \| 4:5 \| 9:16 \| 16:9` | bắt buộc |
| `watermark` | boolean | mặc định `true` |
| `auto_enhance` | boolean | mặc định `false`, chỉ chỉnh vùng nền |
| `scene_index` | 1–5 | phân cảnh theo kịch bản của chủ đề |
| `scene_plan_id` | string ≤ 160 | job `creative.scene_plan` hoặc `rule:<topic>:<mode>` |
| `scene_plan_revision` | int ≥ 1 | phiên bản kịch bản lúc sinh ảnh (Đợt 3, 24/09) — ghi vào `metadata.scene_plan_revision`; giao diện chọn khung theo `publishing.aspectRatio` |
| `provider_key` | `"fal" \| "stability"`, tuỳ chọn | chỉ nhánh cloud — nhà cung cấp thử TRƯỚC. Các bên **vai trò tương đương** (PO 25/09): bỏ trống thì worker thử theo `VARIANT_PROVIDER_ORDER` (mặc định `fal,stability`), bên lỗi → bên kế tiếp, mọi bên lỗi → lùi luồng cục bộ (`cloud_fallback`). Thêm bên mới: adapter ở `workers/media_ai/providers/scene/` + một phần tử `VARIANT_CLOUD_PROVIDERS` |
| `scene_prompt` | string ≤ 600 | chỉ nhánh cloud — `backgroundPrompt` của cảnh (KHÔNG GIAN hậu cảnh) |
| `fill_mode` | `"full_frame" \| "pad"` | **mặc định `full_frame`** (PO 24/09): khung làm việc dựng ĐÚNG tỉ lệ đích, hậu cảnh phủ kín khung. `pad` = cách cũ (ghép theo kích thước Master rồi đệm màu trơn) |
| `composition.shot` | `close \| medium \| wide` | bó hoa cao 84% / 68% / 50% khung; trần phóng ×2 (vượt thì nới khung). Thiếu → `shot` của cảnh, không có → `medium` |
| `composition.placement` | `center \| left_third \| right_third` | mặc định `center` |
| `lighting.direction` | `left \| right \| above \| front` | hướng bóng đổ + cụm ánh sáng trong prompt. Thiếu → suy từ `lighting` (tiếng Việt) của cảnh, không nhận ra → `left` (hướng bóng cũ) |
| `lighting.mood` | string ≤ 120 | tiếng Anh, ghép vào prompt; chữ Việt bị bỏ và ghi `provider_ignored` |
| `palette` | string[] ≤ 5 | thiếu → `palette` của cảnh; màu tiếng Việt thông dụng tự dịch, màu không dịch được ghi `provider_ignored` |
| `seed` | int 0–4 294 967 294 | Stability: seed hậu cảnh. Phông cục bộ (từ Đợt 2): seed đổi vùng sáng + bố cục bokeh. Thiếu → tự bốc và GHI vào asset để tái tạo |
| `style` | `natural \| cinematic \| film \| vivid` | Đợt 2 (25/09). Phong cách hậu cảnh — Stability dịch sang `style_preset` (`photographic`/`cinematic`/`analog-film`/`enhance`); phông cục bộ không làm được → `provider_ignored: ["style"]` |
| `quality` | `standard \| high`, mặc định `standard` | Đợt 3 (25/09). `high` = Stability **Ultra** (`/v2beta/stable-image/generate/ultra`), asset ghi `model_version = stable-image-ultra-v2beta`; Ultra chưa đối chiếu được `style_preset` nên phong cách ghi `provider_ignored`. Phông cục bộ không có bậc cao hơn → `provider_ignored: ["quality"]`. Giá: +2 credit/phương án ở nhánh đám mây (tạm, `HIGH_QUALITY_SURCHARGE`) |
| `upscale` | `none \| 2x`, mặc định `none` | Đợt 3. Khung xuất gấp đôi (9:16 → 2160×3840, trần phóng bó hoa vẫn ×2 theo khung xuất). Chỉ HẬU CẢNH nhỏ hơn khung được tăng nét (`providers/upscale/nen.py`: Real-ESRGAN nếu có, không thì LANCZOS + unsharp — ghi `upscale.background_engine`); bó hoa KHÔNG qua mô hình siêu phân giải (`upscale.subject_engine = "lanczos"`). Giá +0 khi worker chưa có Real-ESRGAN thật |
| `compose_mode` | `relight \| paste \| harmonize`, tuỳ chọn | **Bỏ trống = theo engine (PO 25/09): `cloud_provider` → `relight` = NHÀ CUNG CẤP LÀM TRỌN GÓI**: tách nền (fal BiRefNet / Stability remove-background), dựng cảnh + ghép + chỉnh sáng (BRIA Product Shot `placement_type=original` / Stability Replace Background & Relight `preserve_original_subject=0.95`), tăng nét (fal Real-ESRGAN / Stability upscale fast); ALG chỉ đặt bố cục + làm mờ cẳng tay, và đo. `local_studio` → `paste`. `paste` = ALG tự dán nguyên khối bó hoa (trên đám mây: chỉ xin hậu cảnh — giữ từng điểm ảnh). `harmonize` = paste + hoà bóng / độ nét cục bộ (`image/hoa_hop.py`). Cục bộ xin `relight` → `provider_ignored: ["compose_mode:relight"]` |
| `variant_count` | int 1–4, mặc định 1 | Đợt 2 (25/09). n phương án = n job con cùng `job_group_id`, mỗi job qua cổng Subject Integrity và trừ credit riêng (credit nhân n). Khoá idempotency phương án k>1 = `<khoá>:c<k>`; `job_group_id` dẫn xuất tất định từ khoá gốc. Phương án khác nhau thật: đám mây giữ chỉ đạo, đổi seed; cục bộ đổi seed phông + xoay vị trí bó hoa / hướng sáng (`variant-candidates.ts`) |

Chỉ đạo khung hình là **ý định ALG**, không phải tham số nhà cung cấp: `src/modules/media/domain/variant-direction-rules.ts` gộp (người gọi → cảnh của kịch bản → mặc định) và ghi `direction_from_plan` vào payload; worker dịch qua khung adapter `workers/media_ai/providers/background/` (`base.py`: `BackgroundRequest`, bảng năng lực `NangLuc`, `dung_prompt_hau_canh`; adapter `stability_background.py`, `local_studio.py`). Ý định nhà cung cấp không làm được KHÔNG bị âm thầm bỏ — ghi `provider_ignored`.

Ra (201): `{ job_id, status, engine, deduped, usage: { cost_credit, balance_after }, job_group_id, candidates: { index, job_id, status, deduped, cost_credit }[] }` — `job_id` = phương án 1, `usage.cost_credit` = TỔNG mọi phương án, `job_group_id = null` khi `variant_count = 1`. Feature: `media.variant` (1 credit) / `media.variant.cloud` (2 credit) mỗi phương án.

Tự động từ Đợt 3 (không có trường hợp đồng): (1) **làm mờ cẳng tay chạm mép ảnh gốc** ở khung `full_frame` — chỉ khi phần chạm mép HẸP và là màu da người; cành lá, cuống, ruy băng chạm mép là sản phẩm, không đụng (`image/mo_mep_cat.py`); vùng làm mờ bị loại khỏi phép đo Subject Integrity; bản `transparent` giữ nguyên. (2) **Chấm kỹ thuật tự động** 0–100 (`image/cham_tham_my.py`, heuristic: độ nét, phơi sáng, tách nền ΔE, bố cục, dải đệm, hài hoà màu — không phải mô hình thẩm mỹ học máy). (3) **Mô hình tách nền mặc định `isnet-general-use`** (Apache-2.0) thay `bria-rmbg` (giấy phép phi thương mại) — bảng giấy phép `providers/segmentation/mo_hinh.py`; cache tách nền khoá theo tên mô hình. (4) Mẫu số "thân đo được" của cổng Subject Integrity = thân (alpha ≥ 128) co 9 px — lõi đo không bao giờ phủ được phần mảnh hơn thế.

Thẻ cảnh D (Đợt 2): mặc định 1 phương án; "Sinh lại giống thế này" = 2 phương án cùng chỉ đạo của ảnh đang xem, seed mới (`similarDirection`); "Thử hướng khác" = 1 phương án đổi cỡ cảnh → hướng sáng đối diện → phong cách kế tiếp (`alternateDirection`). Credit hiện trên nút trước khi bấm (`variantTotalCostCredit`, cùng bảng giá `enqueueJob` trừ).

`POST /api/v1/media/variants/batch` (lô tổ hợp preset × ratio) nhận thêm `scene_plan_id?`, `scene_index?` (nợ #130e, 25/09): cả lô lấy cỡ cảnh / ánh sáng / bảng màu của đúng cảnh đó.

`GET /api/v1/media/variants/:job_id` (`I4`) → `{ job_id, status, stage, error, result, source: { master_asset_id, master_url, preset, ratio, watermark, engine, scene_index, cloud_fallback, cloud_fallback_reason, job_group_id, candidate_index, candidate_count, direction }, subject_integrity: { subject_pixel_identity, result, ly_do[] } | null, variants: { asset_id, variant_key: "transparent"|"styled"|"branded", title, background, ratio, watermark, generative_fill_used, url, approval_state, approved_at }[], approval: { can_approve, requires_warning } }`.

Asset biến thể (`kind = MARKETING`, `approval_state = PENDING`, `parent_asset_id = master`): `identity_score` = số đo; `metadata` gồm `job_id, variant_key, preset, ratio, watermark, subject_pixel_identity, engine, background_provider, cloud_fallback, cloud_fallback_reason, scene_index, scene_plan_id, scene_plan_revision` và từ 25/09 `fill_mode, composition, light_direction, subject_box` (x, y, rộng, cao trong khung xuất), `seed, scene_prompt` (prompt cuối gửi nhà cung cấp), `provider_ignored`; từ Đợt 2 `style, palette, candidate_index, candidate_count, job_group_id`; từ Đợt 3 `quality, upscale { factor, subject_engine, background_engine }, compose_mode, harmonize { background_blur_px, shadow_color }, edge_fade { edges, skin, band_px }, segmentation { model, license, commercial_use }, aesthetic { score, components, version }`. `GET /media/variants/:job_id` thêm `quality_report { aesthetic, edge_fade, segmentation, quality, upscale, compose_mode }`. `pipeline_version` = `m04b-2` / `m04b-cloud-2`.

Ngưỡng theo cách đo (sự kiện `variant_integrity.method`):
- `pixel_exact` (luồng cục bộ / đám mây `paste`): SAFE ≥ 0,999 · WARNING ≥ 0,99 · REJECTED < 0,99 (không ghi asset).
- `perceptual` (luồng nhà cung cấp trọn gói — bó hoa đã được chỉnh sáng nên không so từng điểm ảnh): `structure_ssim` (SSIM cấu trúc trong lõi) ≥ 0,90 / 0,80 · `color_delta_e` (ΔE trung vị) ≤ 8 / 15 · `shape_iou` (IoU mặt nạ mong đợi ↔ mặt nạ tách từ ảnh ra) ≥ 0,95 / 0,90 — số xấu nhất quyết định, thiếu số nào = REJECTED. Nguồn: `PERCEPTUAL_THRESHOLDS` (`variant-rules.ts`), worker giữ bản sao `image/do_giu_nguyen.py`. **Chưa hiệu chỉnh bằng ảnh thật** (nợ #138). Không nhà cung cấp nào trả phép đo "giữ nguyên" (soát 25/09) — cổng là của ALG. Asset ghi `ai_relit: true` → giao diện gắn nhãn "đã chỉnh sáng bằng AI"; `flow`: `provider_scene` / `provider_background` / `local` / `local_fallback`.
- Giá tạm (PO chốt 25/09, sẽ đổi một lượt): cục bộ 1 · đám mây `paste` 2 (Ultra 4) · đám mây `relight` (trọn gói) 4 · `upscale=2x` ở luồng trọn gói +1 (tăng nét của nhà cung cấp), ở luồng khác +0.

---

## 6. Khu vực E — Chặng 06d

`POST /api/v1/video/jobs` (`I1`):

| Trường | Kiểu |
|---|---|
| `productId?`, `title` | |
| `format` | `REEL_15S \| TIKTOK_30S \| STORY_15S \| SLIDESHOW \| PRODUCT_PAGE \| AD_MOTION` |
| `aspectRatio?` | theo khuôn |
| `musicTrack?`, `voiceCode?` | để trống = worker tự chọn |
| `hasSubtitle?`, `hasWatermark?` | |
| `captionStyle?` | `MODERN_BADGE \| MINIMAL_ELEGANT \| HIGHLIGHT_BOX \| BOTTOM_BANNER \| NONE` |
| `scenes?[]` | `{ sceneIndex?, durationSeconds (0,5–15), imageAssetId?, textOverlay?, voiceScript?, transitionEffect?, motionEffect?: ZOOM_IN \| ZOOM_OUT \| PAN_UP \| PAN_RIGHT \| STATIC }` |

Tạo ra `video_jobs` ở `DRAFT`. Tiếp theo: `PATCH …/storyboard` (`I1`), `POST …/approve-script` (`P3`), `POST …/render` (`I1`, job `video.render` 5 credit), `POST …/approve-video` (`P4`). `video_stage`: `DRAFT, SCRIPT_GENERATING, SCRIPT_READY, SCRIPT_APPROVED, RENDERING, RENDER_COMPLETED, APPROVED, REJECTED, FAILED`.

**Dựng video từ bộ tài sản (Đợt 4, 24/09/2026 — cách mặc định):** `POST /creative-production/video-assembly` (đặc tả 06) lắp video từ kịch bản sản xuất tổng + ảnh Khu vực D + nguyên bản phối Khu vực C; giao diện `plan-video-assembly.tsx` kiểm tra sẵn sàng khi mở Khu vực E, chỉ rõ cảnh thiếu ảnh ("Sinh cảnh N ở Khu vực D →") hoặc thiếu âm thanh ("Mở Khu vực C →"). Luật lắp: `video-assembly-rules.ts`. Khuôn đổi sang khuôn dài hơn nếu thời lượng thật của âm thanh vượt khuôn kịch bản. Storyboard tay vẫn còn (nâng cao) — video tạo theo cách đó tự đọc lại lời thoại.

`GET /api/v1/video/jobs/:id` (`I1`) trả job kèm `final_video_view_url` — URL ký có hạn (`/api/v1/storage/<key>?exp&sig`), chỉ ký khoá thuộc `videos/<organizationId>/`; `null` khi chưa render xong. Giao diện (`video-job-lifecycle.tsx`) đọc 3 giây/lần cho tới khi xong.

Storyboard từ kịch bản (24/09/2026, `video-storyboard-builder.ts`): mỗi cảnh của kịch bản → một `scenes[]` với `textOverlay`, `voiceScript`, `motionEffect` của cảnh; `imageAssetId` = ảnh biến thể cùng `scene_index` ở D, thiếu thì Master. Ảnh từng cảnh (`scene-images-client.ts`, sửa 24/09 tối): Master đã duyệt → chưa có thì nâng ảnh gốc thành Master như D → không được thì ảnh gốc; biến thể ưu tiên đúng kịch bản, không có thì bản mới nhất cùng số cảnh (kịch bản đã viết lại); nút "↻ Lấy ảnh mới nhất từ Khu vực D". `POST /video/jobs/:id/render` nhận thân tuỳ chọn `{ scene_images: [{ scene_index, asset_id }] }` để lấp cảnh còn trống ảnh (chỉ asset của đúng tổ chức, loại MASTER/MARKETING/ORIGINAL/ENHANCED); không có thì máy chủ lấy ảnh D mới nhất cùng số cảnh của Master sản phẩm, rồi Master. `voiceCode` gửi theo giọng chọn ở "Cấu hình cơ bản" (không gửi thì worker bỏ lồng tiếng). Render đổi mã asset → `storage_key`; cảnh không có ảnh → `400`.

---

## 7. Khu vực F — Chặng 07 → 09

`PackagePost`: `{ channel: "facebook"|"instagram"|"tiktok"|"zalo", text: string, hashtags: string[] }` — mỗi kênh tối đa một bài.

| Chặng | Gọi | Vào | Ra / hiệu ứng |
|---|---|---|---|
| 07 | `POST /creative-production/packages` (`I1`) | `{ name, mode, master_asset_id, topic?: { id, title, angleCategory?, hook?, cta?, scene2Preset? }, posts?, variant_asset_ids?, video_job_id?, video_job_ids?, audio_job_id? }` | gói `DRAFT` |
| 07 | `PATCH /creative-production/packages/:id` (`I1`) | các trường trên (trừ master/mode/topic) | về `DRAFT`, xoá QA |
| — | `GET /creative-production/packages/:id` (`G1`) | — | `CampaignPackageView` (dưới) |
| 08 | `POST /creative-production/packages/:id/qa` (`I1`) | — | `qa_report` + `status` |
| 09 | `POST /creative-production/packages/:id/approve` (`J5`) | `{ acknowledge_warnings?: boolean }` | `APPROVED`, `audit_logs` |

`CampaignPackageView`: `{ id, name, mode, status, master_asset_id, product_id, topic, posts, variant_asset_ids, video_job_id (video chính = video_job_ids[0]), video_job_ids[], audio_job_id, variants: { asset_id, url, aspect_ratio, identity_score, approval_state, scene_index, watermark }[], video: { id, title, stage, video_approval, script_approval, aspect_ratio, final_video_url, view_url (ký có hạn) } | null, videos: cùng dạng[] (mỗi khung một video), audio: { job_id, stage, audio_url } | null, qa_report, qa_checked_at, approved_by, approved_at, launch_plan, created_at, updated_at }`.

`QaReport`: `{ verdict: "PASS"|"NEEDS_REVIEW"|"REJECTED", checks: { id: product_integrity|approvals|platform_specs|content|brand|plan_consistency|scope_coverage, title, verdict, reasons[] }[], checkedAt }`. `scope_coverage` (24/09/2026 khuya) chỉ có khi kịch bản gắn gói có phạm vi: thiếu bài theo kênh, âm thanh, ảnh hoặc video của một khung trong phạm vi → `REJECTED`; loại không chọn thì không đòi (và trục ảnh/nội dung thôi đòi "chưa có ảnh/bài" khi loại đó ngoài phạm vi). `plan_consistency` (Đợt 5, 24/09/2026) chỉ có khi `topic.scenePlanId` được gắn (gói tạo từ 24/09): ảnh (`metadata.scene_plan_id/revision`), âm thanh (`payload.scenePlanId/Revision`), video (`video_jobs.scene_plan_id/revision`, `audio_storage_key`) phải cùng kịch bản và không cũ hơn phiên bản hiện hành. `topic` nhận thêm `scenePlanId?`, `scenePlanRevision?`. `POST /scene-revisions` trả thêm `scene_plan_revision`. Luật chi tiết: Arch §8.

### 7.1. Sửa tại chỗ ở Chặng 07 (24/09/2026)

Kết quả sửa tự thay vào gói và lưu qua `PATCH …/packages/:id` (gói về `DRAFT`, xoá QA). Hai route AI mới chạy tại chỗ (`enqueueJob` → `startInline` → cổng AI → `finishInline`; hỏng → `FAILED` + hoàn credit), `I1`, `Idempotency-Key` bắt buộc:

| Route | Vào | Ra | Feature |
|---|---|---|---|
| `POST /creative-production/scene-revisions` | `{ instruction (3–MAX), scene_index 1–5, mode, scene_plan_id? (uuid), scene? (cảnh đầy đủ, dùng khi không có plan trong kho), topic_title?, product_name?, colors?[] }` | `{ job_id, scene, usage }` — có `scene_plan_id` thì ghi kịch bản đã sửa vào job gốc (`replaceOutput`) | `creative.scene_revise` 1 credit, `AIC-18` |
| `POST /creative-production/content-rewrites` | `{ channel, text, hashtags[], instruction, product_name?, topic_title?, price_range? }` | `{ job_id, text, hashtags, warnings[], usage }` — giới hạn độ dài theo kênh; từ cấm ngành hoa / thương hiệu → loại lượt, hoàn credit | `creative.content_rewrite` 1 credit, `AIC-23` |

Ảnh cảnh sau khi sửa: `POST /media/variants` với `scene_prompt` = `backgroundPrompt` mới (qua cổng Subject Integrity). Âm thanh: `POST /audio/jobs` mới. Video: `POST /video/jobs` mới → P3 (giữ riêng theo PO) → render → P4. Tất cả dùng lại backend của khu vực gốc.

---

## 8. Downstream — Chặng 10 → 14

| Chặng | Gọi | Vào | Ra |
|---|---|---|---|
| 10 | `PUT /creative-production/packages/:id/launch` (`J5`) | `{ channels: PackageChannel[] (≥1), scheduled_at?: ISO, post_refs: { platform, content_id }[] }` | `launch_plan = { channels, scheduledAt, postRefs }` (gói phải `APPROVED`) |
| 11–14 | `GET /creative-production/packages/:id/performance` (`R1`) | — | dưới |

```ts
{
  package_id, status,
  sell: { conversations_since_approval, orders },
  measure: {
    since: ISO | null,
    orders: { count, quantity, revenueVnd },       // sản phẩm của gói, từ approved_at, bỏ DRAFT/CANCELLED
    conversations,                                 // toàn tiệm, từ approved_at
    channel: { linkedPosts, postsWithData, reach, impressions, engagement, clicks, conversions },  // null = chưa có số
    caveats: string[]                              // giới hạn của phép đo — hiển thị nguyên văn
  },
  learn: { status: "INSUFFICIENT_DATA", have, need: 3 }
       | { status: "OK", basedOn, patterns: { dimension: angleCategory|scene2Preset|hasVideo, value, packages, avgRevenueVnd, avgOrders }[] },
  next_best_actions: { id, title, why, target: area-b|area-d|area-e|area-f|/lich-dang|/hoi-thoai }[],
  computed_at
}
```

---

## 9. Sơ đồ dữ liệu

```
assets(ORIGINAL) ─▶ product_analysis_runs(report) ─▶ URL định danh ─▶ CreativeStudioContext
                                                                    │
   B: produce (không lưu) ──"Lưu bài vào gói"──────────────────────┐ │
   C: generation_jobs(audio.generate).output.audio_storage_key ──┐ │ │
   D: generation_jobs(media.variant[.cloud]) → assets(MARKETING) ┤ │ │
   E: video_jobs + video_scenes(motion_effect)  ─────────────────┤ │ │
                                                                  ▼ ▼ ▼
                                                     campaign_packages (07–10)
                                                                  │
                           orders/order_items · chat_conversations · content_metrics ─▶ 11–14
```
