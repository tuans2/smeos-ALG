/** Chặng 06c — CREATE / Khu vực D: ảnh biến thể theo cảnh (job `media.variant[.cloud]`). */

import { z } from "zod"

import {
  MAX_SCENE_PROMPT_LENGTH,
  NARRATIVE_SCENE_INDEXES,
  VARIANT_CLOUD_PROVIDERS,
  VARIANT_PRESET_IDS,
  VARIANT_RATIOS,
} from "@/modules/media/domain/variant-rules"
import {
  FILL_MODES,
  LIGHT_DIRECTIONS,
  MAX_PALETTE_COLORS,
  MAX_VARIANT_SEED,
  VARIANT_PLACEMENTS,
  VARIANT_SHOTS,
  VARIANT_STYLES,
  VARIANT_QUALITIES,
  VARIANT_UPSCALES,
  COMPOSE_MODES,
} from "@/modules/media/domain/variant-direction-rules"
import { DEFAULT_VARIANT_COUNT, MAX_VARIANT_COUNT, MIN_VARIANT_COUNT } from "@/modules/media/domain/variant-candidates"
import { defineStage } from "./define-stage"
import { jobStatusSchema, usageSchema } from "./common"
import { EXAMPLE_JOB_ID } from "./examples-shared"

/** Thân `POST /api/v1/media/variants` (header `Idempotency-Key` bắt buộc). */
export const mediaVariantBodySchema = z.object({
  master_asset_id: z.string().min(1).describe("Master Image đã duyệt"),
  // PO 25/09/2026: nhà cung cấp TRƯỚC — mặc định `cloud_provider`; `local_studio`
  // chỉ khi người dùng chọn đích danh (miễn phí nhà cung cấp, chất lượng thấp hơn).
  engine: z.enum(["local_studio", "cloud_provider"]).default("cloud_provider"),
  preset: z.enum(VARIANT_PRESET_IDS),
  ratio: z.enum(VARIANT_RATIOS),
  watermark: z.boolean().default(true),
  auto_enhance: z.boolean().default(false).describe("AIC-14 — chỉ chỉnh vùng nền"),
  // min/max thay cho refine để JSON Schema hiện đúng khoảng 1..5 (refine không biểu diễn được).
  scene_index: z
    .number()
    .int()
    .min(Math.min(...NARRATIVE_SCENE_INDEXES), "scene_index 1..5")
    .max(Math.max(...NARRATIVE_SCENE_INDEXES), "scene_index 1..5")
    .optional()
    .describe("Cảnh 1..5 của kịch bản (CREATIVE 5, AUTHENTIC 3)"),
  scene_plan_id: z.string().trim().min(1).max(160).optional(),
  scene_plan_revision: z.number().int().min(1).max(100000).optional(),
  provider_key: z
    .enum(VARIANT_CLOUD_PROVIDERS)
    .optional()
    .describe("Chỉ nhánh cloud_provider — nhà cung cấp thử TRƯỚC; bỏ trống = theo VARIANT_PROVIDER_ORDER (các bên vai trò tương đương, bên lỗi thì thử bên kế tiếp)"),
  scene_prompt: z.string().max(MAX_SCENE_PROMPT_LENGTH).optional().describe("Chỉ nhánh cloud_provider — backgroundPrompt của cảnh"),
  // ── Chỉ đạo khung hình (Đợt 1 nâng cấp chất lượng ảnh, 24/09/2026) ──
  // Ý định của ALG, KHÔNG phải tên tham số của nhà cung cấp — adapter worker
  // tự dịch. Bỏ trống thì máy chủ lấy từ đúng cảnh trong kịch bản Chặng 05.
  fill_mode: z
    .enum(FILL_MODES)
    .default("full_frame")
    .describe("full_frame = hậu cảnh dựng đúng khung đích (mặc định); pad = cách cũ, đệm màu trơn"),
  composition: z
    .object({
      shot: z.enum(VARIANT_SHOTS).optional().describe("Cỡ cảnh: cận / trung / toàn — mặc định theo kịch bản, không có thì medium"),
      placement: z.enum(VARIANT_PLACEMENTS).optional().describe("Vị trí sản phẩm — mặc định center"),
    })
    .optional(),
  lighting: z
    .object({
      direction: z.enum(LIGHT_DIRECTIONS).optional().describe("Hướng nguồn sáng — quyết định hướng bóng; mặc định suy từ kịch bản, không có thì left"),
      mood: z.string().trim().max(120).optional().describe("Mô tả không khí ánh sáng (tiếng Anh) — ghép vào prompt nhà cung cấp"),
    })
    .optional(),
  palette: z
    .array(z.string().trim().min(1).max(40))
    .max(MAX_PALETTE_COLORS)
    .optional()
    .describe("Bảng màu hậu cảnh — mặc định palette của cảnh; màu tiếng Việt thông dụng tự dịch"),
  seed: z
    .number()
    .int()
    .min(0)
    .max(MAX_VARIANT_SEED)
    .optional()
    .describe("Cùng seed → tái tạo đúng hậu cảnh; bỏ trống thì tự bốc và ghi lại vào asset (nhà cung cấp hỗ trợ seed)"),
  // ── Đa dạng (Đợt 2, 25/09/2026) ──
  style: z
    .enum(VARIANT_STYLES)
    .optional()
    .describe("Phong cách hậu cảnh (ý định ALG) — Stability dịch sang style_preset; phông cục bộ ghi provider_ignored"),
  variant_count: z
    .number()
    .int()
    .min(MIN_VARIANT_COUNT)
    .max(MAX_VARIANT_COUNT)
    .default(DEFAULT_VARIANT_COUNT)
    .describe("Số phương án cho cảnh — n job con cùng job_group_id, credit nhân n. Mặc định 1 (PO chốt 24/09)"),
  // ── Chất lượng cao (Đợt 3, 25/09/2026) ──
  quality: z
    .enum(VARIANT_QUALITIES)
    .default("standard")
    .describe("high = Stability Ultra (chỉ đám mây, +2 credit/phương án — giá tạm); phông cục bộ ghi provider_ignored"),
  upscale: z
    .enum(VARIANT_UPSCALES)
    .default("none")
    .describe("2x = khung xuất gấp đôi (9:16 → 2160×3840), tăng nét HẬU CẢNH; sản phẩm không qua mô hình siêu phân giải"),
  compose_mode: z
    .enum(COMPOSE_MODES)
    .optional()
    .describe(
      "Bỏ trống = theo engine: cloud_provider → relight (NHÀ CUNG CẤP LÀM TRỌN GÓI: tách nền, dựng cảnh, chỉnh sáng, tăng nét; cổng đo hình dáng + cấu trúc + màu), local_studio → paste. paste = tự dán nguyên khối sản phẩm (giữ từng điểm ảnh); harmonize = paste + hoà bóng/độ nét cục bộ"
    ),
})

