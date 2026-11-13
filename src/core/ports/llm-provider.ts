export interface LLMRequest {
  organizationId: string;
  prompt: string;
  /** Lời nhắc hệ thống riêng của năng lực; vắng thì adapter dùng lời nhắc viết nội dung mặc định. */
  system?: string;
  /** Ảnh đi kèm (base64, không tiền tố `data:`) — mọi adapter nội dung đều nhận ảnh (25/09/2026). */
  images?: ReadonlyArray<{ mimeType: string; base64: string }>;
  jsonSchema?: unknown;
  maxTokens?: number;
  /**
   * Khoá mô hình trong sổ đăng ký (`ai_models.key`) mà bộ định tuyến của
   * cổng AI đã chọn cho lượt gọi này. Adapter dịch khoá sang mã mô hình của
   * nhà cung cấp. Bỏ trường này là bộ định tuyến chọn một đằng còn adapter
   * gọi một nẻo, và `ai_requests` ghi lại một quyết định chưa từng xảy ra
   * (D15, D17).
   */
  model?: string;
  /**
   * Thời hạn chờ nhà cung cấp, mili-giây. Hết hạn thì lượt gọi hỏng (ném
   * lỗi) để cổng AI chuyển mô hình dự phòng, thay vì giữ request/job treo vô
   * hạn. Vắng thì adapter dùng mặc định của nó.
   */
  timeoutMs?: number;
}

export interface LLMResponse {
  text: string;
  model: string;
  modelVersion: string;
  costUsd?: number;
  /** Số token thật của lượt gọi — `ai_requests` ghi lại để đối soát. */
  inputTokens?: number;
  outputTokens?: number;
}

export interface LLMProvider {
  readonly name: string;
  complete(request: LLMRequest): Promise<LLMResponse>;
}
