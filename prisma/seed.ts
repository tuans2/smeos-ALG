import { prisma } from "../src/core/tenancy/infra/prisma"
import {
  seedAiCapabilities,
  seedVisionModels,
} from "../src/core/ai/infra/seed-ai-registry"
import { ensureSystemRoles } from "../src/modules/organization/use-cases/ensure-system-roles"
import { devSeedEnabled } from "./seed/dev-seed-policy"

/**
 * Nạp bốn vai hệ thống và sổ đăng ký nền AI. Chạy bằng `npm run db:seed`, sau
 * `prisma db push`.
 *
 * Vai hệ thống mang `organization_id = null` và dùng chung cho mọi tổ chức
 * (đặc tả 07 mục 3). Năng lực gắn vào vai thuộc P2.
 *
 * Sổ đăng ký nền AI (`ai_capabilities`, `ai_models`) là dữ liệu cấp nền tảng,
 * cũng không mang `organization_id` — đợt AI-1, đặc tả 10 mục 4 và 5.
 */
async function main(): Promise<void> {
  await ensureSystemRoles()
  const roles = await prisma.roles.findMany({ where: { organization_id: null } })
  console.log(`Vai hệ thống: ${roles.map((role) => role.key).join(", ")}`)

  const capabilities = await seedAiCapabilities()
  const models = await seedVisionModels()
  console.log(`Sổ đăng ký nền AI: ${capabilities} năng lực, ${models} mô hình`)

  const { seedDecisionRegistry } = await import("./seed/decision-registry")
  await seedDecisionRegistry()

}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
