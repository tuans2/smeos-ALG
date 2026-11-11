import { describe, expect, it } from "vitest"

import { khai, MOI_MA } from "@/lib/maChucNang"
import { SYSTEM_ROLES } from "@/modules/organization/domain/system-roles"

import {
  ALL_CAPABILITY_CODES,
  CAPABILITIES,
  HARD_CAPPED_CODES,
  SPLIT_CAPABILITY_PAIRS,
  capability,
  defaultCodesForSystemRole,
  isCapabilityCode,
} from "./capability-catalog"

const VAI_TO_KEY: Record<string, "dieu_hanh" | "dieu_phoi" | "sale"> = {
  ADMIN: "dieu_hanh",
  COORDINATOR: "dieu_phoi",
  SALES: "sale",
}

const STAFF_LOGIN_CODES = ["A1", "A2"]

const HARVESTED_CODES = MOI_MA.filter((ma) => /^[A-E]\d+$/.test(ma))

describe("danh mục năng lực — đặc tả 02", () => {
  it("154 mã: 76 thu hoạch (A–E) cộng 78 mã mới (F–L, U1–U4, H5–H6, R1–R13, Q1–Q9, T1–T4, I4–I5, P3–P4, V1–V3) — ĐP-4a thêm R9/R10 (sổ thu), PO 08/10 thêm R11, PO 14/10 thêm R12 (cấu hình nhắc việc Điều phối), R13 (xuất dữ liệu), PO 30/10 thêm J7 (nội dung AI landing/catalog), PO 31/10 thêm R15 (báo giá) + R16 (duyệt giao trước thu sau), PO 01/11 thêm M1/M2/M3 (marketing usage + campaign), M4 (nhóm khách & chăm sóc), M5 (in ấn), PO Q7 04/11 thêm R17/R18/R19 (Thợ cắm, Shipper, Kế toán), PO 05/11 thêm D18 (trường dữ liệu của cửa hàng), R20 (báo cáo theo kỳ), PO 06/11 thêm D19 (tên miền riêng), PO 09/11 thêm S1/S2 (trao đổi nội bộ)", () => {
    expect(HARVESTED_CODES.length).toBe(76)
    expect(ALL_CAPABILITY_CODES.length).toBe(176)
  })

  it("R20 xem báo cáo theo kỳ — Điều hành và Kế toán (Đợt 5, PO Q7)", () => {
    expect(capability("R20").name).toBe("report.read")
    expect(capability("R20").defaultRoles).toEqual(["dieu_hanh", "ke_toan"])
  })

  it("Quản lý sản phẩm tải ảnh, chạy nhận diện, tạo nội dung bán hàng; duyệt (H3) vẫn chỉ Điều hành (GD1 Bước 6, PO 11/11/2026)", () => {
    for (const code of ["G2", "H1", "H5"]) expect(capability(code).defaultRoles).toContain("product_manager")
    expect(capability("H3").hardCap).toEqual(["dieu_hanh"])
  })

  it("D18 cấu hình trường dữ liệu của cửa hàng — chỉ Điều hành, trần cứng (checklist ALG 1.9)", () => {
    expect(capability("D18").name).toBe("config.custom_field.manage")
    expect(capability("D18").defaultRoles).toEqual(["dieu_hanh"])
    expect(capability("D18").hardCap).toEqual(["dieu_hanh"])
  })

  it("D19 gắn/gỡ tên miền riêng — chỉ Điều hành, trần cứng (checklist ALG 10.8)", () => {
    expect(capability("D19").name).toBe("config.custom_domain.manage")
    expect(capability("D19").defaultRoles).toEqual(["dieu_hanh"])
    expect(capability("D19").hardCap).toEqual(["dieu_hanh"])
  })

  it("M1, M2 và M3 cho Marketing & Sales Center (PR-2, PR-3)", () => {
    expect(capability("M1").name).toBe("marketing.usage.read")
    expect(capability("M2").name).toBe("marketing.usage.manage")
    expect(capability("M3").name).toBe("marketing.campaign.manage")
    expect(capability("M1").defaultRoles).toContain("dieu_hanh")
    expect(capability("M2").defaultRoles).toContain("marketing")
    expect(capability("M3").defaultRoles).toContain("marketing")
  })

  it("M4 cho nhóm khách & chăm sóc (PR-5), M5 cho in ấn (PR-6)", () => {
    expect(capability("M4").name).toBe("crm.segment.manage")
    expect(capability("M4").defaultRoles).toEqual(["dieu_hanh", "marketing"])
    expect(capability("M5").name).toBe("print.rendition.export")
    expect(capability("M5").defaultRoles).toEqual(["dieu_hanh", "dieu_phoi", "marketing"])
  })

  it("18 mã thu hoạch có trần cứng, tổng cả catalog là 51 — ĐP-4a thêm R10 (hoàn tiền), PO 08/10 thêm R11, PO 05/11 thêm D18, PO 06/11 thêm D19", () => {
    const harvestedHardCap = HARVESTED_CODES.filter((ma) => khai(ma).tranCung)
    expect(harvestedHardCap.length).toBe(18)
    expect(HARD_CAPPED_CODES.length).toBe(51)
  })

  it("mỗi mã A–E khớp nguyên vẹn với bản harvest — không lệch khi mã nguồn đổi", () => {
    for (const ma of HARVESTED_CODES) {
      const source = khai(ma)
      const cat = capability(ma)
      const expectedDefaults = source.macDinh.map((v: keyof typeof VAI_TO_KEY) => VAI_TO_KEY[v]).sort()
      // Ngoại lệ duy nhất (PO Q7, 04/11/2026): A1/A2 mở cho mọi vai nhân sự — xem test riêng bên dưới.
      const ownDefaults = STAFF_LOGIN_CODES.includes(ma)
        ? cat.defaultRoles.filter((role) => (expectedDefaults as string[]).includes(role))
        : cat.defaultRoles
      expect([...ownDefaults].sort()).toEqual(expectedDefaults)

      if (source.tranCung) {
        const expectedHardCap = source.tranCung.map((v: keyof typeof VAI_TO_KEY) => VAI_TO_KEY[v]).sort()
        expect([...(cat.hardCap ?? [])].sort()).toEqual(expectedHardCap)
      } else {
        expect(cat.hardCap).toBeUndefined()
      }
    }
  })

  it("mọi vai nhân sự (trừ vai trải nghiệm) đăng nhập và tự đổi mật khẩu được — PO Q7, checklist ALG 1.4", () => {
    const staff = SYSTEM_ROLES.map((role) => role.key).filter((key) => key !== "experience_user")
    for (const code of STAFF_LOGIN_CODES) {
      expect([...capability(code).defaultRoles].sort()).toEqual([...staff].sort())
    }
  })

  it("ba vai PO Q7: Thợ cắm chỉ việc được giao, Shipper chỉ đơn được giao, Kế toán xem và đối soát nhưng không xác nhận tiền", () => {
    // S1 (trao đổi nội bộ, mọi vai) và S2 (thực hiện đơn gia công, có Thợ cắm) — PO duyệt D2 ngày 09/11/2026
    expect(defaultCodesForSystemRole("tho_cam").sort()).toEqual(["A1", "A2", "G1", "G2", "R17", "S1", "S2"])
    expect(defaultCodesForSystemRole("shipper").sort()).toEqual(["A1", "A2", "G2", "R18", "S1"])
    const keToan = defaultCodesForSystemRole("ke_toan")
    expect(keToan.sort()).toEqual(["A1", "A2", "F1", "G8", "Q1", "R1", "R13", "R19", "R20", "S1"])
    for (const confirm of ["R9", "R10", "R11", "R16"]) expect(keToan).not.toContain(confirm)
  })

  it("mọi mã có tên đọc được duy nhất, không trùng nhau", () => {
    const names = ALL_CAPABILITY_CODES.map((code) => capability(code).name)
    expect(new Set(names).size).toBe(names.length)
  })

  it("`isCapabilityCode` nhận đúng mã, từ chối mã lạ", () => {
    expect(isCapabilityCode("B6")).toBe(true)
    expect(isCapabilityCode("H3")).toBe(true)
    expect(isCapabilityCode("Z99")).toBe(false)
  })

  it("bản mặc định không vượt trần cứng của chính mã đó", () => {
    for (const code of ALL_CAPABILITY_CODES) {
      const def = capability(code)
      if (!def.hardCap) continue
      for (const role of def.defaultRoles) {
        expect(def.hardCap).toContain(role)
      }
    }
  })

  it("Điều hành là tập cha của Sale và Điều phối, trừ nhóm Trải nghiệm (`YC-Q8`)", () => {
    for (const code of ALL_CAPABILITY_CODES) {
      const def = capability(code)
      const hasNonAdminOrgRole =
        def.defaultRoles.includes("dieu_phoi") || def.defaultRoles.includes("sale")
      if (hasNonAdminOrgRole) {
        expect(def.defaultRoles, `${code} (${def.name}) thiếu dieu_hanh`).toContain("dieu_hanh")
      }
    }
  })

  it("sáu cặp chạy/duyệt tách rời, không cặp nào gói chung (`YC-Q6`)", () => {
    expect(SPLIT_CAPABILITY_PAIRS).toHaveLength(6)
    for (const pair of SPLIT_CAPABILITY_PAIRS) {
      expect(pair.run).not.toBe(pair.approve)
      expect(isCapabilityCode(pair.run)).toBe(true)
      expect(isCapabilityCode(pair.approve)).toBe(true)
      // Duyệt luôn là hành động riêng — không role nào có approve chỉ vì có run.
      expect(capability(pair.approve).name).not.toBe(capability(pair.run).name)
    }
  })

  it("mặc định lớp một của vai hệ thống khớp danh sách defaultRoles", () => {
    const dieuHanh = defaultCodesForSystemRole("dieu_hanh")
    // Điều hành có mặt ở mọi mã trừ K1 (trải nghiệm thuần).
    expect(dieuHanh.length).toBe(ALL_CAPABILITY_CODES.length - 1)
    expect(dieuHanh).not.toContain("K1")

    const sale = defaultCodesForSystemRole("sale")
    expect(sale).toContain("A1")
    expect(sale).not.toContain("B6")
  })

  it("mọi mã đều thuộc `CAPABILITIES` với đúng `code`", () => {
    for (const code of ALL_CAPABILITY_CODES) {
      expect(CAPABILITIES[code]?.code).toBe(code)
    }
  })
})
