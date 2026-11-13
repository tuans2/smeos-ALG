import { describe, expect, it } from "vitest"
import { customerNoteOf, deliveryNoteOf, snapshotOf } from "../order-slip-extras"

describe("phần bổ sung Thẻ Đơn Khách hàng", () => {
  it("chỉ lấy ghi chú khách, bỏ các dòng nhân viên/hệ thống ghi sau", () => {
    expect(customerNoteOf("Gói giấy tông hồng\nkhông dùng hoa ly\n[Báo giá] 500.000 đ\n[Florist] xong")).toBe("Gói giấy tông hồng\nkhông dùng hoa ly")
    expect(customerNoteOf("[Báo giá] 500.000 đ")).toBeNull()
    expect(customerNoteOf(null)).toBeNull()
  })

  it("ghi chú giao hàng và mã mẫu lúc chốt", () => {
    expect(deliveryNoteOf({ notes: " gọi trước 15 phút " })).toBe("gọi trước 15 phút")
    expect(deliveryNoteOf({ street: "x" })).toBeNull()
    expect(snapshotOf({ code: "BST-034", imageUrl: null })).toEqual({ code: "BST-034", imageUrl: null, driveLink: null })
  })
})
