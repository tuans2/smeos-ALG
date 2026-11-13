/** Chặng 11 — SELL: lát cắt `sell` của `GET /packages/:id/performance`. */

import { defineStage } from "./define-stage"
import { packageIdInputSchema } from "./common"
import { campaignPerformanceSchema } from "./campaign-package"
import { EXAMPLE_PACKAGE_ID } from "./examples-shared"
import { examplePerformance } from "./examples-package"

export const stage11Sell = defineStage({
  id: "11",
  stage: 11,
  code: "SELL",
  slug: "sell",
  title: "Chặng 11 — SELL: AI Chat Sales tư vấn chốt đơn",
  summary: "Hội thoại toàn tiệm và số đơn của sản phẩm trong gói kể từ lúc duyệt.",
  endpoint: { method: "GET", path: "/api/v1/creative-production/packages/:id/performance", capability: "R1" },
  input: packageIdInputSchema,
  output: campaignPerformanceSchema.pick({ package_id: true, status: true, sell: true }),
  examples: {
    input: { package_id: EXAMPLE_PACKAGE_ID },
    output: {
      package_id: examplePerformance.package_id,
      status: examplePerformance.status,
      sell: examplePerformance.sell,
    },
  },
})
