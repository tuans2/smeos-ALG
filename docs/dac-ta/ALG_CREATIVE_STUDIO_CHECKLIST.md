# Checklist — Creative Studio (Chặng 01–14, 6 Khu vực A–F)

> **Quy tắc:** `[x]` = mã đã làm đúng điều ô nói VÀ có kiểm chứng ghi ở cột cuối dòng. `[ ]` = chưa làm hoặc chưa kiểm chứng được. Trước khi tin một ô đã tích, mở đúng tệp ô đó nói tới (AGENTS.md).
> **Phiên bản:** 2.2 — 24/09/2026 (tối): Khu vực C hoàn thiện 4 tác vụ. Bản 2.1 — 24/09/2026 (kịch bản bối cảnh Chặng 05, chất lượng ảnh D, E theo kịch bản + giọng đọc, Chặng 07 sửa tại chỗ). Bản 2.0 — 23/09/2026. Thay bản 1.0 (21/09, "5 tabs", đa số ô chưa tích dù mã đã có, trong khi Khu vực D tích cả ô "Subject Integrity 99.8–100%" vốn là số gõ tay).
> **Kiểm chứng máy thật 23/09 (máy anh Tony, VM Linux):** `tsc --noEmit` sạch · `vitest` 770/770 (94 tệp) · `eslint` phạm vi Creative Studio 0 lỗi · `pytest` worker 307 ca xanh (trừ `test_audio_worker.py` cần mạng TTS) · `check:docs` khớp. **Chưa chạy:** `test:tenant` (cần Postgres) — bắt buộc trước merge.
> **Kiểm chứng 24/09 (tối, sau Khu vực C):** `tsc` sạch · `vitest` **824/824** (101 tệp) · `pytest` worker xanh (gồm 14 ca `test_audio_worker.py` offline + 10 ca `test_voice_clone_worker.py`) · `check:docs` khớp. Máy dev cần `prisma migrate deploy` (`20260924120000_audio_voice_clones_music_tracks`) + `ELEVENLABS_API_KEY`.
> **Kiểm chứng 24/09:** `tsc --noEmit` sạch · `vitest` **792/792** · `eslint` phạm vi 0 lỗi · `pytest` media_ai + video xanh · `check:docs` + `check:template-ssot` khớp. **Chưa chạy:** `test:tenant` (có ca mới `content-drafts.test.ts`), gọi AI/Stability thật. Trên máy dev cần `prisma migrate deploy` (`20260924090000_content_drafts`) + `db:seed` (AIC-18, AIC-23).

---

## 0. Bàn giao & cổng chuyển tiếp

- [x] URL bàn giao chỉ mang định danh, chặn Data URL/blob — `build-handoff-url.ts` + `build-handoff-url.test.ts`
- [x] `validateTransition` 8 trường bắt buộc — `validate-transition.test.ts`
- [x] Trang không bịa passport dự phòng; `category` = hình dáng, không phải phân khúc giá — `page.tsx` (23/09)
- [x] `audioJobId`/`videoJobId` mang qua URL sang Khu vực F — `audio-workspace.tsx`, `video-workspace.tsx`
- [ ] FFprobe tự đo thời lượng video nguồn — chưa làm

## 1. Khu vực A — Chặng 01–05

- [x] Tải ảnh → kho → `assets` ORIGINAL, kiểm `res.ok` từng bước — `product-intelligence-workspace.tsx` (23/09)
- [x] Vision `gpt-4o-mini` bóc tách nguyên tử, sửa được — `openai-vision-adapter.ts`
- [x] Trend Fit từ `trend_signals`, lưu `product_analysis_runs` — nợ #113/#115 đã trả; test tenant `product-intelligence-isolation`
- [x] 10 chủ đề + video tham khảo có nhãn "ước tính" khi không phải số thật — `product-topics-list.tsx` (23/09)
- [ ] Video tham khảo thời gian thực (TikTok/YouTube API) — nợ #122
- [ ] Occasion Intelligence / Positioning / Competitive Context — nợ #117 (PO tạm hoãn)

## 2. Khu vực B — Chặng 06a

