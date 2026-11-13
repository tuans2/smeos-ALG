import { prisma } from "@/core/tenancy/infra/prisma"

import { AI_CAPABILITIES } from "../domain/ai-capabilities"

/**
 * Nạp sổ đăng ký nền AI — đặc tả 10 mục 4, 5 và Phụ lục A.
 *
 * Idempotent: chạy lại không nhân đôi và KHÔNG ghi đè phần vận hành đã sửa.
 * Cụ thể, `accept_threshold` và `enabled` của một năng lực đã tồn tại được giữ
 * nguyên — người vận hành đặt ngưỡng sau khi đo, và một lượt seed không có
 * quyền xoá kết quả đo đó (D20).
 */
export async function seedAiCapabilities(): Promise<number> {
  let written = 0
  for (const definition of Object.values(AI_CAPABILITIES)) {
    await prisma.ai_capabilities.upsert({
      where: { code: definition.code },
      create: {
        code: definition.code,
        module: definition.module,
        kind: definition.kind,
        needs_approval: definition.needsApproval,
        privacy_floor: definition.privacyFloor,
        measure_channels: [...definition.channels],
        accept_threshold: null,
        enabled: true,
      },
      update: {
        module: definition.module,
        kind: definition.kind,
        needs_approval: definition.needsApproval,
        privacy_floor: definition.privacyFloor,
        measure_channels: [...definition.channels],
      },
    })
    written += 1
  }
  return written
}

/**
 * Ba bộ máy phân tích ảnh đang chạy thật, chuyển từ sổ trong mã
 * (`workers/vision/providers/registry.py`) sang sổ trong bảng.
 *
 * `measure_state` giữ đúng sự thật hiện tại: KHÔNG bộ nào đã đo trên bộ ảnh
 * vàng, nên không bộ nào là `SAN_XUAT`. Hệ quả có chủ đích: bộ định tuyến
 * không tự chọn bộ nào cả, và một tổ chức muốn chạy thì phải tự thu trần về
 * đúng một bộ (`H4`) — đó là D5-c, và nó chỉ đổi bằng số đo (nợ #24, #59, #61).
 *
 * Bốn ô giấy phép điền theo giấy phép công bố của từng thành phần. Ô nào chưa
 * soát được thì để rỗng và mô hình không bật — D18 không có ngoại lệ.
 *
 * 24/09/2026: hai mô hình OpenAI phục vụ thêm `AIC-18 video_storyboard` — kịch
 * bản bối cảnh theo chủ đề của Creative Studio (`creative.scene_plan`), một lượt
 * LLM văn bản. Chạy lại seed để cột `capabilities` của DB có mã này.
 * Cùng ngày: thêm `AIC-23 content_generation` — AI viết lại bài đăng ở Chặng 07.
 * 25/09/2026: thêm `AIC-37 content_strategy` — Strategist của Content Engine
 * (P27), bước dựng góc/hook/dàn ý theo kênh trước khi Writer viết bài.
 */
