import { describe, expect, it } from "vitest"

import { SHOP_NAME_FIELD, SURVEY_COLUMNS } from "../partner-marketplace-columns"
import { detectColumnMapping, normalizeHeader, remapRow, validateColumnMapping } from "../partner-marketplace-column-match"
import { rowsToProfiles } from "../partner-marketplace-row-mapper"

const field = (key: string) => SURVEY_COLUMNS.findIndex((c) => c.key === key)

describe("SURVEY_COLUMNS", () => {
  it("đủ 75 trường, khoá không trùng, cột F là tên cửa hàng", () => {
    expect(SURVEY_COLUMNS).toHaveLength(75)
    expect(new Set(SURVEY_COLUMNS.map((c) => c.key)).size).toBe(75)
    expect(SURVEY_COLUMNS[SHOP_NAME_FIELD]!.key).toBe("identity.shopName")
    expect(field("contact.phone")).toBe(13)
    expect(field("contact.address")).toBe(15)
    expect(field("scoreAndTier.suggestedTier")).toBe(73)
  })
})

describe("normalizeHeader", () => {
  it("bỏ số thứ tự câu hỏi, ký tự lạ; gộp hoá/hóa", () => {
    expect(normalizeHeader("3. Địa chỉ cửa hàng (ghi rõ quận)")).toBe("địa chỉ cửa hàng ghi rõ quận")
    expect(normalizeHeader("Điểm pháp lý & số hóa")).toBe(normalizeHeader("điểm pháp lý & số hoá"))
  })
})

describe("detectColumnMapping — tệp lệch cột so với Sheet gốc", () => {
  // Bố cục kiểu tệp lỗi: thiếu vài cột đầu, thêm cột lạ, đổi chỗ địa chỉ/quy mô
  const headers = [
    "Dấu thời gian",
    "Tên cửa hàng",
    "Họ tên chủ cửa hàng",
    "Chức vụ",
    "Địa chỉ cửa hàng",
    "Số điện thoại liên hệ",
    "Số năm hoạt động",
    "Quy mô (số chi nhánh)",
    "Doanh thu trung bình tháng",
    "Các dòng sản phẩm đang bán",
    "Sản phẩm chủ lực",
    "Số thợ cắm",
    "Khách hàng mục tiêu",
    "Hạng đề xuất",
    "Link ảnh khảo sát",
  ]
  const { mapping, source } = detectColumnMapping(headers)

  it("ghép đúng trường theo tên, không theo vị trí", () => {
    expect(mapping[field("identity.shopName")]).toBe(1)
    expect(mapping[field("identity.ownerName")]).toBe(2)
    expect(mapping[field("contact.address")]).toBe(4)
    expect(mapping[field("contact.phone")]).toBe(5)
    expect(mapping[field("identity.operatingYears")]).toBe(6)
    expect(mapping[field("identity.scale")]).toBe(7)
    expect(mapping[field("business.monthlyRevenue")]).toBe(8)
    expect(mapping[field("production.productLines")]).toBe(9)
    expect(mapping[field("production.mainProductLine")]).toBe(10)
    expect(mapping[field("production.floristCount")]).toBe(11)
    expect(mapping[field("business.targetCustomers")]).toBe(12)
    expect(mapping[field("scoreAndTier.suggestedTier")]).toBe(13)
    expect(mapping[field("media.rawImageUrls")]).toBe(14)
    expect(source[field("contact.address")]).toBe("header")
  })

  it("cột không nhận ra thì bỏ trống, không đoán theo vị trí", () => {
    expect(mapping).not.toContain(3) // "Chức vụ"
    expect(mapping[field("identity.legalName")]).toBeNull()
    expect(source.filter((s) => s === "position")).toHaveLength(0)
  })

  it("dữ liệu vào đúng trường như ảnh chụp lỗi (địa chỉ không rơi vào ô quy mô)", () => {
    const row = ["", "Hoa Anh Chúc", "Nguyễn Văn Chúc", "chủ cửa hàng", "49 Nguyễn Phong Sắc", "0900000082", "Trên 5 năm", "1 cửa hàng", "300-500tr", "Bó hoa, Giỏ hoa", "Bó hoa", "2", "Văn phòng", "Hạng Đạt Chứng nhận", ""]
    const { profiles } = rowsToProfiles([headers, row], mapping)
    const p = profiles[0]!
    expect(p.identity.shopName).toBe("Hoa Anh Chúc")
    expect(p.identity.ownerName).toBe("Nguyễn Văn Chúc")
    expect(p.contact.address).toBe("49 Nguyễn Phong Sắc")
    expect(p.contact.phone).toBe("0900000082")
    expect(p.identity.scale).toBe("1 cửa hàng")
    expect(p.production.productLines).toEqual(["Bó hoa", "Giỏ hoa"])
    expect(p.production.mainProductLine).toBe("Bó hoa")
    expect(p.production.floristCount).toBe("2")
    expect(p.scoreAndTier.suggestedTier).toBe("Hạng Đạt Chứng nhận")
  })

  it("tiêu đề kiểu khác vẫn vào đúng trường nhờ cụm ngắn hơn", () => {
    const m = detectColumnMapping(["Tên tiệm hoa", "Số thợ cắm hoa"]).mapping
    expect(m[field("identity.shopName")]).toBe(0)
    expect(m[field("production.floristCount")]).toBe(1)
  })

  it("tiêu đề gõ không dấu vẫn nhận ra", () => {
    const m = detectColumnMapping(["Ten cua hang", "So dien thoai", "Dia chi"]).mapping
    expect(m[field("identity.shopName")]).toBe(0)
    expect(m[field("contact.phone")]).toBe(1)
    expect(m[field("contact.address")]).toBe(2)
  })

  it("'Khách hàng' không bị nhầm thành 'Hạng'", () => {
    const m = detectColumnMapping(["Tên cửa hàng", "Khách hàng"]).mapping
    expect(m[field("scoreAndTier.suggestedTier")]).toBeNull()
  })
})

