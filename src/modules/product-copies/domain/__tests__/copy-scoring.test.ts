import { describe, expect, it } from "vitest"

import { projectAnalysisForCopy } from "../analysis-projection"
import { chamBaKenh, chamBrand, chamFactual, chamReadability, type CopyOutput } from "../copy-scoring"

const analysis = projectAnalysisForCopy({
  identity: { category: "Sản phẩm", container: "giấy gói", phong_cach: "Cổ điển" },
  bom: {
    flowers: [{ name: "Hồng đỏ", quantity: 20 }],
    foliage: [],
    accessories: [],
    wrapping: [],
  },
  flower_count: 20,
  bud_count: 2,
  damaged_count: 0,
  confidence: 90,
})

const ctx = {
  analysis,
  occasionNames: ["Kỷ niệm", "Sinh nhật"],
  forbidden: ["rẻ nhất thị trường"],
}

const MO_TA_TOT =
  "Sản phẩm hồng đỏ được gói trong lớp giấy mộc mạc, dựng theo lối cổ điển với dáng tròn đầy đặn. " +
  "Từng bông được chọn theo độ nở đồng đều, xếp tầng để mặt hoa hướng về một phía. " +
  "Món quà hợp với những dịp cần một lời chúc giản dị mà chỉn chu."

const BAN_TOT: CopyOutput = {
  suggested_name: "Bó hồng đỏ cổ điển",
  suggested_description: MO_TA_TOT,
  suggested_tags: ["hoa-hong", "co-dien", "ky-niem"],
  suggested_occasions: ["Kỷ niệm"],
  suggested_price_segment: "standard",
}

describe("chấm ba kênh của AIC-04", () => {
  it("bản đạt được điểm cao trên cả ba kênh", () => {
    const d = chamBaKenh(BAN_TOT, ctx)
    expect(d.factual).toBe(1)
    expect(d.brand).toBe(1)
    expect(d.readability).toBe(1)
  })

  it("bịa ra con số không có trong phân tích thì rớt kênh factual", () => {
    const bia = { ...BAN_TOT, suggested_description: MO_TA_TOT.replace("Từng bông", "Trọn 99 bông") }
    expect(chamFactual(bia, ctx)).toBeLessThan(1)
  })

  it("con số CÓ THẬT trong phân tích không bị phạt", () => {
    const that = { ...BAN_TOT, suggested_description: MO_TA_TOT.replace("Từng bông", "Cả 20 bông") }
    expect(chamFactual(that, ctx)).toBe(1)
  })

  it("dịp ngoài danh mục của cửa hàng thì rớt kênh factual", () => {
    expect(chamFactual({ ...BAN_TOT, suggested_occasions: ["Halloween"] }, ctx)).toBe(0)
  })

  it("dùng cụm từ tổ chức đã cấm thì kênh brand về 0", () => {
    const cam = { ...BAN_TOT, suggested_description: `${MO_TA_TOT} Rẻ nhất thị trường.` }
    expect(chamBrand(cam, ctx)).toBe(0)
  })

  it("thẻ còn dấu hoặc sai số lượng thì kênh brand giảm", () => {
    expect(chamBrand({ ...BAN_TOT, suggested_tags: ["hoa hồng"] }, ctx)).toBeLessThan(1)
    expect(chamBrand({ ...BAN_TOT, suggested_tags: [] }, ctx)).toBeLessThan(1)
  })

  it("mô tả quá ngắn hoặc không nhắc tới sản phẩm thì rớt kênh readability", () => {
    expect(chamReadability({ ...BAN_TOT, suggested_description: "Đẹp lắm." }, ctx)).toBeLessThan(1)
    expect(
      chamReadability(
        {
          ...BAN_TOT,
          suggested_description:
            "Một món quà tinh tế dành tặng người thân yêu trong những khoảnh khắc quan trọng của cuộc đời, " +
            "gửi gắm tình cảm chân thành và sự trân trọng sâu sắc nhất mà bạn muốn trao đi mỗi ngày trôi qua.",
        },
        ctx
      )
    ).toBe(0)
  })

  it("không trả về hằng số — hai bản khác nhau phải cho hai điểm khác nhau", () => {
    const xau: CopyOutput = {
      suggested_name: "",
      suggested_description: "Ngắn.",
      suggested_tags: [],
      suggested_occasions: ["Không có dịp này"],
      suggested_price_segment: "sai",
    }
    expect(chamBaKenh(xau, ctx)).not.toEqual(chamBaKenh(BAN_TOT, ctx))
  })
})
