/**
 * Cổng AI — đặc tả 10 mục 3 và 6.1, quyết định D15 và D16.
 *
 * Mọi lời gọi AI đi qua đây: giải năng lực → kiểm chính sách → chọn mô hình →
 * gọi adapter → chấm điểm → ghi sổ. Không route, use-case, agent hay script
 * nào gọi thẳng SDK nhà cung cấp (`YC-G3`).
 *
 * Cổng KHÔNG import Prisma. Nó nhận bốn hàm phụ thuộc, và `wiring.ts` nối
 * chúng vào repository thật — cùng lý do `domain/` không import hạ tầng: năm
 * ràng buộc của D17 và luật thác nghiệm phải có test khoá mà không cần cơ sở
 * dữ liệu.
 *
 * Cổng cũng KHÔNG biết cách gọi từng nhà cung cấp. Người gọi truyền vào `run`,
 * và cổng quyết định `run` chạy với MÔ HÌNH NÀO, chạy mấy lần, và kết quả có
 * đủ điểm để đi tiếp hay không. Ba adapter Vision hiện nằm ở worker Python nên
 * không có sổ đăng ký adapter phía TypeScript nào bao được cả hai bên.
 */
import type { AiCapabilityDefinition, AiPrivacyLevel } from "./domain/ai-capabilities"
import { aiCapability } from "./domain/ai-capabilities"
import { evaluateOutput, type ChannelScores } from "./domain/evaluation"
import {
  nextEscalation,
  nextFallback,
  selectModel,
  type AiClass,
  type AiModelCandidate,
  type AiPolicy,
} from "./domain/routing"

export interface AiCallRequest {
  /** Mã `AIC-xx` hoặc tên đọc được, ví dụ `"content_generation"`. */
  readonly capability: string
  /** Suy từ LOẠI DỮ LIỆU đi vào, không nhận từ client. */
  readonly privacy?: AiPrivacyLevel | undefined
  readonly qualityTarget?: AiClass | undefined
  /** Mô hình đã chốt vào `payload` của job — ràng buộc 3 của D17. */
  readonly pinnedModelKey?: string | undefined
  readonly jobId?: string | null | undefined
  /** Bản ghi nghiệp vụ mà điểm chấm gắn vào, nếu đã có. */
  readonly entity?: { readonly type: string; readonly id: string } | undefined
  readonly source?: "CORE" | "LOCALBUDD" | "SOCIALFLOW" | undefined
  readonly maxAttempts?: number | undefined
  /** Thứ tự nhà cung cấp tổ chức ưu tiên — xem `AiRoutingRequest.preferredModelKeys`. */
  readonly preferredModelKeys?: readonly string[] | undefined
}

export type AdapterOutcome<O> =
  | {
      readonly ok: true
      readonly output: O
      /** Một khoá cho mỗi kênh đã khai ở sổ đăng ký năng lực. */
      readonly scores?: ChannelScores
      readonly costUsd?: number
      readonly latencyMs?: number
      readonly inputTokens?: number
      readonly outputTokens?: number
      readonly imageCount?: number
      readonly durationSeconds?: number
      readonly gpuSeconds?: number
    }
  | { readonly ok: false; readonly message: string }

export type AdapterRun<O> = (model: AiModelCandidate) => Promise<AdapterOutcome<O>>

export interface AiAttempt {
  readonly model: string
  readonly outcome: "ACCEPTED" | "ESCALATED" | "FAILED" | "NEEDS_REVIEW"
  readonly latencyMs?: number | undefined
  readonly costUsd?: number | undefined
}

export type AiCallResult<O> =
  | {
      readonly kind: "xong"
      readonly output: O
      readonly model: AiModelCandidate
      readonly attempts: readonly AiAttempt[]
      readonly evaluation: {
        readonly scores: ChannelScores
        readonly overall: number
        readonly thresholdUsed: number | null
        readonly needsReview: boolean
        readonly reason: string | null
      }
    }
  | {
      readonly kind: "khong_chay_duoc"
      readonly reason: string
      readonly attempts: readonly AiAttempt[]
    }

