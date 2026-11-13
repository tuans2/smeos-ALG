import { describe, expect, it } from "vitest"

import {
  MO_TA_BO_MAY,
  VISION_ENGINES,
  VISION_ENGINE_MAC_DINH,
  VISION_ENGINE_SETTINGS_KEY,
  isVisionEngine,
  resolveVisionEngine,
} from "./vision-engine"

describe("resolveVisionEngine", () => {
  it("tổ chức chưa chọn gì thì dùng bộ đã biết hành vi", () => {
    expect(resolveVisionEngine(null)).toBe(VISION_ENGINE_MAC_DINH)
    expect(resolveVisionEngine(undefined)).toBe(VISION_ENGINE_MAC_DINH)
    expect(resolveVisionEngine({})).toBe(VISION_ENGINE_MAC_DINH)
  })

  it("đọc đúng lựa chọn đã ghi", () => {
    expect(resolveVisionEngine({ [VISION_ENGINE_SETTINGS_KEY]: "local_cv" })).toBe("local_cv")
    expect(resolveVisionEngine({ [VISION_ENGINE_SETTINGS_KEY]: "openai_direct" })).toBe("openai_direct")
  })

  it("giá trị lạ rơi về mặc định, không ném lỗi — cấu hình hỏng không chặn cả luồng", () => {
    expect(resolveVisionEngine({ [VISION_ENGINE_SETTINGS_KEY]: "gpt-9" })).toBe(VISION_ENGINE_MAC_DINH)
    expect(resolveVisionEngine({ [VISION_ENGINE_SETTINGS_KEY]: 42 })).toBe(VISION_ENGINE_MAC_DINH)
    expect(resolveVisionEngine({ [VISION_ENGINE_SETTINGS_KEY]: null })).toBe(VISION_ENGINE_MAC_DINH)
  })

  it("không đụng tới công tắc khác trong cùng khối settings", () => {
    const settings = { cho_phep_tu_duyet: false, [VISION_ENGINE_SETTINGS_KEY]: "local_cv" }
    expect(resolveVisionEngine(settings)).toBe("local_cv")
    expect(settings.cho_phep_tu_duyet).toBe(false)
  })
})

describe("danh mục bộ máy", () => {
  it("mỗi bộ máy có đúng một mô tả, không thiếu không thừa", () => {
    expect(Object.keys(MO_TA_BO_MAY).sort()).toEqual([...VISION_ENGINES].sort())
    for (const key of VISION_ENGINES) expect(MO_TA_BO_MAY[key].key).toBe(key)
  })

  it("chỉ bộ đã chạy thật mới mang trạng thái sản xuất", () => {
    const sanXuat = VISION_ENGINES.filter((k) => MO_TA_BO_MAY[k].trang_thai === "san_xuat")
    expect(sanXuat).toEqual(["openai_structured"])
  })

  it("nói rõ bộ nào gửi ảnh ra ngoài — tổ chức cần biết trước khi chọn", () => {
    expect(MO_TA_BO_MAY.local_cv.gui_anh_ra_ngoai).toBe(false)
    expect(MO_TA_BO_MAY.openai_structured.gui_anh_ra_ngoai).toBe(true)
    expect(MO_TA_BO_MAY.openai_direct.gui_anh_ra_ngoai).toBe(true)
  })

  it("isVisionEngine chặn chuỗi bất kỳ", () => {
    expect(isVisionEngine("local_cv")).toBe(true)
    expect(isVisionEngine("LOCAL_CV")).toBe(false)
    expect(isVisionEngine({})).toBe(false)
  })
})

/**
 * Hai ca thử dưới đây khoá một luật sản phẩm, không khoá một giá trị: mặc
 * định nền tảng phải là một bộ đã được đo. Đổi `VISION_ENGINE_MAC_DINH`
 * sang một bộ `thu_nghiem` sẽ làm chúng đỏ, và đó là chỗ để dừng lại.
 */
describe("mặc định nền tảng phải là bộ đã được đo", () => {
  it("bộ mặc định mang trạng thái san_xuat", () => {
    expect(MO_TA_BO_MAY[VISION_ENGINE_MAC_DINH].trang_thai).toBe("san_xuat")
  })

  it("khoá lạ rơi về đúng bộ mặc định đó", () => {
    expect(resolveVisionEngine({ [VISION_ENGINE_SETTINGS_KEY]: "bo-may-da-bo" })).toBe(
      VISION_ENGINE_MAC_DINH
    )
  })

  it("chỉ có đúng một bộ mang trạng thái san_xuat", () => {
    const san_xuat = VISION_ENGINES.filter((k) => MO_TA_BO_MAY[k].trang_thai === "san_xuat")
    expect(san_xuat).toEqual([VISION_ENGINE_MAC_DINH])
  })
})
