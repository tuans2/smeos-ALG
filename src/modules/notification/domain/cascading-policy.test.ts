import { describe, it, expect } from "vitest"
import {
  resolveCascadingPreference,
  getAppliedHardLock,
  getLockForUserPreference,
  type HardLockEntry,
} from "./cascading-policy"

describe("Cascading Policy — Notification Resolution", () => {
  const baseInput = {
    eventKey: "ORDER_RECEIVED",
    channel: "TELEGRAM" as const,
    userId: "user-1",
    roleKey: "florist",
    storeOrgId: "store-org-1",
    channelActivations: { TELEGRAM: true },
    hardLocks: [],
  }

  describe("Gate 1: Channel Activation", () => {
    it("tắt ngay nếu kênh chưa được Mother kích hoạt", () => {
      const res = resolveCascadingPreference({
        ...baseInput,
        channelActivations: { TELEGRAM: false },
      })
      expect(res.enabled).toBe(false)
      expect(res.decidedBy).toBe("CHANNEL_NOT_ACTIVATED")
    })

    it("kênh APP_INBOX luôn kích hoạt kể cả khi channelActivations không chứa nó", () => {
      const res = resolveCascadingPreference({
        ...baseInput,
        channel: "APP_INBOX",
        channelActivations: {},
        storeDefault: { eventKey: "ORDER_RECEIVED", channel: "APP_INBOX", enabled: true },
      })
      expect(res.enabled).toBe(true)
      expect(res.decidedBy).toBe("STORE")
    })
  })

  describe("Gate 2: Hard Lock Cascading", () => {
    it("Mother Hard Lock thắng mọi thứ", () => {
      const hardLocks: HardLockEntry[] = [
        {
          eventKey: "ORDER_RECEIVED",
          channel: "TELEGRAM",
          tier: "MOTHER",
          scopeId: "GLOBAL",
          enabled: false,
          reason: "Bảo trì hạ tầng bot",
        },
      ]
      const res = resolveCascadingPreference({
        ...baseInput,
        hardLocks,
        userPreference: { eventKey: "ORDER_RECEIVED", channel: "TELEGRAM", enabled: true },
      })
      expect(res.enabled).toBe(false)
      expect(res.decidedBy).toBe("HARD_LOCK_MOTHER")
      expect(res.hardLockReason).toBe("Bảo trì hạ tầng bot")
    })

    it("Chain Hard Lock đè Store và User", () => {
      const hardLocks: HardLockEntry[] = [
        {
          eventKey: "ORDER_RECEIVED",
          channel: "TELEGRAM",
          tier: "CHAIN",
          scopeId: "chain-org-1",
          enabled: true,
          reason: "Chuỗi bắt buộc nhận qua Telegram",
        },
      ]
      const res = resolveCascadingPreference({
        ...baseInput,
        parentOrgId: "chain-org-1",
        hardLocks,
        userPreference: { eventKey: "ORDER_RECEIVED", channel: "TELEGRAM", enabled: false },
      })
      expect(res.enabled).toBe(true)
      expect(res.decidedBy).toBe("HARD_LOCK_CHAIN")
    })
  })

  describe("Bottom-up Override (Most specific wins)", () => {
    it("User preference thắng Store, Org và Mother", () => {
      const res = resolveCascadingPreference({
        ...baseInput,
        userPreference: { eventKey: "ORDER_RECEIVED", channel: "TELEGRAM", enabled: false },
        storeDefault: { eventKey: "ORDER_RECEIVED", channel: "TELEGRAM", enabled: true },
        orgPolicy: { eventKey: "ORDER_RECEIVED", channel: "TELEGRAM", enabled: true },
        motherDefault: { eventKey: "ORDER_RECEIVED", channel: "TELEGRAM", enabled: true },
      })
      expect(res.enabled).toBe(false)
      expect(res.decidedBy).toBe("USER")
    })

    it("Store default thắng Org và Mother khi User chưa set", () => {
      const res = resolveCascadingPreference({
        ...baseInput,
        storeDefault: { eventKey: "ORDER_RECEIVED", channel: "TELEGRAM", enabled: true },
        orgPolicy: { eventKey: "ORDER_RECEIVED", channel: "TELEGRAM", enabled: false },
        motherDefault: { eventKey: "ORDER_RECEIVED", channel: "TELEGRAM", enabled: false },
      })
      expect(res.enabled).toBe(true)
      expect(res.decidedBy).toBe("STORE")
    })

    it("Org policy thắng Mother default khi User & Store chưa set", () => {
      const res = resolveCascadingPreference({
        ...baseInput,
        orgPolicy: { eventKey: "ORDER_RECEIVED", channel: "TELEGRAM", enabled: true },
        motherDefault: { eventKey: "ORDER_RECEIVED", channel: "TELEGRAM", enabled: false },
      })
      expect(res.enabled).toBe(true)
      expect(res.decidedBy).toBe("ORG")
    })

    it("Mother default được áp dụng khi không có tầng nào cấu hình", () => {
      const res = resolveCascadingPreference({
        ...baseInput,
        motherDefault: { eventKey: "ORDER_RECEIVED", channel: "TELEGRAM", enabled: true },
      })
      expect(res.enabled).toBe(true)
      expect(res.decidedBy).toBe("MOTHER_DEFAULT")
    })
  })

  describe("getLockForUserPreference — tuỳ chọn cá nhân (audit API §15)", () => {
    const storeLock: HardLockEntry = { eventKey: "ORDER_RECEIVED", channel: "TELEGRAM", tier: "STORE", scopeId: "store-1", enabled: false }

    it("khoá tầng cửa hàng của chính cửa hàng chặn tuỳ chọn cá nhân", () => {
      expect(getLockForUserPreference([storeLock], "ORDER_RECEIVED", "TELEGRAM", { storeOrgId: "store-1" })?.tier).toBe("STORE")
    })

    it("khoá của cửa hàng khác, sự kiện khác hoặc kênh khác không chặn", () => {
      expect(getLockForUserPreference([storeLock], "ORDER_RECEIVED", "TELEGRAM", { storeOrgId: "store-2" })).toBeNull()
      expect(getLockForUserPreference([storeLock], "ORDER_PAID", "TELEGRAM", { storeOrgId: "store-1" })).toBeNull()
      expect(getLockForUserPreference([storeLock], "ORDER_RECEIVED", "EMAIL", { storeOrgId: "store-1" })).toBeNull()
    })

    it("nhiều khoá cùng áp → tầng cao nhất thắng", () => {
      const mother: HardLockEntry = { ...storeLock, tier: "MOTHER", scopeId: "GLOBAL" }
      expect(getLockForUserPreference([storeLock, mother], "ORDER_RECEIVED", "TELEGRAM", { storeOrgId: "store-1" })?.tier).toBe("MOTHER")
    })
  })

  describe("getAppliedHardLock helper", () => {
    it("phát hiện hard lock từ tầng trên", () => {
      const locks: HardLockEntry[] = [
        {
          eventKey: "ORDER_RECEIVED",
          channel: "TELEGRAM",
          tier: "MOTHER",
          scopeId: "GLOBAL",
          enabled: false,
        },
      ]
      const applied = getAppliedHardLock(locks, "ORDER_RECEIVED", "TELEGRAM", "STORE", { storeOrgId: "store-1" })
      expect(applied).not.toBeNull()
      expect(applied?.tier).toBe("MOTHER")
    })

    it("không phát hiện lock của tầng dưới", () => {
      const locks: HardLockEntry[] = [
        {
          eventKey: "ORDER_RECEIVED",
          channel: "TELEGRAM",
          tier: "STORE",
          scopeId: "store-1",
          enabled: false,
        },
      ]
      const applied = getAppliedHardLock(locks, "ORDER_RECEIVED", "TELEGRAM", "CHAIN", { storeOrgId: "store-1" })
      expect(applied).toBeNull()
    })
  })

  describe("Phạm vi khoá cứng giữa các tổ chức (AUD-014/015)", () => {
    const lockOf = (tier: HardLockEntry["tier"], scopeId: string): HardLockEntry => ({
      eventKey: "ORDER_RECEIVED", channel: "TELEGRAM", tier, scopeId, enabled: false, reason: "lý do riêng",
    })
    const userOn = { eventKey: "ORDER_RECEIVED", channel: "TELEGRAM" as const, enabled: true }

    it("khoá STORE/CHAIN của tổ chức khác không ảnh hưởng tổ chức này", () => {
      const res = resolveCascadingPreference({
        ...baseInput,
        parentOrgId: "chain-A",
        hardLocks: [lockOf("STORE", "store-org-OTHER"), lockOf("CHAIN", "chain-OTHER")],
        userPreference: userOn,
      })
      expect(res.decidedBy).toBe("USER")
      expect(res.enabled).toBe(true)
    })

    it("khoá CHAIN của chuỗi cấp trên áp xuống cửa hàng trực thuộc", () => {
      const res = resolveCascadingPreference({
        ...baseInput, parentOrgId: "chain-A", hardLocks: [lockOf("CHAIN", "chain-A")], userPreference: userOn,
      })
      expect(res.decidedBy).toBe("HARD_LOCK_CHAIN")
    })

    it("getAppliedHardLock không trả khoá (và lý do) của tenant khác", () => {
      const applied = getAppliedHardLock(
        [lockOf("CHAIN", "chain-OTHER")], "ORDER_RECEIVED", "TELEGRAM", "STORE", { storeOrgId: "store-org-1" }
      )
      expect(applied).toBeNull()
    })
  })
})
