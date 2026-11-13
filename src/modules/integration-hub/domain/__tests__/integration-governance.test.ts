import { describe, expect, it } from "vitest"
import { effectiveMode, validateGovernanceChange, type GovernanceRow } from "../integration-governance"
import { availabilityOf } from "../catalog-availability"
import { findManifest } from "../connector-catalog"

const store = { industryKey: "FLORAL", parentChainOrgId: "chain-1" }
const row = (tier: GovernanceRow["tier"], scopeId: string, mode: GovernanceRow["mode"]): GovernanceRow => ({ connectorKey: "shopee", tier, scopeId, mode })

describe("Khoá tích hợp theo tầng", () => {
  it("mặc định được tự kết nối", () => {
    expect(effectiveMode("shopee", store, [])).toMatchObject({ value: "ALLOW_OWN", lockedBy: null })
  })

  it("khoá tầng cao nhất thắng: Mẹ cấm thì chuỗi cho phép cũng không có tác dụng", () => {
    const rows = [row("CHAIN", "chain-1", "INHERIT_ONLY"), row("MOTHER", "GLOBAL", "FORBID")]
    expect(effectiveMode("shopee", store, rows)).toMatchObject({ value: "FORBID", lockedBy: "MOTHER" })
  })

  it("khoá của ngành khác / chuỗi khác không áp", () => {
    const rows = [row("INDUSTRY", "industry:FNB", "FORBID"), row("CHAIN", "chain-2", "FORBID")]
    expect(effectiveMode("shopee", store, rows).value).toBe("ALLOW_OWN")
    expect(effectiveMode("shopee", store, [row("INDUSTRY", "industry:FLORAL", "INHERIT_ONLY")])).toMatchObject({ value: "INHERIT_ONLY", lockedBy: "INDUSTRY" })
  })

  it("cửa hàng không khoá được; tầng trên đã khoá thì chuỗi không đổi được; đầu nối chưa hỗ trợ bị từ chối", () => {
    const chainScope = { industryKey: "FLORAL", parentChainOrgId: null }
    const base = { editorScope: chainScope, connectorKey: "shopee", governable: true }
    expect(validateGovernanceChange({ ...base, editorTier: "STORE", rows: [] })).toBe("STORE_CANNOT_LOCK")
    expect(validateGovernanceChange({ ...base, editorTier: "CHAIN", rows: [row("INDUSTRY", "industry:FLORAL", "FORBID")] })).toBe("LOCKED_BY_UPPER")
    expect(validateGovernanceChange({ ...base, editorTier: "CHAIN", governable: false, rows: [] })).toBe("NOT_GOVERNABLE")
    expect(validateGovernanceChange({ ...base, editorTier: "CHAIN", rows: [] })).toBeNull()
  })

  it("danh mục: FORBID → Cấp trên đã khoá, INHERIT_ONLY → Dùng kết nối cấp trên; đầu nối không khoá được thì bỏ qua", () => {
    const input = { tier: "STORE" as const, planFeatures: new Set<string>(), connectedKeys: new Set<string>(), isProduction: false }
    const echo = findManifest("test_echo")!
    expect(availabilityOf(echo, { ...input, modeOf: () => "FORBID" })).toBe("LOCKED_BY_UPPER")
    expect(availabilityOf(echo, { ...input, modeOf: () => "INHERIT_ONLY" })).toBe("INHERITED")
    expect(availabilityOf(findManifest("sepay")!, { ...input, modeOf: () => "FORBID" })).toBe("AVAILABLE")
  })
})
