/** Chặng 04 — IDEATE: 10 chủ đề / góc tiếp cận / hook của lượt phân tích (đọc lại theo id). */

import { z } from "zod"

import { defineStage } from "./define-stage"
import { productIntelligenceReportSchema } from "./product-intelligence"
import { EXAMPLE_RUN_ID, exampleReport } from "./examples-shared"

export const stage04Ideate = defineStage({
  id: "04",
  stage: 4,
  code: "IDEATE",
  slug: "ideate",
  title: "Chặng 04 — IDEATE: Sinh chủ đề, góc tiếp cận, hook",
  summary:
    "Chủ đề sinh cùng lượt Chặng 03; Creative Studio đọc lại report theo id (không truyền report qua URL). Trường IDEATE: topics[] (10) + readiness.",
  endpoint: { method: "GET", path: "/api/v1/product-intelligence/:id", capability: "V2" },
  input: z.object({ report_id: z.string().min(1).describe("product_analysis_runs.id — tham số đường dẫn :id") }),
  output: z.object({ report: productIntelligenceReportSchema }),
  examples: {
    input: { report_id: EXAMPLE_RUN_ID },
    output: { report: exampleReport },
  },
})