export interface AiGatewayDeps {
  /** Chính sách của tổ chức cho một năng lực. Chưa đặt thì trần rỗng. */
  readonly policyFor: (capabilityCode: string) => Promise<AiPolicy>
  /** Mô hình đã bật VÀ đủ bốn ô giấy phép (D18). */
  readonly eligibleModels: () => Promise<readonly AiModelCandidate[]>
  /** Ngưỡng chấp nhận; `null` = chưa đo được (D20) → chấm, ghi, không chặn. */
  readonly thresholdFor: (capabilityCode: string) => Promise<number | null>
  readonly recordRequest: (row: {
    capability_code: string
    model_key: string
    outcome: AiAttempt["outcome"]
    source: "CORE" | "LOCALBUDD" | "SOCIALFLOW"
    attempt: number
    escalated_from?: string | null
    fallback_from?: string | null
    job_id?: string | null
    cost_usd?: number | null
    latency_ms?: number | null
    quality_score?: number | null
    input_tokens?: number | null
    output_tokens?: number | null
    image_count?: number | null
    duration_seconds?: number | null
    gpu_seconds?: number | null
  }) => Promise<void>
  readonly recordEvaluation: (row: {
    capability_code: string
    entity_type: string
    entity_id: string
    scores: Record<string, number>
    overall_score: number
    threshold_used: number | null
    needs_review: boolean
    reason: string | null
  }) => Promise<void>
}

/**
 * Chạy một năng lực.
 *
 * Thác nghiệm chỉ LEO LÊN (`YC-G10`); chuỗi dự phòng chỉ đổi nhà cung cấp và
 * không vượt sàn quyền riêng tư (`YC-G11`). Hết đường thì trả
 * `khong_chay_duoc` — người gọi chuyển job sang `FAILED` và hoàn credit theo
 * D3-b. Cổng không tự quyết việc hoàn credit: đó là việc của `usage`.
 */
