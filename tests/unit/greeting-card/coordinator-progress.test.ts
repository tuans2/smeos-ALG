import { describe, expect, it } from "vitest"
import { coordinatorProgress } from "@/modules/greeting-card/domain/coordinator-progress"

const states = (o: { status: string; productionStatus: string; deliveryStatus: string }) =>
  coordinatorProgress(o).map((s) => s.state)

describe("tiến độ xưởng trên thẻ điều phối", () => {
  it("đơn mới: bước đầu đang làm, còn lại chưa tới", () => {
    expect(states({ status: "CONFIRMED", productionStatus: "WAITING", deliveryStatus: "PENDING" })).toEqual(["current", "pending", "pending", "pending"])
  })

  it("đã cắm xong: hai bước đầu xong, đang chờ giao", () => {
    expect(states({ status: "CONFIRMED", productionStatus: "READY", deliveryStatus: "PENDING" })).toEqual(["done", "done", "current", "pending"])
  })

  it("đang giao: các bước trước tự tính là xong", () => {
    expect(states({ status: "CONFIRMED", productionStatus: "WAITING", deliveryStatus: "DELIVERING" })).toEqual(["done", "done", "done", "current"])
  })

  it("đã giao: tất cả xong", () => {
    expect(states({ status: "COMPLETED", productionStatus: "READY", deliveryStatus: "DELIVERED" })).toEqual(["done", "done", "done", "done"])
  })
})
