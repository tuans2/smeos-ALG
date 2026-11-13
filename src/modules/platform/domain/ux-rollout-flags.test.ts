import { describe, expect, it } from "vitest"
import { enabledUxRolloutFlagsFor, isUxRolloutEnabled, parseUxRolloutFlags } from "./ux-rollout-flags"

describe("ux-rollout-flags (03c E9)", () => {
  it("giá trị lạ hoặc thiếu đều thành tắt", () => {
    const flags = parseUxRolloutFlags({ ux_pd_anh_san_pham: { mode: "bat" }, khong_ton_tai: { mode: "all" } })
    expect(flags.ux_pd_anh_san_pham.mode).toBe("off")
    expect(Object.keys(flags)).not.toContain("khong_ton_tai")
    expect(parseUxRolloutFlags(null).ux_pd_noi_dung.mode).toBe("off")
    expect(parseUxRolloutFlags([]).ux_pd_noi_dung.mode).toBe("off")
  })

  it("allowlist chỉ bật cho tổ chức được liệt kê", () => {
    const flags = parseUxRolloutFlags({
      ux_pd_anh_san_pham: { mode: "allowlist", organizationIds: ["org-a", "org-a", 7, ""] },
    })
    expect(flags.ux_pd_anh_san_pham.organizationIds).toEqual(["org-a"])
    expect(isUxRolloutEnabled(flags, "ux_pd_anh_san_pham", "org-a")).toBe(true)
    expect(isUxRolloutEnabled(flags, "ux_pd_anh_san_pham", "org-b")).toBe(false)
    expect(isUxRolloutEnabled(flags, "ux_pd_anh_san_pham", "")).toBe(false)
  })

  it("all bật cho mọi tổ chức; danh sách trả client chỉ gồm khóa cờ", () => {
    const flags = parseUxRolloutFlags({ ux_pd_noi_dung: { mode: "all", organizationIds: ["org-x"] } })
    expect(flags.ux_pd_noi_dung.organizationIds).toEqual([])
    expect(enabledUxRolloutFlagsFor(flags, "org-z")).toEqual(["ux_pd_noi_dung"])
  })
})