export async function callCapability<O>(
  request: AiCallRequest,
  run: AdapterRun<O>,
  deps: AiGatewayDeps
): Promise<AiCallResult<O>> {
  const capability: AiCapabilityDefinition = aiCapability(request.capability)
  const source = request.source ?? "CORE"
  const maxAttempts = Math.max(1, Math.min(request.maxAttempts ?? 3, 5))
  const attempts: AiAttempt[] = []

  if (capability.kind === "deterministic") {
    throw new Error(
      `Năng lực ${capability.code} là tất định — chạy thẳng đường mã, không gọi cổng AI`
    )
  }

  const [policy, models, threshold] = await Promise.all([
    deps.policyFor(capability.code),
    deps.eligibleModels(),
    deps.thresholdFor(capability.code),
  ])

  const routingRequest = {
    capability,
    privacy: request.privacy,
    qualityTarget: request.qualityTarget,
    pinnedModelKey: request.pinnedModelKey,
    // Thác nghiệm chỉ có nghĩa khi có ngưỡng để phát hiện kết quả chưa đủ —
    // xem `AiRoutingRequest.cascade`. Chưa đo được ngưỡng (D20) thì chạy lớp
    // chất lượng cao nhất ngay từ lượt đầu.
    cascade: threshold !== null && !(request.preferredModelKeys?.length),
    preferredModelKeys: request.preferredModelKeys,
  }

  const first = selectModel(models, policy, routingRequest)
  if (first.kind === "tu_choi") {
    return { kind: "khong_chay_duoc", reason: first.reason, attempts }
  }

  let current: AiModelCandidate | null = first.model
  let escalatedFrom: string | null = null
  let fallbackFrom: string | null = null
  const tried: string[] = []

  for (let attempt = 1; current && attempt <= maxAttempts; attempt += 1) {
    const model: AiModelCandidate = current
    tried.push(model.key)
    const outcome = await run(model)

    if (!outcome.ok) {
      attempts.push({ model: model.key, outcome: "FAILED" })
      await deps.recordRequest({
        capability_code: capability.code,
        model_key: model.key,
        outcome: "FAILED",
        source,
        attempt,
        escalated_from: escalatedFrom,
        fallback_from: fallbackFrom,
        job_id: request.jobId ?? null,
      })
      const next = nextFallback(model, models, policy, routingRequest, tried)
      fallbackFrom = model.key
      escalatedFrom = null
      current = next
      continue
    }

    const evaluation = evaluateOutput(capability, outcome.scores ?? {}, threshold)

    if (evaluation.kind === "khong_hop_le") {
      // Thiếu kênh chấm là lỗi PHÉP ĐO, không phải kết quả xấu (`YC-E10`) —
      // nên không leo thác, mà đẩy sang người soát kèm lý do.
      attempts.push({
        model: model.key,
        outcome: "NEEDS_REVIEW",
        latencyMs: outcome.latencyMs,
        costUsd: outcome.costUsd,
      })
      await deps.recordRequest({
        capability_code: capability.code,
        model_key: model.key,
        outcome: "NEEDS_REVIEW",
        source,
        attempt,
        escalated_from: escalatedFrom,
        fallback_from: fallbackFrom,
        job_id: request.jobId ?? null,
        cost_usd: outcome.costUsd ?? null,
        latency_ms: outcome.latencyMs ?? null,
        input_tokens: outcome.inputTokens ?? null,
        output_tokens: outcome.outputTokens ?? null,
        image_count: outcome.imageCount ?? null,
        duration_seconds: outcome.durationSeconds ?? null,
        gpu_seconds: outcome.gpuSeconds ?? null,
      })
      const reason = `thieu_kenh_cham:${evaluation.missingChannels.join(",")}`
      if (request.entity) {
        await deps.recordEvaluation({
          capability_code: capability.code,
          entity_type: request.entity.type,
          entity_id: request.entity.id,
          scores: { ...(outcome.scores ?? {}) },
          overall_score: 0,
          threshold_used: threshold,
          needs_review: true,
          reason,
        })
      }
      return {
        kind: "xong",
        output: outcome.output,
        model,
        attempts,
        evaluation: {
          scores: outcome.scores ?? {},
          overall: 0,
          thresholdUsed: threshold,
          needsReview: true,
          reason,
        },
      }
    }

    const escalation =
      evaluation.needsReview && attempt < maxAttempts
        ? nextEscalation(model, models, policy, routingRequest)
        : null

    if (escalation) {
      attempts.push({
        model: model.key,
        outcome: "ESCALATED",
        latencyMs: outcome.latencyMs,
        costUsd: outcome.costUsd,
      })
      await deps.recordRequest({
        capability_code: capability.code,
        model_key: model.key,
        outcome: "ESCALATED",
        source,
        attempt,
        escalated_from: escalatedFrom,
        fallback_from: fallbackFrom,
        job_id: request.jobId ?? null,
        cost_usd: outcome.costUsd ?? null,
        latency_ms: outcome.latencyMs ?? null,
        quality_score: evaluation.overall,
      })
      escalatedFrom = model.key
      fallbackFrom = null
      current = escalation
      continue
    }

    const finalOutcome: AiAttempt["outcome"] = evaluation.needsReview
      ? "NEEDS_REVIEW"
      : "ACCEPTED"
    attempts.push({
      model: model.key,
      outcome: finalOutcome,
      latencyMs: outcome.latencyMs,
      costUsd: outcome.costUsd,
    })
    await deps.recordRequest({
      capability_code: capability.code,
      model_key: model.key,
      outcome: finalOutcome,
      source,
      attempt,
      escalated_from: escalatedFrom,
      fallback_from: fallbackFrom,
      job_id: request.jobId ?? null,
      cost_usd: outcome.costUsd ?? null,
      latency_ms: outcome.latencyMs ?? null,
      quality_score: evaluation.overall,
      input_tokens: outcome.inputTokens ?? null,
      output_tokens: outcome.outputTokens ?? null,
      image_count: outcome.imageCount ?? null,
      duration_seconds: outcome.durationSeconds ?? null,
      gpu_seconds: outcome.gpuSeconds ?? null,
    })

    if (request.entity) {
      await deps.recordEvaluation({
        capability_code: capability.code,
        entity_type: request.entity.type,
        entity_id: request.entity.id,
        scores: { ...(outcome.scores ?? {}) },
        overall_score: evaluation.overall,
        threshold_used: evaluation.thresholdUsed,
        needs_review: evaluation.needsReview,
        reason: evaluation.reason,
      })
    }

    return {
      kind: "xong",
      output: outcome.output,
      model,
      attempts,
      evaluation: {
        scores: outcome.scores ?? {},
        overall: evaluation.overall,
        thresholdUsed: evaluation.thresholdUsed,
        needsReview: evaluation.needsReview,
        reason: evaluation.reason,
      },
    }
  }

  return { kind: "khong_chay_duoc", reason: "HET_DUONG_DU_PHONG", attempts }
}
