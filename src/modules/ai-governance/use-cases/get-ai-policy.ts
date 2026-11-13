import { AI_CAPABILITIES, type AiCapabilityDefinition } from "@/core/ai/domain/ai-capabilities"
import type { IAiPolicyRepository } from "@/core/ai/domain/ai-repository.interface"
import type { IAiRegistryRepository } from "@/core/ai/domain/ai-repository.interface"
import { getAiPolicyRepository } from "@/core/ai/infra/ai-policy-repository"
import { getAiRegistryRepository } from "@/core/ai/infra/ai-registry-repository"
import type { TenantContext } from "@/core/tenancy"

export type AiPolicyView = {
  capability_code: string
  capability_name: string
  module: string
  kind: AiCapabilityDefinition["kind"]
  needs_approval: boolean
  /** Trần đang đặt. Rỗng nghĩa là chưa siết: mọi mô hình đủ điều kiện đều được. */
  allowed_models: Array<{
    key: string
    display_name: string
    measure_state: string
    leaves_infra: boolean
    cost_class: string
    quality_class: string
  }>
  privacy_floor: string
  quality_target: string | null
  cost_ceiling: number | null
  accept_threshold: number | null
  measure_channels: string[]
  /** Đổi năng lực này còn đòi thêm `H4` ngoài `U2`. */
  requires_vision_engine_capability: boolean
}

/**
 * `GET /ai-policy` (`U1`, đặc tả 06 mục 18).
 *
 * Trả về mọi năng lực đang bật, kèm trần của tổ chức nếu đã đặt. Mỗi mô hình
 * mang theo `measure_state` và `leaves_infra` vì cả hai là điều người chọn phải
 * biết TRƯỚC khi chọn — bày ba lựa chọn trông ngang nhau là nói dối bằng bố cục
 * (đặc tả 03 mục 6.1 và 6.2).
 */
export async function getAiPolicy(
  ctx: TenantContext,
  registryRepo: IAiRegistryRepository = getAiRegistryRepository(),
  policyRepo: IAiPolicyRepository = getAiPolicyRepository()
): Promise<{ capabilities: AiPolicyView[] }> {
  const [rows, models, policies] = await Promise.all([
    registryRepo.capabilities(),
    registryRepo.eligibleModels(),
    policyRepo.list(ctx),
  ])

  const byCode = new Map(policies.map((policy) => [policy.capability_code, policy]))
  const modelByKey = new Map(models.map((model) => [model.key, model]))

  const capabilities = rows.flatMap<AiPolicyView>((row) => {
    const definition = AI_CAPABILITIES[row.code]
    if (!definition) return []

    const policy = byCode.get(row.code)
    const ceiling = Array.isArray(policy?.allowed_models) ? (policy.allowed_models as string[]) : []
    const keys =
      ceiling.length > 0
        ? ceiling
        : models.filter((model) => model.capabilities as unknown as string[]).map((m) => m.key)

    return [
      {
        capability_code: row.code,
        capability_name: definition.name,
        module: definition.module,
        kind: definition.kind,
        needs_approval: row.needs_approval,
        allowed_models: keys.flatMap((key) => {
          const model = modelByKey.get(key)
          if (!model) return []
          const serves =
            Array.isArray(model.capabilities) &&
            ((model.capabilities as string[]).includes(row.code) ||
              (model.capabilities as string[]).includes(definition.name))
          if (!serves) return []
          return [
            {
              key: model.key,
              display_name: model.display_name,
              measure_state: model.measure_state,
              leaves_infra: model.leaves_infra,
              cost_class: model.cost_class,
              quality_class: model.quality_class,
            },
          ]
        }),
        privacy_floor: policy?.privacy_floor ?? row.privacy_floor,
        quality_target: (policy?.quality_target as string | null | undefined) ?? null,
        cost_ceiling: (policy?.cost_ceiling as number | null | undefined) ?? null,
        accept_threshold: row.accept_threshold,
        measure_channels: Array.isArray(row.measure_channels)
          ? (row.measure_channels as string[])
          : [],
        requires_vision_engine_capability: row.code === "AIC-01",
      },
    ]
  })

  return { capabilities }
}
