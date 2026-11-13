import { describe, it, expect } from "vitest"
import {
  FLORIST_SALES_SCRIPTS,
  renderSalesScript,
  getScriptById,
  getScriptsByCategory,
} from "../sales-scripts-catalog"

describe("sales-scripts-catalog (KB-01 -> KB-14)", () => {
  it("chứa đủ 14 kịch bản tư vấn thực chiến với mã từ KB-01 đến KB-14", () => {
    expect(FLORIST_SALES_SCRIPTS).toHaveLength(14)
    const codes = FLORIST_SALES_SCRIPTS.map((s) => s.code)
    for (let i = 1; i <= 14; i++) {
      const code = `KB-${String(i).padStart(2, "0")}`
      expect(codes).toContain(code)
    }
  })

  it("mỗi kịch bản có đầy đủ thông tin: id, title, summary, template, psychologicalTip", () => {
    for (const script of FLORIST_SALES_SCRIPTS) {
      expect(script.id).toBeTruthy()
      expect(script.title).toBeTruthy()
      expect(script.summary).toBeTruthy()
      expect(script.template.length).toBeGreaterThan(20)
      expect(script.psychologicalTip).toBeTruthy()
      expect(script.suggestedActionLabel).toBeTruthy()
    }
  })

  it("renderSalesScript nội suy đúng các biến truyền vào", () => {
    const rawTemplate = "Xin chào {{customerName}}, đây là {{productName}} giá {{priceVnd}} đ tại {{shopName}}!"
    const rendered = renderSalesScript(rawTemplate, {
      customerName: "Chị Mai",
      productName: "Bó Hồng Ohara",
      priceVnd: 680000,
      shopName: "Flora Dalat",
    })

    expect(rendered).toBe("Xin chào Chị Mai, đây là Bó Hồng Ohara giá 680.000 đ tại Flora Dalat!")
  })

  it("renderSalesScript sử dụng giá trị mặc định khi để trống biến", () => {
    const rawTemplate = "Chào {{customerName}} từ {{shopName}}!"
    const rendered = renderSalesScript(rawTemplate, {})

    expect(rendered).toBe("Chào anh/chị từ Flora Cửa Hàng!")
  })

  it("getScriptById tìm chính xác kịch bản theo id hoặc code", () => {
    const scriptById = getScriptById("kb-07")
    expect(scriptById?.code).toBe("KB-07")
    expect(scriptById?.title).toContain("chê đắt")

    const scriptByCode = getScriptById("KB-11")
    expect(scriptByCode?.id).toBe("kb-11")
    expect(scriptByCode?.title).toContain("trễ")
  })

  it("getScriptsByCategory lọc chính xác theo nhóm danh mục", () => {
    const chaoHoi = getScriptsByCategory("CHAO_HOI")
    expect(chaoHoi).toHaveLength(2)

    const all = getScriptsByCategory("ALL")
    expect(all).toHaveLength(14)
  })
})
