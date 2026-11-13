import { log } from "@/core/observability/log"

/**
 * Cầu dao cho lời gọi ra dịch vụ ngoài (Aegis): lỗi liên tiếp đủ ngưỡng thì
 * "mở" — các lời gọi sau hỏng ngay, không dồn request treo vào một nhà cung
 * cấp đang sập; hết thời gian nghỉ cho thử lại một lần (half-open).
 * Trạng thái giữ theo tiến trình — đủ cho mục đích tự bảo vệ từng instance.
 */

export class CircuitOpenError extends Error {
  constructor(name: string) {
    super(`Dịch vụ ${name} đang tạm ngắt do lỗi liên tiếp`)
    this.name = "CircuitOpenError"
  }
}

interface BreakerState {
  failures: number
  openUntil: number
}

const states = new Map<string, BreakerState>()

export interface BreakerOptions {
  failureThreshold?: number
  cooldownMs?: number
  timeoutMs?: number
}

export async function withCircuitBreaker<T>(
  name: string,
  fn: (signal: AbortSignal) => Promise<T>,
  options: BreakerOptions = {},
  now: () => number = Date.now
): Promise<T> {
  const { failureThreshold = 5, cooldownMs = 60_000, timeoutMs = 8_000 } = options
  const state = states.get(name) ?? { failures: 0, openUntil: 0 }
  states.set(name, state)
  if (state.openUntil > now()) throw new CircuitOpenError(name)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const result = await fn(controller.signal)
    state.failures = 0
    state.openUntil = 0
    return result
  } catch (error) {
    state.failures += 1
    if (state.failures >= failureThreshold) {
      state.openUntil = now() + cooldownMs
      log.warn("circuit_breaker.open", { feature: "integrations", breaker: name, failures: state.failures })
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

/** Chỉ dùng trong test. */
export function resetCircuitBreakers(): void {
  states.clear()
}