describe("detectColumnMapping — tệp giữ bố cục gốc", () => {
  it("phần lớn tên khớp đúng vị trí → trường chưa nhận ra lấy cột gốc", () => {
    const headers = Array.from({ length: 75 }, (_, i) => `Câu hỏi lạ ${i}`)
    headers[5] = "Tên cửa hàng"
    headers[13] = "Số điện thoại"
    headers[15] = "Địa chỉ"
    const { mapping, source } = detectColumnMapping(headers)
    expect(mapping).toEqual(Array.from({ length: 75 }, (_, i) => i))
    expect(source[5]).toBe("header")
    expect(source[40]).toBe("position")
  })

  it("không tiêu đề nào nhận ra nhưng đủ 75 cột → theo vị trí; ít cột → để trống", () => {
    expect(detectColumnMapping(Array.from({ length: 75 }, () => "")).mapping[5]).toBe(5)
    expect(detectColumnMapping(["x", "y"]).mapping.every((c) => c === null)).toBe(true)
  })
})

describe("validateColumnMapping / remapRow", () => {
  const base = () => Array.from({ length: 75 }, () => null as number | null)

  it("bắt thiếu tên cửa hàng, cột trùng, cột ngoài tệp, sai độ dài", () => {
    expect(validateColumnMapping(base(), 10)).toMatch(/Tên cửa hàng/)
    const dup = base()
    dup[5] = 0
    dup[13] = 0
    expect(validateColumnMapping(dup, 10)).toMatch(/nhiều trường/)
    const out = base()
    out[5] = 12
    expect(validateColumnMapping(out, 10)).toMatch(/không có trong tệp/)
    expect(validateColumnMapping([0], 10)).toMatch(/không hợp lệ/)
    const ok = base()
    ok[5] = 2
    expect(validateColumnMapping(ok, 10)).toBeNull()
  })

  it("remapRow sắp lại theo 75 trường gốc", () => {
    const m = base()
    m[5] = 1
    m[15] = 0
    const r = remapRow(["Địa chỉ X", "Shop Y"], m)
    expect(r).toHaveLength(75)
    expect(r[5]).toBe("Shop Y")
    expect(r[15]).toBe("Địa chỉ X")
    expect(r[13]).toBe("")
  })
})
