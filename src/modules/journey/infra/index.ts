import "@/lib/brand-storage-migration"
/**
 * Infrastructure cho module Journey.
 * Hỗ trợ lưu trữ trạng thái hành trình phía client (sessionStorage/localStorage).
 */

const JOURNEY_STATE_STORAGE_KEY_PREFIX = "alg_journey_state_"
const LEGACY_JOURNEY_STATE_STORAGE_KEY_PREFIX = "floraos_journey_state_"

export const journeyStorage = {
  makeKey(journeyId: string, orgId?: string | null): string {
    return orgId
      ? `${JOURNEY_STATE_STORAGE_KEY_PREFIX}${orgId}_${journeyId}`
      : `${JOURNEY_STATE_STORAGE_KEY_PREFIX}${journeyId}`
  },

  makeLegacyKey(journeyId: string, orgId?: string | null): string {
    return orgId
      ? `${LEGACY_JOURNEY_STATE_STORAGE_KEY_PREFIX}${orgId}_${journeyId}`
      : `${LEGACY_JOURNEY_STATE_STORAGE_KEY_PREFIX}${journeyId}`
  },

  saveState(journeyId: string, state: unknown, orgId?: string | null): void {
    if (typeof window === "undefined") return
    try {
      window.sessionStorage.setItem(
        this.makeKey(journeyId, orgId),
        JSON.stringify(state)
      )
    } catch {
      // Bỏ qua lỗi quota hoặc private browsing
    }
  },

  loadState<T>(journeyId: string, orgId?: string | null): T | null {
    if (typeof window === "undefined") return null
    try {
      const raw =
        window.sessionStorage.getItem(this.makeKey(journeyId, orgId)) ??
        window.sessionStorage.getItem(this.makeLegacyKey(journeyId, orgId))
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  },

  clearState(journeyId: string, orgId?: string | null): void {
    if (typeof window === "undefined") return
    try {
      window.sessionStorage.removeItem(
        this.makeKey(journeyId, orgId)
      )
    } catch {
      // Bỏ qua lỗi
    }
  },
}
