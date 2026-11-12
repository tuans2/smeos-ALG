/**
 * Giá theo `feature`, tính bằng credit — đặc tả 07 mục 7, ví dụ ở đặc tả 06
 * mục 8 (`"usage": { "cost_credit": 1, "balance_after": 479 }`).
 *
 * Không tài liệu nào của bộ đặc tả 13 tệp cho một bảng giá theo tính năng —
 * đây là một giả định đơn giản hoá, ghi ở
 * `docs/dac-ta/TECHNICAL_DEBT.md`. Hằng số, không phải cấu hình theo tổ
 * chức: D2 chốt nền tảng giữ khoá và tính credit, chưa nói giá khác nhau
 * giữa các tổ chức.
 *
 * Thuần: không import hạ tầng, test không cần cơ sở dữ liệu.
 *
 * **Bảng giá v1 (chốt 25/09/2026 — nợ #64/D14, PO giao agent đề xuất và thực
 * hiện).** Chưa có tỷ giá credit ↔ VND (việc của gói thuê bao, D2), nên v1
 * định giá TƯƠNG ĐỐI theo bốn nguyên tắc, khoá bằng `pricing.test.ts`:
 *   1. 1 credit ≈ một lượt nghiệp vụ gọi MỘT mô hình văn bản/thị giác
 *      (`vision.analyze`, `product.copy.generate`, `creative.scene_plan`...).
 *      Chuỗi nhiều lời gọi (Content Engine 4–7 lượt) = 2.
 *   2. Cùng một việc, đường gọi nhà cung cấp ảnh trả phí = đường cục bộ + 1
 *      (`media.variant` 1 → `.cloud` 2, `media.optimize` 2 → `.cloud` 3).
 *   3. Thu theo đường THẬT đã chạy: nhà cung cấp lỗi, worker lùi cục bộ →
 *      hoàn phần chênh lúc đọc kết quả (`refundPartial`, lý do
 *      `cloud-lui-cuc-bo`); hỏng / Guard từ chối → hoàn toàn phần (D3-b).
 *   4. Một lần bấm = một lần thu: lượt nghiệp vụ gồm nhiều job (Chặng 05 =
 *      kịch bản + bài viết) thu GỘP ở job đầu, job đi kèm chạy
 *      `includedInJobId` (0 credit, không tiêu lượt dùng thử); bước đi kèm
 *      hỏng → hoàn đúng phần của nó.
 * Xem lại sau 30 ngày có `ai_requests.cost_usd` thật (nợ #151 ghi chi phí
 * Photoroom/fal) — đổi con số ở đây, không đổi nguyên tắc.
 */