- [x] `POST /creative-production/produce`, CREATIVE/AUTHENTIC; `organizationId` từ phiên — `produce/route.ts` (23/09)
- [x] 4 bài đa kênh, sửa được, không còn giá/thành phần bịa — `social-post-generator.ts`, `creative-result-viewer.tsx` (23/09)
- [x] Sửa lỗi rules-of-hooks trong `CreativeResultViewer` (tách vỏ/thân) — eslint 0 lỗi
- [x] "Lưu bài vào gói chiến dịch" — `package-client.ts`
- [x] Sửa tại chỗ ở Chặng 07 (ảnh/bài/âm thanh/video), chạy ngầm, tự thay vào gói + lưu — `package-revise-panels.tsx`, `package-review-section.tsx`, `revise-assets.ts`, `revision-rules.ts` + `revision-rules.test.ts` (24/09)
- [ ] `npm run db:seed` để hai mô hình OpenAI có `AIC-23` (AI viết lại bài)
- [x] Bài B tự lưu (`content_drafts`, migration `20260924090000`), Chặng 07 đưa sẵn / đề xuất thay — `creative-result-viewer.tsx`, `package-workspace.tsx`, `tests/tenant/content-drafts.test.ts` (viết xong, chưa chạy — cần Postgres) (24/09)
- [ ] Khuôn bài còn câu cam kết dịch vụ chung chưa lấy từ hồ sơ tiệm — nợ #119

## 3. Khu vực C — Chặng 06b

