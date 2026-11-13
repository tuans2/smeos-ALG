/** Chặng 10 — LAUNCH: kế hoạch đăng + mã bài đã đăng bên Lịch đăng (SocialFlow M07). */

import { defineStage } from "./define-stage"
import { packageIdInputSchema } from "./common"
import { campaignPackageViewSchema, launchPlanBodySchema } from "./campaign-package"
import { EXAMPLE_PACKAGE_ID } from "./examples-shared"
import { examplePackageLaunched } from "./examples-package"

export const stage10Launch = defineStage({
  id: "10",
  stage: 10,
  code: "LAUNCH",
  slug: "launch",
  title: "Chặng 10 — LAUNCH: Đăng tải / lên lịch đa kênh",
  summary: "Gói phải APPROVED. post_refs khớp content_metrics.content_id để Chặng 12 đọc số thật; việc đăng thực hiện ở Lịch đăng.",
  endpoint: { method: "PUT", path: "/api/v1/creative-production/packages/:id/launch", capability: "J5" },
  input: packageIdInputSchema.extend(launchPlanBodySchema.shape),
  output: campaignPackageViewSchema,
  examples: {
    input: {
      package_id: EXAMPLE_PACKAGE_ID,
      channels: ["tiktok"],
      scheduled_at: "2026-09-25T12:00:00.000Z",
      post_refs: [{ platform: "tiktok", content_id: "sf-post-8812" }],
    },
    output: examplePackageLaunched,
  },
})
