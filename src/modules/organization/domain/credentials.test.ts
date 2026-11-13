import { describe, expect, it } from "vitest"

import { isAcceptablePassword, isValidEmail, normalizeEmail } from "./credentials"

describe("luật danh khoản", () => {
  it("chuẩn hoá địa chỉ thư về chữ thường, bỏ khoảng trắng", () => {
    expect(normalizeEmail("  Nguoi.Dung@Vi-Du.TEST ")).toBe("nguoi.dung@vi-du.test")
  })

  it("nhận diện địa chỉ thư hợp lệ", () => {
    expect(isValidEmail("a@b.co")).toBe(true)
    expect(isValidEmail("a@b")).toBe(false)
    expect(isValidEmail("khong-co-a-cong")).toBe(false)
  })

  it("mật khẩu ngắn hơn mức tối thiểu bị từ chối", () => {
    expect(isAcceptablePassword("ngan")).toBe(false)
    expect(isAcceptablePassword("mat-khau-du-dai")).toBe(true)
  })
})
