/**
 * Hợp đồng dữ liệu Creative Studio — khối dùng chung (24/09/2026).
 *
 * NGUỒN CHUẨN của input/output 14 chặng là zod trong thư mục này (quyết định
 * PO 24/09/2026). Tệp JSON Schema ở `docs/dac-ta/schemas/creative-studio/`
 * được SINH từ đây bằng `npm run gen:schemas:creative` — không sửa tay tệp
 * `.json`; test `stage-contracts.test.ts` chặn khi tệp cũ hơn mã.
 *
 * Chỉ import hằng số từ `domain/` thuần — không Prisma, không hạ tầng.
 */

import { z } from "zod"

import { CAMPAIGN_PACKAGE_STATUSES, PACKAGE_CHANNELS } from "../domain/campaign-package-rules"

export const productionModeSchema = z
  .enum(["CREATIVE", "AUTHENTIC"])
  .describe("Loại hình sản xuất: CREATIVE (AI dựng bối cảnh mới, 5 cảnh) hoặc AUTHENTIC (giữ ảnh gốc, 3 cảnh)")

export const packageChannelSchema = z.enum(PACKAGE_CHANNELS).describe("Kênh bài đăng của gói chiến dịch")

export const campaignPackageStatusSchema = z.enum(CAMPAIGN_PACKAGE_STATUSES)

export const jobStatusSchema = z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"])

export const approvalStateSchema = z.enum(["PENDING", "APPROVED", "REJECTED"])

/** Thời điểm ISO-8601 (UTC) do máy chủ ghi — `Date.toISOString()`. */
export const isoDateTimeSchema = z.string().describe("Thời điểm ISO-8601, vd. 2026-09-24T08:00:00.000Z")

/** Một bài đăng theo kênh — giới hạn độ dài thật theo kênh kiểm ở QA (Chặng 08). */
export const packagePostSchema = z.object({
  channel: packageChannelSchema,
  text: z.string().max(70000),
  hashtags: z.array(z.string().max(100)).max(60).default([]),
})

export const packagePostsSchema = z
  .array(packagePostSchema)
  .max(PACKAGE_CHANNELS.length)
  .refine((posts) => new Set(posts.map((p) => p.channel)).size === posts.length, "Mỗi kênh một bài")
  .describe("Tối đa một bài cho mỗi kênh")

/** Ảnh chụp chủ đề lưu trong gói (Chặng 07) — chiều so sánh của Chặng 13. */
export const topicSnapshotSchema = z.object({
  id: z.string().min(1).max(200),
  title: z.string().max(500),
  angleCategory: z.string().max(50).optional(),
  hook: z.string().max(1000).optional(),
  cta: z.string().max(1000).optional(),
  scene2Preset: z.string().max(50).optional(),
  /** Kịch bản sản xuất tổng (Chặng 05) của gói — QA trục "đồng nhất kịch bản". */
  scenePlanId: z.string().max(160).optional(),
  scenePlanRevision: z.number().int().min(1).optional(),
})

/** Credit của một lượt tạo job. `balance_after = null` khi lượt dùng thử/không trừ. */
export const usageSchema = z.object({
  cost_credit: z.number(),
  balance_after: z.number().nullable(),
})

/** Tham số đường dẫn `:id` của gói chiến dịch (Chặng 08–14). */
export const packageIdInputSchema = z.object({
  package_id: z.string().min(1).describe("campaign_packages.id — tham số đường dẫn :id"),
})
