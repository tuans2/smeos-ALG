import { afterEach, describe, expect, it, vi } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { BrochurePaymentView } from "@/components/greeting-card/customer/brochure-payment-view"
import { rememberCatalogOrder } from "@/components/greeting-card/customer/use-remembered-order"
import type { BrochurePaymentInstructions } from "@/modules/greeting-card/domain/greeting-card-types"

/**
 * Khách báo đã chuyển khoản rồi rời trang trước khi Điều hành xác nhận: mở lại phải thấy đúng
 * trạng thái "đã báo, chờ xác nhận", không phải nút báo lại hay màn xem mẫu.
 */
describe("khách quay lại sau khi báo chuyển khoản", () => {
  const props = { orderCode: "DH-1", totalVnd: 650000, vietQr: null, onReportPaid: async () => undefined, onGoToTracking: () => undefined }

  it("đã báo trước đó → hiện ngay 'đang chờ xác nhận', không hiện lại nút báo", () => {
    const html = renderToStaticMarkup(createElement(BrochurePaymentView, { ...props, alreadyReported: true }))
    expect(html).toContain("Đã báo chuyển khoản thành công")
    expect(html).toContain("Đang chờ Điều hành")
    expect(html).not.toContain("Theo dõi tiến độ Đơn hàng")
  })

  it("chưa báo → vẫn là màn thanh toán bình thường", () => {
    const html = renderToStaticMarkup(createElement(BrochurePaymentView, props))
    expect(html).not.toContain("Đã báo chuyển khoản thành công")
  })

  it("có mã QR, chưa báo chuyển khoản → không có lối bỏ qua sang Theo dõi tiến độ", () => {
    const vietQr: BrochurePaymentInstructions = {
      purpose: "FULL", orderTotalVnd: 650000, qrUrl: "https://img.vietqr.io/x.png", bankName: "VCB",
      accountNo: "0123", accountName: "TIEM HOA", amount: 650000, transferMemo: "DH-1",
    }
    const html = renderToStaticMarkup(createElement(BrochurePaymentView, { ...props, vietQr }))
    expect(html).toContain("TÔI ĐÃ CHUYỂN KHOẢN THANH TOÁN")
    expect(html).not.toContain("Bỏ qua")
    expect(html).not.toContain("Theo dõi tiến độ Đơn hàng")
  })

  describe("link bộ sưu tập chung nhớ đơn đã đặt trên máy", () => {
    afterEach(() => vi.unstubAllGlobals())

    it("lưu mã phiên của đơn theo bộ sưu tập; bộ nhớ bị chặn thì không làm hỏng trang", () => {
      const store = new Map<string, string>()
      vi.stubGlobal("window", { localStorage: { setItem: (k: string, v: string) => store.set(k, v) } })
      rememberCatalogOrder("cat-1", "SL-ABC123")
      expect(JSON.parse(store.get("alg:catalog-order:cat-1")!)).toMatchObject({ sendCode: "SL-ABC123" })

      vi.stubGlobal("window", { localStorage: { setItem: () => { throw new Error("blocked") } } })
      expect(() => rememberCatalogOrder("cat-1", "SL-ABC123")).not.toThrow()
    })
  })
})
