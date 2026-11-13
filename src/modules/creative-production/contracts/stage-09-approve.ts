/** Chặng 09 — APPROVE: chủ tiệm chốt duyệt (ghi `audit_logs` cùng giao dịch). */

import { z } from "zod"

import { defineStage } from "./define-stage"
import { packageIdInputSchema } from "./common"
import { campaignPackageViewSchema } from "./campaign-package"
import { EXAMPLE_PACKAGE_ID } from "./examples-shared"
import { examplePackageApproved } from "./examples-package"

/** Thân `POST /packages/:id/approve`. */
export const approveBodySchema = z.object({
  acknowledge_warnings: z.boolean().default(false).describe("Bắt buộc true khi gói ở QA_NEEDS_REVIEW"),
})

export const stage09Approve = defineStage({
  id: "09",
  stage: 9,
  code: "APPROVE",
  slug: "approve",
  title: "Chặng 09 — APPROVE: Chủ tiệm chốt duyệt",
  summary: "Chỉ duyệt gói đã chạy QA; QA_REJECTED không duyệt được; QA_NEEDS_REVIEW cần xác nhận đã xem cảnh báo.",
  endpoint: { method: "POST", path: "/api/v1/creative-production/packages/:id/approve", capability: "J5" },
  input: packageIdInputSchema.extend(approveBodySchema.shape),
  output: campaignPackageViewSchema,
  examples: {
    input: { package_id: EXAMPLE_PACKAGE_ID, acknowledge_warnings: false },
    output: examplePackageApproved,
  },
})
