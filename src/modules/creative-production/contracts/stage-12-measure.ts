/** Chặng 12 — MEASURE: lát cắt `measure` của `GET /packages/:id/performance`. */

import { defineStage } from "./define-stage"
import { packageIdInputSchema } from "./common"
import { campaignPerformanceSchema } from "./campaign-package"
import { EXAMPLE_PACKAGE_ID } from "./examples-shared"
import { examplePerformance } from "./examples-package"

export const stage12Measure = defineStage({
  id: "12",
  stage: 12,
  code: "MEASURE",
  slug: "measure",
  title: "Chặng 12 — MEASURE: Đo lường hiệu quả kinh doanh",
  summary: "Đơn/doanh thu của sản phẩm (bỏ DRAFT/CANCELLED), hội thoại, số kênh từ content_metrics; null = chưa có số; caveats hiển thị nguyên văn.",
  endpoint: { method: "GET", path: "/api/v1/creative-production/packages/:id/performance", capability: "R1" },
  input: packageIdInputSchema,
  output: campaignPerformanceSchema.pick({ package_id: true, status: true, measure: true }),
  examples: {
    input: { package_id: EXAMPLE_PACKAGE_ID },
    output: {
      package_id: examplePerformance.package_id,
      status: examplePerformance.status,
      measure: examplePerformance.measure,
    },
  },
})
