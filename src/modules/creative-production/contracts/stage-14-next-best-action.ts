/** Chặng 14 — NEXT_BEST_ACTION: lát cắt `next_best_actions` của `GET /packages/:id/performance`. */

import { defineStage } from "./define-stage"
import { packageIdInputSchema } from "./common"
import { campaignPerformanceSchema } from "./campaign-package"
import { EXAMPLE_PACKAGE_ID } from "./examples-shared"
import { examplePerformance } from "./examples-package"

export const stage14NextBestAction = defineStage({
  id: "14",
  stage: 14,
  code: "NEXT_BEST_ACTION",
  slug: "next-best-action",
  title: "Chặng 14 — NEXT BEST ACTION: Đề xuất hành động kế tiếp",
  summary: "Danh sách hành động có lý do và đích (khu vực Creative Studio hoặc route).",
  endpoint: { method: "GET", path: "/api/v1/creative-production/packages/:id/performance", capability: "R1" },
  input: packageIdInputSchema,
  output: campaignPerformanceSchema.pick({ package_id: true, status: true, next_best_actions: true, computed_at: true }),
  examples: {
    input: { package_id: EXAMPLE_PACKAGE_ID },
    output: {
      package_id: examplePerformance.package_id,
      status: examplePerformance.status,
      next_best_actions: examplePerformance.next_best_actions,
      computed_at: examplePerformance.computed_at,
    },
  },
})
