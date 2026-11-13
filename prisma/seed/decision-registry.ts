import { prisma } from "../../src/core/tenancy/infra/prisma"
import { DECISION_REGISTRY_SEED } from "../../src/modules/journey/domain/decision-ownership"

/**
 * Seed 19 quyết định của Decision Registry
 * Thực hiện theo PATCH P2 mục 11.5
 */
export async function seedDecisionRegistry() {
  console.log('Seeding Decision Registry (19 standard decisions)...')

  for (const item of DECISION_REGISTRY_SEED) {
    await prisma.decision_registry.upsert({
      where: { decision_id: item.decisionId },
      update: {
        ownership: item.ownership,
        locked: item.locked,
        description: item.description,
        spec_ref: item.specRef ?? null,
      },
      create: {
        decision_id: item.decisionId,
        ownership: item.ownership,
        locked: item.locked,
        description: item.description,
        spec_ref: item.specRef ?? null,
      },
    })
  }

  console.log('✅ Successfully seeded Decision Registry.')
}

// Cho phép chạy trực tiếp qua tsx
if (require.main === module) {
  seedDecisionRegistry()
    .catch((err) => {
      console.error('Failed to seed decision registry:', err)
      process.exit(1)
    })
    .finally(() => {
      prisma.$disconnect()
    })
}