const FEATURE_COST_CREDIT: Readonly<Record<string, number>> = {
  "vision.analyze": 1,
  // Chặng 02 Creative Studio (25/09/2026): một lượt OpenAI Vision đọc ảnh sản
  // phẩm — cùng hạng `vision.analyze` (nguyên tắc 1). Feature riêng vì worker
  // M01 nghe `vision.analyze`. Trước ngày này lượt gọi này không vào sổ.
  "product.vision_extract": 1,
  // Sinh câu chữ bán hàng (M01b). Một lượt gọi mô hình ngôn ngữ trên dữ liệu
  // đã có sẵn, không đụng ảnh — rẻ hơn một lượt phân tích ảnh, nhưng KHÔNG
  // miễn phí: bỏ nó khỏi bảng này là mọi lượt sinh nội dung chạy ngoài sổ,
  // không trừ hạn mức và không đối soát được với hoá đơn nhà cung cấp.
  "product.copy.generate": 1,
  "media.optimize": 2,
  // Khoá GIÁ, không phải `feature` của job: lượt `media.optimize` chọn bộ máy
  // nhà cung cấp (Photoroom / fal / OpenAI — `OPTIMIZE_CLOUD_PROVIDERS`) thu
  // giá này qua `enqueueJob({ costCredit })`. Cùng quy tắc với cặp
  // `media.variant` / `media.variant.cloud`: đường nhà cung cấp = cục bộ + 1
  // (một lượt gọi mô hình ảnh trả phí); nhà cung cấp lỗi, worker lùi cục bộ
  // → hoàn phần chênh lúc đọc kết quả (bảng giá v1, 25/09/2026).
  "media.optimize.cloud": 3,
  // Biến thể marketing (M04b). Rẻ hơn một lượt tối ưu vì nó KHÔNG gọi lại
  // mô hình tăng cường: chủ thể đã có sẵn trong Master Image, lượt này chỉ
  // tách nền, ghép bối cảnh và đóng khung. Nhưng vẫn là một lượt chạy mô
  // hình phân đoạn trên GPU, nên không đặt 0 — để 0 là mở lại đúng cái lỗ
  // mà P24 vừa vá: một đường chạy AI không đi qua sổ nào.
  //
  // Con số này là giả định tạm, cùng hạng với cả bảng — chốt giá thật cho
  // biến thể là nợ #64 (D14), chờ chủ sản phẩm.
  "media.variant": 1,
  // Nhánh Cloud của M04b (23/09/2026): cùng pipeline local, thêm MỘT lượt gọi
  // nhà cung cấp trả phí (Stability, sinh hậu cảnh). Đặt bằng `media.optimize`
  // — cũng là một lượt gọi mô hình ngoài trên một ảnh. Giá tạm, cùng hạng với
  // cả bảng — chờ chủ sản phẩm chốt ở nợ #64 (D14).
  "media.variant.cloud": 2,
  // Kịch bản bối cảnh theo chủ đề (24/09/2026): MỘT lượt gọi LLM văn bản,
  // cùng hạng với `product.copy.generate`. Giá tạm — chờ chủ sản phẩm (nợ #64).
  "creative.scene_plan": 1,
  // Sửa tại chỗ ở Chặng 07 (24/09/2026): mỗi lượt là MỘT lời gọi LLM văn bản.
  // Giá tạm — chờ chủ sản phẩm (nợ #64).
  "creative.scene_revise": 1,
  "creative.content_rewrite": 1,
  // Content Engine (P27, 25/09/2026): MỘT lượt sinh bài chạy cả chuỗi
  // Strategist→Writer×kênh→Critic→Rewriter (4–7 lượt gọi mô hình, tối đa 4
  // kênh). Giá tạm dùng theo quyết định 0.8 — chờ chủ sản phẩm (nợ #64).
  "content.generate": 2,
  // Viết lại MỘT kênh của một bản đã có — Rewriter + Critic + Guard, không
  // chạy lại Strategist/các kênh khác. Giá tạm, cùng nợ #64.
  "content.rewrite": 1,
  "catalog.generate": 1,
  "landing.generate": 1,
  "video.render": 5,
  // Audio Studio (24/09/2026): giá THẬT của từng lượt `audio.generate` tính
  // theo cảnh × nhà cung cấp × chất lượng (`audio-pricing-guard.ts`) và truyền
  // vào `enqueueJob({ costCredit })`; số ở đây chỉ là mức sàn khi không truyền.
  "audio.generate": 1,
  // Nhân bản giọng (ElevenLabs Instant Voice Clone) — giá tạm, nợ #64.
  "audio.voice_clone": 5,
  "chat.channel.messenger_monthly": 50,
  "chat.channel.zalo_monthly": 70,
  "chat.channel.embed_monthly": 30,
  "chat.message.ai_reply": 1,
}

/**
 * Video nhà cung cấp (PO 25/09/2026): mỗi cảnh một clip ảnh → video, giá theo
 * TỶ LỆ chi phí công bố của từng bên (Veo 3 đắt ~3–4 lần Kling/Runway/Luma cho
 * cùng số giây). Tổng một lượt = `video.render` (ghép + âm thanh + phụ đề của
 * ALG) + giá/cảnh × số cảnh. Lùi Ken Burns cục bộ → hoàn phần clip; bên
 * thật rẻ hơn bên đã tính → hoàn chênh (`get-video-job.ts`). Bảng giá v1.
 */
export const VIDEO_CLIP_CREDIT_PER_SCENE: Readonly<Record<string, number>> = {
  veo: 12,
  kling: 5,
  runway: 5,
  luma: 5,
}

/** Credit một lượt render video — `provider` = bên đứng đầu thứ tự thử, `null` = Ken Burns cục bộ. */
export function videoRenderCredit(provider: string | null | undefined, sceneCount: number): number {
  const base = FEATURE_COST_CREDIT["video.render"] ?? 5
  const perScene = provider ? VIDEO_CLIP_CREDIT_PER_SCENE[provider] ?? 0 : 0
  return base + perScene * Math.max(0, Math.floor(sceneCount))
}

const DEFAULT_COST_CREDIT = 1

export function costCreditForFeature(feature: string): number {
  return FEATURE_COST_CREDIT[feature] ?? DEFAULT_COST_CREDIT
}
