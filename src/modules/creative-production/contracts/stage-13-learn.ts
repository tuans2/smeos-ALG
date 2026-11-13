/** Chặng 13 — LEARN: lát cắt `learn` của `GET /packages/:id/performance`. */

import { defineStage } from "./define-stage"
import { packageIdInputSchema } from "./common"
import { campaignPerformanceSchema } from "./campaign-package"
import { EXAMPLE_PACKAGE_ID } from "./examples-shared"
import { examplePerformance } from "./examples-package"

export const stage13Learn = defineStage({
  id: "13",
  stage: 13,
  code: "LEARN",
  slug: "learn",
  title: "Chặng 13 — LEARN: Trích xuất mẫu thắng (Winning Patterns)",
  summary: "So trên các gói đã duyệt của chính tiệm; dưới 3 gói có số đo thì trả INSUFFICIENT_DATA, không bịa mẫu.",
  endpoint: { method: "GET", path: "/api/v1/creative-production/packages/:id/performance", capability: "R1" },
  input: packageIdInputSchema,
  output: campaignPerformanceSchema.pick({ package_id: true, status: true, learn: true }),
  examples: {
    input: { package_id: EXAMPLE_PACKAGE_ID },
    output: {
      package_id: examplePerformance.package_id,
      status: examplePerformance.status,
      learn: examplePerformance.learn,
    },
  },
})
