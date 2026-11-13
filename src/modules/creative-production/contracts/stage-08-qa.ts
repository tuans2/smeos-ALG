/** Chặng 08 — QA: sáu trục kiểm định trên dữ liệu thật phía máy chủ (`evaluateCampaignQa`). */

import { defineStage } from "./define-stage"
import { packageIdInputSchema } from "./common"
import { campaignPackageViewSchema } from "./campaign-package"
import { EXAMPLE_PACKAGE_ID } from "./examples-shared"
import { examplePackageQa } from "./examples-package"

export const stage08Qa = defineStage({
  id: "08",
  stage: 8,
  code: "QA",
  slug: "qa",
  title: "Chặng 08 — QA: Kiểm tra Thương hiệu / Sản phẩm / Nội dung / Kênh",
  summary:
    "Trục: product_integrity, approvals, platform_specs, content, brand, plan_consistency. Kết quả đổi status: QA_PASSED | QA_NEEDS_REVIEW | QA_REJECTED.",
  endpoint: { method: "POST", path: "/api/v1/creative-production/packages/:id/qa", capability: "I1" },
  input: packageIdInputSchema,
  output: campaignPackageViewSchema,
  examples: { input: { package_id: EXAMPLE_PACKAGE_ID }, output: examplePackageQa },
})
