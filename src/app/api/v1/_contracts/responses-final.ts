import { z } from "zod"

import { productIntelligenceReportSchema } from "@/modules/creative-production/contracts/product-intelligence"

/**
 * Phản hồi nhóm cuối (OpenAPI nội bộ, PO 07/11/2026): `catalog-links`, `product-intelligence`, `internal` (cron). Sinh
 * từ kiểu TS của `catalog-links`, `creative-production/contracts/product-intelligence` và các tác vụ quét, đối chiếu mẫu
 * ghi từ phản hồi thật rồi kiểm ở `tests/tenant/internal-contract-final.test.ts`.
 */
const timestamp = z.iso.datetime()

const linkFields = {
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  filters: z.record(z.string(), z.unknown()).nullable(),
  is_revoked: z.boolean(),
  revoked_at: timestamp.nullable(),
  revoked_by: z.string().nullable(),
  created_by: z.string(),
  created_at: timestamp,
  updated_at: timestamp,
}
const link = z.strictObject(linkFields)
/** Tạo trả dòng `catalog_links` nguyên bản (thêm `organization_id`, trường thùng rác). */
export const catalogLinkCreatedResponse = z.strictObject({
  data: z.strictObject({ ...linkFields, organization_id: z.string(), trashed_at: timestamp.nullable(), purge_after: timestamp.nullable() }),
})
export const catalogLinksResponse = z.strictObject({ data: z.array(link) })
/** Không bọc `{ data }`. Công khai: link đã thu hồi hoặc mã lạ → 404. */
export const catalogLinkPublicResponse = link
export const catalogLinkResponse = link
export const catalogLinkRevokedResponse = z.strictObject({ revoked: z.literal(true) })

/** `imageUrl` ký mới mỗi lần đọc; bản dựng từ phân tích ảnh (không có lượt chạy) dùng mã ảnh làm tên sản phẩm. */
export const productIntelligenceResponse = z.strictObject({ report: productIntelligenceReportSchema })

const REDIS = z.enum(["ok", "down", "not_configured"])
/** 200 khi `ok`, 503 khi `degraded`/`down` — cùng thân. */
export const healthResponse = z.strictObject({
  status: z.enum(["ok", "degraded", "down"]),
  timestamp,
  issues: z.array(z.string()),
  database: z.strictObject({ up: z.boolean(), latencyMs: z.number().nullable() }),
  redis: REDIS,
  /** `null` khi không đếm được (CSDL không trả lời). */
  jobs: z.strictObject({ pendingTooLong: z.number(), processingTooLong: z.number() }).nullable(),
  /** Tên worker → số kết nối đang mở. */
  workers: z.record(z.string(), z.number()).optional(),
})
export const integrationsSweepResponse = z.strictObject({
  events: z.strictObject({ done: z.number(), failed: z.number(), dead: z.number() }),
  health: z.strictObject({ checked: z.number(), degraded: z.number() }),
  orders: z.strictObject({ connections: z.number(), imported: z.number() }),
  /** Bài mạng xã hội đến hạn (tối đa 20 mỗi lượt) — `recovered`: bài kẹt trạng thái đang đăng được trả lại hàng đợi. */
  social: z.strictObject({ published: z.number(), retrying: z.number(), failed: z.number(), recovered: z.number() }),
  /** Hoàn credit tác vụ AI lỗi / bị huỷ / bị Guard từ chối (tối đa 200 job mỗi lượt, checklist ALG 10.2). */
  credits: z.strictObject({ refundedJobs: z.number(), refundedCredit: z.number() }),
})
/** Mỗi tác vụ con hỏng riêng → `null`, lượt quét vẫn 200. `sentDetails`/`errors` chỉ khi có, tối đa vài dòng. */
export const dispatchSweepResponse = z.strictObject({
  ok: z.literal(true),
  processed: z.number(),
  remindersSent: z.number(),
  roundsAdvanced: z.number(),
  graceCommitted: z.number(),
  pages: z.number(),
  stuckJobsFailed: z.number().nullable(),
  storageLifecycle: z.record(z.string(), z.unknown()),
  idempotencyKeysPurged: z.number().nullable(),
  piiEncrypted: z.record(z.string(), z.number()).nullable(),
  quotationsExpired: z.number(),
  subscriptions: z.record(z.string(), z.number()),
  complete: z.boolean(),
  productProposals: z.record(z.string(), z.number()).optional(),
  /** Tin nhắc giao M1/M2 đã đẩy lượt này (checklist 4.32). */
  deliveryReminders: z.strictObject({ organizations: z.number(), pushed: z.number(), failedOrganizations: z.number() }),
  sentDetails: z.array(z.unknown()).optional(),
  errorCount: z.number(),
  errors: z.array(z.unknown()).optional(),
  sweepAt: timestamp,
})
