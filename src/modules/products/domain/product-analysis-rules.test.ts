import { describe, expect, it } from "vitest"

import {
  canApproveAnalysis,
  canEditAnalysis,
  canRejectAnalysis,
  draftProductName,
  extractProductFieldsFromAnalysis,
  missingKeysInEdit,
  resolveEffectiveAnalysis,
} from "./product-analysis-rules"

describe("trạng thái duyệt", () => {
  it("sửa được khi PENDING hoặc REJECTED, không sửa được khi APPROVED", () => {
    expect(canEditAnalysis("PENDING")).toBe(true)
    expect(canEditAnalysis("REJECTED")).toBe(true)
    expect(canEditAnalysis("APPROVED")).toBe(false)
  })

  it("duyệt được khi chưa APPROVED — kể cả từ REJECTED (đặc tả 06 mục 8: chỉ chặn duyệt lại bản đã APPROVED)", () => {
    expect(canApproveAnalysis("PENDING")).toBe(true)
    expect(canApproveAnalysis("REJECTED")).toBe(true)
    expect(canApproveAnalysis("APPROVED")).toBe(false)
  })
})

describe("resolveEffectiveAnalysis", () => {
  const raw = { identity: { category: "Sản phẩm" } }

  it("dùng raw khi chưa có edited", () => {
    expect(resolveEffectiveAnalysis(raw, null)).toBe(raw)
  })

  it("edited thắng raw khi có", () => {
    const edited = { identity: { category: "Giỏ hoa" } }
    expect(resolveEffectiveAnalysis(raw, edited)).toBe(edited)
  })
})

describe("extractProductFieldsFromAnalysis", () => {
  it("đọc đủ bốn trường identity", () => {
    const fields = extractProductFieldsFromAnalysis({
      identity: { category: "Sản phẩm", shape: "Tròn", facing: "Một mặt", container: "Giấy gói" },
      bom: { flowers: [] },
      confidence: 87,
    })
    expect(fields.category).toBe("Sản phẩm")
    expect(fields.shape).toBe("Tròn")
    expect(fields.facing).toBe("Một mặt")
    expect(fields.container).toBe("Giấy gói")
    expect(fields.attributes.bom).toEqual({ flowers: [] })
    expect(fields.attributes.confidence).toBe(87)
  })

  it("không ném lỗi khi identity thiếu hoặc sai hình dạng — trả null thay vì làm hỏng lượt duyệt", () => {
    expect(extractProductFieldsFromAnalysis({})).toEqual({
      category: null,
      shape: null,
      facing: null,
      container: null,
      attributes: { bom: null, confidence: null, checklist: null, san_xuat: null, color: null },
    })

    expect(extractProductFieldsFromAnalysis({ identity: "không phải object" })).toEqual({
      category: null,
      shape: null,
      facing: null,
      container: null,
      attributes: { bom: null, confidence: null, checklist: null, san_xuat: null, color: null },
    })
  })

  it("bỏ qua trường identity không phải chuỗi (vd null hợp lệ theo Schema.json)", () => {
    const fields = extractProductFieldsFromAnalysis({
      identity: { category: null, shape: 123, facing: "", container: "Khác" },
    })
    expect(fields.category).toBeNull()
    expect(fields.shape).toBeNull()
    expect(fields.facing).toBeNull()
    expect(fields.container).toBe("Khác")
  })
})

describe("draftProductName", () => {
  it("dùng category khi có", () => {
    expect(
      draftProductName({ category: "Sản phẩm", shape: null, facing: null, container: null, attributes: {} })
    ).toBe("Sản phẩm")
  })

  it("dùng tên mặc định khi category null", () => {
    expect(
      draftProductName({ category: null, shape: null, facing: null, container: null, attributes: {} })
    ).toBe("Sản phẩm chưa đặt tên")
  })
})

describe("missingKeysInEdit", () => {
  const raw = { identity: {}, bom: {}, confidence: 80, checklist: {} }

  it("chấp nhận bản sửa giữ đủ khoá, dù đổi hết giá trị", () => {
    expect(
      missingKeysInEdit(raw, { identity: { category: "Sản phẩm" }, bom: { flowers: [] }, confidence: 95, checklist: {} })
    ).toEqual([])
  })

  it("chỉ ra đúng khoá bị bỏ rơi", () => {
    expect(missingKeysInEdit(raw, { bom: {}, confidence: 80, checklist: {} })).toEqual(["identity"])
  })

  it("bản sửa rỗng bị chặn thay vì xoá trắng Product Master", () => {
    expect(missingKeysInEdit(raw, {}).sort()).toEqual(["bom", "checklist", "confidence", "identity"])
  })

  it("thêm khoá mới không sao — hợp đồng chỉ được thêm, không được bớt", () => {
    expect(missingKeysInEdit(raw, { ...raw, ghi_chu_nguoi_soat: "đếm lại 3 cành" })).toEqual([])
  })
})

describe("canRejectAnalysis", () => {
  it("chỉ bản còn chờ duyệt mới từ chối được", () => {
    expect(canRejectAnalysis("PENDING")).toBe(true)
  })

  it("bản đã duyệt không từ chối được — dữ liệu đã vào Product Master", () => {
    expect(canRejectAnalysis("APPROVED")).toBe(false)
  })

  it("từ chối lại một bản đã từ chối không đổi gì, nên bị chặn", () => {
    expect(canRejectAnalysis("REJECTED")).toBe(false)
  })
})
