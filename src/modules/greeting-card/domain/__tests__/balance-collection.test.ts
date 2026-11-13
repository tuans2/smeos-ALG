import { describe, expect, it } from "vitest"
import { balanceCollectionBlocker, coordinatorBalanceConfirmBlocker, PHOTO_AUTO_APPROVE_MS, type BalanceCollectionOrder } from "../balance-collection"

const NOW = Date.parse("2026-10-15T10:00:00Z")
const base: BalanceCollectionOrder = { productionStatus: "ARRANGING", deliveryStatus: "PENDING", customerReported: false, qcRecords: [] }
const BEFORE_DISPATCH = { requireFullBeforeDispatch: true }
const AFTER_DELIVERY_TRANSFER = { requireFullBeforeDispatch: false }
const AFTER_DELIVERY_CASH = { requireFullBeforeDispatch: false, allowShipperCash: true }

describe("balanceCollectionBlocker — thu phần còn lại (Lần 2)", () => {
  it("khách đã báo chuyển khoản → thu được với mọi chính sách", () => {
    for (const policy of [BEFORE_DISPATCH, AFTER_DELIVERY_TRANSFER, AFTER_DELIVERY_CASH]) {
      expect(balanceCollectionBlocker({ ...base, customerReported: true }, policy, NOW)).toBeNull()
    }
  })

  // Lỗi cũ: bảng Điều hành ẩn nút "Thu lần 2" tới khi giao xong, trong khi máy chủ cho thu ngay
  it("thu sau giao + shipper không thu tiền mặt (mặc định) → thu được trước khi giao", () => {
    expect(balanceCollectionBlocker(base, AFTER_DELIVERY_TRANSFER, NOW)).toBeNull()
  })

  it("thu sau giao + shipper thu tiền mặt → chỉ sau khi giao thành công", () => {
    expect(balanceCollectionBlocker(base, AFTER_DELIVERY_CASH, NOW)).toMatch(/sau khi giao hoa thành công/)
    expect(balanceCollectionBlocker({ ...base, deliveryStatus: "DELIVERED" }, AFTER_DELIVERY_CASH, NOW)).toBeNull()
  })

  it("thu trước giao: hoa chưa xong → chặn", () => {
    expect(balanceCollectionBlocker(base, BEFORE_DISPATCH, NOW)).toMatch(/hoàn thành chế tác/)
  })

  it("thu trước giao: hoa xong, tiệm bỏ qua ảnh thành phẩm → thu được", () => {
    expect(balanceCollectionBlocker({ ...base, productionStatus: "READY" }, BEFORE_DISPATCH, NOW)).toBeNull()
  })

  it("thu trước giao: ảnh thành phẩm chờ khách duyệt → chặn tới khi duyệt hoặc quá 10 phút (ngày dạng chuỗi từ JSON)", () => {
    const photoAt = new Date(NOW - 5 * 60_000).toISOString()
    const ready: BalanceCollectionOrder = { ...base, productionStatus: "READY", qcRecords: [{ notes: "PRODUCT_PHOTO_UPLOADED", created_at: photoAt }] }
    expect(balanceCollectionBlocker(ready, BEFORE_DISPATCH, NOW)).toMatch(/chờ khách duyệt ảnh/)
    expect(balanceCollectionBlocker(ready, BEFORE_DISPATCH, Date.parse(photoAt) + PHOTO_AUTO_APPROVE_MS)).toBeNull()
    const approved = { ...ready, qcRecords: [...ready.qcRecords, { notes: "CUSTOMER_PHOTO_APPROVED", created_at: new Date(NOW) }] }
    expect(balanceCollectionBlocker(approved, BEFORE_DISPATCH, NOW)).toBeNull()
  })
})

describe("coordinatorBalanceConfirmBlocker — Điều phối tự xác nhận Lần 2", () => {
  it("tiệm bắt Điều hành duyệt + Lần 2 chỉ Điều hành → chặn (nút không hiện)", () => {
    expect(coordinatorBalanceConfirmBlocker({ requireAdminDepositApproval: true, isUrgent: false, balanceTrigger: "PAYMENT_ONLY" })).toMatch(/chỉ Điều hành/)
  })

  it("đơn hoả tốc, tiệm không bắt Điều hành duyệt, hoặc cho Điều phối xác nhận → được", () => {
    expect(coordinatorBalanceConfirmBlocker({ requireAdminDepositApproval: true, isUrgent: true, balanceTrigger: "PAYMENT_ONLY" })).toBeNull()
    expect(coordinatorBalanceConfirmBlocker({ requireAdminDepositApproval: false, isUrgent: false, balanceTrigger: "PAYMENT_ONLY" })).toBeNull()
    expect(coordinatorBalanceConfirmBlocker({ requireAdminDepositApproval: true, isUrgent: false, balanceTrigger: "PAYMENT_OR_COORDINATOR" })).toBeNull()
  })
})
