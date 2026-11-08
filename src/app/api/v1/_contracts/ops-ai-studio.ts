import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-ai-studio"
import * as res from "./responses-ai-studio"

/** Operation `/jobs/*`, `/vision/*`, `/audio/*`, `/video/*` (OpenAPI nội bộ, PO 07/11/2026). */
const JOB = "Tác vụ AI"
const VIS = "Phân tích ảnh sản phẩm"
const AUD = "Âm thanh — giọng đọc & nhạc"
const VID = "Video"
const IDEM = "Header `Idempotency-Key` bắt buộc (thiếu → 400); gửi lại cùng khoá trả job cũ, không trừ credit lần hai. Hết credit → 422 `QUOTA_EXCEEDED`; chạy dồn dập → 429."
const NF = "Của tổ chức khác → 404."
/** Không thấy job → 404, sai trạng thái → 409 (sửa 08/11/2026, audit API §13 — trước đó trả 500). */
const VNF = "Không thấy job (kể cả của tổ chức khác) → 404."
const j = "/jobs/{id}"
const a = "/vision/analyses/{id}"
const v = "/video/jobs/{id}"

export const AI_STUDIO_OPERATIONS: OpenApiOperation[] = [
  op(JOB, { method: "get", path: "/jobs", operationId: "listJobs", summary: "Tác vụ AI (của mình; có `G5` thì toàn tổ chức)", cap: "`G4` · `G5`",
    query: req.cursorQuery, ok: [200, { description: "Trang tác vụ", schema: res.jobsResponse }], errors: [400] }),
  op(JOB, { method: "get", path: j, operationId: "getJob", summary: "Một tác vụ AI", cap: "G4", description: NF, ok: [200, { description: "Tác vụ", schema: res.jobResponse }], errors: [404] }),
  op(JOB, { method: "get", path: `${j}/events`, operationId: "streamJobEvents", summary: "Luồng sự kiện của tác vụ (SSE)", cap: "G4",
    description: `\`text/event-stream\`: mỗi sự kiện \`event\`/\`id\`/\`data\` (JSON); tác vụ kết thúc → sự kiện \`done\` rồi đóng; tối đa 15 phút một kết nối. Nối tiếp bằng header \`Last-Event-ID\` hoặc \`?after=\`. ${NF}`,
    query: req.jobEventsQuery, ok: [200, { description: "Luồng sự kiện", contentType: "text/event-stream" }], errors: [404] }),
  op(JOB, { method: "post", path: `${j}/cancel`, operationId: "cancelJob", summary: "Huỷ tác vụ còn chờ", cap: "G6", description: `Chỉ tác vụ \`PENDING\` — khác → 409. ${NF}`,
    ok: [200, { description: "Tác vụ", schema: res.jobResponse }], errors: [404, 409] }),
  op(JOB, { method: "post", path: `${j}/retry`, operationId: "retryJob", summary: "Chạy lại tác vụ hỏng", cap: "G7",
    description: `Chỉ tác vụ \`FAILED\` — khác → 409. Lượt trước đã được hoàn credit thì trừ lại đúng giá (không đủ → 422). ${NF}`,
    ok: [200, { description: "Tác vụ", schema: res.jobResponse }], errors: [404, 409, 422] }),
  op(JOB, { method: "post", path: "/jobs/batch", operationId: "createModuleJob", summary: "Tạo tác vụ cho một module với các mã năng lực AI chọn sẵn", cap: "mã chạy theo `module`",
    body: req.jobBatchBody, description: `Quyền chạy suy từ \`module\` (bảng \`MODULE_RUN_CAPABILITY\`, module lạ bị từ chối — 403); \`feature\` phải khớp module (400). ${IDEM}`,
    ok: [200, { description: "Tác vụ đã xếp", schema: res.jobCreatedResponse }], errors: [...BODY_ERRORS, 422, 429] }),

  op(VIS, { method: "post", path: "/vision/analyses", operationId: "requestAnalysis", summary: "Phân tích ảnh sản phẩm (xếp job)", cap: "H1", body: req.visionAnalysisBody,
    description: `${IDEM} Ảnh/sản phẩm của tổ chức khác → 404.`, ok: [201, { description: "Job đã xếp", schema: res.analysisCreatedResponse }], errors: [...BODY_ERRORS, 404, 422, 429] }),
  op(VIS, { method: "get", path: "/vision/analyses", operationId: "listAnalyses", summary: "Hàng chờ duyệt, hoặc kết quả đã duyệt", cap: "`H3` (hàng chờ duyệt) · một trong `H5`/`H3`/`L1` khi `approval_state=APPROVED`",
    query: req.analysesQuery, ok: [200, { description: "Trang kết quả", schema: res.analysesResponse }], errors: [400] }),
  op(VIS, { method: "get", path: "/vision/analyses/export", operationId: "exportAnalyses", summary: "Xuất kết quả phân tích ra CSV", cap: "H3", query: req.analysesExportQuery,
    description: "Tối đa 5000 lượt mỗi lần; header `x-so-luot`, `x-so-dong`, `x-cham-tran` (chạm trần). Ghi sổ xuất dữ liệu. Trạng thái/mốc thời gian sai → 400.",
    ok: [200, { description: "Tệp CSV", contentType: "text/csv" }], errors: [400] }),
  op(VIS, { method: "get", path: a, operationId: "getAnalysis", summary: "Một kết quả phân tích", cap: "H1", description: NF, ok: [200, { description: "Kết quả", schema: res.analysisResponse }], errors: [404] }),
  op(VIS, { method: "patch", path: a, operationId: "editAnalysis", summary: "Sửa kết quả phân tích trước khi duyệt", cap: "H2", body: req.editAnalysisBody,
    description: `Đã duyệt → 409. ${NF}`, ok: [200, { description: "Kết quả", schema: res.analysisResponse }], errors: [...BODY_ERRORS, 404, 409] }),
  op(VIS, { method: "post", path: `${a}/approve`, operationId: "approveAnalysis", summary: "Duyệt kết quả phân tích (mặc định tạo luôn sản phẩm)", cap: "H3", body: req.approveAnalysisBody,
    description: `Thân không bắt buộc. Bản đã từ chối vẫn duyệt lại được; đã duyệt → 409. ${NF}`, ok: [200, { description: "Kết quả", schema: res.analysisResponse }], errors: [404, 409] }),
  op(VIS, { method: "post", path: `${a}/reject`, operationId: "rejectAnalysis", summary: "Từ chối kết quả phân tích", cap: "H3", body: req.rejectAnalysisBody,
    description: `Thân không bắt buộc; \`ly_do\` vào sổ kiểm toán. Chỉ bản đang chờ — khác → 409. ${NF}`, ok: [200, { description: "Kết quả", schema: res.analysisResponse }], errors: [...BODY_ERRORS, 404, 409] }),
  op(VIS, { method: "get", path: "/vision/engine", operationId: "getVisionEngine", summary: "Bộ máy phân tích ảnh đang dùng và danh sách", cap: "H1",
    ok: [200, { description: "Bộ máy", schema: res.visionEngineResponse }] }),
  op(VIS, { method: "put", path: "/vision/engine", operationId: "setVisionEngine", summary: "Đổi bộ máy phân tích ảnh", cap: "H4", body: req.visionEngineBody,
    description: "Bộ máy chưa sẵn sàng → 404.", ok: [200, { description: "Bộ máy", schema: res.visionEngineResponse }], errors: [...BODY_ERRORS, 404] }),

  op(AUD, { method: "post", path: "/audio/jobs", operationId: "createAudioJob", summary: "Tạo giọng đọc / nhạc / phối (xếp job)", cap: "I1", body: req.audioJobBodySchema,
    description: `${IDEM} Nhà cung cấp hoặc bài nhạc không dùng được → 422; giọng nhân bản chưa sẵn sàng → 409; của tổ chức khác → 404.`, ok: [201, { description: "Job đã xếp", schema: res.audioJobResultSchema }], errors: [...BODY_ERRORS, 404, 409, 422, 429] }),
  op(AUD, { method: "get", path: "/audio/jobs/{id}", operationId: "getAudioJob", summary: "Trạng thái và URL nghe của job âm thanh", cap: "I1",
    description: `Job \`FAILED\` hoặc lùi nhà cung cấp tự hoàn credit ở lần đọc này (một lần). ${NF}`, ok: [200, { description: "Job", schema: res.audioJobResponse }], errors: [404] }),
  op(AUD, { method: "get", path: "/audio/music-tracks", operationId: "listMusicTracks", summary: "Thư viện nhạc (bài hệ thống + bài tiệm tải)", cap: "I1",
    ok: [200, { description: "Bài nhạc", schema: res.musicTracksResponse }] }),
  op(AUD, { method: "post", path: "/audio/music-tracks", operationId: "uploadMusicTrack", summary: "Tải bài nhạc của tiệm (kèm giấy phép)", cap: "I1", multipart: req.musicTrackForm,
    description: "Sai định dạng/kích thước (MP3/WAV/M4A ≤ 20MB) hoặc loại giấy phép lạ → 400; thiếu nguồn giấy phép hoặc `attest` → 422.",
    ok: [201, { description: "Bài nhạc", schema: res.musicTrackResponse }], errors: [...BODY_ERRORS, 422] }),
  op(AUD, { method: "delete", path: "/audio/music-tracks/{id}", operationId: "deleteMusicTrack", summary: "Gỡ bài nhạc tiệm đã tải", cap: "I1", description: NF,
    ok: [200, { description: "Đã gỡ", schema: res.okResponse }], errors: [404] }),
  op(AUD, { method: "get", path: "/audio/music-tracks/system/{trackId}", operationId: "playSystemTrack", summary: "Nghe thử bài nhạc hệ thống", cap: "I1",
    description: "Mã bài lạ → 404.", ok: [200, { description: "Tệp âm thanh", contentType: "audio/*" }], errors: [404] }),
  op(AUD, { method: "get", path: "/audio/voice-clones", operationId: "listVoiceClones", summary: "Giọng nhân bản của tổ chức", cap: "I1",
    description: "Giọng `FAILED` tự hoàn credit ở lần đọc này.", ok: [200, { description: "Giọng", schema: res.voiceClonesResponse }] }),
  op(AUD, { method: "post", path: "/audio/voice-clones", operationId: "createVoiceClone", summary: "Nhân bản giọng từ mẫu thu (xếp job)", cap: "I1", multipart: req.voiceCloneForm,
    description: `${IDEM} Mẫu sai định dạng/kích thước hoặc thiếu cam kết → 400.`, ok: [201, { description: "Job đã xếp", schema: res.voiceCloneCreatedResponse }], errors: [...BODY_ERRORS, 422, 429] }),
  op(AUD, { method: "get", path: "/audio/voice-clones/{id}", operationId: "getVoiceClone", summary: "Một giọng nhân bản (URL nghe lại mẫu)", cap: "I1", description: NF,
    ok: [200, { description: "Giọng", schema: res.voiceCloneResponse }], errors: [404] }),
  op(AUD, { method: "delete", path: "/audio/voice-clones/{id}", operationId: "deleteVoiceClone", summary: "Gỡ giọng nhân bản", cap: "I1",
    description: `Gỡ ở nhà cung cấp rồi đánh dấu \`DELETED\`. ${NF}`, ok: [200, { description: "Đã gỡ", schema: res.voiceCloneDeletedResponse }], errors: [404] }),

  op(VID, { method: "get", path: "/video/jobs", operationId: "listVideoJobs", summary: "Job video", cap: "I1", query: req.videoJobsQuery,
    ok: [200, { description: "Job video", schema: res.videoJobsResponse }] }),
  op(VID, { method: "post", path: "/video/jobs", operationId: "createVideoJob", summary: "Tạo job video (bản nháp kịch bản)", cap: "I1", body: req.videoJobBodySchema,
    ok: [201, { description: "Job video", schema: res.videoJobRecordSchema }], errors: BODY_ERRORS }),
  op(VID, { method: "get", path: v, operationId: "getVideoJob", summary: "Một job video (kèm URL ký để phát)", cap: "I1", description: VNF,
    ok: [200, { description: "Job video", schema: res.videoJobViewResponse }], errors: [404] }),
  op(VID, { method: "patch", path: `${v}/storyboard`, operationId: "updateStoryboard", summary: "Biên soạn phân cảnh", cap: "I1", body: req.storyboardBody,
    description: `Đang render → 409; phân cảnh sai luật của khuôn (số cảnh, thời lượng) → 422. ${VNF}`, ok: [200, { description: "Job video", schema: res.videoJobRecordSchema }], errors: [...BODY_ERRORS, 404, 409, 422] }),
  op(VID, { method: "post", path: `${v}/render`, operationId: "renderVideo", summary: "Dựng video từ phân cảnh", cap: "I1", body: req.videoRenderBody,
    description: "Thân không bắt buộc (không phải JSON → 400); cảnh còn trống ảnh tự lấp, vẫn trống → 422. Job của tổ chức khác → 404. Trừ credit theo nhà cung cấp đứng đầu.",
    ok: [200, { description: "Job video và job dựng", schema: res.videoRenderResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(VID, { method: "post", path: `${v}/approve-script`, operationId: "approveVideoScript", summary: "Duyệt kịch bản video (cổng 1)", cap: "P3",
    description: `Mã năng lực kiểm ở use-case. Đã duyệt hoặc không ở bản nháp → 409; phân cảnh sai luật → 422. ${VNF}`, ok: [200, { description: "Job video", schema: res.videoJobRecordSchema }], errors: [404, 409, 422] }),
  op(VID, { method: "post", path: `${v}/approve-video`, operationId: "approveVideoOutput", summary: "Duyệt video thành phẩm (cổng 2)", cap: "P4",
    description: `Mã năng lực kiểm ở use-case (trần cứng). Đã duyệt hoặc chưa dựng xong → 409; dựng xong mà không có tệp video → 422. ${VNF}`, ok: [200, { description: "Job video", schema: res.videoJobRecordSchema }], errors: [404, 409, 422] }),
]
