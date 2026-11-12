import { describe, it, expect } from "vitest"
import {
  getTierTerminology,
  SAAS_MOTHER_TERMS,
  SAAS_INDUSTRY_TERMS,
  CHAIN_OS_TERMS,
  STORE_OS_TERMS,
} from "./master-terminology-registry"

describe("Master Terminology SSOT (Core)", () => {
  it("trả về đúng bộ thuật ngữ của Tầng 1: SaaS Mother", () => {
    const terms = getTierTerminology("TIER_1_SAAS")
    expect(terms.platformName).toContain("ALG")
    expect(terms.platformAdminTitle).toBe("Quản trị viên nền tảng")
    expect(terms.tenantEntityTitle).toBe("Tổ chức doanh nghiệp")
    expect(terms.tenantIsolationTitle).toBe("Cách ly an toàn dữ liệu tổ chức")
  })

  it("trả về đúng bộ thuật ngữ của Tầng 2: SaaS Ngành", () => {
    const terms = getTierTerminology("TIER_2_INDUSTRY")
    expect(terms.networkSalesTitle).toBe("Mạng lưới tiếp thị liên kết đa đối tác")
    expect(terms.autoDispatchTitle).toBe("Bộ máy tự động định tuyến đơn hàng")
    expect(terms.bomSpecTitle).toBe("Định mức nguyên phụ liệu chuẩn")
  })

  it("trả về đúng bộ thuật ngữ của Tầng 3: ChainOS", () => {
    const terms = getTierTerminology("TIER_3_CHAIN")
    expect(terms.chainHqTitle).toBe("Tổng bộ Chuỗi Thương Hiệu")
    expect(terms.controlTowerTitle).toBe("Tháp điều phối đơn hàng mạng lưới")
    expect(terms.qualityReviewTitle).toBe("Kiểm duyệt chất lượng thành phẩm (QC)")
    expect(terms.reconciliationTitle).toBe("Đối soát công nợ chi nhánh & xưởng")
  })

  it("trả về đúng bộ thuật ngữ của Tầng 4: StoreOS", () => {
    const terms = getTierTerminology("TIER_4_STORE")
    expect(terms.posRetailTitle).toBe("Bán lẻ tại quầy")
    expect(terms.workshopQueueTitle).toBe("Hàng đợi thợ chế tác")
    expect(terms.completionProofTitle).toBe("Ảnh nghiệm thu thành phẩm")
    expect(terms.networkInboxTitle).toBe("Đơn nhận từ mạng lưới")
  })

  it("đảm bảo không có trường nào bị rỗng trong toàn bộ 4 tầng", () => {
    const allDicts = [SAAS_MOTHER_TERMS, SAAS_INDUSTRY_TERMS, CHAIN_OS_TERMS, STORE_OS_TERMS]
    for (const dict of allDicts) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value, `Trường ${key} không được để trống`).toBeTruthy()
        expect(typeof value).toBe("string")
      }
    }
  })
})
