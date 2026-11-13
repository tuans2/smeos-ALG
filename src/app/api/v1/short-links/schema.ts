import { z } from "zod"

/** Thân yêu cầu chung cho tạo/sửa link động — kiểm nghiệp vụ ở use-case. */
export const shortLinkBodySchema = z.object({
  name: z.string().max(200).optional(),
  targetPath: z.string().max(600).optional(),
  placementLabel: z.string().max(120).nullable().optional(),
  utmSource: z.string().max(100).nullable().optional(),
  utmMedium: z.string().max(100).nullable().optional(),
  utmCampaign: z.string().max(100).nullable().optional(),
  expiresAt: z.string().max(40).nullable().optional(),
  isActive: z.boolean().optional(),
})
