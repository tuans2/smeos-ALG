import { describe, it, expect } from "vitest"
import { inboxActions, type PipelineLike } from "../inbox"

describe("inboxActions — cơ chế thanh toán lần 2 và thu nợ sau giao", () => {
  const baseOrder: PipelineLike = {
    id: "ord-1",
    type: "ORDER",
    orderId: "ord-1",
    sessionId: "sess-1",
    orderCode: "DH101",
    sendCode: "S101",
    customerName: "Nguyễn Văn A",
    productName: "Bó hoa hồng đỏ",
    productImageUrl: "/img/rose.jpg",
    totalVnd: 1_000_000,
    paidVnd: 300_000,
    balanceVnd: 700_000,
    currentStepId: "STEP_7_READY_QC",
    currentStepTitle: "Hoa hoàn thiện & Duyệt mẫu",
    productionStatus: "READY",
    deliveryStatus: "PENDING",
    stepStartedAt: new Date().toISOString(),
    stuck: null,
    saleId: "sale-99",
  }

  it("Cơ chế 1: Sale phụ trách nhận action nhắc khách duyệt ảnh và thanh toán lần 2", () => {
    const actions = inboxActions([baseOrder], "SALE", "sale-99")
    const remindAction = actions.find((a) => a.kind === "REMIND_BALANCE_PAYMENT")
    expect(remindAction).toBeDefined()
    expect(remindAction?.title).toContain("Nhắc khách")
    expect(remindAction?.detail).toContain("700.000")
    expect(remindAction?.tab).toBe("sales")

    // Sale khác không nhận được action này
    const otherSaleActions = inboxActions([baseOrder], "SALE", "sale-other")
    expect(otherSaleActions.find((a) => a.kind === "REMIND_BALANCE_PAYMENT")).toBeUndefined()
  })

  it("Cơ chế 1: Điều phối nhận action chờ thanh toán lần 2", () => {
    const actions = inboxActions([baseOrder], "COORDINATOR", "coord-1")
    const waitAction = actions.find((a) => a.kind === "WAITING_SECOND_PAYMENT")
    expect(waitAction).toBeDefined()
    expect(waitAction?.title).toContain("Chờ khách thanh toán lần 2")
    expect(waitAction?.tab).toBe("coordinator")
  })

  it("Cơ chế 2: Sau khi giao hàng (DELIVERED) còn nợ cọc → Sale và Admin nhận action thu tiền sau giao", () => {
    const deliveredOrder: PipelineLike = {
      ...baseOrder,
      currentStepId: "STEP_9_COMPLETED",
      deliveryStatus: "DELIVERED",
    }

    const saleActions = inboxActions([deliveredOrder], "SALE", "sale-99")
    const saleCollect = saleActions.find((a) => a.kind === "COLLECT_POST_DELIVERY_BALANCE")
    expect(saleCollect).toBeDefined()
    expect(saleCollect?.title).toContain("Thu phần tiền còn lại sau giao")
    expect(saleCollect?.detail).toContain("700.000")

    const adminActions = inboxActions([deliveredOrder], "ADMIN", "admin-1")
    const adminCollect = adminActions.find((a) => a.kind === "COLLECT_POST_DELIVERY_BALANCE")
    expect(adminCollect).toBeDefined()
    expect(adminCollect?.tab).toBe("payment")
  })

  it("Đơn đã giao chưa thu đồng nào cũng nhắc thu (PO 15/10/2026)", () => {
    const unpaidDelivered: PipelineLike = { ...baseOrder, paidVnd: 0, balanceVnd: 1_000_000, currentStepId: "STEP_9_COMPLETED", deliveryStatus: "DELIVERED" }
    expect(inboxActions([unpaidDelivered], "ADMIN", "admin-1").find((a) => a.kind === "COLLECT_POST_DELIVERY_BALANCE")?.detail).toContain("1.000.000")
    expect(inboxActions([unpaidDelivered], "SALE", "sale-99").find((a) => a.kind === "COLLECT_POST_DELIVERY_BALANCE")).toBeDefined()
  })

  it("Đơn đã trả đủ 100% không sinh các action đòi nợ lần 2", () => {
    const fullPaidOrder: PipelineLike = {
      ...baseOrder,
      paidVnd: 1_000_000,
      balanceVnd: 0,
    }
    const saleActions = inboxActions([fullPaidOrder], "SALE", "sale-99")
    expect(saleActions.find((a) => a.kind === "REMIND_BALANCE_PAYMENT")).toBeUndefined()

    const coordActions = inboxActions([fullPaidOrder], "COORDINATOR", "coord-1")
    expect(coordActions.find((a) => a.kind === "WAITING_SECOND_PAYMENT")).toBeUndefined()
  })

  describe("Bộ quy tắc nhắc việc cho Sale", () => {
    it("Đơn từ link chung chưa gán sale → Sale thấy action CLAIM_ORDER để nhận đơn", () => {
      const unassignedOrder: PipelineLike = {
        ...baseOrder,
        saleId: "public",
        currentStepId: "STEP_4_PAYMENT_PENDING",
      }
      const actions = inboxActions([unassignedOrder], "SALE", "sale-99")
      const claim = actions.find((a) => a.kind === "CLAIM_ORDER")
      expect(claim).toBeDefined()
      expect(claim?.title).toContain("Tiếp nhận đơn mới")
      expect(claim?.tab).toBe("sales")
    })

    it("Khách đang điền form đặt hoa → Sale nhận action FOLLOW_UP_LEAD", () => {
      const fillingOrder: PipelineLike = {
        ...baseOrder,
        currentStepId: "STEP_3_FILLING_FORM",
        productionStatus: "WAITING",
        paidVnd: 0,
        balanceVnd: 1_000_000,
      }
      const actions = inboxActions([fillingOrder], "SALE", "sale-99")
      const follow = actions.find((a) => a.kind === "FOLLOW_UP_LEAD")
      expect(follow).toBeDefined()
      expect(follow?.title).toContain("Hỗ trợ khách đang điền form")
      expect(follow?.tab).toBe("sales")
    })

    it("Đơn đã gửi nhưng chưa cọc → Sale nhận action REMIND_DEPOSIT", () => {
      const pendingDepositOrder: PipelineLike = {
        ...baseOrder,
        currentStepId: "STEP_4_PAYMENT_PENDING",
        productionStatus: "WAITING",
        paidVnd: 0,
        balanceVnd: 1_000_000,
        customerReportedPaid: false,
      }
      const actions = inboxActions([pendingDepositOrder], "SALE", "sale-99")
      const remind = actions.find((a) => a.kind === "REMIND_DEPOSIT")
      expect(remind).toBeDefined()
      expect(remind?.title).toContain("Nhắc khách thanh toán tiền cọc")
    })

    it("Hoa đã cắm xong & đơn đã thanh toán 100% → Sale nhận action SEND_PHOTO_QC gửi ảnh hoa cho khách", () => {
      const fullPaidReady: PipelineLike = {
        ...baseOrder,
        paidVnd: 1_000_000,
        balanceVnd: 0,
        currentStepId: "STEP_7_READY_QC",
        productionStatus: "READY",
      }
      const actions = inboxActions([fullPaidReady], "SALE", "sale-99")
      const sendPhoto = actions.find((a) => a.kind === "SEND_PHOTO_QC")
      expect(sendPhoto).toBeDefined()
      expect(sendPhoto?.title).toContain("Gửi ảnh hoa thành phẩm")
    })

    it("Giao hàng thất bại → Sale nhận action DELIVERY_FAILED_SALE_CONTACT để gọi lại khách", () => {
      const failedDelivery: PipelineLike = {
        ...baseOrder,
        currentStepId: "STEP_8_DELIVERING",
        deliveryFailed: true,
      }
      const actions = inboxActions([failedDelivery], "SALE", "sale-99")
      const contact = actions.find((a) => a.kind === "DELIVERY_FAILED_SALE_CONTACT")
      expect(contact).toBeDefined()
      expect(contact?.title).toContain("Giao không thành công")
      expect(contact?.urgency).toBeGreaterThanOrEqual(850)
    })
  })

  describe("Bộ quy tắc nhắc việc cho Điều phối", () => {
    it("Tiền cọc đã xác nhận (Bước 5) → Điều phối nhận action ASSIGN phân công thợ", () => {
      const step5Order: PipelineLike = {
        ...baseOrder,
        currentStepId: "STEP_5_PAYMENT_CONFIRMED",
      }
      const actions = inboxActions([step5Order], "COORDINATOR", "coord-1")
      const assign = actions.find((a) => a.kind === "ASSIGN")
      expect(assign).toBeDefined()
      expect(assign?.title).toContain("Phân công sản xuất")
      expect(assign?.tab).toBe("coordinator")
    })

    it("Xưởng đang cắm hoa (Bước 6) → Điều phối nhận action CHECK_ARRANGING_PROGRESS", () => {
      const step6Order: PipelineLike = {
        ...baseOrder,
        currentStepId: "STEP_6_ARRANGING",
        productionStatus: "ARRANGING",
      }
      const actions = inboxActions([step6Order], "COORDINATOR", "coord-1")
      const check = actions.find((a) => a.kind === "CHECK_ARRANGING_PROGRESS")
      expect(check).toBeDefined()
      expect(check?.title).toContain("Theo dõi tiến độ nghệ nhân")
    })

    it("Bước 7 nhưng chưa xong QC → Điều phối nhận action QC_INSPECTION", () => {
      const qcOrder: PipelineLike = {
        ...baseOrder,
        currentStepId: "STEP_7_READY_QC",
        productionStatus: "QUALITY_CHECK",
      }
      const actions = inboxActions([qcOrder], "COORDINATOR", "coord-1")
      const qc = actions.find((a) => a.kind === "QC_INSPECTION")
      expect(qc).toBeDefined()
      expect(qc?.title).toContain("Kiểm tra chất lượng")
    })

    it("Bước 7 đã QC xong và đơn đã thanh toán 100% → Điều phối nhận action ASSIGN_SHIPPER", () => {
      const readyToShipOrder: PipelineLike = {
        ...baseOrder,
        currentStepId: "STEP_7_READY_QC",
        productionStatus: "READY",
        paidVnd: 1_000_000,
        balanceVnd: 0,
      }
      const actions = inboxActions([readyToShipOrder], "COORDINATOR", "coord-1")
      const shipper = actions.find((a) => a.kind === "ASSIGN_SHIPPER")
      expect(shipper).toBeDefined()
      expect(shipper?.title).toContain("Sẵn sàng giao — Điều phối tài xế")
    })

    it("Giao hàng thất bại → Điều phối nhận action REDELIVER hẹn giao lại", () => {
      const failedDelivery: PipelineLike = {
        ...baseOrder,
        currentStepId: "STEP_8_DELIVERING",
        deliveryFailed: true,
      }
      const actions = inboxActions([failedDelivery], "COORDINATOR", "coord-1")
      const redeliver = actions.find((a) => a.kind === "REDELIVER")
      expect(redeliver).toBeDefined()
      expect(redeliver?.title).toContain("Hẹn giao lại")
      expect(redeliver?.tab).toBe("coordinator")
    })
  })
})