export const mediaVariantCandidateSchema = z.object({
  index: z.number().int().min(1).describe("Thứ tự phương án, 1..variant_count"),
  job_id: z.string(),
  status: jobStatusSchema,
  deduped: z.boolean(),
  cost_credit: z.number().int().min(0),
})

export const mediaVariantResultSchema = z.object({
  job_id: z.string(),
  status: jobStatusSchema.describe("Trạng thái generation_jobs lúc nhận"),
  engine: z.enum(["local_studio", "cloud_provider"]),
  deduped: z.boolean(),
  usage: usageSchema.describe("cost_credit = TỔNG mọi phương án"),
  job_group_id: z.string().nullable().describe("Nhóm các phương án; null khi variant_count = 1"),
  candidates: z.array(mediaVariantCandidateSchema).min(1).describe("Mỗi phương án một job — đọc từng job qua GET /media/variants/:id"),
})

export const stage06cMedia = defineStage({
  id: "06c",
  stage: 6,
  code: "CREATE_MEDIA",
  slug: "create-media",
  title: "Chặng 06c — CREATE · Khu vực D: Ảnh biến thể theo cảnh",
  summary:
    "Mỗi cảnh một job; qua cổng Subject Integrity. Kết quả là assets MARKETING (PENDING) có cha là Master — đọc qua GET /media/variants/:id.",
  endpoint: { method: "POST", path: "/api/v1/media/variants", capability: "I4", idempotencyKey: true },
  input: mediaVariantBodySchema,
  output: mediaVariantResultSchema,
  examples: {
    input: {
      master_asset_id: "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b",
      engine: "cloud_provider",
      preset: "wedding",
      ratio: "9:16",
      scene_index: 2,
      scene_plan_id: EXAMPLE_JOB_ID,
      scene_plan_revision: 1,
      scene_prompt: "warm bokeh restaurant table at dusk, soft candle light, empty space in the center",
      fill_mode: "full_frame",
      composition: { shot: "wide", placement: "center" },
      lighting: { direction: "right" },
      palette: ["đỏ", "kem"],
      style: "natural",
      variant_count: 2,
    },
    output: {
      job_id: "e5f6a7b8-c9d0-4e1f-8a2b-3c4d5e6f7a8c",
      status: "PENDING",
      engine: "cloud_provider",
      deduped: false,
      usage: { cost_credit: 8, balance_after: 239 },
      job_group_id: "0b1c2d3e-4f50-4617-8829-3a4b5c6d7e8f",
      candidates: [
        { index: 1, job_id: "e5f6a7b8-c9d0-4e1f-8a2b-3c4d5e6f7a8c", status: "PENDING", deduped: false, cost_credit: 4 },
        { index: 2, job_id: "f6a7b8c9-d0e1-4f2a-8b3c-4d5e6f7a8b9d", status: "PENDING", deduped: false, cost_credit: 4 },
      ],
    },
  },
})