export async function seedVisionModels(): Promise<number> {
  const models = [
    {
      key: "openai_structured",
      display_name: "Đầy đủ",
      provider: "openai",
      mode: "API" as const,
      capabilities: ["AIC-01", "AIC-02", "AIC-03", "AIC-04", "AIC-10", "AIC-18", "AIC-23", "AIC-24", "AIC-37"],
      license: "Điều khoản thương mại của nhà cung cấp",
      commercial_use: true,
      territory: "Toàn cầu theo điều khoản nhà cung cấp",
      allowed_use: "Phân tích ảnh sản phẩm của tổ chức",
      cost_class: "cao",
      latency_class: "trung_binh",
      quality_class: "cao",
      leaves_infra: true,
      version: "1.0.0",
    },
    {
      key: "openai_direct",
      display_name: "Gọn",
      provider: "openai",
      mode: "API" as const,
      capabilities: ["AIC-01", "AIC-02", "AIC-04", "AIC-18", "AIC-23", "AIC-24", "AIC-37"],
      license: "Điều khoản thương mại của nhà cung cấp",
      commercial_use: true,
      territory: "Toàn cầu theo điều khoản nhà cung cấp",
      allowed_use: "Phân tích ảnh sản phẩm của tổ chức",
      cost_class: "trung_binh",
      latency_class: "thap",
      quality_class: "trung_binh",
      leaves_infra: true,
      version: "1.0.0",
    },
    {
      key: "claude_opus",
      display_name: "Claude Opus 5",
      provider: "anthropic",
      mode: "API" as const,
      capabilities: ["AIC-01", "AIC-04", "AIC-18", "AIC-23", "AIC-24", "AIC-37"],
      license: "Anthropic Commercial Terms of Service",
      commercial_use: true,
      territory: "Toàn cầu theo điều khoản nhà cung cấp",
      allowed_use: "Viết nội dung bán hàng, kịch bản, chấm bài, đọc ảnh sản phẩm của tổ chức",
      cost_class: "cao",
      latency_class: "trung_binh",
      quality_class: "cao",
      leaves_infra: true,
      version: "1.0.0",
      // Chưa đo trên bộ đánh giá nội dung — chỉ chạy khi nằm trong thứ tự ưu
      // tiên nhà cung cấp của tổ chức (`routing.ts#preferredModelKeys`).
      measure_state: "THU_NGHIEM" as const,
    },
    {
      key: "claude_sonnet",
      display_name: "Claude Sonnet 5",
      provider: "anthropic",
      mode: "API" as const,
      capabilities: ["AIC-01", "AIC-04", "AIC-18", "AIC-23", "AIC-24", "AIC-37"],
      license: "Anthropic Commercial Terms of Service",
      commercial_use: true,
      territory: "Toàn cầu theo điều khoản nhà cung cấp",
      allowed_use: "Viết nội dung bán hàng, kịch bản, chấm bài, đọc ảnh sản phẩm của tổ chức",
      cost_class: "trung_binh",
      latency_class: "thap",
      quality_class: "trung_binh",
      leaves_infra: true,
      version: "1.0.0",
      // Chưa đo trên bộ đánh giá nội dung — chỉ chạy khi nằm trong thứ tự ưu
      // tiên nhà cung cấp của tổ chức (`routing.ts#preferredModelKeys`).
      measure_state: "THU_NGHIEM" as const,
    },
    {
      key: "gemini_pro",
      display_name: "Gemini 2.5 Pro",
      provider: "google",
      mode: "API" as const,
      capabilities: ["AIC-01", "AIC-04", "AIC-18", "AIC-23", "AIC-24", "AIC-37"],
      license: "Gemini API Additional Terms of Service (bản trả phí)",
      commercial_use: true,
      territory: "Toàn cầu theo điều khoản nhà cung cấp",
      allowed_use: "Viết nội dung bán hàng, kịch bản, chấm bài, đọc ảnh sản phẩm của tổ chức",
      cost_class: "trung_binh",
      latency_class: "trung_binh",
      quality_class: "cao",
      leaves_infra: true,
      version: "1.0.0",
      // Chưa đo trên bộ đánh giá nội dung — chỉ chạy khi nằm trong thứ tự ưu
      // tiên nhà cung cấp của tổ chức (`routing.ts#preferredModelKeys`).
      measure_state: "THU_NGHIEM" as const,
    },
    {
      key: "gemini_flash",
      display_name: "Gemini 2.5 Flash",
      provider: "google",
      mode: "API" as const,
      capabilities: ["AIC-01", "AIC-04", "AIC-18", "AIC-23", "AIC-24", "AIC-37"],
      license: "Gemini API Additional Terms of Service (bản trả phí)",
      commercial_use: true,
      territory: "Toàn cầu theo điều khoản nhà cung cấp",
      allowed_use: "Viết nội dung bán hàng, kịch bản, chấm bài, đọc ảnh sản phẩm của tổ chức",
      cost_class: "thap",
      latency_class: "thap",
      quality_class: "trung_binh",
      leaves_infra: true,
      version: "1.0.0",
      // Chưa đo trên bộ đánh giá nội dung — chỉ chạy khi nằm trong thứ tự ưu
      // tiên nhà cung cấp của tổ chức (`routing.ts#preferredModelKeys`).
      measure_state: "THU_NGHIEM" as const,
    },
    {
      key: "local_cv",
      display_name: "Cục bộ",
      provider: "self_host",
      mode: "SELF_HOST" as const,
      capabilities: ["AIC-01", "AIC-02", "AIC-03", "AIC-07"],
      license: "SAM2 Apache-2.0 · Florence-2 MIT",
      commercial_use: true,
      territory: "Không giới hạn theo hai giấy phép trên",
      allowed_use: "Chạy tại chỗ, ảnh không rời hạ tầng",
      cost_class: "thap",
      latency_class: "cao",
      quality_class: "trung_binh",
      leaves_infra: false,
      version: "0.1.0",
    },
  ]

  for (const model of models) {
    await prisma.ai_models.upsert({
      where: { key: model.key },
      create: { ...model, measure_state: "measure_state" in model ? model.measure_state : "SAN_XUAT", enabled: true, registered_by: "seed" },
      // Không ghi đè `measure_state` lẫn `enabled`: hai cột đó là kết quả đo
      // và quyết định vận hành, không phải hằng số trong mã.
      update: {
        display_name: model.display_name,
        provider: model.provider,
        mode: model.mode,
        capabilities: model.capabilities,
        license: model.license,
        commercial_use: model.commercial_use,
        territory: model.territory,
        allowed_use: model.allowed_use,
        cost_class: model.cost_class,
        latency_class: model.latency_class,
        quality_class: model.quality_class,
        leaves_infra: model.leaves_infra,
        version: model.version,
      },
    })
  }
  return models.length
}
