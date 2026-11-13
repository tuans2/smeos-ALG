import { describe, expect, it } from "vitest"
import {
  DEFAULT_STEP_TIMEOUT_POLICY,
  STEP_TIMEOUT_SETTINGS_KEY,
  CATALOG_TIMEOUT_OVERRIDE_KEY,
  parseStepTimeoutPolicy,
  serializeStepTimeoutPolicy,
  parseCatalogTimeoutOverride,
  resolveEffectiveStepTimeoutPolicy,
  isSessionUnopenedExpired,
  isSessionBrowsingExpired,
  formatTimeoutDuration,
} from "../step-timeout-policy"

describe("step-timeout-policy domain", () => {
  it("uses default values when settings are empty or invalid", () => {
    const policy = parseStepTimeoutPolicy(null)
    expect(policy).toEqual(DEFAULT_STEP_TIMEOUT_POLICY)

    const invalidPolicy = parseStepTimeoutPolicy({ [STEP_TIMEOUT_SETTINGS_KEY]: { unopened_expiry_hours: "abc" } })
    expect(invalidPolicy.unopenedExpiryHours).toBe(24)
  })

  it("parses valid store settings and clamps values within limits", () => {
    const policy = parseStepTimeoutPolicy({
      [STEP_TIMEOUT_SETTINGS_KEY]: {
        unopened_expiry_hours: 48,
        auto_cancel_unopened: false,
        browsing_expiry_hours: 6,
        auto_cancel_browsing: true,
        unpaid_expiry_minutes: 45,
        auto_cancel_unpaid: false,
        photo_review_timeout_minutes: 30,
        auto_approve_photo_on_timeout: true,
      },
    })

    expect(policy.unopenedExpiryHours).toBe(48)
    expect(policy.autoCancelUnopened).toBe(false)
    expect(policy.browsingExpiryHours).toBe(6)
    expect(policy.unpaidExpiryMinutes).toBe(45)
    expect(policy.photoReviewTimeoutMinutes).toBe(30)
  })

  it("serializes policy accurately", () => {
    const serialized = serializeStepTimeoutPolicy(DEFAULT_STEP_TIMEOUT_POLICY)
    expect(serialized).toMatchObject({
      unopened_expiry_hours: 24,
      auto_cancel_unopened: true,
      browsing_expiry_hours: 12,
      auto_cancel_browsing: true,
      unpaid_expiry_minutes: 30,
      auto_cancel_unpaid: true,
      photo_review_timeout_minutes: 15,
      auto_approve_photo_on_timeout: true,
    })
  })

  it("resolves hierarchy correctly: catalog override takes precedence over store setting", () => {
    const storeSettings = {
      [STEP_TIMEOUT_SETTINGS_KEY]: {
        unopened_expiry_hours: 48,
        unpaid_expiry_minutes: 60,
      },
    }

    // Trường hợp 1: Catalog không override -> kế thừa Hồ sơ tiệm
    const resStore = resolveEffectiveStepTimeoutPolicy(storeSettings, {})
    expect(resStore.source).toBe("STORE")
    expect(resStore.unopenedExpiryHours).toBe(48)
    expect(resStore.unpaidExpiryMinutes).toBe(60)

    // Trường hợp 2: Catalog có override enabled -> ghi đè giá trị
    const catalogFilters = {
      [CATALOG_TIMEOUT_OVERRIDE_KEY]: {
        enabled: true,
        policy: {
          unopenedExpiryHours: 2, // Đợt lễ 20/10 chỉ giữ link 2 tiếng
        },
      },
    }

    const resOverride = resolveEffectiveStepTimeoutPolicy(storeSettings, catalogFilters)
    expect(resOverride.source).toBe("CATALOG_OVERRIDE")
    expect(resOverride.unopenedExpiryHours).toBe(2) // Ghi đè bởi catalog
    expect(resOverride.unpaidExpiryMinutes).toBe(60) // Kế thừa từ store vì catalog không chỉ định
  })

  it("evaluates session unopened expiry correctly", () => {
    const now = new Date("2026-10-09T12:00:00Z")
    const twoHoursAgo = new Date("2026-10-09T10:00:00Z")
    const twentyFiveHoursAgo = new Date("2026-10-08T11:00:00Z")

    const policy = { ...DEFAULT_STEP_TIMEOUT_POLICY, unopenedExpiryHours: 24, autoCancelUnopened: true }

    // Chưa mở, tạo 2 tiếng trước -> chưa hết hạn
    expect(isSessionUnopenedExpired({ createdAt: twoHoursAgo, openedAt: null }, policy, now)).toBe(false)

    // Chưa mở, tạo 25 tiếng trước -> đã hết hạn
    expect(isSessionUnopenedExpired({ createdAt: twentyFiveHoursAgo, openedAt: null }, policy, now)).toBe(true)

    // Đã mở -> không bao giờ tính hết hạn unopened
    expect(isSessionUnopenedExpired({ createdAt: twentyFiveHoursAgo, openedAt: twoHoursAgo }, policy, now)).toBe(false)

    // Nếu tắt toggle autoCancelUnopened -> không bao giờ hết hạn
    const disabledPolicy = { ...policy, autoCancelUnopened: false }
    expect(isSessionUnopenedExpired({ createdAt: twentyFiveHoursAgo, openedAt: null }, disabledPolicy, now)).toBe(false)
  })

  it("evaluates session browsing expiry correctly", () => {
    const now = new Date("2026-10-09T12:00:00Z")
    const openedAt = new Date("2026-10-08T20:00:00Z")
    const recentActive = new Date("2026-10-09T11:00:00Z")
    const staleActive = new Date("2026-10-08T22:00:00Z") // 14 tiếng trước

    const policy = { ...DEFAULT_STEP_TIMEOUT_POLICY, browsingExpiryHours: 12, autoCancelBrowsing: true }

    // Đang xem và mới hoạt động 1 tiếng trước -> chưa hết hạn
    expect(
      isSessionBrowsingExpired(
        { openedAt, status: "BROWSING", lastActiveAt: recentActive },
        policy,
        now
      )
    ).toBe(false)

    // Đang xem nhưng ngưng hoạt động 14 tiếng trước -> đã hết hạn
    expect(
      isSessionBrowsingExpired(
        { openedAt, status: "BROWSING", lastActiveAt: staleActive },
        policy,
        now
      )
    ).toBe(true)

    // Đã submit đơn -> không tính browsing timeout
    expect(
      isSessionBrowsingExpired(
        { openedAt, status: "ORDER_SUBMITTED", lastActiveAt: staleActive },
        policy,
        now
      )
    ).toBe(false)
  })

  it("formats timeout duration accurately in Vietnamese", () => {
    expect(formatTimeoutDuration(30, "minutes")).toBe("30 phút")
    expect(formatTimeoutDuration(90, "minutes")).toBe("1 giờ 30 phút")
    expect(formatTimeoutDuration(12, "hours")).toBe("12 giờ")
    expect(formatTimeoutDuration(24, "hours")).toBe("1 ngày")
    expect(formatTimeoutDuration(48, "hours")).toBe("2 ngày")
    expect(formatTimeoutDuration(30, "hours")).toBe("1 ngày 6 giờ")
  })
})