- [x] `Idempotency-Key` bắt buộc, `usage` trả số credit đã trừ thật — `audio/jobs/route.ts`, `create-audio-job.ts`
- [x] Worker nhận `audio.generate`, ghi bản phối lên kho — `audio_worker.py#process_audio_generation_job` + `test_audio_job_lifecycle.py`
- [x] `GET /audio/jobs/:id` + trình nghe trên trang — `get-audio-job.ts`, `audio-workspace.tsx`
- [x] Bốn loại tác vụ ra kết quả khác nhau thật (VOICEOVER chỉ giọng · MUSIC_SELECT chỉ nhạc, không TTS · AUDIO_MIX · VOICE_CLONE strict) — `audio-task-rules.ts`, `audio_worker.py#process_audio_job` + `test_audio_worker.py` (14 ca) (24/09)
- [x] Credit trừ đúng bảng ước tính (`enqueueJob({ costCredit })`; Music Select/Edge = 0); job lỗi tự hoàn khi đọc — `create-audio-job.ts`, `get-audio-job.ts` + `audio-task-rules.test.ts` (24/09)
- [x] Chọn 6 giọng trên giao diện; lùi nhà cung cấp giữ cùng giọng (`providerVoiceMap`) và báo rõ; bỏ macOS `say` khỏi chuỗi lùi; ElevenLabs đổi tên giọng → `voice_id` — `tts_engine.py` + `test_voice_clone_worker.py` (24/09)
- [x] Giọng dài hơn cảnh: kéo dài cảnh (tối đa nhanh 1,1×) thay vì tua 2× rồi cắt — `mixing_engine.py#fit_voice_to_scene` (24/09)
- [x] Phối: sidechain ducking thật (đo: nhạc hạ ~11 dB khi có giọng), `amix normalize=0`, -14 LUFS; xuất thêm bản chỉ-giọng — `mixing_engine.py#mix_audio` (24/09)
- [x] Thư viện nhạc: nghe thử, nhãn giấy phép, tiệm tự tải có khai nguồn + cam kết; mã bài lạ không còn âm thầm thành guitar — `music-tracks.ts`, `music-library-panel.tsx`, bảng `music_tracks` (24/09)
- [x] Voice Clone ElevenLabs IVC: tải mẫu + cam kết → job `audio.voice_clone` → READY; xoá gỡ cả trên ElevenLabs — `voice-clones.ts`, `voice_clone_worker.py`, `voice-clone-panel.tsx`, bảng `voice_clones` (24/09)
- [x] Chặng 07 "Sửa âm thanh" giữ giọng/nhà cung cấp/bài nhạc của bản cũ (trước luôn VOICEOVER + OpenAI) — `package-revise-panels.tsx#AudioRevisePanel` (24/09)
- [ ] `tests/tenant/audio-library.test.ts` (viết xong, chưa chạy — cần Postgres)
- [ ] Chạy thật với OpenAI/ElevenLabs trên máy anh Tony (cần `ELEVENLABS_API_KEY` gói có Instant Voice Clone)
- [ ] 4 bài nhạc hệ thống chưa có hồ sơ giấy phép (nợ #128) — cần thay bằng bài có giấy phép thương mại

## 4. Khu vực D — Chặng 06c

- [x] Kịch bản bối cảnh theo CHỦ ĐỀ do AI viết qua job `creative.scene_plan` (AIC-18, 1 credit, hoàn khi hỏng), CREATIVE 5 / AUTHENTIC 3 cảnh — `scene-plan-rules.ts`, `generate-scene-plan.ts` + `scene-plan-rules.test.ts`, `generate-scene-plan.test.ts` (24/09)
- [x] Mở lại C/D tra kịch bản theo khoá, không trừ credit; kịch bản cơ bản miễn phí khi AI lỗi — `scene-plan-client.ts`
- [x] Mỗi cảnh một job thật, mang `scene_index` (1–5) + `scene_plan_id`; chỉ nạp lại ảnh của đúng kịch bản — `variant-workspace.tsx`, `variant_worker.py`
- [x] Hậu cảnh Stability dùng `backgroundPrompt` của từng cảnh (bỏ 2 lời nhắc viết cứng) — `variant-workspace.tsx#handleGenerateSingleScene`
- [x] Khu vực C lấy lời thoại từ cùng kịch bản — `audio-workspace.tsx`
- [x] Kịch bản sinh ở Chặng 05 khi "Bắt đầu sáng tạo", `scenePlanId` trên URL — `creative-handoff-modal.tsx` (24/09)
- [x] **Đợt 1 — Kịch bản sản xuất tổng v2** (PO 24/09): nền tảng đăng → khung hình + khuôn video (`publishing-rules.ts`, cấu hình sẵn 9:16/4:5/1:1/16:9, mặc định 9:16), thời lượng từng cảnh cân theo lời thoại, chuyển cảnh/cỡ cảnh, âm thanh, video, bài đăng từng kênh, `revision`; bản v1 nâng lên khi đọc; `PATCH /scene-plans/:id`; Chặng 05 chọn nền tảng + xem trước/sửa kịch bản — `scene-plan-rules.ts`, `scene-plan-edit.ts`, `production-plan-preview.tsx` + `production-blueprint.test.ts` (16 ca)
- [x] **Đợt 2** — B: bài đăng kênh nào kịch bản đã viết thì dùng bài đó (khuôn chỉ còn dự phòng), cung truyện + thời lượng theo kịch bản — `creative-result-viewer.tsx`, `contents-workspace.tsx`; C: giọng, chất lượng, mood nhạc, thời lượng từng cảnh từ kịch bản; job âm thanh ghi `scenePlanId` + `scenePlanRevision` — `audio-workspace.tsx`, `create-audio-job.ts`, `get-audio-job.ts`
- [x] **Đợt 3** — D sinh ảnh đúng khung của nền tảng đăng (mặc định 9:16, trước đây 1:1); ảnh ghi `scene_plan_revision`; thẻ cảnh báo "Kịch bản đã sửa — nên sinh lại" / "Khung … ≠ … — nên sinh lại" — `variant-workspace.tsx`, `request-variants.ts`, `variant_worker.py`
- [x] **Đợt 4** — E "Dựng video từ bộ tài sản": ảnh D đúng kịch bản + cảnh, nguyên bản phối C (worker không đọc lại TTS), thời lượng = thời lượng thật của C, phụ đề/chuyển cảnh/khuôn/khung theo kịch bản; thiếu → chặn + dẫn về đúng khu vực — `video-assembly-rules.ts` + `video-assembly-rules.test.ts` (6 ca), `assemble-video.ts`, `plan-video-assembly.tsx`, `local_cinematic.py` + 2 ca pytest, migration `20260924150000`, `tests/tenant/video-assembly.test.ts` (viết xong, chưa chạy)
- [x] **P1 phạm vi/phụ đề** — Phụ đề luôn = lời thoại (kịch bản, xem trước, storyboard, Sửa video, dựng video); worker hiện phụ đề từng đoạn đúng lúc đọc (lớp RGBA theo thời gian, không bị Ken Burns phóng to); bù chồng xfade để hình khớp tiếng — `caption_engine.py#split_subtitle_chunks/subtitle_timeline/render_caption_overlay`, `slideshow_engine.py`, `local_cinematic.py` + 4 ca pytest, render thật 2 cảnh khớp 5,0s
- [x] **Đợt 5** — "Sửa cảnh" ở Chặng 07 tăng `revision` kịch bản, ảnh mới mang phiên bản mới và **tự thay ảnh + phụ đề cảnh đó vào storyboard video của gói** (cần P3 + render lại; lời thoại đổi thì nhắc phối lại âm thanh); gói lưu `topic.scenePlanId/scenePlanRevision`; QA Chặng 08 thêm trục **"Đồng nhất kịch bản sản xuất"** (ảnh/âm thanh/video khác kịch bản, phiên bản cũ, video không dùng bản phối C → cần xem lại) — `package-revise-panels.tsx#propagateSceneToVideo`, `campaign-package-rules.ts`, `manage-campaign-package.ts` + `plan-consistency-qa.test.ts` (5 ca)
- [x] Khu vực B hiển thị cung truyện theo đúng kịch bản (kèm dòng "Bối cảnh") — `contents-workspace.tsx#withScenePlan`
- [x] Storyboard video E đúng số cảnh/phụ đề/lời thoại/chuyển động của kịch bản, ảnh biến thể cùng cảnh ở D (thiếu thì Master) — `video-storyboard-builder.ts` + `video-storyboard-builder.test.ts` (24/09)
- [x] Sửa "Cảnh #1…#5 chưa có ảnh sản phẩm": E tìm Master như D (nâng ảnh gốc nếu cần), nhận ảnh D của kịch bản đã viết lại, nút "Lấy ảnh mới nhất từ Khu vực D"; render lấp cảnh trống ảnh (ảnh storyboard gửi kèm → ảnh D → Master) — `scene-images-client.ts`, `dispatch-video-render.ts#findFillImages` + ca mới trong `tests/tenant/video-studio.test.ts` (24/09 tối)
- [x] Gỡ ảnh mẫu Unsplash khỏi storyboard/`create-video-job`; render đổi mã asset → `storage_key`, chặn cảnh thiếu ảnh; worker bỏ ảnh mẫu dự phòng (24/09)
- [x] Khu vực E làm đủ P3 → render → xem video → P4 tại chỗ; `GET /video/jobs/:id` trả `final_video_view_url` ký có hạn (trước đó URL không ký, không phát được); thanh 06d chỉ "đã duyệt" khi P4; credit hiển thị = credit render thật — `video-job-lifecycle.tsx`, `get-video-job.ts#videoViewUrl` (24/09)
- [x] Video có giọng đọc: E gửi `voiceCode` (trước đây không gửi nên worker bỏ bước lồng tiếng, video chỉ có nhạc); chọn giọng trong "Cấu hình cơ bản", đọc lời thoại từng cảnh khớp thời lượng; worker cảnh báo khi TTS hỏng — `video-workspace.tsx`, `audio_engine.py` (24/09)
- [ ] Bài viết B sinh phía máy chủ từ kịch bản — nợ #125
- [ ] `npm run db:seed` để hai mô hình OpenAI có `AIC-18` — cần anh Tony chạy
- [x] Nhánh cloud qua `enqueueJob` (`media.variant.cloud`, 2 credit), cổng Master đã duyệt — `request-variants.ts` + `request-cloud-variant.test.ts`
- [x] Worker: Stability chỉ vẽ hậu cảnh, bó hoa dán nguyên khối, integrity ĐO — `stability_background.py`, `variant_worker.py` + `test_variant_cloud.py`
- [x] Nhà cung cấp lỗi → lùi phông cục bộ, ghi `cloud_fallback` — `test_variant_cloud.py`
- [x] Sửa phép đo: co biên 5px > light wrap 4px; REJECTED không ghi asset — `variant_worker.py#DO_SAU_CO_BIEN`
- [x] Chốt alpha lõi ≥ 250 về 255 sau khi tách nền (bria-rmbg trả lõi ≈ 254 → mọi ảnh thật bị đo ~0,82 và từ chối); đo lại ảnh thật: 1,00 — `variant_worker.py#_chot_loi_dac` + ca hồi quy (24/09)
- [x] Sửa "ảnh sản phẩm bị xoá nhoà": bria-rmbg trả ~75% đầu hoa ở alpha 128–244 → `EdgeDefringer` tô đè cả thân hoa, phông lọt qua khi ghép, cổng chỉ đo ~12% đầu hoa nên vẫn báo 100%. Nay khử viền chỉ trong dải 6px sát nền; thân (alpha ≥ 128, co 4px) đặc 255 và lấy nguyên điểm ảnh Master; lõi đo phủ 93% sản phẩm (tối thiểu 60%, không đủ thì từ chối) — `defringe.py`, `variant_worker.py#_lam_dac_chu_the` + 2 ca hồi quy (24/09)
- [x] Gỡ `execFileSync` khỏi tiến trình web; `studio_local` không trả ảnh gốc giả — `studio-local-image-provider.ts` + test router
- [x] Gỡ canvas cutout phía trình duyệt; bỏ số "99.9%/99.8%/100%" gõ tay — `variant-workspace.tsx`
- [x] Tự nạp phân cảnh chỉ của Master đang chọn (`parent_asset_id`) — `assets/route.ts`, `list-assets.ts`
- [x] ~~Ánh xạ Cảnh 2 theo `angleCategory`~~ — thay bằng kịch bản bối cảnh theo chủ đề (24/09)
- [x] Duyệt từng cảnh (`I5`) — `variant-workspace.tsx#handleApproveScene`
- [x] Gỡ bộ chọn "6 bối cảnh" chọn tay + nhãn sai "10 phối cảnh (0đ)"; màn cấu hình = xem trước cảnh của kịch bản + nguồn hậu cảnh + tỉ lệ + watermark — `variant-workspace.tsx#openSceneBoard` (24/09)
- [ ] Đo tốc độ chính thức trên worker production (con số ~0,46s là đo CLI dev)
- [x] Mỗi khung trong phạm vi sản xuất một bộ ảnh: tab khung, "Sinh đủ N khung", `?focusRatio` — `variant-workspace.tsx` (24/09 khuya)

## 5. Khu vực E — Chặng 06d

- [x] Storyboard dựng ngay khi mở tab; gửi đúng storyboard đang thấy (sửa lỗi gửi rỗng) — `video-workspace.tsx`, `storyboard-editor.tsx#onChange`
- [x] Ken Burns theo cảnh lưu `video_scenes.motion_effect`, vào payload render — migration `20260923161000`, `dispatch-video-render.ts`
- [x] Tự gắn ảnh biến thể của Khu vực D vào cảnh — `video-workspace.tsx`
- [x] Cổng duyệt `P3`/`P4` (đặc tả sửa theo mã)
- [ ] Nhận bản phối âm thanh từ Khu vực C — nợ #123
- [x] Mỗi khung một video: `video-assembly` nhận `ratio`, tab "Video 9:16 / 16:9…" — `video-assembly-rules.ts`, `plan-video-assembly.tsx` (24/09 khuya)

## 6. Khu vực F — Chặng 07–09

- [x] Bảng `campaign_packages` (TENANT) + migration `20260923160000` + TRUNCATE test — `schema.prisma`, `tests/helpers/database.ts`
- [x] Tạo/sửa gói, kiểm định danh thuộc đúng tổ chức & đúng Master — `manage-campaign-package.ts`
- [x] Chặng 07 xem lại đủ tài sản: ảnh theo cảnh (duyệt I5 tại chỗ), video phát được (`video.view_url` ký có hạn, duyệt P4 tại chỗ), âm thanh nghe được, bài đăng sửa được; làm lại dẫn về khu vực gốc kèm `returnTo=f` / `focusScene` / `videoJobId` / `audioJobId`, về gói thì đề xuất tài sản mới — `package-review-section.tsx`, `page.tsx` (24/09)
- [x] QA năm trục phía máy chủ — `campaign-package-rules.ts` + `campaign-package-rules.test.ts` (17 ca)
- [x] Duyệt `J5` + `audit_logs` cùng giao dịch + chốt chặn đua — `approve-campaign-package`
- [x] Ca thử cách ly tenant — `tests/tenant/campaign-packages.test.ts` (viết xong, **chưa chạy** — cần Postgres)
- [ ] Năng lực riêng + trần cứng cho duyệt gói — nợ #121 (chờ PO)
- [x] Gói nhiều video (`video_job_ids`, migration `20260924180000`), tab "Video theo khung" ở Chặng 07, QA `scope_coverage` "Đủ phạm vi đã chọn" — `scope-coverage-qa.test.ts` (24/09 khuya)
- [ ] Chạy `test:tenant` với cột `video_job_ids` (cần `prisma migrate deploy` trên máy anh Tony)

## 7. Chặng 10–14

- [x] Kế hoạch đăng + mã bài đã đăng — `PUT /packages/:id/launch`
- [x] Đơn/doanh thu/hội thoại/số liệu kênh THẬT, có ghi giới hạn — `get-campaign-performance.ts`
- [x] Mẫu thắng chỉ khi ≥ 3 gói, ≥ 2 nhóm — `extractWinningPatterns`
- [x] Đề xuất dựa trên dữ kiện thật + dịp cố định 30 ngày — `nextBestActions`
- [x] Gỡ toàn bộ số gõ cứng ("34 đơn", "20.366.000đ", "96%") — `package-downstream-card.tsx`
- [ ] Tự đăng bài từ Creative Studio (hiện đăng ở Lịch đăng/SocialFlow) — ngoài phạm vi, theo ranh giới module
- [ ] Quy đơn hàng về từng bài đăng (mã theo dõi/UTM) — chưa có

## 8. Cắt ngang

- [x] Mọi lượt AI của Creative Studio đi qua `enqueueJob` (trừ Vision/Product Intelligence là lời gọi đồng bộ có sổ riêng)
- [x] Header Studio không còn nút chết `onClick: () => {}` — `page.tsx`
- [x] Nhánh cloud M04a (`/media/optimizations`) vào hàng đợi `media.optimize` — trừ credit thật, idempotent, guard đo ở worker; adapter worker Photoroom (`photoroom_enhancer.py`) + fal (`fal_enhancer.py`) — nợ #120 đã trả 25/09/2026 (xác nhận với khoá thật: nợ #151)
- [x] `npm run lint` toàn repo xanh — nợ #124 (0 lỗi, commit `0a26672`; đo lại 25/09/2026)
- [x] `npm run test:tenant` xanh trên máy có Postgres — **244/244, 34/34 tệp** (Postgres 16, 25/09/2026); `test:platform` 5/5
- [x] CI thật chạy được cổng `test:tenant`: dựng `floraos_test` trong job web; job worker cài `ffmpeg` (CI run 4 trên `main` đỏ vì hai thiếu này — 25/09/2026)
- [x] Theo dõi job Khu vực A/B có hạn 10 phút, thử lại lỗi mạng/5xx, dừng ở 401/403/404, xử lý `CANCELLED`, dừng khi rời trang — `job-polling.ts` + `tests/unit/creative-studio/job-polling.test.ts` (trước: vòng tối ưu ảnh NGỪNG poll khi gặp một lỗi mạng → UI kẹt "đang chạy"; vòng biến thể poll vô hạn)
- [x] Bảng giá v1 (D14/#64): nhà cung cấp = cục bộ + 1, `media.optimize.cloud` = 3, giá hiện ở bộ chọn bộ máy — `pricing.ts` + `pricing.test.ts`
- [x] Một lần bấm = một lần thu: Chặng 05 thu gộp kịch bản + bài viết, bài hỏng hoàn phần bài — nợ #146
- [x] Lùi cục bộ hoàn phần chênh (biến thể + tối ưu ảnh); hỏng/từ chối hoàn ngay lúc đọc — nợ #127, `tests/tenant/partial-refund.test.ts`
- [x] Chặng 02 vào sổ: `product.vision_extract` 1 credit, ảnh đọc từ kho theo `asset_id`, không chọn sẵn ảnh mẫu/dữ liệu bịa, Vision lỗi → form nhập tay TRỐNG; chọn Catalog tra đúng ảnh trong kho (trước truyền nhầm mã sản phẩm làm `asset_id`)
- [x] E2E hành trình (trình duyệt + app + Postgres + worker media thật): tải ảnh → Chặng 02 → Master SAFE → biến thể SAFE → gói QA + duyệt → sổ `usage` — `tests/e2e/creative-studio.spec.ts` (chưa vào CI: nợ #157)
- [ ] Chạy thử mọi bộ máy nhà cung cấp với khoá thật — nợ #153 (**chặn mở bán**)
- [ ] Nhạc nền hệ thống có giấy phép thương mại — nợ #154/#128 (**chặn mở bán video/âm thanh**)

## 9. Tài liệu

- [x] Architecture v4.0 · IO Spec v4.0 · Journey v3.0 · Checklist v2.0
- [x] Đặc tả 06 §8/§19/§22/§23, đặc tả 07 §20/§23 — `check:docs` khớp
- [x] Registry, TRANG_THAI, TECHNICAL_DEBT (#119–#124), AGENTS.md trạng thái
- [x] Phạm vi sản xuất (24/09 khuya): Architecture v4.4 §7.3/§8 · IO Spec v4.4 §5.0c · đặc tả 06/07 · TECHNICAL_DEBT #129
