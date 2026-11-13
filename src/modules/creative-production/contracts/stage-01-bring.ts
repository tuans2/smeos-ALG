/** Chặng 01 — BRING: đăng ký ảnh gốc đã tải lên kho (`assets`, kind ORIGINAL). */

import { z } from "zod"

import { defineStage } from "./define-stage"
import { approvalStateSchema, isoDateTimeSchema } from "./common"

export const ASSET_KINDS = [
  "ORIGINAL",
  "ANALYZED",
  "ENHANCED",
  "MASTER",
  "MARKETING",
  "CATALOG",
  "LANDING",
  "SOCIAL",
] as const

/** Thân `POST /api/v1/assets` — sau khi `PUT` byte ảnh lên `upload_url` của `POST /assets/upload-url`. */
export const registerAssetBodySchema = z.object({
  asset_id: z.string().min(1).describe("asset_id do POST /assets/upload-url cấp"),
  product_id: z.string().nullish(),
  parent_asset_id: z.string().nullish(),
  kind: z.enum(ASSET_KINDS),
  storage_key: z.string().min(1).describe("org/<organization_id>/<product_id|unfiled>/<asset_id>.<ext>"),
  mime_type: z.string().min(1),
  width: z.number().int().positive().nullish(),
  height: z.number().int().positive().nullish(),
  aspect_ratio: z.string().nullish(),
  file_size: z.number().int().positive().nullish(),
  provider: z.string().nullish(),
  model: z.string().nullish(),
  model_version: z.string().nullish(),
  pipeline_version: z.string().nullish(),
  parameters: z.record(z.string(), z.unknown()).nullish(),
  prompt: z.string().nullish(),
  output_sha256: z.string().nullish(),
  quality_score: z.number().nullish(),
  identity_score: z.number().nullish(),
  generated_flags: z.record(z.string(), z.unknown()).nullish(),
  cost_usd: z.number().nullish(),
})

/** Bản ghi `assets` như API trả. Cột phụ khác của bảng được giữ nguyên (looseObject). */
export const assetRecordSchema = z.looseObject({
  id: z.string(),
  organization_id: z.string(),
  product_id: z.string().nullable(),
  parent_asset_id: z.string().nullable(),
  kind: z.enum([...ASSET_KINDS, "VIDEO", "RATIO"]),
  state: z.enum(["PROCESSING", "READY", "FAILED", "ARCHIVED"]),
  version: z.number().int(),
  storage_key: z.string(),
  mime_type: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  aspect_ratio: z.string().nullable(),
  file_size: z.number().int().nullable(),
  approval_state: approvalStateSchema,
  created_at: isoDateTimeSchema,
})

export const stage01Bring = defineStage({
  id: "01",
  stage: 1,
  code: "BRING",
  slug: "bring",
  title: "Chặng 01 — BRING: Tải ảnh sản phẩm vào kho",
  summary:
    "Xin URL (POST /assets/upload-url) → PUT byte ảnh → đăng ký asset ORIGINAL. Từ đây mọi chặng chỉ mang asset_id, không mang ảnh.",
  endpoint: { method: "POST", path: "/api/v1/assets", capability: "G2" },
  input: registerAssetBodySchema,
  output: z.object({ asset: assetRecordSchema }),
  examples: {
    input: {
      asset_id: "3f1c9a52-7d7e-4b8e-9d7a-1a2b3c4d5e6f",
      product_id: null,
      kind: "ORIGINAL",
      storage_key: "org/0b6f.../unfiled/3f1c9a52-7d7e-4b8e-9d7a-1a2b3c4d5e6f.jpg",
      mime_type: "image/jpeg",
      file_size: 482113,
    },
    output: {
      asset: {
        id: "3f1c9a52-7d7e-4b8e-9d7a-1a2b3c4d5e6f",
        organization_id: "0b6f2c1e-0000-4000-8000-000000000001",
        product_id: null,
        parent_asset_id: null,
        kind: "ORIGINAL",
        state: "READY",
        version: 1,
        storage_key: "org/0b6f.../unfiled/3f1c9a52-7d7e-4b8e-9d7a-1a2b3c4d5e6f.jpg",
        mime_type: "image/jpeg",
        width: null,
        height: null,
        aspect_ratio: null,
        file_size: 482113,
        approval_state: "PENDING",
        created_at: "2026-09-24T08:00:00.000Z",
      },
    },
  },
})
