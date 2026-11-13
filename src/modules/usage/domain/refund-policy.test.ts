import { describe, expect, it } from "vitest"

import {
  creditLuotHienTai,
  creditTruKhiChayLai,
  daHoanHetLuot,
  duocHoanCredit,
  lyDoHoanCredit,
  soCreditHoanMotPhan,
} from "./refund-policy"

describe("lyDoHoanCredit", () => {
  it("job bị Identity Guard từ chối — quyết định D3", () => {
    expect(lyDoHoanCredit({ status: "COMPLETED", result: "REJECTED" })).toBe("guard-tu-choi")
  })

  it("job bị huỷ khi còn xếp hàng — chưa lời gọi nhà cung cấp nào phát sinh", () => {
    expect(lyDoHoanCredit({ status: "CANCELLED", result: null })).toBe("bi-huy")
  })

  it("job hỏng vì lỗi kỹ thuật — nền tảng hỏng, không phải khách dùng sai", () => {
    expect(lyDoHoanCredit({ status: "FAILED", result: null })).toBe("loi-ky-thuat")
    expect(lyDoHoanCredit({ status: "FAILED", result: "OK" })).toBe("loi-ky-thuat")
  })

  it("lượt chạy giao đúng thứ khách mua thì không hoàn", () => {
    expect(lyDoHoanCredit({ status: "COMPLETED", result: "OK" })).toBeNull()
    expect(lyDoHoanCredit({ status: "COMPLETED", result: "SAFE" })).toBeNull()
    expect(lyDoHoanCredit({ status: "COMPLETED", result: "WARNING" })).toBeNull()
  })

  it("LOW_CONFIDENCE là kết quả thật kèm cảnh báo, không phải lượt hỏng", () => {
    expect(lyDoHoanCredit({ status: "COMPLETED", result: "LOW_CONFIDENCE" })).toBeNull()
  })

  it("job chưa kết thúc thì chưa có gì để quyết", () => {
    expect(duocHoanCredit({ status: "PENDING", result: null })).toBe(false)
    expect(duocHoanCredit({ status: "PROCESSING", result: null })).toBe(false)
  })
})

describe("hoàn một phần (25/09/2026)", () => {
  const enq = (credit: number) => ({ status: "ENQUEUED", cost_credit: credit, metadata: { funded_by: "credit" } })

  it("hoàn đúng số xin khi còn đủ credit", () => {
    expect(soCreditHoanMotPhan([enq(2)], "cloud-lui-cuc-bo", 1)).toBe(1)
  })

  it("không hoàn quá phần còn lại của job", () => {
    expect(soCreditHoanMotPhan([enq(1)], "cloud-lui-cuc-bo", 3)).toBe(1)
  })

  it("idempotent theo lý do — lý do khác vẫn hoàn được phần còn lại", () => {
    const dong = [enq(3), { status: "PARTIAL_REFUND", cost_credit: -2, metadata: { reason: "goi-noi-dung-hong" } }]
    expect(soCreditHoanMotPhan(dong, "goi-noi-dung-hong", 2)).toBe(0)
    expect(soCreditHoanMotPhan(dong, "cloud-lui-cuc-bo", 5)).toBe(1)
  })

  it("đã hoàn toàn phần hoặc đi đường dùng thử (0 credit) thì không hoàn gì", () => {
    expect(soCreditHoanMotPhan([enq(2), { status: "REFUNDED", cost_credit: 0, metadata: null }], "cloud-lui-cuc-bo", 1)).toBe(0)
    expect(soCreditHoanMotPhan([enq(0)], "cloud-lui-cuc-bo", 1)).toBe(0)
  })

  it("số xin không hợp lệ thì 0", () => {
    expect(soCreditHoanMotPhan([enq(2)], "cloud-lui-cuc-bo", 0)).toBe(0)
    expect(soCreditHoanMotPhan([enq(2)], "cloud-lui-cuc-bo", 1.5)).toBe(0)
  })
})

describe("hoàn theo lượt + chạy lại sau hoàn (nợ #200)", () => {
  const d = (status: string, cost_credit: number) => ({ status, cost_credit, metadata: null })

  it("lượt đầu chưa hoàn: còn giữ credit, chạy lại không trừ thêm", () => {
    const so = [d("ENQUEUED", 3)]
    expect(daHoanHetLuot(so)).toBe(false)
    expect(creditLuotHienTai(so)).toBe(3)
    expect(creditTruKhiChayLai(so)).toBe(0)
  })

  it("đã hoàn: chạy lại trừ đúng giá lượt trước; không hoàn thêm cho tới khi có lượt mới", () => {
    const so = [d("ENQUEUED", 3), d("REFUNDED", 0)]
    expect(daHoanHetLuot(so)).toBe(true)
    expect(creditTruKhiChayLai(so)).toBe(3)
    expect(soCreditHoanMotPhan(so, "cloud-lui-cuc-bo", 1)).toBe(0)
  })

  it("lượt thứ hai chỉ hoàn phần của lượt đó, kể cả khi lượt đầu có hoàn một phần", () => {
    const so = [d("ENQUEUED", 3), d("PARTIAL_REFUND", -1), d("REFUNDED", 0), d("ENQUEUED", 3)]
    expect(daHoanHetLuot(so)).toBe(false)
    expect(creditLuotHienTai(so)).toBe(3)
    expect(creditTruKhiChayLai(so)).toBe(0)
  })

  it("đường dùng thử (0 credit): chạy lại không trừ gì", () => {
    expect(creditTruKhiChayLai([d("ENQUEUED", 0), d("REFUNDED", 0)])).toBe(0)
  })
})

