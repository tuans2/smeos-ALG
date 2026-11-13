import { aiCapability } from "@/core/ai/domain/ai-capabilities"
import type { IAiPolicyRepository, IAiRegistryRepository } from "@/core/ai/domain/ai-repository.interface"
import { getAiPolicyRepository } from "@/core/ai/infra/ai-policy-repository"
import { getAiRegistryRepository } from "@/core/ai/infra/ai-registry-repository"
import { AppError, validationFailed } from "@/core/http/errors"
import { hasCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import {
  requiresVisionEngineCapability,
  validateAiPolicyInput,
  type AiPolicyInput,
} from "@/modules/ai-governance/domain/policy-rules"

import { getAiPolicy, type AiPolicyView } from "./get-ai-policy"

/**
 * `PUT /ai-policy` (`U2`, đặc tả 06 mục 18).
 *
 * Ghi TRẦN, không ghi một lựa chọn: `allowed_models` là phạm vi mà bộ định
 * tuyến được chọn trong đó (D17 ràng buộc 2).
 *
 * Đổi `AIC-01` đòi thêm `H4` — nó đã có đường ghi riêng cùng một màn hình nói
 * rõ bộ nào đã đo và bộ nào gửi ảnh ra ngoài; mở cửa thứ hai mà không đòi cùng
 * năng lực là mở một cửa không có lời cảnh báo nào.
 *
 * Mỗi lần đổi ghi `audit_logs`: chính sách AI quyết định mô hình nào chạy cho
 * MỌI lượt về sau của cả tổ chức, nên nó cùng loại hệ quả với `H4` và `S4`.
 */
export async function putAiPolicy(
  ctx: TenantContext,
  input: AiPolicyInput,
  registryRepo: IAiRegistryRepository = getAiRegistryRepository(),
  policyRepo: IAiPolicyRepository = getAiPolicyRepository()
): Promise<{ capabilities: AiPolicyView[] }> {
  if (requiresVisionEngineCapability(input.capability_code) && !hasCapability(ctx, "H4")) {
    throw new AppError(
      "CAPABILITY_DENIED",
      "Đổi bộ máy phân tích ảnh cần năng lực H4, không chỉ U2"
    )
  }

  const models = await registryRepo.eligibleModels()
  const errors = validateAiPolicyInput(
    input,
    models.map((model) => model.key)
  )
  if (Object.keys(errors).length > 0) throw validationFailed(errors)

  const capability = aiCapability(input.capability_code)
  const before = await policyRepo.find(ctx, capability.code)

  const saved = await policyRepo.upsert(ctx, {
    capability_code: capability.code,
    allowed_models: input.allowed_models,
    quality_target: input.quality_target ?? null,
    cost_ceiling: input.cost_ceiling ?? null,
    privacy_floor: input.privacy_floor,
  })

  await recordAuditLog(ctx, {
    action: "ai.policy.change",
    entityType: "ai_policies",
    entityId: saved.id,
    before: before
      ? {
          allowed_models: before.allowed_models,
          privacy_floor: before.privacy_floor,
          quality_target: before.quality_target,
          cost_ceiling: before.cost_ceiling,
        }
      : null,
    after: {
      capability_code: capability.code,
      allowed_models: input.allowed_models,
      privacy_floor: input.privacy_floor,
      quality_target: input.quality_target ?? null,
      cost_ceiling: input.cost_ceiling ?? null,
    },
  })

  return getAiPolicy(ctx, registryRepo, policyRepo)
}
